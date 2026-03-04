/**
 * Real-Time Voice WebSocket Handler
 * Handles streaming audio input/output, real-time transcription, TTS, and barge-in
 */

import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Logger } from "winston";
import type { Orchestrator } from "../orchestrator/orchestrator";
import type { BargeInController } from "./barge-in-controller";

interface VoiceSession {
  sessionId: string;
  userId: string;
  isListening: boolean;
  isSpeaking: boolean;
  audioBuffer: Buffer[];
  transcription: string;
  startTime: number;
  lastActivity: number;
}

export class VoiceWebSocketHandler extends EventEmitter {
  private logger: Logger;
  private orchestrator: Orchestrator;
  private bargeInController: BargeInController;
  private sessions: Map<string, VoiceSession> = new Map();
  private tempDir: string = path.join(process.cwd(), "temp", "voice-streaming");

  constructor(logger: Logger, orchestrator: Orchestrator, bargeInController: BargeInController) {
    super();
    this.logger = logger;
    this.orchestrator = orchestrator;
    this.bargeInController = bargeInController;

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    // Listen for barge-in events
    this.bargeInController.on("barge-in", (data) => {
      this.handleBargeIn(data);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws: any, sessionId: string, userId: string): void {
    this.logger.info(`Voice WebSocket connected: ${sessionId}`);

    // Create session
    const session: VoiceSession = {
      sessionId,
      userId,
      isListening: false,
      isSpeaking: false,
      audioBuffer: [],
      transcription: "",
      startTime: Date.now(),
      lastActivity: Date.now(),
    };

    this.sessions.set(sessionId, session);

    // Handle incoming messages
    ws.on("message", async (message: string) => {
      try {
        const data = JSON.parse(message);
        await this.handleMessage(ws, sessionId, data);
      } catch (error) {
        this.logger.error("Error handling voice WebSocket message:", error);
        this.sendError(ws, "Invalid message format");
      }
    });

    // Handle disconnection
    ws.on("close", () => {
      this.handleDisconnection(sessionId);
    });

    // Handle errors
    ws.on("error", (error: Error) => {
      this.logger.error(`Voice WebSocket error for ${sessionId}:`, error);
    });

    // Send welcome message
    this.send(ws, {
      type: "connected",
      sessionId,
      features: {
        realTimeTranscription: true,
        ttsPlayback: true,
        bargeIn: this.bargeInController.isAvailable(),
        continuousMode: true,
      },
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(ws: any, sessionId: string, data: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return this.sendError(ws, "Session not found");
    }

    session.lastActivity = Date.now();

    switch (data.type) {
      case "start_listening":
        await this.startListening(ws, session);
        break;

      case "audio_chunk":
        await this.processAudioChunk(ws, session, data);
        break;

      case "stop_listening":
        await this.stopListening(ws, session);
        break;

      case "speak":
        await this.speak(ws, session, data);
        break;

      case "stop_speaking":
        this.stopSpeaking(ws, session);
        break;

      case "set_continuous_mode":
        session.isListening = data.enabled;
        this.send(ws, {
          type: "continuous_mode_updated",
          enabled: data.enabled,
        });
        break;

      default:
        this.sendError(ws, `Unknown message type: ${data.type}`);
    }
  }

  /**
   * Start listening for audio input
   */
  private async startListening(ws: any, session: VoiceSession): Promise<void> {
    session.isListening = true;
    session.audioBuffer = [];
    session.transcription = "";

    this.send(ws, {
      type: "listening_started",
      timestamp: Date.now(),
    });

    this.logger.info(`Voice listening started: ${session.sessionId}`);
  }

  /**
   * Process incoming audio chunk
   */
  private async processAudioChunk(ws: any, session: VoiceSession, data: any): Promise<void> {
    if (!session.isListening) {
      return;
    }

    // Decode base64 audio data
    const audioChunk = Buffer.from(data.audio_data, "base64");
    session.audioBuffer.push(audioChunk);

    // If Jarvis is speaking, check for barge-in
    if (session.isSpeaking && this.bargeInController.isAvailable()) {
      const frame = new Int16Array(
        audioChunk.buffer,
        audioChunk.byteOffset,
        audioChunk.length / Int16Array.BYTES_PER_ELEMENT,
      );
      this.bargeInController.processAudioFrame(frame);
    }

    // Real-time transcription: process accumulated audio periodically
    if (session.audioBuffer.length >= 10) {
      // ~1 second of audio at 16kHz
      await this.transcribeBuffer(ws, session);
    }
  }

  /**
   * Transcribe accumulated audio buffer
   */
  private async transcribeBuffer(ws: any, session: VoiceSession): Promise<void> {
    try {
      // Save audio buffer to temp file
      const audioFile = path.join(this.tempDir, `${session.sessionId}-${Date.now()}.wav`);
      const audioData = Buffer.concat(session.audioBuffer);
      this.writeWavFile(audioFile, audioData, 16000, 1, 16);

      // Call Voice agent for transcription
      const response = await this.orchestrator.executeRequest(
        "Voice",
        "speech_to_text",
        { audioFile },
        session.userId,
        "HIGH",
      );

      if (response.success && response.data) {
        const text = (response.data as any).text || "";
        if (text) {
          session.transcription += (session.transcription ? " " : "") + text;

          // Send partial transcription to client
          this.send(ws, {
            type: "transcription_update",
            text: session.transcription,
            partial: true,
            timestamp: Date.now(),
          });
        }
      }

      // Cleanup
      if (fs.existsSync(audioFile)) {
        fs.unlinkSync(audioFile);
      }

      // Clear processed buffer (keep last 2 chunks for overlap)
      session.audioBuffer = session.audioBuffer.slice(-2);
    } catch (error) {
      this.logger.error("Transcription error:", error);
    }
  }

  /**
   * Stop listening and finalize transcription
   */
  private async stopListening(ws: any, session: VoiceSession): Promise<void> {
    session.isListening = false;

    // Final transcription if any audio remains
    if (session.audioBuffer.length > 0) {
      await this.transcribeBuffer(ws, session);
    }

    // Send final transcription
    this.send(ws, {
      type: "transcription_final",
      text: session.transcription,
      timestamp: Date.now(),
    });

    this.logger.info(
      `Voice listening stopped: ${session.sessionId}, transcribed: "${session.transcription}"`,
    );

    // Send transcription to chat
    if (session.transcription) {
      await this.sendToChat(ws, session, session.transcription);
    }
  }

  /**
   * Send transcription to chat and get response
   */
  private async sendToChat(ws: any, session: VoiceSession, text: string): Promise<void> {
    try {
      // Send to Dialogue agent
      const response = await this.orchestrator.executeRequest(
        "Dialogue",
        "chat",
        { message: text, userId: session.userId },
        session.userId,
        "HIGH",
      );

      if (response.success && response.data) {
        const responseText = (response.data as any).response || (response.data as any).text || "";

        // Send text response to client
        this.send(ws, {
          type: "chat_response",
          text: responseText,
          timestamp: Date.now(),
        });

        // Automatically speak the response
        await this.speak(ws, session, { text: responseText, emotion: "neutral" });
      }
    } catch (error) {
      this.logger.error("Chat error:", error);
      this.sendError(ws, "Failed to process message");
    }
  }

  /**
   * Speak text with TTS
   */
  private async speak(ws: any, session: VoiceSession, data: any): Promise<void> {
    session.isSpeaking = true;
    this.bargeInController.setJarvisSpeaking(true);

    const outputFile = path.join(this.tempDir, `tts-${session.sessionId}-${Date.now()}.mp3`);

    try {
      // Send speaking start event
      this.send(ws, {
        type: "speaking_start",
        text: data.text,
        timestamp: Date.now(),
      });

      // Generate TTS audio
      const response = await this.orchestrator.executeRequest(
        "Voice",
        "text_to_speech",
        {
          text: data.text,
          emotion: data.emotion || "neutral",
          outputFile,
        },
        session.userId,
        "HIGH",
      );

      if (response.success && response.data) {
        const audioFile = (response.data as any).audioFile || outputFile;

        // Check if file exists and stream it
        if (fs.existsSync(audioFile)) {
          await this.streamAudioFile(ws, session, audioFile);

          // Cleanup
          fs.unlinkSync(audioFile);
        }
      }

      // Send speaking end event
      this.send(ws, {
        type: "speaking_end",
        timestamp: Date.now(),
      });

      session.isSpeaking = false;
      this.bargeInController.setJarvisSpeaking(false);

      // If continuous mode, restart listening
      if (data.continuousMode) {
        setTimeout(() => {
          this.startListening(ws, session);
        }, 500);
      }
    } catch (error) {
      this.logger.error("TTS error:", error);
      this.sendError(ws, "Failed to generate speech");
      session.isSpeaking = false;
      this.bargeInController.setJarvisSpeaking(false);
    }
  }

  /**
   * Stream audio file in chunks
   */
  private async streamAudioFile(ws: any, session: VoiceSession, audioFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const fileStream = fs.createReadStream(audioFile, { highWaterMark: 64 * 1024 }); // 64KB chunks

        fileStream.on("data", (chunk: Buffer) => {
          if (!session.isSpeaking) {
            fileStream.destroy(); // Barge-in occurred
            resolve();
            return;
          }

          // Send audio chunk to client
          this.send(ws, {
            type: "audio_chunk",
            audio_data: chunk.toString("base64"),
            timestamp: Date.now(),
          });
        });

        fileStream.on("end", () => {
          resolve();
        });

        fileStream.on("error", (error) => {
          this.logger.error("Audio streaming error:", error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop speaking (for barge-in)
   */
  private stopSpeaking(ws: any, session: VoiceSession): void {
    session.isSpeaking = false;
    this.bargeInController.setJarvisSpeaking(false);

    this.send(ws, {
      type: "speaking_stopped",
      reason: "manual",
      timestamp: Date.now(),
    });

    this.logger.info(`Speaking stopped: ${session.sessionId}`);
  }

  /**
   * Handle barge-in event
   */
  private handleBargeIn(data: { confidence: number; timestamp: number }): void {
    this.logger.info(`🛑 BARGE-IN detected (${(data.confidence * 100).toFixed(1)}% confidence)`);

    // Stop speaking for all active sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.isSpeaking) {
        // Find WebSocket for this session (would need to track ws per session)
        // For now, emit event that can be picked up
        this.emit("barge-in", { sessionId, ...data });

        session.isSpeaking = false;
        this.bargeInController.setJarvisSpeaking(false);

        // Automatically restart listening
        session.isListening = true;
        session.audioBuffer = [];
      }
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      this.logger.info(`Voice WebSocket disconnected: ${sessionId}`);
    }
  }

  /**
   * Send message to client
   */
  private send(ws: any, data: any): void {
    if (ws.readyState === 1) {
      // WebSocket.OPEN
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Send error to client
   */
  private sendError(ws: any, message: string): void {
    this.send(ws, {
      type: "error",
      error: message,
      timestamp: Date.now(),
    });
  }

  /**
   * Write WAV file header
   */
  private writeWavFile(
    filename: string,
    audioData: Buffer,
    sampleRate: number,
    channels: number,
    bitsPerSample: number,
  ): void {
    const header = Buffer.alloc(44);

    header.write("RIFF", 0);
    header.writeUInt32LE(36 + audioData.length, 4);
    header.write("WAVE", 8);

    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE((sampleRate * channels * bitsPerSample) / 8, 28);
    header.writeUInt16LE((channels * bitsPerSample) / 8, 32);
    header.writeUInt16LE(bitsPerSample, 34);

    header.write("data", 36);
    header.writeUInt32LE(audioData.length, 40);

    const combinedBuffer = Buffer.concat([header, audioData]);
    fs.writeFileSync(filename, combinedBuffer);
  }

  /**
   * Cleanup sessions
   */
  cleanup(): void {
    for (const session of this.sessions.values()) {
      session.isListening = false;
      session.isSpeaking = false;
    }
    this.sessions.clear();
  }
}

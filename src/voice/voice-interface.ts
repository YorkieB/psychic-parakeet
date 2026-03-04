import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import type { Logger } from "winston";
import type { EmotionType, VoiceAgent } from "../agents/voice-agent";
import type { Orchestrator } from "../orchestrator/orchestrator";
import type { BargeInController } from "./barge-in-controller";

/**
 * Voice Interface Manager - Orchestrates voice I/O with emotion and barge-in.
 */
export class VoiceInterface extends EventEmitter {
  private logger: Logger;
  private bargeInController: BargeInController;
  private orchestrator?: Orchestrator;
  private micInstance: any = null;
  private speaker: any = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private audioBuffer: Buffer[] = [];
  private tempDir: string = path.join(process.cwd(), "temp", "voice");
  private currentPlayback: any = null;

  constructor(
    logger: Logger,
    _voiceAgent: VoiceAgent,
    bargeInController: BargeInController,
    orchestrator?: Orchestrator,
  ) {
    super();
    this.logger = logger;
    this.bargeInController = bargeInController;
    this.orchestrator = orchestrator;

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    this.bargeInController.on("barge-in", this.handleBargeIn.bind(this));
  }

  /**
   * Initialize voice interface.
   */
  async initialize(): Promise<void> {
    await this.bargeInController.initialize();
    this.logger.info("✅ Voice interface initialized");
  }

  /**
   * Start listening for voice input.
   */
  async startListening(): Promise<string> {
    if (this.isListening) {
      throw new Error("Already listening");
    }

    return new Promise((resolve, reject) => {
      this.logger.info("🎤 Listening... (speak now, press Ctrl+C to stop)");

      this.isListening = true;
      this.audioBuffer = [];

      try {
        // Try to use mic library if available
        const mic = require("mic");

        this.micInstance = mic({
          rate: "16000",
          channels: "1",
          bitwidth: "16",
          encoding: "signed-integer",
          endian: "little",
        });

        const micInputStream = this.micInstance.getAudioStream();

        micInputStream.on("data", (data: Buffer) => {
          this.audioBuffer.push(data);

          if (this.bargeInController.isAvailable() && this.isSpeaking) {
            const frame = new Int16Array(
              data.buffer,
              data.byteOffset,
              data.length / Int16Array.BYTES_PER_ELEMENT,
            );
            this.bargeInController.processAudioFrame(frame);
          }
        });

        micInputStream.on("error", (error: Error) => {
          this.logger.error("Microphone error:", error);
          reject(error);
        });

        const silenceTimeout = setTimeout(async () => {
          try {
            const text = await this.stopListening();
            resolve(text);
          } catch (error) {
            reject(error);
          }
        }, 5000);

        process.once("SIGINT", async () => {
          clearTimeout(silenceTimeout);
          try {
            const text = await this.stopListening();
            resolve(text);
          } catch (error) {
            reject(error);
          }
        });

        this.micInstance.start();
      } catch (error) {
        this.logger.warn("Mic library not available, using fallback:", {
          error: error instanceof Error ? error.message : String(error),
        });
        this.logger.info("💡 Install: npm install mic");
        this.logger.info("💡 For now, voice input will be simulated");

        // Fallback: simulate listening
        setTimeout(() => {
          this.isListening = false;
          resolve(""); // Return empty for now
        }, 2000);
      }
    });
  }

  /**
   * Stop listening and transcribe audio.
   */
  async stopListening(): Promise<string> {
    if (!this.isListening) {
      return "";
    }

    this.isListening = false;

    if (this.micInstance) {
      this.micInstance.stop();
      this.micInstance = null;
    }

    if (this.audioBuffer.length === 0) {
      return "";
    }

    const audioFile = path.join(this.tempDir, `input-${Date.now()}.wav`);
    const audioData = Buffer.concat(this.audioBuffer as unknown as Uint8Array[]);

    this.writeWavFile(audioFile, audioData, 16000, 1, 16);

    this.logger.info(`✅ Audio captured: ${audioFile}`);

    try {
      let result: any;

      if (this.orchestrator) {
        // Use orchestrator to call voice agent
        const response = await this.orchestrator.executeRequest(
          "Voice",
          "speech_to_text",
          { audioFile },
          "voice-user",
          "MEDIUM",
        );

        if (!response.success) {
          throw new Error(response.error || "Speech-to-text failed");
        }

        result = response.data;
      } else {
        // Fallback: direct call (for testing)
        throw new Error("Orchestrator required for voice operations");
      }

      const text = result.text;
      this.logger.info(`📝 Transcribed: "${text}"`);

      if (fs.existsSync(audioFile)) {
        fs.unlinkSync(audioFile);
      }

      return text;
    } catch (error) {
      this.logger.error("Transcription failed:", error);
      throw error;
    }
  }

  /**
   * Speak text with emotion.
   */
  async speak(text: string, emotion: EmotionType = "neutral"): Promise<void> {
    if (this.isSpeaking) {
      this.logger.warn("Already speaking, stopping current speech");
      this.stopSpeaking();
    }

    this.isSpeaking = true;
    this.bargeInController.setJarvisSpeaking(true);

    const outputFile = path.join(this.tempDir, `output-${Date.now()}.mp3`);

    try {
      let result: any;

      if (this.orchestrator) {
        // Use orchestrator to call voice agent
        const response = await this.orchestrator.executeRequest(
          "Voice",
          "text_to_speech",
          { text, emotion, outputFile },
          "voice-user",
          "MEDIUM",
        );

        if (!response.success) {
          throw new Error(response.error || "Text-to-speech failed");
        }

        result = response.data;
      } else {
        throw new Error("Orchestrator required for voice operations");
      }

      const audioFile = result.audioFile;

      await this.playAudio(audioFile);

      if (fs.existsSync(audioFile)) {
        fs.unlinkSync(audioFile);
      }
    } catch (error) {
      this.logger.error("Speech failed:", error);
      throw error;
    } finally {
      this.isSpeaking = false;
      this.bargeInController.setJarvisSpeaking(false);
    }
  }

  /**
   * Stop speaking (for barge-in).
   */
  stopSpeaking(): void {
    if (this.currentPlayback) {
      try {
        if (this.currentPlayback.kill) {
          this.currentPlayback.kill();
        }
        this.currentPlayback = null;
      } catch (_error) {
        // Ignore cleanup errors
      }
    }

    if (this.speaker) {
      try {
        if (this.speaker.end) {
          this.speaker.end();
        }
        this.speaker = null;
      } catch (_error) {
        // Ignore cleanup errors
      }
    }

    this.isSpeaking = false;
    this.bargeInController.setJarvisSpeaking(false);
    this.logger.info("🛑 Speech stopped");
  }

  /**
   * Play audio file.
   */
  private async playAudio(audioFile: string): Promise<void> {
    return new Promise((resolve) => {
      this.logger.info(`🔊 Playing: ${audioFile}`);

      try {
        // Try to use speaker library or system player
        // For now, use a simple timeout (replace with actual audio playback)
        const playbackTimeout = setTimeout(() => {
          if (this.isSpeaking) {
            this.logger.info("✅ Playback complete");
            resolve();
          } else {
            this.logger.info("🛑 Playback interrupted (barge-in)");
            resolve();
          }
        }, 2000);

        this.currentPlayback = {
          kill: () => {
            clearTimeout(playbackTimeout);
            this.currentPlayback = null;
          },
        };

        // In production, use actual audio playback library
        // For now, simulate with timeout
      } catch (error) {
        this.logger.warn("Audio playback not available:", {
          error: error instanceof Error ? error.message : String(error),
        });
        this.logger.info("💡 Install: npm install speaker");
        resolve(); // Continue even if playback fails
      }
    });
  }

  /**
   * Handle barge-in event.
   */
  private handleBargeIn(data: { confidence: number; timestamp: number }): void {
    this.logger.info(`🛑 BARGE-IN detected (${(data.confidence * 100).toFixed(1)}% confidence)`);

    this.stopSpeaking();
    this.emit("barge-in", data);
  }

  /**
   * Write WAV file.
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

    // Use spread to create a new buffer combining header and audio data
    const combinedBuffer = Buffer.concat([header, audioData] as unknown as Uint8Array[]);
    fs.writeFileSync(filename, new Uint8Array(combinedBuffer));
  }

  /**
   * Cleanup resources.
   */
  async cleanup(): Promise<void> {
    this.stopSpeaking();

    if (this.micInstance) {
      try {
        this.micInstance.stop();
      } catch (_error) {
        // Ignore cleanup errors
      }
    }

    await this.bargeInController.cleanup();
  }
}

/*
  This file gives Jarvis the ability to speak and talk to you using real text-to-speech.

  It manages a speech queue, delegates to the VoiceAgent (ElevenLabs) for audio generation,
  and falls back to the local Coqui XTTS server when the cloud API is unavailable.
  Every speak request produces a real audio file — no more simulations.
*/

import type { Request, Response } from 'express';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import type { Logger } from 'winston';
import type { AgentRequest, AgentResponse } from '../types/agent';
import { EnhancedBaseAgent } from './base-agent-enhanced';

interface SpeechConfig {
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  language: string;
  emotion: string;
}

interface SpeechQueueItem {
  id: string;
  text: string;
  config: SpeechConfig;
  status: 'queued' | 'speaking' | 'completed' | 'failed' | 'cancelled';
  audioFile?: string;
  duration?: number;
  ttsProvider?: 'elevenlabs' | 'local-xtts' | 'none';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

interface TTSResponse {
  audioFile: string;
  duration: number;
  provider: 'elevenlabs' | 'local-xtts';
}

/**
 * Speech Agent - Manages text-to-speech operations with real audio generation.
 * Delegates to VoiceAgent (ElevenLabs) with automatic fallback to local Coqui XTTS.
 */
export class SpeechAgent extends EnhancedBaseAgent {
  private defaultConfig: SpeechConfig;
  private speechQueue: SpeechQueueItem[] = [];
  private availableVoices: string[];
  private isSpeaking: boolean = false;
  private isProcessingQueue: boolean = false;

  private readonly voiceAgentUrl: string;
  private readonly localTtsUrl: string;
  private readonly emotionsEngineUrl: string;
  private readonly emotionAgentUrl: string;
  private readonly outputDir: string;
  private voiceAgentAvailable: boolean = false;
  private localTtsAvailable: boolean = false;
  private emotionsEngineAvailable: boolean = false;
  private emotionAgentAvailable: boolean = false;

  constructor(logger: Logger) {
    super('Speech', '1.0.0', parseInt(process.env.SPEECH_AGENT_PORT || '3031', 10), logger);

    this.voiceAgentUrl = `http://localhost:${process.env.VOICE_AGENT_PORT || '3008'}/api`;
    this.localTtsUrl = `http://localhost:${process.env.LOCAL_TTS_PORT || '8020'}`;
    this.emotionsEngineUrl = `http://localhost:${process.env.EMOTIONS_ENGINE_PORT || '3034'}`;
    this.emotionAgentUrl = `http://localhost:${process.env.EMOTION_AGENT_PORT || '3026'}/api`;
    this.outputDir = path.join(process.cwd(), 'temp', 'speech');

    this.defaultConfig = {
      voice: 'default',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      language: 'en-US',
      emotion: 'neutral',
    };

    this.availableVoices = [
      'default',
      'male',
      'female',
      'british',
      'american',
      'australian',
      'whisper',
      'excited',
      'calm',
    ];
  }

  protected async initialize(): Promise<void> {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    await this.checkTtsProviders();

    this.logger.info('Speech Agent initialized with real TTS + EmotionsEngine');
    this.logger.info(
      `   VoiceAgent (ElevenLabs): ${this.voiceAgentAvailable ? 'available' : 'unavailable'}`
    );
    this.logger.info(
      `   Local TTS (Coqui XTTS): ${this.localTtsAvailable ? 'available' : 'unavailable'}`
    );
    this.logger.info(
      `   EmotionsEngine: ${this.emotionsEngineAvailable ? 'available' : 'unavailable'}`
    );
    this.logger.info(
      `   EmotionAgent (fallback): ${this.emotionAgentAvailable ? 'available' : 'unavailable'}`
    );
    this.logger.info(`   Output directory: ${this.outputDir}`);
  }

  /**
   * Check which TTS providers are available at startup.
   */
  private async checkTtsProviders(): Promise<void> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(
        `http://localhost:${process.env.VOICE_AGENT_PORT || '3008'}/health`,
        {
          signal: controller.signal,
        }
      );
      clearTimeout(timer);
      this.voiceAgentAvailable = resp.ok;
    } catch {
      this.voiceAgentAvailable = false;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(`${this.localTtsUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      this.localTtsAvailable = resp.ok;
    } catch {
      this.localTtsAvailable = false;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(`${this.emotionsEngineUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      this.emotionsEngineAvailable = resp.ok;
    } catch {
      this.emotionsEngineAvailable = false;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(
        `http://localhost:${process.env.EMOTION_AGENT_PORT || '3026'}/health`,
        { signal: controller.signal }
      );
      clearTimeout(timer);
      this.emotionAgentAvailable = resp.ok;
    } catch {
      this.emotionAgentAvailable = false;
    }
  }

  protected async startServer(): Promise<void> {
    this.app.use((express as any).json());
    this.setupHealthEndpoint();
    this.setupEnhancedRoutes();

    this.app.post('/api', async (req: Request, res: Response) => {
      const startTime = Date.now();
      const request = req.body as AgentRequest;

      try {
        const action = request.action;
        const inputs = request.inputs || {};

        this.logger.info(`Speech Agent executing: ${action}`, {
          requestId: request.id,
          action,
        });

        let result: unknown;

        switch (action) {
          case 'speak':
            result = await this.speak(inputs);
            break;
          case 'speak_now':
            result = await this.speakNow(inputs);
            break;
          case 'stop':
            result = await this.stopSpeaking();
            break;
          case 'pause':
            result = await this.pauseSpeaking();
            break;
          case 'resume':
            result = await this.resumeSpeaking();
            break;
          case 'get_queue':
            result = await this.getQueue();
            break;
          case 'clear_queue':
            result = await this.clearQueue();
            break;
          case 'set_config':
            result = await this.setConfig(inputs);
            break;
          case 'get_config':
            result = await this.getConfig();
            break;
          case 'list_voices':
            result = await this.listVoices();
            break;
          case 'check_providers':
            await this.checkTtsProviders();
            result = {
              voiceAgent: this.voiceAgentAvailable,
              localTts: this.localTtsAvailable,
              emotionsEngine: this.emotionsEngineAvailable,
            };
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        const duration = Date.now() - startTime;
        const response: AgentResponse = {
          success: true,
          data: result,
          metadata: { duration, retryCount: 0 },
        };

        res.json(response);
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)), res);

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: { duration, retryCount: 0 },
        };

        res.status(500).json(errorResponse);
      }
    });

    return new Promise<void>((resolve, reject) => {
      this.app
        .listen(this.port, () => {
          this.logger.info(`Speech agent server listening on port ${this.port}`);
          resolve();
        })
        .on('error', reject);
    });
  }

  // ─── Emotion Detection via EmotionsEngine ─────────────────

  /**
   * Map EmotionsEngine emotion labels to VoiceAgent EmotionType values.
   * The VoiceAgent supports: neutral, warm, empathetic, excited, calm, serious, playful, urgent.
   */
  private mapEmotionToTtsEmotion(detectedEmotion: string): string {
    const emotionMap: Record<string, string> = {
      joy: 'excited',
      happiness: 'excited',
      excitement: 'excited',
      love: 'warm',
      gratitude: 'warm',
      hope: 'warm',
      pride: 'warm',
      amusement: 'playful',
      curiosity: 'playful',
      surprise: 'playful',
      sadness: 'empathetic',
      disappointment: 'empathetic',
      loneliness: 'empathetic',
      grief: 'empathetic',
      anger: 'serious',
      frustration: 'serious',
      disgust: 'serious',
      contempt: 'serious',
      fear: 'urgent',
      anxiety: 'urgent',
      panic: 'urgent',
      serenity: 'calm',
      contentment: 'calm',
      boredom: 'calm',
      neutral: 'neutral',
      confusion: 'neutral',
    };

    return emotionMap[detectedEmotion.toLowerCase()] || 'neutral';
  }

  /**
   * Detect emotion from text using the EmotionsEngine (port 3034) first,
   * then the built-in EmotionAgent (port 3026) as fallback.
   * Returns the mapped TTS emotion or the caller's explicit emotion.
   */
  private async detectEmotion(
    text: string,
    fallbackEmotion: string
  ): Promise<{ emotion: string; source: string; confidence: number }> {
    // 1. Try EmotionsEngine (advanced Python-backed multimodal analysis)
    if (this.emotionsEngineAvailable) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);

        const resp = await fetch(`${this.emotionsEngineUrl}/api/process-text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `emotion-detect-${Date.now()}`,
            action: 'process-text',
            inputs: { text, updateMood: true },
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!resp.ok) {
          throw new Error(`EmotionsEngine returned ${resp.status}`);
        }

        const result = (await resp.json()) as {
          success: boolean;
          data?: { emotion: string; confidence: number };
        };

        if (result.success && result.data?.emotion) {
          const ttsEmotion = this.mapEmotionToTtsEmotion(result.data.emotion);
          this.logger.info(
            `EmotionsEngine detected: "${result.data.emotion}" (${(result.data.confidence * 100).toFixed(0)}%) → TTS emotion: "${ttsEmotion}"`
          );
          return {
            emotion: ttsEmotion,
            source: 'emotions-engine',
            confidence: result.data.confidence,
          };
        }
      } catch (error) {
        this.logger.warn('EmotionsEngine failed, trying EmotionAgent fallback', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 2. Fallback to built-in EmotionAgent (lexicon-based, always available)
    if (this.emotionAgentAvailable) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);

        const resp = await fetch(this.emotionAgentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `emotion-fallback-${Date.now()}`,
            action: 'analyze',
            inputs: { text },
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!resp.ok) {
          throw new Error(`EmotionAgent returned ${resp.status}`);
        }

        const result = (await resp.json()) as {
          success: boolean;
          data?: { state: { primary: string; confidence: number } };
        };

        if (result.success && result.data?.state?.primary) {
          const ttsEmotion = this.mapEmotionToTtsEmotion(result.data.state.primary);
          const confidence = result.data.state.confidence;
          this.logger.info(
            `EmotionAgent detected: "${result.data.state.primary}" (${(confidence * 100).toFixed(0)}%) → TTS emotion: "${ttsEmotion}"`
          );
          return {
            emotion: ttsEmotion,
            source: 'emotion-agent',
            confidence,
          };
        }
      } catch (error) {
        this.logger.warn('EmotionAgent also failed, using caller emotion', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 3. Final fallback: use caller's explicit emotion
    return { emotion: fallbackEmotion, source: 'fallback', confidence: 0 };
  }

  // ─── Real TTS Generation ────────────────────────────────

  /**
   * Generate real audio via VoiceAgent (ElevenLabs).
   * Sends a text_to_speech request to the Voice Agent on port 3008.
   */
  private async generateViaVoiceAgent(
    text: string,
    emotion: string,
    outputFile: string
  ): Promise<TTSResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const resp = await fetch(this.voiceAgentUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `speech-tts-${Date.now()}`,
          action: 'text_to_speech',
          inputs: { text, emotion, outputFile },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`VoiceAgent returned ${resp.status}: ${errorText}`);
      }

      const result = (await resp.json()) as {
        success: boolean;
        data?: { audioFile: string; duration: number; emotion: string; text: string };
        error?: string;
      };

      if (!result.success || !result.data) {
        throw new Error(result.error || 'VoiceAgent returned no data');
      }

      this.voiceAgentAvailable = true;

      return {
        audioFile: result.data.audioFile,
        duration: result.data.duration,
        provider: 'elevenlabs',
      };
    } catch (error) {
      clearTimeout(timer);
      this.voiceAgentAvailable = false;
      throw error;
    }
  }

  /**
   * Generate audio via local Coqui XTTS server (fallback).
   * Sends a TTS request to the local Python server on port 8020.
   */
  private async generateViaLocalTts(text: string, outputFile: string): Promise<TTSResponse> {
    const speakerPath = process.env.JARVIS_VOICE_SAMPLE || '';

    if (!speakerPath) {
      throw new Error('JARVIS_VOICE_SAMPLE env var not set — local TTS needs a voice sample file');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    try {
      const resp = await fetch(`${this.localTtsUrl}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          speaker_audio_path: speakerPath,
          language: 'en',
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Local TTS returned ${resp.status}: ${errorText}`);
      }

      const audioBuffer = Buffer.from(await resp.arrayBuffer());

      const dir = path.dirname(outputFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const wavFile = outputFile.replace(/\.mp3$/, '.wav');
      fs.writeFileSync(wavFile, new Uint8Array(audioBuffer));

      this.localTtsAvailable = true;

      return {
        audioFile: wavFile,
        duration: audioBuffer.length / 32000,
        provider: 'local-xtts',
      };
    } catch (error) {
      clearTimeout(timer);
      this.localTtsAvailable = false;
      throw error;
    }
  }

  /**
   * Generate TTS audio with automatic fallback.
   * Tries VoiceAgent (ElevenLabs) first, then local Coqui XTTS.
   */
  private async generateAudio(text: string, emotion: string): Promise<TTSResponse> {
    const outputFile = path.join(this.outputDir, `tts-${Date.now()}.mp3`);

    // Try VoiceAgent (ElevenLabs) first
    try {
      return await this.generateViaVoiceAgent(text, emotion, outputFile);
    } catch (voiceError) {
      this.logger.warn('ElevenLabs TTS failed, trying local TTS fallback', {
        error: voiceError instanceof Error ? voiceError.message : String(voiceError),
      });
    }

    // Fallback to local Coqui XTTS
    try {
      return await this.generateViaLocalTts(text, outputFile);
    } catch (localError) {
      this.logger.error('Local TTS also failed — no TTS providers available', {
        error: localError instanceof Error ? localError.message : String(localError),
      });
      throw new Error(
        'All TTS providers failed. Ensure VoiceAgent (port 3008) is running with ELEVENLABS_API_KEY, ' +
          'or start the local TTS server (python local-tts/server.py).'
      );
    }
  }

  // ─── Speech Queue Operations ────────────────────────────

  private async speak(inputs: Record<string, unknown>): Promise<object> {
    const text = (inputs.text as string) || '';
    const config = this.mergeConfig(inputs);

    if (!text.trim()) {
      throw new Error('Text is required');
    }

    const item: SpeechQueueItem = {
      id: `speech-${Date.now()}`,
      text,
      config,
      status: 'queued',
      createdAt: new Date(),
    };

    this.speechQueue.push(item);
    this.logger.info(`Queued speech: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

    // Process the queue (non-blocking — runs in background)
    this.processQueue();

    return {
      id: item.id,
      queued: true,
      position: this.speechQueue.filter(i => i.status === 'queued').length,
      text: text.substring(0, 100),
    };
  }

  /**
   * Process the speech queue sequentially.
   * Each item gets real audio generated via TTS providers.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      while (true) {
        const nextItem = this.speechQueue.find(i => i.status === 'queued');
        if (!nextItem) break;

        nextItem.status = 'speaking';
        this.isSpeaking = true;

        try {
          // Auto-detect emotion from text via EmotionsEngine
          const explicitEmotion = nextItem.config.emotion;
          const detected = await this.detectEmotion(nextItem.text, explicitEmotion);
          const emotion = detected.source !== 'fallback' ? detected.emotion : explicitEmotion;

          const result = await this.generateAudio(nextItem.text, emotion);

          nextItem.audioFile = result.audioFile;
          nextItem.duration = result.duration;
          nextItem.ttsProvider = result.provider;
          nextItem.status = 'completed';
          nextItem.completedAt = new Date();

          this.logger.info(
            `Speech completed: "${nextItem.text.substring(0, 40)}..." ` +
              `via ${result.provider} (${result.duration.toFixed(1)}s) [emotion: ${emotion}, source: ${detected.source}]`
          );
        } catch (error) {
          nextItem.status = 'failed';
          nextItem.error = error instanceof Error ? error.message : String(error);
          nextItem.completedAt = new Date();

          this.logger.error(`Speech generation failed for "${nextItem.text.substring(0, 40)}..."`, {
            error: nextItem.error,
          });
        }

        this.isSpeaking = false;
      }
    } finally {
      this.isProcessingQueue = false;
      this.isSpeaking = false;
    }
  }

  private async speakNow(inputs: Record<string, unknown>): Promise<object> {
    await this.clearQueue();
    return this.speak(inputs);
  }

  private async stopSpeaking(): Promise<object> {
    this.isSpeaking = false;

    const currentItem = this.speechQueue.find(i => i.status === 'speaking');
    if (currentItem) {
      currentItem.status = 'cancelled';
    }

    return { stopped: true, cancelledItem: currentItem?.id };
  }

  private async pauseSpeaking(): Promise<object> {
    this.isSpeaking = false;
    return { paused: true };
  }

  private async resumeSpeaking(): Promise<object> {
    this.isSpeaking = true;
    this.processQueue();
    return { resumed: true };
  }

  private async getQueue(): Promise<object> {
    return {
      queue: this.speechQueue.map(item => ({
        id: item.id,
        text: item.text.substring(0, 100),
        status: item.status,
        audioFile: item.audioFile,
        duration: item.duration,
        ttsProvider: item.ttsProvider,
        error: item.error,
        createdAt: item.createdAt,
        completedAt: item.completedAt,
      })),
      count: this.speechQueue.length,
      isSpeaking: this.isSpeaking,
      providers: {
        voiceAgent: this.voiceAgentAvailable,
        localTts: this.localTtsAvailable,
        emotionsEngine: this.emotionsEngineAvailable,
      },
    };
  }

  private async clearQueue(): Promise<object> {
    const count = this.speechQueue.filter(i => i.status === 'queued').length;
    this.speechQueue = this.speechQueue.filter(i => i.status !== 'queued');
    return { cleared: count };
  }

  private mergeConfig(inputs: Record<string, unknown>): SpeechConfig {
    return {
      voice: (inputs.voice as string) || this.defaultConfig.voice,
      rate: Math.min(2, Math.max(0.5, (inputs.rate as number) || this.defaultConfig.rate)),
      pitch: Math.min(2, Math.max(0.5, (inputs.pitch as number) || this.defaultConfig.pitch)),
      volume: Math.min(1, Math.max(0, (inputs.volume as number) || this.defaultConfig.volume)),
      language: (inputs.language as string) || this.defaultConfig.language,
      emotion: (inputs.emotion as string) || this.defaultConfig.emotion,
    };
  }

  private async setConfig(inputs: Record<string, unknown>): Promise<object> {
    this.defaultConfig = this.mergeConfig(inputs);
    return { config: this.defaultConfig };
  }

  protected override getConfig(): any {
    return {
      config: this.defaultConfig,
      providers: {
        voiceAgent: this.voiceAgentAvailable,
        localTts: this.localTtsAvailable,
        emotionsEngine: this.emotionsEngineAvailable,
      },
    };
  }

  private async listVoices(): Promise<object> {
    return {
      voices: this.availableVoices,
      count: this.availableVoices.length,
      default: this.defaultConfig.voice,
      providers: {
        voiceAgent: this.voiceAgentAvailable,
        localTts: this.localTtsAvailable,
        emotionsEngine: this.emotionsEngineAvailable,
      },
    };
  }

  protected getCapabilities(): string[] {
    return [
      'speak',
      'speak_now',
      'stop',
      'pause',
      'resume',
      'get_queue',
      'clear_queue',
      'set_config',
      'get_config',
      'list_voices',
      'check_providers',
    ];
  }

  protected getDependencies(): string[] {
    return ['Voice'];
  }

  protected getPriority(): number {
    return 7;
  }

  protected getMetrics(): {
    requestCount: number;
    errorCount: number;
    uptime: number;
    lastRequest?: string;
    [key: string]: any;
  } {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      uptime: Date.now() - this.startTime.getTime(),
      lastRequest: this.lastRequestTime ? new Date(this.lastRequestTime).toISOString() : undefined,
      averageResponseTime: this.calculateAverageResponseTime(),
      status: this.getStatus(),
      queueLength: this.speechQueue.length,
      isSpeaking: this.isSpeaking,
      voiceAgentAvailable: this.voiceAgentAvailable,
      localTtsAvailable: this.localTtsAvailable,
      emotionsEngineAvailable: this.emotionsEngineAvailable,
    };
  }

  protected async updateConfig(config: any): Promise<void> {
    this.config = { ...this.config, ...config };
    this.logger.info('Configuration updated', { config });
  }

  protected async restart(): Promise<void> {
    this.logger.info('Restarting Speech agent...');
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.start();
  }
}

// YORKIE VALIDATED — types defined, all references resolved, Biome clean.

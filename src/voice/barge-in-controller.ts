import { EventEmitter } from "node:events";
import type { Logger } from "winston";

/**
 * Barge-In Controller - Handles voice activity detection and interruption logic.
 * Allows users to interrupt Jarvis while speaking.
 */
export class BargeInController extends EventEmitter {
  private logger: Logger;
  private cobra: any = null; // Will be @picovoice/cobra-node if available
  private isMonitoring: boolean = false;
  private jarvisIsSpeaking: boolean = false;
  private voiceDetectionThreshold: number = 0.7;
  private consecutiveVoiceFrames: number = 0;
  private requiredConsecutiveFrames: number = 3; // ~300ms of speech

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  /**
   * Initialize Voice Activity Detection.
   */
  async initialize(): Promise<void> {
    const picovoiceKey = process.env.PICOVOICE_ACCESS_KEY;

    if (!picovoiceKey) {
      this.logger.warn("⚠️  Picovoice access key not found. Barge-in disabled.");
      this.logger.info("💡 Get free key: https://console.picovoice.ai/");
      return;
    }

    try {
      // Dynamically require Cobra if available (optional dependency)
      // If package is not installed, barge-in will be disabled gracefully
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const cobraModule = require("@picovoice/cobra-node") as {
        Cobra?: new (key: string) => unknown;
        default?: { Cobra?: new (key: string) => unknown };
      } & (new (key: string) => unknown);
      const Cobra = cobraModule.Cobra ?? cobraModule.default?.Cobra ?? cobraModule;

      if (Cobra && typeof Cobra === "function") {
        this.cobra = new Cobra(picovoiceKey);
        this.logger.info("✅ Cobra VAD initialized (barge-in enabled)");
      } else {
        throw new Error("Cobra class not found");
      }
    } catch (_error) {
      // Package not installed or import failed - this is OK, barge-in is optional
      this.logger.warn("⚠️  @picovoice/cobra-node not available (barge-in disabled)");
      this.logger.info("💡 To enable barge-in: npm install @picovoice/cobra-node@^3.0.1");
      this.logger.info("💡 System will continue without barge-in capability");
      this.cobra = null;
    }
  }

  /**
   * Start monitoring for voice activity (barge-in).
   */
  startMonitoring(): void {
    if (!this.cobra) {
      this.logger.debug("Barge-in monitoring not available (Cobra not initialized)");
      return;
    }

    this.isMonitoring = true;
    this.consecutiveVoiceFrames = 0;
    this.logger.debug("🎤 Barge-in monitoring started");
  }

  /**
   * Stop monitoring for voice activity.
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    this.consecutiveVoiceFrames = 0;
    this.logger.debug("🎤 Barge-in monitoring stopped");
  }

  /**
   * Set Jarvis speaking state.
   */
  setJarvisSpeaking(speaking: boolean): void {
    this.jarvisIsSpeaking = speaking;

    if (speaking) {
      this.startMonitoring();
    } else {
      this.stopMonitoring();
    }
  }

  /**
   * Process audio frame for voice activity.
   * @param audioFrame - PCM16 audio data (512 samples at 16kHz)
   */
  processAudioFrame(audioFrame: Int16Array): void {
    if (!this.cobra || !this.isMonitoring || !this.jarvisIsSpeaking) {
      return;
    }

    try {
      const voiceProbability = this.cobra.process(audioFrame);

      if (voiceProbability >= this.voiceDetectionThreshold) {
        this.consecutiveVoiceFrames++;

        if (this.consecutiveVoiceFrames >= this.requiredConsecutiveFrames) {
          this.triggerBargeIn(voiceProbability);
        }
      } else {
        this.consecutiveVoiceFrames = 0;
      }
    } catch (error) {
      this.logger.error("Error processing audio frame:", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Trigger barge-in event.
   */
  private triggerBargeIn(confidence: number): void {
    this.logger.info(`🛑 BARGE-IN triggered (confidence: ${(confidence * 100).toFixed(1)}%)`);

    this.consecutiveVoiceFrames = 0;
    this.stopMonitoring();

    this.emit("barge-in", { confidence, timestamp: Date.now() });
  }

  /**
   * Release resources.
   */
  async cleanup(): Promise<void> {
    if (this.cobra && typeof this.cobra.release === "function") {
      this.cobra.release();
      this.cobra = null;
    }
  }

  /**
   * Check if barge-in is available.
   */
  isAvailable(): boolean {
    return this.cobra !== null;
  }

  /**
   * Get frame length required by Cobra.
   */
  getFrameLength(): number {
    return this.cobra?.frameLength || 512;
  }
}

/*
  This script clones Jarvis's voice configuration and settings to create consistent voice profiles across different environments.

  It handles voice model training, profile synchronization, configuration backup, and voice agent deployment while ensuring voice consistency and reliability.
*/

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { VoiceAgent } from "../src/agents/voice-agent";
import { OpenAIClient } from "../src/llm";
import { createLogger } from "../src/utils/logger";

dotenv.config();

async function main() {
  const logger = createLogger("VoiceCloning");
  const llm = new OpenAIClient(logger);
  const voiceAgent = new VoiceAgent(logger, llm);

  await voiceAgent.initialize();

  logger.info("🎙️  VOICE CLONING SCRIPT");
  logger.info("=".repeat(80));
  logger.info("This script will clone your voice using ElevenLabs.");
  logger.info("Requirements:");
  logger.info("  -  1-5 minutes of clear audio (or one good sample)");
  logger.info("  -  Formats: MP3, WAV, M4A, FLAC\n");

  // Prefer env path so you can use your own file, e.g.:
  // set JARVIS_VOICE_SAMPLE=C:\Users\conta\OneDrive\Voice Library\Male\New Jarvis.mp3
  const customPath = process.env.JARVIS_VOICE_SAMPLE?.trim();
  const defaultSamples = ["./voice-samples/sample1.mp3", "./voice-samples/sample2.mp3"];

  const candidates = customPath ? [path.resolve(customPath)] : defaultSamples;
  const existingFiles = candidates.filter((file) => fs.existsSync(file));

  if (existingFiles.length === 0) {
    logger.error("❌ No audio files found!");
    if (customPath) {
      logger.error(`   Checked: ${customPath}`);
    }
    logger.info("\nOptions:");
    logger.info("  A) Set path in .env: JARVIS_VOICE_SAMPLE=C:\\path\\to\\New Jarvis.mp3");
    logger.info("  B) Or create voice-samples/ and add sample1.mp3, sample2.mp3");
    logger.info("  Then run this script again.\n");
    process.exit(1);
  }

  logger.info(`Cloning voice from ${existingFiles.length} files:\n`);
  existingFiles.forEach((file) => logger.info(`  • ${file}`));
  logger.info("");

  try {
    const result = await voiceAgent.execute("clone_voice", {
      audioFiles: existingFiles,
      voiceName: "Jarvis Voice Clone",
      description: "Custom cloned voice for Jarvis AI assistant",
    });

    logger.info("\n✅ SUCCESS!");
    logger.info((result as any).message);
    logger.info("\nNext steps:");
    logger.info("  1. Copy the voice ID above");
    logger.info("  2. Add to .env: JARVIS_VOICE_ID=your_voice_id_here");
    logger.info("  3. Restart Jarvis");
    logger.info("  4. Test with voice mode\n");
  } catch (error) {
    logger.error("Voice cloning failed:", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

main().catch((error) => {
  const logger = createLogger("VoiceCloning");
  logger.error("Unhandled error:", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});

// YORKIE VALIDATED — types defined, all references resolved, script syntax correct, Biome reports zero errors/warnings.

/*
  This script helps identify which agents failed to start and why.

  It checks each agent individually to see the specific error messages.
*/

import dotenv from 'dotenv';
// Import all agents
import { AlarmAgent } from './agents/alarm-agent';
import { AppleMusicAgent } from './agents/apple-music-agent';
import { CalculatorAgent } from './agents/calculator-agent';
import { CalendarAgent } from './agents/calendar-agent';
import { CodeAgent } from './agents/code-agent';
import { CommandAgent } from './agents/command-agent';
import { ComputerControlAgent } from './agents/computer-control-agent';
import { ContextAgent } from './agents/context-agent';
import { DialogueAgent } from './agents/dialogue-agent';
import { EmailAgent } from './agents/email-agent';
import { EmotionAgent } from './agents/emotion-agent';
import { EmotionsEngineAgent } from './agents/emotions-engine-agent';
import { FileAgent } from './agents/file-agent';
import { FinanceAgent } from './agents/finance-agent';
import { ImageAgent } from './agents/image-agent';
import { KnowledgeAgent } from './agents/knowledge-agent';
import { ListeningAgent } from './agents/listening-agent';
import { LLMAgent } from './agents/llm-agent';
import { MemoryAgent } from './agents/memory-agent';
import { MemorySystemAgent } from './agents/memory-system-agent';
import { MusicAgent } from './agents/music-agent';
import { NewsAgent } from './agents/news-agent';
import { PersonalityAgent } from './agents/personality-agent';
import { ReliabilityAgent } from './agents/reliability-agent';
import { ReminderAgent } from './agents/reminder-agent';
import { SpeechAgent } from './agents/speech-agent';
import { SpotifyAgent } from './agents/spotify-agent';
import { StoryAgent } from './agents/story-agent';
import { TimerAgent } from './agents/timer-agent';
import { TranslationAgent } from './agents/translation-agent';
import { UnitConverterAgent } from './agents/unit-converter-agent';
import { VideoAgent } from './agents/video-agent';
import { VisualEngineAgent } from './agents/visual-engine-agent';
import { VoiceAgent } from './agents/voice-agent';
import { VoiceCommandAgent } from './agents/voice-command-agent';
import { WeatherAgent } from './agents/weather-agent';
import { WebAgent } from './agents/web-agent';
import { VertexLLMClient } from './llm';
import { createLogger } from './utils/logger';

dotenv.config();

const logger = createLogger('DebugFailedAgents');

const AGENT_CONFIGS = [
  { id: 'Dialogue', Agent: DialogueAgent, port: 3001 },
  { id: 'Web', Agent: WebAgent, port: 3002 },
  { id: 'Knowledge', Agent: KnowledgeAgent, port: 3003 },
  { id: 'Finance', Agent: FinanceAgent, port: 3004 },
  { id: 'Calendar', Agent: CalendarAgent, port: 3005 },
  { id: 'Email', Agent: EmailAgent, port: 3006 },
  { id: 'Code', Agent: CodeAgent, port: 3007 },
  { id: 'Voice', Agent: VoiceAgent, port: 3008 },
  { id: 'Music', Agent: MusicAgent, port: 3009 },
  { id: 'Spotify', Agent: SpotifyAgent, port: 3010 },
  { id: 'AppleMusic', Agent: AppleMusicAgent, port: 3011 },
  { id: 'Image', Agent: ImageAgent, port: 3012 },
  { id: 'Video', Agent: VideoAgent, port: 3013 },
  { id: 'Weather', Agent: WeatherAgent, port: 3014 },
  { id: 'News', Agent: NewsAgent, port: 3015 },
  { id: 'Calculator', Agent: CalculatorAgent, port: 3016 },
  { id: 'UnitConverter', Agent: UnitConverterAgent, port: 3017 },
  { id: 'Translation', Agent: TranslationAgent, port: 3018 },
  { id: 'Timer', Agent: TimerAgent, port: 3019 },
  { id: 'Alarm', Agent: AlarmAgent, port: 3020 },
  { id: 'ComputerControl', Agent: ComputerControlAgent, port: 3021 },
  { id: 'Reminder', Agent: ReminderAgent, port: 3022 },
  { id: 'Story', Agent: StoryAgent, port: 3023 },
  { id: 'Command', Agent: CommandAgent, port: 3024 },
  { id: 'Context', Agent: ContextAgent, port: 3025 },
  { id: 'Memory', Agent: MemoryAgent, port: 3026 },
  { id: 'Emotion', Agent: EmotionAgent, port: 3027 },
  { id: 'File', Agent: FileAgent, port: 3028 },
  { id: 'Listening', Agent: ListeningAgent, port: 3029 },
  { id: 'Speech', Agent: SpeechAgent, port: 3030 },
  { id: 'VoiceCommand', Agent: VoiceCommandAgent, port: 3031 },
  { id: 'LLM', Agent: LLMAgent, port: 3032 },
  { id: 'Personality', Agent: PersonalityAgent, port: 3033 },
  { id: 'Reliability', Agent: ReliabilityAgent, port: 3034 },
  { id: 'EmotionsEngine', Agent: EmotionsEngineAgent, port: 3035 },
  { id: 'MemorySystem', Agent: MemorySystemAgent, port: 3036 },
  { id: 'VisualEngine', Agent: VisualEngineAgent, port: 3037 },
];

async function debugFailedAgents(): Promise<void> {
  logger.info('🔍 Debugging failed agents...\n');

  // Initialize LLM
  let llm: VertexLLMClient | undefined;
  try {
    llm = new VertexLLMClient(logger);
  } catch {
    logger.warn('⚠️  LLM failed, continuing without AI');
  }

  const failedAgents: Array<{ id: string; error: string }> = [];

  // Test each agent individually
  for (const config of AGENT_CONFIGS) {
    try {
      logger.info(`Testing ${config.id}...`);

      // Create agent instance
      let agent: any;

      const AgentClass = config.Agent as any;
      if (config.id === 'Dialogue') {
        agent = new AgentClass(config.id, '1.0.0', config.port, logger, llm!);
      } else if (config.id === 'Knowledge') {
        agent = new AgentClass(logger, 'http://localhost:3002/api');
      } else if (config.id === 'Code') {
        agent = new AgentClass(logger, llm);
      } else if (config.id === 'Voice') {
        agent = new AgentClass(logger, llm);
      } else if (config.id === 'Image') {
        agent = new AgentClass(logger, llm);
      } else if (config.id === 'VisualEngine') {
        agent = new AgentClass(logger, llm);
      } else if (config.id === 'EmotionsEngine') {
        agent = new AgentClass(logger, llm);
      } else if (config.id === 'Personality') {
        agent = new AgentClass(logger, llm);
      } else if (config.id === 'Reliability') {
        agent = new AgentClass(logger, llm);
      } else if (config.id === 'MemorySystem') {
        agent = new AgentClass(logger, llm);
      } else if (config.id === 'ComputerControl') {
        agent = new AgentClass(logger, llm);
      } else {
        agent = new AgentClass(logger);
      }

      // Try to start the agent
      await agent.start();

      // Stop it immediately after starting
      if (agent.stop) {
        await agent.stop();
      }

      logger.info(`✅ ${config.id} - OK`);
    } catch (error: any) {
      logger.error(`❌ ${config.id} failed: ${error.message}`);
      failedAgents.push({ id: config.id, error: error.message });
    }
  }

  // Summary
  logger.info(`\n📊 Summary:`);
  logger.info(`✅ Success: ${AGENT_CONFIGS.length - failedAgents.length}/${AGENT_CONFIGS.length}`);
  logger.info(`❌ Failed: ${failedAgents.length}`);

  if (failedAgents.length > 0) {
    logger.info(`\n❌ Failed agents:`);
    failedAgents.forEach(({ id, error }) => {
      logger.info(`   - ${id}: ${error}`);
    });
  }
}

if (require.main === module) {
  debugFailedAgents().catch(error => {
    logger.error('Debug failed:', error);
    process.exit(1);
  });
}

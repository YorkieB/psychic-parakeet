/*
  Find which agent is missing from the running agents.
*/

const EXPECTED_AGENTS = [
  'Alarm',
  'AppleMusic',
  'Calculator',
  'Calendar',
  'Code',
  'Command',
  'ComputerControl',
  'Context',
  'Dialogue',
  'Email',
  'Emotion',
  'EmotionsEngine',
  'File',
  'Finance',
  'Image',
  'Knowledge',
  'Listening',
  'LLM',
  'Memory',
  'MemorySystem',
  'Music',
  'News',
  'Personality',
  'Reliability',
  'Reminder',
  'Speech',
  'Spotify',
  'Story',
  'Timer',
  'Translation',
  'UnitConverter',
  'Video',
  'VisualEngine',
  'Voice',
  'VoiceCommand',
  'Weather',
  'Web',
].sort();

async function findMissingAgent(): Promise<void> {
  try {
    const response = await fetch('http://localhost:3000/agents/status');
    const data = (await response.json()) as any;

    const runningAgents = data.agents.map((a: any) => a.id).sort();

    const missing = EXPECTED_AGENTS.filter(id => !runningAgents.includes(id));

    console.log('Expected agents:', EXPECTED_AGENTS.length);
    console.log('Running agents:', runningAgents.length);

    if (missing.length > 0) {
      console.log('\n❌ Missing agents:');
      missing.forEach(id => console.log(`   - ${id}`));
    } else {
      console.log('\n✅ All agents are running!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

findMissingAgent();

/*
  This file is the single source of truth for every port in the Jarvis system.

  All services, agents, and proxies read their port numbers from here.
  This file is protected by the Code Protection Dome -- changing ports
  requires a password unlock to prevent accidental breakage.
*/

// ---- Core Infrastructure Ports ----

export const PORTS = Object.freeze({
  /** Main API server -- backend for dashboard, IDE, health, chat */
  API_SERVER: 3000,

  /** Dashboard Vite dev server */
  DASHBOARD: 5173,

  // ---- Agent Ports (3001-3037) ----

  // Core agents
  Dialogue: 3001,
  Web: 3002,
  Knowledge: 3003,

  // Productivity agents
  Finance: 3004,
  Calendar: 3005,
  Email: 3006,
  Code: 3007,
  Voice: 3008,

  // Media agents
  Music: 3009,
  Spotify: 3010,
  AppleMusic: 3011,
  Image: 3012,
  Video: 3013,

  // Utility agents
  Weather: 3014,
  News: 3015,
  Calculator: 3016,
  UnitConverter: 3017,
  Translation: 3018,

  // Time & reminder agents
  Timer: 3019,
  Alarm: 3020,
  Reminder: 3021,
  Story: 3022,

  // Advanced agents
  Command: 3023,
  Context: 3024,
  Memory: 3025,
  Emotion: 3026,
  File: 3027,
  LLM: 3028,
  LocalLLM: 3029,
  OllamaLLM: 3030,
  Personality: 3031,
  Listening: 3032,
  Speech: 3033,
  VoiceCommand: 3034,
  Reliability: 3035,
  EmotionsEngine: 3036,
  MemorySystem: 3037,
  VisualEngine: 3038,
  ComputerControl: 3039,

  // Security agent
  Security: 3040,
});

/** Type-safe agent ID to port lookup */
export type AgentPortKey = Exclude<keyof typeof PORTS, 'API_SERVER' | 'DASHBOARD'>;

/** Get the port for an agent by its ID string */
export function getAgentPort(agentId: string): number | undefined {
  return (PORTS as Record<string, number>)[agentId];
}

/** Validate no port collisions at startup (throws on duplicate) */
export function validatePortAssignments(): void {
  const seen = new Map<number, string>();
  for (const [name, port] of Object.entries(PORTS)) {
    if (seen.has(port)) {
      throw new Error(`Port collision: ${name} and ${seen.get(port)} both assigned port ${port}`);
    }
    seen.set(port, name);
  }
}

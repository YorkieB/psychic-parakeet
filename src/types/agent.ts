/**
 * Agent status enumeration representing the current operational state of an agent.
 */
export enum AgentStatus {
  /** Agent is fully operational and ready to handle requests */
  ONLINE = "online",
  /** Agent is operational but experiencing degraded performance */
  DEGRADED = "degraded",
  /** Agent is in maintenance mode and not accepting requests */
  MAINTENANCE = "maintenance",
  /** Agent is offline and unavailable */
  OFFLINE = "offline",
  /** Agent is starting up and not yet ready */
  STARTING = "starting",
  /** Agent has been stopped */
  STOPPED = "stopped",
}

/**
 * Registration information for an agent when it joins the system.
 * Contains metadata about the agent's capabilities, endpoints, and configuration.
 */
export interface AgentRegistration {
  /** Unique identifier for the agent */
  agentId: string;
  /** Version of the agent implementation */
  version: string;
  /** List of capabilities this agent provides */
  capabilities: string[];
  /** Current operational status */
  status: AgentStatus;
  /** HTTP endpoint for health checks */
  healthEndpoint: string;
  /** HTTP endpoint for API requests */
  apiEndpoint: string;
  /** List of other agent IDs this agent depends on */
  dependencies: string[];
  /** Priority level (1-10, higher is more important) */
  priority: number;
  /** Optional cost per request in USD */
  costPerRequest?: number;
}

/**
 * Request structure sent to agents for task execution.
 */
export interface AgentRequest {
  /** Unique request identifier */
  id: string;
  /** Target agent identifier */
  agentId: string;
  /** Action to perform */
  action: string;
  /** Input parameters for the action */
  inputs: Record<string, unknown>;
  /** User identifier making the request */
  userId: string;
  /** Timestamp when request was created */
  timestamp: Date;
  /** Request priority level */
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

/**
 * Response structure returned by agents after task execution.
 */
export interface AgentResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response data (present if success is true) */
  data?: unknown;
  /** Error message (present if success is false) */
  error?: string;
  /** Metadata about the request execution */
  metadata: {
    /** Duration in milliseconds */
    duration: number;
    /** Number of retry attempts made */
    retryCount: number;
    /** Optional cost in USD */
    cost?: number;
  };
}

/**
 * Health check response structure from agents.
 */
export interface HealthCheck {
  /** Overall health status */
  status: "healthy" | "degraded" | "unhealthy";
  /** Uptime in seconds since agent started */
  uptime: number;
  /** Node.js memory usage statistics */
  memory: NodeJS.MemoryUsage;
  /** Timestamp of last request processed (optional) */
  lastRequest?: Date;
  /** Error rate as a percentage (optional) */
  errorRate?: number;
}

/**
 * Search result from Web Agent.
 */
export interface SearchResult {
  /** Title of the search result */
  title: string;
  /** URL of the search result */
  url: string;
  /** Snippet/description of the search result */
  snippet: string;
  /** Hostname of the URL */
  hostname: string;
  /** Optional icon URL for the result */
  icon?: string;
}

/**
 * Search response from Web Agent.
 */
export interface SearchResponse {
  /** Array of search results */
  results: SearchResult[];
  /** Original search query */
  query: string;
  /** Number of results returned */
  resultCount: number;
  /** Total number of results available (optional) */
  totalAvailable?: number;
  /** Timestamp when search was performed */
  timestamp: Date;
  /** Source of the search results */
  source: "brave" | "mock" | "fallback";
  /** Duration of the search in milliseconds (optional) */
  duration?: number;
  /** Error message if search failed (optional) */
  error?: string;
}

/**
 * Research result from Knowledge Agent
 */
export interface ResearchResult {
  /** The topic that was researched */
  topic: string;
  /** Synthesized summary from all sources */
  summary: string;
  /** Array of research sources with relevance scores */
  sources: ResearchSource[];
  /** Key points extracted from research */
  keyPoints: string[];
  /** Confidence score (0.0-1.0) based on source agreement */
  confidence: number;
  /** Timestamp when research was conducted */
  timestamp: Date;
  /** Number of search queries used */
  queriesUsed: number;
  /** Research depth level */
  depth: "quick" | "medium" | "deep";
}

/**
 * Research source with relevance score
 */
export interface ResearchSource {
  /** Title of the source */
  title: string;
  /** URL of the source */
  url: string;
  /** Snippet/description from the source */
  snippet: string;
  /** Relevance score (0.0-1.0) */
  relevance: number;
  /** Hostname of the source */
  hostname: string;
}

/**
 * Fact check result
 */
export interface FactCheckResult {
  /** The claim that was fact-checked */
  claim: string;
  /** Verdict: CONFIRMED, DISPUTED, or UNVERIFIED */
  verdict: "CONFIRMED" | "DISPUTED" | "UNVERIFIED";
  /** Confidence score (0.0-1.0) */
  confidence: number;
  /** Sources that confirm the claim */
  confirmingSources: ResearchSource[];
  /** Sources that contradict the claim */
  contradictingSources: ResearchSource[];
  /** Sources with neutral/unclear information */
  neutralSources: ResearchSource[];
  /** Explanation of the verdict */
  explanation: string;
  /** Timestamp when fact-check was performed */
  timestamp: Date;
}

/**
 * Summary result
 */
export interface Summary {
  /** The query that was summarized */
  query: string;
  /** Combined summary from multiple sources */
  summary: string;
  /** Sources used for the summary */
  sources: Array<{ title: string; url: string }>;
  /** Word count of the summary */
  wordCount: number;
  /** Timestamp when summary was generated */
  timestamp: Date;
}

/**
 * User input to reasoning engine
 */
export interface UserInput {
  /** The text input from the user */
  text: string;
  /** Source of the input */
  source: "text" | "voice" | "api";
  /** User identifier */
  userId: string;
  /** Session identifier for context tracking */
  sessionId: string;
  /** Optional context data */
  context?: Record<string, unknown>;
  /** Timestamp when input was received */
  timestamp: Date;
}

/**
 * Detected user intent
 */
export interface Intent {
  /** Type of intent detected */
  type:
    | "GREETING"
    | "SEARCH"
    | "RESEARCH"
    | "FACT_CHECK"
    | "SUMMARIZE"
    | "CONVERSATION"
    | "UNKNOWN";
  /** Confidence score (0.0-1.0) */
  confidence: number;
  /** Extracted entities (topic, query, claim, etc.) */
  entities: Record<string, string>;
  /** Which agent to use for this intent */
  suggestedAgent: string;
  /** Whether this intent requires multiple agents */
  requiresMultiAgent: boolean;
}

/**
 * Execution plan step
 */
export interface PlanStep {
  /** Unique identifier for this step */
  id: string;
  /** Agent ID to execute this step */
  agentId: string;
  /** Action to perform */
  action: string;
  /** Input parameters for the action */
  inputs: Record<string, unknown>;
  /** IDs of steps that must complete first (optional) */
  dependsOn?: string[];
  /** Timeout in milliseconds (optional) */
  timeout?: number;
}

/**
 * Execution plan
 */
export interface ExecutionPlan {
  /** Unique identifier for this plan */
  id: string;
  /** Steps to execute */
  steps: PlanStep[];
  /** Groups of step IDs that can run in parallel */
  canRunInParallel: string[][];
  /** Estimated duration in milliseconds */
  estimatedDuration: number;
}

/**
 * Agent output from plan execution
 */
export interface AgentOutput {
  /** Step ID that produced this output */
  stepId: string;
  /** Agent ID that executed the step */
  agentId: string;
  /** Whether the step succeeded */
  success: boolean;
  /** Response data (if successful) */
  data?: unknown;
  /** Error message (if failed) */
  error?: string;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Reasoning trace (audit trail)
 */
export interface ReasoningTrace {
  /** Unique identifier for this trace */
  id: string;
  /** Original user input */
  userInput: UserInput;
  /** Detected intent */
  detectedIntent: Intent;
  /** Execution plan */
  plan: ExecutionPlan;
  /** Outputs from each agent step */
  agentOutputs: AgentOutput[];
  /** Final synthesized response text */
  finalResponse: string;
  /** Overall confidence score */
  confidence: number;
  /** Timestamp when reasoning completed */
  timestamp: Date;
  /** Total processing time in milliseconds */
  duration: number;
}

/**
 * Jarvis response to user
 */
export interface JarvisResponse {
  /** The response text to show the user */
  text: string;
  /** ID of the reasoning trace for this response */
  reasoningTraceId: string;
  /** Confidence score (0.0-1.0) */
  confidence: number;
  /** List of agents used to generate this response */
  agentsUsed: string[];
  /** Timestamp when response was generated */
  timestamp: Date;
  /** Optional metadata about the response */
  metadata?: {
    /** Type of intent detected */
    intentType: string;
    /** Number of plan steps executed */
    planSteps: number;
    /** Total duration in milliseconds */
    totalDuration: number;
  };
}

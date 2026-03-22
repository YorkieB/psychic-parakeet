/**
 * Documentation DTOs shared by the representative agent controllers.
 *
 * These interfaces intentionally mirror the stable request and response shapes
 * exposed by the Dialogue, Web, and Knowledge agents so tsoa can generate a
 * readable OpenAPI contract for Phase 1 of the documentation system.
 */

export interface AgentExecutionMetadata {
  /** Time spent fulfilling the request, in milliseconds. */
  duration: number;
  /** Number of retry attempts applied before the final response. */
  retryCount: number;
}

export interface AgentErrorEnvelope {
  /** Indicates that the proxied agent request failed. */
  success: false;
  /** Human-readable error summary returned to the caller. */
  error: string;
  /** Execution metadata captured for the failed request. */
  metadata: AgentExecutionMetadata;
}

export interface MemoryUsageSnapshot {
  /** Resident set size in bytes. */
  rss?: number;
  /** Total V8 heap size in bytes. */
  heapTotal?: number;
  /** Used V8 heap size in bytes. */
  heapUsed?: number;
  /** External memory tracked by Node.js in bytes. */
  external?: number;
  /** Array buffer memory in bytes. */
  arrayBuffers?: number;
}

export interface AgentHealthResponse {
  /** High-level health classification used by monitoring and self-healing. */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Agent uptime, in seconds. */
  uptime: number;
  /** Process memory snapshot when the health probe was served. */
  memory?: MemoryUsageSnapshot;
  /** Count of requests seen since process start, when available. */
  requestCount?: number;
  /** Count of failed requests seen since process start, when available. */
  errorCount?: number;
  /** Average response time tracked by the enhanced base agent. */
  avgResponseTime?: number;
}

export interface AgentMetricsResponse {
  /** Total requests processed by the agent. */
  requestCount: number;
  /** Total requests that ended in an error state. */
  errorCount: number;
  /** Agent uptime, in milliseconds. */
  uptime: number;
  /** ISO timestamp for the most recent handled request. */
  lastRequest?: string;
  /** Rolling average response time in milliseconds. */
  averageResponseTime?: number;
  /** Operational status reported by the agent. */
  status?: string;
}

export interface DialogueRespondRequest {
  /** End-user message to be answered by the Dialogue agent. */
  message: string;
  /**
   * Optional lightweight context to inject into the response generation flow,
   * such as the current topic, session labels, or prior decisions.
   */
  context?: Record<string, string>;
}

export interface DialogueRespondPayload {
  /** Primary natural-language answer returned to the caller. */
  response: string;
  /** Backwards-compatible alias for clients that still read `message`. */
  message: string;
  /** Indicates whether the answer came from the LLM, the web, or fallback logic. */
  source: 'llm' | 'llm+web' | 'mock';
  /** ISO timestamp recorded when the response payload was created. */
  timestamp: string;
}

export interface DialogueResponseEnvelope {
  /** Indicates that the proxied Dialogue request succeeded. */
  success: true;
  /** Dialogue-specific response payload. */
  data: DialogueRespondPayload;
  /** Execution metadata captured for the successful request. */
  metadata: AgentExecutionMetadata;
}

export interface WebSearchRequest {
  /** Search query that should be submitted to the configured search provider. */
  query: string;
  /** Maximum number of results to return. */
  maxResults?: number;
  /** Optional per-request search engine override. */
  engine?: 'auto' | 'brave' | 'google';
}

export interface SearchResultItem {
  /** Human-readable title from the search provider. */
  title: string;
  /** Canonical result URL. */
  url: string;
  /** Excerpt or description returned by the provider. */
  snippet: string;
  /** Hostname derived from the result URL. */
  hostname: string;
}

export interface WebSearchPayload {
  /** Ordered list of normalized search results. */
  results: SearchResultItem[];
  /** Query string used for the search. */
  query: string;
  /** Count of results returned in this response. */
  resultCount: number;
  /** Timestamp recorded by the Web agent when the search completed. */
  timestamp: string;
  /** Provider that fulfilled the request or a fallback source. */
  source: 'brave' | 'google' | 'fallback';
  /** Agent-side duration for the search, in milliseconds. */
  duration?: number;
  /** Optional provider error information when fallback handling was used. */
  error?: string;
}

export interface WebSearchResponseEnvelope {
  /** Indicates that the proxied Web search succeeded. */
  success: boolean;
  /** Search results and provider metadata. */
  data: WebSearchPayload;
  /** Execution metadata captured for the Web agent request. */
  metadata: AgentExecutionMetadata;
  /** Optional error field when the Web agent had to fall back. */
  error?: string;
}

export interface KnowledgeResearchRequest {
  /** Topic or question that should be researched from multiple angles. */
  topic: string;
  /** Depth of research requested for the topic. */
  depth?: 'quick' | 'medium' | 'deep';
}

export interface ResearchSourceItem {
  /** Title of the source document or result. */
  title: string;
  /** Canonical URL for the source. */
  url: string;
  /** Excerpt used in the synthesis pipeline. */
  snippet: string;
  /** Relative relevance score assigned by the Knowledge agent. */
  relevance: number;
  /** Hostname used to help explain provenance. */
  hostname: string;
}

export interface KnowledgeResearchPayload {
  /** Topic that the Knowledge agent researched. */
  topic: string;
  /** Synthesized answer built from the top-ranked sources. */
  summary: string;
  /** Sources retained after de-duplication and ranking. */
  sources: ResearchSourceItem[];
  /** Key points extracted from the highest-value source snippets. */
  keyPoints: string[];
  /** Confidence score for the overall synthesis. */
  confidence: number;
  /** Timestamp recorded when the synthesis completed. */
  timestamp: string;
  /** Number of distinct search queries issued for the topic. */
  queriesUsed: number;
  /** Research depth that drove the query fan-out. */
  depth: 'quick' | 'medium' | 'deep';
}

export interface KnowledgeResearchResponseEnvelope {
  /** Indicates that the Knowledge research request succeeded. */
  success: true;
  /** Research payload generated by the Knowledge agent. */
  data: KnowledgeResearchPayload;
  /** Execution metadata captured for the request. */
  metadata: AgentExecutionMetadata;
}

export interface KnowledgeFactCheckRequest {
  /** Claim that should be verified across multiple sources. */
  claim: string;
  /** Number of sources to inspect per fact-check query. */
  sources?: number;
}

export interface KnowledgeFactCheckPayload {
  /** Claim that was evaluated. */
  claim: string;
  /** Final verdict calculated by the Knowledge agent. */
  verdict: 'CONFIRMED' | 'DISPUTED' | 'UNVERIFIED';
  /** Confidence score for the verdict. */
  confidence: number;
  /** Sources that support the claim. */
  confirmingSources: ResearchSourceItem[];
  /** Sources that dispute the claim. */
  contradictingSources: ResearchSourceItem[];
  /** Sources that were relevant but inconclusive. */
  neutralSources: ResearchSourceItem[];
  /** Narrative explanation of the verdict. */
  explanation: string;
  /** Timestamp recorded when the fact-check completed. */
  timestamp: string;
}

export interface KnowledgeFactCheckResponseEnvelope {
  /** Indicates that the fact-check request succeeded. */
  success: true;
  /** Fact-check result returned by the Knowledge agent. */
  data: KnowledgeFactCheckPayload;
  /** Execution metadata captured for the request. */
  metadata: AgentExecutionMetadata;
}

export interface KnowledgeSummarizeRequest {
  /** Topic or search query to summarize from the web. */
  query: string;
  /** Maximum number of source documents to incorporate. */
  maxSources?: number;
}

export interface SummarySourceItem {
  /** Human-readable source title. */
  title: string;
  /** Canonical URL for the source. */
  url: string;
}

export interface KnowledgeSummaryPayload {
  /** Query that was summarized. */
  query: string;
  /** Combined synthesis built from the fetched sources. */
  summary: string;
  /** Sources cited by the summarized response. */
  sources: SummarySourceItem[];
  /** Word count of the final summary text. */
  wordCount: number;
  /** Timestamp recorded when summarization completed. */
  timestamp: string;
}

export interface KnowledgeSummaryResponseEnvelope {
  /** Indicates that the summarization request succeeded. */
  success: true;
  /** Summarization payload returned by the Knowledge agent. */
  data: KnowledgeSummaryPayload;
  /** Execution metadata captured for the request. */
  metadata: AgentExecutionMetadata;
}

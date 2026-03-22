import {
  Body,
  Controller,
  Example,
  Get,
  OperationId,
  Post,
  Response,
  Route,
  SuccessResponse,
  Tags,
} from 'tsoa';
import {
  type AgentErrorEnvelope,
  type AgentHealthResponse,
  type AgentMetricsResponse,
  type KnowledgeFactCheckRequest,
  type KnowledgeFactCheckResponseEnvelope,
  type KnowledgeResearchRequest,
  type KnowledgeResearchResponseEnvelope,
  type KnowledgeSummarizeRequest,
  type KnowledgeSummaryResponseEnvelope,
} from './agent-doc-models';
import { getAgentBaseUrl, getJson, postAgentJson } from './agent-controller-support';

const KNOWLEDGE_AGENT_URL = getAgentBaseUrl('KNOWLEDGE_AGENT_PORT', '3003');

/**
 * Documentation controller for the Knowledge agent surface.
 *
 * Knowledge operations compose Web agent retrieval with synthesis and
 * verification so external consumers can understand the main research-oriented
 * routes without reverse-engineering the agent internals.
 */
@Route('api/knowledge')
@Tags('Knowledge')
export class KnowledgeAgentController extends Controller {
  /**
   * Get the current health snapshot for the Knowledge agent.
   */
  @Get('health')
  @OperationId('getKnowledgeHealth')
  @SuccessResponse('200', 'Knowledge agent health returned')
  public async getHealth(): Promise<AgentHealthResponse> {
    return getJson<AgentHealthResponse>(`${KNOWLEDGE_AGENT_URL}/health`);
  }

  /**
   * Get rolling synthesis and performance metrics for the Knowledge agent.
   */
  @Get('metrics')
  @OperationId('getKnowledgeMetrics')
  @SuccessResponse('200', 'Knowledge agent metrics returned')
  public async getMetrics(): Promise<AgentMetricsResponse> {
    return getJson<AgentMetricsResponse>(`${KNOWLEDGE_AGENT_URL}/api/metrics`);
  }

  /**
   * Research a topic from multiple angles and synthesize a citation-friendly
   * answer from the highest-value retrieved sources.
   */
  @Post('research')
  @OperationId('researchWithKnowledgeAgent')
  @SuccessResponse('200', 'Research result returned')
  @Response<AgentErrorEnvelope>(400, 'The request body is missing a topic')
  @Response<AgentErrorEnvelope>(500, 'The Knowledge agent research request failed')
  @Example<KnowledgeResearchResponseEnvelope>({
    success: true,
    data: {
      topic: 'documentation drift prevention',
      summary: 'Documentation drift is reduced by generating docs from source code.',
      sources: [
        {
          title: 'Generated documentation guide',
          url: 'https://example.com/generated-docs',
          snippet: 'A representative source snippet.',
          relevance: 0.93,
          hostname: 'example.com',
        },
      ],
      keyPoints: ['Generate API reference from code.', 'Keep architecture rationale in ADRs.'],
      confidence: 0.86,
      timestamp: '2026-03-22T11:05:24.498Z',
      queriesUsed: 3,
      depth: 'medium',
    },
    metadata: {
      duration: 618,
      retryCount: 0,
    },
  })
  public async research(
    @Body() body: KnowledgeResearchRequest
  ): Promise<KnowledgeResearchResponseEnvelope> {
    return postAgentJson<KnowledgeResearchResponseEnvelope>(
      `${KNOWLEDGE_AGENT_URL}/api/research`,
      'Knowledge',
      'research',
      {
        topic: body.topic,
        depth: body.depth,
      }
    );
  }

  /**
   * Verify a claim across multiple sources and return a confidence-weighted
   * verdict describing whether the claim is supported, disputed, or unresolved.
   */
  @Post('fact-check')
  @OperationId('factCheckWithKnowledgeAgent')
  @SuccessResponse('200', 'Fact-check result returned')
  @Response<AgentErrorEnvelope>(400, 'The request body is missing a claim')
  @Response<AgentErrorEnvelope>(500, 'The Knowledge agent fact-check request failed')
  @Example<KnowledgeFactCheckResponseEnvelope>({
    success: true,
    data: {
      claim: 'Generated documentation reduces drift.',
      verdict: 'CONFIRMED',
      confidence: 0.82,
      confirmingSources: [
        {
          title: 'Documentation best practices',
          url: 'https://example.com/best-practices',
          snippet: 'Generated documentation reduces stale reference material.',
          relevance: 0.88,
          hostname: 'example.com',
        },
      ],
      contradictingSources: [],
      neutralSources: [],
      explanation: 'Most retrieved sources support the claim with minimal contradiction.',
      timestamp: '2026-03-22T11:05:24.498Z',
    },
    metadata: {
      duration: 744,
      retryCount: 0,
    },
  })
  public async factCheck(
    @Body() body: KnowledgeFactCheckRequest
  ): Promise<KnowledgeFactCheckResponseEnvelope> {
    return postAgentJson<KnowledgeFactCheckResponseEnvelope>(
      `${KNOWLEDGE_AGENT_URL}/api/fact-check`,
      'Knowledge',
      'fact_check',
      {
        claim: body.claim,
        sources: body.sources,
      }
    );
  }

  /**
   * Summarize current web information about a topic into a concise digest with
   * source references and a computed word count.
   */
  @Post('summarize')
  @OperationId('summarizeWithKnowledgeAgent')
  @SuccessResponse('200', 'Summary returned')
  @Response<AgentErrorEnvelope>(400, 'The request body is missing a query')
  @Response<AgentErrorEnvelope>(500, 'The Knowledge agent summarize request failed')
  @Example<KnowledgeSummaryResponseEnvelope>({
    success: true,
    data: {
      query: 'Jarvis documentation system phase 1',
      summary: 'Phase 1 establishes TypeDoc, representative OpenAPI, ADRs, and a glossary.',
      sources: [
        {
          title: 'Implementation plan',
          url: 'https://example.com/implementation-plan',
        },
      ],
      wordCount: 12,
      timestamp: '2026-03-22T11:05:24.498Z',
    },
    metadata: {
      duration: 403,
      retryCount: 0,
    },
  })
  public async summarize(
    @Body() body: KnowledgeSummarizeRequest
  ): Promise<KnowledgeSummaryResponseEnvelope> {
    return postAgentJson<KnowledgeSummaryResponseEnvelope>(
      `${KNOWLEDGE_AGENT_URL}/api/summarize`,
      'Knowledge',
      'summarize',
      {
        query: body.query,
        maxSources: body.maxSources,
      }
    );
  }
}

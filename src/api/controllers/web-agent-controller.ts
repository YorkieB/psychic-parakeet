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
  type WebSearchRequest,
  type WebSearchResponseEnvelope,
} from './agent-doc-models';
import { getAgentBaseUrl, getJson, postAgentJson } from './agent-controller-support';

const WEB_AGENT_URL = getAgentBaseUrl('WEB_AGENT_PORT', '3002');

/**
 * Documentation controller for the Web agent surface.
 *
 * The Web agent is Jarvis's real-time retrieval layer and is documented here as
 * a focused HTTP API for search and supporting diagnostics.
 */
@Route('api/web')
@Tags('Web')
export class WebAgentController extends Controller {
  /**
   * Get the current health snapshot for the Web agent.
   */
  @Get('health')
  @OperationId('getWebHealth')
  @SuccessResponse('200', 'Web agent health returned')
  public async getHealth(): Promise<AgentHealthResponse> {
    return getJson<AgentHealthResponse>(`${WEB_AGENT_URL}/health`);
  }

  /**
   * Get rolling search and performance metrics for the Web agent.
   */
  @Get('metrics')
  @OperationId('getWebMetrics')
  @SuccessResponse('200', 'Web agent metrics returned')
  public async getMetrics(): Promise<AgentMetricsResponse> {
    return getJson<AgentMetricsResponse>(`${WEB_AGENT_URL}/api/metrics`);
  }

  /**
   * Run a web search through the configured provider and return normalized
   * search results for downstream agent consumption.
   */
  @Post('search')
  @OperationId('searchWithWebAgent')
  @SuccessResponse('200', 'Search results returned')
  @Response<AgentErrorEnvelope>(400, 'The request body is missing a query')
  @Response<AgentErrorEnvelope>(500, 'The Web agent search request failed')
  @Example<WebSearchResponseEnvelope>({
    success: true,
    data: {
      results: [
        {
          title: 'Jarvis documentation system foundations',
          url: 'https://example.com/jarvis-docs',
          snippet: 'A representative result returned by the Web agent.',
          hostname: 'example.com',
        },
      ],
      query: 'jarvis documentation system foundations',
      resultCount: 1,
      timestamp: '2026-03-22T11:05:24.498Z',
      source: 'google',
      duration: 231,
    },
    metadata: {
      duration: 231,
      retryCount: 0,
    },
  })
  public async search(@Body() body: WebSearchRequest): Promise<WebSearchResponseEnvelope> {
    return postAgentJson<WebSearchResponseEnvelope>(
      `${WEB_AGENT_URL}/api/search`,
      'Web',
      'search',
      {
        query: body.query,
        maxResults: body.maxResults,
        engine: body.engine,
      }
    );
  }
}

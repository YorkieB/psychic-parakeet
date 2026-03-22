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
  type DialogueRespondRequest,
  type DialogueResponseEnvelope,
} from './agent-doc-models';
import { getAgentBaseUrl, getJson, postAgentJson } from './agent-controller-support';

const DIALOGUE_AGENT_URL = getAgentBaseUrl('DIALOGUE_AGENT_PORT', '3001');

/**
 * Documentation controller for the Dialogue agent surface.
 *
 * The underlying runtime exposes a generic agent action endpoint; this
 * controller presents the most important conversation route as a stable,
 * discoverable HTTP contract for generated OpenAPI documentation.
 */
@Route('api/dialogue')
@Tags('Dialogue')
export class DialogueAgentController extends Controller {
  /**
   * Get the current health snapshot for the Dialogue agent.
   */
  @Get('health')
  @OperationId('getDialogueHealth')
  @SuccessResponse('200', 'Dialogue agent health returned')
  public async getHealth(): Promise<AgentHealthResponse> {
    return getJson<AgentHealthResponse>(`${DIALOGUE_AGENT_URL}/health`);
  }

  /**
   * Get rolling metrics captured by the enhanced Dialogue agent base class.
   */
  @Get('metrics')
  @OperationId('getDialogueMetrics')
  @SuccessResponse('200', 'Dialogue agent metrics returned')
  public async getMetrics(): Promise<AgentMetricsResponse> {
    return getJson<AgentMetricsResponse>(`${DIALOGUE_AGENT_URL}/api/metrics`);
  }

  /**
   * Generate a conversational response and, when needed, enrich it with recent
   * web context before returning a final answer.
   */
  @Post('respond')
  @OperationId('respondWithDialogueAgent')
  @SuccessResponse('200', 'Dialogue response generated')
  @Response<AgentErrorEnvelope>(400, 'The request body is missing a message')
  @Response<AgentErrorEnvelope>(500, 'The Dialogue agent could not process the request')
  @Example<DialogueResponseEnvelope>({
    success: true,
    data: {
      response: 'Jarvis is online and ready to help.',
      message: 'Jarvis is online and ready to help.',
      source: 'llm',
      timestamp: '2026-03-22T11:05:24.498Z',
    },
    metadata: {
      duration: 184,
      retryCount: 0,
    },
  })
  public async respond(@Body() body: DialogueRespondRequest): Promise<DialogueResponseEnvelope> {
    return postAgentJson<DialogueResponseEnvelope>(
      `${DIALOGUE_AGENT_URL}/api`,
      'Dialogue',
      'respond',
      {
        message: body.message,
        context: body.context,
      }
    );
  }
}

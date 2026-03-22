/**
 * Shared proxy helpers for the documentation controllers.
 *
 * Phase 1 keeps the generated OpenAPI contract close to the running services by
 * forwarding documentation controller calls to the existing agent HTTP APIs
 * instead of re-implementing business logic in a second code path.
 */

type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface AgentProxyRequest {
  id: string;
  agentId: string;
  action: string;
  inputs: Record<string, unknown>;
  userId: string;
  timestamp: string;
  priority: RequestPriority;
}

export function getAgentBaseUrl(portEnvName: string, fallbackPort: string): string {
  return `http://localhost:${process.env[portEnvName] || fallbackPort}`;
}

export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function postAgentJson<T>(
  url: string,
  agentId: string,
  action: string,
  inputs: Record<string, unknown>,
  priority: RequestPriority = 'MEDIUM'
): Promise<T> {
  const requestBody: AgentProxyRequest = {
    id: `docs_${agentId.toLowerCase()}_${Date.now()}`,
    agentId,
    action,
    inputs,
    userId: 'documentation-system',
    timestamp: new Date().toISOString(),
    priority,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

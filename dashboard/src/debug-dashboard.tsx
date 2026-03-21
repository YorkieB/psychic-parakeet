/*
  This is the live health dashboard for all Jarvis agents.

  It polls every 30 seconds, shows real-time agent status with memory and uptime,
  and has a live feed log that uses plain English to explain what's happening — including
  exact file names and line numbers when something goes wrong.
*/

import { useCallback, useEffect, useRef, useState } from 'react';
import { JarvisIDE } from './components/JarvisIDE';

interface AgentDiagnostics {
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  recentErrors: Array<{
    message: string;
    file?: string;
    line?: number;
    column?: number;
    timestamp: string;
  }>;
}

interface AgentData {
  name: string;
  status: string;
  isHealthy: boolean;
  pid: number;
  lastPing: string;
  port: number;
  uptime: number;
  memory: { rss: number; heapUsed: number; heapTotal: number } | null;
  diagnostics: AgentDiagnostics;
  capabilities: string[];
  priority: number;
  sensorLive: boolean;
}

interface FeedEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  detail?: string;
  description?: string;
  suggestedFixes?: string[];
}

const POLL_INTERVAL = 30000;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function agentNameToFilePath(name: string): string {
  const overrides: Record<string, string> = {
    EmotionsEngine: 'src/agents/emotions-engine-agent.ts',
    VisualEngine: 'src/agents/visual-engine-agent.ts',
    MemorySystem: 'src/agents/memory-system-agent.ts',
    ComputerControl: 'src/agents/computer-control-agent.ts',
    VoiceCommand: 'src/agents/voice-command-agent.ts',
    AppleMusic: 'src/agents/apple-music-agent.ts',
    UnitConverter: 'src/agents/unit-converter-agent.ts',
  };
  if (overrides[name]) return overrides[name];
  const kebab = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  return `src/agents/${kebab}-agent.ts`;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function buildFeedEntries(agents: AgentData[], prevAgents: AgentData[]): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const now = new Date().toISOString();

  const prevMap = new Map(prevAgents.map(a => [a.name, a]));

  for (const agent of agents) {
    const prev = prevMap.get(agent.name);

    // Agent came online
    if (!prev && agent.isHealthy) {
      entries.push({
        id: `${agent.name}-online-${now}`,
        timestamp: now,
        level: 'success',
        message: `${agent.name} is online and healthy on port ${agent.port}.`,
        description: `The ${agent.name} agent just started up and is working normally. It's listening on port ${agent.port} and ready to handle requests. Uptime: ${formatUptime(agent.uptime)}, Memory: ${agent.memory ? formatBytes(agent.memory.heapUsed) : 'N/A'}.`,
        suggestedFixes: ['No action needed — everything is running smoothly.'],
      });
    }

    // Agent went from healthy to unhealthy
    if (prev?.isHealthy && !agent.isHealthy) {
      const latestErr = agent.diagnostics?.recentErrors?.[0];
      entries.push({
        id: `${agent.name}-down-${now}`,
        timestamp: now,
        level: 'error',
        message: `${agent.name} just went down! It was running on port ${agent.port}.`,
        detail: latestErr
          ? `Problem: ${latestErr.message}${latestErr.file ? ` — check ${latestErr.file}` : ''}${latestErr.line ? ` at line ${latestErr.line}` : ''}`
          : undefined,
        description: `The ${agent.name} agent was previously working fine, but it has now stopped responding or reported itself as unhealthy. This means any features that depend on ${agent.name} won't work until it recovers.${latestErr ? `\n\nThe last error it reported was: "${latestErr.message}"${latestErr.file ? ` in the file ${latestErr.file}` : ''}${latestErr.line ? ` at line ${latestErr.line}` : ''}.` : ''}`,
        suggestedFixes: [
          `Check the terminal/logs for ${agent.name} — look for crash messages or stack traces.`,
          `Try restarting Jarvis (npm run dev:all) to bring all agents back up.`,
          latestErr?.file
            ? `Open ${latestErr.file}${latestErr.line ? ` at line ${latestErr.line}` : ''} and look for the bug.`
            : 'Check for recent code changes that might have broken this agent.',
          `Make sure port ${agent.port} isn't being used by another program.`,
        ].filter(Boolean) as string[],
      });
    }

    // Agent recovered
    if (prev && !prev.isHealthy && agent.isHealthy) {
      entries.push({
        id: `${agent.name}-recovered-${now}`,
        timestamp: now,
        level: 'success',
        message: `${agent.name} has recovered and is healthy again.`,
        description: `Great news! The ${agent.name} agent was down but has now come back online. It's healthy and processing requests normally on port ${agent.port}. If it keeps going up and down, there might be an underlying issue worth investigating.`,
        suggestedFixes: [
          'No immediate action needed — the agent recovered on its own.',
          'If this keeps happening, check the agent logs for recurring errors.',
          "Consider increasing the agent's memory limit if it's crashing from memory pressure.",
        ],
      });
    }

    // Agent is unreachable
    if (!agent.sensorLive) {
      const latestErr = agent.diagnostics?.recentErrors?.[0];
      entries.push({
        id: `${agent.name}-unreachable-${now}`,
        timestamp: now,
        level: 'error',
        message: `Can't reach ${agent.name} on port ${agent.port} — it might have crashed or the port is blocked.`,
        detail: latestErr
          ? `Look at: ${latestErr.file || 'unknown file'}${latestErr.line ? `:${latestErr.line}` : ''}`
          : undefined,
        description: `The dashboard tried to connect to the ${agent.name} agent on port ${agent.port}, but couldn't get a response. This usually means the agent has crashed, frozen, or never started properly. Any features powered by ${agent.name} are currently offline.${latestErr ? `\n\nLast known error: "${latestErr.message}"${latestErr.file ? ` in ${latestErr.file}` : ''}.` : ''}`,
        suggestedFixes: [
          `Check if the ${agent.name} process is still running (look in your terminal).`,
          `Make sure nothing else is using port ${agent.port} (run: netstat -ano | findstr ${agent.port}).`,
          'Restart Jarvis to bring all agents back up.',
          latestErr?.file
            ? `Look at ${latestErr.file}${latestErr.line ? `:${latestErr.line}` : ''} for the root cause.`
            : "Check the agent's source code for startup errors.",
          "If the agent needs an API key or external service, make sure it's configured in .env.",
        ].filter(Boolean) as string[],
      });
    }

    // New errors since last poll
    if (prev && agent.diagnostics.errorCount > (prev.diagnostics?.errorCount ?? 0)) {
      const newErrorCount = agent.diagnostics.errorCount - (prev.diagnostics?.errorCount ?? 0);
      const latestError =
        agent.diagnostics.recentErrors?.[agent.diagnostics.recentErrors.length - 1];
      const totalErrs = agent.diagnostics.errorCount;
      entries.push({
        id: `${agent.name}-errors-${now}`,
        timestamp: now,
        level: 'warn',
        message: `${agent.name} had ${newErrorCount} new error${newErrorCount > 1 ? 's' : ''} since last check.`,
        detail: latestError
          ? `Latest: "${latestError.message}"${latestError.file ? ` in ${latestError.file}` : ''}${latestError.line ? ` at line ${latestError.line}` : ''}`
          : undefined,
        description: `The ${agent.name} agent is still running, but it hit ${newErrorCount} new error${newErrorCount > 1 ? 's' : ''} since the last health check (${totalErrs} total errors since startup). The agent is trying to keep going, but repeated errors could mean something needs fixing.${latestError ? `\n\nMost recent error: "${latestError.message}"${latestError.file ? ` — this happened in ${latestError.file}` : ''}${latestError.line ? ` around line ${latestError.line}` : ''}.` : ''}`,
        suggestedFixes: [
          latestError?.file
            ? `Open ${latestError.file}${latestError.line ? ` at line ${latestError.line}` : ''} and investigate the error.`
            : "Check the agent's recent log output for error details.",
          `If the errors are from API calls, make sure the external service (API keys, URLs) is configured correctly in .env.`,
          newErrorCount > 5
            ? 'This agent is throwing a lot of errors — consider restarting it to clear any bad state.'
            : 'A few errors can be normal, but keep an eye on it over the next few checks.',
          `You can restart just this agent by sending a POST to http://localhost:${agent.port}/api/restart.`,
        ].filter(Boolean) as string[],
      });
    }

    // High memory warning (> 200MB RSS)
    if (agent.memory && agent.memory.rss > 200 * 1024 * 1024) {
      const rssStr = formatBytes(agent.memory.rss);
      const heapStr = formatBytes(agent.memory.heapUsed);
      const heapTotalStr = formatBytes(agent.memory.heapTotal);
      entries.push({
        id: `${agent.name}-highmem-${now}`,
        timestamp: now,
        level: 'warn',
        message: `${agent.name} is using a lot of memory (${rssStr} RSS). This could slow things down.`,
        description: `The ${agent.name} agent is consuming ${rssStr} of system memory (RSS), which is above the 200MB warning threshold. It's using ${heapStr} of its ${heapTotalStr} allocated JavaScript heap. High memory usage can make the agent sluggish and, if it keeps growing, could eventually cause a crash.`,
        suggestedFixes: [
          `Restart the agent to free up memory (POST to http://localhost:${agent.port}/api/restart).`,
          'If memory keeps climbing after restart, there may be a memory leak — check for large arrays or caches that never get cleaned up.',
          'Consider reducing the amount of data the agent holds in memory (e.g., shrink log buffers or caches).',
          'Monitor if this happens regularly — if so, file a bug to investigate the leak.',
        ],
      });
    }

    // Slow response time warning (> 500ms average)
    if (agent.diagnostics.avgResponseTime > 500) {
      const avgMs = agent.diagnostics.avgResponseTime;
      const avgSec = (avgMs / 1000).toFixed(1);
      entries.push({
        id: `${agent.name}-slow-${now}`,
        timestamp: now,
        level: 'warn',
        message: `${agent.name} is responding slowly — average ${avgMs}ms per request.`,
        description: `The ${agent.name} agent is taking an average of ${avgMs}ms (${avgSec} seconds) to respond to each request. Healthy agents typically respond in under 500ms. Slow responses can make Jarvis feel laggy, and other agents waiting on ${agent.name} may time out.${avgMs > 2000 ? '\n\nThis is significantly slow — the agent might be overloaded, waiting on an external API, or doing heavy computation.' : ''}`,
        suggestedFixes: [
          `Check if ${agent.name} depends on an external API that might be slow or rate-limited.`,
          'If the agent makes network calls, check your internet connection and API service status.',
          avgMs > 2000
            ? `The response time is very high (${avgSec}s). Consider restarting the agent to clear any backlog.`
            : 'This is mildly slow — it may resolve on its own as load decreases.',
          `You can restart it: POST http://localhost:${agent.port}/api/restart`,
          "If this persists, look for expensive operations in the agent's request handler code.",
        ],
      });
    }
  }

  // If everything is fine, add a single "all good" entry
  if (entries.length === 0 && agents.length > 0) {
    const healthy = agents.filter(a => a.isHealthy).length;
    entries.push({
      id: `all-ok-${now}`,
      timestamp: now,
      level: 'info',
      message: `All systems normal. ${healthy}/${agents.length} agents are healthy. Next check in 30 seconds.`,
      description: `Every agent is responding normally. ${healthy} out of ${agents.length} agents are online and healthy with no new errors or performance issues detected.`,
      suggestedFixes: ['No action needed — everything is working as expected.'],
    });
  }

  return entries;
}

const levelColors: Record<string, string> = {
  info: '#8b9dc3',
  success: '#4CAF50',
  warn: '#FFC107',
  error: '#f44336',
};

const levelIcons: Record<string, string> = {
  info: 'ℹ️',
  success: '✅',
  warn: '⚠️',
  error: '🔴',
};

export function DebugDashboard() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [fixStatus, setFixStatus] = useState<
    'idle' | 'diagnosing' | 'fixing' | 'success' | 'failed'
  >('idle');
  const [fixLog, setFixLog] = useState<string[]>([]);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'dashboard' | 'code-editor'>('dashboard');
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPolled, setLastPolled] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000);
  const prevAgentsRef = useRef<AgentData[]>([]);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const fetchAgents = useCallback(async (retries = 0): Promise<void> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [2000, 4000, 8000]; // Exponential backoff: 2s, 4s, 8s

    try {
      const response = await fetch('/health/agents');
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();

      if (data.success && data.data && data.data.agents) {
        const newAgents: AgentData[] = data.data.agents.map(
          (a: Partial<AgentData> & { name: string }) => ({
            name: a.name ?? 'Unknown',
            status: a.status ?? 'unknown',
            isHealthy: a.isHealthy ?? false,
            pid: a.pid ?? 0,
            lastPing: a.lastPing ?? new Date().toISOString(),
            port: a.port ?? 0,
            uptime: a.uptime ?? 0,
            memory: a.memory ?? null,
            diagnostics: a.diagnostics ?? {
              requestCount: 0,
              errorCount: 0,
              avgResponseTime: 0,
              recentErrors: [],
            },
            capabilities: a.capabilities ?? [],
            priority: a.priority ?? 0,
            sensorLive: a.sensorLive ?? a.isHealthy ?? false,
          })
        );
        const newEntries = buildFeedEntries(newAgents, prevAgentsRef.current);

        setAgents(newAgents);
        setError(null);
        setLastPolled(data.data.polledAt || new Date().toISOString());
        setFeed(prev => [...prev, ...newEntries].slice(-200));
        prevAgentsRef.current = newAgents;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      // Retry silently if we haven't exhausted attempts
      if (retries < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retries] || 8000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchAgents(retries + 1);
      }

      // All retries exhausted — now show the error
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setFeed(prev => [
        ...prev,
        {
          id: `fetch-error-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'error' as const,
          message: `Dashboard couldn't reach the API — ${msg}. Will try again in 30 seconds.`,
        },
      ]);
    } finally {
      setLoading(false);
      setCountdown(POLL_INTERVAL / 1000);
    }
  }, []);

  // Initial fetch + 30s polling
  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => (c > 0 ? c - 1 : POLL_INTERVAL / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll feed
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feed]);

  // Close tools menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setToolsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const healthyCount = agents.filter(a => a.isHealthy).length;
  const unhealthyCount = agents.filter(a => !a.isHealthy).length;
  const totalErrors = agents.reduce((sum, a) => sum + (a.diagnostics?.errorCount ?? 0), 0);

  // ─── Agent Modal helpers ─────────────────────────────

  function getAgentDiagnosis(agent: AgentData): { problems: string[]; isOk: boolean } {
    const problems: string[] = [];

    if (!agent.isHealthy) {
      problems.push(
        `${agent.name} is reporting itself as unhealthy. It may have hit a critical error or failed an internal check.`
      );
    }
    if (!agent.sensorLive) {
      problems.push(
        `The dashboard can't reach ${agent.name} on port ${agent.port}. The agent may have crashed or never started.`
      );
    }
    if (agent.diagnostics.errorCount > 0) {
      problems.push(
        `${agent.name} has logged ${agent.diagnostics.errorCount} error${agent.diagnostics.errorCount > 1 ? 's' : ''} since startup.`
      );
      const latest = agent.diagnostics.recentErrors?.[agent.diagnostics.recentErrors.length - 1];
      if (latest) {
        problems.push(
          `Latest error: "${latest.message}"${latest.file ? ` in ${latest.file}` : ''}${latest.line ? ` at line ${latest.line}` : ''}.`
        );
      }
    }
    if (agent.diagnostics.avgResponseTime > 500) {
      problems.push(
        `Average response time is ${agent.diagnostics.avgResponseTime}ms, which is above the 500ms healthy threshold. The agent may be overloaded or waiting on a slow external service.`
      );
    }
    if (agent.memory && agent.memory.rss > 200 * 1024 * 1024) {
      problems.push(
        `Memory usage is high at ${formatBytes(agent.memory.rss)} RSS. This could cause slowdowns or eventually crash the agent.`
      );
    }

    return { problems, isOk: problems.length === 0 };
  }

  function getAgentSuggestedFixes(agent: AgentData): string[] {
    const fixes: string[] = [];
    if (!agent.sensorLive) {
      fixes.push('Restart Jarvis to bring all agents back online.');
      fixes.push(`Check if port ${agent.port} is blocked or in use by another program.`);
      fixes.push('Look at the terminal output for crash messages or stack traces.');
    }
    if (!agent.isHealthy && agent.sensorLive) {
      fixes.push('Try restarting this agent using the AI Fix button below.');
      fixes.push('Check .env for missing API keys or configuration this agent needs.');
    }
    if (agent.diagnostics.errorCount > 0) {
      const latest = agent.diagnostics.recentErrors?.[agent.diagnostics.recentErrors.length - 1];
      if (latest?.file) {
        fixes.push(
          `Open ${latest.file}${latest.line ? ` at line ${latest.line}` : ''} and investigate the error.`
        );
      }
      fixes.push('Check .env for correct API keys if errors are from external service calls.');
    }
    if (agent.diagnostics.avgResponseTime > 500) {
      fixes.push('Restart the agent to clear any request backlog.');
      fixes.push(`Check if ${agent.name} depends on a slow external API.`);
    }
    if (agent.memory && agent.memory.rss > 200 * 1024 * 1024) {
      fixes.push('Restart the agent to free memory.');
      fixes.push('Look for memory leaks in large arrays or caches that never get cleaned.');
    }
    if (fixes.length === 0) {
      fixes.push('No issues detected — this agent is running perfectly.');
    }
    return fixes;
  }

  async function attemptAiFix(agent: AgentData) {
    setFixStatus('diagnosing');
    setFixLog(['Diagnosing issues...']);

    await new Promise(r => setTimeout(r, 800));

    const diagnosis = getAgentDiagnosis(agent);
    if (diagnosis.isOk) {
      setFixLog(prev => [...prev, 'No problems found — agent is healthy.']);
      setFixStatus('success');
      return;
    }

    setFixLog(prev => [
      ...prev,
      `Found ${diagnosis.problems.length} issue${diagnosis.problems.length > 1 ? 's' : ''}.`,
    ]);
    await new Promise(r => setTimeout(r, 500));

    setFixStatus('fixing');
    setFixLog(prev => [...prev, `Attempting to restart ${agent.name} on port ${agent.port}...`]);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const resp = await fetch(`http://localhost:${agent.port}/api/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (resp.ok) {
        setFixLog(prev => [...prev, 'Restart signal sent successfully.']);
        await new Promise(r => setTimeout(r, 2000));

        setFixLog(prev => [...prev, 'Checking health after restart...']);
        try {
          const healthResp = await fetch(`http://localhost:${agent.port}/health`, {
            signal: AbortSignal.timeout(3000),
          });
          if (healthResp.ok) {
            setFixLog(prev => [...prev, `${agent.name} is responding and healthy again!`]);
            setFixStatus('success');
            fetchAgents();
          } else {
            setFixLog(prev => [
              ...prev,
              `${agent.name} responded but reports unhealthy. Manual investigation needed.`,
            ]);
            setFixStatus('failed');
          }
        } catch {
          setFixLog(prev => [
            ...prev,
            `${agent.name} is not responding yet. It may need more time or a full Jarvis restart.`,
          ]);
          setFixStatus('failed');
        }
      } else {
        setFixLog(prev => [
          ...prev,
          `Restart request failed (HTTP ${resp.status}). The agent may not support remote restart.`,
        ]);
        setFixStatus('failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('abort')) {
        setFixLog(prev => [
          ...prev,
          'Restart request timed out — the agent may be completely unresponsive.',
        ]);
      } else {
        setFixLog(prev => [...prev, `Couldn't reach the agent: ${msg}`]);
      }
      setFixLog(prev => [...prev, 'Try restarting Jarvis manually (npm run dev:all).']);
      setFixStatus('failed');
    }

    // After fix attempt, send diagnosis to the IDE's AI chat for further help
    const fixes = getAgentSuggestedFixes(agent);
    const filePath = agentNameToFilePath(agent.name);
    const prompt = [
      `## AI Fix Report for ${agent.name}`,
      `**File:** \`${filePath}\` | **Port:** ${agent.port}`,
      '',
      '### Problems Detected',
      ...diagnosis.problems.map(p => `- ${p}`),
      '',
      '### Suggested Fixes',
      ...fixes.map(f => `- ${f}`),
      '',
      `Please analyze \`${filePath}\` and suggest code changes to fix these issues.`,
    ].join('\n');

    // Switch to IDE panel, then dispatch after mount delay
    setActivePanel('code-editor');
    setSelectedAgent(null);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('jarvis:ai-fix', { detail: { prompt, filePath } }));
    }, 300);
  }

  function openAgentInIDE(agent: AgentData) {
    const filePath = agentNameToFilePath(agent.name);
    setActivePanel('code-editor');
    setSelectedAgent(null);
    // Delay dispatch so JarvisIDE has time to mount and register its event listener
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('jarvis:open-file', { detail: { filePath } }));
    }, 300);
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#0a0e27',
          color: 'white',
          fontSize: '18px',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Connecting to Jarvis...
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#0a0e27',
        color: '#e0e6f0',
        minHeight: '100vh',
        padding: '24px',
        fontFamily: "'DM Sans', Arial, sans-serif",
      }}
    >
      {/* Top Menu Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          background: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '10px',
          padding: '10px 20px',
        }}
      >
        {/* Left: Title + Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '20px',
              color: '#fff',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onClick={() => setActivePanel('dashboard')}
          >
            Jarvis Health Dashboard
          </h1>

          {/* Nav tabs */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setActivePanel('dashboard')}
              style={{
                background: activePanel === 'dashboard' ? '#1a2332' : 'transparent',
                border: activePanel === 'dashboard' ? '1px solid #2a3a4a' : '1px solid transparent',
                color: activePanel === 'dashboard' ? '#fff' : '#8b9dc3',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activePanel === 'dashboard' ? 600 : 400,
                transition: 'all 0.15s ease',
              }}
            >
              Dashboard
            </button>

            {/* Tools dropdown */}
            <div ref={toolsMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setToolsMenuOpen(prev => !prev)}
                style={{
                  background:
                    activePanel !== 'dashboard'
                      ? '#1a2332'
                      : toolsMenuOpen
                        ? '#1a2332'
                        : 'transparent',
                  border:
                    activePanel !== 'dashboard' || toolsMenuOpen
                      ? '1px solid #2a3a4a'
                      : '1px solid transparent',
                  color: activePanel !== 'dashboard' || toolsMenuOpen ? '#fff' : '#8b9dc3',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: activePanel !== 'dashboard' ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                Tools
                <span
                  style={{
                    fontSize: '10px',
                    transition: 'transform 0.15s ease',
                    transform: toolsMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  ▼
                </span>
              </button>

              {/* Dropdown */}
              {toolsMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    background: '#111827',
                    border: '1px solid #2a3a4a',
                    borderRadius: '8px',
                    padding: '6px',
                    minWidth: '200px',
                    zIndex: 900,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    animation: 'feedExpand 0.12s ease-out',
                  }}
                >
                  <button
                    onClick={() => {
                      setActivePanel('code-editor');
                      setToolsMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      background: activePanel === 'code-editor' ? '#1a2332' : 'transparent',
                      border: 'none',
                      color: '#e0e6f0',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      textAlign: 'left',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = '#1a2332';
                    }}
                    onMouseLeave={e => {
                      if (activePanel !== 'code-editor')
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>✏️</span>
                    <div>
                      <div style={{ fontWeight: 500 }}>Code Editor</div>
                      <div style={{ fontSize: '11px', color: '#8b9dc3', marginTop: '1px' }}>
                        Edit agent source files
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Status + Refresh */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            fontSize: '13px',
            color: '#8b9dc3',
          }}
        >
          <span>
            Next check in{' '}
            <strong style={{ color: countdown <= 5 ? '#FFC107' : '#4CAF50' }}>{countdown}s</strong>
          </span>
          {lastPolled && <span>Last: {new Date(lastPolled).toLocaleTimeString()}</span>}
          <button
            onClick={() => fetchAgents()}
            style={{
              background: '#1a2332',
              border: '1px solid #2a3a4a',
              color: '#4CAF50',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* ─── Full IDE Panel ─── */}
      {activePanel === 'code-editor' && <JarvisIDE />}

      {/* ─── Dashboard Content ─── */}
      {activePanel === 'dashboard' && (
        <>
          {/* Summary bar */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <div
              style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                padding: '16px 24px',
                flex: 1,
              }}
            >
              <div style={{ fontSize: '12px', color: '#8b9dc3', marginBottom: '4px' }}>
                Total Agents
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>
                {agents.length}
              </div>
            </div>
            <div
              style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                padding: '16px 24px',
                flex: 1,
              }}
            >
              <div style={{ fontSize: '12px', color: '#8b9dc3', marginBottom: '4px' }}>Healthy</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#4CAF50' }}>
                {healthyCount}
              </div>
            </div>
            <div
              style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                padding: '16px 24px',
                flex: 1,
              }}
            >
              <div style={{ fontSize: '12px', color: '#8b9dc3', marginBottom: '4px' }}>
                Unhealthy
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: unhealthyCount > 0 ? '#f44336' : '#4CAF50',
                }}
              >
                {unhealthyCount}
              </div>
            </div>
            <div
              style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                padding: '16px 24px',
                flex: 1,
              }}
            >
              <div style={{ fontSize: '12px', color: '#8b9dc3', marginBottom: '4px' }}>
                Total Errors
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: totalErrors > 0 ? '#FFC107' : '#4CAF50',
                }}
              >
                {totalErrors}
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: '#2d1b1b',
                border: '1px solid #f44336',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                color: '#f44336',
              }}
            >
              Connection issue: {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
            {/* Agent grid */}
            <div>
              <h2 style={{ fontSize: '16px', marginBottom: '12px', color: '#8b9dc3' }}>
                Agent Status
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '10px',
                }}
              >
                {agents.map(agent => (
                  <div
                    key={agent.name}
                    onClick={() => {
                      setSelectedAgent(agent);
                      setFixStatus('idle');
                      setFixLog([]);
                    }}
                    style={{
                      background: '#111827',
                      border: `1px solid ${agent.isHealthy ? '#1f3a1f' : agent.sensorLive ? '#3a2a1f' : '#3a1f1f'}`,
                      borderRadius: '8px',
                      padding: '12px',
                      borderLeft: `3px solid ${agent.isHealthy ? '#4CAF50' : agent.sensorLive ? '#FFC107' : '#f44336'}`,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease, transform 0.1s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#4a5a6a';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = agent.isHealthy
                        ? '#1f3a1f'
                        : agent.sensorLive
                          ? '#3a2a1f'
                          : '#3a1f1f';
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <strong style={{ fontSize: '14px', color: '#fff' }}>{agent.name}</strong>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: agent.isHealthy ? '#1a3a1a' : '#3a1a1a',
                          color: agent.isHealthy ? '#4CAF50' : '#f44336',
                        }}
                      >
                        {agent.status}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#8b9dc3',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '4px',
                      }}
                    >
                      <span>Port: {agent.port}</span>
                      <span>Up: {formatUptime(agent.uptime)}</span>
                      {agent.memory && <span>Mem: {formatBytes(agent.memory.heapUsed)}</span>}
                      <span>Reqs: {agent.diagnostics?.requestCount ?? 0}</span>
                      {(agent.diagnostics?.errorCount ?? 0) > 0 && (
                        <span style={{ color: '#FFC107' }}>
                          Errs: {agent.diagnostics.errorCount}
                        </span>
                      )}
                      {agent.diagnostics?.avgResponseTime > 0 && (
                        <span>Avg: {agent.diagnostics.avgResponseTime}ms</span>
                      )}
                    </div>
                    {!agent.sensorLive && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#6b7b9c',
                          fontFamily: 'monospace',
                          background: '#111827',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          marginTop: '4px',
                        }}
                      >
                        Sensor offline — can&apos;t reach this agent
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Live Feed Log */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <h2 style={{ fontSize: '16px', margin: 0, color: '#8b9dc3' }}>Live Feed</h2>
                <button
                  onClick={() => setFeed([])}
                  style={{
                    background: 'transparent',
                    border: '1px solid #2a3a4a',
                    color: '#8b9dc3',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  Clear
                </button>
              </div>
              <div
                style={{
                  background: '#0d1117',
                  border: '1px solid #1f2937',
                  borderRadius: '8px',
                  padding: '12px',
                  flex: 1,
                  maxHeight: 'calc(100vh - 240px)',
                  overflowY: 'auto',
                  fontFamily: "'DM Sans', monospace",
                  fontSize: '13px',
                }}
              >
                {feed.length === 0 && (
                  <div style={{ color: '#555', textAlign: 'center', padding: '40px 0' }}>
                    Waiting for first health check...
                  </div>
                )}
                {feed.map(entry => {
                  const isExpanded = expandedId === entry.id;
                  const hasExpandable =
                    entry.description || (entry.suggestedFixes && entry.suggestedFixes.length > 0);
                  return (
                    <div
                      key={entry.id}
                      style={{
                        padding: '8px 0',
                        borderBottom: '1px solid #161d27',
                        cursor: hasExpandable ? 'pointer' : 'default',
                        transition: 'background 0.15s ease',
                      }}
                      onClick={() => {
                        if (hasExpandable) {
                          setExpandedId(isExpanded ? null : entry.id);
                        }
                      }}
                      onKeyDown={e => {
                        if (hasExpandable && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          setExpandedId(isExpanded ? null : entry.id);
                        }
                      }}
                      role={hasExpandable ? 'button' : undefined}
                      tabIndex={hasExpandable ? 0 : undefined}
                    >
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span>{levelIcons[entry.level] || 'ℹ️'}</span>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                            }}
                          >
                            <span style={{ color: levelColors[entry.level] || '#8b9dc3' }}>
                              {entry.message}
                            </span>
                            {hasExpandable && (
                              <span
                                style={{
                                  color: '#555',
                                  fontSize: '12px',
                                  marginLeft: '8px',
                                  transition: 'transform 0.2s ease',
                                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  flexShrink: 0,
                                }}
                              >
                                ▼
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#444', marginTop: '2px' }}>
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      {/* Expanded detail panel */}
                      {isExpanded && (
                        <div
                          style={{
                            marginTop: '10px',
                            marginLeft: '28px',
                            background: '#111827',
                            border: `1px solid ${entry.level === 'error' ? '#3a1f1f' : entry.level === 'warn' ? '#3a2a1f' : '#1f2937'}`,
                            borderRadius: '8px',
                            padding: '14px 16px',
                            animation: 'feedExpand 0.2s ease-out',
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          {/* Description */}
                          {entry.description && (
                            <div
                              style={{ marginBottom: entry.suggestedFixes?.length ? '12px' : 0 }}
                            >
                              <div
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#8b9dc3',
                                  marginBottom: '6px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                }}
                              >
                                What's happening
                              </div>
                              <div
                                style={{
                                  fontSize: '13px',
                                  color: '#c8d0e0',
                                  lineHeight: '1.6',
                                  whiteSpace: 'pre-line',
                                }}
                              >
                                {entry.description}
                              </div>
                            </div>
                          )}

                          {/* Suggested fixes */}
                          {entry.suggestedFixes && entry.suggestedFixes.length > 0 && (
                            <div>
                              <div
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#8b9dc3',
                                  marginBottom: '6px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                }}
                              >
                                Suggested fixes
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {entry.suggestedFixes.map((fix, i) => (
                                  <div
                                    key={`${entry.id}-fix-${i}`}
                                    style={{
                                      display: 'flex',
                                      gap: '8px',
                                      alignItems: 'flex-start',
                                      fontSize: '12px',
                                      color: '#a0aec0',
                                      lineHeight: '1.5',
                                    }}
                                  >
                                    <span
                                      style={{ color: '#4CAF50', flexShrink: 0, marginTop: '1px' }}
                                    >
                                      ➜
                                    </span>
                                    <span>{fix}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Raw detail if present */}
                          {entry.detail && (
                            <div
                              style={{
                                marginTop: '12px',
                                fontSize: '11px',
                                color: '#6b7b9c',
                                fontFamily: 'monospace',
                                background: '#0d1117',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                wordBreak: 'break-all',
                              }}
                            >
                              {entry.detail}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={feedEndRef} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Agent Detail Modal ─── */}
      {selectedAgent &&
        (() => {
          const diag = getAgentDiagnosis(selectedAgent);
          const fixes = getAgentSuggestedFixes(selectedAgent);
          const statusColor = selectedAgent.isHealthy
            ? '#4CAF50'
            : selectedAgent.sensorLive
              ? '#FFC107'
              : '#f44336';
          const hasProblems = !diag.isOk;

          return (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                animation: 'feedExpand 0.15s ease-out',
              }}
              onClick={() => setSelectedAgent(null)}
            >
              <div
                style={{
                  background: '#0d1117',
                  border: `1px solid ${statusColor}40`,
                  borderRadius: '12px',
                  width: '560px',
                  maxHeight: '85vh',
                  overflowY: 'auto',
                  padding: '0',
                  boxShadow: `0 0 40px ${statusColor}15`,
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Modal header */}
                <div
                  style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #1f2937',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: statusColor,
                        boxShadow: `0 0 8px ${statusColor}`,
                      }}
                    />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>
                        {selectedAgent.name}
                      </h3>
                      <span style={{ fontSize: '12px', color: '#8b9dc3' }}>
                        Port {selectedAgent.port} · {selectedAgent.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAgent(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#8b9dc3',
                      fontSize: '20px',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Stats grid */}
                <div
                  style={{
                    padding: '16px 24px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    borderBottom: '1px solid #1f2937',
                  }}
                >
                  {[
                    { label: 'Uptime', value: formatUptime(selectedAgent.uptime) },
                    {
                      label: 'Memory',
                      value: selectedAgent.memory
                        ? formatBytes(selectedAgent.memory.heapUsed)
                        : 'N/A',
                    },
                    {
                      label: 'RSS',
                      value: selectedAgent.memory ? formatBytes(selectedAgent.memory.rss) : 'N/A',
                    },
                    {
                      label: 'Requests',
                      value: String(selectedAgent.diagnostics?.requestCount ?? 0),
                    },
                    {
                      label: 'Errors',
                      value: String(selectedAgent.diagnostics?.errorCount ?? 0),
                      warn: (selectedAgent.diagnostics?.errorCount ?? 0) > 0,
                    },
                    {
                      label: 'Avg Response',
                      value: `${selectedAgent.diagnostics?.avgResponseTime ?? 0}ms`,
                      warn: (selectedAgent.diagnostics?.avgResponseTime ?? 0) > 500,
                    },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      style={{ background: '#111827', borderRadius: '6px', padding: '10px 12px' }}
                    >
                      <div style={{ fontSize: '11px', color: '#8b9dc3', marginBottom: '2px' }}>
                        {stat.label}
                      </div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: stat.warn ? '#FFC107' : '#fff',
                        }}
                      >
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Capabilities */}
                {selectedAgent.capabilities?.length > 0 && (
                  <div style={{ padding: '16px 24px', borderBottom: '1px solid #1f2937' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#8b9dc3',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Capabilities
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedAgent.capabilities.map(cap => (
                        <span
                          key={cap}
                          style={{
                            fontSize: '11px',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            background: '#1a2332',
                            color: '#8b9dc3',
                            border: '1px solid #2a3a4a',
                          }}
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Diagnosis section */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #1f2937' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#8b9dc3',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {hasProblems ? 'Problems Detected' : 'Status'}
                  </div>
                  {diag.isOk ? (
                    <div style={{ fontSize: '13px', color: '#4CAF50', lineHeight: '1.6' }}>
                      Everything looks good! {selectedAgent.name} is running smoothly with no issues
                      detected.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {diag.problems.map((problem, i) => (
                        <div
                          key={`problem-${selectedAgent.name}-${i}`}
                          style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'flex-start',
                            fontSize: '13px',
                            color: '#e0a0a0',
                            lineHeight: '1.5',
                          }}
                        >
                          <span style={{ color: '#f44336', flexShrink: 0 }}>●</span>
                          <span>{problem}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Suggested fixes */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #1f2937' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#8b9dc3',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Suggested Fixes
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {fixes.map((fix, i) => (
                      <div
                        key={`fix-${selectedAgent.name}-${i}`}
                        style={{
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'flex-start',
                          fontSize: '12px',
                          color: '#a0aec0',
                          lineHeight: '1.5',
                        }}
                      >
                        <span style={{ color: '#4CAF50', flexShrink: 0, marginTop: '1px' }}>➜</span>
                        <span>{fix}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent errors */}
                {selectedAgent.diagnostics?.recentErrors?.length > 0 && (
                  <div style={{ padding: '16px 24px', borderBottom: '1px solid #1f2937' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#8b9dc3',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Recent Errors ({selectedAgent.diagnostics.recentErrors.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedAgent.diagnostics.recentErrors.map((err, i) => (
                        <div
                          key={`err-${selectedAgent.name}-${i}`}
                          style={{
                            background: '#1a1215',
                            border: '1px solid #3a1f1f',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ color: '#f44336', marginBottom: '2px' }}>{err.message}</div>
                          {err.file && (
                            <div
                              style={{
                                color: '#6b7b9c',
                                fontFamily: 'monospace',
                                fontSize: '11px',
                              }}
                            >
                              {err.file}
                              {err.line ? `:${err.line}` : ''}
                              {err.column ? `:${err.column}` : ''}
                            </div>
                          )}
                          {err.timestamp && (
                            <div style={{ color: '#444', fontSize: '10px', marginTop: '2px' }}>
                              {new Date(err.timestamp).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Fix + Open in IDE section */}
                <div style={{ padding: '20px 24px' }}>
                  {fixStatus === 'idle' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        onClick={() => attemptAiFix(selectedAgent)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '8px',
                          border: hasProblems ? '1px solid #4CAF50' : '1px solid #2a3a4a',
                          background: hasProblems
                            ? 'linear-gradient(135deg, #1a3a1a, #0d2818)'
                            : '#111827',
                          color: hasProblems ? '#4CAF50' : '#8b9dc3',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>🤖</span>
                        {hasProblems ? 'AI Fix — Diagnose & Repair' : 'AI Fix — Run Health Check'}
                      </button>
                      <button
                        onClick={() => openAgentInIDE(selectedAgent)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #00d4ff44',
                          background: 'linear-gradient(135deg, #0d1b2a, #1a2a3a)',
                          color: '#00d4ff',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>📝</span>
                        Open in IDE — Edit Source File
                      </button>
                    </div>
                  )}

                  {fixStatus !== 'idle' && (
                    <div
                      style={{
                        background: '#111827',
                        border: '1px solid #1f2937',
                        borderRadius: '8px',
                        padding: '14px 16px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '10px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color:
                            fixStatus === 'success'
                              ? '#4CAF50'
                              : fixStatus === 'failed'
                                ? '#f44336'
                                : '#FFC107',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            animation:
                              fixStatus === 'diagnosing' || fixStatus === 'fixing'
                                ? 'spin 1s linear infinite'
                                : 'none',
                          }}
                        >
                          {fixStatus === 'success' ? '✅' : fixStatus === 'failed' ? '❌' : '🔧'}
                        </span>
                        {fixStatus === 'diagnosing' && 'Diagnosing...'}
                        {fixStatus === 'fixing' && 'Applying fix...'}
                        {fixStatus === 'success' && 'Fix complete!'}
                        {fixStatus === 'failed' && 'Fix could not fully resolve the issue'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {fixLog.map((line, i) => (
                          <div
                            key={`log-${i}`}
                            style={{
                              fontSize: '12px',
                              color: '#a0aec0',
                              fontFamily: "'DM Sans', monospace",
                              lineHeight: '1.5',
                              paddingLeft: '8px',
                              borderLeft: '2px solid #1f2937',
                            }}
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                      {(fixStatus === 'success' || fixStatus === 'failed') && (
                        <button
                          onClick={() => {
                            setFixStatus('idle');
                            setFixLog([]);
                          }}
                          style={{
                            marginTop: '12px',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: '1px solid #2a3a4a',
                            background: 'transparent',
                            color: '#8b9dc3',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          {fixStatus === 'failed' ? 'Try Again' : 'Done'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

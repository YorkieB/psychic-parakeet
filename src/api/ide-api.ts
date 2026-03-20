/*
  This file provides the backend API for the built-in Jarvis IDE.

  It handles file reading, writing, directory listing, search, and terminal
  execution — all safely scoped to the project root so nothing outside can be touched.
*/

import type { Request, Response } from 'express';
import express from 'express';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PORTS } from '../config/ports';

const PROJECT_ROOT = path.resolve(process.cwd());

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  '.venv',
  '__pycache__',
  '.vs',
  '.cache',
  'coverage',
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  '.DS_Store',
  'Thumbs.db',
]);

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.ico',
  '.webp',
  '.mp3',
  '.mp4',
  '.wav',
  '.ogg',
  '.webm',
  '.zip',
  '.tar',
  '.gz',
  '.7z',
  '.rar',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.pdf',
  '.doc',
  '.docx',
]);

// Build a lightweight project structure for AI context
function getProjectContext(): string {
  const maxDepth = 3;
  const maxEntries = 150;
  let count = 0;
  const lines: string[] = [];

  function walk(dir: string, depth: number, prefix: string) {
    if (depth > maxDepth || count >= maxEntries) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    // Sort: directories first, then files
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });
    for (const entry of entries) {
      if (count >= maxEntries) break;
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        lines.push(`${prefix}${entry.name}/`);
        count++;
        walk(path.join(dir, entry.name), depth + 1, prefix + '  ');
      } else if (!IGNORED_FILES.has(entry.name)) {
        lines.push(`${prefix}${entry.name}`);
        count++;
      }
    }
  }

  walk(PROJECT_ROOT, 0, '');
  return lines.join('\n');
}

let cachedProjectContext = '';
let contextCacheTime = 0;
const CONTEXT_CACHE_TTL = 60000; // refresh every 60s

function getCachedProjectContext(): string {
  const now = Date.now();
  if (!cachedProjectContext || now - contextCacheTime > CONTEXT_CACHE_TTL) {
    cachedProjectContext = getProjectContext();
    contextCacheTime = now;
  }
  return cachedProjectContext;
}

function safePath(requestedPath: string): string | null {
  const resolved = path.resolve(PROJECT_ROOT, requestedPath);
  if (!resolved.startsWith(PROJECT_ROOT)) {
    return null;
  }
  return resolved;
}

function getLanguageFromExt(ext: string): string {
  const map: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.json': 'json',
    '.jsonc': 'json',
    '.css': 'css',
    '.scss': 'scss',
    '.less': 'less',
    '.html': 'html',
    '.htm': 'html',
    '.md': 'markdown',
    '.mdx': 'markdown',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.xml': 'xml',
    '.svg': 'xml',
    '.py': 'python',
    '.sql': 'sql',
    '.sh': 'shell',
    '.bash': 'shell',
    '.ps1': 'powershell',
    '.bat': 'bat',
    '.cmd': 'bat',
    '.toml': 'toml',
    '.ini': 'ini',
    '.env': 'plaintext',
    '.gitignore': 'plaintext',
    '.txt': 'plaintext',
    '.log': 'plaintext',
  };
  return map[ext.toLowerCase()] || 'plaintext';
}

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  size?: number;
  language?: string;
}

function buildTree(
  dirPath: string,
  relativeTo: string,
  depth: number = 0,
  maxDepth: number = 6
): FileTreeNode[] {
  if (depth > maxDepth) return [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const nodes: FileTreeNode[] = [];

    const sorted = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of sorted) {
      if (entry.name.startsWith('.') && entry.name !== '.env' && entry.name !== '.env.example') {
        if (IGNORED_DIRS.has(entry.name)) continue;
        if (entry.isDirectory()) continue;
      }
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (IGNORED_FILES.has(entry.name)) continue;

      const fullPath = path.join(dirPath, entry.name);
      const relPath = path.relative(relativeTo, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        const children = buildTree(fullPath, relativeTo, depth + 1, maxDepth);
        nodes.push({ name: entry.name, path: relPath, type: 'directory', children });
      } else {
        const ext = path.extname(entry.name);
        try {
          const stat = fs.statSync(fullPath);
          nodes.push({
            name: entry.name,
            path: relPath,
            type: 'file',
            size: stat.size,
            language: getLanguageFromExt(ext),
          });
        } catch {
          nodes.push({
            name: entry.name,
            path: relPath,
            type: 'file',
            language: getLanguageFromExt(ext),
          });
        }
      }
    }

    return nodes;
  } catch {
    return [];
  }
}

export function createIDERouter() {
  const router = (express as any).Router();

  // List directory tree
  router.get('/files', (req: Request, res: Response) => {
    const dir = (req.query.dir as string) || '.';
    const depth = parseInt((req.query.depth as string) || '4', 10);
    const resolved = safePath(dir);
    if (!resolved) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    const tree = buildTree(resolved, PROJECT_ROOT, 0, Math.min(depth, 8));
    return res.json({ success: true, root: dir, tree });
  });

  // Read file
  router.get('/file', (req: Request, res: Response) => {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' });
    }
    const resolved = safePath(filePath);
    if (!resolved) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return res.status(400).json({ error: 'Path is a directory' });
    }
    if (stat.size > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large (max 5MB)' });
    }
    const ext = path.extname(filePath);
    if (BINARY_EXTENSIONS.has(ext.toLowerCase())) {
      return res.status(400).json({ error: 'Binary files cannot be opened in the editor' });
    }
    try {
      const content = fs.readFileSync(resolved, 'utf-8');
      const language = getLanguageFromExt(ext);
      return res.json({ success: true, content, language, path: filePath, size: stat.size });
    } catch (err) {
      return res.status(500).json({
        error: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  // Save file
  router.post('/file', (req: Request, res: Response) => {
    const { path: filePath, content } = req.body;
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'Path and content are required' });
    }
    const resolved = safePath(filePath);
    if (!resolved) {
      return res.status(403).json({ error: 'Access denied' });
    }
    try {
      const dir = path.dirname(resolved);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(resolved, content, 'utf-8');
      return res.json({ success: true, path: filePath, size: Buffer.byteLength(content, 'utf-8') });
    } catch (err) {
      return res
        .status(500)
        .json({ error: `Failed to save: ${err instanceof Error ? err.message : String(err)}` });
    }
  });

  // Search across files
  router.post('/search', (req: Request, res: Response) => {
    const { query, dir = '.', includes = '', caseSensitive = false, maxResults = 100 } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    const resolved = safePath(dir);
    if (!resolved) {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const flags = caseSensitive ? '' : '-i';
      const includeFlag = includes
        ? `--include="${includes}"`
        : '--include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --include="*.css" --include="*.html" --include="*.md" --include="*.py" --include="*.yaml" --include="*.yml" --include="*.sql" --include="*.sh" --include="*.ps1" --include="*.env"';
      const escapedQuery = query.replace(/"/g, '\\"');

      let cmd: string;
      if (process.platform === 'win32') {
        cmd = `findstr /s /n ${caseSensitive ? '' : '/i'} /c:"${escapedQuery}" ${includes || '*.ts *.tsx *.js *.jsx *.json *.css *.html *.md *.py'}`;
      } else {
        cmd = `grep -rn ${flags} ${includeFlag} --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=.venv "${escapedQuery}" .`;
      }

      const output = execSync(cmd, {
        cwd: resolved,
        timeout: 10000,
        maxBuffer: 1024 * 1024,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const results: Array<{ file: string; line: number; content: string }> = [];
      const lines = output.split('\n').filter(Boolean);

      for (const line of lines) {
        if (results.length >= maxResults) break;
        // Format: file:line:content (unix) or file:line:content (windows)
        const match = line.match(/^(.+?):(\d+):(.*)$/);
        if (match) {
          results.push({
            file: match[1].replace(/\\/g, '/'),
            line: parseInt(match[2], 10),
            content: match[3].trim().substring(0, 200),
          });
        }
      }

      return res.json({ success: true, results, total: results.length, query });
    } catch (err: any) {
      if (err.status === 1 || err.code === 1) {
        return res.json({ success: true, results: [], total: 0, query });
      }
      return res.json({
        success: true,
        results: [],
        total: 0,
        query,
        note: 'Search completed with no matches',
      });
    }
  });

  // Execute terminal command
  router.post('/terminal', (req: Request, res: Response) => {
    const { command, cwd = '.' } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    // Security: block dangerous commands
    const blocked = [
      'rm -rf /',
      'format c:',
      'del /s /q c:',
      'mkfs',
      ': () {',
      'shutdown',
      'reboot',
    ];
    const lowerCmd = command.toLowerCase().trim();
    for (const b of blocked) {
      if (lowerCmd.includes(b)) {
        return res.status(403).json({ error: 'Command blocked for safety' });
      }
    }

    const resolvedCwd = safePath(cwd);
    if (!resolvedCwd) {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const output = execSync(command, {
        cwd: resolvedCwd,
        timeout: 30000,
        maxBuffer: 2 * 1024 * 1024,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/sh',
      });

      return res.json({ success: true, output: output.substring(0, 50000), exitCode: 0 });
    } catch (err: any) {
      return res.json({
        success: true,
        output: (err.stdout || '') + '\n' + (err.stderr || ''),
        exitCode: err.status || 1,
      });
    }
  });

  // AI chat endpoint (main chat interface)
  router.post('/chat', async (req: Request, res: Response) => {
    const { message, context, filePath: ctxFile, model } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    try {
      const projectTree = getCachedProjectContext();
      const systemPrompt = [
        'You are Jarvis, the AI coding assistant built into the Jarvis IDE.',
        `You are working inside the project: "${path.basename(PROJECT_ROOT)}"`,
        `Project root: ${PROJECT_ROOT}`,
        '',
        'Project structure:',
        projectTree,
        '',
        context ? `The user currently has this file open: ${ctxFile || 'unknown'}` : '',
        context
          ? `\nFile content (first 4000 chars):\n\`\`\`\n${context.substring(0, 4000)}\n\`\`\``
          : '',
        '',
        'You know every file and folder in this project. When the user asks about files, folders, APIs, or code — answer based on the actual project structure above.',
        'Be concise, helpful, and reference specific file paths when relevant.',
      ]
        .filter(Boolean)
        .join('\n');

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ];

      // Determine which agent to use based on model selection
      let agentPort: number = PORTS.LLM; // Default to external LLM
      if (model === 'local-llm') {
        agentPort = 3029; // PORTS.LocalLLM
      } else if (model === 'ollama-llm') {
        agentPort = 3030; // PORTS.OllamaLLM
      }

      const resp = await fetch(`http://localhost:${agentPort}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `ide-chat-${Date.now()}`,
          action: 'chat',
          inputs: { messages, maxTokens: 2000 },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!resp.ok) throw new Error(`LLM agent returned ${resp.status}`);

      const data = (await resp.json()) as {
        success: boolean;
        data?: { response?: { role: string; content: string }; completion?: string; text?: string };
      };
      const reply =
        data?.data?.response?.content ||
        data?.data?.completion ||
        data?.data?.text ||
        'No response from AI.';
      return res.json({ success: true, reply });
    } catch (err) {
      return res.json({
        success: true,
        reply: `AI assistant is not available right now. Error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  // AI code assistance (routes to LLM agent)
  router.post('/ai-chat', async (req: Request, res: Response) => {
    const { message, context, filePath: ctxFile, model, provider, apiKey } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    try {
      const projectTree = getCachedProjectContext();
      const systemPrompt = [
        'You are Jarvis, the AI coding assistant built into the Jarvis IDE.',
        `You are working inside the project: "${path.basename(PROJECT_ROOT)}"`,
        `Project root: ${PROJECT_ROOT}`,
        '',
        'Project structure:',
        projectTree,
        '',
        context ? `The user currently has this file open: ${ctxFile || 'unknown'}` : '',
        context
          ? `\nFile content (first 4000 chars):\n\`\`\`\n${context.substring(0, 4000)}\n\`\`\``
          : '',
        '',
        'You know every file and folder in this project. When the user asks about files, folders, APIs, or code — answer based on the actual project structure above.',
        'Be concise, helpful, and reference specific file paths when relevant.',
      ]
        .filter(Boolean)
        .join('\n');

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ];

      let resp: Awaited<ReturnType<typeof fetch>>;

      // Handle local agents
      if (model === 'local-llm') {
        resp = await fetch(`http://localhost:3029/api`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `ide-chat-${Date.now()}`,
            action: 'chat',
            inputs: { messages, maxTokens: 2000 },
          }),
          signal: AbortSignal.timeout(30000),
        });
      } else if (model === 'ollama-llm') {
        resp = await fetch(`http://localhost:3030/api`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `ide-chat-${Date.now()}`,
            action: 'chat',
            inputs: { messages, maxTokens: 2000 },
          }),
          signal: AbortSignal.timeout(30000),
        });
      } else {
        // Handle external providers (HuggingFace, Anthropic, etc.)
        resp = await fetch(`http://localhost:${PORTS.LLM}/api`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `ide-chat-${Date.now()}`,
            action: 'chat',
            inputs: {
              messages,
              maxTokens: 2000,
              model,
              provider,
              apiKey,
            },
          }),
          signal: AbortSignal.timeout(30000),
        });
      }

      if (!resp.ok) throw new Error(`LLM agent returned ${resp.status}`);

      const data = (await resp.json()) as {
        success: boolean;
        data?: { response?: { role: string; content: string }; completion?: string; text?: string };
      };
      const reply =
        data?.data?.response?.content ||
        data?.data?.completion ||
        data?.data?.text ||
        'No response from AI.';
      return res.json({ success: true, reply });
    } catch (err) {
      return res.json({
        success: true,
        reply: `AI assistant is not available right now. Error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  // AI Plan generation (creates structured implementation plans)
  router.post('/ai-plan', async (req: Request, res: Response) => {
    const { message, context, filePath: ctxFile, model } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    try {
      const projectTree = getCachedProjectContext();
      const systemPrompt = [
        'You are Jarvis, a senior software architect built into the Jarvis IDE.',
        `You are working inside the project: "${path.basename(PROJECT_ROOT)}"`,
        `Project root: ${PROJECT_ROOT}`,
        '',
        'Project structure:',
        projectTree,
        '',
        context ? `The user currently has this file open: ${ctxFile || 'unknown'}` : '',
        context
          ? `\nFile content (first 4000 chars):\n\`\`\`\n${context.substring(0, 4000)}\n\`\`\``
          : '',
        '',
        'Your job is to create a DETAILED IMPLEMENTATION PLAN. You must:',
        '1. Analyze the request and the full project structure',
        '2. Identify ALL files that need to be created or modified',
        '3. Break the work into numbered steps',
        '4. For each step, specify: what file, what changes, and why',
        '5. Include dependencies that need to be installed',
        '6. Include any configuration changes needed',
        '7. Estimate complexity (simple/moderate/complex) for each step',
        '',
        'Format the plan as a clear, readable markdown document with:',
        '## Goal',
        '## Files Affected',
        '## Steps (numbered, detailed)',
        '## Dependencies',
        '## Notes & Risks',
        '',
        'Be specific — reference actual file paths from the project structure.',
        'Do NOT write code in the plan. Just describe what needs to happen.',
      ]
        .filter(Boolean)
        .join('\n');

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ];

      // Determine which agent to use based on model selection
      let agentPort: number = PORTS.LLM; // Default to external LLM
      if (model === 'local-llm') {
        agentPort = 3029; // PORTS.LocalLLM
      } else if (model === 'ollama-llm') {
        agentPort = 3030; // PORTS.OllamaLLM
      }

      const resp = await fetch(`http://localhost:${agentPort}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `ide-plan-${Date.now()}`,
          action: 'chat',
          inputs: { messages, maxTokens: 4000 },
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!resp.ok) throw new Error(`LLM agent returned ${resp.status}`);

      const data = (await resp.json()) as {
        success: boolean;
        data?: { response?: { role: string; content: string }; completion?: string; text?: string };
      };
      const plan =
        data?.data?.response?.content ||
        data?.data?.completion ||
        data?.data?.text ||
        'Failed to generate plan.';
      return res.json({ success: true, plan });
    } catch (err) {
      return res.json({
        success: true,
        plan: `Failed to generate plan. Error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  // Git status
  router.get('/git/status', (_req: Request, res: Response) => {
    try {
      const output = execSync('git status --porcelain', {
        cwd: PROJECT_ROOT,
        timeout: 5000,
        encoding: 'utf-8',
      });

      const files = output
        .split('\n')
        .filter(Boolean)
        .map(line => {
          const status = line.substring(0, 2).trim();
          const file = line.substring(3).trim();
          return { status, file };
        });

      const branch = execSync('git branch --show-current', {
        cwd: PROJECT_ROOT,
        timeout: 5000,
        encoding: 'utf-8',
      }).trim();

      return res.json({ success: true, branch, files, clean: files.length === 0 });
    } catch {
      return res.json({ success: true, branch: 'unknown', files: [], clean: true });
    }
  });

  // Browse / Web Proxy — fetches external URLs and pipes the response back
  router.get('/browse', async (req: Request, res: Response) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send('<html><body><h2>No URL provided</h2></body></html>');
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res
          .status(400)
          .send('<html><body><h2>Only http/https URLs are supported</h2></body></html>');
      }
    } catch {
      return res.status(400).send(`<html><body><h2>Invalid URL: ${targetUrl}</h2></body></html>`);
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });

      const contentType = response.headers.get('content-type') || 'text/html';

      // For non-HTML content (images, CSS, JS, etc.), pipe directly
      if (!contentType.includes('text/html')) {
        res.setHeader('Content-Type', contentType);
        const buffer = Buffer.from(await response.arrayBuffer());
        return res.send(buffer);
      }

      let html = await response.text();

      // Inject a <base> tag so relative URLs resolve against the original domain
      const baseTag = `<base href="${parsedUrl.origin}/" />`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}`);
      } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', `<HEAD>${baseTag}`);
      } else {
        html = baseTag + html;
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return res.send(`
        <html>
          <head><style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1e1e2e; color: #cdd6f4; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .card { background: #313244; padding: 32px; border-radius: 12px; max-width: 500px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
            h2 { color: #f38ba8; margin-bottom: 8px; }
            p { color: #a6adc8; font-size: 14px; }
            code { background: #45475a; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
            a { color: #89b4fa; }
          </style></head>
          <body>
            <div class="card">
              <h2>Failed to load page</h2>
              <p>Could not fetch <code>${targetUrl}</code></p>
              <p style="font-size:12px; margin-top:12px;">${errorMsg}</p>
            </div>
          </body>
        </html>
      `);
    }
  });

  return router;
}

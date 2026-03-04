/*
  This file is a small standalone server that powers the IDE's backend features.

  It handles file reading/writing, directory listing, search, terminal commands,
  and git status — all safely scoped to the project root folder.
*/

import 'dotenv/config';
import express from 'express';
import pty from 'node-pty';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { WebSocketServer } from 'ws';

const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || 'YOUR_HF_TOKEN_HERE';
const HF_MODEL = 'Qwen/Qwen2.5-Coder-32B-Instruct';
const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';

async function callHFChat(messages, maxTokens = 512) {
  const resp = await fetch(HF_ROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${HF_TOKEN}`,
    },
    body: JSON.stringify({ model: HF_MODEL, messages, max_tokens: maxTokens }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`HF API ${resp.status}: ${errText.substring(0, 200)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const PORT = 3100;

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
  '.venv',
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

function safePath(requestedPath) {
  const resolved = path.resolve(PROJECT_ROOT, requestedPath);
  if (!resolved.startsWith(PROJECT_ROOT)) return null;
  return resolved;
}

function getLanguage(ext) {
  const map = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.json': 'json',
    '.css': 'css',
    '.scss': 'scss',
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

function buildTree(dirPath, relativeTo, depth = 0, maxDepth = 6) {
  if (depth > maxDepth) return [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const nodes = [];
    const sorted = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });
    for (const entry of sorted) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (IGNORED_FILES.has(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.env' && entry.name !== '.env.example') {
        if (entry.isDirectory()) continue;
      }
      const fullPath = path.join(dirPath, entry.name);
      const relPath = path.relative(relativeTo, fullPath).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        nodes.push({
          name: entry.name,
          path: relPath,
          type: 'directory',
          children: buildTree(fullPath, relativeTo, depth + 1, maxDepth),
        });
      } else {
        const ext = path.extname(entry.name);
        try {
          const stat = fs.statSync(fullPath);
          nodes.push({
            name: entry.name,
            path: relPath,
            type: 'file',
            size: stat.size,
            language: getLanguage(ext),
          });
        } catch {
          nodes.push({ name: entry.name, path: relPath, type: 'file', language: getLanguage(ext) });
        }
      }
    }
    return nodes;
  } catch {
    return [];
  }
}

const app = express();
app.use(express.json({ limit: '10mb' }));

// CORS for dev
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// List directory tree
app.get('/files', (req, res) => {
  const dir = req.query.dir || '.';
  const depth = parseInt(req.query.depth || '4', 10);
  const resolved = safePath(dir);
  if (!resolved) return res.status(403).json({ error: 'Access denied' });
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return res.status(404).json({ error: 'Directory not found' });
  }
  const tree = buildTree(resolved, PROJECT_ROOT, 0, Math.min(depth, 8));
  return res.json({ success: true, root: dir, tree });
});

// Read file
app.get('/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'Path is required' });
  const resolved = safePath(filePath);
  if (!resolved) return res.status(403).json({ error: 'Access denied' });
  if (!fs.existsSync(resolved)) return res.status(404).json({ error: 'File not found' });
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) return res.status(400).json({ error: 'Path is a directory' });
  if (stat.size > 5 * 1024 * 1024)
    return res.status(413).json({ error: 'File too large (max 5MB)' });
  const ext = path.extname(filePath);
  if (BINARY_EXTENSIONS.has(ext.toLowerCase()))
    return res.status(400).json({ error: 'Binary files cannot be opened' });
  try {
    const content = fs.readFileSync(resolved, 'utf-8');
    return res.json({
      success: true,
      content,
      language: getLanguage(ext),
      path: filePath,
      size: stat.size,
    });
  } catch (err) {
    return res.status(500).json({ error: `Failed to read: ${err.message}` });
  }
});

// Save file
app.post('/file', (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath || content === undefined)
    return res.status(400).json({ error: 'Path and content required' });
  const resolved = safePath(filePath);
  if (!resolved) return res.status(403).json({ error: 'Access denied' });
  try {
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(resolved, content, 'utf-8');
    return res.json({ success: true, path: filePath, size: Buffer.byteLength(content, 'utf-8') });
  } catch (err) {
    return res.status(500).json({ error: `Failed to save: ${err.message}` });
  }
});

// Search
app.post('/search', (req, res) => {
  const { query, dir = '.', caseSensitive = false, maxResults = 100 } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });
  const resolved = safePath(dir);
  if (!resolved) return res.status(403).json({ error: 'Access denied' });
  try {
    const escapedQuery = query.replace(/"/g, '\\"');
    const cmd = `findstr /s /n ${caseSensitive ? '' : '/i'} /c:"${escapedQuery}" *.ts *.tsx *.js *.jsx *.json *.css *.html *.md *.py *.yaml *.yml *.sql *.sh *.ps1`;
    const output = execSync(cmd, {
      cwd: resolved,
      timeout: 10000,
      maxBuffer: 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const results = [];
    for (const line of output.split('\n').filter(Boolean)) {
      if (results.length >= maxResults) break;
      const match = line.match(/^(.+?):(\d+):(.*)$/);
      if (match)
        results.push({
          file: match[1].replace(/\\/g, '/'),
          line: parseInt(match[2], 10),
          content: match[3].trim().substring(0, 200),
        });
    }
    return res.json({ success: true, results, total: results.length, query });
  } catch {
    return res.json({ success: true, results: [], total: 0, query });
  }
});

// Terminal
app.post('/terminal', (req, res) => {
  const { command, cwd = '.' } = req.body;
  if (!command) return res.status(400).json({ error: 'Command is required' });
  const blocked = ['rm -rf /', 'format c:', 'del /s /q c:', 'mkfs', 'shutdown', 'reboot'];
  const lowerCmd = command.toLowerCase().trim();
  for (const b of blocked) {
    if (lowerCmd.includes(b)) return res.status(403).json({ error: 'Command blocked' });
  }
  const resolvedCwd = safePath(cwd);
  if (!resolvedCwd) return res.status(403).json({ error: 'Access denied' });
  try {
    const output = execSync(command, {
      cwd: resolvedCwd,
      timeout: 30000,
      maxBuffer: 2 * 1024 * 1024,
      encoding: 'utf-8',
      shell: 'powershell.exe',
    });
    return res.json({ success: true, output: output.substring(0, 50000), exitCode: 0 });
  } catch (err) {
    return res.json({
      success: true,
      output: (err.stdout || '') + '\n' + (err.stderr || ''),
      exitCode: err.status || 1,
    });
  }
});

// AI Chat — calls Qwen2.5-Coder-32B via HuggingFace Router API
app.post('/ai-chat', async (req, res) => {
  const { message, context, filePath } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  try {
    const messages = [];
    if (context) {
      messages.push({
        role: 'system',
        content: `You are a helpful coding assistant. The developer is working on file: ${filePath || 'unknown'}`,
      });
      messages.push({
        role: 'user',
        content: `Here is the code context:\n\`\`\`\n${context.substring(0, 4000)}\n\`\`\`\n\n${message}`,
      });
    } else {
      messages.push({ role: 'system', content: 'You are a helpful coding assistant.' });
      messages.push({ role: 'user', content: message });
    }

    console.log('Calling HF Router API (Qwen2.5-Coder) for chat...');
    const reply = await callHFChat(messages, 1024);

    if (!reply) {
      return res.json({
        success: true,
        reply: "I received your message but couldn't generate a response.",
      });
    }

    return res.json({ success: true, reply: reply.trim() });
  } catch (err) {
    console.error('HF Router API chat error:', err.message);
    return res.json({
      success: true,
      reply: `AI unavailable: ${err.message}`,
    });
  }
});

// AI Explain Error — explains an error in plain beginner-friendly language
app.post('/ai-explain', async (req, res) => {
  const { error, code, filePath, line } = req.body;
  if (!error) return res.status(400).json({ error: 'Error message required' });
  try {
    const messages = [
      {
        role: 'system',
        content:
          'You are a friendly coding teacher. Explain errors in very simple, plain English like you are talking to a complete beginner. Use analogies and everyday language. Keep it short (3-5 sentences max). Do NOT use jargon without explaining it first.',
      },
      {
        role: 'user',
        content: `I got this error in my code and I don't understand it:\n\nError: ${error}\nFile: ${filePath || 'unknown'}\nLine: ${line || '?'}\n${code ? `\nCode around the error:\n\`\`\`\n${code.substring(0, 2000)}\n\`\`\`` : ''}\n\nPlease explain what this means in simple terms and what I should do to fix it.`,
      },
    ];
    const reply = await callHFChat(messages, 512);
    return res.json({
      success: true,
      explanation: (reply || 'Could not generate explanation.').trim(),
    });
  } catch (err) {
    return res.json({ success: true, explanation: `Could not explain: ${err.message}` });
  }
});

// AI Fix Code — auto-fixes code with an error
app.post('/ai-fix', async (req, res) => {
  const { error, code, filePath, line, language } = req.body;
  if (!error || !code) return res.status(400).json({ error: 'Error and code required' });
  try {
    const messages = [
      {
        role: 'system',
        content:
          'You are an expert code fixer. Given an error and the code, output ONLY the corrected code. No explanation, no markdown fences, just the fixed code. Preserve the original formatting and style. Only change what is necessary to fix the error.',
      },
      {
        role: 'user',
        content: `Fix this ${language || ''} code error:\n\nError: ${error}\nFile: ${filePath || 'unknown'}\nLine: ${line || '?'}\n\nFull code:\n${code.substring(0, 6000)}`,
      },
    ];
    const reply = await callHFChat(messages, 2048);
    let fixedCode = reply || '';
    const codeMatch = fixedCode.match(/```[\w]*\n([\s\S]*?)```/);
    if (codeMatch) fixedCode = codeMatch[1];
    return res.json({ success: true, fixedCode: fixedCode.trim() });
  } catch (err) {
    return res.json({ success: true, fixedCode: '', error: err.message });
  }
});

// AI inline completion — calls Qwen2.5-Coder for code suggestions
app.post('/ai-complete', async (req, res) => {
  const { prefix, suffix, language } = req.body;
  if (!prefix && !suffix) return res.status(400).json({ error: 'Code context required' });
  try {
    const messages = [
      {
        role: 'system',
        content:
          'You are a code completion engine. Output ONLY the code that should be inserted at the cursor. No explanation, no markdown fences, just raw code. 1-3 lines max.',
      },
      {
        role: 'user',
        content: `Language: ${language || 'unknown'}\nBefore cursor:\n${(prefix || '').slice(-1500)}\n\nAfter cursor:\n${(suffix || '').slice(0, 500)}`,
      },
    ];

    console.log('Calling HF Router API (Qwen2.5-Coder) for completion...');
    const reply = await callHFChat(messages, 100);

    let completion = '';
    if (reply) {
      const codeMatch = reply.match(/```[\w]*\n([\s\S]*?)```/);
      completion = codeMatch ? codeMatch[1].trim() : reply.trim();
    }

    return res.json({ success: true, completion });
  } catch (err) {
    console.error('HF Router API completion error:', err.message);
    return res.json({ success: true, completion: '' });
  }
});

// Web proxy — fetches external pages, strips frame-blocking headers
app.get('/browse', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'url query param required' });
  try {
    const parsed = new URL(targetUrl);
    const resp = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    const contentType = resp.headers.get('content-type') || '';

    // For non-HTML (images, CSS, JS, etc.) just pipe through
    if (!contentType.includes('text/html')) {
      const buffer = Buffer.from(await resp.arrayBuffer());
      res.set('Content-Type', contentType);
      res.set('Access-Control-Allow-Origin', '*');
      return res.send(buffer);
    }

    let html = await resp.text();
    const baseOrigin = parsed.origin;
    const basePath = parsed.pathname.replace(/\/[^/]*$/, '/');
    const proxyBase = '/api/ide/browse?url=';

    // Inject <base> tag so relative URLs resolve correctly
    const baseTag = `<base href="${baseOrigin}${basePath}">`;
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${baseTag}`);
    } else if (html.includes('<HEAD>')) {
      html = html.replace('<HEAD>', `<HEAD>${baseTag}`);
    } else {
      html = baseTag + html;
    }

    // Inject a script that intercepts link clicks and form submissions
    // to route them through our proxy
    const injectedScript = `
    <script>
    (function() {
      function proxyUrl(url) {
        try {
          const abs = new URL(url, document.baseURI).href;
          if (abs.startsWith('http://') || abs.startsWith('https://')) {
            return '${proxyBase}' + encodeURIComponent(abs);
          }
        } catch(e) {}
        return url;
      }
      // Intercept clicks on links
      document.addEventListener('click', function(e) {
        const a = e.target.closest('a[href]');
        if (a && a.href) {
          const href = a.getAttribute('href');
          if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
            e.preventDefault();
            const abs = new URL(href, document.baseURI).href;
            // Notify parent of navigation
            window.parent.postMessage({ type: 'jarvis-browser-navigate', url: abs }, '*');
            window.location.href = proxyUrl(href);
          }
        }
      }, true);
      // Intercept form submissions
      document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form.tagName === 'FORM' && form.action) {
          e.preventDefault();
          const formData = new FormData(form);
          const params = new URLSearchParams(formData).toString();
          const action = form.getAttribute('action') || window.location.href;
          const abs = new URL(action, document.baseURI).href;
          const sep = abs.includes('?') ? '&' : '?';
          const fullUrl = form.method?.toUpperCase() === 'POST' ? abs : abs + sep + params;
          window.parent.postMessage({ type: 'jarvis-browser-navigate', url: fullUrl }, '*');
          window.location.href = proxyUrl(form.method?.toUpperCase() === 'POST' ? abs : action) + (form.method?.toUpperCase() === 'POST' ? '' : sep + params);
        }
      }, true);
    })();
    </script>`;

    if (html.includes('</body>')) {
      html = html.replace('</body>', injectedScript + '</body>');
    } else {
      html += injectedScript;
    }

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Access-Control-Allow-Origin', '*');
    // Explicitly remove frame-blocking headers
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    return res.send(html);
  } catch (err) {
    return res.status(502).send(`
      <html><body style="background:#1e1e2e;color:#cdd6f4;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px;">
        <div style="font-size:48px;">⚠️</div>
        <div style="font-size:18px;font-weight:600;">Failed to load page</div>
        <div style="font-size:14px;color:#a6adc8;">${err.message}</div>
        <div style="font-size:12px;color:#585b70;margin-top:8px;">${targetUrl}</div>
      </body></html>
    `);
  }
});

// AI Inline Edit — edit selected code with an instruction
app.post('/ai-inline-edit', async (req, res) => {
  const { instruction, selectedCode, fullCode, filePath, language } = req.body;
  if (!instruction || !selectedCode)
    return res.status(400).json({ error: 'Instruction and selected code required' });
  try {
    const messages = [
      {
        role: 'system',
        content:
          'You are an expert code editor. Given selected code and an instruction, output ONLY the replacement code. No explanation, no markdown fences, just the edited code. Preserve style and indentation.',
      },
      {
        role: 'user',
        content: `Language: ${language || 'unknown'}\nFile: ${filePath || 'unknown'}\n\nInstruction: ${instruction}\n\nSelected code to edit:\n${selectedCode.substring(0, 3000)}${fullCode ? `\n\nFull file context:\n${fullCode.substring(0, 4000)}` : ''}`,
      },
    ];
    const reply = await callHFChat(messages, 1024);
    let edited = reply || '';
    const m = edited.match(/```[\w]*\n([\s\S]*?)```/);
    if (m) edited = m[1];
    return res.json({ success: true, editedCode: edited.trim() });
  } catch (err) {
    return res.json({ success: true, editedCode: '', error: err.message });
  }
});

// AI Bug Scan — scan code for potential bugs
app.post('/ai-bug-scan', async (req, res) => {
  const { code, filePath, language } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });
  try {
    const messages = [
      {
        role: 'system',
        content:
          'You are a senior code reviewer. Scan the code for bugs, potential issues, and improvements. Return a JSON array of objects with: line (number), severity ("error"|"warning"|"info"), message (string), fix (string suggestion). Only real issues, no style nits. Return ONLY valid JSON array, no markdown.',
      },
      {
        role: 'user',
        content: `Scan this ${language || ''} file for bugs:\nFile: ${filePath || 'unknown'}\n\n${code.substring(0, 6000)}`,
      },
    ];
    const reply = await callHFChat(messages, 1024);
    let bugs = [];
    try {
      const jsonMatch = reply.match(/\[[\s\S]*\]/);
      if (jsonMatch) bugs = JSON.parse(jsonMatch[0]);
    } catch {
      bugs = [{ line: 1, severity: 'info', message: reply.substring(0, 200), fix: '' }];
    }
    return res.json({ success: true, bugs });
  } catch (err) {
    return res.json({ success: true, bugs: [], error: err.message });
  }
});

// AI Terminal — suggest shell commands
app.post('/ai-terminal', async (req, res) => {
  const { description, cwd, recentCommands } = req.body;
  if (!description) return res.status(400).json({ error: 'Description required' });
  try {
    const messages = [
      {
        role: 'system',
        content:
          'You are a shell command expert for Windows PowerShell. Given a description, suggest the exact command to run. Output ONLY the command, nothing else. No explanation.',
      },
      {
        role: 'user',
        content: `Task: ${description}\nCurrent directory: ${cwd || '.'}\n${recentCommands ? `Recent commands:\n${recentCommands.join('\n')}` : ''}`,
      },
    ];
    const reply = await callHFChat(messages, 128);
    let cmd = (reply || '').trim();
    const m2 = cmd.match(/```[\w]*\n([\s\S]*?)```/);
    if (m2) cmd = m2[1].trim();
    return res.json({ success: true, command: cmd });
  } catch (err) {
    return res.json({ success: true, command: '', error: err.message });
  }
});

// Git blame
app.get('/git/blame', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'Path required' });
  const resolved = safePath(filePath);
  if (!resolved) return res.status(403).json({ error: 'Access denied' });
  try {
    const output = execSync(`git blame --line-porcelain "${resolved}"`, {
      cwd: PROJECT_ROOT,
      timeout: 10000,
      encoding: 'utf-8',
      maxBuffer: 2 * 1024 * 1024,
    });
    const lines = [];
    let current = {};
    for (const line of output.split('\n')) {
      if (line.match(/^[0-9a-f]{40}/)) {
        if (current.hash) lines.push(current);
        const parts = line.split(' ');
        current = { hash: parts[0].substring(0, 8), line: parseInt(parts[2], 10) };
      } else if (line.startsWith('author ')) {
        current.author = line.substring(7);
      } else if (line.startsWith('author-time ')) {
        current.date = new Date(parseInt(line.substring(12), 10) * 1000)
          .toISOString()
          .split('T')[0];
      } else if (line.startsWith('summary ')) {
        current.summary = line.substring(8);
      }
    }
    if (current.hash) lines.push(current);
    return res.json({ success: true, blame: lines });
  } catch {
    return res.json({ success: true, blame: [] });
  }
});

// Git diff for a file
app.get('/git/diff', (req, res) => {
  const filePath = req.query.path;
  try {
    const cmd = filePath ? `git diff -- "${filePath}"` : 'git diff';
    const output = execSync(cmd, {
      cwd: PROJECT_ROOT,
      timeout: 10000,
      encoding: 'utf-8',
      maxBuffer: 2 * 1024 * 1024,
    });
    const changes = [];
    let currentFile = '';
    for (const line of output.split('\n')) {
      if (line.startsWith('+++ b/')) currentFile = line.substring(6);
      else if (line.startsWith('@@')) {
        const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (m)
          changes.push({
            file: currentFile,
            oldStart: parseInt(m[1], 10),
            newStart: parseInt(m[2], 10),
            hunk: line,
          });
      } else if (currentFile && line.startsWith('+') && !line.startsWith('+++')) {
        changes.push({ file: currentFile, type: 'add', content: line.substring(1) });
      } else if (currentFile && line.startsWith('-') && !line.startsWith('---')) {
        changes.push({ file: currentFile, type: 'delete', content: line.substring(1) });
      }
    }
    return res.json({ success: true, diff: output.substring(0, 50000), changes });
  } catch {
    return res.json({ success: true, diff: '', changes: [] });
  }
});

// Document symbols (regex-based outline)
app.get('/symbols', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'Path required' });
  const resolved = safePath(filePath);
  if (!resolved) return res.status(403).json({ error: 'Access denied' });
  try {
    const content = fs.readFileSync(resolved, 'utf-8');
    const lines = content.split('\n');
    const symbols = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Functions
      const fnMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
      if (fnMatch) {
        symbols.push({ name: fnMatch[1], kind: 'function', line: i + 1 });
        continue;
      }
      // Arrow functions / const
      const arrowMatch = line.match(
        /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/
      );
      if (arrowMatch) {
        symbols.push({ name: arrowMatch[1], kind: 'function', line: i + 1 });
        continue;
      }
      // Classes
      const classMatch = line.match(/(?:export\s+)?class\s+(\w+)/);
      if (classMatch) {
        symbols.push({ name: classMatch[1], kind: 'class', line: i + 1 });
        continue;
      }
      // Interfaces
      const ifaceMatch = line.match(/(?:export\s+)?interface\s+(\w+)/);
      if (ifaceMatch) {
        symbols.push({ name: ifaceMatch[1], kind: 'interface', line: i + 1 });
        continue;
      }
      // Types
      const typeMatch = line.match(/(?:export\s+)?type\s+(\w+)/);
      if (typeMatch) {
        symbols.push({ name: typeMatch[1], kind: 'type', line: i + 1 });
        continue;
      }
      // React components (const X = () => or function X)
      const compMatch = line.match(/(?:export\s+)?(?:const|function)\s+([A-Z]\w+)\s*[=(]/);
      if (compMatch && !symbols.find(s => s.name === compMatch[1])) {
        symbols.push({ name: compMatch[1], kind: 'component', line: i + 1 });
      }
    }
    return res.json({ success: true, symbols });
  } catch {
    return res.json({ success: true, symbols: [] });
  }
});

// Git status
app.get('/git/status', (_req, res) => {
  try {
    const output = execSync('git status --porcelain', {
      cwd: PROJECT_ROOT,
      timeout: 5000,
      encoding: 'utf-8',
    });
    const files = output
      .split('\n')
      .filter(Boolean)
      .map(l => ({ status: l.substring(0, 2).trim(), file: l.substring(3).trim() }));
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

// ── WebSocket Terminal (real PTY via node-pty) ──────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/terminal' });

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
const terminals = new Map(); // ws → ptyProcess

wss.on('connection', ws => {
  const cols = 120;
  const rows = 30;
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: PROJECT_ROOT,
    env: { ...process.env, TERM: 'xterm-256color' },
  });

  terminals.set(ws, ptyProcess);

  ptyProcess.onData(data => {
    try {
      ws.send(JSON.stringify({ type: 'output', data }));
    } catch {}
  });

  ptyProcess.onExit(({ exitCode }) => {
    try {
      ws.send(JSON.stringify({ type: 'exit', exitCode }));
    } catch {}
  });

  ws.on('message', msg => {
    try {
      const parsed = JSON.parse(msg.toString());
      if (parsed.type === 'input') {
        ptyProcess.write(parsed.data);
      } else if (parsed.type === 'resize') {
        ptyProcess.resize(parsed.cols || 120, parsed.rows || 30);
      }
    } catch {}
  });

  ws.on('close', () => {
    ptyProcess.kill();
    terminals.delete(ws);
  });
});

// AI Terminal command endpoint — sends command to a terminal
app.post('/terminal/ai-run', (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'Command required' });
  // Broadcast to the first active terminal
  for (const [ws, ptyProc] of terminals) {
    if (ws.readyState === 1) {
      ptyProc.write(command + '\r');
      return res.json({ success: true, message: `Sent: ${command}` });
    }
  }
  return res.status(404).json({ error: 'No active terminal session' });
});

server.listen(PORT, () => {
  console.log(`\n  ⚡ Jarvis IDE API running at http://localhost:${PORT}`);
  console.log(`  🖥️  WebSocket terminal at ws://localhost:${PORT}/ws/terminal`);
  console.log(`  📁 Project root: ${PROJECT_ROOT}\n`);
});

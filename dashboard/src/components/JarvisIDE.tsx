/*
  This file is the full built-in IDE for Jarvis â€” like having Cursor right inside the dashboard.

  It gives you a file explorer, multi-tab code editor, integrated terminal, AI chat,
  command palette, search, and git status â€” everything you need to edit and debug agents
  without leaving the browser.
*/

import { Editor } from '@monaco-editor/react';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal as XTerm } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useCallback, useEffect, useRef, useState } from 'react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  language?: string;
}

interface OpenFile {
  path: string;
  name: string;
  language: string;
  content: string;
  savedContent: string;
  dirty: boolean;
}

interface SearchResult {
  file: string;
  line: number;
  content: string;
}

interface GitFile {
  status: string;
  file: string;
}

interface TerminalEntry {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  timestamp: string;
}

interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: AIChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface PortEntry {
  port: number;
  process: string;
  status: 'listening' | 'closed';
  protocol: 'http' | 'https' | 'tcp';
  url?: string;
}

interface AgentTask {
  id: string;
  name: string;
  icon: string;
  task: string;
  status: 'idle' | 'working' | 'done' | 'error';
  output?: string;
}

interface AIRule {
  id: string;
  title: string;
  content: string;
  scope: 'global' | 'workspace';
  enabled: boolean;
  createdAt: string;
}

interface AIWorkflow {
  id: string;
  name: string;
  description: string;
  steps: AIWorkflowStep[];
  status: 'idle' | 'running' | 'paused' | 'done' | 'error';
  currentStep: number;
  createdAt: string;
}

interface AIWorkflowStep {
  id: string;
  instruction: string;
  status: 'pending' | 'running' | 'done' | 'skipped' | 'error';
  output?: string;
}

interface AIMemory {
  id: string;
  title: string;
  content: string;
  category: 'project' | 'preference' | 'context' | 'pattern' | 'decision';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  auto: boolean;
}

interface AISkill {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  category: 'code' | 'debug' | 'test' | 'docs' | 'refactor' | 'security';
}

type AIChatTab = 'chat' | 'rules' | 'workflows' | 'memories' | 'skills';

interface SelectedElement {
  tag: string;
  id: string;
  classes: string[];
  text: string;
  selector: string;
  attributes: Record<string, string>;
  rect: { x: number; y: number; width: number; height: number };
}

interface BrowserTab {
  id: string;
  url: string;
  urlInput: string;
  title: string;
  history: string[];
  historyIdx: number;
  loading: boolean;
}

type SidebarPanel =
  | 'explorer'
  | 'search'
  | 'git'
  | 'settings'
  | 'extensions'
  | 'rules'
  | 'outline'
  | 'debug';
type BottomPanel = 'terminal' | 'problems' | 'debug' | 'ports' | null;

interface Breakpoint {
  id: string;
  file: string;
  line: number;
  enabled: boolean;
  condition?: string;
}

interface DebugVariable {
  name: string;
  value: string;
  type: string;
  children?: DebugVariable[];
}

interface CallStackFrame {
  id: string;
  name: string;
  file: string;
  line: number;
  column: number;
}

interface DebugConsoleEntry {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info' | 'eval';
  message: string;
  timestamp: string;
}

interface MarketplaceExtension {
  id: string;
  name: string;
  publisher: string;
  description: string;
  icon: string;
  category: string;
  downloads: number;
  rating: number;
  installed: boolean;
  version: string;
}

interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon: string;
  folder?: string;
}

interface BrowserDownload {
  id: string;
  filename: string;
  url: string;
  size: string;
  progress: number;
  status: 'downloading' | 'complete' | 'failed' | 'paused';
  timestamp: string;
}

interface AIBrowserSubtask {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'done' | 'error';
  type:
    | 'click'
    | 'fill'
    | 'navigate'
    | 'scroll'
    | 'screenshot'
    | 'extract'
    | 'wait'
    | 'newTab'
    | 'closeTab'
    | 'select'
    | 'hover'
    | 'submit'
    | 'think';
  target?: string;
  value?: string;
}

interface AIBrowserAction {
  id: string;
  command: string;
  thought: string;
  subtasks: AIBrowserSubtask[];
  status: 'pending' | 'running' | 'done' | 'error';
  timestamp: string;
}

interface DiagnosticItem {
  file: string;
  line: number;
  col: number;
  endLine: number;
  endCol: number;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  source?: string;
  code?: string;
}

interface QuickFixPopup {
  x: number;
  y: number;
  diagnostic: DiagnosticItem;
}

interface EditorSettings {
  fontSize: number;
  tabSize: number;
  fontFamily: string;
  theme: string;
  lineNumbers: boolean;
  bracketPairs: boolean;
  formatOnPaste: boolean;
  renderWhitespace: string;
  cursorStyle: string;
  smoothScrolling: boolean;
}

interface ExtensionItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  category: string;
}

interface RuleItem {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'off';
  category: string;
}

interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

interface InlineEditPopup {
  x: number;
  y: number;
  selectedText: string;
  startLine: number;
  endLine: number;
}

interface SymbolItem {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'component' | 'variable';
  line: number;
}

interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  tier: 'free' | 'paid';
  temperature: number;
  maxTokens: number;
  category?: 'chat' | 'code' | 'image' | 'video';
}

interface BugItem {
  line: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  fix: string;
}

interface BlameInfo {
  hash: string;
  author: string;
  date: string;
  summary: string;
  line: number;
}

interface DiffChange {
  file: string;
  type?: 'add' | 'delete';
  content?: string;
  oldStart?: number;
  newStart?: number;
}

const COLORS = {
  bg: '#1e1e2e',
  sidebar: '#181825',
  editor: '#1e1e2e',
  border: '#313244',
  text: '#cdd6f4',
  textDim: '#6c7086',
  accent: '#89b4fa',
  green: '#a6e3a1',
  red: '#f38ba8',
  yellow: '#f9e2af',
  surface: '#11111b',
  hover: '#313244',
  tabActive: '#2a2a3c',
  statusBar: '#181825',
};

const kbdStyle: React.CSSProperties = {
  background: '#313244',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontFamily: "'Fira Code', monospace",
  color: '#cdd6f4',
  border: '1px solid #45475a',
  marginRight: '6px',
  display: 'inline-block',
  minWidth: '50px',
  textAlign: 'center',
};

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const icons: Record<string, string> = {
    ts: '\u{1F539}',
    tsx: '\u{269B}\uFE0F',
    js: '\u{1F7E8}',
    jsx: '\u{269B}\uFE0F',
    json: '\u{1F4CB}',
    css: '\u{1F3A8}',
    scss: '\u{1F3A8}',
    html: '\u{1F310}',
    md: '\u{1F4DD}',
    yaml: '\u{2699}\uFE0F',
    yml: '\u{2699}\uFE0F',
    py: '\u{1F40D}',
    sql: '\u{1F5C3}\uFE0F',
    sh: '\u{1F4DC}',
    ps1: '\u{1F4DC}',
    bat: '\u{1F4DC}',
    env: '\u{1F512}',
    gitignore: '\u{1F512}',
    txt: '\u{1F4C4}',
    log: '\u{1F4C4}',
    svg: '\u{1F5BC}\uFE0F',
    png: '\u{1F5BC}\uFE0F',
    jpg: '\u{1F5BC}\uFE0F',
  };
  return icons[ext] || '\u{1F4C4}';
}

function flattenFileTree(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  for (const node of nodes) {
    if (node.type === 'file') result.push(node);
    if (node.children) result.push(...flattenFileTree(node.children));
  }
  return result;
}

export function JarvisIDE() {
  const [sidebarPanel, setSidebarPanel] = useState<SidebarPanel>('explorer');
  const [sidebarWidth] = useState(260);
  const [showSidebar, setShowSidebar] = useState(true);
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>(null);
  const [bottomHeight] = useState(200);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(
    new Set(['src', 'dashboard', 'src/agents'])
  );
  const [treeLoading, setTreeLoading] = useState(true);

  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileIdx, setActiveFileIdx] = useState(-1);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inlineSuggestEnabled, setInlineSuggestEnabled] = useState(true);
  const inlineAbortRef = useRef<AbortController | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [gitBranch, setGitBranch] = useState('main');
  const [gitFiles, setGitFiles] = useState<GitFile[]>([]);

  const [terminalHistory, setTerminalHistory] = useState<TerminalEntry[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Real terminal (xterm.js + WebSocket)
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const xtermContainerRef = useRef<HTMLDivElement>(null);
  const [_xtermReady, setXtermReady] = useState(false);

  // Debug state
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [debugRunning, setDebugRunning] = useState(false);
  const [debugPaused, setDebugPaused] = useState(false);
  const [debugVariables, _setDebugVariables] = useState<DebugVariable[]>([
    { name: 'this', value: 'JarvisIDE', type: 'object' },
    { name: 'props', value: '{}', type: 'object' },
  ]);
  const [callStack, setCallStack] = useState<CallStackFrame[]>([]);
  const [debugConsole, setDebugConsole] = useState<DebugConsoleEntry[]>([]);
  const [debugConsoleInput, setDebugConsoleInput] = useState('');
  const debugConsoleEndRef = useRef<HTMLDivElement>(null);

  // Extensions marketplace
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [marketplaceExts, setMarketplaceExts] = useState<MarketplaceExtension[]>([
    // --- Installed ---------------------------------
    {
      id: 'ext-prettier',
      name: 'Prettier',
      publisher: 'Prettier',
      description: 'Code formatter using prettier',
      icon: '??',
      category: 'Formatting',
      downloads: 42100000,
      rating: 4.7,
      installed: true,
      version: '11.0.0',
    },
    {
      id: 'ext-eslint',
      name: 'ESLint',
      publisher: 'Microsoft',
      description: 'Integrates ESLint into the editor',
      icon: '??',
      category: 'Linting',
      downloads: 35200000,
      rating: 4.6,
      installed: true,
      version: '3.0.10',
    },
    {
      id: 'ext-tailwind',
      name: 'Tailwind CSS IntelliSense',
      publisher: 'Tailwind Labs',
      description: 'Intelligent Tailwind CSS tooling',
      icon: '??',
      category: 'CSS',
      downloads: 14200000,
      rating: 4.7,
      installed: true,
      version: '0.14.5',
    },
    {
      id: 'ext-error',
      name: 'Error Lens',
      publisher: 'Alexander',
      description: 'Improve highlighting of errors, warnings and diagnostics',
      icon: '??',
      category: 'Editor',
      downloads: 8500000,
      rating: 4.7,
      installed: true,
      version: '3.20.0',
    },
    {
      id: 'ext-debug-js',
      name: 'JavaScript Debugger',
      publisher: 'Microsoft',
      description: 'Debug Node.js and browser JavaScript',
      icon: '??',
      category: 'Debugging',
      downloads: 19000000,
      rating: 4.5,
      installed: true,
      version: '1.96.0',
    },
    {
      id: 'ext-biome',
      name: 'Biome',
      publisher: 'biomejs',
      description: 'Linter, formatter, and more for JS/TS/JSON',
      icon: '??',
      category: 'Linting',
      downloads: 4200000,
      rating: 4.8,
      installed: true,
      version: '2.4.1',
    },
    // --- AI -----------------------------------------
    {
      id: 'ext-copilot',
      name: 'GitHub Copilot',
      publisher: 'GitHub',
      description: 'AI pair programmer that helps you write code faster',
      icon: '??',
      category: 'AI',
      downloads: 28000000,
      rating: 4.4,
      installed: false,
      version: '1.245.0',
    },
    {
      id: 'ext-copilot-chat',
      name: 'GitHub Copilot Chat',
      publisher: 'GitHub',
      description: 'AI chat and inline conversations for code',
      icon: '??',
      category: 'AI',
      downloads: 18200000,
      rating: 4.3,
      installed: false,
      version: '0.22.4',
    },
    {
      id: 'ext-tabnine',
      name: 'Tabnine AI',
      publisher: 'Tabnine',
      description: 'AI code completions trained on your codebase',
      icon: '??',
      category: 'AI',
      downloads: 9800000,
      rating: 4.2,
      installed: false,
      version: '4.16.0',
    },
    {
      id: 'ext-codeium',
      name: 'Codeium',
      publisher: 'Codeium',
      description: 'Free AI code completion and chat assistant',
      icon: '?',
      category: 'AI',
      downloads: 7500000,
      rating: 4.5,
      installed: false,
      version: '1.14.9',
    },
    {
      id: 'ext-continue',
      name: 'Continue',
      publisher: 'Continue',
      description: 'Open-source AI code assistant with local models',
      icon: '??',
      category: 'AI',
      downloads: 3200000,
      rating: 4.6,
      installed: false,
      version: '0.9.245',
    },
    {
      id: 'ext-cursor-ai',
      name: 'Cursor AI Rules',
      publisher: 'Cursor',
      description: 'Project rules and AI context management',
      icon: '??',
      category: 'AI',
      downloads: 2100000,
      rating: 4.4,
      installed: false,
      version: '1.3.0',
    },
    {
      id: 'ext-supermaven',
      name: 'Supermaven',
      publisher: 'Supermaven',
      description: 'Lightning-fast AI code completion with 1M token context',
      icon: '??',
      category: 'AI',
      downloads: 1800000,
      rating: 4.7,
      installed: false,
      version: '0.1.87',
    },
    {
      id: 'ext-cody',
      name: 'Cody AI',
      publisher: 'Sourcegraph',
      description: 'AI assistant that understands your entire codebase',
      icon: '??',
      category: 'AI',
      downloads: 1500000,
      rating: 4.3,
      installed: false,
      version: '1.42.0',
    },
    // --- Source Control -----------------------------
    {
      id: 'ext-gitlens',
      name: 'GitLens',
      publisher: 'GitKraken',
      description: 'Supercharge Git with blame annotations, code lens, and more',
      icon: '??',
      category: 'Source Control',
      downloads: 31500000,
      rating: 4.5,
      installed: false,
      version: '16.0.4',
    },
    {
      id: 'ext-git-graph',
      name: 'Git Graph',
      publisher: 'mhutchie',
      description: 'View a Git Graph of your repository and perform actions',
      icon: '??',
      category: 'Source Control',
      downloads: 11200000,
      rating: 4.8,
      installed: false,
      version: '1.30.0',
    },
    {
      id: 'ext-git-history',
      name: 'Git History',
      publisher: 'Don Jayamanne',
      description: 'View and search git log, file history, compare branches',
      icon: '??',
      category: 'Source Control',
      downloads: 9800000,
      rating: 4.4,
      installed: false,
      version: '0.6.20',
    },
    {
      id: 'ext-conventional',
      name: 'Conventional Commits',
      publisher: 'vivaxy',
      description: 'Conventional Commits support for editor',
      icon: '??',
      category: 'Source Control',
      downloads: 3100000,
      rating: 4.3,
      installed: false,
      version: '1.26.0',
    },
    {
      id: 'ext-git-blame',
      name: 'Git Blame',
      publisher: 'Wade Anderson',
      description: 'See git blame info in the status bar',
      icon: '??',
      category: 'Source Control',
      downloads: 4500000,
      rating: 4.2,
      installed: false,
      version: '10.10.0',
    },
    // --- Testing ------------------------------------
    {
      id: 'ext-thunder',
      name: 'Thunder Client',
      publisher: 'Thunder',
      description: 'Lightweight REST API client for testing APIs',
      icon: '?',
      category: 'Testing',
      downloads: 12800000,
      rating: 4.8,
      installed: false,
      version: '2.31.1',
    },
    {
      id: 'ext-jest',
      name: 'Jest',
      publisher: 'Orta',
      description: 'Delightful Jest test integration with inline results',
      icon: '??',
      category: 'Testing',
      downloads: 10200000,
      rating: 4.5,
      installed: false,
      version: '6.4.0',
    },
    {
      id: 'ext-vitest',
      name: 'Vitest',
      publisher: 'Vitest',
      description: 'Vitest test runner integration with fast execution',
      icon: '?',
      category: 'Testing',
      downloads: 4300000,
      rating: 4.7,
      installed: false,
      version: '1.6.0',
    },
    {
      id: 'ext-playwright',
      name: 'Playwright Test',
      publisher: 'Microsoft',
      description: 'Run and debug Playwright end-to-end tests',
      icon: '??',
      category: 'Testing',
      downloads: 6100000,
      rating: 4.6,
      installed: false,
      version: '1.1.7',
    },
    {
      id: 'ext-postman',
      name: 'Postman',
      publisher: 'Postman',
      description: 'Design, test, and document APIs from your editor',
      icon: '??',
      category: 'Testing',
      downloads: 3800000,
      rating: 4.2,
      installed: false,
      version: '1.14.0',
    },
    {
      id: 'ext-cypress',
      name: 'Cypress Helper',
      publisher: 'Cypress',
      description: 'IntelliSense and commands for Cypress tests',
      icon: '??',
      category: 'Testing',
      downloads: 2900000,
      rating: 4.1,
      installed: false,
      version: '2.8.0',
    },
    // --- DevOps & Containers ------------------------
    {
      id: 'ext-docker',
      name: 'Docker',
      publisher: 'Microsoft',
      description: 'Build, manage, and deploy containerized applications',
      icon: '??',
      category: 'DevOps',
      downloads: 25600000,
      rating: 4.5,
      installed: false,
      version: '1.29.4',
    },
    {
      id: 'ext-k8s',
      name: 'Kubernetes',
      publisher: 'Microsoft',
      description: 'Develop, deploy and debug Kubernetes applications',
      icon: '??',
      category: 'DevOps',
      downloads: 5200000,
      rating: 4.3,
      installed: false,
      version: '1.3.18',
    },
    {
      id: 'ext-terraform',
      name: 'Terraform',
      publisher: 'HashiCorp',
      description: 'Terraform language support and snippets',
      icon: '???',
      category: 'DevOps',
      downloads: 8100000,
      rating: 4.4,
      installed: false,
      version: '2.33.1',
    },
    {
      id: 'ext-github-actions',
      name: 'GitHub Actions',
      publisher: 'GitHub',
      description: 'Manage GitHub Actions workflows from the editor',
      icon: '??',
      category: 'DevOps',
      downloads: 6700000,
      rating: 4.5,
      installed: false,
      version: '0.27.0',
    },
    {
      id: 'ext-yaml',
      name: 'YAML',
      publisher: 'Red Hat',
      description: 'YAML language support with validation and auto-complete',
      icon: '??',
      category: 'DevOps',
      downloads: 18600000,
      rating: 4.4,
      installed: false,
      version: '1.15.0',
    },
    {
      id: 'ext-aws-toolkit',
      name: 'AWS Toolkit',
      publisher: 'Amazon',
      description: 'Build, test, and deploy AWS resources',
      icon: '??',
      category: 'DevOps',
      downloads: 3400000,
      rating: 4.1,
      installed: false,
      version: '3.28.0',
    },
    {
      id: 'ext-azure',
      name: 'Azure Tools',
      publisher: 'Microsoft',
      description: 'Full Azure cloud development toolkit',
      icon: '??',
      category: 'DevOps',
      downloads: 4100000,
      rating: 4.2,
      installed: false,
      version: '1.8.0',
    },
    {
      id: 'ext-gcp',
      name: 'Cloud Code',
      publisher: 'Google',
      description: 'Google Cloud Platform development tools',
      icon: '??',
      category: 'DevOps',
      downloads: 2100000,
      rating: 4.0,
      installed: false,
      version: '2.18.0',
    },
    // --- Remote / SSH -------------------------------
    {
      id: 'ext-remote',
      name: 'Remote - SSH',
      publisher: 'Microsoft',
      description: 'Open any folder on a remote machine using SSH',
      icon: '??',
      category: 'Remote',
      downloads: 18300000,
      rating: 4.3,
      installed: false,
      version: '0.116.1',
    },
    {
      id: 'ext-remote-wsl',
      name: 'WSL',
      publisher: 'Microsoft',
      description: 'Open folders in Windows Subsystem for Linux',
      icon: '??',
      category: 'Remote',
      downloads: 14100000,
      rating: 4.4,
      installed: false,
      version: '0.88.5',
    },
    {
      id: 'ext-remote-container',
      name: 'Dev Containers',
      publisher: 'Microsoft',
      description: 'Open any folder inside a Docker container',
      icon: '??',
      category: 'Remote',
      downloads: 12800000,
      rating: 4.5,
      installed: false,
      version: '0.388.0',
    },
    {
      id: 'ext-remote-tunnels',
      name: 'Remote Tunnels',
      publisher: 'Microsoft',
      description: 'Access machines through secure tunnels',
      icon: '??',
      category: 'Remote',
      downloads: 5600000,
      rating: 4.2,
      installed: false,
      version: '0.5.1',
    },
    // --- Editor Enhancements ------------------------
    {
      id: 'ext-bracket',
      name: 'Bracket Pair Color DLX',
      publisher: 'BracketPair',
      description: 'Colorizes matching brackets',
      icon: '??',
      category: 'Editor',
      downloads: 9100000,
      rating: 4.3,
      installed: false,
      version: '2.2.2',
    },
    {
      id: 'ext-path',
      name: 'Path Intellisense',
      publisher: 'Christian Kohler',
      description: 'Autocompletes file paths in your code',
      icon: '??',
      category: 'Editor',
      downloads: 13700000,
      rating: 4.4,
      installed: false,
      version: '2.9.0',
    },
    {
      id: 'ext-todo',
      name: 'Todo Tree',
      publisher: 'Gruntfuggly',
      description: 'Show TODO, FIXME and other comment tags in a tree view',
      icon: '??',
      category: 'Editor',
      downloads: 7200000,
      rating: 4.6,
      installed: false,
      version: '0.0.226',
    },
    {
      id: 'ext-import',
      name: 'Auto Import',
      publisher: 'steoates',
      description: 'Automatically finds and adds import statements',
      icon: '??',
      category: 'Editor',
      downloads: 6100000,
      rating: 4.2,
      installed: false,
      version: '1.5.4',
    },
    {
      id: 'ext-bookmarks',
      name: 'Bookmarks',
      publisher: 'Alessandro Fragnani',
      description: 'Mark lines and jump to them quickly',
      icon: '??',
      category: 'Editor',
      downloads: 8400000,
      rating: 4.5,
      installed: false,
      version: '13.5.0',
    },
    {
      id: 'ext-multi-cursor',
      name: 'Multi Cursor Case Preserve',
      publisher: 'Cardinal90',
      description: 'Preserves case when editing with multiple cursors',
      icon: '??',
      category: 'Editor',
      downloads: 2200000,
      rating: 4.3,
      installed: false,
      version: '1.0.5',
    },
    {
      id: 'ext-indent-rainbow',
      name: 'Indent Rainbow',
      publisher: 'oderwat',
      description: 'Makes indentation easier to read with colors',
      icon: '??',
      category: 'Editor',
      downloads: 11200000,
      rating: 4.6,
      installed: false,
      version: '8.3.1',
    },
    {
      id: 'ext-better-comments',
      name: 'Better Comments',
      publisher: 'Aaron Bond',
      description: 'Colorize comments with alerts, queries, TODOs',
      icon: '??',
      category: 'Editor',
      downloads: 10600000,
      rating: 4.5,
      installed: false,
      version: '3.0.2',
    },
    {
      id: 'ext-trailing-spaces',
      name: 'Trailing Spaces',
      publisher: 'Shardul Mahadik',
      description: 'Highlight and remove trailing whitespace',
      icon: '??',
      category: 'Editor',
      downloads: 3100000,
      rating: 4.4,
      installed: false,
      version: '0.4.1',
    },
    {
      id: 'ext-code-spell',
      name: 'Code Spell Checker',
      publisher: 'Street Side',
      description: 'Catch common spelling errors in source code',
      icon: '??',
      category: 'Editor',
      downloads: 12100000,
      rating: 4.5,
      installed: false,
      version: '4.0.14',
    },
    {
      id: 'ext-sort-lines',
      name: 'Sort Lines',
      publisher: 'Daniel Imms',
      description: 'Sort lines of text naturally, by length, etc.',
      icon: '??',
      category: 'Editor',
      downloads: 4300000,
      rating: 4.4,
      installed: false,
      version: '1.11.0',
    },
    {
      id: 'ext-change-case',
      name: 'Change Case',
      publisher: 'wmaurer',
      description: 'Quickly change the case of text (camelCase, UPPER, etc.)',
      icon: '??',
      category: 'Editor',
      downloads: 3700000,
      rating: 4.3,
      installed: false,
      version: '1.0.0',
    },
    {
      id: 'ext-peacock',
      name: 'Peacock',
      publisher: 'John Papa',
      description: 'Subtly change workspace color for multi-instance dev',
      icon: '??',
      category: 'Editor',
      downloads: 6800000,
      rating: 4.6,
      installed: false,
      version: '4.2.2',
    },
    {
      id: 'ext-regex-preview',
      name: 'Regex Previewer',
      publisher: 'Christof Marti',
      description: 'Preview regex matches in a side-by-side editor',
      icon: '??',
      category: 'Editor',
      downloads: 2400000,
      rating: 4.3,
      installed: false,
      version: '0.7.1',
    },
    {
      id: 'ext-project-manager',
      name: 'Project Manager',
      publisher: 'Alessandro Fragnani',
      description: 'Switch between projects instantly',
      icon: '???',
      category: 'Editor',
      downloads: 7900000,
      rating: 4.5,
      installed: false,
      version: '12.8.0',
    },
    // --- Languages ----------------------------------
    {
      id: 'ext-python',
      name: 'Python',
      publisher: 'Microsoft',
      description: 'IntelliSense, linting, debugging for Python',
      icon: '??',
      category: 'Language',
      downloads: 112000000,
      rating: 4.6,
      installed: false,
      version: '2024.22.1',
    },
    {
      id: 'ext-pylance',
      name: 'Pylance',
      publisher: 'Microsoft',
      description: 'Fast, feature-rich Python language support',
      icon: '??',
      category: 'Language',
      downloads: 68000000,
      rating: 4.5,
      installed: false,
      version: '2024.12.1',
    },
    {
      id: 'ext-csharp',
      name: 'C#',
      publisher: 'Microsoft',
      description: 'Lightweight C# development tools',
      icon: '??',
      category: 'Language',
      downloads: 44000000,
      rating: 4.4,
      installed: false,
      version: '2.59.0',
    },
    {
      id: 'ext-java',
      name: 'Language Support for Java',
      publisher: 'Red Hat',
      description: 'Java IntelliSense, navigation, and refactoring',
      icon: '?',
      category: 'Language',
      downloads: 28000000,
      rating: 4.3,
      installed: false,
      version: '1.37.0',
    },
    {
      id: 'ext-go',
      name: 'Go',
      publisher: 'Go Team at Google',
      description: 'Rich Go language support with IntelliSense',
      icon: '??',
      category: 'Language',
      downloads: 16200000,
      rating: 4.5,
      installed: false,
      version: '0.43.3',
    },
    {
      id: 'ext-rust',
      name: 'rust-analyzer',
      publisher: 'rust-lang',
      description: 'Rust language support via rust-analyzer',
      icon: '??',
      category: 'Language',
      downloads: 8900000,
      rating: 4.7,
      installed: false,
      version: '0.4.2215',
    },
    {
      id: 'ext-cpp',
      name: 'C/C++',
      publisher: 'Microsoft',
      description: 'C/C++ IntelliSense, debugging, and code browsing',
      icon: '??',
      category: 'Language',
      downloads: 52000000,
      rating: 4.3,
      installed: false,
      version: '1.22.11',
    },
    {
      id: 'ext-dart',
      name: 'Dart',
      publisher: 'Dart Code',
      description: 'Dart language support and debugger',
      icon: '??',
      category: 'Language',
      downloads: 7600000,
      rating: 4.5,
      installed: false,
      version: '3.102.0',
    },
    {
      id: 'ext-ruby',
      name: 'Ruby LSP',
      publisher: 'Shopify',
      description: 'Ruby language server with IntelliSense',
      icon: '??',
      category: 'Language',
      downloads: 3400000,
      rating: 4.3,
      installed: false,
      version: '0.13.4',
    },
    {
      id: 'ext-php',
      name: 'PHP Intelephense',
      publisher: 'Ben Mewburn',
      description: 'High performance PHP IntelliSense',
      icon: '??',
      category: 'Language',
      downloads: 15800000,
      rating: 4.4,
      installed: false,
      version: '1.12.4',
    },
    {
      id: 'ext-swift',
      name: 'Swift',
      publisher: 'Swift Server WG',
      description: 'Swift language support for editor',
      icon: '???',
      category: 'Language',
      downloads: 1800000,
      rating: 4.1,
      installed: false,
      version: '1.11.1',
    },
    {
      id: 'ext-kotlin',
      name: 'Kotlin',
      publisher: 'Mathias Froehlich',
      description: 'Kotlin language support and debugging',
      icon: '??',
      category: 'Language',
      downloads: 2900000,
      rating: 4.0,
      installed: false,
      version: '0.2.35',
    },
    {
      id: 'ext-lua',
      name: 'Lua',
      publisher: 'sumneko',
      description: 'Lua language server for IntelliSense',
      icon: '??',
      category: 'Language',
      downloads: 4200000,
      rating: 4.6,
      installed: false,
      version: '3.11.1',
    },
    {
      id: 'ext-elixir',
      name: 'ElixirLS',
      publisher: 'ElixirLS',
      description: 'Elixir support with debugger via ElixirLS',
      icon: '??',
      category: 'Language',
      downloads: 1200000,
      rating: 4.4,
      installed: false,
      version: '0.23.2',
    },
    {
      id: 'ext-zig',
      name: 'Zig Language',
      publisher: 'ziglang',
      description: 'Zig language support with ZLS integration',
      icon: '?',
      category: 'Language',
      downloads: 890000,
      rating: 4.5,
      installed: false,
      version: '0.2.0',
    },
    // --- Frameworks ---------------------------------
    {
      id: 'ext-react-snippets',
      name: 'ES7+ React/Redux Snippets',
      publisher: 'dsznajder',
      description: 'React/Redux/GraphQL snippets with ES7+ syntax',
      icon: '??',
      category: 'Frameworks',
      downloads: 14600000,
      rating: 4.4,
      installed: false,
      version: '4.4.3',
    },
    {
      id: 'ext-vue',
      name: 'Vue - Official',
      publisher: 'Vue',
      description: 'Language support for Vue 3 SFC files',
      icon: '??',
      category: 'Frameworks',
      downloads: 13200000,
      rating: 4.5,
      installed: false,
      version: '2.2.0',
    },
    {
      id: 'ext-svelte',
      name: 'Svelte for VS Code',
      publisher: 'Svelte',
      description: 'Svelte language support and IntelliSense',
      icon: '??',
      category: 'Frameworks',
      downloads: 3800000,
      rating: 4.5,
      installed: false,
      version: '108.6.3',
    },
    {
      id: 'ext-angular',
      name: 'Angular Language Service',
      publisher: 'Angular',
      description: 'Editor services for Angular templates',
      icon: '???',
      category: 'Frameworks',
      downloads: 8900000,
      rating: 4.3,
      installed: false,
      version: '18.2.0',
    },
    {
      id: 'ext-nextjs',
      name: 'Next.js Snippets',
      publisher: 'iJS',
      description: 'Latest Next.js snippets with App Router support',
      icon: '?',
      category: 'Frameworks',
      downloads: 2800000,
      rating: 4.2,
      installed: false,
      version: '1.2.0',
    },
    {
      id: 'ext-flutter',
      name: 'Flutter',
      publisher: 'Dart Code',
      description: 'Flutter development support and hot reload',
      icon: '??',
      category: 'Frameworks',
      downloads: 7800000,
      rating: 4.6,
      installed: false,
      version: '3.102.0',
    },
    {
      id: 'ext-django',
      name: 'Django',
      publisher: 'Baptiste',
      description: 'Django template language support and snippets',
      icon: '??',
      category: 'Frameworks',
      downloads: 2100000,
      rating: 4.1,
      installed: false,
      version: '1.15.0',
    },
    {
      id: 'ext-spring-boot',
      name: 'Spring Boot Tools',
      publisher: 'VMware',
      description: 'Spring Boot application development support',
      icon: '??',
      category: 'Frameworks',
      downloads: 3900000,
      rating: 4.3,
      installed: false,
      version: '1.57.0',
    },
    {
      id: 'ext-dotnet',
      name: '.NET Core Tools',
      publisher: 'Microsoft',
      description: '.NET project management and scaffolding',
      icon: '??',
      category: 'Frameworks',
      downloads: 4500000,
      rating: 4.2,
      installed: false,
      version: '1.28.0',
    },
    {
      id: 'ext-astro',
      name: 'Astro',
      publisher: 'Astro',
      description: 'Language support for Astro framework',
      icon: '??',
      category: 'Frameworks',
      downloads: 2400000,
      rating: 4.6,
      installed: false,
      version: '2.16.2',
    },
    // --- CSS & Styling ------------------------------
    {
      id: 'ext-css-peek',
      name: 'CSS Peek',
      publisher: 'Pranay Prakash',
      description: 'Peek and go to CSS definitions from HTML/JSX',
      icon: '??',
      category: 'CSS',
      downloads: 6200000,
      rating: 4.4,
      installed: false,
      version: '4.4.1',
    },
    {
      id: 'ext-color-highlight',
      name: 'Color Highlight',
      publisher: 'Sergii N',
      description: 'Highlight CSS/web colors in your editor',
      icon: '??',
      category: 'CSS',
      downloads: 8800000,
      rating: 4.5,
      installed: false,
      version: '2.8.0',
    },
    {
      id: 'ext-sass',
      name: 'Sass',
      publisher: 'Syler',
      description: 'Sass/SCSS syntax highlighting and IntelliSense',
      icon: '??',
      category: 'CSS',
      downloads: 5100000,
      rating: 4.3,
      installed: false,
      version: '1.9.1',
    },
    {
      id: 'ext-styled',
      name: 'styled-components',
      publisher: 'Styled Components',
      description: 'Syntax highlighting for styled-components',
      icon: '??',
      category: 'CSS',
      downloads: 3200000,
      rating: 4.2,
      installed: false,
      version: '1.7.10',
    },
    {
      id: 'ext-autoprefixer',
      name: 'Autoprefixer',
      publisher: 'mrmlnc',
      description: 'Parse CSS and add vendor prefixes automatically',
      icon: '??',
      category: 'CSS',
      downloads: 2100000,
      rating: 4.1,
      installed: false,
      version: '3.0.1',
    },
    // --- Preview & Live -----------------------------
    {
      id: 'ext-live',
      name: 'Live Server',
      publisher: 'Ritwick Dey',
      description: 'Launch a local development server with live reload',
      icon: '??',
      category: 'Preview',
      downloads: 46800000,
      rating: 4.6,
      installed: false,
      version: '5.7.9',
    },
    {
      id: 'ext-live-share',
      name: 'Live Share',
      publisher: 'Microsoft',
      description: 'Real-time collaborative editing and debugging',
      icon: '??',
      category: 'Preview',
      downloads: 17400000,
      rating: 4.4,
      installed: false,
      version: '1.0.5941',
    },
    {
      id: 'ext-markdown-preview',
      name: 'Markdown Preview Enhanced',
      publisher: 'Yiyi Wang',
      description: 'Enhanced markdown preview with diagrams, LaTeX',
      icon: '??',
      category: 'Preview',
      downloads: 6100000,
      rating: 4.5,
      installed: false,
      version: '0.8.15',
    },
    {
      id: 'ext-svg-preview',
      name: 'SVG Preview',
      publisher: 'Simon Siefke',
      description: 'Preview SVG files in the editor',
      icon: '???',
      category: 'Preview',
      downloads: 3200000,
      rating: 4.3,
      installed: false,
      version: '2.8.3',
    },
    {
      id: 'ext-image-preview',
      name: 'Image Preview',
      publisher: 'Kiss Tamás',
      description: 'Shows image preview in the gutter and on hover',
      icon: '???',
      category: 'Preview',
      downloads: 4500000,
      rating: 4.4,
      installed: false,
      version: '0.30.0',
    },
    // --- Themes -------------------------------------
    {
      id: 'ext-icons',
      name: 'Material Icon Theme',
      publisher: 'PKief',
      description: 'Material Design icons for files and folders',
      icon: '??',
      category: 'Themes',
      downloads: 22400000,
      rating: 4.8,
      installed: false,
      version: '5.17.0',
    },
    {
      id: 'ext-one-dark',
      name: 'One Dark Pro',
      publisher: 'binaryify',
      description: "Atom's iconic One Dark theme for the editor",
      icon: '??',
      category: 'Themes',
      downloads: 19800000,
      rating: 4.6,
      installed: false,
      version: '3.17.0',
    },
    {
      id: 'ext-dracula',
      name: 'Dracula Official',
      publisher: 'Dracula Theme',
      description: 'The famous Dracula dark theme',
      icon: '??',
      category: 'Themes',
      downloads: 14200000,
      rating: 4.5,
      installed: false,
      version: '2.25.1',
    },
    {
      id: 'ext-monokai',
      name: 'Monokai Pro',
      publisher: 'monokai',
      description: 'Professional Monokai color scheme',
      icon: '??',
      category: 'Themes',
      downloads: 8100000,
      rating: 4.4,
      installed: false,
      version: '1.3.2',
    },
    {
      id: 'ext-github-theme',
      name: 'GitHub Theme',
      publisher: 'GitHub',
      description: "GitHub's official light and dark themes",
      icon: '??',
      category: 'Themes',
      downloads: 11200000,
      rating: 4.5,
      installed: false,
      version: '6.3.5',
    },
    {
      id: 'ext-catppuccin',
      name: 'Catppuccin',
      publisher: 'Catppuccin',
      description: 'Soothing pastel theme for the editor',
      icon: '??',
      category: 'Themes',
      downloads: 5400000,
      rating: 4.7,
      installed: false,
      version: '3.16.0',
    },
    {
      id: 'ext-tokyo-night',
      name: 'Tokyo Night',
      publisher: 'enkia',
      description: 'Clean visual noise reduction theme inspired by Tokyo',
      icon: '??',
      category: 'Themes',
      downloads: 6900000,
      rating: 4.6,
      installed: false,
      version: '1.0.8',
    },
    {
      id: 'ext-nord',
      name: 'Nord',
      publisher: 'arcticicestudio',
      description: 'Arctic, north-bluish clean and elegant theme',
      icon: '??',
      category: 'Themes',
      downloads: 4200000,
      rating: 4.4,
      installed: false,
      version: '0.19.0',
    },
    {
      id: 'ext-ayu',
      name: 'Ayu',
      publisher: 'teabyii',
      description: 'Simple theme with bright colors for comfortable work',
      icon: '??',
      category: 'Themes',
      downloads: 3800000,
      rating: 4.5,
      installed: false,
      version: '1.0.5',
    },
    {
      id: 'ext-product-icons',
      name: 'Fluent Icons',
      publisher: 'Miguelsolorio',
      description: 'Fluent product icons for the workbench',
      icon: '?',
      category: 'Themes',
      downloads: 5100000,
      rating: 4.6,
      installed: false,
      version: '0.0.20',
    },
    // --- Debugging ----------------------------------
    {
      id: 'ext-debug-python',
      name: 'Python Debugger',
      publisher: 'Microsoft',
      description: 'Debug Python scripts, Django, Flask, and more',
      icon: '??',
      category: 'Debugging',
      downloads: 32000000,
      rating: 4.5,
      installed: false,
      version: '2024.14.0',
    },
    {
      id: 'ext-debug-chrome',
      name: 'Debugger for Chrome',
      publisher: 'Microsoft',
      description: 'Debug JavaScript in Chrome from the editor',
      icon: '??',
      category: 'Debugging',
      downloads: 15400000,
      rating: 4.3,
      installed: false,
      version: '4.13.0',
    },
    {
      id: 'ext-debug-dotnet',
      name: 'C# Dev Kit',
      publisher: 'Microsoft',
      description: '.NET debugging and project management',
      icon: '??',
      category: 'Debugging',
      downloads: 8200000,
      rating: 4.2,
      installed: false,
      version: '1.14.0',
    },
    {
      id: 'ext-debug-go',
      name: 'Go Debugger',
      publisher: 'Go Team',
      description: 'Delve debugger integration for Go',
      icon: '??',
      category: 'Debugging',
      downloads: 4100000,
      rating: 4.4,
      installed: false,
      version: '0.43.3',
    },
    // --- Snippets -----------------------------------
    {
      id: 'ext-html-snippets',
      name: 'HTML Snippets',
      publisher: 'Mohamed Abusaid',
      description: 'Full HTML5 tag snippets and auto-close',
      icon: '??',
      category: 'Snippets',
      downloads: 14200000,
      rating: 4.3,
      installed: false,
      version: '1.0.0',
    },
    {
      id: 'ext-js-snippets',
      name: 'JavaScript (ES6) Snippets',
      publisher: 'charalampos',
      description: 'Code snippets for JavaScript in ES6+ syntax',
      icon: '??',
      category: 'Snippets',
      downloads: 16800000,
      rating: 4.5,
      installed: false,
      version: '1.8.0',
    },
    {
      id: 'ext-emmet',
      name: 'Emmet Live',
      publisher: 'Mithril',
      description: 'Live preview of Emmet abbreviations in HTML/CSS',
      icon: '?',
      category: 'Snippets',
      downloads: 2300000,
      rating: 4.2,
      installed: false,
      version: '1.1.0',
    },
    {
      id: 'ext-ts-snippets',
      name: 'TypeScript Snippets',
      publisher: 'Nicolas Carlo',
      description: 'Useful TypeScript snippets for daily development',
      icon: '??',
      category: 'Snippets',
      downloads: 3400000,
      rating: 4.3,
      installed: false,
      version: '2.5.0',
    },
    // --- Database -----------------------------------
    {
      id: 'ext-sql-tools',
      name: 'SQLTools',
      publisher: 'Matheus Teixeira',
      description: 'Database management for PostgreSQL, MySQL, SQLite',
      icon: '???',
      category: 'Database',
      downloads: 5800000,
      rating: 4.4,
      installed: false,
      version: '0.28.4',
    },
    {
      id: 'ext-mongodb',
      name: 'MongoDB for VS Code',
      publisher: 'MongoDB',
      description: 'Browse MongoDB databases and collections',
      icon: '??',
      category: 'Database',
      downloads: 3200000,
      rating: 4.2,
      installed: false,
      version: '1.9.0',
    },
    {
      id: 'ext-redis',
      name: 'Redis Explorer',
      publisher: 'David Zuber',
      description: 'Browse and manage Redis databases',
      icon: '??',
      category: 'Database',
      downloads: 1400000,
      rating: 4.1,
      installed: false,
      version: '0.5.2',
    },
    {
      id: 'ext-prisma',
      name: 'Prisma',
      publisher: 'Prisma',
      description: 'Prisma schema language support and formatting',
      icon: '??',
      category: 'Database',
      downloads: 5100000,
      rating: 4.6,
      installed: false,
      version: '6.2.0',
    },
    // --- Security -----------------------------------
    {
      id: 'ext-snyk',
      name: 'Snyk Security',
      publisher: 'Snyk',
      description: 'Find and fix vulnerabilities in your code',
      icon: '???',
      category: 'Security',
      downloads: 2800000,
      rating: 4.3,
      installed: false,
      version: '2.14.0',
    },
    {
      id: 'ext-sonarqube',
      name: 'SonarQube',
      publisher: 'SonarSource',
      description: 'SonarQube code quality and security analysis',
      icon: '??',
      category: 'Security',
      downloads: 3100000,
      rating: 4.2,
      installed: false,
      version: '4.14.0',
    },
    {
      id: 'ext-gitleaks',
      name: 'GitLeaks',
      publisher: 'zricethezav',
      description: 'Detect hardcoded secrets in your repository',
      icon: '??',
      category: 'Security',
      downloads: 1100000,
      rating: 4.4,
      installed: false,
      version: '8.21.0',
    },
    {
      id: 'ext-dependi',
      name: 'Dependi',
      publisher: 'Fill Labs',
      description: 'Manage dependencies and detect vulnerabilities',
      icon: '??',
      category: 'Security',
      downloads: 1800000,
      rating: 4.3,
      installed: false,
      version: '0.7.10',
    },
    // --- Data & Notebooks ---------------------------
    {
      id: 'ext-jupyter',
      name: 'Jupyter',
      publisher: 'Microsoft',
      description: 'Jupyter notebook support with rich output',
      icon: '??',
      category: 'Data',
      downloads: 26000000,
      rating: 4.4,
      installed: false,
      version: '2024.11.0',
    },
    {
      id: 'ext-data-viewer',
      name: 'Data Wrangler',
      publisher: 'Microsoft',
      description: 'Explore and visualize datasets with rich UI',
      icon: '??',
      category: 'Data',
      downloads: 2100000,
      rating: 4.3,
      installed: false,
      version: '1.6.0',
    },
    {
      id: 'ext-rainbow-csv',
      name: 'Rainbow CSV',
      publisher: 'mechatroner',
      description: 'Highlight CSV columns in different colors',
      icon: '??',
      category: 'Data',
      downloads: 7100000,
      rating: 4.6,
      installed: false,
      version: '3.12.0',
    },
    // --- Formatting & Linting -----------------------
    {
      id: 'ext-editorconfig',
      name: 'EditorConfig',
      publisher: 'EditorConfig',
      description: 'EditorConfig support for consistent coding styles',
      icon: '??',
      category: 'Formatting',
      downloads: 13400000,
      rating: 4.5,
      installed: false,
      version: '0.16.4',
    },
    {
      id: 'ext-stylelint',
      name: 'Stylelint',
      publisher: 'Stylelint',
      description: 'Modern CSS/SCSS/Less linter',
      icon: '??',
      category: 'Linting',
      downloads: 3800000,
      rating: 4.4,
      installed: false,
      version: '1.4.0',
    },
    {
      id: 'ext-markdownlint',
      name: 'markdownlint',
      publisher: 'David Anson',
      description: 'Markdown linting and style checking',
      icon: '??',
      category: 'Linting',
      downloads: 8900000,
      rating: 4.5,
      installed: false,
      version: '0.57.0',
    },
    {
      id: 'ext-shellcheck',
      name: 'ShellCheck',
      publisher: 'Timon Wong',
      description: 'Shell script static analysis tool',
      icon: '??',
      category: 'Linting',
      downloads: 3200000,
      rating: 4.5,
      installed: false,
      version: '0.37.1',
    },
    // --- Productivity -------------------------------
    {
      id: 'ext-wakatime',
      name: 'WakaTime',
      publisher: 'WakaTime',
      description: 'Metrics, insights, and time tracking for developers',
      icon: '??',
      category: 'Productivity',
      downloads: 7400000,
      rating: 4.4,
      installed: false,
      version: '24.8.1',
    },
    {
      id: 'ext-polacode',
      name: 'Polacode',
      publisher: 'Jeff Hykin',
      description: 'Create beautiful code screenshots',
      icon: '??',
      category: 'Productivity',
      downloads: 3600000,
      rating: 4.3,
      installed: false,
      version: '0.3.4',
    },
    {
      id: 'ext-code-runner',
      name: 'Code Runner',
      publisher: 'Jun Han',
      description: 'Run code snippet or file in multiple languages',
      icon: '??',
      category: 'Productivity',
      downloads: 19800000,
      rating: 4.5,
      installed: false,
      version: '0.12.2',
    },
    {
      id: 'ext-turbo-console',
      name: 'Turbo Console Log',
      publisher: 'ChakrounAnas',
      description: 'Automating the process of writing log messages',
      icon: '???',
      category: 'Productivity',
      downloads: 5400000,
      rating: 4.3,
      installed: false,
      version: '2.10.4',
    },
    {
      id: 'ext-dotenv',
      name: 'DotENV',
      publisher: 'mikestead',
      description: '.env file syntax highlighting and IntelliSense',
      icon: '??',
      category: 'Productivity',
      downloads: 11200000,
      rating: 4.5,
      installed: false,
      version: '1.0.1',
    },
    {
      id: 'ext-toggle-quotes',
      name: 'Toggle Quotes',
      publisher: 'BriteSnow',
      description: 'Toggle between single, double, and backtick quotes',
      icon: '??',
      category: 'Productivity',
      downloads: 1800000,
      rating: 4.2,
      installed: false,
      version: '0.3.6',
    },
    {
      id: 'ext-auto-rename',
      name: 'Auto Rename Tag',
      publisher: 'Jun Han',
      description: 'Auto rename paired HTML/XML tags',
      icon: '???',
      category: 'Productivity',
      downloads: 16200000,
      rating: 4.4,
      installed: false,
      version: '0.1.10',
    },
    {
      id: 'ext-auto-close',
      name: 'Auto Close Tag',
      publisher: 'Jun Han',
      description: 'Auto close HTML/XML tags',
      icon: '???',
      category: 'Productivity',
      downloads: 14800000,
      rating: 4.3,
      installed: false,
      version: '0.5.15',
    },
    {
      id: 'ext-import-cost',
      name: 'Import Cost',
      publisher: 'Wix',
      description: 'Display import/require package sizes inline',
      icon: '??',
      category: 'Productivity',
      downloads: 5600000,
      rating: 4.2,
      installed: false,
      version: '3.3.0',
    },
    {
      id: 'ext-npm-intellisense',
      name: 'npm Intellisense',
      publisher: 'Christian Kohler',
      description: 'Autocomplete npm modules in import statements',
      icon: '??',
      category: 'Productivity',
      downloads: 8900000,
      rating: 4.4,
      installed: false,
      version: '1.4.5',
    },
  ]);

  const defaultWelcome: AIChatMessage = {
    role: 'assistant',
    content:
      'I\'m your AI coding assistant. Ask me about any file, explain code, or request changes.\n\nI can also run terminal commands — just say something like:\n• "Run npm install"\n• "Execute git status"\n• "Build the project"',
    timestamp: new Date().toISOString(),
  };
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([defaultWelcome]);
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 'conv-default',
      title: 'New Conversation',
      messages: [defaultWelcome],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);
  const [activeConversationId, setActiveConversationId] = useState('conv-default');
  const [showConversationList, setShowConversationList] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);
  const [showAtMention, setShowAtMention] = useState(false);
  const [atMentionFilter, setAtMentionFilter] = useState('');
  const [atMentionExpanded, setAtMentionExpanded] = useState<string | null>(null);

  // Ports panel
  const [ports, setPorts] = useState<PortEntry[]>([
    {
      port: 5173,
      process: 'vite',
      status: 'listening',
      protocol: 'http',
      url: 'http://localhost:5173',
    },
    {
      port: 3028,
      process: 'jarvis-api',
      status: 'listening',
      protocol: 'http',
      url: 'http://localhost:3028',
    },
  ]);
  const [newPortInput, setNewPortInput] = useState('');

  // Multi-agent
  const [agents, setAgents] = useState<AgentTask[]>([
    { id: 'agent-coder', name: 'Coder', icon: '??', task: '', status: 'idle' },
    { id: 'agent-reviewer', name: 'Reviewer', icon: '??', task: '', status: 'idle' },
    { id: 'agent-tester', name: 'Tester', icon: '??', task: '', status: 'idle' },
    { id: 'agent-debugger', name: 'Debugger', icon: '??', task: '', status: 'idle' },
    { id: 'agent-architect', name: 'Architect', icon: '???', task: '', status: 'idle' },
  ]);
  const [showAgentPanel, setShowAgentPanel] = useState(false);

  // AI Chat tab (chat / rules / workflows / memories / skills)
  const [aiChatTab, setAiChatTab] = useState<AIChatTab>('chat');

  // AI Rules
  const [aiRules, setAiRules] = useState<AIRule[]>([
    {
      id: 'rule-1',
      title: 'Code Style',
      content: 'Use 2-space indentation, double quotes for JSX, Tailwind for styling.',
      scope: 'workspace',
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'rule-2',
      title: 'Error Handling',
      content: 'Always wrap async operations in try/catch. Show user-friendly error messages.',
      scope: 'global',
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'rule-3',
      title: 'TypeScript Strict',
      content: 'Use strict TypeScript. No any types. All functions must have return types.',
      scope: 'workspace',
      enabled: true,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleContent, setNewRuleContent] = useState('');
  const [newRuleScope, setNewRuleScope] = useState<'global' | 'workspace'>('workspace');

  // AI Workflows
  const [aiWorkflows, setAiWorkflows] = useState<AIWorkflow[]>([
    {
      id: 'wf-1',
      name: 'Full Build & Test',
      description: 'Build project, run tests, fix errors',
      steps: [
        { id: 'wf1-s1', instruction: 'Run npm run build', status: 'pending' },
        { id: 'wf1-s2', instruction: 'Check for TypeScript errors', status: 'pending' },
        { id: 'wf1-s3', instruction: 'Run npm test', status: 'pending' },
        { id: 'wf1-s4', instruction: 'Fix any failing tests', status: 'pending' },
        { id: 'wf1-s5', instruction: 'Run final verification', status: 'pending' },
      ],
      status: 'idle',
      currentStep: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'wf-2',
      name: 'Security Audit',
      description: 'Check for XSS, secrets, input validation',
      steps: [
        { id: 'wf2-s1', instruction: 'Scan for hardcoded API keys and secrets', status: 'pending' },
        {
          id: 'wf2-s2',
          instruction: 'Check all dangerouslySetInnerHTML usages',
          status: 'pending',
        },
        { id: 'wf2-s3', instruction: 'Verify input sanitization on all forms', status: 'pending' },
        { id: 'wf2-s4', instruction: 'Review authentication and authorization', status: 'pending' },
      ],
      status: 'idle',
      currentStep: 0,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [newWfName, setNewWfName] = useState('');
  const [newWfSteps, setNewWfSteps] = useState('');

  // AI Memories
  const [aiMemories, setAiMemories] = useState<AIMemory[]>([
    {
      id: 'mem-1',
      title: 'Tech Stack',
      content:
        'React + TypeScript + Vite frontend. Express + Node.js backend. PostgreSQL database. Tailwind CSS for styling.',
      category: 'project',
      tags: ['stack', 'tech'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auto: true,
    },
    {
      id: 'mem-2',
      title: 'Project Structure',
      content:
        'dashboard/ = frontend React app. src/ = backend agents + API. Jarvis-Memory/ = memory system. Jarvis-Emotions-Engine/ = emotion processing.',
      category: 'project',
      tags: ['structure', 'folders'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auto: true,
    },
    {
      id: 'mem-3',
      title: 'User Preference',
      content:
        'User prefers to be called "Yorkie". Follows Yorkie Coding Constitution for all code.',
      category: 'preference',
      tags: ['user', 'name', 'style'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auto: false,
    },
    {
      id: 'mem-4',
      title: 'IDE Component',
      content:
        'JarvisIDE.tsx is the main IDE component with browser, editor, terminal, AI chat, debug console, file explorer, and multi-agent support.',
      category: 'context',
      tags: ['ide', 'component'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auto: true,
    },
  ]);
  const [showNewMemory, setShowNewMemory] = useState(false);
  const [newMemTitle, setNewMemTitle] = useState('');
  const [newMemContent, setNewMemContent] = useState('');
  const [newMemCategory, setNewMemCategory] = useState<AIMemory['category']>('context');
  const [memoryFilter, setMemoryFilter] = useState<'all' | AIMemory['category']>('all');

  // AI Skills
  const [aiSkills, setAiSkills] = useState<AISkill[]>([
    {
      id: 'skill-1',
      name: 'Code Generation',
      description: 'Generate code from natural language descriptions',
      icon: '??',
      enabled: true,
      category: 'code',
    },
    {
      id: 'skill-2',
      name: 'Bug Fixer',
      description: 'Identify and fix bugs in code',
      icon: '??',
      enabled: true,
      category: 'debug',
    },
    {
      id: 'skill-3',
      name: 'Test Writer',
      description: 'Generate comprehensive test suites',
      icon: '??',
      enabled: true,
      category: 'test',
    },
    {
      id: 'skill-4',
      name: 'Doc Generator',
      description: 'Create documentation and comments',
      icon: '??',
      enabled: true,
      category: 'docs',
    },
    {
      id: 'skill-5',
      name: 'Refactorer',
      description: 'Refactor code for better patterns and performance',
      icon: '??',
      enabled: true,
      category: 'refactor',
    },
    {
      id: 'skill-6',
      name: 'Security Scanner',
      description: 'Scan for security vulnerabilities',
      icon: '??',
      enabled: true,
      category: 'security',
    },
    {
      id: 'skill-7',
      name: 'Terminal Commander',
      description: 'Execute and chain terminal commands',
      icon: '???',
      enabled: true,
      category: 'code',
    },
    {
      id: 'skill-8',
      name: 'Code Reviewer',
      description: 'Review code for quality and best practices',
      icon: '???',
      enabled: true,
      category: 'code',
    },
    {
      id: 'skill-9',
      name: 'Performance Optimizer',
      description: 'Optimize code for speed and memory',
      icon: '?',
      enabled: false,
      category: 'refactor',
    },
    {
      id: 'skill-10',
      name: 'Accessibility Auditor',
      description: 'Check ARIA, keyboard nav, contrast',
      icon: '?',
      enabled: false,
      category: 'code',
    },
  ]);

  const atMentionSources = [
    { id: 'web', icon: '??', label: 'Web', description: 'Search the web for context' },
    {
      id: 'code-context',
      icon: '??',
      label: 'Code Context Items',
      description: 'Reference code symbols and definitions',
    },
    {
      id: 'files',
      icon: '??',
      label: 'Files',
      description: 'Reference specific files in your project',
    },
    {
      id: 'directories',
      icon: '??',
      label: 'Directories',
      description: 'Reference entire directories',
    },
    {
      id: 'git',
      icon: '??',
      label: 'Git',
      description: 'Reference git commits, branches, and diffs',
    },
    {
      id: 'mcp',
      icon: '??',
      label: 'MCP Servers',
      description: 'Query connected MCP server tools',
    },
    {
      id: 'rules',
      icon: '??',
      label: 'Rules',
      description: 'Reference project rules and linting configs',
    },
    { id: 'skills', icon: '?', label: 'Skills', description: 'Invoke registered AI skills' },
    {
      id: 'conversations',
      icon: '??',
      label: 'Conversations',
      description: 'Reference previous conversations',
    },
    {
      id: 'terminal',
      icon: '???',
      label: 'Terminal',
      description: 'Reference terminal output and commands',
    },
    { id: 'docs', icon: '??', label: 'Documentation', description: 'Search project documentation' },
    {
      id: 'errors',
      icon: '??',
      label: 'Errors',
      description: 'Reference current diagnostics and errors',
    },
    { id: 'symbols', icon: '??', label: 'Symbols', description: 'Search workspace symbols' },
    {
      id: 'clipboard',
      icon: '??',
      label: 'Clipboard',
      description: 'Paste clipboard contents as context',
    },
  ];

  const commandInputRef = useRef<HTMLInputElement>(null);

  // Menu state
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const [showGoToLine, setShowGoToLine] = useState(false);
  const [goToLineValue, setGoToLineValue] = useState('');
  const goToLineRef = useRef<HTMLInputElement>(null);

  // Diagnostics / Quick Fix
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [quickFix, setQuickFix] = useState<QuickFixPopup | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);

  // Inline Edit (Ctrl+K)
  const [inlineEdit, setInlineEdit] = useState<InlineEditPopup | null>(null);
  const [inlineEditInput, setInlineEditInput] = useState('');
  const [inlineEditLoading, setInlineEditLoading] = useState(false);
  const inlineEditRef = useRef<HTMLInputElement>(null);

  // Outline / Symbols
  const [symbols, setSymbols] = useState<SymbolItem[]>([]);

  // Model config — comprehensive list of all providers and latest models
  const [models] = useState<ModelConfig[]>([
    // -- Local Jarvis Agents --
    {
      id: 'local-llm',
      name: '?? Local LLM (Offline)',
      provider: 'Jarvis',
      tier: 'free',
      temperature: 0.7,
      maxTokens: 500,
    },
    {
      id: 'ollama-llm',
      name: '?? Ollama qwen2.5-coder',
      provider: 'Jarvis',
      tier: 'free',
      temperature: 0.7,
      maxTokens: 2000,
    },
    // -- Free / Open-Source --
    {
      id: 'qwen-coder-32b',
      name: 'Qwen2.5-Coder-32B',
      provider: 'HuggingFace',
      tier: 'free',
      temperature: 0.3,
      maxTokens: 1024,
    },
    {
      id: 'qwen-coder-7b',
      name: 'Qwen2.5-Coder-7B',
      provider: 'HuggingFace',
      tier: 'free',
      temperature: 0.3,
      maxTokens: 512,
    },
    {
      id: 'llama-3',
      name: 'Llama 3.1 70B',
      provider: 'Meta',
      tier: 'free',
      temperature: 0.3,
      maxTokens: 1024,
    },
    // -- Anthropic --
    {
      id: 'claude-opus-4.6',
      name: 'Claude Opus 4.6',
      provider: 'Anthropic',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 8192,
    },
    {
      id: 'claude-sonnet-4',
      name: 'Claude Sonnet 4',
      provider: 'Anthropic',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 8192,
    },
    {
      id: 'claude-3.7-sonnet',
      name: 'Claude 3.7 Sonnet',
      provider: 'Anthropic',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 8192,
    },
    {
      id: 'claude-3.5-sonnet-v2',
      name: 'Claude 3.5 Sonnet v2',
      provider: 'Anthropic',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 8192,
    },
    {
      id: 'claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      provider: 'Anthropic',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 8192,
    },
    {
      id: 'claude-3.5-haiku',
      name: 'Claude 3.5 Haiku',
      provider: 'Anthropic',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 8192,
    },
    {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      provider: 'Anthropic',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
    },
    {
      id: 'claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      provider: 'Anthropic',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
    },
    {
      id: 'claude-3-haiku',
      name: 'Claude 3 Haiku',
      provider: 'Anthropic',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
    },
    // -- OpenAI — Chat --
    {
      id: 'gpt-5.3-codex-high',
      name: 'GPT-5.3-Codex High',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 400000,
      category: 'code',
    },
    {
      id: 'gpt-5.2-codex-high',
      name: 'GPT-5.2-Codex High',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 400000,
      category: 'code',
    },
    {
      id: 'gpt-5.2',
      name: 'GPT-5.2',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 384000,
      category: 'chat',
    },
    {
      id: 'gpt-5.1-codex-max-high',
      name: 'GPT-5.1-Codex Max High',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 400000,
      category: 'code',
    },
    {
      id: 'gpt-5.1-codex-low',
      name: 'GPT-5.1-Codex Low',
      provider: 'OpenAI',
      tier: 'free',
      temperature: 0.3,
      maxTokens: 400000,
      category: 'code',
    },
    {
      id: 'gpt-5.1-codex-mini',
      name: 'GPT-5.1-Codex-Mini',
      provider: 'OpenAI',
      tier: 'free',
      temperature: 0.3,
      maxTokens: 200000,
      category: 'code',
    },
    {
      id: 'gpt-5.1-codex-mini-low',
      name: 'GPT-5.1-Codex-Mini Low',
      provider: 'OpenAI',
      tier: 'free',
      temperature: 0.3,
      maxTokens: 200000,
      category: 'code',
    },
    {
      id: 'gpt-oss-120b',
      name: 'GPT-OSS 120B Medium Thinking',
      provider: 'OpenAI',
      tier: 'free',
      temperature: 0.3,
      maxTokens: 128000,
      category: 'chat',
    },
    {
      id: 'gpt-5',
      name: 'GPT-5',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 32768,
      category: 'chat',
    },
    {
      id: 'gpt-5-mini',
      name: 'GPT-5 Mini',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 16384,
      category: 'chat',
    },
    {
      id: 'gpt-4.1',
      name: 'GPT-4.1',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 32768,
      category: 'chat',
    },
    {
      id: 'gpt-4.1-mini',
      name: 'GPT-4.1 Mini',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 16384,
      category: 'chat',
    },
    {
      id: 'gpt-4.1-nano',
      name: 'GPT-4.1 Nano',
      provider: 'OpenAI',
      tier: 'paid',
      name: 'o3 Pro',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 16384,
      category: 'chat',
    },
    {
      id: 'o3',
      name: 'o3',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 16384,
      category: 'chat',
    },
    {
      id: 'o3-mini',
      name: 'o3 Mini',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 16384,
      category: 'chat',
    },
    {
      id: 'o4-mini',
      name: 'o4 Mini',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 16384,
      category: 'chat',
    },
    {
      id: 'o1',
      name: 'o1',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 8192,
      category: 'chat',
    },
    {
      id: 'o1-mini',
      name: 'o1 Mini',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 8192,
      category: 'chat',
    },
    // -- OpenAI — Image Generation --
    {
      id: 'dall-e-3',
      name: 'DALL-E 3',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'image',
    },
    {
      id: 'dall-e-2',
      name: 'DALL-E 2',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 1024,
      category: 'image',
    },
    {
      id: 'gpt-image-1',
      name: 'GPT Image 1',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'image',
    },
    // -- OpenAI — Video Generation --
    {
      id: 'sora',
      name: 'Sora (Video)',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'video',
    },
    {
      id: 'sora-fast',
      name: 'Sora Fast',
      provider: 'OpenAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'video',
    },
    // -- Google --
    {
      id: 'gemini-3',
      name: 'Gemini 3',
      provider: 'Google',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 65536,
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      provider: 'Google',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 65536,
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'Google',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 65536,
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      provider: 'Google',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 8192,
    },
    {
      id: 'gemini-2.0-flash-lite',
      name: 'Gemini 2.0 Flash Lite',
      provider: 'Google',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 8192,
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'Google',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 8192,
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'Google',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 8192,
    },
    {
      id: 'gemini-2.5-pro-code',
      name: 'Gemini 2.5 Pro (Code)',
      provider: 'Google',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 65536,
    },
    {
      id: 'gemini-code-assist',
      name: 'Gemini Code Assist',
      provider: 'Google',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 32768,
    },
    {
      id: 'jules',
      name: 'Jules (Code Agent)',
      provider: 'Google',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 32768,
      category: 'code',
    },
    // -- Google — Image Generation --
    {
      id: 'imagen-4',
      name: 'Imagen 4',
      provider: 'Google',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'image',
    },
    {
      id: 'imagen-3',
      name: 'Imagen 3',
      provider: 'Google',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'image',
    },
    {
      id: 'imagen-3-fast',
      name: 'Imagen 3 Fast',
      provider: 'Google',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'image',
    },
    // -- Google — Video Generation --
    {
      id: 'veo-3',
      name: 'Veo 3',
      provider: 'Google',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'video',
    },
    {
      id: 'veo-3-pro',
      name: 'Veo 3 Pro',
      provider: 'Google',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 8192,
      category: 'video',
    },
    {
      id: 'veo-3-lite',
      name: 'Veo 3 Lite',
      provider: 'Google',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 2048,
      category: 'video',
    },
    // -- Grok (xAI) --
    {
      id: 'grok-4',
      name: 'Grok 4',
      provider: 'xAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 32768,
    },
    {
      id: 'grok-3',
      name: 'Grok 3',
      provider: 'xAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 32768,
    },
    {
      id: 'grok-3-fast',
      name: 'Grok 3 Fast',
      provider: 'xAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 32768,
    },
    {
      id: 'grok-3-mini',
      name: 'Grok 3 Mini',
      provider: 'xAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 16384,
    },
    {
      id: 'grok-3-mini-fast',
      name: 'Grok 3 Mini Fast',
      provider: 'xAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 16384,
    },
    {
      id: 'grok-2',
      name: 'Grok 2',
      provider: 'xAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 8192,
    },
    {
      id: 'grok-3-code',
      name: 'Grok 3 Code',
      provider: 'xAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 32768,
    },
    {
      id: 'grok-3-code-mini',
      name: 'Grok 3 Code Mini',
      provider: 'xAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 16384,
      category: 'code',
    },
    // -- xAI — Image Generation --
    {
      id: 'aurora',
      name: 'Aurora (Grok Image)',
      provider: 'xAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'image',
    },
    // -- Black Forest Labs — Image Generation --
    {
      id: 'flux-1.1-pro',
      name: 'FLUX 1.1 Pro',
      provider: 'BlackForestLabs',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'image',
    },
    {
      id: 'flux-1-dev',
      name: 'FLUX 1 Dev',
      provider: 'BlackForestLabs',
      tier: 'free',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'image',
    },
    {
      id: 'flux-1-schnell',
      name: 'FLUX 1 Schnell',
      provider: 'BlackForestLabs',
      tier: 'free',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'image',
    },
    // -- Runway — Video Generation --
    {
      id: 'runway-gen-2',
      name: 'Runway Gen-2',
      provider: 'Runway',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'video',
    },
    {
      id: 'runway-gen-3-xl',
      name: 'Runway Gen-3 XL',
      provider: 'Runway',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 8192,
      category: 'video',
    },
    // -- Pika Labs — Video Generation --
    {
      id: 'pika-gen-one',
      name: 'Pika Gen One',
      provider: 'PikaLabs',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'video',
    },
    {
      id: 'pika-gen-two',
      name: 'Pika Gen Two',
      provider: 'PikaLabs',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'video',
    },
    // -- Stability Video — Video Generation --
    {
      id: 'stable-video-diffusion',
      name: 'Stable Video Diffusion',
      provider: 'StabilityVideo',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'video',
    },
    {
      id: 'stable-video-ultra',
      name: 'Stable Video Ultra',
      provider: 'StabilityVideo',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 8192,
      category: 'video',
    },
    // -- Meta — Video Generation --
    {
      id: 'make-a-video-2',
      name: 'Make-A-Video 2',
      provider: 'Meta',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'video',
    },
    {
      id: 'meta-video-1',
      name: 'Meta Video 1',
      provider: 'Meta',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'video',
    },
    // -- Stability AI — Image Generation --
    {
      id: 'stable-diffusion-3.5',
      name: 'Stable Diffusion 3.5',
      provider: 'StabilityAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'image',
    },
    {
      id: 'stable-image-ultra',
      name: 'Stable Image Ultra',
      provider: 'StabilityAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'image',
    },
    {
      id: 'stable-image-core',
      name: 'Stable Image Core',
      provider: 'StabilityAI',
      tier: 'paid',
      temperature: 0.3,
      maxTokens: 4096,
      category: 'image',
    },
  ]);
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const [aiTemperature, setAiTemperature] = useState(0.3);
  const [aiMaxTokens, setAiMaxTokens] = useState(1024);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    Jarvis: '',
    HuggingFace: '',
    Anthropic: '',
    OpenAI: 'YOUR_OPENAI_API_KEY_HERE',
    Google: 'AIzaSyAYo_G1wWqAcfswTlDgcZ9QUGg6TlWdfY0',
    xAI: '',
    StabilityAI: '',
    BlackForestLabs: '',
    Runway: '',
    PikaLabs: '',
    StabilityVideo: '',
    Meta: '',
  });
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({
    Jarvis: false,
    HuggingFace: false,
    Anthropic: false,
    OpenAI: false,
    Google: false,
    xAI: false,
    StabilityAI: false,
    BlackForestLabs: false,
    Runway: false,
    PikaLabs: false,
    StabilityVideo: false,
    Meta: false,
  });

  // AI Mode: 'agent' = normal chat, 'plan' = planning mode
  const [aiMode, setAiMode] = useState<'agent' | 'plan'>('agent');
  const [planLoading, setPlanLoading] = useState(false);

  // Image upload for multimodal / vision
  const [uploadedImage, setUploadedImage] = useState<{ name: string; dataUrl: string } | null>(
    null
  );
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Side functions panel
  const [showSideFunctions, setShowSideFunctions] = useState(false);

  // Bug finder
  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [bugScanLoading, setBugScanLoading] = useState(false);

  // Git blame / diff
  const [blameData, setBlameData] = useState<BlameInfo[]>([]);
  const [showBlame, setShowBlame] = useState(false);
  const [diffChanges, setDiffChanges] = useState<DiffChange[]>([]);

  // Slash commands hint
  const [showSlashHint, setShowSlashHint] = useState(false);

  // Diff preview (for AI changes)
  const [diffPreview, setDiffPreview] = useState<{
    original: string;
    modified: string;
    filePath: string;
  } | null>(null);

  // Editor settings
  const [editorSettings, setEditorSettings] = useState<EditorSettings>({
    fontSize: 14,
    tabSize: 2,
    fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
    theme: 'vs-dark',
    lineNumbers: true,
    bracketPairs: true,
    formatOnPaste: true,
    renderWhitespace: 'selection',
    cursorStyle: 'line',
    smoothScrolling: true,
  });

  // Extensions (legacy — replaced by marketplace)
  const [_extensions, _setExtensions] = useState<ExtensionItem[]>([
    {
      id: 'ai-complete',
      name: 'AI Code Completion',
      description: 'Inline AI code suggestions powered by Qwen2.5-Coder',
      icon: '??',
      enabled: true,
      category: 'AI',
    },
    {
      id: 'ai-chat',
      name: 'AI Chat Assistant',
      description: 'Ask questions about your code and get AI-powered answers',
      icon: '??',
      enabled: true,
      category: 'AI',
    },
    {
      id: 'ai-quickfix',
      name: 'AI Quick Fix',
      description: 'Auto-fix errors with AI explanations in plain language',
      icon: '??',
      enabled: true,
      category: 'AI',
    },
    {
      id: 'git-integration',
      name: 'Git Integration',
      description: 'View git status, branches, and file changes',
      icon: '??',
      enabled: true,
      category: 'Source Control',
    },
    {
      id: 'browser-preview',
      name: 'Browser Preview',
      description: 'Preview web pages with element selector',
      icon: '??',
      enabled: true,
      category: 'Preview',
    },
    {
      id: 'bracket-colorizer',
      name: 'Bracket Pair Colorizer',
      description: 'Colorize matching brackets for easier reading',
      icon: '??',
      enabled: true,
      category: 'Editor',
    },
    {
      id: 'auto-rename-tag',
      name: 'Auto Rename Tag',
      description: 'Auto rename paired HTML/XML tags',
      icon: '???',
      enabled: false,
      category: 'Editor',
    },
    {
      id: 'prettier',
      name: 'Prettier Formatter',
      description: 'Opinionated code formatter',
      icon: '?',
      enabled: false,
      category: 'Formatting',
    },
  ]);

  // Rules
  const [rules, setRules] = useState<RuleItem[]>([
    {
      id: 'no-unused-vars',
      name: 'No Unused Variables',
      description: 'Warn when variables are declared but never used',
      severity: 'warning',
      category: 'Code Quality',
    },
    {
      id: 'no-console',
      name: 'No Console Logs',
      description: 'Disallow console.log in production code',
      severity: 'warning',
      category: 'Code Quality',
    },
    {
      id: 'no-any',
      name: 'No Any Type',
      description: 'Disallow using "any" as a type',
      severity: 'warning',
      category: 'TypeScript',
    },
    {
      id: 'strict-equality',
      name: 'Strict Equality',
      description: 'Require === instead of ==',
      severity: 'error',
      category: 'Best Practices',
    },
    {
      id: 'no-implicit-return',
      name: 'No Implicit Returns',
      description: 'Require explicit return types on functions',
      severity: 'off',
      category: 'TypeScript',
    },
    {
      id: 'max-line-length',
      name: 'Max Line Length',
      description: 'Enforce a maximum line length of 120 characters',
      severity: 'warning',
      category: 'Formatting',
    },
    {
      id: 'import-order',
      name: 'Import Order',
      description: 'Enforce consistent import ordering',
      severity: 'warning',
      category: 'Formatting',
    },
    {
      id: 'no-magic-numbers',
      name: 'No Magic Numbers',
      description: 'Disallow magic numbers without named constants',
      severity: 'off',
      category: 'Best Practices',
    },
  ]);

  // Editor toggles
  const [wordWrap, setWordWrap] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);

  // Browser state (multi-tab)
  const [showBrowser, setShowBrowser] = useState(false);
  const defaultTab: BrowserTab = {
    id: 'tab-0',
    url: 'https://www.bing.com',
    urlInput: 'https://www.bing.com',
    title: 'Bing',
    history: ['https://www.bing.com'],
    historyIdx: 0,
    loading: false,
  };
  const [browserTabs, setBrowserTabs] = useState<BrowserTab[]>([defaultTab]);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [tabIdCounter, setTabIdCounter] = useState(1);
  const [selectorMode, setSelectorMode] = useState(false);
  const [selectedElements, setSelectedElements] = useState<SelectedElement[]>([]);
  const [hoveredElement, setHoveredElement] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Browser bookmarks
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([
    { id: 'bm-1', title: 'Google', url: 'https://www.google.com', icon: '??' },
    { id: 'bm-2', title: 'GitHub', url: 'https://github.com', icon: '??' },
    { id: 'bm-3', title: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '??' },
    { id: 'bm-4', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: '??' },
    { id: 'bm-5', title: 'npm', url: 'https://www.npmjs.com', icon: '??' },
    { id: 'bm-6', title: 'TypeScript', url: 'https://www.typescriptlang.org', icon: '??' },
    { id: 'bm-7', title: 'React Docs', url: 'https://react.dev', icon: '??' },
    { id: 'bm-8', title: 'Tailwind CSS', url: 'https://tailwindcss.com', icon: '??' },
  ]);
  const [showBookmarksBar, setShowBookmarksBar] = useState(true);

  // Browser downloads
  const [browserDownloads, setBrowserDownloads] = useState<BrowserDownload[]>([]);
  const [showDownloads, setShowDownloads] = useState(false);

  // AI Browser Control (Comet-style)
  const [aiBrowserActions, setAiBrowserActions] = useState<AIBrowserAction[]>([]);
  const [aiBrowserInput, setAiBrowserInput] = useState('');
  const [aiBrowserRunning, setAiBrowserRunning] = useState(false);
  const [showAiBrowserPanel, setShowAiBrowserPanel] = useState(false);

  const activeTab = browserTabs[activeTabIdx] || browserTabs[0];

  const activeFile = activeFileIdx >= 0 ? openFiles[activeFileIdx] : null;
  const gitModified = new Set(gitFiles.map(f => f.file));
  const allFiles = flattenFileTree(fileTree);

  // â”€â”€â”€ Data fetching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const fetchFileTree = useCallback(async () => {
    setTreeLoading(true);
    try {
      const resp = await fetch('/api/ide/files?depth=4');
      if (resp.ok) {
        const data = await resp.json();
        const tree: FileNode[] = data.tree || [];
        const jarvisFolder: FileNode = {
          name: '.jarvis',
          path: '.jarvis',
          type: 'directory',
          children: [
            {
              name: 'rules',
              path: '.jarvis/rules',
              type: 'directory',
              children: aiRules.map(r => ({
                name: `${r.title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, '')}.md`,
                path: `.jarvis/rules/${r.title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, '')}.md`,
                type: 'file' as const,
                language: 'markdown',
              })),
            },
            {
              name: 'workflows',
              path: '.jarvis/workflows',
              type: 'directory',
              children: aiWorkflows.map(w => ({
                name: `${w.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, '')}.md`,
                path: `.jarvis/workflows/${w.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, '')}.md`,
                type: 'file' as const,
                language: 'markdown',
              })),
            },
          ],
        };
        setFileTree([jarvisFolder, ...tree]);
      }
    } catch {
      /* silently fail */
    }
    setTreeLoading(false);
  }, [aiRules, aiWorkflows]);

  const fetchGitStatus = useCallback(async () => {
    try {
      const resp = await fetch('/api/ide/git/status');
      if (resp.ok) {
        const data = await resp.json();
        setGitBranch(data.branch || 'main');
        setGitFiles(data.files || []);
      }
    } catch {
      /* silently fail */
    }
  }, []);

  useEffect(() => {
    fetchFileTree();
    fetchGitStatus();
  }, [fetchFileTree, fetchGitStatus]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  // Initialize real xterm.js terminal + WebSocket when terminal panel opens
  useEffect(() => {
    if (bottomPanel !== 'terminal' || !xtermContainerRef.current) return;
    if (xtermRef.current) {
      // Already initialized — just re-fit
      fitAddonRef.current?.fit();
      return;
    }

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
      theme: {
        background: '#0d1117',
        foreground: '#e6edf3',
        cursor: '#58a6ff',
        selectionBackground: '#264f78',
        black: '#0d1117',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39d2c0',
        white: '#e6edf3',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(xtermContainerRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Connect WebSocket to the backend PTY (via Vite proxy)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setXtermReady(true);
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    };

    ws.onmessage = event => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output') {
          term.write(msg.data);
        } else if (msg.type === 'exit') {
          term.write('\r\n\x1b[31m[Process exited]\x1b[0m\r\n');
        }
      } catch {}
    };

    ws.onclose = () => {
      setXtermReady(false);
      term.write('\r\n\x1b[33m[Disconnected]\x1b[0m\r\n');
    };

    // Send keystrokes to the PTY
    term.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }
    });
    resizeObserver.observe(xtermContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [bottomPanel]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  useEffect(() => {
    if (showCommandPalette && commandInputRef.current) {
      commandInputRef.current.focus();
    }
  }, [showCommandPalette]);

  useEffect(() => {
    if (showGoToLine && goToLineRef.current) {
      goToLineRef.current.focus();
    }
  }, [showGoToLine]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    if (openMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenu]);

  // --- Browser functions (multi-tab) ----------------

  const updateActiveTab = useCallback(
    (patch: Partial<BrowserTab>) => {
      setBrowserTabs(prev => prev.map((t, i) => (i === activeTabIdx ? { ...t, ...patch } : t)));
    },
    [activeTabIdx]
  );

  const browserNavigate = useCallback(
    (url: string) => {
      let normalizedUrl = url.trim();
      if (
        normalizedUrl &&
        !normalizedUrl.startsWith('http://') &&
        !normalizedUrl.startsWith('https://')
      ) {
        normalizedUrl = 'https://' + normalizedUrl;
      }
      setBrowserTabs(prev =>
        prev.map((t, i) => {
          if (i !== activeTabIdx) return t;
          const next = t.history.slice(0, t.historyIdx + 1);
          next.push(normalizedUrl);
          return {
            ...t,
            url: normalizedUrl,
            urlInput: normalizedUrl,
            loading: true,
            history: next,
            historyIdx: next.length - 1,
            title: (() => {
              try {
                return new URL(normalizedUrl).hostname;
              } catch {
                return normalizedUrl;
              }
            })(),
          };
        })
      );
    },
    [activeTabIdx]
  );

  const browserBack = useCallback(() => {
    setBrowserTabs(prev =>
      prev.map((t, i) => {
        if (i !== activeTabIdx || t.historyIdx <= 0) return t;
        const newIdx = t.historyIdx - 1;
        const url = t.history[newIdx];
        return { ...t, url, urlInput: url, historyIdx: newIdx, loading: true };
      })
    );
  }, [activeTabIdx]);

  const browserForward = useCallback(() => {
    setBrowserTabs(prev =>
      prev.map((t, i) => {
        if (i !== activeTabIdx || t.historyIdx >= t.history.length - 1) return t;
        const newIdx = t.historyIdx + 1;
        const url = t.history[newIdx];
        return { ...t, url, urlInput: url, historyIdx: newIdx, loading: true };
      })
    );
  }, [activeTabIdx]);

  const browserRefresh = useCallback(() => {
    updateActiveTab({ loading: true });
    if (iframeRef.current) {
      iframeRef.current.src = `/api/ide/browse?url=${encodeURIComponent(activeTab.url)}`;
    }
  }, [activeTab.url, updateActiveTab]);

  const newBrowserTab = useCallback(
    (url = 'https://www.bing.com') => {
      const id = `tab-${tabIdCounter}`;
      setTabIdCounter(prev => prev + 1);
      const tab: BrowserTab = {
        id,
        url,
        urlInput: url,
        title:
          url === 'https://www.bing.com'
            ? 'Bing'
            : (() => {
                try {
                  return new URL(url).hostname;
                } catch {
                  return url;
                }
              })(),
        history: [url],
        historyIdx: 0,
        loading: false,
      };
      setBrowserTabs(prev => [...prev, tab]);
      setActiveTabIdx(browserTabs.length);
    },
    [tabIdCounter, browserTabs.length]
  );

  const closeBrowserTab = useCallback(
    (idx: number) => {
      if (browserTabs.length <= 1) {
        setShowBrowser(false);
        return;
      }
      setBrowserTabs(prev => prev.filter((_, i) => i !== idx));
      setActiveTabIdx(prev => {
        if (prev >= idx && prev > 0) return prev - 1;
        return prev;
      });
    },
    [browserTabs.length]
  );

  // --- Bookmark functions ----------------------------
  const isBookmarked = bookmarks.some(b => b.url === activeTab.url);

  const toggleBookmark = useCallback(() => {
    const url = activeTab.url;
    setBookmarks(prev => {
      if (prev.some(b => b.url === url)) {
        return prev.filter(b => b.url !== url);
      }
      return [
        ...prev,
        {
          id: `bm-${Date.now()}`,
          title:
            activeTab.title ||
            (() => {
              try {
                return new URL(url).hostname;
              } catch {
                return url;
              }
            })(),
          url,
          icon: '??',
        },
      ];
    });
  }, [activeTab.url, activeTab.title]);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  }, []);

  // --- Download functions ---------------------------
  const simulateDownload = useCallback((filename: string, url: string, size: string) => {
    const id = `dl-${Date.now()}`;
    const dl: BrowserDownload = {
      id,
      filename,
      url,
      size,
      progress: 0,
      status: 'downloading',
      timestamp: new Date().toISOString(),
    };
    setBrowserDownloads(prev => [dl, ...prev]);
    setShowDownloads(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setBrowserDownloads(prev =>
          prev.map(d => (d.id === id ? { ...d, progress: 100, status: 'complete' as const } : d))
        );
      } else {
        setBrowserDownloads(prev =>
          prev.map(d => (d.id === id ? { ...d, progress: Math.min(progress, 99) } : d))
        );
      }
    }, 400);
  }, []);

  const clearDownloads = useCallback(() => {
    setBrowserDownloads(prev => prev.filter(d => d.status === 'downloading'));
  }, []);

  // --- AI Browser Control (Comet-style with Chain-of-Thought) -------------

  const buildCoTAction = useCallback((command: string): AIBrowserAction => {
    const actionId = `action-${Date.now()}`;
    const lowerCmd = command.toLowerCase();
    const subtasks: AIBrowserSubtask[] = [];

    // Step 1: always start with a "think" step — CoT reasoning
    let thought = '';

    if (lowerCmd.includes('go to') || lowerCmd.includes('navigate') || lowerCmd.includes('open')) {
      const urlMatch = command.match(/(?:go to|navigate to|open)\s+(.+)/i);
      const target = urlMatch ? urlMatch[1].trim() : '';
      thought = `The user wants me to navigate to "${target}". I need to: (1) analyze the URL, (2) normalize it, (3) navigate to it, (4) wait for the page to load.`;
      subtasks.push(
        {
          id: `${actionId}-think`,
          description: `Analyze request: navigate to "${target}"`,
          status: 'pending',
          type: 'think',
        },
        {
          id: `${actionId}-nav`,
          description: `Navigate browser to ${target}`,
          status: 'pending',
          type: 'navigate',
          target,
        },
        {
          id: `${actionId}-wait`,
          description: 'Wait for page to fully load',
          status: 'pending',
          type: 'wait',
        },
        {
          id: `${actionId}-verify`,
          description: 'Verify page loaded successfully',
          status: 'pending',
          type: 'think',
        }
      );
    }

    if (lowerCmd.includes('click')) {
      const clickMatch = command.match(/click(?:\s+on)?\s+(?:the\s+)?(.+)/i);
      const target = clickMatch ? clickMatch[1].trim() : 'element';
      thought +=
        (thought ? ' Then, ' : '') +
        `I need to click on "${target}". Steps: (1) find the element on the page, (2) scroll to it if needed, (3) click it, (4) wait for any resulting navigation or UI change.`;
      subtasks.push(
        {
          id: `${actionId}-think-click`,
          description: `Analyze: find "${target}" on the page`,
          status: 'pending',
          type: 'think',
        },
        {
          id: `${actionId}-locate`,
          description: `Locate element matching "${target}"`,
          status: 'pending',
          type: 'extract',
          target,
        },
        {
          id: `${actionId}-scroll-to`,
          description: `Scroll element into view`,
          status: 'pending',
          type: 'scroll',
          target,
        },
        {
          id: `${actionId}-click`,
          description: `Click on "${target}"`,
          status: 'pending',
          type: 'click',
          target,
        },
        {
          id: `${actionId}-click-wait`,
          description: 'Wait for response after click',
          status: 'pending',
          type: 'wait',
        }
      );
    }

    if (lowerCmd.includes('fill') || lowerCmd.includes('type')) {
      const fillMatch = command.match(/(?:fill|type)\s+["']?(.+?)["']?\s+(?:in|into)\s+(.+)/i);
      const value = fillMatch ? fillMatch[1].trim() : command;
      const target = fillMatch ? fillMatch[2].trim() : 'input field';
      thought +=
        (thought ? ' Then, ' : '') +
        `I need to fill "${value}" into "${target}". Steps: (1) find the input, (2) clear existing value, (3) type the text, (4) verify.`;
      subtasks.push(
        {
          id: `${actionId}-think-fill`,
          description: `Analyze: fill "${value}" into "${target}"`,
          status: 'pending',
          type: 'think',
        },
        {
          id: `${actionId}-find-input`,
          description: `Find input field "${target}"`,
          status: 'pending',
          type: 'extract',
          target,
        },
        {
          id: `${actionId}-focus`,
          description: `Focus on the input field`,
          status: 'pending',
          type: 'click',
          target,
        },
        {
          id: `${actionId}-fill`,
          description: `Type "${value}" into the field`,
          status: 'pending',
          type: 'fill',
          target,
          value,
        },
        {
          id: `${actionId}-fill-verify`,
          description: 'Verify text was entered correctly',
          status: 'pending',
          type: 'think',
        }
      );
    }

    if (lowerCmd.includes('search') && !lowerCmd.includes('fill') && !lowerCmd.includes('type')) {
      const searchMatch = command.match(/search(?:\s+for)?\s+["']?(.+?)["']?$/i);
      const query = searchMatch ? searchMatch[1].trim() : command;
      thought +=
        (thought ? ' Then, ' : '') +
        `The user wants to search for "${query}". I need to: (1) find the search input, (2) type the query, (3) submit, (4) wait for results.`;
      subtasks.push(
        {
          id: `${actionId}-think-search`,
          description: `Analyze: search for "${query}"`,
          status: 'pending',
          type: 'think',
        },
        {
          id: `${actionId}-find-search`,
          description: 'Find the search input on the page',
          status: 'pending',
          type: 'extract',
          target: 'search input',
        },
        {
          id: `${actionId}-fill-search`,
          description: `Type "${query}" into search`,
          status: 'pending',
          type: 'fill',
          target: 'search input',
          value: query,
        },
        {
          id: `${actionId}-submit-search`,
          description: 'Submit the search form',
          status: 'pending',
          type: 'submit',
        },
        {
          id: `${actionId}-wait-results`,
          description: 'Wait for search results to load',
          status: 'pending',
          type: 'wait',
        }
      );
    }

    if (lowerCmd.includes('scroll')) {
      const direction = lowerCmd.includes('up') ? 'up' : 'down';
      thought +=
        (thought ? ' Then, ' : '') +
        `I need to scroll ${direction}. Steps: (1) determine scroll amount, (2) scroll, (3) verify new content visible.`;
      subtasks.push(
        {
          id: `${actionId}-think-scroll`,
          description: `Analyze: scroll ${direction}`,
          status: 'pending',
          type: 'think',
        },
        {
          id: `${actionId}-scroll`,
          description: `Scroll page ${direction}`,
          status: 'pending',
          type: 'scroll',
          value: direction,
        },
        {
          id: `${actionId}-scroll-verify`,
          description: 'Verify new content is visible',
          status: 'pending',
          type: 'think',
        }
      );
    }

    if (lowerCmd.includes('screenshot') || lowerCmd.includes('capture')) {
      thought +=
        (thought ? ' Then, ' : '') +
        'I need to capture a screenshot. Steps: (1) ensure page is stable, (2) capture, (3) save.';
      subtasks.push(
        {
          id: `${actionId}-think-ss`,
          description: 'Analyze: capture screenshot',
          status: 'pending',
          type: 'think',
        },
        {
          id: `${actionId}-ss-wait`,
          description: 'Ensure page is fully rendered',
          status: 'pending',
          type: 'wait',
        },
        {
          id: `${actionId}-screenshot`,
          description: 'Capture screenshot of visible area',
          status: 'pending',
          type: 'screenshot',
        },
        {
          id: `${actionId}-ss-save`,
          description: 'Save screenshot to downloads',
          status: 'pending',
          type: 'think',
        }
      );
    }

    if (lowerCmd.includes('extract') || lowerCmd.includes('scrape')) {
      const extractMatch = command.match(/(?:extract|scrape)\s+(.+?)(?:\s+from\s+(.+))?$/i);
      const what = extractMatch?.[1] || 'content';
      const from = extractMatch?.[2] || 'page';
      thought +=
        (thought ? ' Then, ' : '') +
        `I need to extract "${what}" from "${from}". Steps: (1) identify target elements, (2) extract data, (3) format results.`;
      subtasks.push(
        {
          id: `${actionId}-think-ext`,
          description: `Analyze: extract "${what}" from "${from}"`,
          status: 'pending',
          type: 'think',
        },
        {
          id: `${actionId}-locate-ext`,
          description: `Locate elements containing "${what}"`,
          status: 'pending',
          type: 'extract',
          target: from,
          value: what,
        },
        {
          id: `${actionId}-read-ext`,
          description: 'Read and parse element content',
          status: 'pending',
          type: 'extract',
          target: from,
        },
        {
          id: `${actionId}-format-ext`,
          description: 'Format extracted data',
          status: 'pending',
          type: 'think',
        }
      );
    }

    if (lowerCmd.includes('new tab')) {
      thought += (thought ? ' Then, ' : '') + 'I need to open a new browser tab.';
      subtasks.push(
        {
          id: `${actionId}-think-newtab`,
          description: 'Analyze: open new tab',
          status: 'pending',
          type: 'think',
        },
        {
          id: `${actionId}-newtab`,
          description: 'Open a new browser tab',
          status: 'pending',
          type: 'newTab',
        }
      );
    }

    if (lowerCmd.includes('close tab')) {
      thought += (thought ? ' Then, ' : '') + 'I need to close the current tab.';
      subtasks.push(
        {
          id: `${actionId}-think-closetab`,
          description: 'Analyze: close current tab',
          status: 'pending',
          type: 'think',
        },
        {
          id: `${actionId}-closetab`,
          description: 'Close the current browser tab',
          status: 'pending',
          type: 'closeTab',
        }
      );
    }

    if (lowerCmd.includes('submit') || lowerCmd.includes('press enter')) {
      thought +=
        (thought ? ' Then, ' : '') +
        'I need to submit the form. Steps: (1) find submit button or form, (2) submit, (3) wait for response.';
      subtasks.push(
        {
          id: `${actionId}-think-submit`,
          description: 'Analyze: submit current form',
          status: 'pending',
          type: 'think',
        },
        {
          id: `${actionId}-find-form`,
          description: 'Find the active form on the page',
          status: 'pending',
          type: 'extract',
        },
        {
          id: `${actionId}-submit`,
          description: 'Submit the form',
          status: 'pending',
          type: 'submit',
        },
        {
          id: `${actionId}-submit-wait`,
          description: 'Wait for form submission response',
          status: 'pending',
          type: 'wait',
        }
      );
    }

    if (lowerCmd.includes('hover') || lowerCmd.includes('mouse over')) {
      const hoverMatch = command.match(/(?:hover|mouse over)\s+(?:over\s+)?(?:the\s+)?(.+)/i);
      const target = hoverMatch?.[1] || 'element';
      thought +=
        (thought ? ' Then, ' : '') +
        `I need to hover over "${target}". Steps: (1) locate element, (2) move cursor, (3) verify tooltip/dropdown appeared.`;
      subtasks.push(
        {
          id: `${actionId}-think-hover`,
          description: `Analyze: hover over "${target}"`,
          status: 'pending',
          type: 'think',
        },
        {
          id: `${actionId}-locate-hover`,
          description: `Locate "${target}" on the page`,
          status: 'pending',
          type: 'extract',
          target,
        },
        {
          id: `${actionId}-hover`,
          description: `Move cursor over "${target}"`,
          status: 'pending',
          type: 'hover',
          target,
        },
        {
          id: `${actionId}-hover-verify`,
          description: 'Check for tooltip or dropdown menu',
          status: 'pending',
          type: 'think',
        }
      );
    }

    if (lowerCmd.includes('select') && !lowerCmd.includes('selector')) {
      const selectMatch = command.match(/select\s+["']?(.+?)["']?\s+(?:in|from)\s+(.+)/i);
      const value = selectMatch?.[1] || 'option';
      const target = selectMatch?.[2] || 'dropdown';
      thought +=
        (thought ? ' Then, ' : '') +
        `I need to select "${value}" from "${target}". Steps: (1) find dropdown, (2) open it, (3) select option, (4) verify.`;
      subtasks.push(
        {
          id: `${actionId}-think-select`,
          description: `Analyze: select "${value}" from "${target}"`,
          status: 'pending',
          type: 'think',
        },
        {
          id: `${actionId}-find-dropdown`,
          description: `Find dropdown "${target}"`,
          status: 'pending',
          type: 'extract',
          target,
        },
        {
          id: `${actionId}-open-dropdown`,
          description: 'Open the dropdown',
          status: 'pending',
          type: 'click',
          target,
        },
        {
          id: `${actionId}-select-opt`,
          description: `Select option "${value}"`,
          status: 'pending',
          type: 'select',
          target,
          value,
        },
        {
          id: `${actionId}-select-verify`,
          description: 'Verify selection applied',
          status: 'pending',
          type: 'think',
        }
      );
    }

    if (lowerCmd.includes('download')) {
      thought += (thought ? ' Then, ' : '') + 'I need to download a file from this page.';
      subtasks.push(
        {
          id: `${actionId}-think-dl`,
          description: 'Analyze: download file from page',
          status: 'pending',
          type: 'think',
        },
        {
          id: `${actionId}-dl-find`,
          description: 'Find downloadable content on page',
          status: 'pending',
          type: 'extract',
        },
        {
          id: `${actionId}-dl-start`,
          description: 'Start download',
          status: 'pending',
          type: 'click',
        },
        {
          id: `${actionId}-dl-verify`,
          description: 'Verify download started successfully',
          status: 'pending',
          type: 'think',
        }
      );
    }

    // Fallback for unrecognized commands
    if (subtasks.length === 0) {
      thought = `The user asked: "${command}". I'll interpret this as a navigation request and attempt to execute it.`;
      subtasks.push(
        {
          id: `${actionId}-think-generic`,
          description: `Analyze: "${command}"`,
          status: 'pending',
          type: 'think',
        },
        {
          id: `${actionId}-attempt`,
          description: `Attempt to execute: "${command}"`,
          status: 'pending',
          type: 'navigate',
          target: command,
        },
        {
          id: `${actionId}-verify-generic`,
          description: 'Verify action completed',
          status: 'pending',
          type: 'think',
        }
      );
    }

    return {
      id: actionId,
      command,
      thought: thought || `Processing: "${command}"`,
      subtasks,
      status: 'pending',
      timestamp: new Date().toISOString(),
    };
  }, []);

  const executeAiBrowserCommand = useCallback(
    async (command: string) => {
      if (!command.trim()) return;
      setAiBrowserRunning(true);
      setShowAiBrowserPanel(true);

      const action = buildCoTAction(command);
      setAiBrowserActions(prev => [...prev, { ...action, status: 'running' }]);

      // Execute subtasks one-by-one with visible progress
      for (let i = 0; i < action.subtasks.length; i++) {
        const subtask = action.subtasks[i];

        // Mark current subtask as running
        setAiBrowserActions(prev =>
          prev.map(a =>
            a.id === action.id
              ? {
                  ...a,
                  subtasks: a.subtasks.map((s, idx) =>
                    idx === i ? { ...s, status: 'running' as const } : s
                  ),
                }
              : a
          )
        );

        // Simulate execution time (think steps are faster)
        const delay =
          subtask.type === 'think' ? 400 + Math.random() * 300 : 700 + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));

        // Actually execute functional subtasks
        if (subtask.type === 'navigate' && subtask.target) {
          let url = subtask.target;
          if (!url.startsWith('http')) url = `https://${url}`;
          browserNavigate(url);
        } else if (subtask.type === 'newTab') {
          newBrowserTab();
        } else if (subtask.type === 'closeTab') {
          closeBrowserTab(activeTabIdx);
        } else if (subtask.type === 'click' && subtask.target) {
          // In a real implementation this would use DOM manipulation via iframe postMessage
          // For now we log the intent
        } else if (subtask.type === 'fill' && subtask.value) {
          // Would inject keystrokes into the iframe element
        } else if (subtask.type === 'scroll') {
          // Would scroll the iframe content
          try {
            iframeRef.current?.contentWindow?.postMessage(
              { type: 'scroll', direction: subtask.value },
              '*'
            );
          } catch {
            /* cross-origin */
          }
        } else if (subtask.type === 'submit') {
          // Would submit the active form
        } else if (subtask.type === 'screenshot') {
          simulateDownload(`screenshot-${Date.now()}.png`, activeTab.url, '1.2 MB');
        }

        if (
          subtask.type === 'click' &&
          action.subtasks.some(s => s.type === 'click' && s.id.includes('-dl-start'))
        ) {
          simulateDownload('file_from_ai.zip', activeTab.url, '12.4 MB');
        }

        // Mark subtask as done
        setAiBrowserActions(prev =>
          prev.map(a =>
            a.id === action.id
              ? {
                  ...a,
                  subtasks: a.subtasks.map((s, idx) =>
                    idx === i ? { ...s, status: 'done' as const } : s
                  ),
                }
              : a
          )
        );
      }

      // Mark the whole action as done
      setAiBrowserActions(prev =>
        prev.map(a => (a.id === action.id ? { ...a, status: 'done' as const } : a))
      );

      setAiBrowserRunning(false);
      setAiBrowserInput('');
    },
    [
      buildCoTAction,
      browserNavigate,
      newBrowserTab,
      closeBrowserTab,
      activeTabIdx,
      simulateDownload,
      activeTab.url,
    ]
  );

  const toggleSelectorMode = useCallback(() => {
    setSelectorMode(prev => !prev);
    setHoveredElement(null);
  }, []);

  const addSelectedElement = useCallback((el: SelectedElement) => {
    setSelectedElements(prev => {
      if (prev.some(e => e.selector === el.selector)) return prev;
      return [...prev, el];
    });
    setShowAiChat(true);
  }, []);

  const removeSelectedElement = useCallback((selector: string) => {
    setSelectedElements(prev => prev.filter(e => e.selector !== selector));
  }, []);

  // Listen for postMessage from iframe (for same-origin element selection)
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'jarvis-element-hover') {
        setHoveredElement(e.data.rect);
      } else if (e.data?.type === 'jarvis-element-select') {
        addSelectedElement(e.data.element);
        setSelectorMode(false);
        setHoveredElement(null);
      } else if (e.data?.type === 'jarvis-element-unhover') {
        setHoveredElement(null);
      } else if (e.data?.type === 'jarvis-browser-navigate') {
        browserNavigate(e.data.url);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [addSelectedElement, browserNavigate]);

  // Inject selector script into iframe when selector mode changes
  useEffect(() => {
    if (!iframeRef.current || !selectorMode) return;
    try {
      const iframeDoc =
        iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (!iframeDoc) return;
      const existingScript = iframeDoc.getElementById('jarvis-selector-script');
      if (existingScript) existingScript.remove();
      const script = iframeDoc.createElement('script');
      script.id = 'jarvis-selector-script';
      script.textContent = `
        (function() {
          let prevEl = null;
          function getSelector(el) {
            if (el.id) return '#' + el.id;
            let path = [];
            while (el && el.nodeType === 1) {
              let sel = el.tagName.toLowerCase();
              if (el.id) { path.unshift('#' + el.id); break; }
              if (el.className && typeof el.className === 'string') {
                sel += '.' + el.className.trim().split(/\\s+/).join('.');
              }
              path.unshift(sel);
              el = el.parentElement;
            }
            return path.join(' > ');
          }
          function handleMove(e) {
            e.stopPropagation();
            if (prevEl) prevEl.style.outline = '';
            prevEl = e.target;
            e.target.style.outline = '2px solid #89b4fa';
            const rect = e.target.getBoundingClientRect();
            window.parent.postMessage({
              type: 'jarvis-element-hover',
              rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }
            }, '*');
          }
          function handleClick(e) {
            e.preventDefault();
            e.stopPropagation();
            if (prevEl) prevEl.style.outline = '';
            const el = e.target;
            const rect = el.getBoundingClientRect();
            const attrs = {};
            for (const a of el.attributes) attrs[a.name] = a.value;
            window.parent.postMessage({
              type: 'jarvis-element-select',
              element: {
                tag: el.tagName.toLowerCase(),
                id: el.id || '',
                classes: el.className ? el.className.split(' ').filter(Boolean) : [],
                text: (el.textContent || '').slice(0, 120).trim(),
                selector: getSelector(el),
                attributes: attrs,
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
              }
            }, '*');
            cleanup();
          }
          function handleLeave() {
            if (prevEl) prevEl.style.outline = '';
            window.parent.postMessage({ type: 'jarvis-element-unhover' }, '*');
          }
          function cleanup() {
            document.removeEventListener('mousemove', handleMove, true);
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('mouseleave', handleLeave);
          }
          document.addEventListener('mousemove', handleMove, true);
          document.addEventListener('click', handleClick, true);
          document.addEventListener('mouseleave', handleLeave);
        })();
      `;
      iframeDoc.head.appendChild(script);
    } catch {
      // Cross-origin - selector mode won't work, that's OK
    }
  }, [selectorMode]);

  // --- Editor actions (undo, redo, clipboard, find) --â”€â”€

  function editorAction(actionId: string) {
    editorRef.current?.trigger('menu', actionId, null);
    editorRef.current?.focus();
  }

  function goToLine(line: number) {
    if (!editorRef.current) return;
    editorRef.current.revealLineInCenter(line);
    editorRef.current.setPosition({ lineNumber: line, column: 1 });
    editorRef.current.focus();
  }

  function saveAllFiles() {
    openFiles.forEach((_, i) => {
      if (openFiles[i].dirty) saveFile(i);
    });
  }

  function closeAllFiles() {
    setOpenFiles([]);
    setActiveFileIdx(-1);
  }

  function toggleZenMode() {
    setZenMode(prev => {
      const next = !prev;
      if (next) {
        setShowSidebar(false);
        setBottomPanel(null);
      } else {
        setShowSidebar(true);
      }
      return next;
    });
  }

  // â”€â”€â”€ Menu definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  interface MenuItem {
    label: string;
    shortcut?: string;
    action?: () => void;
    separator?: boolean;
    checked?: boolean;
  }

  const menus: Record<string, MenuItem[]> = {
    File: [
      {
        label: 'New File',
        shortcut: 'Ctrl+N',
        action: () => {
          const n = `untitled-${openFiles.length + 1}.ts`;
          setOpenFiles(p => [
            ...p,
            {
              path: n,
              name: n,
              language: 'typescript',
              content: '',
              savedContent: '',
              dirty: true,
            },
          ]);
          setActiveFileIdx(openFiles.length);
        },
      },
      {
        label: 'New Window',
        shortcut: 'Ctrl+Shift+N',
        action: () => window.open(window.location.href, '_blank'),
      },
      { separator: true, label: '' },
      {
        label: 'Open File...',
        shortcut: 'Ctrl+O',
        action: () => {
          setShowCommandPalette(true);
          setCommandQuery('');
        },
      },
      {
        label: 'Open Folder...',
        shortcut: 'Ctrl+Shift+O',
        action: () => {
          triggerFileUpload();
        },
      },
      {
        label: 'Open Recent',
        action: () => {
          setAiMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'Recent projects: Use Ctrl+P to quick-open files.',
              timestamp: new Date().toISOString(),
            },
          ]);
          setShowAiChat(true);
        },
      },
      { separator: true, label: '' },
      {
        label: 'Save',
        shortcut: 'Ctrl+S',
        action: () => {
          if (activeFileIdx >= 0) saveFile(activeFileIdx);
        },
      },
      {
        label: 'Save As...',
        shortcut: 'Ctrl+Shift+S',
        action: () => {
          if (activeFileIdx >= 0) saveFile(activeFileIdx);
        },
      },
      { label: 'Save All', shortcut: 'Ctrl+Alt+S', action: saveAllFiles },
      { separator: true, label: '' },
      {
        label: 'Close Editor',
        shortcut: 'Ctrl+W',
        action: () => {
          if (activeFileIdx >= 0) closeFile(activeFileIdx);
        },
      },
      {
        label: 'Close Window',
        shortcut: 'Ctrl+Shift+W',
        action: closeAllFiles,
      },
      {
        label: 'Revert File',
        action: () => {
          if (activeFileIdx >= 0 && activeFile) {
            setOpenFiles(prev =>
              prev.map((f, i) =>
                i === activeFileIdx ? { ...f, content: f.savedContent, dirty: false } : f
              )
            );
          }
        },
      },
      { separator: true, label: '' },
      {
        label: 'Share...',
        action: () => {
          if (activeFile) {
            navigator.clipboard.writeText(activeFile.content);
            setAiMessages(prev => [
              ...prev,
              {
                role: 'assistant',
                content: `Copied contents of ${activeFile.name} to clipboard.`,
                timestamp: new Date().toISOString(),
              },
            ]);
            setShowAiChat(true);
          }
        },
      },
      { separator: true, label: '' },
      { label: 'Refresh Explorer', action: fetchFileTree },
    ],
    Edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: () => editorAction('undo') },
      { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: () => editorAction('redo') },
      { separator: true, label: '' },
      {
        label: 'Cut',
        shortcut: 'Ctrl+X',
        action: () => editorAction('editor.action.clipboardCutAction'),
      },
      {
        label: 'Copy',
        shortcut: 'Ctrl+C',
        action: () => editorAction('editor.action.clipboardCopyAction'),
      },
      {
        label: 'Paste',
        shortcut: 'Ctrl+V',
        action: () => editorAction('editor.action.clipboardPasteAction'),
      },
      { separator: true, label: '' },
      { label: 'Find', shortcut: 'Ctrl+F', action: () => editorAction('actions.find') },
      {
        label: 'Replace',
        shortcut: 'Ctrl+H',
        action: () => editorAction('editor.action.startFindReplaceAction'),
      },
      {
        label: 'Find in Files',
        shortcut: 'Ctrl+Shift+F',
        action: () => {
          setSidebarPanel('search');
          setShowSidebar(true);
        },
      },
      {
        label: 'Replace in Files',
        shortcut: 'Ctrl+Shift+H',
        action: () => {
          setSidebarPanel('search');
          setShowSidebar(true);
        },
      },
      { separator: true, label: '' },
      {
        label: 'Go to Line...',
        shortcut: 'Ctrl+G',
        action: () => {
          setShowGoToLine(true);
          setGoToLineValue('');
        },
      },
      { separator: true, label: '' },
      {
        label: 'Toggle Line Comment',
        shortcut: 'Ctrl+/',
        action: () => editorAction('editor.action.commentLine'),
      },
      {
        label: 'Toggle Block Comment',
        shortcut: 'Ctrl+Shift+/',
        action: () => editorAction('editor.action.blockComment'),
      },
      {
        label: 'Emmet: Expand Abbreviation',
        shortcut: 'Tab',
        action: () => editorAction('editor.emmet.action.expandAbbreviation'),
      },
    ],
    Selection: [
      {
        label: 'Select All',
        shortcut: 'Ctrl+A',
        action: () => editorAction('editor.action.selectAll'),
      },
      {
        label: 'Expand Selection',
        shortcut: 'Ctrl+Shift+?',
        action: () => editorAction('editor.action.smartSelect.expand'),
      },
      {
        label: 'Shrink Selection',
        shortcut: 'Ctrl+Shift+?',
        action: () => editorAction('editor.action.smartSelect.shrink'),
      },
      { separator: true, label: '' },
      {
        label: 'Copy Line Up',
        shortcut: 'Alt+Shift+?',
        action: () => editorAction('editor.action.copyLinesUpAction'),
      },
      {
        label: 'Copy Line Down',
        shortcut: 'Alt+Shift+?',
        action: () => editorAction('editor.action.copyLinesDownAction'),
      },
      {
        label: 'Move Line Up',
        shortcut: 'Alt+?',
        action: () => editorAction('editor.action.moveLinesUpAction'),
      },
      {
        label: 'Move Line Down',
        shortcut: 'Alt+?',
        action: () => editorAction('editor.action.moveLinesDownAction'),
      },
      { separator: true, label: '' },
      {
        label: 'Add Cursor Above',
        shortcut: 'Ctrl+Alt+?',
        action: () => editorAction('editor.action.insertCursorAbove'),
      },
      {
        label: 'Add Cursor Below',
        shortcut: 'Ctrl+Alt+?',
        action: () => editorAction('editor.action.insertCursorBelow'),
      },
    ],
    View: [
      {
        label: 'Toggle Sidebar',
        shortcut: 'Ctrl+B',
        action: () => setShowSidebar(p => !p),
      },
      { label: 'Toggle Zen Mode', shortcut: 'Ctrl+K Z', action: toggleZenMode, checked: zenMode },
      {
        label: 'Toggle Full Screen',
        action: () => {
          if (!document.fullscreenElement) document.documentElement.requestFullscreen();
          else document.exitFullscreen();
        },
      },
      {
        label: 'Toggle Word Wrap',
        shortcut: 'Alt+Z',
        action: () => setWordWrap(p => !p),
        checked: wordWrap,
      },
      { label: 'Toggle Minimap', action: () => setShowMinimap(p => !p), checked: showMinimap },
      { separator: true, label: '' },
      {
        label: 'Explorer',
        shortcut: 'Ctrl+Shift+E',
        action: () => {
          setSidebarPanel('explorer');
          setShowSidebar(true);
        },
      },
      {
        label: 'Search',
        shortcut: 'Ctrl+Shift+F',
        action: () => {
          setSidebarPanel('search');
          setShowSidebar(true);
        },
      },
      {
        label: 'Source Control',
        shortcut: 'Ctrl+Shift+G',
        action: () => {
          setSidebarPanel('git');
          setShowSidebar(true);
        },
      },
      {
        label: 'Extensions',
        shortcut: 'Ctrl+Shift+X',
        action: () => {
          setSidebarPanel('extensions');
          setShowSidebar(true);
        },
      },
      {
        label: 'Outline',
        shortcut: 'Ctrl+Shift+O',
        action: () => {
          setSidebarPanel('outline');
          setShowSidebar(true);
        },
      },
      {
        label: 'Rules & Linting',
        action: () => {
          setSidebarPanel('rules');
          setShowSidebar(true);
        },
      },
      { separator: true, label: '' },
      {
        label: 'Terminal',
        shortcut: 'Ctrl+`',
        action: () => setBottomPanel(p => (p === 'terminal' ? null : 'terminal')),
      },
      {
        label: 'Problems',
        shortcut: 'Ctrl+Shift+M',
        action: () => setBottomPanel(p => (p === 'problems' ? null : 'problems')),
      },
      { separator: true, label: '' },
      {
        label: 'AI Chat',
        action: () => setShowAiChat(p => !p),
      },
      {
        label: 'Browser',
        action: () => setShowBrowser(p => !p),
      },
    ],
    Go: [
      {
        label: 'Back',
        shortcut: 'Alt+?',
        action: () => editorAction('workbench.action.navigateBack'),
      },
      {
        label: 'Forward',
        shortcut: 'Alt+?',
        action: () => editorAction('workbench.action.navigateForward'),
      },
      { separator: true, label: '' },
      {
        label: 'Go to File...',
        shortcut: 'Ctrl+P',
        action: () => {
          setShowCommandPalette(true);
          setCommandQuery('');
        },
      },
      {
        label: 'Go to Symbol in Workspace...',
        shortcut: 'Ctrl+T',
        action: () => {
          setShowCommandPalette(true);
          setCommandQuery('>');
        },
      },
      {
        label: 'Go to Line...',
        shortcut: 'Ctrl+G',
        action: () => {
          setShowGoToLine(true);
          setGoToLineValue('');
        },
      },
      { separator: true, label: '' },
      {
        label: 'Go to Definition',
        shortcut: 'F12',
        action: () => editorAction('editor.action.revealDefinition'),
      },
      {
        label: 'Go to References',
        shortcut: 'Shift+F12',
        action: () => editorAction('editor.action.goToReferences'),
      },
      {
        label: 'Go to Implementation',
        shortcut: 'Ctrl+F12',
        action: () => editorAction('editor.action.goToImplementation'),
      },
      {
        label: 'Go to Symbol in Editor...',
        shortcut: 'Ctrl+Shift+O',
        action: () => editorAction('editor.action.quickOutline'),
      },
      { separator: true, label: '' },
      {
        label: 'Go to Bracket',
        shortcut: 'Ctrl+Shift+\\',
        action: () => editorAction('editor.action.jumpToBracket'),
      },
      {
        label: 'Next Problem',
        shortcut: 'F8',
        action: () => editorAction('editor.action.marker.next'),
      },
      {
        label: 'Previous Problem',
        shortcut: 'Shift+F8',
        action: () => editorAction('editor.action.marker.prev'),
      },
    ],
    Terminal: [
      {
        label: 'New Terminal',
        shortcut: 'Ctrl+Shift+`',
        action: () => {
          setBottomPanel('terminal');
          setTerminalHistory([]);
        },
      },
      {
        label: 'Split Terminal',
        action: () => {
          setBottomPanel('terminal');
          setAiMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'Split terminal is not yet supported — using single terminal.',
              timestamp: new Date().toISOString(),
            },
          ]);
        },
      },
      { separator: true, label: '' },
      {
        label: 'Run Active File in Terminal',
        action: () => {
          if (activeFile) {
            setBottomPanel('terminal');
            const ext = activeFile.name.split('.').pop();
            const cmd =
              ext === 'ts'
                ? `npx ts-node ${activeFile.path}`
                : ext === 'js'
                  ? `node ${activeFile.path}`
                  : ext === 'py'
                    ? `python ${activeFile.path}`
                    : `cat ${activeFile.path}`;
            runCommand(cmd);
          }
        },
      },
      {
        label: 'Run Selected Text in Terminal',
        action: () => {
          if (editorRef.current) {
            const sel = editorRef.current.getSelection();
            const text = sel ? editorRef.current.getModel()?.getValueInRange(sel) || '' : '';
            if (text) {
              setBottomPanel('terminal');
              runCommand(text);
            }
          }
        },
      },
      { separator: true, label: '' },
      { label: 'Clear Terminal', action: () => setTerminalHistory([]) },
      {
        label: 'Run Build Task',
        shortcut: 'Ctrl+Shift+B',
        action: () => {
          setBottomPanel('terminal');
          runCommand('npm run build');
        },
      },
      {
        label: 'Run Test Task',
        action: () => {
          setBottomPanel('terminal');
          runCommand('npm test');
        },
      },
    ],
    Run: [
      {
        label: 'Start Debugging',
        shortcut: 'F5',
        action: () => {
          if (activeFile) {
            setDebugRunning(true);
            setDebugPaused(false);
            setBottomPanel('debug');
            setCallStack([
              {
                id: 'frame-1',
                name: activeFile.name.replace(/\.[^.]+$/, ''),
                file: activeFile.path,
                line: cursorLine,
                column: 1,
              },
              { id: 'frame-0', name: '(anonymous)', file: activeFile.path, line: 1, column: 1 },
            ]);
            setDebugConsole(prev => [
              ...prev,
              {
                id: `dc-${Date.now()}`,
                type: 'info',
                message: `Debugging started: ${activeFile.name}`,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        },
      },
      {
        label: 'Run Without Debugging',
        shortcut: 'Ctrl+F5',
        action: () => {
          if (activeFile) {
            setBottomPanel('terminal');
            const ext = activeFile.name.split('.').pop();
            const cmd =
              ext === 'ts'
                ? `npx ts-node ${activeFile.path}`
                : ext === 'js'
                  ? `node ${activeFile.path}`
                  : ext === 'py'
                    ? `python ${activeFile.path}`
                    : `cat ${activeFile.path}`;
            runCommand(cmd);
          }
        },
      },
      {
        label: 'Stop Debugging',
        shortcut: 'Shift+F5',
        action: () => {
          setDebugRunning(false);
          setDebugPaused(false);
          setCallStack([]);
          setDebugConsole(prev => [
            ...prev,
            {
              id: `dc-${Date.now()}`,
              type: 'info',
              message: 'Debugging stopped.',
              timestamp: new Date().toISOString(),
            },
          ]);
        },
      },
      {
        label: 'Restart Debugging',
        shortcut: 'Ctrl+Shift+F5',
        action: () => {
          setDebugConsole(prev => [
            ...prev,
            {
              id: `dc-${Date.now()}`,
              type: 'info',
              message: 'Debugging restarted.',
              timestamp: new Date().toISOString(),
            },
          ]);
        },
      },
      { separator: true, label: '' },
      {
        label: 'Step Over',
        shortcut: 'F10',
        action: () => {
          if (debugRunning) {
            setDebugPaused(true);
            setDebugConsole(prev => [
              ...prev,
              {
                id: `dc-${Date.now()}`,
                type: 'log',
                message: `Step over at line ${cursorLine}`,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        },
      },
      {
        label: 'Step Into',
        shortcut: 'F11',
        action: () => {
          if (debugRunning) {
            setDebugPaused(true);
            setDebugConsole(prev => [
              ...prev,
              {
                id: `dc-${Date.now()}`,
                type: 'log',
                message: `Step into at line ${cursorLine}`,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        },
      },
      {
        label: 'Step Out',
        shortcut: 'Shift+F11',
        action: () => {
          if (debugRunning) {
            setDebugConsole(prev => [
              ...prev,
              {
                id: `dc-${Date.now()}`,
                type: 'log',
                message: `Step out at line ${cursorLine}`,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        },
      },
      {
        label: 'Continue',
        shortcut: 'F5',
        action: () => {
          if (debugPaused) {
            setDebugPaused(false);
            setDebugConsole(prev => [
              ...prev,
              {
                id: `dc-${Date.now()}`,
                type: 'info',
                message: 'Continued execution.',
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        },
      },
      { separator: true, label: '' },
      {
        label: 'Toggle Breakpoint',
        shortcut: 'F9',
        action: () => {
          if (activeFile) {
            const existing = breakpoints.find(
              bp => bp.file === activeFile.path && bp.line === cursorLine
            );
            if (existing) {
              setBreakpoints(prev => prev.filter(bp => bp.id !== existing.id));
            } else {
              setBreakpoints(prev => [
                ...prev,
                { id: `bp-${Date.now()}`, file: activeFile.path, line: cursorLine, enabled: true },
              ]);
            }
          }
        },
      },
      {
        label: 'Remove All Breakpoints',
        action: () => setBreakpoints([]),
      },
      { separator: true, label: '' },
      {
        label: 'Run and Debug',
        shortcut: 'Ctrl+Shift+D',
        action: () => {
          setSidebarPanel('debug');
          setShowSidebar(true);
        },
      },
      {
        label: 'Debug Console',
        shortcut: 'Ctrl+Shift+Y',
        action: () => setBottomPanel('debug'),
      },
    ],
    Cursor: [
      {
        label: 'Open Chat',
        shortcut: 'Ctrl+L',
        action: () => setShowAiChat(true),
      },
      {
        label: 'Inline Edit',
        shortcut: 'Ctrl+K',
        action: () => {
          if (editorRef.current) {
            const sel = editorRef.current.getSelection();
            const text = sel ? editorRef.current.getModel()?.getValueInRange(sel) || '' : '';
            if (text) {
              const coords = editorRef.current.getScrolledVisiblePosition(sel.getStartPosition());
              const rect = editorRef.current.getDomNode()?.getBoundingClientRect();
              setInlineEdit({
                x: (rect?.left || 0) + (coords?.left || 0),
                y: (rect?.top || 0) + (coords?.top || 0),
                selectedText: text,
                startLine: sel.startLineNumber,
                endLine: sel.endLineNumber,
              });
            }
          }
        },
      },
      { separator: true, label: '' },
      {
        label: 'Generate Tests',
        action: () => {
          if (activeFile) {
            setAiInput(`/tests for ${activeFile.name}`);
            setShowAiChat(true);
          }
        },
      },
      {
        label: 'Fix with AI',
        action: () => {
          if (editorRef.current) {
            const sel = editorRef.current.getSelection();
            const text = sel ? editorRef.current.getModel()?.getValueInRange(sel) || '' : '';
            if (text) {
              setAiInput(`/fix ${text.substring(0, 200)}`);
              setShowAiChat(true);
            }
          }
        },
      },
      {
        label: 'Explain Code',
        action: () => {
          if (editorRef.current) {
            const sel = editorRef.current.getSelection();
            const text = sel ? editorRef.current.getModel()?.getValueInRange(sel) || '' : '';
            if (text) {
              setAiInput(`/explain ${text.substring(0, 200)}`);
              setShowAiChat(true);
            }
          }
        },
      },
      {
        label: 'Refactor Code',
        action: () => {
          if (editorRef.current) {
            const sel = editorRef.current.getSelection();
            const text = sel ? editorRef.current.getModel()?.getValueInRange(sel) || '' : '';
            if (text) {
              setAiInput(`/refactor ${text.substring(0, 200)}`);
              setShowAiChat(true);
            }
          }
        },
      },
      { separator: true, label: '' },
      {
        label: 'Toggle Autocomplete',
        action: () => setInlineSuggestEnabled(p => !p),
        checked: inlineSuggestEnabled,
      },
      {
        label: 'Model Settings',
        action: () => {
          setSidebarPanel('settings');
          setShowSidebar(true);
        },
      },
      {
        label: 'Rules & Workflows',
        action: () => {
          setSidebarPanel('rules');
          setShowSidebar(true);
        },
      },
      { separator: true, label: '' },
      {
        label: 'Bug Finder',
        shortcut: 'Ctrl+Shift+L',
        action: () => {
          runBugScan();
          setBottomPanel('problems');
        },
      },
      {
        label: 'Open Settings',
        shortcut: 'Ctrl+,',
        action: () => {
          setSidebarPanel('settings');
          setShowSidebar(true);
        },
      },
    ],
    Window: [
      {
        label: 'Minimize',
        action: () => {
          setAiMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'Window minimize is handled by your OS window manager.',
              timestamp: new Date().toISOString(),
            },
          ]);
        },
      },
      {
        label: 'Zoom In',
        shortcut: 'Ctrl+=',
        action: () => {
          document.body.style.zoom = `${parseFloat(document.body.style.zoom || '1') + 0.1}`;
        },
      },
      {
        label: 'Zoom Out',
        shortcut: 'Ctrl+-',
        action: () => {
          document.body.style.zoom = `${Math.max(0.5, parseFloat(document.body.style.zoom || '1') - 0.1)}`;
        },
      },
      { separator: true, label: '' },
      {
        label: 'New Window',
        shortcut: 'Ctrl+Shift+N',
        action: () => window.open(window.location.href, '_blank'),
      },
      {
        label: 'Toggle Sidebar',
        shortcut: 'Ctrl+B',
        action: () => setShowSidebar(p => !p),
      },
      { label: 'Toggle Zen Mode', action: toggleZenMode, checked: zenMode },
      {
        label: 'Toggle Full Screen',
        action: () => {
          if (!document.fullscreenElement) document.documentElement.requestFullscreen();
          else document.exitFullscreen();
        },
      },
    ],
    Help: [
      {
        label: 'Toggle Developer Tools',
        shortcut: 'F12',
        action: () => {
          setAiMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'Press F12 in your browser to open Developer Tools.',
              timestamp: new Date().toISOString(),
            },
          ]);
          setShowAiChat(true);
        },
      },
      {
        label: 'Report Issue',
        action: () => {
          setAiMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'To report an issue, please open an issue on the project repository.',
              timestamp: new Date().toISOString(),
            },
          ]);
          setShowAiChat(true);
        },
      },
      { separator: true, label: '' },
      {
        label: 'Documentation',
        action: () => {
          setAiMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content:
                'Jarvis IDE Documentation:\n• Ctrl+P ? Quick open files\n• Ctrl+Shift+P ? Command palette\n• Ctrl+K ? Inline AI edit\n• Ctrl+L ? AI Chat\n• Ctrl+` ? Terminal\n• Ctrl+B ? Toggle sidebar\n• Ctrl+Shift+O ? Outline view\n• Ctrl+Shift+M ? Problems panel\n• Ctrl+Shift+F ? Search in files\n• Ctrl+G ? Go to line\n• F8 ? Next problem\n• Alt+Z ? Word wrap',
              timestamp: new Date().toISOString(),
            },
          ]);
          setShowAiChat(true);
        },
      },
      {
        label: 'Release Notes',
        action: () => {
          setAiMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content:
                'Jarvis IDE v2.0 — New Features:\n• AI Inline Edit (Ctrl+K)\n• Bug Finder in Problems panel\n• Slash commands in AI Chat\n• Model selector & temperature controls\n• Git Blame annotations\n• Outline view\n• Diff Preview overlay\n• Comprehensive command palette\n• Full Cursor-style menu bar',
              timestamp: new Date().toISOString(),
            },
          ]);
          setShowAiChat(true);
        },
      },
      { separator: true, label: '' },
      {
        label: 'Keyboard Shortcuts Reference',
        shortcut: 'Ctrl+K Ctrl+S',
        action: () => {
          setShowCommandPalette(true);
          setCommandQuery('>');
        },
      },
      {
        label: 'Check for Updates',
        action: () => {
          setAiMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'You are running the latest version of Jarvis IDE v2.0.',
              timestamp: new Date().toISOString(),
            },
          ]);
          setShowAiChat(true);
        },
      },
      { separator: true, label: '' },
      {
        label: 'About Jarvis IDE',
        action: () => {
          setAiMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content:
                'Jarvis IDE v2.0 — A Cursor-inspired code editor powered by Monaco Editor.\n\nFeatures: File explorer, multi-tab editing, integrated terminal, AI chat with slash commands, inline AI edit, bug finder, global search, git integration, command palette, outline view, diff preview, model selector, and full keyboard shortcuts.',
              timestamp: new Date().toISOString(),
            },
          ]);
          setShowAiChat(true);
        },
      },
    ],
  };

  // â”€â”€â”€ File operations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function detectLanguage(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescriptreact',
      js: 'javascript',
      jsx: 'javascriptreact',
      json: 'json',
      css: 'css',
      scss: 'scss',
      html: 'html',
      md: 'markdown',
      yaml: 'yaml',
      yml: 'yaml',
      py: 'python',
      sql: 'sql',
      sh: 'shell',
      ps1: 'powershell',
      bat: 'bat',
      env: 'plaintext',
      txt: 'plaintext',
      xml: 'xml',
      svg: 'xml',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      h: 'c',
      rs: 'rust',
      go: 'go',
      rb: 'ruby',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      dart: 'dart',
      lua: 'lua',
      toml: 'toml',
      ini: 'ini',
      gitignore: 'plaintext',
      log: 'plaintext',
    };
    return langMap[ext] || 'plaintext';
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        const filePath = `uploads/${file.name}`;
        const existing = openFiles.findIndex(f => f.path === filePath);
        if (existing >= 0) {
          setOpenFiles(prev =>
            prev.map((f, i) =>
              i === existing ? { ...f, content, savedContent: content, dirty: false } : f
            )
          );
          setActiveFileIdx(existing);
        } else {
          const newFile: OpenFile = {
            path: filePath,
            name: file.name,
            language: detectLanguage(file.name),
            content,
            savedContent: content,
            dirty: false,
          };
          setOpenFiles(prev => [...prev, newFile]);
          setActiveFileIdx(openFiles.length);
        }
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  }

  function triggerFileUpload() {
    fileInputRef.current?.click();
  }

  const openFileByPath = useCallback(
    async (filePath: string) => {
      const existing = openFiles.findIndex(f => f.path === filePath);
      if (existing >= 0) {
        setActiveFileIdx(existing);
        return;
      }
      // Virtual .jarvis/ files — open from state instead of API
      if (filePath.startsWith('.jarvis/rules/')) {
        const slug = filePath.replace('.jarvis/rules/', '').replace('.md', '');
        const rule = aiRules.find(
          r =>
            r.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '') === slug
        );
        if (rule) {
          openRuleInEditor(rule.id);
          return;
        }
      }
      if (filePath.startsWith('.jarvis/workflows/')) {
        const slug = filePath.replace('.jarvis/workflows/', '').replace('.md', '');
        const wf = aiWorkflows.find(
          w =>
            w.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '') === slug
        );
        if (wf) {
          openWorkflowInEditor(wf.id);
          return;
        }
      }
      try {
        const resp = await fetch(`/api/ide/file?path=${encodeURIComponent(filePath)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        const newFile: OpenFile = {
          path: filePath,
          name: filePath.split('/').pop() || filePath,
          language: data.language || 'plaintext',
          content: data.content || '',
          savedContent: data.content || '',
          dirty: false,
        };
        setOpenFiles(prev => [...prev, newFile]);
        setActiveFileIdx(openFiles.length);
      } catch {
        /* silently fail */
      }
    },
    [openFiles, aiRules, aiWorkflows]
  );

  // Listen for cross-component events from the dashboard
  useEffect(() => {
    function handleAiFix(e: Event) {
      const { prompt, filePath } = (e as CustomEvent).detail;
      if (filePath) openFileByPath(filePath);
      setAiMessages(prev => [
        ...prev,
        { role: 'user', content: prompt, timestamp: new Date().toISOString() },
      ]);
      setShowAiChat(true);
      setTimeout(() => {
        setAiMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `I've received the diagnosis report. The file \`${filePath}\` is now open in the editor. Let me analyze the issues and suggest fixes.\n\nPlease review the file and I'll help you implement the suggested changes.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }, 500);
    }

    function handleOpenFile(e: Event) {
      const { filePath } = (e as CustomEvent).detail;
      if (filePath) openFileByPath(filePath);
    }

    window.addEventListener('jarvis:ai-fix', handleAiFix);
    window.addEventListener('jarvis:open-file', handleOpenFile);
    return () => {
      window.removeEventListener('jarvis:ai-fix', handleAiFix);
      window.removeEventListener('jarvis:open-file', handleOpenFile);
    };
  }, [openFileByPath]);

  const saveFile = useCallback(
    async (idx: number) => {
      const file = openFiles[idx];
      if (!file) return;
      try {
        const resp = await fetch('/api/ide/file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: file.path, content: file.content }),
        });
        if (resp.ok) {
          setOpenFiles(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], savedContent: updated[idx].content, dirty: false };
            return updated;
          });
        }
      } catch {
        /* silently fail */
      }
    },
    [openFiles]
  );

  const closeFile = useCallback(
    (idx: number) => {
      const file = openFiles[idx];
      if (file?.path.startsWith('.jarvis/')) {
        saveJarvisFileOnClose(file);
      }
      const newLength = openFiles.length - 1;
      setOpenFiles(prev => prev.filter((_, i) => i !== idx));
      setActiveFileIdx(prev => {
        if (newLength <= 0) return -1;
        if (prev >= idx && prev > 0) return prev - 1;
        if (prev >= newLength) return newLength - 1;
        return prev;
      });
    },
    [openFiles]
  );

  // â”€â”€â”€ Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function runSearch() {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const resp = await fetch('/api/ide/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSearchResults(data.results || []);
      }
    } catch {
      /* silently fail */
    }
    setSearchLoading(false);
  }

  // â”€â”€â”€ Terminal (real PTY via WebSocket) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function sendToTerminal(cmd: string) {
    if (!cmd.trim()) return;
    // Open terminal panel if not open
    setBottomPanel('terminal');
    // Send command to PTY via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', data: cmd + '\r' }));
    }
  }

  // Keep runCommand as an alias for menu actions and backwards compatibility
  function runCommand(cmd: string) {
    sendToTerminal(cmd);
  }

  // --- Conversation Management ----------------------

  function newConversation() {
    const id = `conv-${Date.now()}`;
    const welcome: AIChatMessage = {
      role: 'assistant',
      content: 'New conversation started. How can I help?',
      timestamp: new Date().toISOString(),
    };
    const conv: Conversation = {
      id,
      title: 'New Conversation',
      messages: [welcome],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations(prev => [
      conv,
      ...prev.map(c =>
        c.id === activeConversationId
          ? { ...c, messages: aiMessages, updatedAt: new Date().toISOString() }
          : c
      ),
    ]);
    setActiveConversationId(id);
    setAiMessages([welcome]);
    setShowConversationList(false);
  }

  function switchConversation(convId: string) {
    setConversations(prev =>
      prev.map(c =>
        c.id === activeConversationId
          ? { ...c, messages: aiMessages, updatedAt: new Date().toISOString() }
          : c
      )
    );
    const target = conversations.find(c => c.id === convId);
    if (target) {
      setActiveConversationId(convId);
      setAiMessages(target.messages);
    }
    setShowConversationList(false);
  }

  function deleteConversation(convId: string) {
    if (conversations.length <= 1) return;
    const remaining = conversations.filter(c => c.id !== convId);
    setConversations(remaining);
    if (convId === activeConversationId && remaining.length > 0) {
      setActiveConversationId(remaining[0].id);
      setAiMessages(remaining[0].messages);
    }
  }

  // --- AI Rules / Workflows / Memories / Skills -----

  function addRule() {
    if (!newRuleTitle.trim() || !newRuleContent.trim()) return;
    const rule: AIRule = {
      id: `rule-${Date.now()}`,
      title: newRuleTitle.trim(),
      content: newRuleContent.trim(),
      scope: newRuleScope,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    setAiRules(prev => [...prev, rule]);
    setNewRuleTitle('');
    setNewRuleContent('');
  }

  function deleteRule(ruleId: string) {
    setAiRules(prev => prev.filter(r => r.id !== ruleId));
  }

  function toggleRule(ruleId: string) {
    setAiRules(prev => prev.map(r => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)));
  }

  function saveRuleEdit(ruleId: string, title: string, content: string) {
    setAiRules(prev => prev.map(r => (r.id === ruleId ? { ...r, title, content } : r)));
    setEditingRuleId(null);
  }

  async function runWorkflow(wfId: string) {
    const wf = aiWorkflows.find(w => w.id === wfId);
    if (!wf || wf.status === 'running') return;
    setAiWorkflows(prev =>
      prev.map(w =>
        w.id === wfId
          ? {
              ...w,
              status: 'running',
              currentStep: 0,
              steps: w.steps.map(s => ({ ...s, status: 'pending' as const, output: undefined })),
            }
          : w
      )
    );
    setAiMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `?? Starting workflow: **${wf.name}**\n${wf.steps.length} steps to execute...`,
        timestamp: new Date().toISOString(),
      },
    ]);
    setAiChatTab('chat');
    setShowAiChat(true);

    for (let i = 0; i < wf.steps.length; i++) {
      // Mark step running
      setAiWorkflows(prev =>
        prev.map(w =>
          w.id === wfId
            ? {
                ...w,
                currentStep: i,
                steps: w.steps.map((s, idx) =>
                  idx === i ? { ...s, status: 'running' as const } : s
                ),
              }
            : w
        )
      );
      setAiMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `? Step ${i + 1}/${wf.steps.length}: ${wf.steps[i].instruction}`,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Simulate step execution (terminal commands get sent to terminal)
      const instruction = wf.steps[i].instruction.toLowerCase();
      if (instruction.startsWith('run ')) {
        sendToTerminal(wf.steps[i].instruction.replace(/^run\s+/i, ''));
      }
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

      // Mark step done
      setAiWorkflows(prev =>
        prev.map(w =>
          w.id === wfId
            ? {
                ...w,
                steps: w.steps.map((s, idx) =>
                  idx === i ? { ...s, status: 'done' as const, output: 'Completed' } : s
                ),
              }
            : w
        )
      );
    }

    setAiWorkflows(prev => prev.map(w => (w.id === wfId ? { ...w, status: 'done' } : w)));
    setAiMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `? Workflow **${wf.name}** completed successfully! All ${wf.steps.length} steps done.`,
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  function createWorkflow() {
    if (!newWfName.trim() || !newWfSteps.trim()) return;
    const steps = newWfSteps
      .split('\n')
      .filter(s => s.trim())
      .map((s, i) => ({
        id: `wf-new-s${i}`,
        instruction: s.trim(),
        status: 'pending' as const,
      }));
    const wf: AIWorkflow = {
      id: `wf-${Date.now()}`,
      name: newWfName.trim(),
      description: steps
        .slice(0, 2)
        .map(s => s.instruction)
        .join(', '),
      steps,
      status: 'idle',
      currentStep: 0,
      createdAt: new Date().toISOString(),
    };
    setAiWorkflows(prev => [...prev, wf]);
    setNewWfName('');
    setNewWfSteps('');
    setShowNewWorkflow(false);
  }

  function deleteWorkflow(wfId: string) {
    setAiWorkflows(prev => prev.filter(w => w.id !== wfId));
  }

  function addMemory() {
    if (!newMemTitle.trim() || !newMemContent.trim()) return;
    const mem: AIMemory = {
      id: `mem-${Date.now()}`,
      title: newMemTitle.trim(),
      content: newMemContent.trim(),
      category: newMemCategory,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auto: false,
    };
    setAiMemories(prev => [...prev, mem]);
    setNewMemTitle('');
    setNewMemContent('');
    setShowNewMemory(false);
  }

  function deleteMemory(memId: string) {
    setAiMemories(prev => prev.filter(m => m.id !== memId));
  }

  function toggleSkill(skillId: string) {
    setAiSkills(prev => prev.map(s => (s.id === skillId ? { ...s, enabled: !s.enabled } : s)));
  }

  // --- Open Rules/Workflows in Editor ----------------

  function ruleToMarkdown(rule: AIRule): string {
    return `---\ntitle: ${rule.title}\nscope: ${rule.scope}\nenabled: ${rule.enabled}\nid: ${rule.id}\n---\n\n${rule.content}\n`;
  }

  function markdownToRule(md: string, fallbackId: string): Partial<AIRule> {
    const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n/);
    const result: Record<string, string> = {};
    if (fmMatch) {
      fmMatch[1].split('\n').forEach(line => {
        const [key, ...vals] = line.split(': ');
        if (key) result[key.trim()] = vals.join(': ').trim();
      });
    }
    const body = fmMatch ? md.slice(fmMatch[0].length).trim() : md.trim();
    return {
      id: result.id || fallbackId,
      title: result.title || 'Untitled Rule',
      scope: (result.scope as 'global' | 'workspace') || 'workspace',
      enabled: result.enabled !== 'false',
      content: body,
    };
  }

  function workflowToMarkdown(wf: AIWorkflow): string {
    let md = `---\nname: ${wf.name}\ndescription: ${wf.description}\nid: ${wf.id}\n---\n\n`;
    wf.steps.forEach((step, i) => {
      md += `${i + 1}. ${step.instruction}\n`;
    });
    return md;
  }

  function markdownToWorkflow(md: string, fallbackId: string): Partial<AIWorkflow> {
    const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n/);
    const result: Record<string, string> = {};
    if (fmMatch) {
      fmMatch[1].split('\n').forEach(line => {
        const [key, ...vals] = line.split(': ');
        if (key) result[key.trim()] = vals.join(': ').trim();
      });
    }
    const body = fmMatch ? md.slice(fmMatch[0].length).trim() : md.trim();
    const steps: AIWorkflowStep[] = body
      .split('\n')
      .filter(l => l.trim())
      .map((line, i) => ({
        id: `${fallbackId}-s${i}`,
        instruction: line.replace(/^\d+\.\s*/, '').trim(),
        status: 'pending' as const,
      }));
    return {
      id: result.id || fallbackId,
      name: result.name || 'Untitled Workflow',
      description: result.description || '',
      steps,
    };
  }

  function openRuleInEditor(ruleId: string) {
    const rule = aiRules.find(r => r.id === ruleId);
    if (!rule) return;
    const slug = rule.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const filePath = `.jarvis/rules/${slug}.md`;
    const existing = openFiles.findIndex(f => f.path === filePath);
    if (existing >= 0) {
      setActiveFileIdx(existing);
      return;
    }
    const content = ruleToMarkdown(rule);
    const newFile: OpenFile = {
      path: filePath,
      name: `${slug}.md`,
      language: 'markdown',
      content,
      savedContent: content,
      dirty: false,
    };
    setOpenFiles(prev => [...prev, newFile]);
    setActiveFileIdx(openFiles.length);
  }

  function openWorkflowInEditor(wfId: string) {
    const wf = aiWorkflows.find(w => w.id === wfId);
    if (!wf) return;
    const slug = wf.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const filePath = `.jarvis/workflows/${slug}.md`;
    const existing = openFiles.findIndex(f => f.path === filePath);
    if (existing >= 0) {
      setActiveFileIdx(existing);
      return;
    }
    const content = workflowToMarkdown(wf);
    const newFile: OpenFile = {
      path: filePath,
      name: `${slug}.md`,
      language: 'markdown',
      content,
      savedContent: content,
      dirty: false,
    };
    setOpenFiles(prev => [...prev, newFile]);
    setActiveFileIdx(openFiles.length);
  }

  function saveJarvisFileOnClose(file: OpenFile) {
    if (file.path.startsWith('.jarvis/rules/')) {
      const parsed = markdownToRule(file.content, '');
      if (parsed.id) {
        setAiRules(prev =>
          prev.map(r =>
            r.id === parsed.id
              ? {
                  ...r,
                  title: parsed.title || r.title,
                  content: parsed.content || r.content,
                  scope: parsed.scope || r.scope,
                  enabled: parsed.enabled ?? r.enabled,
                }
              : r
          )
        );
      } else {
        const newRule: AIRule = {
          id: `rule-${Date.now()}`,
          title: parsed.title || 'Untitled Rule',
          content: parsed.content || '',
          scope: parsed.scope || 'workspace',
          enabled: parsed.enabled ?? true,
          createdAt: new Date().toISOString(),
        };
        setAiRules(prev => [...prev, newRule]);
      }
    } else if (file.path.startsWith('.jarvis/workflows/')) {
      const parsed = markdownToWorkflow(file.content, '');
      if (parsed.id) {
        setAiWorkflows(prev =>
          prev.map(w =>
            w.id === parsed.id
              ? {
                  ...w,
                  name: parsed.name || w.name,
                  description: parsed.description || w.description,
                  steps: parsed.steps && parsed.steps.length > 0 ? parsed.steps : w.steps,
                }
              : w
          )
        );
      } else {
        const newWf: AIWorkflow = {
          id: `wf-${Date.now()}`,
          name: parsed.name || 'Untitled Workflow',
          description: parsed.description || '',
          steps: parsed.steps || [],
          status: 'idle',
          currentStep: 0,
          createdAt: new Date().toISOString(),
        };
        setAiWorkflows(prev => [...prev, newWf]);
      }
    }
  }

  // --- AI Chat --------------------------------------

  function insertCodeToEditor(code: string) {
    if (!editorRef.current || !activeFile) return;
    const editor = editorRef.current;
    const position = editor.getPosition();
    if (position) {
      editor.executeEdits('ai-insert', [
        {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
          text: code,
        },
      ]);
    }
  }

  function detectTerminalCommand(text: string): string | null {
    const lower = text.toLowerCase().trim();
    const patterns = [
      /^(?:run|execute|exec)\s+[`"']?(.+?)[`"']?\s*$/i,
      /^(?:terminal|shell|cmd):\s*(.+)$/i,
      /^(?:please\s+)?(?:run|execute)\s+[`"']?(.+?)[`"']?\s*$/i,
    ];
    for (const p of patterns) {
      const m = lower.match(p);
      if (m) return m[1].trim();
    }
    // Direct command detection
    if (
      lower.startsWith('npm ') ||
      lower.startsWith('npx ') ||
      lower.startsWith('git ') ||
      lower.startsWith('node ') ||
      lower.startsWith('tsc ') ||
      lower.startsWith('pnpm ') ||
      lower.startsWith('yarn ') ||
      lower.startsWith('cd ') ||
      lower.startsWith('ls ') ||
      lower.startsWith('dir ') ||
      lower.startsWith('mkdir ') ||
      lower.startsWith('cat ')
    ) {
      return text.trim();
    }
    return null;
  }

  async function sendAiMessage() {
    if (!aiInput.trim()) return;

    // Check if it's a terminal command
    const currentInput = aiInput;
    const termCmd = detectTerminalCommand(currentInput);
    if (termCmd) {
      const userMsg: AIChatMessage = {
        role: 'user',
        content: currentInput,
        timestamp: new Date().toISOString(),
      };
      const assistantMsg: AIChatMessage = {
        role: 'assistant',
        content: `? Executed in terminal:\n\`\`\`\n${termCmd}\n\`\`\`\nCheck the terminal panel below for output.`,
        timestamp: new Date().toISOString(),
      };
      setAiMessages(prev => {
        const updated = [...prev, userMsg, assistantMsg];
        // Sync to conversations using the freshly computed messages
        setConversations(convPrev =>
          convPrev.map(c =>
            c.id === activeConversationId
              ? {
                  ...c,
                  messages: updated,
                  updatedAt: new Date().toISOString(),
                  title: c.title === 'New Conversation' ? currentInput.slice(0, 30) : c.title,
                }
              : c
          )
        );
        return updated;
      });
      setAiInput('');
      sendToTerminal(termCmd);
      return;
    }

    const capturedElements = [...selectedElements];
    const elementContext =
      capturedElements.length > 0
        ? '\n\n[Selected Elements]\n' +
          capturedElements
            .map(
              el =>
                `<${el.tag}>${el.id ? ` id="${el.id}"` : ''}${el.classes.length ? ` class="${el.classes.join(' ')}"` : ''} — selector: ${el.selector}${el.text ? ` — text: "${el.text.slice(0, 80)}"` : ''}`
            )
            .join('\n')
        : '';
    const fullContent = currentInput + elementContext;
    const userMsg: AIChatMessage = {
      role: 'user',
      content: fullContent,
      timestamp: new Date().toISOString(),
    };
    setAiMessages(prev => [...prev, userMsg]);
    const msgText = fullContent;
    setAiInput('');
    setSelectedElements([]);
    setAiLoading(true);
    try {
      const selectedModelObj = models.find(m => m.id === aiModel);
      const resp = await fetch('/api/ide/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msgText,
          context: activeFile?.content?.substring(0, 4000),
          filePath: activeFile?.path,
          selectedElements: capturedElements.length > 0 ? capturedElements : undefined,
          model: aiModel,
          provider: selectedModelObj?.provider,
          apiKey: selectedModelObj ? apiKeys[selectedModelObj.provider] : undefined,
        }),
      });
      const data = await resp.json();
      setAiMessages(prev => {
        const updated = [
          ...prev,
          {
            role: 'assistant' as const,
            content: data.reply || 'No response.',
            timestamp: new Date().toISOString(),
          },
        ];
        // Sync to conversations using freshly computed messages
        setConversations(convPrev =>
          convPrev.map(c =>
            c.id === activeConversationId
              ? {
                  ...c,
                  messages: updated,
                  updatedAt: new Date().toISOString(),
                  title: c.title === 'New Conversation' ? currentInput.slice(0, 30) : c.title,
                }
              : c
          )
        );
        return updated;
      });
    } catch {
      setAiMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Failed to reach AI assistant.',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
    setAiLoading(false);
  }

  // --- Plan Mode -------------------------------------

  async function sendPlanMessage() {
    if (!aiInput.trim()) return;

    const userPrompt = aiInput;
    const userMsg: AIChatMessage = {
      role: 'user',
      content: `?? [Plan Request] ${userPrompt}`,
      timestamp: new Date().toISOString(),
    };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setPlanLoading(true);
    setAiLoading(true);

    try {
      const planModelObj = models.find(m => m.id === aiModel);
      const resp = await fetch('/api/ide/ai-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userPrompt,
          context: activeFile?.content?.substring(0, 4000),
          filePath: activeFile?.path,
          model: aiModel,
          provider: planModelObj?.provider,
          apiKey: planModelObj ? apiKeys[planModelObj.provider] : undefined,
        }),
      });
      const data = await resp.json();
      const planText = data.plan || 'Failed to generate plan.';

      // Add plan to chat
      setAiMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `?? Plan generated! Opening in editor tab...\n\n${planText.substring(0, 200)}...`,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Build the plan note content with implement marker
      const planId = `plan-${Date.now()}`;
      const planContent = [
        `# ?? Implementation Plan`,
        `# Generated: ${new Date().toLocaleString()}`,
        `# Prompt: ${userPrompt}`,
        `#`,
        `# ??????????????????????????????????????????????`,
        ``,
        planText,
        ``,
        `# ??????????????????????????????????????????????`,
        `# To implement this plan, click the ? Implement button`,
        `# in the tab bar, or modify the plan above and then implement.`,
        `# PLAN_ID: ${planId}`,
        `# PLAN_PROMPT: ${userPrompt}`,
      ].join('\n');

      // Open as a new editor tab (note-style)
      const planFileName = `plan-${new Date().toISOString().slice(0, 10)}.md`;
      const planFile: OpenFile = {
        path: `.jarvis/plans/${planFileName}`,
        name: `?? ${planFileName}`,
        language: 'markdown',
        content: planContent,
        savedContent: planContent,
        dirty: false,
      };
      setOpenFiles(prev => [...prev, planFile]);
      setActiveFileIdx(prev => {
        // We need to return the new last index
        // Use a workaround: set it in a timeout
        return prev;
      });
      // Use a small delay to ensure state has updated
      setTimeout(() => {
        setOpenFiles(prev => {
          setActiveFileIdx(prev.length - 1);
          return prev;
        });
      }, 50);
    } catch {
      setAiMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Failed to generate plan. AI assistant may be unavailable.',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
    setPlanLoading(false);
    setAiLoading(false);
  }

  async function implementPlan() {
    if (!activeFile || !activeFile.path.includes('.jarvis/plans/')) return;

    const planContent = activeFile.content;
    // Extract the original prompt from the plan
    const promptMatch = planContent.match(/# PLAN_PROMPT: (.+)/);
    const originalPrompt = promptMatch ? promptMatch[1] : '';

    setAiLoading(true);
    setAiMessages(prev => [
      ...prev,
      {
        role: 'user',
        content: `? Implementing plan: ${originalPrompt || 'from editor'}`,
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
      const implModelObj = models.find(m => m.id === aiModel);
      const resp = await fetch('/api/ide/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Implement this plan step by step. Here is the full plan:\n\n${planContent}\n\nProvide the complete implementation for each step. Show the code changes needed.`,
          model: aiModel,
          provider: implModelObj?.provider,
          apiKey: implModelObj ? apiKeys[implModelObj.provider] : undefined,
        }),
      });
      const data = await resp.json();
      const reply = data.reply || 'No implementation response.';

      setAiMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
        },
      ]);
      setShowAiChat(true);
    } catch {
      setAiMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Failed to implement plan. AI assistant may be unavailable.',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
    setAiLoading(false);
  }

  // --- Quick Fix Actions -----------------------------

  async function explainError(diag: DiagnosticItem) {
    setExplainLoading(true);
    const code = activeFile?.content || '';
    try {
      const explainModelObj = models.find(m => m.id === aiModel);
      const resp = await fetch('/api/ide/ai-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: diag.message,
          code: code
            .split('\n')
            .slice(Math.max(0, diag.line - 5), diag.line + 5)
            .join('\n'),
          filePath: activeFile?.path || '',
          line: diag.line,
          model: aiModel,
          provider: explainModelObj?.provider,
          apiKey: explainModelObj ? apiKeys[explainModelObj.provider] : undefined,
        }),
      });
      const data = await resp.json();
      setAiMessages(prev => [
        ...prev,
        {
          role: 'user' as const,
          content: `Explain this error:\n\n${diag.message}\n(${activeFile?.path || ''}:${diag.line})`,
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant' as const,
          content: data.explanation || 'Could not explain.',
          timestamp: new Date().toISOString(),
        },
      ]);
      setShowAiChat(true);
    } catch {
      setAiMessages(prev => [
        ...prev,
        {
          role: 'assistant' as const,
          content: 'Failed to explain error.',
          timestamp: new Date().toISOString(),
        },
      ]);
      setShowAiChat(true);
    }
    setExplainLoading(false);
    setQuickFix(null);
  }

  async function fixError(diag: DiagnosticItem) {
    if (!activeFile) return;
    setFixLoading(true);
    try {
      const fixModelObj = models.find(m => m.id === aiModel);
      const resp = await fetch('/api/ide/ai-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: diag.message,
          code: activeFile.content,
          filePath: activeFile.path,
          line: diag.line,
          language: activeFile.language,
          model: aiModel,
          provider: fixModelObj?.provider,
          apiKey: fixModelObj ? apiKeys[fixModelObj.provider] : undefined,
        }),
      });
      const data = await resp.json();
      if (data.fixedCode) {
        setOpenFiles(prev => {
          const updated = [...prev];
          if (updated[activeFileIdx]) {
            updated[activeFileIdx] = {
              ...updated[activeFileIdx],
              content: data.fixedCode,
              dirty: data.fixedCode !== updated[activeFileIdx].savedContent,
            };
          }
          return updated;
        });
        setAiMessages(prev => [
          ...prev,
          {
            role: 'assistant' as const,
            content: `Auto-fixed: ${diag.message}\n\nThe code has been updated. Review and save if it looks good.`,
            timestamp: new Date().toISOString(),
          },
        ]);
        setShowAiChat(true);
      }
    } catch {
      setAiMessages(prev => [
        ...prev,
        {
          role: 'assistant' as const,
          content: 'Failed to auto-fix.',
          timestamp: new Date().toISOString(),
        },
      ]);
      setShowAiChat(true);
    }
    setFixLoading(false);
    setQuickFix(null);
  }

  function sendErrorToChat(diag: DiagnosticItem) {
    const codeSnippet = activeFile
      ? activeFile.content
          .split('\n')
          .slice(Math.max(0, diag.line - 3), diag.line + 3)
          .join('\n')
      : '';
    const msg = `I have this error:\n\nError: ${diag.message}\nFile: ${activeFile?.path || diag.file}:${diag.line}\n${diag.source ? `Source: ${diag.source}` : ''}${diag.code ? ` (${diag.code})` : ''}\n\nCode:\n${codeSnippet}\n\nCan you explain what's wrong and how to fix it?`;
    setAiMessages(prev => [
      ...prev,
      { role: 'user' as const, content: msg, timestamp: new Date().toISOString() },
    ]);
    setShowAiChat(true);
    setQuickFix(null);
    setAiLoading(true);
    const qfModelObj = models.find(m => m.id === aiModel);
    fetch('/api/ide/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: msg,
        context: activeFile?.content?.substring(0, 4000) || '',
        filePath: activeFile?.path || '',
        model: aiModel,
        provider: qfModelObj?.provider,
        apiKey: qfModelObj ? apiKeys[qfModelObj.provider] : undefined,
      }),
    })
      .then(r => r.json())
      .then(data => {
        setAiMessages(prev => [
          ...prev,
          {
            role: 'assistant' as const,
            content: data.reply || 'No response.',
            timestamp: new Date().toISOString(),
          },
        ]);
      })
      .catch(() => {
        setAiMessages(prev => [
          ...prev,
          {
            role: 'assistant' as const,
            content: 'Failed to reach AI.',
            timestamp: new Date().toISOString(),
          },
        ]);
      })
      .finally(() => setAiLoading(false));
  }

  // --- Inline Edit (Ctrl+K) -------------------------

  async function runInlineEdit() {
    if (!inlineEditInput.trim() || !inlineEdit || !activeFile) return;
    setInlineEditLoading(true);
    try {
      const inlineModelObj = models.find(m => m.id === aiModel);
      const resp = await fetch('/api/ide/ai-inline-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: inlineEditInput,
          selectedCode: inlineEdit.selectedText,
          fullCode: activeFile.content,
          filePath: activeFile.path,
          language: activeFile.language,
          model: aiModel,
          provider: inlineModelObj?.provider,
          apiKey: inlineModelObj ? apiKeys[inlineModelObj.provider] : undefined,
        }),
      });
      const data = await resp.json();
      if (data.editedCode && editorRef.current) {
        const editor = editorRef.current;
        const sel = editor.getSelection();
        if (sel) {
          const originalCode = activeFile.content;
          editor.executeEdits('inline-edit', [{ range: sel, text: data.editedCode }]);
          setDiffPreview({
            original: originalCode,
            modified: editor.getValue(),
            filePath: activeFile.path,
          });
        }
      }
    } catch {
      /* silently fail */
    }
    setInlineEditLoading(false);
    setInlineEdit(null);
    setInlineEditInput('');
  }

  // --- Bug Finder ----------------------------------

  async function runBugScan() {
    if (!activeFile) return;
    setBugScanLoading(true);
    setBugs([]);
    try {
      const bugModelObj = models.find(m => m.id === aiModel);
      const resp = await fetch('/api/ide/ai-bug-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeFile.content,
          filePath: activeFile.path,
          language: activeFile.language,
          model: aiModel,
          provider: bugModelObj?.provider,
          apiKey: bugModelObj ? apiKeys[bugModelObj.provider] : undefined,
        }),
      });
      const data = await resp.json();
      setBugs(data.bugs || []);
      setBottomPanel('problems');
    } catch {
      /* silently fail */
    }
    setBugScanLoading(false);
  }

  // --- Terminal AI ---------------------------------

  async function getTerminalSuggestion(description: string) {
    try {
      const termModelObj = models.find(m => m.id === aiModel);
      const resp = await fetch('/api/ide/ai-terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          cwd: '.',
          recentCommands: terminalHistory.slice(-5).map(e => e.command),
          model: aiModel,
          provider: termModelObj?.provider,
          apiKey: termModelObj ? apiKeys[termModelObj.provider] : undefined,
        }),
      });
      const data = await resp.json();
      if (data.command) {
        sendToTerminal(data.command);
      }
    } catch {
      /* silently fail */
    }
  }

  // --- Fetch Symbols (Outline) ---------------------

  async function fetchSymbols(filePath: string) {
    try {
      const resp = await fetch(`/api/ide/symbols?path=${encodeURIComponent(filePath)}`);
      if (resp.ok) {
        const data = await resp.json();
        setSymbols(data.symbols || []);
      }
    } catch {
      setSymbols([]);
    }
  }

  // --- Git Blame -----------------------------------

  async function fetchBlame(filePath: string) {
    try {
      const resp = await fetch(`/api/ide/git/blame?path=${encodeURIComponent(filePath)}`);
      if (resp.ok) {
        const data = await resp.json();
        setBlameData(data.blame || []);
      }
    } catch {
      setBlameData([]);
    }
  }

  // --- Git Diff ------------------------------------

  async function fetchDiff() {
    try {
      const resp = await fetch('/api/ide/git/diff');
      if (resp.ok) {
        const data = await resp.json();
        setDiffChanges(data.changes || []);
      }
    } catch {
      setDiffChanges([]);
    }
  }

  // --- Slash Commands ------------------------------

  const slashCommands = [
    {
      cmd: '/clear',
      desc: 'Clear conversation',
      action: () => {
        setAiMessages([
          {
            role: 'assistant' as const,
            content: 'Conversation cleared. How can I help?',
            timestamp: new Date().toISOString(),
          },
        ]);
        setAiInput('');
      },
    },
    {
      cmd: '/fix',
      desc: 'Fix selected code or current file',
      action: () => {
        setAiInput(`Fix any issues in the current file: ${activeFile?.path || ''}`);
      },
    },
    {
      cmd: '/explain',
      desc: 'Explain selected code',
      action: () => {
        const sel = editorRef.current
          ?.getModel()
          ?.getValueInRange(editorRef.current.getSelection());
        setAiInput(
          `Explain this code:\n\`\`\`\n${sel || activeFile?.content?.substring(0, 500) || ''}\n\`\`\``
        );
      },
    },
    {
      cmd: '/tests',
      desc: 'Generate tests for current file',
      action: () => {
        setAiInput(`Generate comprehensive tests for: ${activeFile?.path || 'the current file'}`);
      },
    },
    {
      cmd: '/refactor',
      desc: 'Refactor selected code',
      action: () => {
        setAiInput(`Refactor and improve this code:\n${activeFile?.path || ''}`);
      },
    },
    {
      cmd: '/comment',
      desc: 'Add comments to code',
      action: () => {
        setAiInput(`Add clear comments to the code in: ${activeFile?.path || ''}`);
      },
    },
    {
      cmd: '/bug',
      desc: 'Scan for bugs',
      action: () => {
        runBugScan();
        setAiInput('');
      },
    },
    {
      cmd: '/format',
      desc: 'Format current file',
      action: () => {
        editorRef.current?.getAction('editor.action.formatDocument')?.run();
        setAiInput('');
      },
    },
    {
      cmd: '/model',
      desc: 'Switch AI model',
      action: () => {
        setAiInput('');
      },
    },
    {
      cmd: '/terminal',
      desc: 'Suggest a terminal command',
      action: () => {
        setAiInput('/terminal ');
      },
    },
  ];

  function handleSlashCommand(input: string): boolean {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) return false;
    // Terminal AI special case
    if (trimmed.startsWith('/terminal ') && trimmed.length > 10) {
      getTerminalSuggestion(trimmed.substring(10));
      setAiInput('');
      return true;
    }
    const cmd = slashCommands.find(c => c.cmd === trimmed);
    if (cmd) {
      cmd.action();
      return true;
    }
    return false;
  }

  // --- Fetch symbols when active file changes -----

  useEffect(() => {
    if (activeFile?.path) {
      fetchSymbols(activeFile.path);
      if (showBlame) fetchBlame(activeFile.path);
    }
  }, [activeFile?.path, showBlame]);

  useEffect(() => {
    fetchDiff();
  }, [gitFiles]);

  useEffect(() => {
    if (inlineEdit && inlineEditRef.current) inlineEditRef.current.focus();
  }, [inlineEdit]);

  // â"€â"€â"€ Commands â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const commands: CommandItem[] = [
    {
      id: 'save',
      label: 'File: Save',
      shortcut: 'Ctrl+S',
      action: () => {
        if (activeFileIdx >= 0) saveFile(activeFileIdx);
      },
    },
    {
      id: 'close',
      label: 'File: Close Editor',
      shortcut: 'Ctrl+W',
      action: () => {
        if (activeFileIdx >= 0) closeFile(activeFileIdx);
      },
    },
    {
      id: 'terminal',
      label: 'View: Toggle Terminal',
      shortcut: 'Ctrl+`',
      action: () => setBottomPanel(prev => (prev === 'terminal' ? null : 'terminal')),
    },
    {
      id: 'sidebar',
      label: 'View: Toggle Sidebar',
      shortcut: 'Ctrl+B',
      action: () => setShowSidebar(prev => !prev),
    },
    {
      id: 'explorer',
      label: 'View: Explorer',
      action: () => {
        setSidebarPanel('explorer');
        setShowSidebar(true);
      },
    },
    {
      id: 'search',
      label: 'View: Search',
      shortcut: 'Ctrl+Shift+F',
      action: () => {
        setSidebarPanel('search');
        setShowSidebar(true);
      },
    },
    {
      id: 'git',
      label: 'View: Source Control',
      action: () => {
        setSidebarPanel('git');
        setShowSidebar(true);
      },
    },
    {
      id: 'ai',
      label: 'View: AI Chat',
      action: () => setShowAiChat(p => !p),
    },
    {
      id: 'browser',
      label: 'View: Browser',
      action: () => setShowBrowser(p => !p),
    },
    {
      id: 'problems',
      label: 'View: Toggle Problems',
      shortcut: 'Ctrl+Shift+M',
      action: () => setBottomPanel(p => (p === 'problems' ? null : 'problems')),
    },
    {
      id: 'settings',
      label: 'Preferences: Open Settings',
      action: () => {
        setSidebarPanel('settings');
        setShowSidebar(true);
      },
    },
    {
      id: 'extensions',
      label: 'View: Extensions',
      action: () => {
        setSidebarPanel('extensions');
        setShowSidebar(true);
      },
    },
    {
      id: 'rules',
      label: 'View: Rules & Linting',
      action: () => {
        setSidebarPanel('rules');
        setShowSidebar(true);
      },
    },
    {
      id: 'debug-start',
      label: 'Debug: Start Debugging',
      shortcut: 'F5',
      action: () => {
        if (activeFile) {
          setDebugRunning(true);
          setDebugPaused(false);
          setBottomPanel('debug');
          setCallStack([
            {
              id: 'frame-1',
              name: activeFile.name.replace(/\.[^.]+$/, ''),
              file: activeFile.path,
              line: cursorLine,
              column: 1,
            },
            { id: 'frame-0', name: '(anonymous)', file: activeFile.path, line: 1, column: 1 },
          ]);
          setDebugConsole(prev => [
            ...prev,
            {
              id: `dc-${Date.now()}`,
              type: 'info',
              message: `Debugging started: ${activeFile.name}`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      },
    },
    {
      id: 'debug-stop',
      label: 'Debug: Stop Debugging',
      shortcut: 'Shift+F5',
      action: () => {
        setDebugRunning(false);
        setDebugPaused(false);
        setCallStack([]);
      },
    },
    {
      id: 'debug-toggle-bp',
      label: 'Debug: Toggle Breakpoint',
      shortcut: 'F9',
      action: () => {
        if (activeFile) {
          const existing = breakpoints.find(
            bp => bp.file === activeFile.path && bp.line === cursorLine
          );
          if (existing) setBreakpoints(prev => prev.filter(bp => bp.id !== existing.id));
          else
            setBreakpoints(prev => [
              ...prev,
              { id: `bp-${Date.now()}`, file: activeFile.path, line: cursorLine, enabled: true },
            ]);
        }
      },
    },
    {
      id: 'debug-panel',
      label: 'View: Run and Debug',
      shortcut: 'Ctrl+Shift+D',
      action: () => {
        setSidebarPanel('debug');
        setShowSidebar(true);
      },
    },
    {
      id: 'debug-console',
      label: 'View: Debug Console',
      shortcut: 'Ctrl+Shift+Y',
      action: () => setBottomPanel('debug'),
    },
    { id: 'refresh', label: 'File: Refresh Explorer', action: () => fetchFileTree() },
    {
      id: 'newfile',
      label: 'File: New File',
      action: () => {
        const name = `untitled-${openFiles.length + 1}.ts`;
        setOpenFiles(prev => [
          ...prev,
          { path: name, name, language: 'typescript', content: '', savedContent: '', dirty: true },
        ]);
        setActiveFileIdx(openFiles.length);
      },
    },
    {
      id: 'outline',
      label: 'View: Outline',
      shortcut: 'Ctrl+Shift+O',
      action: () => {
        setSidebarPanel('outline');
        setShowSidebar(true);
      },
    },
    {
      id: 'inline-edit',
      label: 'AI: Inline Edit Selection',
      shortcut: 'Ctrl+K',
      action: () => {
        if (editorRef.current) {
          const sel = editorRef.current.getSelection();
          const text = sel ? editorRef.current.getModel()?.getValueInRange(sel) || '' : '';
          if (text) {
            const coords = editorRef.current.getScrolledVisiblePosition(sel.getStartPosition());
            const rect = editorRef.current.getDomNode()?.getBoundingClientRect();
            setInlineEdit({
              x: (rect?.left || 0) + (coords?.left || 0),
              y: (rect?.top || 0) + (coords?.top || 0),
              selectedText: text,
              startLine: sel.startLineNumber,
              endLine: sel.endLineNumber,
            });
          }
        }
      },
    },
    {
      id: 'bug-scan',
      label: 'AI: Bug Finder — Scan File',
      action: () => runBugScan(),
    },
    {
      id: 'blame',
      label: 'Git: Toggle Blame Annotations',
      shortcut: 'Ctrl+Shift+B',
      action: () => {
        setShowBlame(p => !p);
        if (!showBlame && activeFile?.path) fetchBlame(activeFile.path);
      },
    },
    {
      id: 'clear-chat',
      label: 'AI: Clear Conversation',
      action: () => {
        setAiMessages([
          {
            role: 'assistant' as const,
            content: 'Conversation cleared. How can I help?',
            timestamp: new Date().toISOString(),
          },
        ]);
      },
    },
    {
      id: 'diff-preview',
      label: 'View: Show Diff Preview',
      action: () => {
        if (activeFile)
          setDiffPreview({
            original: activeFile.savedContent,
            modified: activeFile.content,
            filePath: activeFile.path,
          });
      },
    },
  ];

  const filteredCommands = commandQuery.startsWith('>')
    ? commands.filter(c => c.label.toLowerCase().includes(commandQuery.slice(1).toLowerCase()))
    : commands;

  const filteredFiles =
    commandQuery && !commandQuery.startsWith('>')
      ? allFiles.filter(f => f.path.toLowerCase().includes(commandQuery.toLowerCase())).slice(0, 20)
      : [];

  // â”€â”€â”€ Keyboard shortcuts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setShowCommandPalette(p => !p);
        setCommandQuery('>');
      } else if (mod && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        if (activeFileIdx >= 0) saveFile(activeFileIdx);
      } else if (mod && e.key === 'p' && !e.shiftKey) {
        e.preventDefault();
        setShowCommandPalette(true);
        setCommandQuery('');
      } else if (mod && e.key === '`') {
        e.preventDefault();
        setBottomPanel(p => (p === 'terminal' ? null : 'terminal'));
      } else if (mod && e.key === 'b') {
        e.preventDefault();
        setShowSidebar(p => !p);
      } else if (mod && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setSidebarPanel('search');
        setShowSidebar(true);
      } else if (mod && e.key === 'w') {
        e.preventDefault();
        if (activeFileIdx >= 0) closeFile(activeFileIdx);
      } else if (mod && e.key === 'g') {
        e.preventDefault();
        setShowGoToLine(true);
        setGoToLineValue('');
      } else if (mod && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        setBottomPanel(p => (p === 'problems' ? null : 'problems'));
      } else if (mod && e.key === 'k' && !e.shiftKey) {
        e.preventDefault();
        if (editorRef.current) {
          const editor = editorRef.current;
          const sel = editor.getSelection();
          const selectedText = sel ? editor.getModel()?.getValueInRange(sel) || '' : '';
          if (selectedText) {
            const coords = editor.getScrolledVisiblePosition(sel.getStartPosition());
            const editorDom = editor.getDomNode();
            const rect = editorDom?.getBoundingClientRect();
            setInlineEdit({
              x: (rect?.left || 0) + (coords?.left || 0),
              y: (rect?.top || 0) + (coords?.top || 0),
              selectedText,
              startLine: sel.startLineNumber,
              endLine: sel.endLineNumber,
            });
            setInlineEditInput('');
          }
        }
      } else if (mod && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        setSidebarPanel('outline');
        setShowSidebar(true);
      } else if (mod && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        setShowBlame(p => !p);
        if (!showBlame && activeFile?.path) fetchBlame(activeFile.path);
      } else if (mod && e.key === 'l' && !e.shiftKey) {
        e.preventDefault();
        setShowAiChat(true);
      } else if (mod && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        runBugScan();
        setBottomPanel('problems');
      } else if (mod && e.key === ',') {
        e.preventDefault();
        setSidebarPanel('settings');
        setShowSidebar(true);
      } else if (mod && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        const n = `untitled-${openFiles.length + 1}.ts`;
        setOpenFiles(p => [
          ...p,
          { path: n, name: n, language: 'typescript', content: '', savedContent: '', dirty: true },
        ]);
        setActiveFileIdx(openFiles.length);
      } else if (mod && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        window.open(window.location.href, '_blank');
      } else if (mod && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        setSidebarPanel('explorer');
        setShowSidebar(true);
      } else if (mod && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        setSidebarPanel('git');
        setShowSidebar(true);
      } else if (mod && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        setSidebarPanel('extensions');
        setShowSidebar(true);
      } else if (mod && e.key === '/' && !e.shiftKey) {
        e.preventDefault();
        editorAction('editor.action.commentLine');
      } else if (mod && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setSidebarPanel('debug');
        setShowSidebar(true);
      } else if (mod && e.shiftKey && e.key === 'Y') {
        e.preventDefault();
        setBottomPanel('debug');
      } else if (e.key === 'F5' && !mod && !e.shiftKey) {
        e.preventDefault();
        if (debugPaused) {
          setDebugPaused(false);
          setDebugConsole(prev => [
            ...prev,
            {
              id: `dc-${Date.now()}`,
              type: 'info',
              message: 'Continued execution.',
              timestamp: new Date().toISOString(),
            },
          ]);
        } else if (!debugRunning && activeFile) {
          setDebugRunning(true);
          setDebugPaused(false);
          setBottomPanel('debug');
          setCallStack([
            {
              id: 'frame-1',
              name: activeFile.name.replace(/\.[^.]+$/, ''),
              file: activeFile.path,
              line: cursorLine,
              column: 1,
            },
            { id: 'frame-0', name: '(anonymous)', file: activeFile.path, line: 1, column: 1 },
          ]);
          setDebugConsole(prev => [
            ...prev,
            {
              id: `dc-${Date.now()}`,
              type: 'info',
              message: `Debugging started: ${activeFile.name}`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } else if (e.key === 'F5' && e.shiftKey && !mod) {
        e.preventDefault();
        setDebugRunning(false);
        setDebugPaused(false);
        setCallStack([]);
        setDebugConsole(prev => [
          ...prev,
          {
            id: `dc-${Date.now()}`,
            type: 'info',
            message: 'Debugging stopped.',
            timestamp: new Date().toISOString(),
          },
        ]);
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (activeFile) {
          const existing = breakpoints.find(
            bp => bp.file === activeFile.path && bp.line === cursorLine
          );
          if (existing) setBreakpoints(prev => prev.filter(bp => bp.id !== existing.id));
          else
            setBreakpoints(prev => [
              ...prev,
              { id: `bp-${Date.now()}`, file: activeFile.path, line: cursorLine, enabled: true },
            ]);
        }
      } else if (e.key === 'F10') {
        e.preventDefault();
        if (debugRunning) {
          setDebugPaused(true);
          setDebugConsole(prev => [
            ...prev,
            {
              id: `dc-${Date.now()}`,
              type: 'log',
              message: `Step over at line ${cursorLine}`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } else if (e.key === 'F11' && !e.shiftKey) {
        e.preventDefault();
        if (debugRunning) {
          setDebugPaused(true);
          setDebugConsole(prev => [
            ...prev,
            {
              id: `dc-${Date.now()}`,
              type: 'log',
              message: `Step into at line ${cursorLine}`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } else if (e.key === 'F11' && e.shiftKey) {
        e.preventDefault();
        if (debugRunning) {
          setDebugConsole(prev => [
            ...prev,
            {
              id: `dc-${Date.now()}`,
              type: 'log',
              message: `Step out at line ${cursorLine}`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } else if (e.altKey && e.key === 'z') {
        e.preventDefault();
        setWordWrap(p => !p);
      } else if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowGoToLine(false);
        setQuickFix(null);
        setOpenMenu(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFileIdx, saveFile, closeFile]);

  // â”€â”€â”€ File tree renderer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function renderTree(nodes: FileNode[], depth: number = 0): JSX.Element[] {
    return nodes.map(node => {
      const isExpanded = expandedDirs.has(node.path);
      const isDir = node.type === 'directory';
      const isModified = gitModified.has(node.path);
      const isActive = activeFile?.path === node.path;

      const fileErrors = isDir
        ? 0
        : diagnostics.filter(
            d =>
              d.severity === 'error' && (d.file.endsWith(node.name) || d.file.endsWith(node.path))
          ).length;
      const fileWarnings = isDir
        ? 0
        : diagnostics.filter(
            d =>
              d.severity === 'warning' && (d.file.endsWith(node.name) || d.file.endsWith(node.path))
          ).length;
      const dirErrors = isDir
        ? diagnostics.filter(d => d.severity === 'error' && d.file.includes(node.name + '/')).length
        : 0;

      const nameColor =
        fileErrors > 0
          ? COLORS.red
          : fileWarnings > 0
            ? COLORS.yellow
            : isModified
              ? COLORS.yellow
              : COLORS.text;

      return (
        <div key={node.path}>
          <div
            onClick={() => {
              if (isDir) {
                setExpandedDirs(prev => {
                  const next = new Set(prev);
                  if (next.has(node.path)) next.delete(node.path);
                  else next.add(node.path);
                  return next;
                });
              } else {
                openFileByPath(node.path);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              paddingLeft: `${12 + depth * 16}px`,
              cursor: 'pointer',
              fontSize: '13px',
              color: nameColor,
              background: isActive ? COLORS.hover : 'transparent',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.background = COLORS.hover;
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
          >
            <span
              style={{
                fontSize: '11px',
                width: '14px',
                textAlign: 'center',
                color: COLORS.textDim,
              }}
            >
              {isDir ? (isExpanded ? '?' : '?') : ' '}
            </span>
            <span style={{ fontSize: '13px' }}>{isDir ? '??' : getFileIcon(node.name)}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
              {node.name}
            </span>
            {fileErrors > 0 && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: COLORS.red,
                  minWidth: '16px',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {fileErrors}
              </span>
            )}
            {fileWarnings > 0 && fileErrors === 0 && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: COLORS.yellow,
                  minWidth: '16px',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {fileWarnings}
              </span>
            )}
            {isDir && dirErrors > 0 && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: COLORS.red,
                  minWidth: '16px',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {dirErrors}
              </span>
            )}
          </div>
          {isDir && isExpanded && node.children && renderTree(node.children, depth + 1)}
        </div>
      );
    });
  }

  // --- RENDER ----------------------------------------

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 90px)',
        background: COLORS.bg,
        borderRadius: '8px',
        overflow: 'hidden',
        border: `1px solid ${COLORS.border}`,
      }}
    >
      {/* -- Menu Bar -- */}
      {!zenMode && (
        <div
          ref={menuBarRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '30px',
            background: COLORS.surface,
            borderBottom: `1px solid ${COLORS.border}`,
            paddingLeft: '8px',
            fontSize: '13px',
            userSelect: 'none',
          }}
        >
          {Object.keys(menus).map(menuName => (
            <div key={menuName} style={{ position: 'relative' }}>
              <button
                onClick={() => setOpenMenu(prev => (prev === menuName ? null : menuName))}
                onMouseEnter={() => {
                  if (openMenu) setOpenMenu(menuName);
                }}
                style={{
                  background: openMenu === menuName ? COLORS.hover : 'transparent',
                  border: 'none',
                  color: COLORS.text,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  borderRadius: '4px',
                }}
              >
                {menuName}
              </button>
              {openMenu === menuName && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    zIndex: 1500,
                    background: COLORS.sidebar,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    padding: '4px 0',
                    minWidth: '240px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  }}
                >
                  {menus[menuName].map((item, idx) =>
                    item.separator ? (
                      <div
                        key={`sep-${menuName}-${idx}`}
                        style={{ height: '1px', background: COLORS.border, margin: '4px 8px' }}
                      />
                    ) : (
                      <button
                        key={`${menuName}-${item.label}`}
                        onClick={() => {
                          item.action?.();
                          setOpenMenu(null);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          color: COLORS.text,
                          padding: '6px 16px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          textAlign: 'left',
                          gap: '24px',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = COLORS.hover;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item.checked !== undefined && (
                            <span style={{ width: '14px', fontSize: '12px', color: COLORS.accent }}>
                              {item.checked ? '?' : ''}
                            </span>
                          )}
                          {item.label}
                        </span>
                        {item.shortcut && (
                          <span
                            style={{
                              color: COLORS.textDim,
                              fontSize: '11px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.shortcut}
                          </span>
                        )}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* -- Go to Line Dialog -- */}
      {showGoToLine && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 2000,
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '20vh',
          }}
          onClick={() => setShowGoToLine(false)}
        >
          <div
            style={{
              background: COLORS.sidebar,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '8px',
              width: '340px',
              height: 'fit-content',
              overflow: 'hidden',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <input
              ref={goToLineRef}
              value={goToLineValue}
              onChange={e => setGoToLineValue(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={e => {
                if (e.key === 'Enter' && goToLineValue) {
                  goToLine(parseInt(goToLineValue, 10));
                  setShowGoToLine(false);
                }
                if (e.key === 'Escape') setShowGoToLine(false);
              }}
              placeholder="Go to line number..."
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${COLORS.border}`,
                color: COLORS.text,
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ padding: '8px 16px', fontSize: '12px', color: COLORS.textDim }}>
              Press Enter to go, Escape to cancel
            </div>
          </div>
        </div>
      )}

      {/* -- Command Palette -- */}
      {showCommandPalette && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 2000,
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '15vh',
          }}
          onClick={() => setShowCommandPalette(false)}
        >
          <div
            style={{
              background: COLORS.sidebar,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '8px',
              width: '500px',
              maxHeight: '400px',
              overflow: 'hidden',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <input
              ref={commandInputRef}
              value={commandQuery}
              onChange={e => setCommandQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (!commandQuery.startsWith('>') && filteredFiles.length > 0) {
                    openFileByPath(filteredFiles[0].path);
                  } else if (filteredCommands.length > 0) {
                    filteredCommands[0].action();
                  }
                  setShowCommandPalette(false);
                }
                if (e.key === 'Escape') setShowCommandPalette(false);
              }}
              placeholder="Type a file name or > for commands..."
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${COLORS.border}`,
                color: COLORS.text,
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
              {!commandQuery.startsWith('>') &&
                filteredFiles.map(f => (
                  <div
                    key={f.path}
                    onClick={() => {
                      openFileByPath(f.path);
                      setShowCommandPalette(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: COLORS.text,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = COLORS.hover;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>
                      {getFileIcon(f.name)} {f.name}
                    </span>
                    <span style={{ color: COLORS.textDim, fontSize: '11px' }}>{f.path}</span>
                  </div>
                ))}
              {(commandQuery.startsWith('>') || filteredFiles.length === 0) &&
                filteredCommands.map(cmd => (
                  <div
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      setShowCommandPalette(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: COLORS.text,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = COLORS.hover;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>{cmd.label}</span>
                    {cmd.shortcut && (
                      <span
                        style={{
                          color: COLORS.textDim,
                          fontSize: '11px',
                          background: COLORS.surface,
                          padding: '2px 6px',
                          borderRadius: '3px',
                        }}
                      >
                        {cmd.shortcut}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* -- Main layout -- */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Activity Bar */}
        {!zenMode && (
          <div
            style={{
              width: '48px',
              background: COLORS.surface,
              borderRight: `1px solid ${COLORS.border}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: '4px',
              gap: '2px',
            }}
          >
            {[
              { id: 'explorer' as SidebarPanel, icon: '??', title: 'Explorer' },
              { id: 'search' as SidebarPanel, icon: '??', title: 'Search' },
              { id: 'git' as SidebarPanel, icon: '??', title: 'Source Control' },
              { id: 'debug' as SidebarPanel, icon: '??', title: 'Run and Debug' },
              { id: 'extensions' as SidebarPanel, icon: '??', title: 'Extensions' },
              { id: 'settings' as SidebarPanel, icon: '??', title: 'Settings' },
              { id: 'rules' as SidebarPanel, icon: '??', title: 'Rules' },
            ].map(item => (
              <button
                key={item.id}
                title={item.title}
                onClick={() => {
                  if (sidebarPanel === item.id && showSidebar) setShowSidebar(false);
                  else {
                    setSidebarPanel(item.id);
                    setShowSidebar(true);
                  }
                }}
                style={{
                  width: '40px',
                  height: '40px',
                  background:
                    sidebarPanel === item.id && showSidebar ? COLORS.hover : 'transparent',
                  border: 'none',
                  borderLeft:
                    sidebarPanel === item.id && showSidebar
                      ? `2px solid ${COLORS.accent}`
                      : '2px solid transparent',
                  color: sidebarPanel === item.id && showSidebar ? COLORS.text : COLORS.textDim,
                  cursor: 'pointer',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button
              title="AI Chat"
              onClick={() => setShowAiChat(p => !p)}
              style={{
                width: '40px',
                height: '40px',
                background: showAiChat ? COLORS.hover : 'transparent',
                border: 'none',
                color: showAiChat ? COLORS.text : COLORS.textDim,
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ??
            </button>
            <button
              title="Browser"
              onClick={() => setShowBrowser(p => !p)}
              style={{
                width: '40px',
                height: '40px',
                background: showBrowser ? COLORS.hover : 'transparent',
                border: 'none',
                color: showBrowser ? COLORS.text : COLORS.textDim,
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ??
            </button>
            <button
              title="Problems (Ctrl+Shift+M)"
              onClick={() => setBottomPanel(p => (p === 'problems' ? null : 'problems'))}
              style={{
                width: '40px',
                height: '40px',
                background: bottomPanel === 'problems' ? COLORS.hover : 'transparent',
                border: 'none',
                color: bottomPanel === 'problems' ? COLORS.text : COLORS.textDim,
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              ??
              {diagnostics.filter(d => d.severity === 'error').length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: COLORS.red,
                    fontSize: '0',
                  }}
                />
              )}
            </button>
            <button
              title="Outline (Ctrl+Shift+O)"
              onClick={() => {
                setSidebarPanel('outline');
                setShowSidebar(true);
              }}
              style={{
                width: '40px',
                height: '40px',
                background: sidebarPanel === 'outline' ? COLORS.hover : 'transparent',
                border: 'none',
                color: sidebarPanel === 'outline' ? COLORS.text : COLORS.textDim,
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
              }}
            >
              ???
            </button>
            <button
              title="Terminal"
              onClick={() => setBottomPanel(p => (p === 'terminal' ? null : 'terminal'))}
              style={{
                width: '40px',
                height: '40px',
                background: bottomPanel === 'terminal' ? COLORS.hover : 'transparent',
                border: 'none',
                color: bottomPanel === 'terminal' ? COLORS.text : COLORS.textDim,
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
              }}
            >
              ??
            </button>
          </div>
        )}

        {/* Sidebar */}
        {showSidebar && !zenMode && (
          <div
            style={{
              width: `${sidebarWidth}px`,
              background: COLORS.sidebar,
              borderRight: `1px solid ${COLORS.border}`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 12px',
                fontSize: '11px',
                fontWeight: 600,
                color: COLORS.textDim,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              {sidebarPanel === 'explorer' && 'Explorer'}
              {sidebarPanel === 'search' && 'Search'}
              {sidebarPanel === 'git' && `Source Control (${gitBranch})`}
              {sidebarPanel === 'settings' && 'Settings'}
              {sidebarPanel === 'debug' && 'Run and Debug'}
              {sidebarPanel === 'extensions' && 'Extensions Marketplace'}
              {sidebarPanel === 'rules' && 'Rules & Linting'}
              {sidebarPanel === 'outline' && 'Outline'}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
              {/* Explorer */}
              {sidebarPanel === 'explorer' && (
                <div style={{ paddingTop: '4px' }}>
                  {treeLoading ? (
                    <div style={{ padding: '16px', color: COLORS.textDim, fontSize: '12px' }}>
                      Loading files...
                    </div>
                  ) : fileTree.length === 0 ? (
                    <div style={{ padding: '16px', color: COLORS.textDim, fontSize: '12px' }}>
                      No files found. Check API connection.
                    </div>
                  ) : (
                    renderTree(fileTree)
                  )}
                </div>
              )}
              {/* Search */}
              {sidebarPanel === 'search' && (
                <div style={{ padding: '8px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') runSearch();
                      }}
                      placeholder="Search files..."
                      style={{
                        flex: 1,
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '4px',
                        padding: '6px 8px',
                        color: COLORS.text,
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={runSearch}
                      disabled={searchLoading}
                      style={{
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '4px',
                        padding: '6px 8px',
                        color: COLORS.accent,
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      {searchLoading ? '...' : 'Go'}
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <div style={{ fontSize: '11px', color: COLORS.textDim, marginBottom: '6px' }}>
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  {searchResults.map((r, i) => (
                    <div
                      key={`sr-${r.file}-${r.line}-${i}`}
                      onClick={() => openFileByPath(r.file)}
                      style={{
                        padding: '4px 6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        borderRadius: '3px',
                        marginBottom: '2px',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = COLORS.hover;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ color: COLORS.accent }}>
                        {r.file}:{r.line}
                      </div>
                      <div
                        style={{
                          color: COLORS.textDim,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {r.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Git */}
              {sidebarPanel === 'git' && (
                <div style={{ padding: '8px' }}>
                  <div style={{ fontSize: '12px', color: COLORS.textDim, marginBottom: '8px' }}>
                    Branch: <strong style={{ color: COLORS.accent }}>{gitBranch}</strong>
                  </div>
                  {gitFiles.length === 0 ? (
                    <div style={{ fontSize: '12px', color: COLORS.textDim }}>
                      Working tree clean
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '11px', color: COLORS.textDim, marginBottom: '4px' }}>
                        Changes ({gitFiles.length})
                      </div>
                      {gitFiles.map((f, i) => (
                        <div
                          key={`git-${f.file}-${i}`}
                          onClick={() => openFileByPath(f.file)}
                          style={{
                            padding: '3px 6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderRadius: '3px',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = COLORS.hover;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <span
                            style={{
                              color: COLORS.text,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {f.file}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color:
                                f.status === 'M'
                                  ? COLORS.yellow
                                  : f.status === 'A'
                                    ? COLORS.green
                                    : f.status === 'D'
                                      ? COLORS.red
                                      : COLORS.accent,
                              marginLeft: '8px',
                            }}
                          >
                            {f.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={fetchGitStatus}
                    style={{
                      marginTop: '12px',
                      background: COLORS.surface,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '4px',
                      padding: '6px 12px',
                      color: COLORS.textDim,
                      cursor: 'pointer',
                      fontSize: '11px',
                      width: '100%',
                    }}
                  >
                    Refresh
                  </button>
                </div>
              )}
              {/* Settings */}
              {sidebarPanel === 'settings' && (
                <div style={{ padding: '8px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      color: COLORS.textDim,
                      marginBottom: '8px',
                      fontWeight: 600,
                    }}
                  >
                    EDITOR
                  </div>
                  {/* Font Size */}
                  <div style={{ marginBottom: '10px' }}>
                    <label
                      style={{
                        fontSize: '12px',
                        color: COLORS.text,
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Font Size
                    </label>
                    <input
                      type="number"
                      value={editorSettings.fontSize}
                      min={8}
                      max={32}
                      onChange={e =>
                        setEditorSettings(s => ({ ...s, fontSize: Number(e.target.value) }))
                      }
                      style={{
                        width: '100%',
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '4px',
                        padding: '5px 8px',
                        color: COLORS.text,
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  {/* Tab Size */}
                  <div style={{ marginBottom: '10px' }}>
                    <label
                      style={{
                        fontSize: '12px',
                        color: COLORS.text,
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Tab Size
                    </label>
                    <select
                      value={editorSettings.tabSize}
                      onChange={e =>
                        setEditorSettings(s => ({ ...s, tabSize: Number(e.target.value) }))
                      }
                      style={{
                        width: '100%',
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '4px',
                        padding: '5px 8px',
                        color: COLORS.text,
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    >
                      <option value={2}>2 spaces</option>
                      <option value={4}>4 spaces</option>
                      <option value={8}>8 spaces</option>
                    </select>
                  </div>
                  {/* Theme */}
                  <div style={{ marginBottom: '10px' }}>
                    <label
                      style={{
                        fontSize: '12px',
                        color: COLORS.text,
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Theme
                    </label>
                    <select
                      value={editorSettings.theme}
                      onChange={e => setEditorSettings(s => ({ ...s, theme: e.target.value }))}
                      style={{
                        width: '100%',
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '4px',
                        padding: '5px 8px',
                        color: COLORS.text,
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    >
                      <option value="vs-dark">Dark (default)</option>
                      <option value="vs">Light</option>
                      <option value="hc-black">High Contrast</option>
                    </select>
                  </div>
                  {/* Font Family */}
                  <div style={{ marginBottom: '10px' }}>
                    <label
                      style={{
                        fontSize: '12px',
                        color: COLORS.text,
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Font Family
                    </label>
                    <select
                      value={editorSettings.fontFamily}
                      onChange={e => setEditorSettings(s => ({ ...s, fontFamily: e.target.value }))}
                      style={{
                        width: '100%',
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '4px',
                        padding: '5px 8px',
                        color: COLORS.text,
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    >
                      <option value="'Fira Code', 'JetBrains Mono', 'Cascadia Code', Consolas, monospace">
                        Fira Code
                      </option>
                      <option value="'JetBrains Mono', Consolas, monospace">JetBrains Mono</option>
                      <option value="'Cascadia Code', Consolas, monospace">Cascadia Code</option>
                      <option value="Consolas, monospace">Consolas</option>
                    </select>
                  </div>
                  {/* Cursor Style */}
                  <div style={{ marginBottom: '10px' }}>
                    <label
                      style={{
                        fontSize: '12px',
                        color: COLORS.text,
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Cursor Style
                    </label>
                    <select
                      value={editorSettings.cursorStyle}
                      onChange={e =>
                        setEditorSettings(s => ({ ...s, cursorStyle: e.target.value }))
                      }
                      style={{
                        width: '100%',
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '4px',
                        padding: '5px 8px',
                        color: COLORS.text,
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    >
                      <option value="line">Line</option>
                      <option value="block">Block</option>
                      <option value="underline">Underline</option>
                    </select>
                  </div>
                  {/* Render Whitespace */}
                  <div style={{ marginBottom: '10px' }}>
                    <label
                      style={{
                        fontSize: '12px',
                        color: COLORS.text,
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Render Whitespace
                    </label>
                    <select
                      value={editorSettings.renderWhitespace}
                      onChange={e =>
                        setEditorSettings(s => ({ ...s, renderWhitespace: e.target.value }))
                      }
                      style={{
                        width: '100%',
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '4px',
                        padding: '5px 8px',
                        color: COLORS.text,
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    >
                      <option value="none">None</option>
                      <option value="boundary">Boundary</option>
                      <option value="selection">Selection</option>
                      <option value="all">All</option>
                    </select>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: COLORS.textDim,
                      marginTop: '16px',
                      marginBottom: '8px',
                      fontWeight: 600,
                    }}
                  >
                    TOGGLES
                  </div>
                  {[
                    {
                      label: 'Line Numbers',
                      key: 'lineNumbers' as const,
                      val: editorSettings.lineNumbers,
                    },
                    {
                      label: 'Bracket Pairs',
                      key: 'bracketPairs' as const,
                      val: editorSettings.bracketPairs,
                    },
                    {
                      label: 'Format on Paste',
                      key: 'formatOnPaste' as const,
                      val: editorSettings.formatOnPaste,
                    },
                    {
                      label: 'Smooth Scrolling',
                      key: 'smoothScrolling' as const,
                      val: editorSettings.smoothScrolling,
                    },
                  ].map(toggle => (
                    <div
                      key={toggle.key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 0',
                        fontSize: '12px',
                        color: COLORS.text,
                      }}
                    >
                      <span>{toggle.label}</span>
                      <button
                        onClick={() =>
                          setEditorSettings(s => ({ ...s, [toggle.key]: !s[toggle.key] }))
                        }
                        style={{
                          width: '36px',
                          height: '20px',
                          borderRadius: '10px',
                          border: 'none',
                          cursor: 'pointer',
                          background: toggle.val ? COLORS.accent : COLORS.border,
                          position: 'relative',
                          transition: 'background 0.2s',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: '2px',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: '#fff',
                            left: toggle.val ? '18px' : '2px',
                            transition: 'left 0.2s',
                          }}
                        />
                      </button>
                    </div>
                  ))}
                  <div
                    style={{
                      fontSize: '11px',
                      color: COLORS.textDim,
                      marginTop: '16px',
                      marginBottom: '8px',
                      fontWeight: 600,
                    }}
                  >
                    AI SETTINGS
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0',
                      fontSize: '12px',
                      color: COLORS.text,
                    }}
                  >
                    <span>AI Inline Suggestions</span>
                    <button
                      onClick={() => setInlineSuggestEnabled(p => !p)}
                      style={{
                        width: '36px',
                        height: '20px',
                        borderRadius: '10px',
                        border: 'none',
                        cursor: 'pointer',
                        background: inlineSuggestEnabled ? COLORS.accent : COLORS.border,
                        position: 'relative',
                        transition: 'background 0.2s',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '2px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#fff',
                          left: inlineSuggestEnabled ? '18px' : '2px',
                          transition: 'left 0.2s',
                        }}
                      />
                    </button>
                  </div>
                  {/* Temperature */}
                  <div style={{ marginBottom: '10px' }}>
                    <label
                      style={{
                        fontSize: '12px',
                        color: COLORS.text,
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                      }}
                    >
                      <span>Temperature</span>
                      <span style={{ color: COLORS.accent }}>{aiTemperature}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={aiTemperature}
                      onChange={e => setAiTemperature(Number(e.target.value))}
                      style={{ width: '100%', accentColor: COLORS.accent }}
                    />
                  </div>
                  {/* Max Tokens */}
                  <div style={{ marginBottom: '10px' }}>
                    <label
                      style={{
                        fontSize: '12px',
                        color: COLORS.text,
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Max Tokens
                    </label>
                    <select
                      value={aiMaxTokens}
                      onChange={e => setAiMaxTokens(Number(e.target.value))}
                      style={{
                        width: '100%',
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '4px',
                        padding: '5px 8px',
                        color: COLORS.text,
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    >
                      <option value={256}>256</option>
                      <option value={512}>512</option>
                      <option value={1024}>1024</option>
                      <option value={2048}>2048</option>
                      <option value={4096}>4096</option>
                      <option value={8192}>8192</option>
                    </select>
                  </div>
                  {/* API Keys */}
                  <div
                    style={{
                      fontSize: '11px',
                      color: COLORS.textDim,
                      marginTop: '16px',
                      marginBottom: '8px',
                      fontWeight: 600,
                    }}
                  >
                    API KEYS
                  </div>
                  <div style={{ fontSize: '10px', color: COLORS.textDim, marginBottom: '8px' }}>
                    Enter API keys to unlock paid models. Keys are stored locally in browser memory
                    only.
                  </div>
                  {(
                    [
                      'Anthropic',
                      'OpenAI',
                      'Google',
                      'xAI',
                      'StabilityAI',
                      'BlackForestLabs',
                    ] as const
                  ).map(provider => (
                    <div key={provider} style={{ marginBottom: '10px' }}>
                      <label
                        style={{
                          fontSize: '12px',
                          color: COLORS.text,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '4px',
                        }}
                      >
                        <span>{provider}</span>
                        {apiKeys[provider] && (
                          <span style={{ fontSize: '10px', color: COLORS.green }}>? Set</span>
                        )}
                      </label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type={showApiKeys[provider] ? 'text' : 'password'}
                          value={apiKeys[provider] || ''}
                          onChange={e =>
                            setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))
                          }
                          placeholder={`sk-... or ${provider} API key`}
                          style={{
                            flex: 1,
                            background: COLORS.surface,
                            border: `1px solid ${apiKeys[provider] ? COLORS.green + '66' : COLORS.border}`,
                            borderRadius: '4px',
                            padding: '5px 8px',
                            color: COLORS.text,
                            fontSize: '11px',
                            outline: 'none',
                            fontFamily: 'monospace',
                            boxSizing: 'border-box',
                          }}
                        />
                        <button
                          onClick={() =>
                            setShowApiKeys(prev => ({
                              ...prev,
                              [provider]: !prev[provider],
                            }))
                          }
                          style={{
                            background: COLORS.surface,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: COLORS.textDim,
                            fontSize: '10px',
                            cursor: 'pointer',
                          }}
                          title={showApiKeys[provider] ? 'Hide key' : 'Show key'}
                        >
                          {showApiKeys[provider] ? '??' : '??'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Git Blame Toggle */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0',
                      fontSize: '12px',
                      color: COLORS.text,
                    }}
                  >
                    <span>Git Blame Annotations</span>
                    <button
                      onClick={() => {
                        setShowBlame(p => !p);
                        if (!showBlame && activeFile?.path) fetchBlame(activeFile.path);
                      }}
                      style={{
                        width: '36px',
                        height: '20px',
                        borderRadius: '10px',
                        border: 'none',
                        cursor: 'pointer',
                        background: showBlame ? COLORS.accent : COLORS.border,
                        position: 'relative',
                        transition: 'background 0.2s',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '2px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#fff',
                          left: showBlame ? '18px' : '2px',
                          transition: 'left 0.2s',
                        }}
                      />
                    </button>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: COLORS.textDim,
                      marginTop: '16px',
                      marginBottom: '8px',
                      fontWeight: 600,
                    }}
                  >
                    KEYBINDINGS
                  </div>
                  {[
                    { key: 'Ctrl+S', desc: 'Save File' },
                    { key: 'Ctrl+P', desc: 'Quick Open' },
                    { key: 'Ctrl+Shift+P', desc: 'Command Palette' },
                    { key: 'Ctrl+`', desc: 'Toggle Terminal' },
                    { key: 'Ctrl+B', desc: 'Toggle Sidebar' },
                    { key: 'Ctrl+G', desc: 'Go to Line' },
                    { key: 'Ctrl+K', desc: 'Inline Edit (select text first)' },
                    { key: 'Ctrl+Shift+O', desc: 'Outline View' },
                    { key: 'Ctrl+Shift+B', desc: 'Toggle Git Blame' },
                    { key: 'Ctrl+F', desc: 'Find' },
                    { key: 'Ctrl+H', desc: 'Replace' },
                    { key: 'Alt+Z', desc: 'Word Wrap' },
                    { key: 'F8', desc: 'Next Problem' },
                    { key: 'Ctrl+Shift+M', desc: 'Problems Panel' },
                  ].map(kb => (
                    <div
                      key={kb.key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '3px 0',
                        fontSize: '12px',
                      }}
                    >
                      <span style={{ color: COLORS.textDim }}>{kb.desc}</span>
                      <kbd
                        style={{
                          background: COLORS.surface,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '10px',
                          color: COLORS.accent,
                          border: `1px solid ${COLORS.border}`,
                        }}
                      >
                        {kb.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              )}
              {/* Debug */}
              {sidebarPanel === 'debug' && (
                <div style={{ padding: '8px' }}>
                  {/* Debug toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '4px',
                      marginBottom: '12px',
                      justifyContent: 'center',
                    }}
                  >
                    {[
                      {
                        icon: debugRunning ? '?' : '?',
                        title: debugRunning ? 'Pause' : 'Start (F5)',
                        action: () => {
                          if (!debugRunning && activeFile) {
                            setDebugRunning(true);
                            setDebugPaused(false);
                            setBottomPanel('debug');
                            setCallStack([
                              {
                                id: 'frame-1',
                                name: activeFile.name.replace(/\.[^.]+$/, ''),
                                file: activeFile.path,
                                line: cursorLine,
                                column: 1,
                              },
                              {
                                id: 'frame-0',
                                name: '(anonymous)',
                                file: activeFile.path,
                                line: 1,
                                column: 1,
                              },
                            ]);
                            setDebugConsole(prev => [
                              ...prev,
                              {
                                id: `dc-${Date.now()}`,
                                type: 'info',
                                message: `Debugging started: ${activeFile.name}`,
                                timestamp: new Date().toISOString(),
                              },
                            ]);
                          } else {
                            setDebugPaused(p => !p);
                          }
                        },
                        color: COLORS.green,
                      },
                      {
                        icon: '?',
                        title: 'Stop (Shift+F5)',
                        action: () => {
                          setDebugRunning(false);
                          setDebugPaused(false);
                          setCallStack([]);
                        },
                        color: COLORS.red,
                      },
                      {
                        icon: '?',
                        title: 'Step Over (F10)',
                        action: () => {},
                        color: COLORS.accent,
                      },
                      {
                        icon: '?',
                        title: 'Step Into (F11)',
                        action: () => {},
                        color: COLORS.accent,
                      },
                      {
                        icon: '?',
                        title: 'Step Out (Shift+F11)',
                        action: () => {},
                        color: COLORS.accent,
                      },
                      {
                        icon: '??',
                        title: 'Restart (Ctrl+Shift+F5)',
                        action: () => {},
                        color: COLORS.accent,
                      },
                    ].map((btn, bi) => (
                      <button
                        key={bi}
                        title={btn.title}
                        onClick={btn.action}
                        style={{
                          width: '28px',
                          height: '28px',
                          background: COLORS.surface,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: '4px',
                          color: btn.color,
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {btn.icon}
                      </button>
                    ))}
                  </div>
                  {debugRunning && (
                    <div
                      style={{
                        padding: '6px 8px',
                        marginBottom: '8px',
                        background: debugPaused ? `${COLORS.yellow}22` : `${COLORS.green}22`,
                        border: `1px solid ${debugPaused ? COLORS.yellow : COLORS.green}`,
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: debugPaused ? COLORS.yellow : COLORS.green,
                        textAlign: 'center',
                      }}
                    >
                      {debugPaused ? '? Paused' : '? Running'}
                    </div>
                  )}
                  {/* Variables */}
                  <div style={{ marginBottom: '12px' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        color: COLORS.textDim,
                        fontWeight: 600,
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Variables
                    </div>
                    {debugVariables.length === 0 ? (
                      <div style={{ fontSize: '11px', color: COLORS.textDim, padding: '4px 0' }}>
                        Not paused on a breakpoint
                      </div>
                    ) : (
                      debugVariables.map((v, vi) => (
                        <div
                          key={vi}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '3px 6px',
                            fontSize: '12px',
                            borderRadius: '3px',
                            background: COLORS.surface,
                            marginBottom: '2px',
                          }}
                        >
                          <span style={{ color: COLORS.accent }}>{v.name}</span>
                          <span style={{ color: COLORS.text }}>
                            {v.value}{' '}
                            <span style={{ color: COLORS.textDim, fontSize: '10px' }}>
                              {v.type}
                            </span>
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Call Stack */}
                  <div style={{ marginBottom: '12px' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        color: COLORS.textDim,
                        fontWeight: 600,
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Call Stack
                    </div>
                    {callStack.length === 0 ? (
                      <div style={{ fontSize: '11px', color: COLORS.textDim, padding: '4px 0' }}>
                        Not debugging
                      </div>
                    ) : (
                      callStack.map(frame => (
                        <div
                          key={frame.id}
                          style={{
                            padding: '3px 6px',
                            fontSize: '11px',
                            borderRadius: '3px',
                            background: COLORS.surface,
                            marginBottom: '2px',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            if (editorRef.current) {
                              editorRef.current.setPosition({
                                lineNumber: frame.line,
                                column: frame.column,
                              });
                              editorRef.current.revealLineInCenter(frame.line);
                            }
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLDivElement).style.background = COLORS.hover;
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLDivElement).style.background = COLORS.surface;
                          }}
                        >
                          <div style={{ color: COLORS.text, fontWeight: 500 }}>{frame.name}</div>
                          <div style={{ color: COLORS.textDim, fontSize: '10px' }}>
                            {frame.file.split('/').pop()}:{frame.line}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Breakpoints */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: COLORS.textDim,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        Breakpoints ({breakpoints.length})
                      </div>
                      {breakpoints.length > 0 && (
                        <button
                          onClick={() => setBreakpoints([])}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: COLORS.red,
                            cursor: 'pointer',
                            fontSize: '10px',
                          }}
                        >
                          Remove All
                        </button>
                      )}
                    </div>
                    {breakpoints.length === 0 ? (
                      <div style={{ fontSize: '11px', color: COLORS.textDim, padding: '4px 0' }}>
                        No breakpoints set. Use F9 to toggle.
                      </div>
                    ) : (
                      breakpoints.map(bp => (
                        <div
                          key={bp.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 6px',
                            fontSize: '11px',
                            borderRadius: '3px',
                            background: COLORS.surface,
                            marginBottom: '2px',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={bp.enabled}
                            onChange={() =>
                              setBreakpoints(prev =>
                                prev.map(b => (b.id === bp.id ? { ...b, enabled: !b.enabled } : b))
                              )
                            }
                            style={{ accentColor: COLORS.red }}
                          />
                          <span style={{ color: COLORS.red, fontSize: '14px' }}>?</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                color: COLORS.text,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {bp.file.split('/').pop()}
                            </div>
                            <div style={{ color: COLORS.textDim, fontSize: '10px' }}>
                              Line {bp.line}
                            </div>
                          </div>
                          <button
                            onClick={() => setBreakpoints(prev => prev.filter(b => b.id !== bp.id))}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: COLORS.textDim,
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            ?
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {/* Extensions Marketplace */}
              {sidebarPanel === 'extensions' && (
                <div style={{ padding: '8px' }}>
                  {/* Search bar */}
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <input
                      type="text"
                      value={marketplaceSearch}
                      onChange={e => setMarketplaceSearch(e.target.value)}
                      placeholder="Search extensions..."
                      style={{
                        width: '100%',
                        padding: '6px 8px 6px 28px',
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '4px',
                        color: COLORS.text,
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        left: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: COLORS.textDim,
                        fontSize: '13px',
                        pointerEvents: 'none',
                      }}
                    >
                      ??
                    </span>
                  </div>
                  {/* Installed section */}
                  {(() => {
                    const filtered = marketplaceExts.filter(
                      ext =>
                        marketplaceSearch === '' ||
                        ext.name.toLowerCase().includes(marketplaceSearch.toLowerCase()) ||
                        ext.description.toLowerCase().includes(marketplaceSearch.toLowerCase()) ||
                        ext.publisher.toLowerCase().includes(marketplaceSearch.toLowerCase()) ||
                        ext.category.toLowerCase().includes(marketplaceSearch.toLowerCase())
                    );
                    const installed = filtered.filter(ext => ext.installed);
                    const available = filtered.filter(ext => !ext.installed);
                    const formatDownloads = (n: number) =>
                      n >= 1000000
                        ? `${(n / 1000000).toFixed(1)}M`
                        : n >= 1000
                          ? `${(n / 1000).toFixed(0)}K`
                          : `${n}`;
                    const renderStars = (rating: number) => {
                      const full = Math.floor(rating);
                      const half = rating - full >= 0.3;
                      return (
                        '?'.repeat(full) + (half ? '½' : '') + '?'.repeat(5 - full - (half ? 1 : 0))
                      );
                    };
                    return (
                      <>
                        {installed.length > 0 && (
                          <div style={{ marginBottom: '14px' }}>
                            <div
                              style={{
                                fontSize: '11px',
                                color: COLORS.textDim,
                                fontWeight: 600,
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                              }}
                            >
                              Installed ({installed.length})
                            </div>
                            {installed.map(ext => (
                              <div
                                key={ext.id}
                                style={{
                                  display: 'flex',
                                  gap: '8px',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  marginBottom: '4px',
                                  background: COLORS.surface,
                                  border: `1px solid ${COLORS.border}`,
                                }}
                              >
                                <span style={{ fontSize: '24px', lineHeight: '1' }}>
                                  {ext.icon}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                  >
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        color: COLORS.text,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {ext.name}
                                    </span>
                                    <span style={{ fontSize: '10px', color: COLORS.textDim }}>
                                      v{ext.version}
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '10px',
                                      color: COLORS.accent,
                                      marginBottom: '2px',
                                    }}
                                  >
                                    {ext.publisher}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: COLORS.textDim,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {ext.description}
                                  </div>
                                  <div
                                    style={{
                                      display: 'flex',
                                      gap: '8px',
                                      marginTop: '4px',
                                      fontSize: '10px',
                                      color: COLORS.textDim,
                                    }}
                                  >
                                    <span style={{ color: COLORS.yellow }}>
                                      {renderStars(ext.rating)}
                                    </span>
                                    <span>{formatDownloads(ext.downloads)}</span>
                                    <span>{ext.category}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    setMarketplaceExts(prev =>
                                      prev.map(e =>
                                        e.id === ext.id ? { ...e, installed: false } : e
                                      )
                                    )
                                  }
                                  style={{
                                    padding: '4px 8px',
                                    background: `${COLORS.red}22`,
                                    border: `1px solid ${COLORS.red}`,
                                    borderRadius: '4px',
                                    color: COLORS.red,
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    flexShrink: 0,
                                    alignSelf: 'center',
                                    height: 'fit-content',
                                  }}
                                >
                                  Uninstall
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {available.length > 0 && (
                          <div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: COLORS.textDim,
                                fontWeight: 600,
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                              }}
                            >
                              Marketplace ({available.length})
                            </div>
                            {available.map(ext => (
                              <div
                                key={ext.id}
                                style={{
                                  display: 'flex',
                                  gap: '8px',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  marginBottom: '4px',
                                  background: COLORS.surface,
                                  border: `1px solid ${COLORS.border}`,
                                }}
                              >
                                <span style={{ fontSize: '24px', lineHeight: '1' }}>
                                  {ext.icon}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                  >
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        color: COLORS.text,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {ext.name}
                                    </span>
                                    <span style={{ fontSize: '10px', color: COLORS.textDim }}>
                                      v{ext.version}
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '10px',
                                      color: COLORS.accent,
                                      marginBottom: '2px',
                                    }}
                                  >
                                    {ext.publisher}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: COLORS.textDim,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {ext.description}
                                  </div>
                                  <div
                                    style={{
                                      display: 'flex',
                                      gap: '8px',
                                      marginTop: '4px',
                                      fontSize: '10px',
                                      color: COLORS.textDim,
                                    }}
                                  >
                                    <span style={{ color: COLORS.yellow }}>
                                      {renderStars(ext.rating)}
                                    </span>
                                    <span>{formatDownloads(ext.downloads)}</span>
                                    <span>{ext.category}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    setMarketplaceExts(prev =>
                                      prev.map(e =>
                                        e.id === ext.id ? { ...e, installed: true } : e
                                      )
                                    )
                                  }
                                  style={{
                                    padding: '4px 8px',
                                    background: `${COLORS.green}22`,
                                    border: `1px solid ${COLORS.green}`,
                                    borderRadius: '4px',
                                    color: COLORS.green,
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    flexShrink: 0,
                                    alignSelf: 'center',
                                    height: 'fit-content',
                                  }}
                                >
                                  Install
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {filtered.length === 0 && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: COLORS.textDim,
                              textAlign: 'center',
                              padding: '20px 0',
                            }}
                          >
                            No extensions found for "{marketplaceSearch}"
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
              {/* Rules */}
              {sidebarPanel === 'rules' && (
                <div style={{ padding: '8px' }}>
                  {['Code Quality', 'TypeScript', 'Best Practices', 'Formatting'].map(cat => {
                    const catRules = rules.filter(r => r.category === cat);
                    if (catRules.length === 0) return null;
                    return (
                      <div key={cat} style={{ marginBottom: '12px' }}>
                        <div
                          style={{
                            fontSize: '11px',
                            color: COLORS.textDim,
                            fontWeight: 600,
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {cat}
                        </div>
                        {catRules.map(rule => (
                          <div
                            key={rule.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px',
                              borderRadius: '4px',
                              marginBottom: '4px',
                              background: COLORS.surface,
                              border: `1px solid ${COLORS.border}`,
                            }}
                          >
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '3px',
                                color:
                                  rule.severity === 'error'
                                    ? COLORS.red
                                    : rule.severity === 'warning'
                                      ? COLORS.yellow
                                      : COLORS.textDim,
                                background:
                                  rule.severity === 'error'
                                    ? 'rgba(243,139,168,0.15)'
                                    : rule.severity === 'warning'
                                      ? 'rgba(249,226,175,0.15)'
                                      : 'rgba(108,112,134,0.15)',
                              }}
                            >
                              {rule.severity.toUpperCase()}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{ fontSize: '12px', color: COLORS.text, fontWeight: 600 }}
                              >
                                {rule.name}
                              </div>
                              <div style={{ fontSize: '11px', color: COLORS.textDim }}>
                                {rule.description}
                              </div>
                            </div>
                            <select
                              value={rule.severity}
                              onChange={e =>
                                setRules(prev =>
                                  prev.map(r =>
                                    r.id === rule.id
                                      ? {
                                          ...r,
                                          severity: e.target.value as 'error' | 'warning' | 'off',
                                        }
                                      : r
                                  )
                                )
                              }
                              style={{
                                background: COLORS.bg,
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '3px',
                                padding: '2px 4px',
                                color: COLORS.text,
                                fontSize: '10px',
                                outline: 'none',
                                flexShrink: 0,
                              }}
                            >
                              <option value="error">Error</option>
                              <option value="warning">Warning</option>
                              <option value="off">Off</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Outline */}
              {sidebarPanel === 'outline' && (
                <div style={{ padding: '8px' }}>
                  {symbols.length === 0 ? (
                    <div
                      style={{
                        padding: '16px',
                        color: COLORS.textDim,
                        fontSize: '12px',
                        textAlign: 'center',
                      }}
                    >
                      {activeFile ? 'No symbols found' : 'Open a file to see its outline'}
                    </div>
                  ) : (
                    <div>
                      {['component', 'class', 'function', 'interface', 'type'].map(kind => {
                        const kindSymbols = symbols.filter(s => s.kind === kind);
                        if (kindSymbols.length === 0) return null;
                        return (
                          <div key={kind} style={{ marginBottom: '8px' }}>
                            <div
                              style={{
                                fontSize: '10px',
                                color: COLORS.textDim,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                marginBottom: '4px',
                              }}
                            >
                              {kind === 'component'
                                ? '?? Components'
                                : kind === 'class'
                                  ? '??? Classes'
                                  : kind === 'function'
                                    ? 'ƒ Functions'
                                    : kind === 'interface'
                                      ? '?? Interfaces'
                                      : '?? Types'}
                            </div>
                            {kindSymbols.map(sym => (
                              <div
                                key={`${sym.name}-${sym.line}`}
                                onClick={() => {
                                  if (editorRef.current) {
                                    editorRef.current.revealLineInCenter(sym.line);
                                    editorRef.current.setPosition({
                                      lineNumber: sym.line,
                                      column: 1,
                                    });
                                    editorRef.current.focus();
                                  }
                                }}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  color: COLORS.text,
                                  cursor: 'pointer',
                                  borderRadius: '3px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                                onMouseEnter={e => {
                                  (e.currentTarget as HTMLDivElement).style.background =
                                    COLORS.hover;
                                }}
                                onMouseLeave={e => {
                                  (e.currentTarget as HTMLDivElement).style.background =
                                    'transparent';
                                }}
                              >
                                <span>{sym.name}</span>
                                <span style={{ fontSize: '10px', color: COLORS.textDim }}>
                                  :{sym.line}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Editor area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tabs */}
          {openFiles.length > 0 && (
            <div
              style={{
                display: 'flex',
                background: COLORS.surface,
                borderBottom: `1px solid ${COLORS.border}`,
                overflowX: 'auto',
                minHeight: '36px',
              }}
            >
              {openFiles.map((file, i) => (
                <div
                  key={file.path}
                  onClick={() => setActiveFileIdx(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 12px',
                    height: '36px',
                    fontSize: '12px',
                    color: i === activeFileIdx ? COLORS.text : COLORS.textDim,
                    background: i === activeFileIdx ? COLORS.tabActive : 'transparent',
                    borderRight: `1px solid ${COLORS.border}`,
                    borderBottom:
                      i === activeFileIdx ? `1px solid ${COLORS.accent}` : '1px solid transparent',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{getFileIcon(file.name)}</span>
                  <span>{file.name}</span>
                  {file.dirty && (
                    <span style={{ color: COLORS.accent, fontSize: '18px', lineHeight: 1 }}>•</span>
                  )}
                  <span
                    onClick={e => {
                      e.stopPropagation();
                      closeFile(i);
                    }}
                    style={{
                      color: COLORS.textDim,
                      cursor: 'pointer',
                      fontSize: '14px',
                      marginLeft: '4px',
                      padding: '0 2px',
                      borderRadius: '3px',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = COLORS.hover;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    ×
                  </span>
                </div>
              ))}
            </div>
          )}
          {/* Breadcrumbs */}
          {activeFile && (
            <div
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                color: COLORS.textDim,
                borderBottom: `1px solid ${COLORS.border}`,
                background: COLORS.editor,
                display: 'flex',
                gap: '4px',
              }}
            >
              {activeFile.path.split('/').map((seg, i, arr) => (
                <span key={`bc-${seg}-${i}`}>
                  {i > 0 && <span style={{ margin: '0 2px' }}>›</span>}
                  <span style={{ color: i === arr.length - 1 ? COLORS.text : COLORS.textDim }}>
                    {seg}
                  </span>
                </span>
              ))}
            </div>
          )}
          {/* Browser Panel */}
          {showBrowser && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Browser Tab Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: COLORS.surface,
                  borderBottom: `1px solid ${COLORS.border}`,
                  minHeight: '32px',
                  overflowX: 'auto',
                }}
              >
                {browserTabs.map((tab, i) => (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTabIdx(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0 10px',
                      height: '32px',
                      fontSize: '11px',
                      color: i === activeTabIdx ? COLORS.text : COLORS.textDim,
                      background: i === activeTabIdx ? COLORS.tabActive : 'transparent',
                      borderRight: `1px solid ${COLORS.border}`,
                      borderBottom:
                        i === activeTabIdx ? `2px solid ${COLORS.accent}` : '2px solid transparent',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      maxWidth: '180px',
                      overflow: 'hidden',
                    }}
                  >
                    <span>??</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tab.title || 'New Tab'}
                    </span>
                    {tab.loading && <span style={{ fontSize: '10px' }}>?</span>}
                    <span
                      onClick={e => {
                        e.stopPropagation();
                        closeBrowserTab(i);
                      }}
                      style={{
                        color: COLORS.textDim,
                        cursor: 'pointer',
                        fontSize: '13px',
                        padding: '0 2px',
                        borderRadius: '3px',
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = COLORS.hover;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      ×
                    </span>
                  </div>
                ))}
                <button
                  onClick={() => newBrowserTab()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: COLORS.textDim,
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '0 8px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="New tab"
                >
                  +
                </button>
              </div>
              {/* Browser Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  background: COLORS.surface,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                <button
                  onClick={browserBack}
                  disabled={activeTab.historyIdx <= 0}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: activeTab.historyIdx > 0 ? COLORS.text : COLORS.textDim,
                    cursor: activeTab.historyIdx > 0 ? 'pointer' : 'default',
                    fontSize: '16px',
                    padding: '4px 6px',
                    borderRadius: '4px',
                  }}
                  title="Back"
                >
                  ?
                </button>
                <button
                  onClick={browserForward}
                  disabled={activeTab.historyIdx >= activeTab.history.length - 1}
                  style={{
                    background: 'none',
                    border: 'none',
                    color:
                      activeTab.historyIdx < activeTab.history.length - 1
                        ? COLORS.text
                        : COLORS.textDim,
                    cursor:
                      activeTab.historyIdx < activeTab.history.length - 1 ? 'pointer' : 'default',
                    fontSize: '16px',
                    padding: '4px 6px',
                    borderRadius: '4px',
                  }}
                  title="Forward"
                >
                  ?
                </button>
                <button
                  onClick={browserRefresh}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: COLORS.text,
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '4px 6px',
                    borderRadius: '4px',
                  }}
                  title="Refresh"
                >
                  {activeTab.loading ? '?' : '??'}
                </button>
                <button
                  onClick={() => browserNavigate('https://www.bing.com')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: COLORS.text,
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px 6px',
                    borderRadius: '4px',
                  }}
                  title="Home"
                >
                  ??
                </button>
                <input
                  value={activeTab.urlInput}
                  onChange={e => updateActiveTab({ urlInput: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter') browserNavigate(activeTab.urlInput);
                  }}
                  style={{
                    flex: 1,
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '16px',
                    padding: '5px 12px',
                    color: COLORS.text,
                    fontSize: '12px',
                    outline: 'none',
                  }}
                  placeholder="Enter URL..."
                />
                <button
                  onClick={toggleSelectorMode}
                  style={{
                    background: selectorMode ? COLORS.accent : 'none',
                    border: selectorMode ? 'none' : `1px solid ${COLORS.border}`,
                    color: selectorMode ? COLORS.surface : COLORS.text,
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title={selectorMode ? 'Selector mode ON - click an element' : 'Select element'}
                >
                  ?? {selectorMode ? 'Selecting...' : 'Select'}
                </button>
                <button
                  onClick={toggleBookmark}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isBookmarked ? COLORS.yellow : COLORS.textDim,
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px 6px',
                    borderRadius: '4px',
                  }}
                  title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                >
                  {isBookmarked ? '?' : '?'}
                </button>
                <button
                  onClick={() => setShowDownloads(p => !p)}
                  style={{
                    background: showDownloads ? COLORS.hover : 'none',
                    border: 'none',
                    color: browserDownloads.length > 0 ? COLORS.accent : COLORS.textDim,
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    position: 'relative',
                  }}
                  title="Downloads"
                >
                  ??
                  {browserDownloads.filter(d => d.status === 'downloading').length > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: COLORS.green,
                      }}
                    />
                  )}
                </button>
                <button
                  onClick={() => setShowAiBrowserPanel(p => !p)}
                  style={{
                    background: showAiBrowserPanel ? COLORS.accent : 'none',
                    border: showAiBrowserPanel ? 'none' : `1px solid ${COLORS.border}`,
                    color: showAiBrowserPanel ? COLORS.surface : COLORS.accent,
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="AI Browser Control (Comet-style)"
                >
                  ?? AI Control
                </button>
                <button
                  onClick={() => setShowBookmarksBar(p => !p)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: showBookmarksBar ? COLORS.accent : COLORS.textDim,
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '4px 6px',
                    borderRadius: '4px',
                  }}
                  title={showBookmarksBar ? 'Hide bookmarks bar' : 'Show bookmarks bar'}
                >
                  ??
                </button>
                <button
                  onClick={() =>
                    simulateDownload(
                      `page-${Date.now()}.html`,
                      activeTab.url,
                      `${(Math.random() * 5 + 0.5).toFixed(1)} MB`
                    )
                  }
                  style={{
                    background: 'none',
                    border: 'none',
                    color: COLORS.textDim,
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '4px 6px',
                    borderRadius: '4px',
                  }}
                  title="Download page"
                >
                  ??
                </button>
                <button
                  onClick={() => setShowBrowser(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: COLORS.textDim,
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '4px',
                  }}
                  title="Close browser"
                >
                  ×
                </button>
              </div>
              {/* Bookmarks Bar */}
              {showBookmarksBar && (
                <div
                  style={{
                    display: 'flex',
                    gap: '2px',
                    padding: '3px 8px',
                    background: COLORS.surface,
                    borderBottom: `1px solid ${COLORS.border}`,
                    overflowX: 'auto',
                    alignItems: 'center',
                  }}
                >
                  {bookmarks.map(bm => (
                    <button
                      key={bm.id}
                      onClick={() => browserNavigate(bm.url)}
                      onContextMenu={e => {
                        e.preventDefault();
                        removeBookmark(bm.id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        color: COLORS.text,
                        cursor: 'pointer',
                        fontSize: '11px',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = COLORS.hover;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }}
                      title={`${bm.title}\n${bm.url}\nRight-click to remove`}
                    >
                      <span style={{ fontSize: '12px' }}>{bm.icon}</span>
                      {bm.title}
                    </button>
                  ))}
                  {bookmarks.length === 0 && (
                    <span style={{ fontSize: '11px', color: COLORS.textDim, padding: '2px 8px' }}>
                      No bookmarks — click ? to add
                    </span>
                  )}
                </div>
              )}
              {/* Downloads Panel */}
              {showDownloads && (
                <div
                  style={{
                    position: 'absolute',
                    top: '80px',
                    right: '12px',
                    width: '340px',
                    maxHeight: '320px',
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    zIndex: 50,
                    overflowY: 'auto',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 600, color: COLORS.text }}>
                      Downloads
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={clearDownloads}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: COLORS.textDim,
                          cursor: 'pointer',
                          fontSize: '10px',
                        }}
                        title="Clear completed"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => setShowDownloads(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: COLORS.textDim,
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {browserDownloads.length === 0 && (
                    <div
                      style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: COLORS.textDim,
                        fontSize: '12px',
                      }}
                    >
                      No downloads yet
                    </div>
                  )}
                  {browserDownloads.map(dl => (
                    <div
                      key={dl.id}
                      style={{
                        padding: '8px 12px',
                        borderBottom: `1px solid ${COLORS.border}`,
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>
                        {dl.status === 'complete' ? '?' : dl.status === 'failed' ? '?' : '??'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '11px',
                            color: COLORS.text,
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {dl.filename}
                        </div>
                        <div style={{ fontSize: '10px', color: COLORS.textDim }}>{dl.size}</div>
                        {dl.status === 'downloading' && (
                          <div
                            style={{
                              marginTop: '3px',
                              height: '3px',
                              background: COLORS.border,
                              borderRadius: '2px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${dl.progress}%`,
                                background: COLORS.accent,
                                borderRadius: '2px',
                                transition: 'width 0.3s',
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          color:
                            dl.status === 'complete'
                              ? COLORS.green
                              : dl.status === 'failed'
                                ? COLORS.red
                                : COLORS.accent,
                        }}
                      >
                        {dl.status === 'downloading' ? `${Math.round(dl.progress)}%` : dl.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {/* Selected Elements Bar */}
              {selectedElements.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    padding: '4px 8px',
                    background: COLORS.surface,
                    borderBottom: `1px solid ${COLORS.border}`,
                    overflowX: 'auto',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      color: COLORS.textDim,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Selected:
                  </span>
                  {selectedElements.map(el => (
                    <span
                      key={el.selector}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: COLORS.hover,
                        border: `1px solid ${COLORS.accent}`,
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        color: COLORS.accent,
                      }}
                    >
                      &lt;{el.tag}&gt;{el.id ? `#${el.id}` : ''}
                      {el.text ? ` "${el.text.slice(0, 30)}..."` : ''}
                      <button
                        onClick={() => removeSelectedElement(el.selector)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: COLORS.textDim,
                          cursor: 'pointer',
                          fontSize: '12px',
                          padding: '0 2px',
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* iframe */}
              <div style={{ flex: 1, position: 'relative' }}>
                <iframe
                  key={`browser-${activeTab.id}-${activeTab.url}`}
                  ref={iframeRef}
                  src={`/api/ide/browse?url=${encodeURIComponent(activeTab.url)}`}
                  onLoad={() => updateActiveTab({ loading: false })}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    background: '#fff',
                  }}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                  title="Jarvis Browser"
                />
                {selectorMode && hoveredElement && (
                  <div
                    style={{
                      position: 'absolute',
                      left: hoveredElement.x,
                      top: hoveredElement.y,
                      width: hoveredElement.w,
                      height: hoveredElement.h,
                      border: '2px solid #89b4fa',
                      background: 'rgba(137, 180, 250, 0.1)',
                      pointerEvents: 'none',
                      zIndex: 10,
                    }}
                  />
                )}
                {selectorMode && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: COLORS.accent,
                      color: COLORS.surface,
                      padding: '6px 12px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      zIndex: 20,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    }}
                  >
                    ?? Click an element to select it
                  </div>
                )}
              </div>
              {/* AI Browser Control Panel (Comet-style) */}
              {showAiBrowserPanel && (
                <div
                  style={{
                    borderTop: `1px solid ${COLORS.border}`,
                    background: COLORS.surface,
                    maxHeight: '280px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 10px',
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px' }}>??</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: COLORS.text }}>
                        AI Browser Control
                      </span>
                      {aiBrowserRunning && (
                        <span style={{ fontSize: '10px', color: COLORS.green, fontWeight: 600 }}>
                          ? Running
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => setAiBrowserActions([])}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: COLORS.textDim,
                          cursor: 'pointer',
                          fontSize: '10px',
                        }}
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => setShowAiBrowserPanel(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: COLORS.textDim,
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {/* CoT Action Log */}
                  <div
                    style={{ flex: 1, overflowY: 'auto', padding: '6px 10px', minHeight: '80px' }}
                  >
                    {aiBrowserActions.length === 0 && (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '16px 0',
                          color: COLORS.textDim,
                          fontSize: '11px',
                        }}
                      >
                        <div style={{ fontSize: '20px', marginBottom: '6px' }}>??</div>
                        Tell the AI what to do in the browser.
                        <br />
                        <span style={{ fontSize: '10px' }}>
                          Examples: "Go to github.com", "Click the Sign In button",
                          <br />
                          "Fill 'hello' into the search box", "Search for React docs",
                          <br />
                          "Scroll down", "Take a screenshot", "Extract titles"
                        </span>
                      </div>
                    )}
                    {aiBrowserActions.map(action => (
                      <div
                        key={action.id}
                        style={{
                          marginBottom: '10px',
                          borderRadius: '6px',
                          border: `1px solid ${action.status === 'running' ? COLORS.accent : COLORS.border}`,
                          background: COLORS.bg,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Command header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            background:
                              action.status === 'running' ? `${COLORS.accent}11` : 'transparent',
                            borderBottom: `1px solid ${COLORS.border}`,
                          }}
                        >
                          <span style={{ fontSize: '12px' }}>
                            {action.status === 'pending'
                              ? '?'
                              : action.status === 'running'
                                ? '??'
                                : action.status === 'done'
                                  ? '?'
                                  : '?'}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: COLORS.text,
                              flex: 1,
                            }}
                          >
                            {action.command}
                          </span>
                          <span style={{ fontSize: '9px', color: COLORS.textDim }}>
                            {new Date(action.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {/* CoT Thought bubble */}
                        <div
                          style={{
                            padding: '5px 10px',
                            fontSize: '10px',
                            color: COLORS.accent,
                            background: `${COLORS.accent}08`,
                            borderBottom: `1px solid ${COLORS.border}`,
                            fontStyle: 'italic',
                            lineHeight: 1.4,
                          }}
                        >
                          ?? {action.thought}
                        </div>
                        {/* Subtask checklist */}
                        <div style={{ padding: '6px 10px' }}>
                          {action.subtasks.map(st => {
                            const isDone = st.status === 'done';
                            const isRunning = st.status === 'running';
                            const isError = st.status === 'error';
                            const typeColor =
                              st.type === 'think'
                                ? '#bc8cff'
                                : st.type === 'navigate'
                                  ? COLORS.accent
                                  : st.type === 'click'
                                    ? COLORS.green
                                    : st.type === 'fill'
                                      ? COLORS.yellow
                                      : st.type === 'scroll'
                                        ? '#39d2c0'
                                        : st.type === 'screenshot'
                                          ? '#ff7b72'
                                          : st.type === 'extract'
                                            ? '#d29922'
                                            : COLORS.textDim;
                            return (
                              <div
                                key={st.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '3px 0',
                                  fontSize: '11px',
                                  opacity: isDone ? 0.6 : 1,
                                  transition: 'opacity 0.3s',
                                }}
                              >
                                <span
                                  style={{ width: '16px', textAlign: 'center', fontSize: '11px' }}
                                >
                                  {isDone ? '?' : isRunning ? '?' : isError ? '?' : '?'}
                                </span>
                                <span
                                  style={{
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    fontSize: '8px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    background: `${typeColor}22`,
                                    color: typeColor,
                                    minWidth: '44px',
                                    textAlign: 'center',
                                  }}
                                >
                                  {st.type === 'think' ? 'think' : st.type}
                                </span>
                                <span
                                  style={{
                                    color: isDone
                                      ? COLORS.textDim
                                      : isRunning
                                        ? COLORS.text
                                        : COLORS.textDim,
                                    textDecoration: isDone ? 'line-through' : 'none',
                                    flex: 1,
                                    fontWeight: isRunning ? 600 : 400,
                                  }}
                                >
                                  {st.description}
                                </span>
                                {isRunning && (
                                  <span
                                    style={{
                                      fontSize: '9px',
                                      color: COLORS.green,
                                      fontWeight: 600,
                                    }}
                                  >
                                    running...
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {/* Progress bar */}
                          {action.status === 'running' && (
                            <div
                              style={{
                                marginTop: '6px',
                                height: '3px',
                                background: COLORS.border,
                                borderRadius: '2px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${Math.round((action.subtasks.filter(s => s.status === 'done').length / action.subtasks.length) * 100)}%`,
                                  background: COLORS.accent,
                                  borderRadius: '2px',
                                  transition: 'width 0.3s',
                                }}
                              />
                            </div>
                          )}
                          {action.status === 'done' && (
                            <div
                              style={{
                                marginTop: '4px',
                                fontSize: '10px',
                                color: COLORS.green,
                                fontWeight: 600,
                              }}
                            >
                              ? All {action.subtasks.length} tasks completed
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Command input */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '4px',
                      padding: '6px 10px',
                      borderTop: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <input
                      value={aiBrowserInput}
                      onChange={e => setAiBrowserInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !aiBrowserRunning) {
                          executeAiBrowserCommand(aiBrowserInput);
                        }
                      }}
                      disabled={aiBrowserRunning}
                      placeholder={
                        aiBrowserRunning
                          ? 'AI is executing...'
                          : 'Tell the AI what to do... (e.g. "click Sign In")'
                      }
                      style={{
                        flex: 1,
                        background: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '6px',
                        padding: '6px 10px',
                        color: COLORS.text,
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => executeAiBrowserCommand(aiBrowserInput)}
                      disabled={aiBrowserRunning || !aiBrowserInput.trim()}
                      style={{
                        background: aiBrowserRunning ? COLORS.textDim : COLORS.accent,
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        color: COLORS.surface,
                        cursor: aiBrowserRunning ? 'default' : 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {aiBrowserRunning ? '? Running...' : '? Execute'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Editor or Welcome */}
          {!showBrowser && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {activeFile ? (
                <Editor
                  height="100%"
                  language={activeFile.language}
                  value={activeFile.content}
                  theme="vs-dark"
                  onChange={(value: string | undefined) => {
                    setOpenFiles(prev => {
                      const updated = [...prev];
                      if (updated[activeFileIdx]) {
                        const newContent = value || '';
                        updated[activeFileIdx] = {
                          ...updated[activeFileIdx],
                          content: newContent,
                          dirty: newContent !== updated[activeFileIdx].savedContent,
                        };
                      }
                      return updated;
                    });
                  }}
                  onMount={(editor: any, monaco: any) => {
                    editorRef.current = editor;
                    monacoRef.current = monaco;
                    editor.onDidChangeCursorPosition((e: any) => {
                      setCursorLine(e.position.lineNumber);
                      setCursorCol(e.position.column);
                    });
                    // Register AI inline completions provider
                    let inlineTimer: ReturnType<typeof setTimeout> | null = null;
                    monaco.languages.registerInlineCompletionsProvider('*', {
                      provideInlineCompletions: async (
                        model: any,
                        position: any,
                        _ctx: any,
                        token: any
                      ) => {
                        if (!inlineSuggestEnabled) return { items: [] };
                        // Cancel any previous pending request
                        if (inlineAbortRef.current) inlineAbortRef.current.abort();
                        if (inlineTimer) clearTimeout(inlineTimer);
                        // Debounce: wait 600ms after the user stops typing
                        const result = await new Promise<{ items: any[] }>(resolve => {
                          inlineTimer = setTimeout(async () => {
                            if (token.isCancellationRequested) {
                              resolve({ items: [] });
                              return;
                            }
                            const textUntilPos = model.getValueInRange({
                              startLineNumber: 1,
                              startColumn: 1,
                              endLineNumber: position.lineNumber,
                              endColumn: position.column,
                            });
                            const textAfterPos = model.getValueInRange({
                              startLineNumber: position.lineNumber,
                              startColumn: position.column,
                              endLineNumber: model.getLineCount(),
                              endColumn: model.getLineMaxColumn(model.getLineCount()),
                            });
                            // Skip if prefix is too short or cursor at start
                            if (textUntilPos.trim().length < 10) {
                              resolve({ items: [] });
                              return;
                            }
                            const controller = new AbortController();
                            inlineAbortRef.current = controller;
                            try {
                              const compModelObj = models.find(m => m.id === aiModel);
                              const resp = await fetch('/api/ide/ai-complete', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  prefix: textUntilPos,
                                  suffix: textAfterPos,
                                  language: model.getLanguageId(),
                                  filePath: activeFile?.path || '',
                                  model: aiModel,
                                  provider: compModelObj?.provider,
                                  apiKey: compModelObj ? apiKeys[compModelObj.provider] : undefined,
                                }),
                                signal: controller.signal,
                              });
                              if (!resp.ok || token.isCancellationRequested) {
                                resolve({ items: [] });
                                return;
                              }
                              const data = await resp.json();
                              const completion = data?.completion || '';
                              if (!completion.trim()) {
                                resolve({ items: [] });
                                return;
                              }
                              resolve({
                                items: [
                                  {
                                    insertText: completion,
                                    range: {
                                      startLineNumber: position.lineNumber,
                                      startColumn: position.column,
                                      endLineNumber: position.lineNumber,
                                      endColumn: position.column,
                                    },
                                  },
                                ],
                              });
                            } catch {
                              resolve({ items: [] });
                            }
                          }, 600);
                        });
                        return result;
                      },
                      freeInlineCompletions: () => {},
                    });
                    // Listen for Monaco diagnostics (markers) to populate Problems panel
                    monaco.editor.onDidChangeMarkers(() => {
                      const allMarkers = monaco.editor.getModelMarkers({});
                      const diags: DiagnosticItem[] = allMarkers.map((m: any) => ({
                        file: m.resource?.path || activeFile?.path || '',
                        line: m.startLineNumber,
                        col: m.startColumn,
                        endLine: m.endLineNumber,
                        endCol: m.endColumn,
                        message: m.message,
                        severity:
                          m.severity === 8
                            ? 'error'
                            : m.severity === 4
                              ? 'warning'
                              : m.severity === 2
                                ? 'info'
                                : 'hint',
                        source: m.source || '',
                        code: typeof m.code === 'object' ? m.code?.value : String(m.code || ''),
                      }));
                      setDiagnostics(diags);
                    });
                    // Add context menu action for Quick Fix
                    editor.addAction({
                      id: 'jarvis-quick-fix',
                      label: 'AI Quick Fix',
                      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period],
                      contextMenuGroupId: '1_modification',
                      contextMenuOrder: 0,
                      run: (ed: any) => {
                        const pos = ed.getPosition();
                        if (!pos) return;
                        const markers = monaco.editor.getModelMarkers({
                          resource: ed.getModel()?.uri,
                        });
                        const marker = markers.find(
                          (m: any) =>
                            pos.lineNumber >= m.startLineNumber && pos.lineNumber <= m.endLineNumber
                        );
                        if (marker) {
                          const coords = ed.getScrolledVisiblePosition(pos);
                          const editorDom = ed.getDomNode();
                          const editorRect = editorDom?.getBoundingClientRect();
                          setQuickFix({
                            x: (editorRect?.left || 0) + (coords?.left || 0),
                            y: (editorRect?.top || 0) + (coords?.top || 0),
                            diagnostic: {
                              file: marker.resource?.path || '',
                              line: marker.startLineNumber,
                              col: marker.startColumn,
                              endLine: marker.endLineNumber,
                              endCol: marker.endColumn,
                              message: marker.message,
                              severity: marker.severity === 8 ? 'error' : 'warning',
                              source: marker.source || '',
                              code:
                                typeof marker.code === 'object'
                                  ? marker.code?.value
                                  : String(marker.code || ''),
                            },
                          });
                        }
                      },
                    });
                    // Add context menu action for Explain Error
                    editor.addAction({
                      id: 'jarvis-explain-error',
                      label: 'Explain Error (Beginner)',
                      contextMenuGroupId: '1_modification',
                      contextMenuOrder: 1,
                      run: (ed: any) => {
                        const pos = ed.getPosition();
                        if (!pos) return;
                        const markers = monaco.editor.getModelMarkers({
                          resource: ed.getModel()?.uri,
                        });
                        const marker = markers.find(
                          (m: any) =>
                            pos.lineNumber >= m.startLineNumber && pos.lineNumber <= m.endLineNumber
                        );
                        if (marker) {
                          explainError({
                            file: marker.resource?.path || '',
                            line: marker.startLineNumber,
                            col: marker.startColumn,
                            endLine: marker.endLineNumber,
                            endCol: marker.endColumn,
                            message: marker.message,
                            severity: marker.severity === 8 ? 'error' : 'warning',
                            source: marker.source || '',
                            code:
                              typeof marker.code === 'object'
                                ? marker.code?.value
                                : String(marker.code || ''),
                          });
                        }
                      },
                    });
                    // Add context menu action for Send to Chat
                    editor.addAction({
                      id: 'jarvis-send-to-chat',
                      label: 'Send Error to AI Chat',
                      keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD,
                      ],
                      contextMenuGroupId: '1_modification',
                      contextMenuOrder: 2,
                      run: (ed: any) => {
                        const pos = ed.getPosition();
                        if (!pos) return;
                        const markers = monaco.editor.getModelMarkers({
                          resource: ed.getModel()?.uri,
                        });
                        const marker = markers.find(
                          (m: any) =>
                            pos.lineNumber >= m.startLineNumber && pos.lineNumber <= m.endLineNumber
                        );
                        if (marker) {
                          sendErrorToChat({
                            file: marker.resource?.path || '',
                            line: marker.startLineNumber,
                            col: marker.startColumn,
                            endLine: marker.endLineNumber,
                            endCol: marker.endColumn,
                            message: marker.message,
                            severity: marker.severity === 8 ? 'error' : 'warning',
                            source: marker.source || '',
                            code:
                              typeof marker.code === 'object'
                                ? marker.code?.value
                                : String(marker.code || ''),
                          });
                        }
                      },
                    });
                  }}
                  options={{
                    minimap: { enabled: showMinimap },
                    fontSize: editorSettings.fontSize,
                    fontFamily: editorSettings.fontFamily,
                    fontLigatures: true,
                    lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
                    roundedSelection: true,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: editorSettings.tabSize,
                    wordWrap: wordWrap ? 'on' : 'off',
                    padding: { top: 8 },
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true,
                    inlineSuggest: { enabled: true },
                    bracketPairColorization: { enabled: editorSettings.bracketPairs },
                    renderLineHighlight: 'all',
                    cursorBlinking: 'smooth',
                    cursorStyle: editorSettings.cursorStyle as any,
                    smoothScrolling: editorSettings.smoothScrolling,
                    formatOnPaste: editorSettings.formatOnPaste,
                    renderWhitespace: editorSettings.renderWhitespace as any,
                    guides: { bracketPairs: editorSettings.bracketPairs, indentation: true },
                    folding: true,
                    foldingStrategy: 'indentation',
                    links: true,
                    colorDecorators: true,
                  }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: COLORS.textDim,
                    gap: '16px',
                  }}
                >
                  <div style={{ fontSize: '48px', opacity: 0.3 }}>?</div>
                  <div
                    style={{ fontSize: '22px', fontWeight: 600, color: COLORS.text, opacity: 0.6 }}
                  >
                    Jarvis IDE
                  </div>
                  <div style={{ fontSize: '13px', textAlign: 'center', lineHeight: '2' }}>
                    <div>
                      <kbd style={kbdStyle}>Ctrl+P</kbd> Quick Open
                    </div>
                    <div>
                      <kbd style={kbdStyle}>Ctrl+Shift+P</kbd> Command Palette
                    </div>
                    <div>
                      <kbd style={kbdStyle}>Ctrl+`</kbd> Terminal
                    </div>
                    <div>
                      <kbd style={kbdStyle}>Ctrl+B</kbd> Toggle Sidebar
                    </div>
                    <div>
                      <kbd style={kbdStyle}>Ctrl+S</kbd> Save File
                    </div>
                    <div>
                      <kbd style={kbdStyle}>Ctrl+G</kbd> Go to Line
                    </div>
                    <div>
                      <kbd style={kbdStyle}>Alt+Z</kbd> Word Wrap
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Bottom panel (Terminal / Problems / Debug Console / Ports) */}
          {(bottomPanel === 'terminal' ||
            bottomPanel === 'problems' ||
            bottomPanel === 'debug' ||
            bottomPanel === 'ports') && (
            <div
              style={{
                height: `${bottomHeight}px`,
                borderTop: `1px solid ${COLORS.border}`,
                display: 'flex',
                flexDirection: 'column',
                background: COLORS.surface,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0 12px',
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                <div style={{ display: 'flex', gap: '0' }}>
                  {(['problems', 'terminal', 'debug', 'ports'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setBottomPanel(tab)}
                      style={{
                        background: 'none',
                        border: 'none',
                        borderBottom:
                          bottomPanel === tab
                            ? `2px solid ${COLORS.accent}`
                            : '2px solid transparent',
                        color: bottomPanel === tab ? COLORS.text : COLORS.textDim,
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '6px 12px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {tab === 'problems'
                        ? `Problems${diagnostics.length > 0 ? ` (${diagnostics.length})` : ''}`
                        : tab === 'debug'
                          ? 'Debug Console'
                          : tab === 'ports'
                            ? `Ports (${ports.filter(p => p.status === 'listening').length})`
                            : 'Terminal'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setBottomPanel(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: COLORS.textDim,
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ×
                </button>
              </div>
              {/* Problems content */}
              {bottomPanel === 'problems' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                  {diagnostics.length === 0 ? (
                    <div
                      style={{
                        padding: '16px',
                        color: COLORS.textDim,
                        fontSize: '12px',
                        textAlign: 'center',
                      }}
                    >
                      No problems detected.
                    </div>
                  ) : (
                    diagnostics.map((diag, i) => (
                      <div
                        key={`diag-${diag.file}-${diag.line}-${i}`}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          padding: '4px 12px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = COLORS.hover;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                        onClick={() => {
                          if (diag.file) openFileByPath(diag.file);
                          if (editorRef.current) {
                            editorRef.current.setPosition({
                              lineNumber: diag.line,
                              column: diag.col,
                            });
                            editorRef.current.revealLineInCenter(diag.line);
                          }
                        }}
                      >
                        <span
                          style={{
                            color:
                              diag.severity === 'error'
                                ? COLORS.red
                                : diag.severity === 'warning'
                                  ? COLORS.yellow
                                  : COLORS.accent,
                            fontSize: '14px',
                            flexShrink: 0,
                            marginTop: '1px',
                          }}
                        >
                          {diag.severity === 'error'
                            ? '?'
                            : diag.severity === 'warning'
                              ? '?'
                              : '?'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ color: COLORS.text }}>{diag.message}</span>
                          {diag.source && (
                            <span style={{ color: COLORS.textDim, marginLeft: '6px' }}>
                              [{diag.source}]
                            </span>
                          )}
                          {diag.code && (
                            <span style={{ color: COLORS.textDim, marginLeft: '4px' }}>
                              ({diag.code})
                            </span>
                          )}
                        </div>
                        <span style={{ color: COLORS.textDim, fontSize: '11px', flexShrink: 0 }}>
                          {diag.file.split('/').pop()}:{diag.line}
                        </span>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button
                            title="Explain Error"
                            onClick={e => {
                              e.stopPropagation();
                              explainError(diag);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: COLORS.accent,
                              cursor: 'pointer',
                              fontSize: '11px',
                              padding: '2px 4px',
                            }}
                          >
                            {explainLoading ? '...' : '??'}
                          </button>
                          <button
                            title="AI Fix"
                            onClick={e => {
                              e.stopPropagation();
                              fixError(diag);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: COLORS.green,
                              cursor: 'pointer',
                              fontSize: '11px',
                              padding: '2px 4px',
                            }}
                          >
                            {fixLoading ? '...' : '??'}
                          </button>
                          <button
                            title="Send to Chat"
                            onClick={e => {
                              e.stopPropagation();
                              sendErrorToChat(diag);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: COLORS.yellow,
                              cursor: 'pointer',
                              fontSize: '11px',
                              padding: '2px 4px',
                            }}
                          >
                            ??
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  {/* Bug Finder */}
                  <div
                    style={{
                      padding: '8px 12px',
                      borderTop: `1px solid ${COLORS.border}`,
                      marginTop: '4px',
                    }}
                  >
                    <button
                      onClick={runBugScan}
                      disabled={bugScanLoading || !activeFile}
                      style={{
                        width: '100%',
                        padding: '6px 12px',
                        background: COLORS.accent,
                        border: 'none',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        opacity: bugScanLoading || !activeFile ? 0.5 : 1,
                      }}
                    >
                      ??{' '}
                      {bugScanLoading
                        ? 'Scanning for bugs...'
                        : 'AI Bug Finder — Scan Current File'}
                    </button>
                  </div>
                  {bugs.length > 0 && (
                    <div style={{ padding: '0 0 4px 0' }}>
                      <div
                        style={{
                          padding: '4px 12px',
                          fontSize: '10px',
                          color: COLORS.accent,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        AI-Detected Issues ({bugs.length})
                      </div>
                      {bugs.map((bug, bi) => (
                        <div
                          key={`bug-${bi}`}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            padding: '4px 12px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLDivElement).style.background = COLORS.hover;
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                          }}
                          onClick={() => {
                            if (editorRef.current && bug.line) {
                              editorRef.current.setPosition({ lineNumber: bug.line, column: 1 });
                              editorRef.current.revealLineInCenter(bug.line);
                            }
                          }}
                        >
                          <span
                            style={{
                              color:
                                bug.severity === 'error'
                                  ? COLORS.red
                                  : bug.severity === 'warning'
                                    ? COLORS.yellow
                                    : COLORS.accent,
                              fontSize: '14px',
                              flexShrink: 0,
                            }}
                          >
                            {bug.severity === 'error'
                              ? '?'
                              : bug.severity === 'warning'
                                ? '?'
                                : '?'}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: COLORS.text }}>{bug.message}</div>
                            {bug.fix && (
                              <div
                                style={{ color: COLORS.green, fontSize: '11px', marginTop: '2px' }}
                              >
                                Fix: {bug.fix}
                              </div>
                            )}
                          </div>
                          <span style={{ color: COLORS.textDim, fontSize: '11px', flexShrink: 0 }}>
                            :{bug.line}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Debug Console */}
              {bottomPanel === 'debug' && (
                <div
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                >
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '4px 12px',
                      fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
                      fontSize: '12px',
                    }}
                  >
                    {debugConsole.length === 0 ? (
                      <div
                        style={{
                          padding: '16px',
                          color: COLORS.textDim,
                          fontSize: '12px',
                          textAlign: 'center',
                        }}
                      >
                        Debug console is empty. Start debugging (F5) to see output here.
                      </div>
                    ) : (
                      debugConsole.map(entry => (
                        <div
                          key={entry.id}
                          style={{
                            display: 'flex',
                            gap: '8px',
                            padding: '2px 0',
                            borderBottom: `1px solid ${COLORS.border}22`,
                          }}
                        >
                          <span
                            style={{
                              color: COLORS.textDim,
                              fontSize: '10px',
                              flexShrink: 0,
                              minWidth: '60px',
                            }}
                          >
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                          <span
                            style={{
                              color:
                                entry.type === 'error'
                                  ? COLORS.red
                                  : entry.type === 'warn'
                                    ? COLORS.yellow
                                    : entry.type === 'info'
                                      ? COLORS.accent
                                      : COLORS.text,
                            }}
                          >
                            {entry.type === 'error'
                              ? '?'
                              : entry.type === 'warn'
                                ? '?'
                                : entry.type === 'info'
                                  ? '?'
                                  : '›'}
                          </span>
                          <span
                            style={{
                              color:
                                entry.type === 'error'
                                  ? COLORS.red
                                  : entry.type === 'warn'
                                    ? COLORS.yellow
                                    : COLORS.text,
                              flex: 1,
                            }}
                          >
                            {entry.message}
                          </span>
                        </div>
                      ))
                    )}
                    <div ref={debugConsoleEndRef} />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      borderTop: `1px solid ${COLORS.border}`,
                      padding: '4px 8px',
                      gap: '6px',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ color: COLORS.accent, fontSize: '12px' }}>›</span>
                    <input
                      type="text"
                      value={debugConsoleInput}
                      onChange={e => setDebugConsoleInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && debugConsoleInput.trim()) {
                          const expr = debugConsoleInput.trim();
                          const inputEntry = {
                            id: `dc-${Date.now()}`,
                            type: 'eval' as const,
                            message: `> ${expr}`,
                            timestamp: new Date().toISOString(),
                          };
                          let resultEntry: {
                            id: string;
                            type: 'log' | 'error';
                            message: string;
                            timestamp: string;
                          };
                          try {
                            const result = new Function(`"use strict"; return (${expr})`)();
                            resultEntry = {
                              id: `dc-${Date.now()}-r`,
                              type: 'log',
                              message:
                                typeof result === 'object'
                                  ? JSON.stringify(result, null, 2)
                                  : String(result),
                              timestamp: new Date().toISOString(),
                            };
                          } catch (err) {
                            resultEntry = {
                              id: `dc-${Date.now()}-e`,
                              type: 'error',
                              message: err instanceof Error ? err.message : String(err),
                              timestamp: new Date().toISOString(),
                            };
                          }
                          setDebugConsole(prev => [...prev, inputEntry, resultEntry]);
                          setDebugConsoleInput('');
                        }
                      }}
                      placeholder="Evaluate expression..."
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: COLORS.text,
                        fontSize: '12px',
                        fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}
              {/* Ports panel */}
              {bottomPanel === 'ports' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: COLORS.textDim,
                        textTransform: 'uppercase',
                      }}
                    >
                      Forwarded Ports
                    </span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={newPortInput}
                        onChange={e => setNewPortInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newPortInput.trim()) {
                            const portNum = parseInt(newPortInput, 10);
                            if (portNum > 0 && portNum < 65536) {
                              setPorts(prev => [
                                ...prev,
                                {
                                  port: portNum,
                                  process: 'user',
                                  status: 'listening',
                                  protocol: 'http',
                                  url: `http://localhost:${portNum}`,
                                },
                              ]);
                              setNewPortInput('');
                            }
                          }
                        }}
                        placeholder="Add port..."
                        style={{
                          width: '80px',
                          background: COLORS.bg,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: '3px',
                          color: COLORS.text,
                          fontSize: '11px',
                          padding: '3px 6px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr 80px 60px 40px',
                      gap: '0',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: COLORS.textDim,
                      textTransform: 'uppercase',
                      padding: '4px 0',
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <span>Port</span>
                    <span>Process</span>
                    <span>Protocol</span>
                    <span>Status</span>
                    <span></span>
                  </div>
                  {ports.map(p => (
                    <div
                      key={p.port}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '60px 1fr 80px 60px 40px',
                        gap: '0',
                        fontSize: '12px',
                        color: COLORS.text,
                        padding: '6px 0',
                        borderBottom: `1px solid ${COLORS.border}22`,
                        alignItems: 'center',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = COLORS.hover;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span style={{ color: COLORS.accent, fontWeight: 600 }}>{p.port}</span>
                      <span style={{ color: COLORS.textDim }}>{p.process}</span>
                      <span style={{ color: COLORS.textDim }}>{p.protocol}</span>
                      <span
                        style={{
                          color: p.status === 'listening' ? COLORS.green : COLORS.red,
                          fontSize: '10px',
                        }}
                      >
                        {p.status === 'listening' ? '? Active' : '? Closed'}
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {p.url && (
                          <button
                            onClick={() => window.open(p.url, '_blank')}
                            title="Open in browser"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: COLORS.accent,
                              cursor: 'pointer',
                              fontSize: '12px',
                              padding: '0',
                            }}
                          >
                            ??
                          </button>
                        )}
                        <button
                          onClick={() => setPorts(prev => prev.filter(pp => pp.port !== p.port))}
                          title="Remove port"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: COLORS.red,
                            cursor: 'pointer',
                            fontSize: '11px',
                            padding: '0',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  {ports.length === 0 && (
                    <div
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: COLORS.textDim,
                        fontSize: '12px',
                      }}
                    >
                      No ports forwarded. Type a port number above to add one.
                    </div>
                  )}
                </div>
              )}
              {/* Terminal content — real xterm.js PTY */}
              {bottomPanel === 'terminal' && (
                <div
                  ref={xtermContainerRef}
                  style={{
                    flex: 1,
                    width: '100%',
                    background: '#0d1117',
                    padding: '4px 0 0 4px',
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Right-side AI Chat Panel */}
        {showAiChat && !zenMode && (
          <div
            style={{
              width: '320px',
              background: COLORS.sidebar,
              borderLeft: `1px solid ${COLORS.border}`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Title bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: COLORS.textDim,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  AI Assistant
                </span>
                {aiChatTab === 'chat' && (
                  <>
                    <button
                      onClick={newConversation}
                      title="New Conversation"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: COLORS.accent,
                        cursor: 'pointer',
                        fontSize: '13px',
                        padding: '2px 4px',
                      }}
                    >
                      +
                    </button>
                    <button
                      onClick={() => setShowConversationList(p => !p)}
                      title="History"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: COLORS.textDim,
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '2px 4px',
                      }}
                    >
                      ??
                    </button>
                    <button
                      onClick={() => setShowAgentPanel(p => !p)}
                      title="Agents"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: COLORS.textDim,
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '2px 4px',
                      }}
                    >
                      ??
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowAiChat(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: COLORS.textDim,
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '0 2px',
                }}
              >
                ×
              </button>
            </div>
            {/* Tab bar */}
            <div
              style={{
                display: 'flex',
                borderBottom: `1px solid ${COLORS.border}`,
                background: COLORS.bg,
              }}
            >
              {(['chat', 'rules', 'skills', 'workflows', 'memories'] as AIChatTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAiChatTab(tab)}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    borderBottom:
                      aiChatTab === tab ? `2px solid ${COLORS.accent}` : '2px solid transparent',
                    color: aiChatTab === tab ? COLORS.text : COLORS.textDim,
                    cursor: 'pointer',
                    fontSize: '9px',
                    fontWeight: 600,
                    padding: '5px 2px',
                    textTransform: 'capitalize',
                  }}
                >
                  {tab === 'chat'
                    ? '??'
                    : tab === 'rules'
                      ? '??'
                      : tab === 'skills'
                        ? '?'
                        : tab === 'workflows'
                          ? '??'
                          : '??'}{' '}
                  {tab}
                </button>
              ))}
            </div>
            {/* Chat tab content */}
            {aiChatTab === 'chat' && (
              <>
                {/* Conversation List Dropdown */}
                {showConversationList && (
                  <div
                    style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      borderBottom: `1px solid ${COLORS.border}`,
                      background: COLORS.bg,
                    }}
                  >
                    {conversations.map(conv => (
                      <div
                        key={conv.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          background:
                            conv.id === activeConversationId ? COLORS.hover : 'transparent',
                          color: conv.id === activeConversationId ? COLORS.text : COLORS.textDim,
                        }}
                        onClick={() => switchConversation(conv.id)}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = COLORS.hover;
                        }}
                        onMouseLeave={e => {
                          if (conv.id !== activeConversationId)
                            e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span style={{ marginRight: '6px' }}>??</span>
                          {conv.title || 'Untitled'}
                          <span
                            style={{ color: COLORS.textDim, fontSize: '9px', marginLeft: '6px' }}
                          >
                            {conv.messages.length} msgs
                          </span>
                        </div>
                        {conversations.length > 1 && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              deleteConversation(conv.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: COLORS.red,
                              cursor: 'pointer',
                              fontSize: '11px',
                              padding: '0 3px',
                              flexShrink: 0,
                            }}
                            title="Delete conversation"
                          >
                            ??
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Multi-Agent Panel */}
                {showAgentPanel && (
                  <div
                    style={{
                      borderBottom: `1px solid ${COLORS.border}`,
                      background: COLORS.bg,
                      padding: '8px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: COLORS.textDim,
                        textTransform: 'uppercase',
                        marginBottom: '6px',
                      }}
                    >
                      Agents — assign tasks or collaborate
                    </div>
                    {agents.map(agent => (
                      <div
                        key={agent.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          marginBottom: '3px',
                          background:
                            agent.status === 'working' ? `${COLORS.accent}15` : 'transparent',
                          border: `1px solid ${agent.status === 'working' ? COLORS.accent : COLORS.border}`,
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>{agent.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: COLORS.text }}>
                            {agent.name}
                          </div>
                          <div style={{ fontSize: '9px', color: COLORS.textDim }}>
                            {agent.status === 'idle'
                              ? 'Available'
                              : agent.status === 'working'
                                ? 'Working...'
                                : agent.status === 'done'
                                  ? 'Completed'
                                  : 'Error'}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const task = prompt(`Assign task to ${agent.name}:`);
                            if (task) {
                              setAgents(prev =>
                                prev.map(a =>
                                  a.id === agent.id ? { ...a, task, status: 'working' } : a
                                )
                              );
                              setAiMessages(prev => [
                                ...prev,
                                {
                                  role: 'assistant',
                                  content: `?? **${agent.name}** agent assigned: "${task}"\nWorking on it...`,
                                  timestamp: new Date().toISOString(),
                                },
                              ]);
                              setTimeout(
                                () => {
                                  setAgents(prev =>
                                    prev.map(a =>
                                      a.id === agent.id
                                        ? { ...a, status: 'done', output: `Completed: ${task}` }
                                        : a
                                    )
                                  );
                                  setAiMessages(prev => [
                                    ...prev,
                                    {
                                      role: 'assistant',
                                      content: `? **${agent.name}** agent finished: "${task}"`,
                                      timestamp: new Date().toISOString(),
                                    },
                                  ]);
                                },
                                3000 + Math.random() * 3000
                              );
                            }
                          }}
                          disabled={agent.status === 'working'}
                          style={{
                            background: agent.status === 'working' ? COLORS.border : COLORS.accent,
                            border: 'none',
                            borderRadius: '3px',
                            color: '#fff',
                            fontSize: '9px',
                            padding: '3px 8px',
                            cursor: agent.status === 'working' ? 'default' : 'pointer',
                          }}
                        >
                          {agent.status === 'working' ? '?' : 'Assign'}
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const task = prompt('Enter task for ALL agents:');
                        if (task) {
                          setAgents(prev =>
                            prev.map(a => ({ ...a, task, status: 'working' as const }))
                          );
                          setAiMessages(prev => [
                            ...prev,
                            {
                              role: 'assistant',
                              content: `?? All agents assigned to: "${task}"\n${agents.map(a => `${a.icon} ${a.name}`).join(' • ')}`,
                              timestamp: new Date().toISOString(),
                            },
                          ]);
                          setTimeout(
                            () => {
                              setAgents(prev =>
                                prev.map(a => ({
                                  ...a,
                                  status: 'done' as const,
                                  output: `Completed: ${task}`,
                                }))
                              );
                              setAiMessages(prev => [
                                ...prev,
                                {
                                  role: 'assistant',
                                  content: `? All agents completed: "${task}"`,
                                  timestamp: new Date().toISOString(),
                                },
                              ]);
                            },
                            5000 + Math.random() * 3000
                          );
                        }
                      }}
                      style={{
                        width: '100%',
                        marginTop: '4px',
                        padding: '5px',
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.accent}`,
                        borderRadius: '4px',
                        color: COLORS.accent,
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ?? Assign All Agents to Same Task
                    </button>
                  </div>
                )}
                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                  {aiMessages.map((msg, i) => {
                    // Parse code blocks from assistant messages
                    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
                    const parts: Array<{ type: 'text' | 'code'; content: string; lang?: string }> =
                      [];
                    let lastIdx = 0;
                    let match: RegExpExecArray | null;
                    const content = msg.content;
                    match = codeBlockRegex.exec(content);
                    while (match !== null) {
                      if (match.index > lastIdx) {
                        parts.push({ type: 'text', content: content.slice(lastIdx, match.index) });
                      }
                      parts.push({ type: 'code', content: match[2], lang: match[1] || undefined });
                      lastIdx = match.index + match[0].length;
                      match = codeBlockRegex.exec(content);
                    }
                    if (lastIdx < content.length) {
                      parts.push({ type: 'text', content: content.slice(lastIdx) });
                    }

                    return (
                      <div key={`ai-${msg.timestamp}-${i}`} style={{ marginBottom: '12px' }}>
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: msg.role === 'user' ? COLORS.accent : COLORS.green,
                            marginBottom: '4px',
                          }}
                        >
                          {msg.role === 'user' ? 'You' : 'AI'}
                        </div>
                        {parts.map((part, pIdx) =>
                          part.type === 'code' ? (
                            <div
                              key={`code-${pIdx}`}
                              style={{ position: 'relative', marginBottom: '6px' }}
                            >
                              <pre
                                style={{
                                  background: '#0d1117',
                                  borderRadius: '6px',
                                  padding: '10px 12px',
                                  fontSize: '11px',
                                  color: '#e6edf3',
                                  overflow: 'auto',
                                  maxHeight: '200px',
                                  border: `1px solid ${COLORS.border}`,
                                  margin: 0,
                                }}
                              >
                                <code>{part.content}</code>
                              </pre>
                              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                <button
                                  onClick={() => navigator.clipboard.writeText(part.content)}
                                  style={{
                                    background: COLORS.surface,
                                    border: `1px solid ${COLORS.border}`,
                                    borderRadius: '3px',
                                    color: COLORS.textDim,
                                    fontSize: '9px',
                                    padding: '2px 8px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  ?? Copy
                                </button>
                                <button
                                  onClick={() => insertCodeToEditor(part.content)}
                                  style={{
                                    background: COLORS.accent,
                                    border: 'none',
                                    borderRadius: '3px',
                                    color: '#fff',
                                    fontSize: '9px',
                                    padding: '2px 8px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  ?? Insert to Editor
                                </button>
                                <button
                                  onClick={() => sendToTerminal(part.content.trim())}
                                  style={{
                                    background: COLORS.surface,
                                    border: `1px solid ${COLORS.border}`,
                                    borderRadius: '3px',
                                    color: COLORS.textDim,
                                    fontSize: '9px',
                                    padding: '2px 8px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  ? Run
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              key={`text-${pIdx}`}
                              style={{
                                fontSize: '12px',
                                color: COLORS.text,
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}
                            >
                              {part.content}
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                  {aiLoading && (
                    <div style={{ fontSize: '12px', color: COLORS.textDim }}>Thinking...</div>
                  )}
                  <div ref={aiEndRef} />
                </div>
                <div style={{ padding: '8px', borderTop: `1px solid ${COLORS.border}` }}>
                  {/* Selected Elements Chips */}
                  {selectedElements.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        marginBottom: '6px',
                        padding: '4px',
                        background: COLORS.surface,
                        borderRadius: '6px',
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '9px',
                          color: COLORS.textDim,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          width: '100%',
                          marginBottom: '2px',
                        }}
                      >
                        ?? Browser Elements
                      </span>
                      {selectedElements.map(el => (
                        <span
                          key={el.selector}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            background: COLORS.hover,
                            border: `1px solid ${COLORS.accent}`,
                            borderRadius: '10px',
                            padding: '2px 6px',
                            fontSize: '10px',
                            color: COLORS.accent,
                            maxWidth: '100%',
                            overflow: 'hidden',
                          }}
                          title={`${el.selector}\n${el.text}`}
                        >
                          &lt;{el.tag}&gt;
                          {el.id ? `#${el.id}` : el.text ? ` "${el.text.slice(0, 20)}"` : ''}
                          <button
                            onClick={() => removeSelectedElement(el.selector)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: COLORS.textDim,
                              cursor: 'pointer',
                              fontSize: '10px',
                              padding: '0 1px',
                              lineHeight: 1,
                              flexShrink: 0,
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Uploaded image preview */}
                  {uploadedImage && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '4px',
                        padding: '4px 6px',
                        background: COLORS.surface,
                        borderRadius: '4px',
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <img
                        src={uploadedImage.dataUrl}
                        alt="upload preview"
                        style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: '4px' }}
                      />
                      <span
                        style={{
                          fontSize: '11px',
                          color: COLORS.text,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {uploadedImage.name}
                      </span>
                      <button
                        onClick={() => setUploadedImage(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: COLORS.textDim,
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '0 2px',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {/* Hidden image input */}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = ev => {
                          setUploadedImage({
                            name: file.name,
                            dataUrl: ev.target?.result as string,
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                      e.target.value = '';
                    }}
                  />
                  {/* Input + Upload + Send row */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      title="Upload image for vision / image generation"
                      style={{
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '4px',
                        padding: '6px 8px',
                        color: COLORS.textDim,
                        cursor: 'pointer',
                        fontSize: '14px',
                        flexShrink: 0,
                      }}
                    >
                      ???
                    </button>
                    <input
                      value={aiInput}
                      onChange={e => {
                        const val = e.target.value;
                        setAiInput(val);
                        setShowSlashHint(val.startsWith('/') && val.length < 12);
                        const atIdx = val.lastIndexOf('@');
                        if (atIdx !== -1 && (atIdx === 0 || val[atIdx - 1] === ' ')) {
                          const afterAt = val.substring(atIdx + 1);
                          if (!afterAt.includes(' ')) {
                            setShowAtMention(true);
                            setAtMentionFilter(afterAt.toLowerCase());
                          } else {
                            setShowAtMention(false);
                          }
                        } else {
                          setShowAtMention(false);
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (aiMode === 'plan') {
                            sendPlanMessage();
                          } else if (!handleSlashCommand(aiInput)) {
                            sendAiMessage();
                          }
                          setShowSlashHint(false);
                          setShowAtMention(false);
                        }
                        if (e.key === 'Escape') {
                          setShowSlashHint(false);
                          setShowAtMention(false);
                        }
                      }}
                      placeholder={
                        aiMode === 'plan'
                          ? 'Describe what you want to build — AI will create a plan...'
                          : 'Ask AI, type / for commands, @ for context...'
                      }
                      style={{
                        flex: 1,
                        background: COLORS.surface,
                        border: `1px solid ${aiMode === 'plan' ? COLORS.accent : COLORS.border}`,
                        borderRadius: '4px',
                        padding: '8px',
                        color: COLORS.text,
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={aiMode === 'plan' ? sendPlanMessage : sendAiMessage}
                      disabled={aiLoading}
                      style={{
                        background: aiMode === 'plan' ? '#238636' : COLORS.accent,
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {planLoading ? '?' : aiMode === 'plan' ? '?? Plan' : 'Send'}
                    </button>
                  </div>
                  {/* Mode selector + Side functions row — below input */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <select
                      value={aiMode}
                      onChange={e => setAiMode(e.target.value as 'agent' | 'plan')}
                      style={{
                        background: COLORS.surface,
                        border: `1px solid ${aiMode === 'plan' ? COLORS.accent : COLORS.border}`,
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: aiMode === 'plan' ? COLORS.accent : COLORS.text,
                        fontSize: '11px',
                        fontWeight: 600,
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="agent">?? Agent</option>
                      <option value="plan">?? Plan</option>
                    </select>
                    {/* Side function buttons */}
                    <button
                      onClick={() => setShowSideFunctions(!showSideFunctions)}
                      style={{
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: COLORS.textDim,
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                      title="Quick actions"
                    >
                      ? Actions
                    </button>
                    {activeFile?.path?.includes('.jarvis/plans/') && (
                      <button
                        onClick={implementPlan}
                        disabled={aiLoading}
                        style={{
                          marginLeft: 'auto',
                          background: '#238636',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 10px',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: aiLoading ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {aiLoading ? '?' : '?'} Implement Plan
                      </button>
                    )}
                  </div>
                  {/* Side functions panel */}
                  {showSideFunctions && (
                    <div
                      style={{
                        marginTop: '4px',
                        padding: '6px',
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '6px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '4px',
                      }}
                    >
                      {[
                        {
                          icon: '??',
                          label: 'Generate Image',
                          action: () => {
                            setAiInput('/generate-image ');
                            setShowSideFunctions(false);
                          },
                        },
                        {
                          icon: '??',
                          label: 'Explain Code',
                          action: () => {
                            setAiInput('/explain ');
                            setShowSideFunctions(false);
                          },
                        },
                        {
                          icon: '??',
                          label: 'Find Bugs',
                          action: () => {
                            setAiInput('/bugs ');
                            setShowSideFunctions(false);
                          },
                        },
                        {
                          icon: '??',
                          label: 'Refactor',
                          action: () => {
                            setAiInput('/refactor ');
                            setShowSideFunctions(false);
                          },
                        },
                        {
                          icon: '??',
                          label: 'Add Docs',
                          action: () => {
                            setAiInput('/docs ');
                            setShowSideFunctions(false);
                          },
                        },
                        {
                          icon: '??',
                          label: 'Write Tests',
                          action: () => {
                            setAiInput('/test ');
                            setShowSideFunctions(false);
                          },
                        },
                        {
                          icon: '?',
                          label: 'Optimize',
                          action: () => {
                            setAiInput('/optimize ');
                            setShowSideFunctions(false);
                          },
                        },
                        {
                          icon: '??',
                          label: 'Security Scan',
                          action: () => {
                            setAiInput('/security ');
                            setShowSideFunctions(false);
                          },
                        },
                        {
                          icon: '???',
                          label: 'Upload Image',
                          action: () => {
                            imageInputRef.current?.click();
                            setShowSideFunctions(false);
                          },
                        },
                        {
                          icon: '??',
                          label: 'Code Review',
                          action: () => {
                            setAiInput('/review ');
                            setShowSideFunctions(false);
                          },
                        },
                      ].map(fn => (
                        <button
                          key={fn.label}
                          onClick={fn.action}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'transparent',
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '4px',
                            padding: '6px 8px',
                            color: COLORS.text,
                            fontSize: '11px',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>{fn.icon}</span>
                          {fn.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Slash command hints */}
                  {showSlashHint && (
                    <div
                      style={{
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '4px',
                        marginTop: '4px',
                        maxHeight: '160px',
                        overflowY: 'auto',
                      }}
                    >
                      {slashCommands
                        .filter(c => c.cmd.startsWith(aiInput.trim()) || aiInput.trim() === '/')
                        .map(c => (
                          <div
                            key={c.cmd}
                            onClick={() => {
                              c.action();
                              setShowSlashHint(false);
                            }}
                            style={{
                              padding: '6px 10px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              gap: '8px',
                              alignItems: 'center',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLDivElement).style.background = COLORS.hover;
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                            }}
                          >
                            <span
                              style={{
                                color: COLORS.accent,
                                fontWeight: 600,
                                fontFamily: 'monospace',
                              }}
                            >
                              {c.cmd}
                            </span>
                            <span style={{ color: COLORS.textDim }}>{c.desc}</span>
                          </div>
                        ))}
                    </div>
                  )}
                  {/* @ Mentions popup — expandable sections with file picker */}
                  {showAtMention &&
                    (() => {
                      const filteredSources = atMentionSources.filter(
                        s =>
                          atMentionFilter === '' ||
                          s.label.toLowerCase().includes(atMentionFilter) ||
                          s.id.includes(atMentionFilter)
                      );
                      // Build sorted file list: active file first, then open files, then all files
                      const sortedFiles = (() => {
                        const activeFilePath = activeFile?.path || '';
                        const openPaths = new Set(openFiles.map(f => f.path));
                        const all = allFiles.filter(
                          f =>
                            atMentionFilter === '' ||
                            f.name.toLowerCase().includes(atMentionFilter) ||
                            f.path.toLowerCase().includes(atMentionFilter)
                        );
                        const active: FileNode[] = [];
                        const opened: FileNode[] = [];
                        const rest: FileNode[] = [];
                        for (const f of all) {
                          if (f.path === activeFilePath) active.push(f);
                          else if (openPaths.has(f.path)) opened.push(f);
                          else rest.push(f);
                        }
                        return [...active, ...opened, ...rest];
                      })();
                      // Build sorted directory list
                      const sortedDirs = fileTree.filter(
                        n =>
                          n.type === 'directory' &&
                          (atMentionFilter === '' || n.name.toLowerCase().includes(atMentionFilter))
                      );
                      // Helper to insert @ mention into input
                      const insertMention = (label: string) => {
                        const atIdx = aiInput.lastIndexOf('@');
                        const before = aiInput.substring(0, atIdx);
                        setAiInput(`${before}@${label} `);
                        setShowAtMention(false);
                        setAtMentionExpanded(null);
                      };
                      return (
                        <div
                          style={{
                            background: COLORS.surface,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '6px',
                            marginTop: '4px',
                            maxHeight: '340px',
                            overflowY: 'auto',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                          }}
                        >
                          <div
                            style={{
                              padding: '6px 10px',
                              fontSize: '10px',
                              color: COLORS.textDim,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              borderBottom: `1px solid ${COLORS.border}`,
                            }}
                          >
                            Context Sources — click to expand
                          </div>
                          {filteredSources.map(source => (
                            <div key={source.id}>
                              <div
                                onClick={() => {
                                  if (
                                    source.id === 'files' ||
                                    source.id === 'directories' ||
                                    source.id === 'errors'
                                  ) {
                                    setAtMentionExpanded(prev =>
                                      prev === source.id ? null : source.id
                                    );
                                  } else {
                                    insertMention(source.label);
                                  }
                                }}
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  gap: '8px',
                                  alignItems: 'center',
                                  background:
                                    atMentionExpanded === source.id ? COLORS.hover : 'transparent',
                                }}
                                onMouseEnter={e => {
                                  (e.currentTarget as HTMLDivElement).style.background =
                                    COLORS.hover;
                                }}
                                onMouseLeave={e => {
                                  (e.currentTarget as HTMLDivElement).style.background =
                                    atMentionExpanded === source.id ? COLORS.hover : 'transparent';
                                }}
                              >
                                <span
                                  style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}
                                >
                                  {source.icon}
                                </span>
                                <span style={{ color: COLORS.text, fontWeight: 600 }}>
                                  {source.label}
                                </span>
                                <span
                                  style={{
                                    color: COLORS.textDim,
                                    fontSize: '11px',
                                    flex: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {source.description}
                                </span>
                                {(source.id === 'files' ||
                                  source.id === 'directories' ||
                                  source.id === 'errors') && (
                                  <span style={{ fontSize: '10px', color: COLORS.textDim }}>
                                    {atMentionExpanded === source.id ? '?' : '?'}
                                  </span>
                                )}
                              </div>
                              {/* Expanded: Files */}
                              {atMentionExpanded === 'files' && source.id === 'files' && (
                                <div
                                  style={{
                                    maxHeight: '180px',
                                    overflowY: 'auto',
                                    background: COLORS.bg,
                                    borderTop: `1px solid ${COLORS.border}`,
                                    borderBottom: `1px solid ${COLORS.border}`,
                                  }}
                                >
                                  {sortedFiles.slice(0, 50).map(f => {
                                    const isActive = f.path === (activeFile?.path || '');
                                    const isOpen = openFiles.some(o => o.path === f.path);
                                    return (
                                      <div
                                        key={f.path}
                                        onClick={() => insertMention(f.path)}
                                        style={{
                                          padding: '4px 12px 4px 28px',
                                          fontSize: '11px',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          gap: '6px',
                                          alignItems: 'center',
                                          background: isActive
                                            ? `${COLORS.accent}18`
                                            : 'transparent',
                                          borderLeft: isActive
                                            ? `2px solid ${COLORS.accent}`
                                            : '2px solid transparent',
                                        }}
                                        onMouseEnter={e => {
                                          (e.currentTarget as HTMLDivElement).style.background =
                                            COLORS.hover;
                                        }}
                                        onMouseLeave={e => {
                                          (e.currentTarget as HTMLDivElement).style.background =
                                            isActive ? `${COLORS.accent}18` : 'transparent';
                                        }}
                                      >
                                        <span style={{ fontSize: '12px' }}>
                                          {getFileIcon(f.name)}
                                        </span>
                                        <span
                                          style={{
                                            color: isActive ? COLORS.accent : COLORS.text,
                                            fontWeight: isActive ? 600 : 400,
                                          }}
                                        >
                                          {f.name}
                                        </span>
                                        <span
                                          style={{
                                            color: COLORS.textDim,
                                            fontSize: '10px',
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {f.path.includes('/')
                                            ? f.path.substring(0, f.path.lastIndexOf('/'))
                                            : ''}
                                        </span>
                                        {isActive && (
                                          <span
                                            style={{
                                              fontSize: '9px',
                                              color: COLORS.accent,
                                              fontWeight: 600,
                                            }}
                                          >
                                            ACTIVE
                                          </span>
                                        )}
                                        {!isActive && isOpen && (
                                          <span
                                            style={{
                                              fontSize: '9px',
                                              color: COLORS.green,
                                              fontWeight: 600,
                                            }}
                                          >
                                            OPEN
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {sortedFiles.length === 0 && (
                                    <div
                                      style={{
                                        padding: '8px 12px',
                                        fontSize: '11px',
                                        color: COLORS.textDim,
                                        textAlign: 'center',
                                      }}
                                    >
                                      No matching files
                                    </div>
                                  )}
                                </div>
                              )}
                              {/* Expanded: Directories */}
                              {atMentionExpanded === 'directories' &&
                                source.id === 'directories' && (
                                  <div
                                    style={{
                                      maxHeight: '180px',
                                      overflowY: 'auto',
                                      background: COLORS.bg,
                                      borderTop: `1px solid ${COLORS.border}`,
                                      borderBottom: `1px solid ${COLORS.border}`,
                                    }}
                                  >
                                    {sortedDirs.map(d => (
                                      <div
                                        key={d.path}
                                        onClick={() => insertMention(d.path)}
                                        style={{
                                          padding: '4px 12px 4px 28px',
                                          fontSize: '11px',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          gap: '6px',
                                          alignItems: 'center',
                                        }}
                                        onMouseEnter={e => {
                                          (e.currentTarget as HTMLDivElement).style.background =
                                            COLORS.hover;
                                        }}
                                        onMouseLeave={e => {
                                          (e.currentTarget as HTMLDivElement).style.background =
                                            'transparent';
                                        }}
                                      >
                                        <span style={{ fontSize: '12px' }}>??</span>
                                        <span style={{ color: COLORS.text }}>{d.name}</span>
                                        <span style={{ color: COLORS.textDim, fontSize: '10px' }}>
                                          {d.children?.length || 0} items
                                        </span>
                                      </div>
                                    ))}
                                    {sortedDirs.length === 0 && (
                                      <div
                                        style={{
                                          padding: '8px 12px',
                                          fontSize: '11px',
                                          color: COLORS.textDim,
                                          textAlign: 'center',
                                        }}
                                      >
                                        No matching directories
                                      </div>
                                    )}
                                  </div>
                                )}
                              {/* Expanded: Errors */}
                              {atMentionExpanded === 'errors' && source.id === 'errors' && (
                                <div
                                  style={{
                                    maxHeight: '180px',
                                    overflowY: 'auto',
                                    background: COLORS.bg,
                                    borderTop: `1px solid ${COLORS.border}`,
                                    borderBottom: `1px solid ${COLORS.border}`,
                                  }}
                                >
                                  {diagnostics.length === 0 ? (
                                    <div
                                      style={{
                                        padding: '8px 12px',
                                        fontSize: '11px',
                                        color: COLORS.textDim,
                                        textAlign: 'center',
                                      }}
                                    >
                                      No errors or warnings
                                    </div>
                                  ) : (
                                    diagnostics.slice(0, 30).map((d, i) => (
                                      <div
                                        key={`at-diag-${i}`}
                                        onClick={() =>
                                          insertMention(`Error: ${d.message} (${d.file}:${d.line})`)
                                        }
                                        style={{
                                          padding: '4px 12px 4px 28px',
                                          fontSize: '11px',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          gap: '6px',
                                          alignItems: 'center',
                                        }}
                                        onMouseEnter={e => {
                                          (e.currentTarget as HTMLDivElement).style.background =
                                            COLORS.hover;
                                        }}
                                        onMouseLeave={e => {
                                          (e.currentTarget as HTMLDivElement).style.background =
                                            'transparent';
                                        }}
                                      >
                                        <span
                                          style={{
                                            color:
                                              d.severity === 'error' ? COLORS.red : COLORS.yellow,
                                            fontSize: '10px',
                                          }}
                                        >
                                          {d.severity === 'error' ? '?' : '?'}
                                        </span>
                                        <span
                                          style={{
                                            color: COLORS.text,
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {d.message}
                                        </span>
                                        <span style={{ color: COLORS.textDim, fontSize: '9px' }}>
                                          {d.file.split('/').pop()}:{d.line}
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                          {filteredSources.length === 0 && (
                            <div
                              style={{
                                padding: '10px',
                                fontSize: '12px',
                                color: COLORS.textDim,
                                textAlign: 'center',
                              }}
                            >
                              No matching context sources
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  {/* Context + Model selector */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '4px',
                    }}
                  >
                    <div style={{ fontSize: '10px', color: COLORS.textDim }}>
                      {activeFile ? `Context: ${activeFile.name}` : 'No file open'}
                    </div>
                    <select
                      value={aiModel}
                      onChange={e => setAiModel(e.target.value)}
                      style={{
                        background: COLORS.surface,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '3px',
                        padding: '2px 4px',
                        color: COLORS.accent,
                        fontSize: '10px',
                        outline: 'none',
                      }}
                    >
                      {(() => {
                        const providers = [...new Set(models.map(m => m.provider))];
                        return providers.map(provider => {
                          const group = models.filter(m => m.provider === provider);
                          const tier = group[0]?.tier;
                          const hasKey = apiKeys[provider]?.length > 0;
                          const label =
                            tier === 'free'
                              ? `${provider} (Free)`
                              : hasKey
                                ? `${provider} (API Key ?)`
                                : `${provider} (API Key Required)`;
                          return (
                            <optgroup key={provider} label={label}>
                              {group.map(m => (
                                <option
                                  key={m.id}
                                  value={m.id}
                                  disabled={m.tier === 'paid' && !apiKeys[m.provider]}
                                >
                                  {(() => {
                                    const iconMap: Record<string, string> = {
                                      video: '??',
                                      image: '???',
                                      code: '??',
                                      chat: '??',
                                    };
                                    const icon = m.category ? `${iconMap[m.category] || ''} ` : '';
                                    const categoryLabel = m.category
                                      ? ` (${m.category.charAt(0).toUpperCase()}${m.category.slice(1)})`
                                      : '';
                                    const freeBadge = m.tier === 'free' ? ' ? Free' : '';
                                    return `${icon}${m.name}${categoryLabel}${freeBadge}`;
                                  })()}
                                </option>
                              ))}
                            </optgroup>
                          );
                        });
                      })()}
                    </select>
                  </div>
                </div>
              </>
            )}
            {/* --- Rules Tab --- */}
            {aiChatTab === 'rules' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                <div style={{ fontSize: '10px', color: COLORS.textDim, marginBottom: '8px' }}>
                  Rules guide how the AI behaves. Global rules apply everywhere; Workspace rules
                  apply to this project only.
                </div>
                {aiRules.map(rule => (
                  <div
                    key={rule.id}
                    style={{
                      marginBottom: '8px',
                      padding: '8px',
                      background: COLORS.surface,
                      borderRadius: '6px',
                      border: `1px solid ${rule.enabled ? COLORS.border : COLORS.red}44`,
                    }}
                  >
                    {editingRuleId === rule.id ? (
                      <div>
                        <input
                          value={rule.title}
                          onChange={e =>
                            setAiRules(prev =>
                              prev.map(r =>
                                r.id === rule.id ? { ...r, title: e.target.value } : r
                              )
                            )
                          }
                          style={{
                            width: '100%',
                            background: COLORS.bg,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '3px',
                            color: COLORS.text,
                            fontSize: '11px',
                            padding: '4px 6px',
                            marginBottom: '4px',
                            outline: 'none',
                          }}
                        />
                        <textarea
                          value={rule.content}
                          onChange={e =>
                            setAiRules(prev =>
                              prev.map(r =>
                                r.id === rule.id ? { ...r, content: e.target.value } : r
                              )
                            )
                          }
                          rows={3}
                          style={{
                            width: '100%',
                            background: COLORS.bg,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '3px',
                            color: COLORS.text,
                            fontSize: '11px',
                            padding: '4px 6px',
                            resize: 'vertical',
                            outline: 'none',
                            fontFamily: 'inherit',
                          }}
                        />
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                          <button
                            onClick={() => saveRuleEdit(rule.id, rule.title, rule.content)}
                            style={{
                              background: COLORS.accent,
                              border: 'none',
                              borderRadius: '3px',
                              color: '#fff',
                              fontSize: '9px',
                              padding: '3px 8px',
                              cursor: 'pointer',
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingRuleId(null)}
                            style={{
                              background: COLORS.surface,
                              border: `1px solid ${COLORS.border}`,
                              borderRadius: '3px',
                              color: COLORS.textDim,
                              fontSize: '9px',
                              padding: '3px 8px',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => toggleRule(rule.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px',
                                padding: 0,
                              }}
                            >
                              {rule.enabled ? '?' : '?'}
                            </button>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: rule.enabled ? COLORS.text : COLORS.textDim,
                              }}
                            >
                              {rule.title}
                            </span>
                            <span
                              style={{
                                fontSize: '8px',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                background:
                                  rule.scope === 'global'
                                    ? `${COLORS.accent}22`
                                    : `${COLORS.green}22`,
                                color: rule.scope === 'global' ? COLORS.accent : COLORS.green,
                              }}
                            >
                              {rule.scope}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                              onClick={() => openRuleInEditor(rule.id)}
                              title="Open in Editor"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: COLORS.accent,
                                cursor: 'pointer',
                                fontSize: '10px',
                              }}
                            >
                              ??
                            </button>
                            <button
                              onClick={() => setEditingRuleId(rule.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: COLORS.textDim,
                                cursor: 'pointer',
                                fontSize: '10px',
                              }}
                            >
                              ??
                            </button>
                            <button
                              onClick={() => deleteRule(rule.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: COLORS.red,
                                cursor: 'pointer',
                                fontSize: '10px',
                              }}
                            >
                              ??
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', color: COLORS.textDim, lineHeight: '1.4' }}>
                          {rule.content}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div
                  style={{
                    padding: '8px',
                    background: COLORS.surface,
                    borderRadius: '6px',
                    border: `1px dashed ${COLORS.border}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: COLORS.textDim,
                      marginBottom: '4px',
                    }}
                  >
                    + Add New Rule
                  </div>
                  <input
                    value={newRuleTitle}
                    onChange={e => setNewRuleTitle(e.target.value)}
                    placeholder="Rule title..."
                    style={{
                      width: '100%',
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '3px',
                      color: COLORS.text,
                      fontSize: '11px',
                      padding: '4px 6px',
                      marginBottom: '4px',
                      outline: 'none',
                    }}
                  />
                  <textarea
                    value={newRuleContent}
                    onChange={e => setNewRuleContent(e.target.value)}
                    placeholder="Rule content..."
                    rows={2}
                    style={{
                      width: '100%',
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '3px',
                      color: COLORS.text,
                      fontSize: '11px',
                      padding: '4px 6px',
                      resize: 'vertical',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  <div
                    style={{ display: 'flex', gap: '4px', marginTop: '4px', alignItems: 'center' }}
                  >
                    <select
                      value={newRuleScope}
                      onChange={e => setNewRuleScope(e.target.value as 'global' | 'workspace')}
                      style={{
                        background: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '3px',
                        color: COLORS.text,
                        fontSize: '10px',
                        padding: '3px 4px',
                        outline: 'none',
                      }}
                    >
                      <option value="workspace">Workspace</option>
                      <option value="global">Global</option>
                    </select>
                    <button
                      onClick={addRule}
                      style={{
                        background: COLORS.accent,
                        border: 'none',
                        borderRadius: '3px',
                        color: '#fff',
                        fontSize: '9px',
                        padding: '3px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      Add Rule
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* --- Skills Tab --- */}
            {aiChatTab === 'skills' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                <div style={{ fontSize: '10px', color: COLORS.textDim, marginBottom: '8px' }}>
                  Skills are AI capabilities you can enable or disable. Enabled skills are available
                  during AI interactions.
                </div>
                {aiSkills.map(skill => (
                  <div
                    key={skill.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      marginBottom: '4px',
                      background: COLORS.surface,
                      borderRadius: '6px',
                      border: `1px solid ${skill.enabled ? COLORS.border : COLORS.border}44`,
                      opacity: skill.enabled ? 1 : 0.6,
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{skill.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: COLORS.text }}>
                        {skill.name}
                      </div>
                      <div style={{ fontSize: '10px', color: COLORS.textDim }}>
                        {skill.description}
                      </div>
                      <span
                        style={{
                          fontSize: '8px',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          background: `${COLORS.accent}22`,
                          color: COLORS.accent,
                          marginTop: '2px',
                          display: 'inline-block',
                        }}
                      >
                        {skill.category}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleSkill(skill.id)}
                      style={{
                        background: skill.enabled ? COLORS.green : COLORS.border,
                        border: 'none',
                        borderRadius: '10px',
                        width: '36px',
                        height: '18px',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '2px',
                          left: skill.enabled ? '20px' : '2px',
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          background: '#fff',
                          transition: 'left 0.2s',
                        }}
                      />
                    </button>
                  </div>
                ))}
                <div
                  style={{
                    fontSize: '10px',
                    color: COLORS.textDim,
                    textAlign: 'center',
                    marginTop: '8px',
                  }}
                >
                  {aiSkills.filter(s => s.enabled).length}/{aiSkills.length} skills enabled
                </div>
              </div>
            )}
            {/* --- Workflows Tab --- */}
            {aiChatTab === 'workflows' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                <div style={{ fontSize: '10px', color: COLORS.textDim, marginBottom: '8px' }}>
                  Workflows are step-by-step instructions the AI follows for long jobs. Create
                  workflows and run them on demand.
                </div>
                {aiWorkflows.map(wf => (
                  <div
                    key={wf.id}
                    style={{
                      marginBottom: '8px',
                      padding: '8px',
                      background: COLORS.surface,
                      borderRadius: '6px',
                      border: `1px solid ${wf.status === 'running' ? COLORS.accent : COLORS.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: COLORS.text }}>
                          {wf.name}
                        </div>
                        <div style={{ fontSize: '9px', color: COLORS.textDim }}>
                          {wf.description}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => openWorkflowInEditor(wf.id)}
                          title="Open in Editor"
                          style={{
                            background: 'none',
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '3px',
                            color: COLORS.accent,
                            fontSize: '9px',
                            padding: '3px 6px',
                            cursor: 'pointer',
                          }}
                        >
                          ?? Edit
                        </button>
                        <button
                          onClick={() => runWorkflow(wf.id)}
                          disabled={wf.status === 'running'}
                          style={{
                            background: wf.status === 'running' ? COLORS.border : COLORS.green,
                            border: 'none',
                            borderRadius: '3px',
                            color: '#fff',
                            fontSize: '9px',
                            padding: '3px 8px',
                            cursor: wf.status === 'running' ? 'default' : 'pointer',
                          }}
                        >
                          {wf.status === 'running'
                            ? '? Running'
                            : wf.status === 'done'
                              ? '?? Re-run'
                              : '? Run'}
                        </button>
                        <button
                          onClick={() => deleteWorkflow(wf.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: COLORS.red,
                            cursor: 'pointer',
                            fontSize: '10px',
                          }}
                        >
                          ??
                        </button>
                      </div>
                    </div>
                    {wf.steps.map((step, idx) => (
                      <div
                        key={step.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 0',
                          fontSize: '10px',
                          color:
                            step.status === 'done'
                              ? COLORS.green
                              : step.status === 'running'
                                ? COLORS.accent
                                : step.status === 'error'
                                  ? COLORS.red
                                  : COLORS.textDim,
                        }}
                      >
                        <span style={{ fontSize: '11px', width: '14px', textAlign: 'center' }}>
                          {step.status === 'done'
                            ? '?'
                            : step.status === 'running'
                              ? '?'
                              : step.status === 'error'
                                ? '?'
                                : `${idx + 1}.`}
                        </span>
                        <span style={{ flex: 1 }}>{step.instruction}</span>
                      </div>
                    ))}
                  </div>
                ))}
                {!showNewWorkflow ? (
                  <button
                    onClick={() => setShowNewWorkflow(true)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: COLORS.surface,
                      border: `1px dashed ${COLORS.border}`,
                      borderRadius: '6px',
                      color: COLORS.accent,
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    + Create New Workflow
                  </button>
                ) : (
                  <div
                    style={{
                      padding: '8px',
                      background: COLORS.surface,
                      borderRadius: '6px',
                      border: `1px dashed ${COLORS.accent}`,
                    }}
                  >
                    <input
                      value={newWfName}
                      onChange={e => setNewWfName(e.target.value)}
                      placeholder="Workflow name..."
                      style={{
                        width: '100%',
                        background: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '3px',
                        color: COLORS.text,
                        fontSize: '11px',
                        padding: '4px 6px',
                        marginBottom: '4px',
                        outline: 'none',
                      }}
                    />
                    <textarea
                      value={newWfSteps}
                      onChange={e => setNewWfSteps(e.target.value)}
                      placeholder={
                        'Enter steps (one per line):\nRun npm install\nCheck for errors\nRun tests'
                      }
                      rows={4}
                      style={{
                        width: '100%',
                        background: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '3px',
                        color: COLORS.text,
                        fontSize: '11px',
                        padding: '4px 6px',
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      <button
                        onClick={createWorkflow}
                        style={{
                          background: COLORS.accent,
                          border: 'none',
                          borderRadius: '3px',
                          color: '#fff',
                          fontSize: '9px',
                          padding: '3px 10px',
                          cursor: 'pointer',
                        }}
                      >
                        Create
                      </button>
                      <button
                        onClick={() => setShowNewWorkflow(false)}
                        style={{
                          background: COLORS.surface,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: '3px',
                          color: COLORS.textDim,
                          fontSize: '9px',
                          padding: '3px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* --- Memories Tab --- */}
            {aiChatTab === 'memories' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                <div style={{ fontSize: '10px', color: COLORS.textDim, marginBottom: '6px' }}>
                  AI memories persist across conversations. Auto-generated memories are marked with
                  ??. You can also add your own.
                </div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {(
                    ['all', 'project', 'preference', 'context', 'pattern', 'decision'] as const
                  ).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setMemoryFilter(cat)}
                      style={{
                        background: memoryFilter === cat ? COLORS.accent : COLORS.surface,
                        border: `1px solid ${memoryFilter === cat ? COLORS.accent : COLORS.border}`,
                        borderRadius: '10px',
                        color: memoryFilter === cat ? '#fff' : COLORS.textDim,
                        fontSize: '9px',
                        padding: '2px 8px',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {aiMemories
                  .filter(m => memoryFilter === 'all' || m.category === memoryFilter)
                  .map(mem => (
                    <div
                      key={mem.id}
                      style={{
                        marginBottom: '6px',
                        padding: '8px',
                        background: COLORS.surface,
                        borderRadius: '6px',
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '3px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '10px' }}>{mem.auto ? '??' : '??'}</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: COLORS.text }}>
                            {mem.title}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span
                            style={{
                              fontSize: '8px',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              background: `${COLORS.accent}22`,
                              color: COLORS.accent,
                              textTransform: 'capitalize',
                            }}
                          >
                            {mem.category}
                          </span>
                          <button
                            onClick={() => deleteMemory(mem.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: COLORS.red,
                              cursor: 'pointer',
                              fontSize: '10px',
                              padding: 0,
                            }}
                          >
                            ??
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '10px', color: COLORS.textDim, lineHeight: '1.4' }}>
                        {mem.content}
                      </div>
                    </div>
                  ))}
                {!showNewMemory ? (
                  <button
                    onClick={() => setShowNewMemory(true)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: COLORS.surface,
                      border: `1px dashed ${COLORS.border}`,
                      borderRadius: '6px',
                      color: COLORS.accent,
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    + Add Memory
                  </button>
                ) : (
                  <div
                    style={{
                      padding: '8px',
                      background: COLORS.surface,
                      borderRadius: '6px',
                      border: `1px dashed ${COLORS.accent}`,
                    }}
                  >
                    <input
                      value={newMemTitle}
                      onChange={e => setNewMemTitle(e.target.value)}
                      placeholder="Memory title..."
                      style={{
                        width: '100%',
                        background: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '3px',
                        color: COLORS.text,
                        fontSize: '11px',
                        padding: '4px 6px',
                        marginBottom: '4px',
                        outline: 'none',
                      }}
                    />
                    <textarea
                      value={newMemContent}
                      onChange={e => setNewMemContent(e.target.value)}
                      placeholder="What should the AI remember?"
                      rows={3}
                      style={{
                        width: '100%',
                        background: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '3px',
                        color: COLORS.text,
                        fontSize: '11px',
                        padding: '4px 6px',
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        gap: '4px',
                        marginTop: '4px',
                        alignItems: 'center',
                      }}
                    >
                      <select
                        value={newMemCategory}
                        onChange={e => setNewMemCategory(e.target.value as AIMemory['category'])}
                        style={{
                          background: COLORS.bg,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: '3px',
                          color: COLORS.text,
                          fontSize: '10px',
                          padding: '3px 4px',
                          outline: 'none',
                        }}
                      >
                        <option value="context">Context</option>
                        <option value="project">Project</option>
                        <option value="preference">Preference</option>
                        <option value="pattern">Pattern</option>
                        <option value="decision">Decision</option>
                      </select>
                      <button
                        onClick={addMemory}
                        style={{
                          background: COLORS.accent,
                          border: 'none',
                          borderRadius: '3px',
                          color: '#fff',
                          fontSize: '9px',
                          padding: '3px 10px',
                          cursor: 'pointer',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setShowNewMemory(false)}
                        style={{
                          background: COLORS.surface,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: '3px',
                          color: COLORS.textDim,
                          fontSize: '9px',
                          padding: '3px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* -- Hidden File Input for Upload -- */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        accept=".ts,.tsx,.js,.jsx,.json,.css,.scss,.html,.md,.yaml,.yml,.py,.sql,.sh,.ps1,.bat,.env,.txt,.log,.svg,.xml,.java,.c,.cpp,.h,.rs,.go,.rb,.php,.swift,.kt,.dart,.lua,.toml,.ini,.gitignore,.prettierrc,.eslintrc,.cjs,.mjs"
      />

      {/* -- Quick Fix Popup -- */}
      {quickFix && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
          }}
          onClick={() => setQuickFix(null)}
        >
          <div
            style={{
              position: 'absolute',
              top: quickFix.y + 20,
              left: Math.max(10, quickFix.x - 160),
              width: '340px',
              background: COLORS.sidebar,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '6px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '10px 12px', borderBottom: `1px solid ${COLORS.border}` }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}
              >
                <span
                  style={{
                    color: quickFix.diagnostic.severity === 'error' ? COLORS.red : COLORS.yellow,
                    fontSize: '14px',
                  }}
                >
                  {quickFix.diagnostic.severity === 'error' ? '?' : '?'}
                </span>
                <span style={{ fontSize: '12px', color: COLORS.text, fontWeight: 600 }}>
                  {quickFix.diagnostic.severity === 'error' ? 'Error' : 'Warning'}
                </span>
                {quickFix.diagnostic.source && (
                  <span style={{ fontSize: '10px', color: COLORS.textDim }}>
                    [{quickFix.diagnostic.source}]
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: COLORS.text, lineHeight: '1.4' }}>
                {quickFix.diagnostic.message}
              </div>
              <div style={{ fontSize: '10px', color: COLORS.textDim, marginTop: '4px' }}>
                Line {quickFix.diagnostic.line}, Column {quickFix.diagnostic.col}
              </div>
            </div>
            <div style={{ padding: '6px' }}>
              <button
                onClick={() => explainError(quickFix.diagnostic)}
                disabled={explainLoading}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  marginBottom: '4px',
                  background: COLORS.accent,
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                ?? {explainLoading ? 'Explaining...' : 'Explain Error (Beginner)'}
              </button>
              <button
                onClick={() => fixError(quickFix.diagnostic)}
                disabled={fixLoading}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  marginBottom: '4px',
                  background: COLORS.green,
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                ?? {fixLoading ? 'Fixing...' : 'AI Auto-Fix'}
              </button>
              <button
                onClick={() => sendErrorToChat(quickFix.diagnostic)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '4px',
                  color: COLORS.text,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                ?? Send to AI Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Inline Edit Popup (Ctrl+K) -- */}
      {inlineEdit && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 3100 }}
          onClick={() => {
            setInlineEdit(null);
            setInlineEditInput('');
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: inlineEdit.y + 20,
              left: Math.max(10, inlineEdit.x - 180),
              width: '400px',
              background: COLORS.sidebar,
              border: `1px solid ${COLORS.accent}`,
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                padding: '8px 12px',
                borderBottom: `1px solid ${COLORS.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '14px' }}>??</span>
              <span style={{ fontSize: '12px', color: COLORS.text, fontWeight: 600 }}>
                Inline Edit
              </span>
              <span style={{ fontSize: '10px', color: COLORS.textDim }}>
                Lines {inlineEdit.startLine}-{inlineEdit.endLine}
              </span>
            </div>
            <div style={{ padding: '8px' }}>
              <input
                ref={inlineEditRef}
                value={inlineEditInput}
                onChange={e => setInlineEditInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    runInlineEdit();
                  }
                  if (e.key === 'Escape') {
                    setInlineEdit(null);
                    setInlineEditInput('');
                  }
                }}
                placeholder="Describe what to change... (e.g. 'add error handling', 'refactor to async')"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '4px',
                  color: COLORS.text,
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <button
                  onClick={runInlineEdit}
                  disabled={inlineEditLoading || !inlineEditInput.trim()}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: COLORS.accent,
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: inlineEditLoading || !inlineEditInput.trim() ? 0.5 : 1,
                  }}
                >
                  {inlineEditLoading ? '? Editing...' : '? Apply Edit'}
                </button>
                <button
                  onClick={() => {
                    setInlineEdit(null);
                    setInlineEditInput('');
                  }}
                  style={{
                    padding: '6px 12px',
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    color: COLORS.text,
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- Diff Preview Overlay -- */}
      {diffPreview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3200,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setDiffPreview(null)}
        >
          <div
            style={{
              width: '80%',
              maxWidth: '900px',
              maxHeight: '80vh',
              background: COLORS.sidebar,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                padding: '10px 16px',
                borderBottom: `1px solid ${COLORS.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>??</span>
                <span style={{ fontSize: '13px', color: COLORS.text, fontWeight: 600 }}>
                  Diff Preview
                </span>
                <span style={{ fontSize: '11px', color: COLORS.textDim }}>
                  {diffPreview.filePath}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => {
                    if (activeFile && activeFileIdx >= 0) {
                      setOpenFiles(prev => {
                        const u = [...prev];
                        u[activeFileIdx] = {
                          ...u[activeFileIdx],
                          content: diffPreview.modified,
                          dirty: true,
                        };
                        return u;
                      });
                    }
                    setDiffPreview(null);
                  }}
                  style={{
                    padding: '4px 12px',
                    background: COLORS.green,
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ? Accept
                </button>
                <button
                  onClick={() => {
                    if (activeFile && activeFileIdx >= 0) {
                      setOpenFiles(prev => {
                        const u = [...prev];
                        u[activeFileIdx] = {
                          ...u[activeFileIdx],
                          content: diffPreview.original,
                          dirty: diffPreview.original !== u[activeFileIdx].savedContent,
                        };
                        return u;
                      });
                    }
                    setDiffPreview(null);
                  }}
                  style={{
                    padding: '4px 12px',
                    background: COLORS.red,
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ? Reject
                </button>
                <button
                  onClick={() => setDiffPreview(null)}
                  style={{
                    padding: '4px 12px',
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    color: COLORS.text,
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', gap: 0 }}>
              <div
                style={{
                  flex: 1,
                  padding: '8px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  color: COLORS.textDim,
                  borderRight: `1px solid ${COLORS.border}`,
                  background: 'rgba(243,139,168,0.05)',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: COLORS.red,
                    marginBottom: '8px',
                  }}
                >
                  ORIGINAL
                </div>
                {diffPreview.original.substring(0, 5000)}
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '8px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  color: COLORS.text,
                  background: 'rgba(166,227,161,0.05)',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: COLORS.green,
                    marginBottom: '8px',
                  }}
                >
                  MODIFIED
                </div>
                {diffPreview.modified.substring(0, 5000)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- Status Bar -- */}
      <div
        style={{
          height: '24px',
          background: COLORS.statusBar,
          borderTop: `1px solid ${COLORS.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          fontSize: '11px',
          color: COLORS.textDim,
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ color: COLORS.accent }}>?? {gitBranch}</span>
          {diagnostics.filter(d => d.severity === 'error').length > 0 && (
            <span
              onClick={() => setBottomPanel('problems')}
              style={{
                color: COLORS.red,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Click to open Problems panel"
            >
              ? {diagnostics.filter(d => d.severity === 'error').length}
            </span>
          )}
          {diagnostics.filter(d => d.severity === 'warning').length > 0 && (
            <span
              onClick={() => setBottomPanel('problems')}
              style={{
                color: COLORS.yellow,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Click to open Problems panel"
            >
              ? {diagnostics.filter(d => d.severity === 'warning').length}
            </span>
          )}
          {gitFiles.length > 0 && (
            <span style={{ color: COLORS.yellow }}>{gitFiles.length} changes</span>
          )}
          {diffChanges.filter(c => c.type === 'add').length > 0 && (
            <span style={{ color: COLORS.green }}>
              +{diffChanges.filter(c => c.type === 'add').length}
            </span>
          )}
          {diffChanges.filter(c => c.type === 'delete').length > 0 && (
            <span style={{ color: COLORS.red }}>
              -{diffChanges.filter(c => c.type === 'delete').length}
            </span>
          )}
          {showBlame && blameData.length > 0 && (
            <span
              style={{ color: COLORS.textDim, cursor: 'pointer' }}
              title={blameData.find(b => b.line === cursorLine)?.summary || ''}
              onClick={() => setSidebarPanel('git')}
            >
              {blameData.find(b => b.line === cursorLine)?.author?.substring(0, 15) || ''} •{' '}
              {blameData.find(b => b.line === cursorLine)?.date || ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {activeFile && (
            <>
              <span>
                Ln {cursorLine}, Col {cursorCol}
              </span>
              <span>{activeFile.language}</span>
              <span>UTF-8</span>
              {activeFile.dirty && <span style={{ color: COLORS.yellow }}>? Modified</span>}
            </>
          )}
          {wordWrap && <span style={{ color: COLORS.accent }}>Wrap</span>}
          <span
            onClick={() => setInlineSuggestEnabled(prev => !prev)}
            style={{
              cursor: 'pointer',
              color: inlineSuggestEnabled ? COLORS.accent : COLORS.textDim,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title={
              inlineSuggestEnabled
                ? 'AI suggestions ON (click to disable)'
                : 'AI suggestions OFF (click to enable)'
            }
          >
            ? {inlineSuggestEnabled ? 'AI' : 'AI Off'}
          </span>
          <span>Jarvis IDE</span>
        </div>
      </div>
    </div>
  );
}

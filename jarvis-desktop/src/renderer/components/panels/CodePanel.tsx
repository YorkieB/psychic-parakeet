import Editor, { loader, type OnMount } from "@monaco-editor/react";
import {
	ArrowLeft,
	ArrowRight,
	ChevronDown,
	ChevronRight,
	Copy,
	Edit3,
	FileCode,
	FilePlus,
	Files,
	Folder,
	FolderPlus,
	GitBranch,
	Play,
	Plus,
	RefreshCcw,
	Search,
	Settings,
	Terminal as TerminalIcon,
	Trash2,
	X,
} from "lucide-react";
import type * as MonacoType from "monaco-editor";
import * as monaco from "monaco-editor";
import React, { useCallback, useRef, useState } from "react";
import { usePanelStore } from "../../store/panel-store";
import { Panel } from "../shared/Panel";

// Use locally installed monaco-editor instead of CDN fetch (fixes "fetch failed" error in Electron)
loader.config({ monaco });

/* ═══════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════ */

interface FileNode {
	id: string;
	name: string;
	type: "file" | "folder";
	level: number;
	parentId?: string;
	isOpen?: boolean;
	content?: string;
}

interface OpenTab {
	id: string;
	name: string;
	language: string;
	content: string;
	savedContent: string; // last-saved snapshot for dirty detection
	cursorLine: number;
	cursorCol: number;
	scrollTop: number;
}

interface SearchMatch {
	fileId: string;
	fileName: string;
	line: number;
	text: string;
	col: number;
}

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

function langFromName(name: string): string {
	const ext = name.split(".").pop()?.toLowerCase() || "";
	const m: Record<string, string> = {
		ts: "typescript",
		tsx: "typescript",
		js: "javascript",
		jsx: "javascript",
		json: "json",
		css: "css",
		scss: "scss",
		less: "less",
		html: "html",
		htm: "html",
		xml: "xml",
		svg: "xml",
		md: "markdown",
		mdx: "markdown",
		py: "python",
		pyw: "python",
		rs: "rust",
		go: "go",
		java: "java",
		kt: "kotlin",
		c: "c",
		h: "c",
		cpp: "cpp",
		hpp: "cpp",
		cs: "csharp",
		rb: "ruby",
		php: "php",
		swift: "swift",
		sh: "shell",
		bash: "shell",
		zsh: "shell",
		sql: "sql",
		graphql: "graphql",
		yaml: "yaml",
		yml: "yaml",
		toml: "ini",
		dockerfile: "dockerfile",
		gitignore: "plaintext",
		env: "plaintext",
	};
	return m[ext] || "plaintext";
}

/* ═══════════════════════════════════════════════════════════════════════
   SAMPLE PROJECT FILES
   ═══════════════════════════════════════════════════════════════════════ */

const PROJECT: FileNode[] = [
	{ id: "root", name: "twitter-clone", type: "folder", isOpen: true, level: 0 },
	{
		id: "src",
		name: "src",
		type: "folder",
		isOpen: true,
		level: 1,
		parentId: "root",
	},
	{
		id: "components",
		name: "components",
		type: "folder",
		isOpen: true,
		level: 2,
		parentId: "src",
	},
	{
		id: "App.tsx",
		name: "App.tsx",
		type: "file",
		level: 2,
		parentId: "src",
		content: `import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { Sidebar } from './components/Sidebar';
import { TweetComposer } from './components/TweetComposer';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-black text-white">
        <Sidebar />
        <main className="flex-1 border-l border-r border-gray-800 max-w-2xl">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/profile/:id" element={<Profile />} />
          </Routes>
        </main>
        <aside className="w-80 p-4 hidden lg:block">
          <TweetComposer />
        </aside>
      </div>
    </BrowserRouter>
  );
}
`,
	},
	{
		id: "EngagementChart.tsx",
		name: "EngagementChart.tsx",
		type: "file",
		level: 3,
		parentId: "components",
		content: `import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface DataPoint {
  date: Date;
  views: number;
  impressions: number;
  engagements: number;
}

interface EngagementChartProps {
  data: DataPoint[];
  height?: number;
  showLegend?: boolean;
}

export function EngagementChart({
  data,
  height = 256,
  showLegend = true,
}: EngagementChartProps): JSX.Element {
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        date: new Date(item.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        views: item.views,
        impressions: item.impressions,
        engagements: item.engagements,
      })),
    [data]
  );

  return (
    <div className="w-full mt-4" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: 12 }} />
          <YAxis stroke="#6b7280" style={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: 8,
            }}
          />
          {showLegend && <Legend />}
          <Line
            type="monotone"
            dataKey="views"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="impressions"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="engagements"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
`,
	},
	{
		id: "Sidebar.tsx",
		name: "Sidebar.tsx",
		type: "file",
		level: 3,
		parentId: "components",
		content: `import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Bell, Mail, User, Settings, MoreHorizontal } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/explore', icon: Search, label: 'Explore' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/messages', icon: Mail, label: 'Messages' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const;

export function Sidebar() {
  return (
    <nav className="w-64 p-4 sticky top-0 h-screen flex flex-col">
      <div className="text-3xl font-bold mb-8 text-blue-400 px-4">𝕏</div>

      <div className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              \`flex items-center gap-5 px-4 py-3 rounded-full text-xl transition-colors hover:bg-gray-900 \${
                isActive ? 'font-bold' : 'font-normal text-gray-300'
              }\`
            }
          >
            <Icon size={26} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-full transition-colors text-lg mt-4">
        Post
      </button>

      <div className="flex items-center gap-3 mt-6 p-3 rounded-full hover:bg-gray-900 cursor-pointer">
        <div className="w-10 h-10 rounded-full bg-gray-700" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">@yorkiebrown</div>
          <div className="text-gray-500 text-sm truncate">Yorkie Brown</div>
        </div>
        <MoreHorizontal size={18} className="text-gray-500" />
      </div>
    </nav>
  );
}
`,
	},
	{
		id: "TweetComposer.tsx",
		name: "TweetComposer.tsx",
		type: "file",
		level: 3,
		parentId: "components",
		content: `import React, { useState, useRef } from 'react';
import { Image, Smile, Calendar, MapPin, BarChart2 } from 'lucide-react';

const MAX_CHARS = 280;

export function TweetComposer() {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const remaining = MAX_CHARS - text.length;
  const isOverLimit = remaining < 0;
  const isEmpty = text.trim().length === 0;

  const handleSubmit = () => {
    if (isEmpty || isOverLimit) return;
    console.log('Posting tweet:', text);
    setText('');
  };

  return (
    <div className="border border-gray-800 rounded-2xl p-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0" />
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What is happening?!"
            className="w-full bg-transparent text-xl placeholder-gray-600 outline-none resize-none min-h-[80px]"
            rows={3}
          />

          <div className="flex items-center justify-between border-t border-gray-800 pt-3 mt-2">
            <div className="flex gap-1">
              {[Image, Smile, Calendar, MapPin, BarChart2].map((Icon, i) => (
                <button
                  key={i}
                  className="p-2 rounded-full hover:bg-blue-900/30 text-blue-400 transition-colors"
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {text.length > 0 && (
                <span className={\`text-sm \${isOverLimit ? 'text-red-500' : remaining <= 20 ? 'text-yellow-500' : 'text-gray-500'}\`}>
                  {remaining}
                </span>
              )}
              <button
                onClick={handleSubmit}
                disabled={isEmpty || isOverLimit}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-1.5 rounded-full transition-colors"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`,
	},
	{
		id: "pages",
		name: "pages",
		type: "folder",
		isOpen: false,
		level: 2,
		parentId: "src",
	},
	{
		id: "Home.tsx",
		name: "Home.tsx",
		type: "file",
		level: 3,
		parentId: "pages",
		content: `import React from 'react';\n\nexport function Home() {\n  return (\n    <div className="p-4">\n      <h1 className="text-xl font-bold border-b border-gray-800 pb-4">Home</h1>\n      <div className="py-8 text-center text-gray-500">Your timeline will appear here</div>\n    </div>\n  );\n}\n`,
	},
	{
		id: "package.json",
		name: "package.json",
		type: "file",
		level: 1,
		parentId: "root",
		content: `{\n  "name": "twitter-clone",\n  "version": "1.0.0",\n  "private": true,\n  "scripts": {\n    "dev": "vite",\n    "build": "tsc && vite build",\n    "preview": "vite preview",\n    "lint": "eslint src --ext .ts,.tsx",\n    "test": "vitest"\n  },\n  "dependencies": {\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0",\n    "react-router-dom": "^6.20.0",\n    "recharts": "^2.10.0",\n    "lucide-react": "^0.294.0"\n  },\n  "devDependencies": {\n    "@types/react": "^18.2.0",\n    "typescript": "^5.3.0",\n    "vite": "^5.0.0",\n    "vitest": "^1.0.0"\n  }\n}\n`,
	},
	{
		id: "tsconfig.json",
		name: "tsconfig.json",
		type: "file",
		level: 1,
		parentId: "root",
		content: `{\n  "compilerOptions": {\n    "target": "ES2020",\n    "module": "ESNext",\n    "lib": ["ES2020", "DOM", "DOM.Iterable"],\n    "jsx": "react-jsx",\n    "strict": true,\n    "esModuleInterop": true,\n    "skipLibCheck": true,\n    "forceConsistentCasingInFileNames": true,\n    "moduleResolution": "bundler",\n    "resolveJsonModule": true,\n    "isolatedModules": true,\n    "noEmit": true,\n    "baseUrl": ".",\n    "paths": { "@/*": ["src/*"] }\n  },\n  "include": ["src"],\n  "exclude": ["node_modules"]\n}\n`,
	},
	{
		id: ".gitignore",
		name: ".gitignore",
		type: "file",
		level: 1,
		parentId: "root",
		content: `node_modules/\ndist/\n.env\n.env.local\n*.log\n.DS_Store\n`,
	},
];

/* ═══════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

export function CodePanel() {
	const { closePanel } = usePanelStore();

	// ── State ────────────────────────────────────────────────────────────
	const [tree, setTree] = useState<FileNode[]>(PROJECT);
	const [tabs, setTabs] = useState<OpenTab[]>(() => {
		const f = PROJECT.find((n) => n.id === "EngagementChart.tsx")!;
		return [
			{
				id: f.id,
				name: f.name,
				language: langFromName(f.name),
				content: f.content!,
				savedContent: f.content!,
				cursorLine: 1,
				cursorCol: 1,
				scrollTop: 0,
			},
		];
	});
	const [activeTabId, setActiveTabId] = useState("EngagementChart.tsx");
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [sidebarView, setSidebarView] = useState<"files" | "search" | "git">("files");
	const [searchText, setSearchText] = useState("");
	const [replaceText, setReplaceText] = useState("");
	const [showReplace, setShowReplace] = useState(false);
	const [termOpen, setTermOpen] = useState(false);
	const [termLines, setTermLines] = useState<Array<{ id: string; text: string }>>([
		{ id: "0", text: "Nexus Terminal — bash" },
		{ id: "1", text: "" },
	]);
	const [termInput, setTermInput] = useState("");
	const [problems, setProblems] = useState<string[]>([]);
	const [bottomTab, setBottomTab] = useState<"terminal" | "problems" | "output">("terminal");
	const [contextMenu, setContextMenu] = useState<{
		x: number;
		y: number;
		nodeId: string;
	} | null>(null);
	const [renaming, setRenaming] = useState<string | null>(null);
	const [renameValue, setRenameValue] = useState("");

	const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null);
	const monacoRef = useRef<typeof MonacoType | null>(null);

	const activeTab = tabs.find((t) => t.id === activeTabId);

	// ── File helpers ─────────────────────────────────────────────────────
	const isVisible = useCallback(
		(node: FileNode): boolean => {
			if (!node.parentId) return true;
			const parent = tree.find((n) => n.id === node.parentId);
			return !!parent && parent.isOpen !== false && isVisible(parent);
		},
		[tree],
	);

	const toggleFolder = (id: string) =>
		setTree((prev) => prev.map((n) => (n.id === id ? { ...n, isOpen: !n.isOpen } : n)));

	const createNewTab = (node: FileNode): OpenTab => ({
		id: node.id,
		name: node.name,
		language: langFromName(node.name),
		content: node.content || "",
		savedContent: node.content || "",
		cursorLine: 1,
		cursorCol: 1,
		scrollTop: 0,
	});

	const openFile = useCallback((node: FileNode) => {
		if (node.type !== "file") return;
		setTabs((prev) => {
			if (prev.some((t) => t.id === node.id)) return prev;
			return [...prev, createNewTab(node)];
		});
		setActiveTabId(node.id);
	}, []);

	const closeTab = (id: string, e?: React.MouseEvent) => {
		e?.stopPropagation();
		setTabs((prev) => {
			const next = prev.filter((t) => t.id !== id);
			if (activeTabId === id && next.length) setActiveTabId(next.at(-1)?.id ?? "");
			return next;
		});
	};

	const updateTabSavedContent = (t: OpenTab, id: string): OpenTab =>
		t.id === id ? { ...t, savedContent: t.content } : t;

	const updateTreeFromTab = (n: FileNode, tabsData: OpenTab[]): FileNode => {
		const tab = tabsData.find((t) => t.id === n.id);
		return tab ? { ...n, content: tab.content } : n;
	};

	const mapTabsToSaved = (prev: OpenTab[], id: string): OpenTab[] =>
		prev.map((t) => updateTabSavedContent(t, id));

	const mapTreeFromTabs = (prev: FileNode[]): FileNode[] =>
		prev.map((n) => updateTreeFromTab(n, tabs));

	const saveTab = useCallback(
		(id: string) => {
			setTabs((prev) => mapTabsToSaved(prev, id));
			// Also persist into tree
			setTree(mapTreeFromTabs);
		},
		[tabs],
	);

	const saveAll = useCallback(() => tabs.forEach((t) => saveTab(t.id)), [tabs, saveTab]);

	// ── Search across files ──────────────────────────────────────────────
	const searchResults: SearchMatch[] = React.useMemo(() => {
		if (!searchText.trim()) return [];
		const q = searchText.toLowerCase();
		const results: SearchMatch[] = [];
		for (const node of tree) {
			if (node.type !== "file" || !node.content) continue;
			const lines = node.content.split("\n");
			lines.forEach((line, i) => {
				const idx = line.toLowerCase().indexOf(q);
				if (idx !== -1)
					results.push({
						fileId: node.id,
						fileName: node.name,
						line: i + 1,
						text: line.trim(),
						col: idx,
					});
			});
		}
		return results;
	}, [searchText, tree]);

	// ── New file / folder ────────────────────────────────────────────────
	const addNode = (parentId: string, type: "file" | "folder") => {
		const parent = tree.find((n) => n.id === parentId);
		if (!parent) return;
		const name = type === "file" ? "untitled.ts" : "new-folder";
		const id = `${parentId}/${name}-${Date.now()}`;
		setTree((prev) => {
			const idx = prev.findIndex((n) => n.id === parentId);
			const newNode: FileNode = {
				id,
				name,
				type,
				level: parent.level + 1,
				parentId,
				isOpen: type === "folder" ? true : undefined,
				content: type === "file" ? "" : undefined,
			};
			const copy = [...prev];
			copy.splice(idx + 1, 0, newNode);
			// ensure parent is open
			return copy.map((n) => (n.id === parentId ? { ...n, isOpen: true } : n));
		});
		if (type === "file") {
			setRenaming(id);
			setRenameValue(name);
		}
	};

	const deleteNode = (id: string) => {
		setTree((prev) => prev.filter((n) => n.id !== id && n.parentId !== id));
		setTabs((prev) => prev.filter((t) => t.id !== id));
	};

	const commitRename = (id: string) => {
		if (!renameValue.trim()) {
			setRenaming(null);
			return;
		}
		setTree((prev) => prev.map((n) => (n.id === id ? { ...n, name: renameValue } : n)));
		setTabs((prev) =>
			prev.map((t) =>
				t.id === id ? { ...t, name: renameValue, language: langFromName(renameValue) } : t,
			),
		);
		setRenaming(null);
	};

	// ── Terminal ─────────────────────────────────────────────────────────
	const runTerminalCommand = () => {
		const cmd = termInput.trim();
		if (!cmd) return;
		let output = `$ ${cmd}`;
		if (cmd === "clear") {
			setTermLines([]);
			setTermInput("");
			return;
		} else if (cmd === "ls")
			output +=
				"\n" +
				tree
					.filter((n) => n.parentId === "root")
					.map((n) => n.name)
					.join("  ");
		else if (cmd === "pwd") output += "\n/home/user/twitter-clone";
		else if (cmd.startsWith("echo ")) output += `\n${cmd.slice(5)}`;
		else if (cmd === "npm run dev")
			output +=
				"\n\n  VITE v5.0.0  ready in 200ms\n\n  ➜  Local:   http://localhost:5173/\n  ➜  Network: http://192.168.1.42:5173/";
		else if (cmd === "npm test")
			output +=
				"\n\n ✓ src/App.test.tsx (2 tests) 45ms\n ✓ src/components/Sidebar.test.tsx (3 tests) 32ms\n\n Tests  5 passed\n Time   0.12s";
		else if (cmd === "npm run build")
			output +=
				"\n\nvite v5.0.0 building for production...\n✓ 42 modules transformed.\ndist/index.html         0.45 kB\ndist/assets/index.js   148.23 kB │ gzip: 47.12 kB\ndist/assets/index.css    8.41 kB │ gzip:  2.83 kB\n✓ built in 1.23s";
		else if (cmd === "git status")
			output +=
				"\n\nOn branch main\nChanges not staged for commit:\n  modified: " +
					tabs
						.filter((t) => t.content !== t.savedContent)
						.map((t) => t.name)
						.join("\n  modified: ") || "(clean)";
		else if (cmd === "git log")
			output +=
				"\n\n* a1b2c3d (HEAD -> main) Initial commit\n* 9e8f7g6 Setup project\n* 5h4i3j2 Add components";
		else if (cmd === "help")
			output +=
				"\n\nAvailable commands: ls, pwd, echo, clear, npm run dev, npm run build, npm test, git status, git log, help";
		else output += `\nbash: ${cmd}: command not found. Type 'help' for available commands.`;
		setTermLines((prev) => [...prev, { id: Date.now().toString(), text: output }]);
		setTermInput("");
	};

	// ── Monaco mount ─────────────────────────────────────────────────────
	const handleEditorMount: OnMount = (editor, monaco) => {
		editorRef.current = editor;
		monacoRef.current = monaco;

		// Custom dark theme
		monaco.editor.defineTheme("nexus-dark", {
			base: "vs-dark",
			inherit: true,
			rules: [
				{ token: "comment", foreground: "6a9955", fontStyle: "italic" },
				{ token: "keyword", foreground: "c586c0" },
				{ token: "string", foreground: "ce9178" },
				{ token: "number", foreground: "b5cea8" },
				{ token: "type", foreground: "4ec9b0" },
				{ token: "function", foreground: "dcdcaa" },
				{ token: "variable", foreground: "9cdcfe" },
				{ token: "constant", foreground: "4fc1ff" },
				{ token: "tag", foreground: "569cd6" },
				{ token: "attribute.name", foreground: "92c5f7" },
				{ token: "attribute.value", foreground: "ce9178" },
				{ token: "regexp", foreground: "d16969" },
			],
			colors: {
				"editor.background": "#0d1117",
				"editor.foreground": "#e6edf3",
				"editorLineNumber.foreground": "#484f58",
				"editorLineNumber.activeForeground": "#e6edf3",
				"editor.selectionBackground": "#264f78",
				"editor.inactiveSelectionBackground": "#264f7844",
				"editor.lineHighlightBackground": "#161b22",
				"editor.lineHighlightBorder": "#161b2200",
				"editorCursor.foreground": "#58a6ff",
				"editorIndentGuide.background": "#21262d",
				"editorIndentGuide.activeBackground": "#30363d",
				"editorBracketMatch.border": "#58a6ff",
				"editorBracketMatch.background": "#58a6ff22",
				"editorWidget.background": "#161b22",
				"editorWidget.border": "#30363d",
				"editorSuggestWidget.background": "#161b22",
				"editorSuggestWidget.border": "#30363d",
				"editorSuggestWidget.selectedBackground": "#21262d",
				"input.background": "#0d1117",
				"input.border": "#30363d",
				"input.foreground": "#e6edf3",
				"list.activeSelectionBackground": "#21262d",
				"list.hoverBackground": "#161b22",
				"scrollbarSlider.background": "#484f5833",
				"scrollbarSlider.hoverBackground": "#484f5866",
				"minimap.background": "#0d1117",
			},
		});
		monaco.editor.setTheme("nexus-dark");

		// ── Keybindings ──────────────────────────────────────────────────
		// Save
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveTab(activeTabId));
		// Save all
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () =>
			saveAll(),
		);
		// Toggle terminal
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote, () =>
			setTermOpen((p) => !p),
		);
		// Toggle sidebar
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => setSidebarOpen((p) => !p));
		// Close tab
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, () => {
			if (activeTabId) closeTab(activeTabId);
		});
		// Quick open (file switcher)
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
			editor.trigger("keyboard", "editor.action.quickOpen", null);
		});
		// Command palette
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => {
			editor.trigger("keyboard", "editor.action.quickCommand", null);
		});
		// Find in files
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
			setSidebarOpen(true);
			setSidebarView("search");
		});
		// Go to line
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG, () => {
			editor.trigger("keyboard", "editor.action.gotoLine", null);
		});
		// Zoom in/out
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, () => {
			editor.trigger("keyboard", "editor.action.fontZoomIn", null);
		});
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, () => {
			editor.trigger("keyboard", "editor.action.fontZoomOut", null);
		});

		// Track cursor position
		editor.onDidChangeCursorPosition((e) => {
			setTabs((prev) =>
				prev.map((t) =>
					t.id === activeTabId
						? {
								...t,
								cursorLine: e.position.lineNumber,
								cursorCol: e.position.column,
							}
						: t,
				),
			);
		});

		// Track markers (errors/warnings) for Problems panel
		monaco.editor.onDidChangeMarkers(([uri]: MonacoType.Uri[]) => {
			const markers = monaco.editor.getModelMarkers({ resource: uri });
			setProblems(
				markers.map(
					(m: MonacoType.editor.IMarker) =>
						`${m.severity === 8 ? "❌" : "⚠️"} Line ${m.startLineNumber}: ${m.message}`,
				),
			);
		});

		editor.focus();
	};

	// ── Context menu for file tree ───────────────────────────────────────
	const handleContextMenu = (e: React.MouseEvent, nodeId: string) => {
		e.preventDefault();
		e.stopPropagation();
		setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
	};

	// ── Dirty (modified) count ───────────────────────────────────────────
	const dirtyCount = tabs.filter((t) => t.content !== t.savedContent).length;

	/* ═════════════════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════════════════ */
	return (
		<Panel
			id="code"
			title="💻 Code Editor"
			width={800}
			height={500}
			onClose={() => closePanel("code")}
		>
			<div
				className="flex flex-col h-full w-full bg-[#0d1117] text-[#e6edf3] text-sm overflow-hidden"
				onClick={() => setContextMenu(null)}
			>
				{/* ── Top Bar ──────────────────────────────────────────────── */}
				<div className="h-8 bg-[#010409] border-b border-[#30363d] flex items-center px-2 text-[11px] text-gray-400 select-none flex-shrink-0 gap-3">
					<ArrowLeft size={14} className="text-gray-500 cursor-pointer hover:text-white" />
					<ArrowRight size={14} className="text-gray-500 cursor-pointer hover:text-white" />
					<span className="flex-1 text-center truncate opacity-60">twitter-clone — Nexus Code</span>
					<button
						onClick={() => setSidebarOpen((p) => !p)}
						className={`p-1 rounded hover:text-white ${sidebarOpen ? "text-blue-400" : "text-gray-500"}`}
						title="Toggle sidebar (Ctrl+B)"
					>
						<Files size={13} />
					</button>
					<button
						onClick={() => setTermOpen((p) => !p)}
						className={`p-1 rounded hover:text-white ${termOpen ? "text-blue-400" : "text-gray-500"}`}
						title="Toggle terminal (Ctrl+`)"
					>
						<TerminalIcon size={13} />
					</button>
					<button
						onClick={() => closePanel("code")}
						className="p-1 rounded hover:text-white text-gray-500"
						title="Close (Esc)"
					>
						<X size={13} />
					</button>
				</div>

				<div className="flex flex-1 overflow-hidden">
					{/* ── Activity Bar ─────────────────────────────────────── */}
					<div className="w-12 flex flex-col items-center py-3 border-r border-[#30363d] bg-[#0d1117] flex-shrink-0 gap-5">
						<button
							onClick={() => {
								setSidebarOpen(true);
								setSidebarView("files");
							}}
							title="Explorer"
							className={`p-1 rounded ${sidebarView === "files" && sidebarOpen ? "text-white border-l-2 border-blue-400" : "text-gray-500 hover:text-white"}`}
						>
							<Files size={22} />
						</button>
						<button
							onClick={() => {
								setSidebarOpen(true);
								setSidebarView("search");
							}}
							title="Search"
							className={`p-1 rounded ${sidebarView === "search" && sidebarOpen ? "text-white border-l-2 border-blue-400" : "text-gray-500 hover:text-white"}`}
						>
							<Search size={22} />
						</button>
						<button
							onClick={() => {
								setSidebarOpen(true);
								setSidebarView("git");
							}}
							title="Source Control"
							className={`p-1 rounded relative ${sidebarView === "git" && sidebarOpen ? "text-white border-l-2 border-blue-400" : "text-gray-500 hover:text-white"}`}
						>
							<GitBranch size={22} />
							{dirtyCount > 0 && (
								<span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
									{dirtyCount}
								</span>
							)}
						</button>
						<button title="Run and Debug" className="text-gray-500 hover:text-white p-1">
							<Play size={22} />
						</button>
						<div className="mt-auto">
							<button title="Settings" className="text-gray-500 hover:text-white p-1">
								<Settings size={22} />
							</button>
						</div>
					</div>

					{/* ── Sidebar ──────────────────────────────────────────── */}
					{sidebarOpen && (
						<div className="w-60 flex flex-col border-r border-[#30363d] bg-[#0d1117] overflow-hidden flex-shrink-0">
							{/* FILES */}
							{sidebarView === "files" && (
								<>
									<div className="h-8 px-3 flex items-center justify-between text-[10px] font-bold tracking-widest text-gray-500 uppercase border-b border-[#30363d]">
										<span>Explorer</span>
										<div className="flex gap-1">
											<button
												onClick={() => addNode("root", "file")}
												className="hover:text-white p-0.5"
												title="New File"
											>
												<FilePlus size={14} />
											</button>
											<button
												onClick={() => addNode("root", "folder")}
												className="hover:text-white p-0.5"
												title="New Folder"
											>
												<FolderPlus size={14} />
											</button>
											<button
												onClick={() => setTree(PROJECT)}
												className="hover:text-white p-0.5"
												title="Refresh"
											>
												<RefreshCcw size={14} />
											</button>
										</div>
									</div>
									<div
										className="flex-1 overflow-y-auto"
										style={{
											scrollbarWidth: "thin",
											scrollbarColor: "#30363d transparent",
										}}
									>
										{tree.filter(isVisible).map((node) => (
											<div
												key={node.id}
												onClick={() =>
													node.type === "folder" ? toggleFolder(node.id) : openFile(node)
												}
												onContextMenu={(e) => handleContextMenu(e, node.id)}
												className={`flex items-center py-[3px] px-1 cursor-pointer text-[13px] group ${activeTabId === node.id ? "bg-[#21262d] text-white" : "hover:bg-[#161b22] text-gray-400"}`}
												style={{ paddingLeft: `${node.level * 12 + 4}px` }}
											>
												<span className="w-4 flex items-center flex-shrink-0">
													{node.type === "folder" &&
														(node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
												</span>
												<span className="mr-1.5 flex-shrink-0">
													{node.type === "folder" ? (
														<Folder size={14} className="text-blue-400" />
													) : (
														<FileCode size={14} className="text-blue-400" />
													)}
												</span>
												{renaming === node.id ? (
													<input
														autoFocus
														value={renameValue}
														onChange={(e) => setRenameValue(e.target.value)}
														onBlur={() => commitRename(node.id)}
														onKeyDown={(e) => {
															if (e.key === "Enter") commitRename(node.id);
															if (e.key === "Escape") setRenaming(null);
														}}
														className="bg-[#0d1117] border border-[#58a6ff] rounded px-1 text-xs text-white outline-none flex-1 min-w-0"
														onClick={(e) => e.stopPropagation()}
													/>
												) : (
													<span className="truncate">{node.name}</span>
												)}
												{tabs.find((t) => t.id === node.id && t.content !== t.savedContent) && (
													<span className="ml-auto text-[9px] text-[#d29922] font-bold flex-shrink-0">
														M
													</span>
												)}
											</div>
										))}
									</div>
								</>
							)}

							{/* SEARCH */}
							{sidebarView === "search" && (
								<>
									<div className="h-8 px-3 flex items-center text-[10px] font-bold tracking-widest text-gray-500 uppercase border-b border-[#30363d]">
										Search
									</div>
									<div className="p-2 space-y-1">
										<input
											value={searchText}
											onChange={(e) => setSearchText(e.target.value)}
											placeholder="Search"
											autoFocus
											className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#58a6ff]"
										/>
										<button
											onClick={() => setShowReplace((p) => !p)}
											className="text-[10px] text-gray-500 hover:text-white"
										>
											{showReplace ? "▾ Replace" : "▸ Replace"}
										</button>
										{showReplace && (
											<input
												value={replaceText}
												onChange={(e) => setReplaceText(e.target.value)}
												placeholder="Replace"
												className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#58a6ff]"
											/>
										)}
									</div>
									<div
										className="flex-1 overflow-y-auto px-1 text-[12px]"
										style={{
											scrollbarWidth: "thin",
											scrollbarColor: "#30363d transparent",
										}}
									>
										{searchText && (
											<div className="px-2 py-1 text-gray-500 text-[11px]">
												{searchResults.length} results in{" "}
												{new Set(searchResults.map((r) => r.fileId)).size} files
											</div>
										)}
										{searchResults.map((r) => (
											<div
												key={`${r.fileId}-${r.line}-${r.col}`}
												onClick={() => {
													const node = tree.find((n) => n.id === r.fileId);
													if (node) openFile(node);
												}}
												className="px-2 py-1 hover:bg-[#161b22] cursor-pointer rounded"
											>
												<div className="text-gray-300 flex items-center gap-1">
													<FileCode size={11} className="text-blue-400" /> {r.fileName}{" "}
													<span className="text-gray-600">:{r.line}</span>
												</div>
												<div className="text-gray-500 truncate text-[11px] ml-4">{r.text}</div>
											</div>
										))}
									</div>
								</>
							)}

							{/* GIT */}
							{sidebarView === "git" && (
								<>
									<div className="h-8 px-3 flex items-center text-[10px] font-bold tracking-widest text-gray-500 uppercase border-b border-[#30363d]">
										Source Control
									</div>
									<div className="p-3 space-y-3 text-xs">
										<div className="flex items-center gap-2">
											<GitBranch size={14} className="text-gray-400" />{" "}
											<span className="text-white font-medium">main</span>
										</div>
										<input
											placeholder="Message (Ctrl+Enter to commit)"
											className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1.5 text-xs text-white outline-none focus:border-[#58a6ff]"
										/>
										<button className="w-full bg-[#238636] hover:bg-[#2ea043] text-white rounded py-1.5 text-xs font-semibold">
											Commit
										</button>
										<div className="text-[10px] uppercase font-bold text-gray-500 mt-2">
											Changes ({dirtyCount})
										</div>
										{tabs
											.filter((t) => t.content !== t.savedContent)
											.map((t) => (
												<div
													key={t.id}
													className="flex items-center gap-2 py-1 text-[#d29922] cursor-pointer hover:bg-[#161b22] rounded px-1"
													onClick={() => setActiveTabId(t.id)}
												>
													<FileCode size={12} /> <span className="flex-1 truncate">{t.name}</span>{" "}
													<span className="text-[10px] font-bold">M</span>
												</div>
											))}
										{dirtyCount === 0 && (
											<div className="text-gray-500 text-center py-2">No changes</div>
										)}
									</div>
								</>
							)}
						</div>
					)}

					{/* ── Editor Area ──────────────────────────────────────── */}
					<div className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">
						{/* Tabs */}
						<div
							className="h-9 flex items-center bg-[#010409] border-b border-[#30363d] overflow-x-auto flex-shrink-0"
							style={{ scrollbarWidth: "none" }}
						>
							{tabs.map((tab) => {
								const dirty = tab.content !== tab.savedContent;
								return (
									<div
										key={tab.id}
										onClick={() => setActiveTabId(tab.id)}
										className={`flex items-center h-full px-3 text-[11px] cursor-pointer border-r border-[#30363d] min-w-[100px] max-w-[180px] group ${
											activeTabId === tab.id
												? "bg-[#0d1117] text-white border-t-2 border-t-[#f78166]"
												: "text-gray-500 hover:bg-[#161b22]"
										}`}
									>
										<FileCode size={11} className="text-blue-400 mr-1.5 flex-shrink-0" />
										<span className="truncate flex-1">{dirty ? `● ${tab.name}` : tab.name}</span>
										<button
											onClick={(e) => closeTab(tab.id, e)}
											className="ml-1 hover:bg-[#30363d] rounded p-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0"
										>
											<X size={10} />
										</button>
									</div>
								);
							})}
						</div>

						{/* Monaco */}
						<div className="flex-1 overflow-hidden">
							{activeTab ? (
								<Editor
									key={activeTabId}
									height="100%"
									language={activeTab.language}
									value={activeTab.content}
									theme="nexus-dark"
									onMount={handleEditorMount}
									onChange={(value) => {
										setTabs((prev) =>
											prev.map((t) => (t.id === activeTabId ? { ...t, content: value || "" } : t)),
										);
									}}
									options={{
										fontSize: 13,
										fontFamily:
											"'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
										fontLigatures: true,
										minimap: {
											enabled: true,
											scale: 1,
											renderCharacters: true,
										},
										scrollbar: {
											verticalScrollbarSize: 10,
											horizontalScrollbarSize: 10,
										},
										lineNumbers: "on",
										renderLineHighlight: "all",
										bracketPairColorization: { enabled: true },
										autoClosingBrackets: "always",
										autoClosingQuotes: "always",
										autoSurround: "languageDefined",
										formatOnPaste: true,
										formatOnType: true,
										suggestOnTriggerCharacters: true,
										quickSuggestions: {
											other: true,
											comments: false,
											strings: true,
										},
										acceptSuggestionOnCommitCharacter: true,
										wordWrap: "off",
										tabSize: 2,
										smoothScrolling: true,
										cursorBlinking: "smooth",
										cursorSmoothCaretAnimation: "on",
										cursorStyle: "line",
										cursorWidth: 2,
										folding: true,
										foldingStrategy: "indentation",
										showFoldingControls: "mouseover",
										guides: {
											indentation: true,
											bracketPairs: true,
											highlightActiveIndentation: true,
										},
										padding: { top: 8, bottom: 8 },
										stickyScroll: { enabled: true },
										linkedEditing: true,
										renderWhitespace: "selection",
										matchBrackets: "always",
										colorDecorators: true,
										dragAndDrop: true,
										emptySelectionClipboard: true,
										copyWithSyntaxHighlighting: true,
										multiCursorModifier: "alt",
										snippetSuggestions: "inline",
										wordBasedSuggestions: "allDocuments",
										parameterHints: { enabled: true },
										inlayHints: { enabled: "on" },
										hover: { enabled: true, delay: 300 },
										find: {
											addExtraSpaceOnTop: true,
											autoFindInSelection: "multiline",
											seedSearchStringFromSelection: "always",
										},
									}}
								/>
							) : (
								<div className="flex items-center justify-center h-full text-gray-600 flex-col gap-4">
									<div className="text-6xl opacity-20">📝</div>
									<div className="text-lg">Open a file to start editing</div>
									<div className="text-xs text-gray-700">
										Ctrl+P to quick open • Ctrl+Shift+P for commands
									</div>
								</div>
							)}
						</div>

						{/* Status bar */}
						<div className="h-6 bg-[#007acc] flex items-center justify-between px-3 text-[10px] text-white font-medium select-none flex-shrink-0">
							<div className="flex gap-3 items-center">
								<span className="flex items-center gap-1">
									<GitBranch size={10} /> main
								</span>
								{dirtyCount > 0 ? <span>● {dirtyCount} unsaved</span> : <span>✓</span>}
								{problems.length > 0 && <span>⚠ {problems.length}</span>}
							</div>
							<div className="flex gap-3 items-center">
								{activeTab && (
									<span>
										Ln {activeTab.cursorLine}, Col {activeTab.cursorCol}
									</span>
								)}
								<span>{activeTab?.language || "plaintext"}</span>
								<span>UTF-8</span>
								<span>Spaces: 2</span>
							</div>
						</div>

						{/* ── Bottom Panel ────────────────────────────────────── */}
						{termOpen && (
							<div className="h-52 border-t border-[#30363d] bg-[#010409] flex flex-col flex-shrink-0">
								<div className="h-8 border-b border-[#30363d] flex items-center px-3 justify-between text-[11px]">
									<div className="flex gap-3 text-gray-400">
										<button
											onClick={() => setBottomTab("problems")}
											className={
												bottomTab === "problems"
													? "text-white border-b border-[#f78166] pb-1"
													: "hover:text-white"
											}
										>
											Problems {problems.length > 0 && `(${problems.length})`}
										</button>
										<button
											onClick={() => setBottomTab("output")}
											className={
												bottomTab === "output"
													? "text-white border-b border-[#f78166] pb-1"
													: "hover:text-white"
											}
										>
											Output
										</button>
										<button
											onClick={() => setBottomTab("terminal")}
											className={
												bottomTab === "terminal"
													? "text-white border-b border-[#f78166] pb-1"
													: "hover:text-white"
											}
										>
											Terminal
										</button>
									</div>
									<div className="flex gap-2 text-gray-500">
										<button className="hover:text-white" title="New Terminal">
											<Plus size={12} />
										</button>
										<button className="hover:text-white" onClick={() => setTermOpen(false)}>
											<X size={12} />
										</button>
									</div>
								</div>
								<div
									className="flex-1 overflow-auto p-2 font-mono text-[12px]"
									style={{
										scrollbarWidth: "thin",
										scrollbarColor: "#30363d transparent",
									}}
								>
									{bottomTab === "terminal" && (
										<>
											{termLines.map((l) => (
												<div key={l.id} className="text-green-400 whitespace-pre-wrap">
													{l.text}
												</div>
											))}
											<div className="flex items-center text-green-400 mt-1">
												<span className="mr-1 text-blue-400">~/twitter-clone $</span>
												<input
													value={termInput}
													onChange={(e) => setTermInput(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === "Enter") runTerminalCommand();
													}}
													className="flex-1 bg-transparent outline-none text-green-400 font-mono"
													autoFocus
													spellCheck={false}
												/>
											</div>
										</>
									)}
									{bottomTab === "problems" &&
										(problems.length === 0 ? (
											<div className="text-gray-500 py-4 text-center">No problems detected</div>
										) : (
											problems.map((p, i) => (
												<div key={i} className="text-yellow-400 py-0.5">
													{p}
												</div>
											))
										))}
									{bottomTab === "output" && (
										<div className="text-gray-500 py-4 text-center">No output</div>
									)}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* ── Context Menu ───────────────────────────────────────── */}
				{contextMenu && (
					<div
						className="fixed bg-[#1c1c1f] border border-[#30363d] rounded shadow-2xl py-1 z-[200] w-48 text-[12px]"
						style={{ left: contextMenu.x, top: contextMenu.y }}
					>
						{[
							{
								label: "New File",
								icon: FilePlus,
								action: () => addNode(contextMenu.nodeId, "file"),
							},
							{
								label: "New Folder",
								icon: FolderPlus,
								action: () => addNode(contextMenu.nodeId, "folder"),
							},
							null,
							{
								label: "Rename",
								icon: Edit3,
								action: () => {
									setRenaming(contextMenu.nodeId);
									setRenameValue(tree.find((n) => n.id === contextMenu.nodeId)?.name || "");
								},
							},
							{
								label: "Delete",
								icon: Trash2,
								action: () => deleteNode(contextMenu.nodeId),
							},
							null,
							{
								label: "Copy Path",
								icon: Copy,
								action: () => navigator.clipboard?.writeText(contextMenu.nodeId),
							},
						].map((item, i) =>
							item === null ? (
								<div key={i} className="h-px bg-[#30363d] my-1" />
							) : (
								<button
									key={i}
									onClick={() => {
										item.action();
										setContextMenu(null);
									}}
									className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#006abc] text-gray-200"
								>
									<item.icon size={13} /> {item.label}
								</button>
							),
						)}
					</div>
				)}
			</div>
		</Panel>
	);
}

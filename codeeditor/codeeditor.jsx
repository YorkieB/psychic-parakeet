import {
	ArrowLeft,
	ArrowRight,
	Bot,
	Bug,
	Check,
	ChevronDown,
	ChevronRight,
	Circle,
	Code2,
	ExternalLink,
	FileCode,
	Files,
	Filter,
	Folder,
	GitBranch,
	Globe,
	History,
	Image as ImageIcon,
	Infinity as InfinityIcon,
	Layers,
	Maximize2,
	MessageSquare,
	Mic,
	Minus,
	Monitor,
	Moon,
	PanelBottom,
	PanelLeft,
	PanelRight,
	Pin,
	Play,
	RefreshCcw,
	Search,
	Settings,
	Square,
	Sun,
	X,
} from "lucide-react";
import { useState } from "react";

/**
 * NEXUS CODE - High Fidelity Desktop IDE
 * Resolved: Blank screen rendering and ReferenceErrors.
 * Implementation:
 * - Full Explorer View Switcher (image_6e627d.png)
 * - Diagnostic "Fix in Chat" box (image_6e5a60.png)
 * - Desktop Menu & Layout Controls
 */

// --- Global Styles & Constants ---

const _SQUIGGLE_STYLE = {
	backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3'%3E%3Cpath d='M0 2 Q 1.5 0 3 2 Q 4.5 4 6 2' fill='none' stroke='%23f85149' stroke-width='1'/%3E%3C/svg%3E")`,
	backgroundRepeat: "repeat-x",
	backgroundPosition: "bottom",
	paddingBottom: "2px",
	cursor: "pointer",
};

const TOP_MENUS = {
	File: [
		{ label: "New Text File", extra: "Ctrl+N" },
		{ label: "New Window", extra: "Ctrl+Shift+N" },
		{ type: "divider" },
		{ label: "Open File...", extra: "Ctrl+O" },
		{ label: "Open Folder...", extra: "Ctrl+K Ctrl+O" },
		{ type: "divider" },
		{ label: "Save", extra: "Ctrl+S" },
		{ label: "Save As...", extra: "Ctrl+Shift+S" },
		{ label: "Save All", extra: "Ctrl+K Ctrl+S" },
		{ type: "divider" },
		{ label: "Recent Files", hasSub: true },
		{ type: "divider" },
		{ label: "Close File", extra: "Ctrl+W" },
		{ label: "Close Folder", extra: "Ctrl+K Ctrl+W" },
		{ label: "Exit" },
	],
	Edit: [
		{ label: "Undo", extra: "Ctrl+Z" },
		{ label: "Redo", extra: "Ctrl+Y" },
		{ type: "divider" },
		{ label: "Cut", extra: "Ctrl+X" },
		{ label: "Copy", extra: "Ctrl+C" },
		{ label: "Paste", extra: "Ctrl+V" },
		{ type: "divider" },
		{ label: "Find", extra: "Ctrl+F" },
		{ label: "Replace", extra: "Ctrl+H" },
		{ label: "Find in Files", extra: "Ctrl+Shift+F" },
		{ type: "divider" },
		{ label: "Toggle Line Comment", extra: "Ctrl+/" },
		{ label: "Toggle Block Comment", extra: "Ctrl+Shift+/" },
		{ type: "divider" },
		{ label: "Delete Line", extra: "Ctrl+Shift+K" },
		{ label: "Duplicate Line Up", extra: "Alt+Up" },
		{ label: "Duplicate Line Down", extra: "Alt+Down" },
		{ type: "divider" },
		{ label: "Add Cursor", extra: "Alt+Click" },
	],
	Selection: [{ label: "Select All", extra: "Ctrl+A" }],
	View: [
		{ label: "Command Palette...", extra: "Ctrl+Shift+P" },
		{ type: "divider" },
		{ label: "Appearance", hasSub: true },
		{ type: "divider" },
		{ label: "Side Bar", isChecked: true },
		{ label: "Status Bar", isChecked: true },
		{ label: "Activity Bar", isChecked: true },
		{ label: "Panel", hasSub: true },
		{ type: "divider" },
		{ label: "Word Wrap", isChecked: false },
		{ label: "Minimap", isChecked: false },
		{ label: "Line Numbers", isChecked: true },
		{ label: "Render Whitespace", isChecked: false },
		{ type: "divider" },
		{ label: "Zen Mode" },
		{ label: "Full Screen", extra: "F11" },
	],
	Go: [
		{ label: "Back", extra: "Alt+Left" },
		{ label: "Forward", extra: "Alt+Right" },
		{ label: "Go to File...", extra: "Ctrl+P" },
		{ type: "divider" },
		{ label: "Go to Symbol in File...", extra: "Ctrl+Shift+O" },
		{ label: "Go to Symbol in Workspace...", extra: "Ctrl+T" },
		{ type: "divider" },
		{ label: "Go to Line/Column...", extra: "Ctrl+G" },
		{ label: "Go to Last Edit Location", extra: "Ctrl+K Ctrl+Q" },
		{ type: "divider" },
		{ label: "Navigate History", hasSub: true },
		{ label: "Bookmarks", hasSub: true },
	],
	Run: [
		{ label: "Start Debugging", extra: "F5" },
		{ label: "Start Without Debugging", extra: "Ctrl+F5" },
		{ label: "Stop Debugging", extra: "Shift+F5" },
		{ label: "Restart Debugging", extra: "Ctrl+Shift+F5" },
		{ type: "divider" },
		{ label: "Toggle Breakpoint", extra: "F9" },
		{ label: "New Breakpoint", hasSub: true },
		{ label: "Enable All Breakpoints" },
		{ label: "Disable All Breakpoints" },
		{ label: "Remove All Breakpoints" },
		{ type: "divider" },
		{ label: "Step Over", extra: "F10" },
		{ label: "Step Into", extra: "F11" },
		{ label: "Step Out", extra: "Shift+F11" },
		{ type: "divider" },
		{ label: "Run Task...", extra: "Ctrl+Shift+P" },
		{ label: "Build", extra: "Ctrl+Shift+B" },
	],
	Terminal: [
		{ label: "New Terminal", extra: "Ctrl+Shift+`" },
		{ label: "New PowerShell Terminal" },
		{ label: "New Command Prompt" },
		{ label: "New Git Bash" },
		{ type: "divider" },
		{ label: "Split Terminal", hasSub: true },
		{ label: "Terminate Terminal" },
		{ label: "Kill All Terminals" },
		{ type: "divider" },
		{ label: "Clear Terminal" },
		{ label: "Configure Default Profile..." },
		{ label: "Select Default Profile...", hasSub: true },
	],
	Help: [
		{ label: "Welcome", extra: "Help > Welcome" },
		{ label: "Show Welcome Page", extra: "Help > Show Welcome Page" },
		{ type: "divider" },
		{ label: "Documentation", hasSub: true },
		{ label: "Reference", hasSub: true },
		{ label: "Introduction to Basic Features" },
		{ type: "divider" },
		{ label: "Keyboard Shortcuts Reference", extra: "Ctrl+K Ctrl+S" },
		{ label: "Playground", extra: "Help > Playground" },
		{ type: "divider" },
		{ label: "Show All Commands", extra: "Ctrl+Shift+P" },
		{ label: "Editor Layout", hasSub: true },
		{ type: "divider" },
		{ label: "Toggle Developer Tools", extra: "F12" },
		{ label: "Check for Updates..." },
		{ type: "divider" },
		{ label: "Report Issue", extra: "Help > Report Issue" },
		{ label: "Request Feature" },
		{ label: "Show Release Notes", extra: "Help > Show Release Notes" },
		{ type: "divider" },
		{ label: "View License", extra: "Help > View License" },
		{ label: "Privacy Statement" },
		{ label: "About Nexus", extra: "Help > About" },
	],
};

const VIEW_SWITCHER_ITEMS = [
	{ label: "Search", extra: "Ctrl+Shift+F", icon: Search, pinned: true },
	{
		label: "Source Control",
		extra: "Ctrl+Shift+G",
		icon: GitBranch,
		pinned: true,
	},
	{
		label: "Explorer",
		extra: "Ctrl+Shift+E",
		icon: Files,
		pinned: true,
		active: true,
	},
	{ label: "Run and Debug", extra: "Ctrl+Shift+D", icon: Play, pinned: false },
	{ label: "Extensions", extra: "Ctrl+Shift+X", icon: Square, pinned: false },
	{ label: "Remote Explorer", icon: Monitor, pinned: false },
];

const INITIAL_TREE = [
	{ id: "root", name: "TWITTER-CLONE", type: "folder", isOpen: true, level: 0 },
	{
		id: "src",
		name: "src",
		type: "folder",
		isOpen: true,
		level: 1,
		parentId: "root",
		gitStatus: "dot-green",
	},
	{
		id: "components",
		name: "components",
		type: "folder",
		isOpen: true,
		level: 2,
		parentId: "src",
		gitStatus: "dot-green",
	},
	{
		id: "analytics",
		name: "analytics",
		type: "folder",
		isOpen: true,
		level: 3,
		parentId: "components",
		gitStatus: "dot-green",
	},
	{
		id: "engagement-chart.tsx",
		name: "engagement-chart.tsx",
		type: "file",
		level: 4,
		parentId: "analytics",
		gitStatus: "U",
		path: "src > components > analytics",
	},
	{
		id: "aside",
		name: "aside",
		type: "folder",
		isOpen: true,
		level: 3,
		parentId: "components",
		gitStatus: "dot-yellow",
	},
	{
		id: "aside-footer.tsx",
		name: "aside-footer.tsx",
		type: "file",
		level: 4,
		parentId: "aside",
		gitStatus: "M",
		path: "src > components > aside",
	},
	{
		id: "package.json",
		name: "package.json",
		type: "file",
		level: 1,
		parentId: "root",
	},
];

const SETTINGS_TABS = [
	{ id: "general", label: "General", icon: Settings },
	{ id: "plan", label: "Plan & Usage" },
	{ id: "agents", label: "Agents" },
	{ id: "beta", label: "Beta" },
	{ type: "divider" },
	{ id: "docs", label: "Docs", icon: ExternalLink, external: true },
];

// --- Static Sub-Components ---

const _highlight = (line) => {
	return line
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(
			/\b(import|from|export|function|return|type|const|let|var|if|else|for|while|switch|case|default|break|continue|try|catch|finally|throw|class|extends|implements|interface|enum|static|async|await|as|new|typeof|instanceof|void|delete|in|of|this|super|public|private|protected|readonly|get|set|any|boolean|number|string|symbol|bigint|object|undefined|null|never|unknown|void)\b/g,
			'<span style="color:#f97583">$1</span>',
		)
		.replace(
			/\b(React|JSX|Array|Date|EngagementChart|LineChart|Line|XAxis|YAxis|CartesianGrid|Tooltip|ResponsiveContainer|EngagementChartProps)\b/g,
			'<span style="color:#b392f0">$1</span>',
		)
		.replace(/(['"`].*?['"`])/g, '<span style="color:#9ecbff">$1</span>')
		.replace(/(\/\/.*)/g, '<span style="color:#8b949e">$1</span>')
		.replace(/(\{|\}|\(|\)|\[|\])/g, '<span style="color:#e6edf3">$1</span>')
		.replace(/(\b\w+)(?=\s*\()/g, '<span style="color:#d2a8ff">$1</span>')
		.replace(/(\b\w+)(?=:)/g, '<span style="color:#79c0ff">$1</span>');
};

const Toggle = ({ enabled, onToggle }) => (
	<button
		onClick={() => onToggle(!enabled)}
		className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${enabled ? "bg-[#3fb950]" : "bg-[#30363d]"}`}
	>
		<div
			className={`bg-white w-3 h-3 rounded-full shadow transform transition-transform ${enabled ? "translate-x-4" : ""}`}
		/>
	</button>
);

const SettingRow = ({ title, description, children }) => (
	<div className="flex items-center justify-between py-4 border-b border-gray-800/40 last:border-0 text-left">
		<div className="flex-1 pr-4">
			<div className="text-sm font-medium text-gray-200">{title}</div>
			<div className="text-xs text-[#8b949e] mt-1 leading-relaxed">{description}</div>
		</div>
		<div className="flex-shrink-0">{children}</div>
	</div>
);

const DesktopMenuPopup = ({
	items,
	onClose,
	onAction,
	recentFiles,
	showRecentFilesDropdown,
	onRecentFileClick,
	_menuName,
	showAppearanceDropdown,
	showPanelDropdown,
	setShowAppearanceDropdown,
	setShowPanelDropdown,
	showNavigateHistory,
	showBookmarks,
	setShowNavigateHistory,
	setShowBookmarks,
	bookmarks,
	navigationHistory,
	handleGoToBookmark,
}) => (
	<div className="absolute top-full left-0 mt-0 w-64 bg-[#1c1c1f] border border-[#30363d] shadow-2xl z-[100] py-1 rounded-sm">
		{items.map((item, i) =>
			item.type === "divider" ? (
				<div key={i} className="h-px bg-[#30363d] my-1 mx-1" />
			) : item.label === "Recent Files" ? (
				<div key={i} className="relative">
					<button
						className="w-full flex items-center px-3 py-1.5 text-[12px] hover:bg-[#006abc] group text-gray-200"
						onClick={() => onAction?.("Recent Files")}
					>
						<span className="flex-1 text-left">{item.label}</span>
						<ChevronRight size={14} className="ml-2 opacity-50" />
					</button>
					{showRecentFilesDropdown && recentFiles.length > 0 && (
						<div className="absolute left-full top-0 ml-0 w-56 bg-[#1c1c1f] border border-[#30363d] shadow-2xl z-[200] py-1 rounded-sm">
							{recentFiles.map((file, j) => (
								<button
									key={j}
									className="w-full flex items-center px-3 py-1.5 text-[11px] hover:bg-[#006abc] text-gray-200"
									onClick={() => onRecentFileClick(file)}
								>
									<FileCode size={12} className="mr-2 text-blue-400" />
									<span className="flex-1 text-left truncate">{file.name}</span>
								</button>
							))}
							{recentFiles.length === 0 && (
								<div className="px-3 py-2 text-[11px] text-gray-500">No recent files</div>
							)}
						</div>
					)}
				</div>
			) : item.label === "Appearance" ? (
				<div key={i} className="relative">
					<button
						className="w-full flex items-center px-3 py-1.5 text-[12px] hover:bg-[#006abc] group text-gray-200"
						onClick={() => setShowAppearanceDropdown(!showAppearanceDropdown)}
					>
						<span className="flex-1 text-left">{item.label}</span>
						<ChevronRight size={14} className="ml-2 opacity-50" />
					</button>
					{showAppearanceDropdown && (
						<div className="absolute left-full top-0 ml-0 w-56 bg-[#1c1c1f] border border-[#30363d] shadow-2xl z-[200] py-1 rounded-sm">
							<button
								className="w-full flex items-center px-3 py-1.5 text-[11px] hover:bg-[#006abc] text-gray-200"
								onClick={() => onAction?.("Dark Theme")}
							>
								<Moon size={12} className="mr-2 text-gray-400" />
								<span className="flex-1 text-left">Dark</span>
							</button>
							<button
								className="w-full flex items-center px-3 py-1.5 text-[11px] hover:bg-[#006abc] text-gray-200"
								onClick={() => onAction?.("Light Theme")}
							>
								<Sun size={12} className="mr-2 text-gray-400" />
								<span className="flex-1 text-left">Light</span>
							</button>
							<button
								className="w-full flex items-center px-3 py-1.5 text-[11px] hover:bg-[#006abc] text-gray-200"
								onClick={() => onAction?.("High Contrast")}
							>
								<Circle size={12} className="mr-2 text-gray-400" />
								<span className="flex-1 text-left">High Contrast</span>
							</button>
						</div>
					)}
				</div>
			) : item.label === "Panel" ? (
				<div key={i} className="relative">
					<button
						className="w-full flex items-center px-3 py-1.5 text-[12px] hover:bg-[#006abc] group text-gray-200"
						onClick={() => setShowPanelDropdown(!showPanelDropdown)}
					>
						<span className="flex-1 text-left">{item.label}</span>
						<ChevronRight size={14} className="ml-2 opacity-50" />
					</button>
					{showPanelDropdown && (
						<div className="absolute left-full top-0 ml-0 w-56 bg-[#1c1c1f] border border-[#30363d] shadow-2xl z-[200] py-1 rounded-sm">
							<button
								className="w-full flex items-center px-3 py-1.5 text-[11px] hover:bg-[#006abc] text-gray-200"
								onClick={() => onAction?.("Toggle Panel")}
							>
								<PanelBottom size={12} className="mr-2 text-gray-400" />
								<span className="flex-1 text-left">Toggle Panel</span>
							</button>
							<button
								className="w-full flex items-center px-3 py-1.5 text-[11px] hover:bg-[#006abc] text-gray-200"
								onClick={() => onAction?.("Maximize Panel")}
							>
								<Maximize2 size={12} className="mr-2 text-gray-400" />
								<span className="flex-1 text-left">Maximize Panel</span>
							</button>
						</div>
					)}
				</div>
			) : item.label === "Navigate History" ? (
				<div key={i} className="relative">
					<button
						className="w-full flex items-center px-3 py-1.5 text-[12px] hover:bg-[#006abc] group text-gray-200"
						onClick={() => setShowNavigateHistory(!showNavigateHistory)}
					>
						<span className="flex-1 text-left">{item.label}</span>
						<ChevronRight size={14} className="ml-2 opacity-50" />
					</button>
					{showNavigateHistory && (
						<div className="absolute left-full top-0 ml-0 w-56 bg-[#1c1c1f] border border-[#30363d] shadow-2xl z-[200] py-1 rounded-sm">
							{navigationHistory.length > 0 ? (
								navigationHistory.map((item, j) => (
									<button
										key={j}
										className="w-full flex items-center px-3 py-1.5 text-[11px] hover:bg-[#006abc] text-gray-200"
										onClick={() => onAction?.("Navigate to History Item")}
									>
										<History size={12} className="mr-2 text-gray-400" />
										<span className="flex-1 text-left truncate">Line {item.line}</span>
									</button>
								))
							) : (
								<div className="px-3 py-2 text-[11px] text-gray-500">No navigation history</div>
							)}
						</div>
					)}
				</div>
			) : item.label === "Bookmarks" ? (
				<div key={i} className="relative">
					<button
						className="w-full flex items-center px-3 py-1.5 text-[12px] hover:bg-[#006abc] group text-gray-200"
						onClick={() => setShowBookmarks(!showBookmarks)}
					>
						<span className="flex-1 text-left">{item.label}</span>
						<ChevronRight size={14} className="ml-2 opacity-50" />
					</button>
					{showBookmarks && (
						<div className="absolute left-full top-0 ml-0 w-56 bg-[#1c1c1f] border border-[#30363d] shadow-2xl z-[200] py-1 rounded-sm">
							{bookmarks.length > 0 ? (
								bookmarks.map((bookmark, j) => (
									<button
										key={j}
										className="w-full flex items-center px-3 py-1.5 text-[11px] hover:bg-[#006abc] text-gray-200"
										onClick={() => handleGoToBookmark(bookmark)}
									>
										<Pin size={12} className="mr-2 text-gray-400" />
										<span className="flex-1 text-left truncate">{bookmark.fileName}</span>
										<span className="text-[10px] text-gray-500">L{bookmark.line}</span>
									</button>
								))
							) : (
								<div className="px-3 py-2 text-[11px] text-gray-500">No bookmarks</div>
							)}
						</div>
					)}
				</div>
			) : (
				<button
					key={i}
					className="w-full flex items-center px-3 py-1.5 text-[12px] hover:bg-[#006abc] group text-gray-200"
					onClick={() => {
						onAction?.(item.label);
						onClose();
					}}
				>
					<span className="w-5">{item.isChecked && <Check size={14} />}</span>
					<span className="flex-1 text-left">{item.label}</span>
					<span className="text-gray-500 group-hover:text-blue-100 text-[10px] ml-4 font-mono">
						{item.extra}
					</span>
				</button>
			),
		)}
	</div>
);

const _DiagnosticPopup = ({ x, y, onFix }) => (
	<div
		className="fixed z-[1000] w-80 bg-[#1c1c1f] border border-[#30363d] rounded-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-100"
		style={{ top: y + 25, left: Math.max(10, x - 150) }}
	>
		<div className="p-3 space-y-3">
			<div className="flex items-start gap-2">
				<div className="mt-1 text-[#f85149] font-bold text-sm">{"'"}</div>
				<div className="flex-1 text-xs text-[#e6edf3] leading-relaxed text-left">
					<span className="font-bold">{"','"}</span> expected.{" "}
					<span className="text-[#8b949e]">ts(1005)</span>
				</div>
			</div>
			<button
				onClick={onFix}
				className="w-full bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold py-1.5 rounded flex items-center justify-center gap-2 transition-colors"
			>
				Fix in Chat (Ctrl+Shift+D)
			</button>
			<div className="text-[11px] text-[#8b949e] font-mono border-t border-[#30363d] pt-2 text-left">
				(property) <span className="text-[#79c0ff]">views</span>: number
			</div>
			<div className="flex gap-4 text-[10px] font-semibold text-[#58a6ff]">
				<button className="hover:underline">View Problem</button>
				<button className="hover:underline">Quick Fix...</button>
			</div>
		</div>
	</div>
);

const FindReplaceDialog = ({
	isOpen,
	onClose,
	findText,
	replaceText,
	onFindChange,
	onReplaceChange,
	onFind,
	onReplace,
	onReplaceAll,
	matchCase,
	matchWholeWord,
	useRegex,
	onMatchCaseChange,
	onMatchWholeWordChange,
	onUseRegexChange,
}) => {
	if (!isOpen) return null;

	return (
		<div className="fixed top-20 right-4 w-96 bg-[#1c1c1f] border border-[#30363d] rounded-lg shadow-2xl z-[1000] p-4">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-sm font-semibold text-white">Find & Replace</h3>
				<button onClick={onClose} className="text-gray-400 hover:text-white">
					<X size={16} />
				</button>
			</div>

			<div className="space-y-3">
				<div>
					<label className="block text-xs text-gray-400 mb-1">Find</label>
					<input
						type="text"
						value={findText}
						onChange={(e) => onFindChange(e.target.value)}
						className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#58a6ff]"
						placeholder="Search for..."
					/>
				</div>

				<div>
					<label className="block text-xs text-gray-400 mb-1">Replace</label>
					<input
						type="text"
						value={replaceText}
						onChange={(e) => onReplaceChange(e.target.value)}
						className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#58a6ff]"
						placeholder="Replace with..."
					/>
				</div>

				<div className="flex items-center gap-4 text-xs">
					<label className="flex items-center gap-2 text-gray-300">
						<input
							type="checkbox"
							checked={matchCase}
							onChange={(e) => onMatchCaseChange(e.target.checked)}
							className="rounded border-[#30363d] bg-[#0d1117]"
						/>
						Match Case
					</label>
					<label className="flex items-center gap-2 text-gray-300">
						<input
							type="checkbox"
							checked={matchWholeWord}
							onChange={(e) => onMatchWholeWordChange(e.target.checked)}
							className="rounded border-[#30363d] bg-[#0d1117]"
						/>
						Whole Word
					</label>
					<label className="flex items-center gap-2 text-gray-300">
						<input
							type="checkbox"
							checked={useRegex}
							onChange={(e) => onUseRegexChange(e.target.checked)}
							className="rounded border-[#30363d] bg-[#0d1117]"
						/>
						Regex
					</label>
				</div>

				<div className="flex gap-2 pt-2">
					<button
						onClick={onFind}
						className="flex-1 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium py-2 rounded transition-colors"
					>
						Find Next
					</button>
					<button
						onClick={onReplace}
						className="flex-1 bg-[#1f6feb] hover:bg-[#1f6feb] text-white text-xs font-medium py-2 rounded transition-colors"
					>
						Replace
					</button>
					<button
						onClick={onReplaceAll}
						className="flex-1 bg-[#da3633] hover:bg-[#da3633] text-white text-xs font-medium py-2 rounded transition-colors"
					>
						Replace All
					</button>
				</div>
			</div>
		</div>
	);
};

const BottomPanel = ({ isOpen, onClose }) => {
	if (!isOpen) return null;
	return (
		<div className="h-64 border-t border-[#30363d] bg-[#0d1117] flex flex-col flex-shrink-0 z-40">
			<div className="h-9 border-b border-[#30363d] flex items-center px-4 justify-between bg-[#010409]">
				<div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider text-[#8b949e]">
					<button className="hover:text-white">Problems</button>
					<button className="text-white border-b-2 border-[#f78166] h-9">Output</button>
					<button className="hover:text-white">Debug Console</button>
					<button className="hover:text-white">Terminal</button>
				</div>
				<div className="flex items-center gap-3 text-gray-500">
					<div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded px-2 h-6">
						<input
							type="text"
							placeholder="Filter"
							className="bg-transparent border-none outline-none text-[10px] w-24"
						/>
						<Filter size={12} />
					</div>
					<button className="hover:text-white" onClick={onClose}>
						<X size={14} />
					</button>
				</div>
			</div>
			<div className="flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed text-[#8b949e] custom-scrollbar text-left">
				<div className="text-[#3fb950]">
					{"[info] 2026-02-16 09:25:36.101 Pinging remote server via 127.0.0.1:64806..."}
				</div>
				<div className="text-[#58a6ff]">
					{
						"[info] [forwarding][multiplex][127.0.0.1:64806 -> 127.0.0.1:39889] received connection request"
					}
				</div>
				<div>{'[info] [Command] Sending command request: {"command":"echo"}'}</div>
				<div className="text-[#d29922]">{"Socks forwarding established"}</div>
				<div className="animate-pulse">_</div>
			</div>
		</div>
	);
};

// --- Main App Component ---

export default function App() {
	const [tree, setTree] = useState(INITIAL_TREE);
	const [openFiles, setOpenFiles] = useState([
		{
			id: "engagement-chart.tsx",
			name: "engagement-chart.tsx",
			gitStatus: "U",
			path: "src > components > analytics",
			content: `import React from 'react';\nimport { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';\n\ntype EngagementChartProps = {\n  data: Array<{\n    date: Date;\n    views: number;\n    impressions: number;\n    engagements: number;\n  }>;\n};\n\nexport function EngagementChart({ data }: EngagementChartProps): JSX.Element {\n  const chartData = data.map((item) => ({\n    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),\n    views: item.views,\n    impressions: item.impressions,\n    engagements: item.engagements\n  }));\n\n  return (\n    <div className='w-full h-64 mt-4'>\n      <ResponsiveContainer width='100%' height='100%'>\n        <LineChart data={chartData}>\n          <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />\n          <XAxis dataKey='date' stroke='#6b7280' style={{ fontSize: '12px' }} />\n          <YAxis stroke='#6b7280' style={{ fontSize: '12px' }} />\n          <Tooltip />\n          <Line type='monotone' dataKey='views' stroke='#3b82f6' />\n        </LineChart>\n      </ResponsiveContainer>\n    </div>\n  );\n}`,
		},
	]);
	const [activeFileId, setActiveFileId] = useState("engagement-chart.tsx");
	const [showSettings, setShowSettings] = useState(false);
	const [activeTab, setActiveTab] = useState("general");
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
	const [aiOpen, setAiOpen] = useState(true);
	const [activeMenu, setActiveMenu] = useState(null);
	const [activityDropdownOpen, setActivityDropdownOpen] = useState(false);
	const [aiMode, setAiMode] = useState("Agent");
	const [showAiModeDropdown, setShowAiModeDropdown] = useState(false);
	const [userInput, setUserInput] = useState("");
	const [_hoveredError, _setHoveredError] = useState(null);
	const [isMinimized, setIsMinimized] = useState(false);
	const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(true);
	const [recentFiles, setRecentFiles] = useState([]);
	const [showRecentFilesDropdown, setShowRecentFilesDropdown] = useState(false);
	const [showFindReplace, setShowFindReplace] = useState(false);
	const [findText, setFindText] = useState("");
	const [replaceText, setReplaceText] = useState("");
	const [matchCase, setMatchCase] = useState(false);
	const [matchWholeWord, setMatchWholeWord] = useState(false);
	const [useRegex, setUseRegex] = useState(false);
	const [cursors, setCursors] = useState([{ line: 0, column: 0 }]); // Multiple cursor positions
	const [isMultiCursorMode, setIsMultiCursorMode] = useState(false);
	const [_theme, setTheme] = useState("dark");
	const [_showLineNumbers, _setShowLineNumbers] = useState(true);
	const [showWhitespace, setShowWhitespace] = useState(false);
	const [zenMode, setZenMode] = useState(false);
	const [showAppearanceDropdown, setShowAppearanceDropdown] = useState(false);
	const [showPanelDropdown, setShowPanelDropdown] = useState(false);
	const [_showGoToLine, setShowGoToLine] = useState(false);
	const [_showGoToFile, setShowGoToFile] = useState(false);
	const [goToLine, setGoToLine] = useState("");
	const [goToFile, setGoToFile] = useState("");
	const [navigationHistory, setNavigationHistory] = useState([]);
	const [bookmarks, setBookmarks] = useState([]);
	const [showNavigateHistory, setShowNavigateHistory] = useState(false);
	const [showBookmarks, setShowBookmarks] = useState(false);
	const [_isDebugging, setIsDebugging] = useState(false);
	const [_breakpoints, setBreakpoints] = useState([]);
	const [showNewBreakpoint, setShowNewBreakpoint] = useState(false);
	const [_debugMode, setDebugMode] = useState("stopped"); // stopped, running, paused
	const [terminals, setTerminals] = useState([]);
	const [activeTerminalId, setActiveTerminalId] = useState(null);
	const [showSplitTerminal, setShowSplitTerminal] = useState(false);
	const [showDefaultProfile, setShowDefaultProfile] = useState(false);
	const [_defaultTerminalProfile, setDefaultTerminalProfile] = useState("powershell");

	// Monaco Editor state
	const [editorTheme, setEditorTheme] = useState("vs-dark");
	const [language, setLanguage] = useState("javascript");
	const [fontSize, _setFontSize] = useState(14);
	const [wordWrap, setWordWrap] = useState("off");
	const [minimap, setMinimap] = useState(false);
	const [lineNumbers, setLineNumbers] = useState("on");
	const [codeFolding, _setCodeFolding] = useState(true);
	const [bracketMatching, _setBracketMatching] = useState(true);
	const [suggestions, _setSuggestions] = useState(true);

	// Robust safety for active file references
	const activeFile = openFiles.find((f) => f.id === activeFileId) ||
		openFiles[0] || { path: "root", name: "Untitled", content: "" };

	const handleToggleFolder = (id) => {
		setTree(tree.map((node) => (node.id === id ? { ...node, isOpen: !node.isOpen } : node)));
	};

	const handleSelectFile = (node) => {
		if (node.type === "file") {
			// Detect language for Monaco Editor
			handleLanguageDetection(node.name);

			if (!openFiles.find((f) => f.id === node.id)) {
				setOpenFiles([
					...openFiles,
					{
						...node,
						content: `import React from 'react';\n\n// Loaded component content for ${node.name}`,
					},
				]);
			}
			setActiveFileId(node.id);
			// Add to recent files
			setRecentFiles((prev) => {
				const filtered = prev.filter((f) => f.id !== node.id);
				return [node, ...filtered].slice(0, 10);
			});
		}
	};

	const handleSaveAs = () => {
		const activeFile = openFiles.find((f) => f.id === activeFileId);
		if (activeFile) {
			// Simulate Save As dialog
			const fileName = prompt("Save As:", activeFile.name);
			if (fileName) {
				const newFile = { ...activeFile, name: fileName, id: fileName };
				setOpenFiles(openFiles.map((f) => (f.id === activeFileId ? newFile : f)));
				setActiveFileId(fileName);
			}
		}
	};

	const handleSaveAll = () => {
		// Simulate saving all files
		console.log("Saving all files...");
		// In a real implementation, this would save all open files
	};

	const handleCloseFile = () => {
		if (openFiles.length > 1) {
			const newOpenFiles = openFiles.filter((f) => f.id !== activeFileId);
			setOpenFiles(newOpenFiles);
			setActiveFileId(newOpenFiles[0]?.id || "");
		}
	};

	const handleCloseFolder = () => {
		setOpenFiles([]);
		setActiveFileId("");
		setTree(INITIAL_TREE);
	};

	const handleRecentFileClick = (file) => {
		if (!openFiles.find((f) => f.id === file.id)) {
			setOpenFiles([...openFiles, file]);
		}
		setActiveFileId(file.id);
		setShowRecentFilesDropdown(false);
	};

	const handleMenuAction = (action) => {
		switch (action) {
			case "Save As...":
				handleSaveAs();
				break;
			case "Save All":
				handleSaveAll();
				break;
			case "Recent Files":
				setShowRecentFilesDropdown(!showRecentFilesDropdown);
				break;
			case "Close File":
				handleCloseFile();
				break;
			case "Close Folder":
				handleCloseFolder();
				break;
			case "Find":
				setShowFindReplace(true);
				break;
			case "Replace":
				setShowFindReplace(true);
				break;
			case "Toggle Line Comment":
				handleToggleLineComment();
				break;
			case "Delete Line":
				handleDeleteLine();
				break;
			case "Duplicate Line Up":
				handleDuplicateLine("up");
				break;
			case "Duplicate Line Down":
				handleDuplicateLine("down");
				break;
			case "Add Cursor":
				setIsMultiCursorMode(!isMultiCursorMode);
				break;
			case "Appearance":
				setShowAppearanceDropdown(!showAppearanceDropdown);
				break;
			case "Side Bar":
				setSidebarOpen(!sidebarOpen);
				break;
			case "Status Bar":
				// Toggle status bar visibility
				break;
			case "Activity Bar":
				// Toggle activity bar visibility
				break;
			case "Panel":
				setShowPanelDropdown(!showPanelDropdown);
				break;
			case "Word Wrap":
				handleWordWrapToggle();
				break;
			case "Minimap":
				handleMinimapToggle();
				break;
			case "Line Numbers":
				handleLineNumbersToggle();
				break;
			case "Render Whitespace":
				handleWhitespaceToggle();
				break;
			case "Zen Mode":
				handleZenMode();
				break;
			case "Full Screen":
				handleFullScreen();
				break;
			case "Dark Theme":
				handleThemeChange("dark");
				break;
			case "Light Theme":
				handleThemeChange("light");
				break;
			case "High Contrast":
				handleThemeChange("high-contrast");
				break;
			case "Toggle Panel":
				setBottomPanelOpen(!bottomPanelOpen);
				break;
			case "Maximize Panel":
				setBottomPanelOpen(true);
				break;
			case "Back":
				handleNavigateBack();
				break;
			case "Forward":
				handleNavigateForward();
				break;
			case "Go to File...":
				handleGoToFile();
				break;
			case "Go to Line/Column...":
				handleGoToLine();
				break;
			case "Go to Symbol in File...":
				console.log("Go to symbol in file");
				break;
			case "Go to Symbol in Workspace...":
				console.log("Go to symbol in workspace");
				break;
			case "Go to Last Edit Location":
				console.log("Go to last edit location");
				break;
			case "Navigate History":
				setShowNavigateHistory(!showNavigateHistory);
				break;
			case "Bookmarks":
				setShowBookmarks(!showBookmarks);
				break;
			case "Start Debugging":
				handleStartDebugging();
				break;
			case "Start Without Debugging":
				handleStartWithoutDebugging();
				break;
			case "Stop Debugging":
				handleStopDebugging();
				break;
			case "Restart Debugging":
				handleRestartDebugging();
				break;
			case "Toggle Breakpoint":
				handleToggleBreakpoint();
				break;
			case "New Breakpoint":
				setShowNewBreakpoint(!showNewBreakpoint);
				break;
			case "Enable All Breakpoints":
				console.log("Enable all breakpoints");
				break;
			case "Disable All Breakpoints":
				console.log("Disable all breakpoints");
				break;
			case "Remove All Breakpoints":
				setBreakpoints([]);
				break;
			case "Step Over":
				handleStepOver();
				break;
			case "Step Into":
				handleStepInto();
				break;
			case "Step Out":
				handleStepOut();
				break;
			case "Run Task...":
				handleRunTask();
				break;
			case "Build":
				handleBuild();
				break;
			case "New Terminal":
				handleNewTerminal();
				break;
			case "New PowerShell Terminal":
				handleNewTerminal("powershell");
				break;
			case "New Command Prompt":
				handleNewTerminal("cmd");
				break;
			case "New Git Bash":
				handleNewTerminal("gitbash");
				break;
			case "Split Terminal":
				setShowSplitTerminal(!showSplitTerminal);
				break;
			case "Terminate Terminal":
				handleTerminateTerminal();
				break;
			case "Kill All Terminals":
				handleKillAllTerminals();
				break;
			case "Clear Terminal":
				handleClearTerminal();
				break;
			case "Configure Default Profile...":
				handleConfigureDefaultProfile();
				break;
			case "Select Default Profile...":
				setShowDefaultProfile(!showDefaultProfile);
				break;
			case "Welcome":
				console.log("Show welcome page");
				break;
			case "Show Welcome Page":
				console.log("Show welcome page");
				break;
			case "Introduction to Basic Features":
				console.log("Show introduction to basic features");
				break;
			case "Keyboard Shortcuts Reference":
				console.log("Show keyboard shortcuts");
				break;
			case "Playground":
				console.log("Show playground");
				break;
			case "Show All Commands":
				console.log("Show all commands");
				break;
			case "Toggle Developer Tools":
				if (typeof window !== "undefined" && window.openDevTools) {
					window.openDevTools();
				}
				break;
			case "Check for Updates...":
				console.log("Check for updates");
				break;
			case "Report Issue":
				console.log("Report issue");
				break;
			case "Request Feature":
				console.log("Request feature");
				break;
			case "Show Release Notes":
				console.log("Show release notes");
				break;
			case "View License":
				console.log("View license");
				break;
			case "Privacy Statement":
				console.log("Show privacy statement");
				break;
			case "About Nexus":
				console.log("About Nexus Code Editor");
				break;
			case "Exit":
				setIsCodeEditorOpen(false);
				break;
			default:
				console.log("Menu action:", action);
		}
	};

	const handleFind = () => {
		console.log("Find:", findText);
		// Implement find logic
	};

	const handleReplace = () => {
		console.log("Replace:", findText, "with:", replaceText);
		// Implement replace logic
	};

	const handleReplaceAll = () => {
		console.log("Replace All:", findText, "with:", replaceText);
		// Implement replace all logic
	};

	const handleToggleLineComment = () => {
		const activeFile = openFiles.find((f) => f.id === activeFileId);
		if (activeFile) {
			const lines = activeFile.content.split("\n");
			const commentedLines = lines.map((line) => {
				const trimmed = line.trim();
				if (trimmed.startsWith("//")) {
					return line.replace(/^(\s*)\/\/\s?/, "$1");
				} else if (trimmed.length > 0) {
					const leadingWhitespace = line.match(/^(\s*)/)[1];
					return `${leadingWhitespace}// ${trimmed}`;
				}
				return line;
			});

			const newContent = commentedLines.join("\n");
			setOpenFiles(
				openFiles.map((f) => (f.id === activeFileId ? { ...f, content: newContent } : f)),
			);
		}
	};

	const handleDeleteLine = () => {
		const activeFile = openFiles.find((f) => f.id === activeFileId);
		if (activeFile) {
			const lines = activeFile.content.split("\n");
			// Remove current line (simplified - would need cursor position in real implementation)
			if (lines.length > 0) {
				lines.splice(0, 1);
				const newContent = lines.join("\n");
				setOpenFiles(
					openFiles.map((f) => (f.id === activeFileId ? { ...f, content: newContent } : f)),
				);
			}
		}
	};

	const handleDuplicateLine = (direction) => {
		const activeFile = openFiles.find((f) => f.id === activeFileId);
		if (activeFile) {
			const lines = activeFile.content.split("\n");
			// Duplicate current line (simplified - would need cursor position in real implementation)
			if (lines.length > 0) {
				const lineToDuplicate = lines[0];
				if (direction === "up") {
					lines.unshift(lineToDuplicate);
				} else {
					lines.splice(1, 0, lineToDuplicate);
				}
				const newContent = lines.join("\n");
				setOpenFiles(
					openFiles.map((f) => (f.id === activeFileId ? { ...f, content: newContent } : f)),
				);
			}
		}
	};

	const _handleMultiCursorClick = (line, column) => {
		if (isMultiCursorMode) {
			// Add new cursor if not already at this position
			const exists = cursors.some((c) => c.line === line && c.column === column);
			if (!exists) {
				setCursors([...cursors, { line, column }]);
			}
		} else {
			// Single cursor mode - move existing cursor
			setCursors([{ line, column }]);
		}
	};

	const _handleClearMultiCursors = () => {
		setCursors([{ line: 0, column: 0 }]);
		setIsMultiCursorMode(false);
	};

	const _handleMultiCursorSelect = () => {
		// Select text between all cursors (simplified implementation)
		console.log("Multi-cursor select:", cursors);
	};

	const handleWordWrapToggle = () => {
		setWordWrap(wordWrap === "off" ? "on" : "off");
	};

	const handleMinimapToggle = () => {
		setMinimap(!minimap);
	};

	const handleLineNumbersToggle = () => {
		setLineNumbers(lineNumbers === "on" ? "off" : "on");
	};

	const handleWhitespaceToggle = () => {
		setShowWhitespace(!showWhitespace);
	};

	const handleZenMode = () => {
		setZenMode(!zenMode);
		// Hide all panels in zen mode
		if (!zenMode) {
			setSidebarOpen(false);
			setBottomPanelOpen(false);
			setAiOpen(false);
		}
	};

	const handleFullScreen = () => {
		if (document.fullscreenElement) {
			if (document.fullscreenElement === null) {
				document.documentElement.requestFullscreen();
			} else {
				document.exitFullscreen();
			}
		}
	};

	const handleGoToLine = () => {
		setShowGoToLine(true);
	};

	const handleGoToFile = () => {
		setShowGoToFile(true);
	};

	const _handleNavigateToLine = () => {
		const lineNumber = parseInt(goToLine, 10);
		if (!Number.isNaN(lineNumber) && lineNumber > 0) {
			console.log("Navigate to line:", lineNumber);
			// Add to navigation history
			setNavigationHistory([...navigationHistory, { file: activeFileId, line: lineNumber }]);
			setShowGoToLine(false);
			setGoToLine("");
		}
	};

	const _handleNavigateToFile = () => {
		if (goToFile.trim()) {
			console.log("Navigate to file:", goToFile);
			// Find and open file (simplified)
			const file = tree.find(
				(node) => node.type === "file" && node.name.toLowerCase().includes(goToFile.toLowerCase()),
			);
			if (file) {
				handleSelectFile(file);
			}
			setShowGoToFile(false);
			setGoToFile("");
		}
	};

	const _handleAddBookmark = () => {
		const bookmark = {
			id: Date.now(),
			file: activeFileId,
			fileName: activeFile.name,
			line: 1, // Would use actual cursor position
			timestamp: new Date().toLocaleTimeString(),
		};
		setBookmarks([...bookmarks, bookmark]);
	};

	const handleGoToBookmark = (bookmark) => {
		setActiveFileId(bookmark.file);
		console.log("Navigate to bookmark:", bookmark);
	};

	const handleNavigateBack = () => {
		if (navigationHistory.length > 1) {
			const newHistory = [...navigationHistory];
			newHistory.pop();
			const previous = newHistory[newHistory.length - 1];
			setNavigationHistory(newHistory);
			if (previous) {
				setActiveFileId(previous.file);
				console.log("Navigate back to:", previous);
			}
		}
	};

	const handleNavigateForward = () => {
		// Simplified forward navigation
		console.log("Navigate forward");
	};

	const handleStartDebugging = () => {
		setIsDebugging(true);
		setDebugMode("running");
		console.log("Start debugging");
	};

	const handleStopDebugging = () => {
		setIsDebugging(false);
		setDebugMode("stopped");
		console.log("Stop debugging");
	};

	const handleRestartDebugging = () => {
		console.log("Restart debugging");
		setDebugMode("running");
	};

	const handleStartWithoutDebugging = () => {
		console.log("Start without debugging");
	};

	const handleToggleBreakpoint = () => {
		// Toggle breakpoint at current line (simplified)
		console.log("Toggle breakpoint");
	};

	const handleStepOver = () => {
		console.log("Step over");
	};

	const handleStepInto = () => {
		console.log("Step into");
	};

	const handleStepOut = () => {
		console.log("Step out");
	};

	const handleRunTask = () => {
		console.log("Run task");
	};

	const handleBuild = () => {
		console.log("Build project");
	};

	const handleNewTerminal = (type = "default") => {
		const terminalId = Date.now();
		const newTerminal = {
			id: terminalId,
			type: type,
			name:
				type === "powershell"
					? "PowerShell"
					: type === "cmd"
						? "Command Prompt"
						: type === "gitbash"
							? "Git Bash"
							: "Terminal",
			content: "",
			isActive: true,
		};
		setTerminals([...terminals.map((t) => ({ ...t, isActive: false })), newTerminal]);
		setActiveTerminalId(terminalId);
	};

	const handleTerminateTerminal = () => {
		if (activeTerminalId) {
			const newTerminals = terminals.filter((t) => t.id !== activeTerminalId);
			setTerminals(newTerminals);
			setActiveTerminalId(
				newTerminals.length > 0 ? newTerminals[newTerminals.length - 1].id : null,
			);
		}
	};

	const handleKillAllTerminals = () => {
		setTerminals([]);
		setActiveTerminalId(null);
	};

	const handleClearTerminal = () => {
		if (activeTerminalId) {
			setTerminals(terminals.map((t) => (t.id === activeTerminalId ? { ...t, content: "" } : t)));
		}
	};

	const _handleSplitTerminal = (direction) => {
		setShowSplitTerminal(!showSplitTerminal);
		console.log("Split terminal:", direction);
	};
	const handleConfigureDefaultProfile = () => {
		console.log("Configure default terminal profile");
	};

	const _handleSelectDefaultProfile = (profile) => {
		setDefaultTerminalProfile(profile);
		setShowDefaultProfile(false);
	};

	// Monaco Editor handlers
	const handleLanguageDetection = (fileName) => {
		const extension = fileName.split(".").pop().toLowerCase();
		const languageMap = {
			js: "javascript",
			jsx: "javascript",
			ts: "typescript",
			tsx: "typescript",
			py: "python",
			java: "java",
			cpp: "cpp",
			c: "c",
			cs: "csharp",
			php: "php",
			rb: "ruby",
			go: "go",
			rs: "rust",
			sql: "sql",
			html: "html",
			css: "css",
			scss: "scss",
			sass: "sass",
			less: "less",
			json: "json",
			xml: "xml",
			yaml: "yaml",
			yml: "yaml",
			md: "markdown",
			sh: "shell",
			bash: "shell",
			zsh: "shell",
			fish: "shell",
		};
		setLanguage(languageMap[extension] || "plaintext");
	};

	const handleThemeChange = (newTheme) => {
		setTheme(newTheme);
		// Map theme names to Monaco themes
		const themeMap = {
			dark: "vs-dark",
			light: "vs",
			"high-contrast": "hc-black",
		};
		setEditorTheme(themeMap[newTheme] || "vs-dark");
	};

	const handleEditorDidMount = (editor, monaco) => {
		// JavaScript/TypeScript IntelliSense
		monaco.languages.registerCompletionItemProvider("javascript", {
			provideCompletionItems: (_model, _position) => {
				const suggestions = [
					{
						label: "console.log",
						kind: monaco.languages.CompletionItemKind.Function,
						insertText: "console.log(${1:object});",
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Log output to console",
					},
					{
						label: "function",
						kind: monaco.languages.CompletionItemKind.Snippet,
						insertText: "function ${1:functionName}(${2:parameters}) {\n\t${3:// body}\n}",
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Function declaration",
					},
					{
						label: "const",
						kind: monaco.languages.CompletionItemKind.Snippet,
						insertText: "const ${1:variable} = ${2:value};",
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Constant declaration",
					},
					{
						label: "if",
						kind: monaco.languages.CompletionItemKind.Snippet,
						insertText: "if (${1:condition}) {\n\t${2:// code}\n}",
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "If statement",
					},
					{
						label: "for",
						kind: monaco.languages.CompletionItemKind.Snippet,
						insertText:
							"for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\t${3:// code}\n}",
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "For loop",
					},
				];
				return { suggestions };
			},
		});

		// Python IntelliSense
		monaco.languages.registerCompletionItemProvider("python", {
			provideCompletionItems: (_model, _position) => {
				const suggestions = [
					{
						label: "def",
						kind: monaco.languages.CompletionItemKind.Snippet,
						insertText:
							'def ${1:function_name}(${2:parameters}):\n\t"""${3:docstring}"""\n\t${4:pass}',
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Function definition",
					},
					{
						label: "class",
						kind: monaco.languages.CompletionItemKind.Snippet,
						insertText:
							'class ${1:ClassName}:\n\t"""${2:docstring}"""\n\tdef __init__(self${3:, parameters}):\n\t\t${4:pass}',
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Class definition",
					},
					{
						label: "import",
						kind: monaco.languages.CompletionItemKind.Keyword,
						insertText: "import ${1:module}",
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Import module",
					},
					{
						label: "print",
						kind: monaco.languages.CompletionItemKind.Function,
						insertText: "print(${1:object})",
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Print to console",
					},
					{
						label: "if __name__",
						kind: monaco.languages.CompletionItemKind.Snippet,
						insertText: 'if __name__ == "__main__":\n\t${1:pass}',
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Main guard",
					},
				];
				return { suggestions };
			},
		});

		// HTML IntelliSense
		monaco.languages.registerCompletionItemProvider("html", {
			provideCompletionItems: (_model, _position) => {
				const suggestions = [
					{
						label: "div",
						kind: monaco.languages.CompletionItemKind.Snippet,
						insertText: '<div class="${1:className}">\n\t${2:content}\n</div>',
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Div element",
					},
					{
						label: "button",
						kind: monaco.languages.CompletionItemKind.Snippet,
						insertText:
							'<button type="${1:button}" class="${2:className}" onclick="${3:handler}">${4:Text}</button>',
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Button element",
					},
					{
						label: "input",
						kind: monaco.languages.CompletionItemKind.Snippet,
						insertText:
							'<input type="${1:text}" name="${2:name}" placeholder="${3:placeholder}" />',
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Input element",
					},
					{
						label: "link",
						kind: monaco.languages.CompletionItemKind.Snippet,
						insertText: '<link rel="stylesheet" href="${1:styles.css}" />',
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Link stylesheet",
					},
					{
						label: "script",
						kind: monaco.languages.CompletionItemKind.Snippet,
						insertText: '<script src="${1:script.js}"></script>',
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Script tag",
					},
				];
				return { suggestions };
			},
		});

		// CSS IntelliSense
		monaco.languages.registerCompletionItemProvider("css", {
			provideCompletionItems: (_model, _position) => {
				const suggestions = [
					{
						label: "display",
						kind: monaco.languages.CompletionItemKind.Property,
						insertText: "display: ${1:flex};",
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Display property",
					},
					{
						label: "flex",
						kind: monaco.languages.CompletionItemKind.Property,
						insertText: "flex: ${1:1} ${2:1} ${3:auto};",
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Flex property",
					},
					{
						label: "margin",
						kind: monaco.languages.CompletionItemKind.Property,
						insertText: "margin: ${1:0};",
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Margin property",
					},
					{
						label: "padding",
						kind: monaco.languages.CompletionItemKind.Property,
						insertText: "padding: ${1:0};",
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Padding property",
					},
					{
						label: "color",
						kind: monaco.languages.CompletionItemKind.Property,
						insertText: "color: ${1:#000};",
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						documentation: "Color property",
					},
				];
				return { suggestions };
			},
		});

		// Configure bracket matching
		editor.addAction({
			id: "editor.action.jumpToBracket",
			label: "Jump to Bracket",
			keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketRight],
			run: (editor) => {
				const position = editor.getPosition();
				const _model = editor.getModel();
				// Simplified bracket matching logic
				console.log("Jump to bracket at position:", position);
			},
		});

		// Code folding actions
		editor.addAction({
			id: "editor.toggleFold",
			label: "Toggle Fold",
			keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.LeftBracket],
			run: (editor) => {
				editor.getAction("editor.fold").run();
			},
		});

		editor.addAction({
			id: "editor.toggleUnfold",
			label: "Toggle Unfold",
			keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.RightBracket],
			run: (editor) => {
				editor.getAction("editor.unfold").run();
			},
		});

		editor.addAction({
			id: "editor.foldAll",
			label: "Fold All",
			keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.LeftBracket],
			run: (editor) => {
				editor.getAction("editor.foldAll").run();
			},
		});

		editor.addAction({
			id: "editor.unfoldAll",
			label: "Unfold All",
			keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.RightBracket],
			run: (editor) => {
				editor.getAction("editor.unfoldAll").run();
			},
		});

		// Bracket matching enhancement
		editor.addAction({
			id: "editor.action.selectToBracket",
			label: "Select to Bracket",
			keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketRight],
			run: (editor) => {
				const position = editor.getPosition();
				const _model = editor.getModel();
				// Enhanced bracket matching selection
				const _brackets = ["()", "[]", "{}", "<>"];
				// This would need more sophisticated implementation
				console.log("Select to bracket at position:", position);
			},
		});

		// Enhanced bracket matching with visual highlighting
		editor.onDidChangeCursorPosition((e) => {
			const position = e.position;
			const model = editor.getModel();
			const lineContent = model.getLineContent(position.lineNumber);
			const charBefore = lineContent.charAt(position.column - 2);
			const charAfter = lineContent.charAt(position.column - 1);

			const bracketPairs = {
				"(": ")",
				"[": "]",
				"{": "}",
				"<": ">",
				")": "(",
				"]": "[",
				"}": "{",
				">": "<",
			};

			// Check if cursor is at a bracket
			if (bracketPairs[charBefore] || bracketPairs[charAfter]) {
				// Find matching bracket (simplified logic)
				const openingBracket = bracketPairs[charAfter] || charBefore;
				const closingBracket = bracketPairs[openingBracket];

				// This would need more sophisticated implementation for actual matching
				console.log(`Found bracket pair: ${openingBracket}${closingBracket}`);

				// Visual highlighting would be handled by Monaco's built-in bracket matching
				// which is already enabled via the 'bracketMatching' option
			}
		});
		if (activeFileId) {
			setOpenFiles(openFiles.map((f) => (f.id === activeFileId ? { ...f, content: value } : f)));
		}
	};

	const renderSidebarItem = (node) => {
		let current = node;
		while (current.parentId) {
			const parent = tree.find((n) => n.id === current.parentId);
			if (!parent?.isOpen) return null;
			current = parent;
		}
		const isFolder = node.type === "folder";
		const statusCol =
			node.gitStatus === "U"
				? "text-[#3fb950]"
				: node.gitStatus === "M"
					? "text-[#d29922]"
					: "text-gray-500";
		return (
			<div
				key={node.id}
				onClick={() => (isFolder ? handleToggleFolder(node.id) : handleSelectFile(node))}
				className={`flex items-center py-0.5 px-2 cursor-pointer text-[13px] group transition-colors ${activeFileId === node.id ? "bg-[#21262d] text-white" : "hover:bg-[#161b22] text-gray-400 hover:text-gray-200"}`}
				style={{ paddingLeft: `${node.level * 12 + 8}px` }}
			>
				<span className="w-4 flex items-center">
					{isFolder && (node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
				</span>
				<span className="mr-2">
					{isFolder ? (
						<Folder size={14} className="text-blue-400 fill-blue-400/10" />
					) : (
						<FileCode size={14} className="text-blue-400" />
					)}
				</span>
				<span
					className={`truncate flex-1 ${node.gitStatus === "M" ? "text-[#d29922]" : node.gitStatus === "U" ? "text-[#3fb950]" : ""}`}
				>
					{node.name}
				</span>
				{node.gitStatus === "dot-green" && (
					<div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] ml-2" />
				)}
				{node.gitStatus === "dot-yellow" && (
					<div className="w-1.5 h-1.5 rounded-full bg-[#d29922] ml-2" />
				)}
				{!isFolder && node.gitStatus && !node.gitStatus.includes("dot") && (
					<span className={`font-bold ml-2 w-4 text-center text-[10px] ${statusCol}`}>
						{node.gitStatus}
					</span>
				)}
			</div>
		);
	};

	const renderSettingsContent = () => {
		switch (activeTab) {
			case "beta":
				return (
					<div className="space-y-6">
						<div className="text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-6">
							Beta
						</div>
						<div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 text-left">
							<div className="flex justify-between items-start">
								<div>
									<div className="text-sm font-semibold text-gray-200">Update Access</div>
									<div className="text-xs text-[#8b949e] mt-1 max-w-md">
										By default, get notifications for stable updates. In Early Access, pre-release
										builds may be unstable.
									</div>
								</div>
								<div className="bg-[#21262d] border border-[#30363d] text-gray-200 text-xs rounded px-3 py-1.5 flex items-center gap-2 cursor-pointer">
									Default <ChevronDown size={12} />
								</div>
							</div>
						</div>
						<div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 space-y-6">
							<SettingRow
								title="Agent Autocomplete"
								description="Contextual suggestions while prompting Agent"
							>
								<Toggle enabled={true} onToggle={() => {}} />
							</SettingRow>
							<SettingRow
								title="Extension RPC Tracer"
								description="Log extension host RPC messages to JSON files viewable in Perfetto."
							>
								<Toggle enabled={false} onToggle={() => {}} />
							</SettingRow>
						</div>
					</div>
				);
			case "agents":
				return (
					<div className="space-y-1 text-left">
						<div className="text-[11px] font-bold text-blue-500 uppercase mb-6 text-left">
							General
						</div>
						<SettingRow title="Default Mode" description="Mode for new agents">
							<div className="bg-[#21262d] border border-[#30363d] text-gray-200 text-xs rounded px-3 py-1.5 flex items-center gap-2">
								Agent <ChevronDown size={12} />
							</div>
						</SettingRow>
						<SettingRow title="Auto-Clear Chat" description="Clear conversation after inactivity">
							<Toggle enabled={true} onToggle={() => {}} />
						</SettingRow>
					</div>
				);
			default:
				return (
					<div className="space-y-1 text-left">
						<div className="text-[11px] font-bold text-blue-500 uppercase mb-6">Account</div>
						<SettingRow title="yorkie@yorkiebrown.uk" description="Ultra Plan">
							<button className="text-xs border border-[#30363d] bg-[#21262d] px-3 py-1.5 rounded hover:bg-[#30363d]">
								Manage
							</button>
						</SettingRow>
						<div className="text-[11px] font-bold text-blue-500 uppercase mt-10 mb-6">
							Preferences
						</div>
						<SettingRow
							title="Sync layouts across windows"
							description="Sync current window layout to other instances"
						>
							<Toggle enabled={true} onToggle={() => {}} />
						</SettingRow>
					</div>
				);
		}
	};

	if (!isCodeEditorOpen) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-8">
				<button
					onClick={() => setIsCodeEditorOpen(true)}
					className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3 text-lg"
				>
					<Code2 size={24} />
					Open Code Editor
				</button>
			</div>
		);
	}

	if (isMinimized) {
		return (
			<div className="fixed bottom-4 left-4 z-[1000]">
				<button
					onClick={() => setIsMinimized(false)}
					className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-2xl shadow-2xl flex items-center gap-2 transition-all duration-300 hover:scale-105"
				>
					<Code2 size={16} />
					Code Editor
				</button>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[500] flex items-center justify-center p-4">
			<div className="w-full max-w-7xl h-full max-h-[95vh] bg-[#0d1117] rounded-3xl overflow-hidden shadow-2xl border border-gray-700/50 flex flex-col">
				{/* Modal Header */}
				<div className="h-16 bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 flex items-center justify-between px-6 flex-shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
							<Code2 size={18} className="text-white" />
						</div>
						<h1 className="text-white font-bold text-lg">Code Editor</h1>
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={() => setIsMinimized(true)}
							className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
						>
							<Minus size={16} className="text-white" />
						</button>
						<button
							onClick={() => setIsCodeEditorOpen(false)}
							className="w-8 h-8 bg-red-500/80 hover:bg-red-500 rounded-lg flex items-center justify-center transition-all duration-200"
						>
							<X size={16} className="text-white" />
						</button>
					</div>
				</div>

				{/* IDE Content Container */}
				<div
					className="flex-1 bg-[#0d1117] text-[#c9d1d9] font-sans selection:bg-blue-500/30 overflow-hidden relative flex flex-col"
					onClick={() => {
						setActiveMenu(null);
						setActivityDropdownOpen(false);
					}}
				>
					{/* Title Bar */}
					<div className="h-9 w-full bg-[#010409] border-b border-[#30363d] flex items-center px-3 select-none flex-shrink-0 z-[100]">
						<div className="flex items-center gap-2 mr-4">
							<div className="w-5 h-5 bg-gradient-to-tr from-blue-600 to-purple-600 rounded flex items-center justify-center shadow-lg">
								<Code2 size={11} className="text-white" />
							</div>
						</div>
						<div className="flex items-center relative">
							{Object.keys(TOP_MENUS).map((menu) => (
								<div key={menu} className="relative">
									<button
										onMouseEnter={() => activeMenu && setActiveMenu(menu)}
										onClick={(e) => {
											e.stopPropagation();
											setActiveMenu(activeMenu === menu ? null : menu);
										}}
										className={`px-2.5 py-1 text-[12px] transition-colors rounded ${activeMenu === menu ? "bg-[#21262d] text-white" : "text-[#8b949e] hover:text-white hover:bg-white/5"}`}
									>
										{menu}
									</button>
									{activeMenu === menu && (
										<DesktopMenuPopup
											items={TOP_MENUS[menu]}
											onClose={() => setActiveMenu(null)}
											onAction={handleMenuAction}
											recentFiles={recentFiles}
											showRecentFilesDropdown={showRecentFilesDropdown && menu === "File"}
											onRecentFileClick={handleRecentFileClick}
											menuName={menu}
											showAppearanceDropdown={showAppearanceDropdown && menu === "View"}
											showPanelDropdown={showPanelDropdown && menu === "View"}
											setShowAppearanceDropdown={setShowAppearanceDropdown}
											setShowPanelDropdown={setShowPanelDropdown}
											showNavigateHistory={showNavigateHistory && menu === "Go"}
											showBookmarks={showBookmarks && menu === "Go"}
											setShowNavigateHistory={setShowNavigateHistory}
											setShowBookmarks={setShowBookmarks}
											bookmarks={bookmarks}
											navigationHistory={navigationHistory}
											handleGoToBookmark={handleGoToBookmark}
										/>
									)}
								</div>
							))}
						</div>
						<div className="flex items-center gap-3 ml-4 text-gray-500">
							<ArrowLeft size={14} className="cursor-pointer hover:text-gray-300" />
							<ArrowRight size={14} className="cursor-pointer hover:text-gray-300" />
						</div>
						<div className="flex-1 flex justify-center text-[12px] text-gray-400 font-medium px-4 overflow-hidden whitespace-nowrap opacity-60 text-center">
							twitter-clone [SSH: jarvis-server] — Nexus Code
						</div>
						<div className="flex items-center gap-4 text-gray-500 mr-2 h-full">
							<div className="flex items-center gap-3 h-full">
								<PanelLeft
									size={15}
									className={`cursor-pointer hover:text-white ${sidebarOpen ? "text-blue-400" : ""}`}
									onClick={(e) => {
										e.stopPropagation();
										setSidebarOpen(!sidebarOpen);
									}}
								/>
								<PanelBottom
									size={15}
									className={`cursor-pointer hover:text-white ${bottomPanelOpen ? "text-blue-400" : ""}`}
									onClick={(e) => {
										e.stopPropagation();
										setBottomPanelOpen(!bottomPanelOpen);
									}}
								/>
								<PanelRight
									size={15}
									className={`cursor-pointer hover:text-white ${aiOpen ? "text-blue-400" : ""}`}
									onClick={(e) => {
										e.stopPropagation();
										setAiOpen(!aiOpen);
									}}
								/>
								<div className="w-px h-4 bg-gray-800 mx-1"></div>
								<Settings
									size={14}
									className="cursor-pointer hover:text-white"
									onClick={(e) => {
										e.stopPropagation();
										setShowSettings(true);
									}}
								/>
							</div>
							<div className="flex items-center gap-0.5 ml-4 border-l border-[#30363d] pl-4 h-full">
								<button className="h-full px-2 hover:bg-white/5 transition-colors">
									<Minus size={14} />
								</button>
								<button className="h-full px-2 hover:bg-white/5 transition-colors">
									<Square size={10} />
								</button>
								<button className="h-full px-3 hover:bg-[#da3633] hover:text-white transition-colors text-white">
									<X size={16} />
								</button>
							</div>
						</div>
					</div>

					<div className="flex flex-1 overflow-hidden">
						{/* Activity Bar */}
						<div className="w-12 flex flex-col items-center py-4 border-r border-[#30363d] bg-[#0d1117] z-30 flex-shrink-0">
							<div className="flex flex-col gap-6">
								<button className="text-blue-500">
									<Folder size={24} />
								</button>
								<button className="text-gray-500 hover:text-white transition-colors">
									<Search size={24} />
								</button>
								<button className="text-gray-500 hover:text-white transition-colors">
									<History size={24} />
								</button>
								<button className="text-gray-500 hover:text-white transition-colors">
									<GitBranch size={24} />
								</button>
							</div>
							<div className="mt-auto flex flex-col gap-6 items-center">
								<button
									onClick={(e) => {
										e.stopPropagation();
										setShowSettings(true);
									}}
									className="text-gray-500 hover:text-white transition-colors"
								>
									<Settings size={24} />
								</button>
								<div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg border border-white/10 select-none">
									Y
								</div>
							</div>
						</div>

						{/* Sidebar */}
						{sidebarOpen && (
							<div className="w-64 flex flex-col border-r border-[#30363d] bg-[#0d1117] z-20">
								{/* Sidebar header switcher as requested in image_6e627d.png */}
								<div className="h-10 px-4 flex items-center justify-between text-[10px] font-bold tracking-widest text-gray-500 uppercase border-b border-[#30363d] bg-[#0d1117] relative">
									<div className="flex items-center gap-3">
										<Search size={14} className="cursor-pointer hover:text-white" />
										<GitBranch size={14} className="cursor-pointer hover:text-white" />
										<Files size={14} className="text-white cursor-pointer" />
										<button
											onClick={(e) => {
												e.stopPropagation();
												setActivityDropdownOpen(!activityDropdownOpen);
											}}
										>
											<ChevronDown size={14} className="cursor-pointer hover:text-white" />
										</button>
									</div>
									{activityDropdownOpen && (
										<div className="absolute top-10 left-4 w-64 bg-[#1c1c1f] border border-[#30363d] shadow-2xl z-[200] py-1 rounded-sm overflow-hidden animate-in fade-in zoom-in duration-100">
											{VIEW_SWITCHER_ITEMS.map((item, i) => (
												<button
													key={i}
													className={`w-full flex items-center px-3 py-2 text-[12px] hover:bg-[#006abc] group transition-colors ${item.active ? "text-white" : "text-[#8b949e]"}`}
												>
													<item.icon size={16} className="mr-3 opacity-80" />
													<span className="flex-1 text-left">{item.label}</span>
													<Pin
														size={12}
														className={`ml-3 ${item.pinned ? "text-blue-400" : "opacity-0 group-hover:opacity-40"}`}
													/>
												</button>
											))}
										</div>
									)}
								</div>
								<div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
									<div className="px-4 py-1 text-[11px] font-bold uppercase text-[#8b949e] flex items-center justify-between hover:bg-white/5 cursor-pointer group mb-1">
										<span>Open Editors</span>
										<ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
									</div>
									<div className="flex flex-col mb-4">
										{openFiles.map((f) => (
											<div
												key={f.id}
												className={`flex items-center px-4 py-1 text-[13px] hover:bg-[#161b22] cursor-pointer ${activeFileId === f.id ? "text-white" : "text-[#8b949e]"}`}
												onClick={() => setActiveFileId(f.id)}
											>
												<FileCode size={12} className="text-[#79c0ff] mr-2" /> {f.name}
											</div>
										))}
									</div>
									<div className="px-4 py-1 text-[11px] font-bold uppercase text-[#8b949e] flex items-center gap-2 border-t border-gray-800 pt-2 mb-1">
										<ChevronDown size={14} /> <span>Twitter-Clone</span>
									</div>
									{tree.map((node) => renderSidebarItem(node))}
								</div>
							</div>
						)}

						{/* Editor Area */}
						<div className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">
							{/* Tabs */}
							<div className="h-10 flex items-center bg-[#010409] border-b border-[#30363d] overflow-x-auto no-scrollbar flex-shrink-0">
								{openFiles.map((file) => (
									<div
										key={file.id}
										onClick={() => setActiveFileId(file.id)}
										className={`flex items-center h-full px-4 text-[12px] cursor-pointer border-r border-[#30363d] min-w-[180px] group transition-all ${activeFileId === file.id ? "bg-[#0d1117] text-white border-t-2 border-t-[#f78166]" : "text-gray-500 hover:bg-[#161b22]"}`}
									>
										<FileCode size={12} className="text-blue-400 mr-2 flex-shrink-0" />
										<span
											className={`truncate flex-1 ${file.gitStatus === "U" ? "text-[#3fb950]" : file.gitStatus === "M" ? "text-[#d29922]" : ""}`}
										>
											{file.name}
										</span>
										<span className="text-[10px] mx-2 opacity-60 font-bold">{file.gitStatus}</span>
										<button
											onClick={(e) => {
												e.stopPropagation();
												setOpenFiles(openFiles.filter((f) => f.id !== file.id));
											}}
											className="ml-1 hover:bg-[#30363d] rounded p-0.5 opacity-0 group-hover:opacity-100 transition-all"
										>
											<X size={12} />
										</button>
									</div>
								))}
							</div>

							{/* Breadcrumbs */}
							<div className="h-8 flex items-center px-4 bg-[#0d1117] text-[11px] text-[#8b949e] border-b border-[#30363d]/50 select-none flex-shrink-0">
								<span className="hover:text-gray-300 cursor-pointer">
									{activeFile.path || "root"}
								</span>
								<ChevronRight size={10} className="mx-2 opacity-30" />
								<span className="text-[#e6edf3] flex items-center gap-1.5 font-medium">
									<FileCode size={12} className="text-blue-400" /> {activeFile.name}
								</span>
								<div className="ml-auto">
									<button className="bg-[#21262d] px-2 py-0.5 rounded border border-[#30363d] text-[10px] text-gray-200 hover:bg-[#30363d]">
										Review Next File
									</button>
								</div>
							</div>

							{/* Monaco Code Editor */}
							<div className="flex-1 bg-[#0d1117] relative">
								<Editor
									height="100%"
									language={language}
									value={activeFile.content || ""}
									theme={editorTheme}
									onChange={handleEditorChange}
									onMount={handleEditorDidMount}
									options={{
										fontSize: fontSize,
										wordWrap: wordWrap,
										minimap: { enabled: minimap },
										lineNumbers: lineNumbers,
										folding: codeFolding,
										bracketMatching: bracketMatching,
										suggestOnTriggerCharacters: suggestions,
										quickSuggestions: suggestions,
										parameterHints: { enabled: suggestions },
										autoClosingBrackets: "always",
										autoClosingQuotes: "always",
										formatOnPaste: true,
										formatOnType: true,
										tabSize: 2,
										insertSpaces: true,
										scrollBeyondLastLine: false,
										automaticLayout: true,
										renderLineHighlight: "line",
										renderWhitespace: showWhitespace ? "all" : "none",
										cursorBlinking: "smooth",
										cursorSmoothCaretAnimation: "on",
										mouseWheelZoom: true,
										multiCursorModifier: "ctrlCmd",
										contextmenu: true,
										quickSuggestionsDelay: 100,
										hover: { enabled: true },
										glyphMargin: true,
										foldingStrategy: "indentation",
										showFoldingControls: "always",
										smoothScrolling: true,
										cursorStyle: "line",
										fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
										fontLigatures: true,
										fontVariations: false,
									}}
								/>
							</div>

							<div className="h-6 bg-[#007acc] flex items-center justify-between px-3 text-[10px] text-white font-medium select-none z-10 flex-shrink-0">
								<div className="flex gap-4">
									<span>master*</span>
									<span>0 errors</span>
								</div>
								<div className="flex gap-4">
									<span
										onClick={() => setAiOpen(!aiOpen)}
										className="cursor-pointer hover:bg-white/10 px-1 rounded uppercase flex items-center gap-1 font-bold"
									>
										<Bot size={10} /> AI Assistant
									</span>
									{isMultiCursorMode && (
										<span className="bg-[#58a6ff] text-white px-2 py-0.5 rounded text-[10px] font-medium">
											Multi-Cursor ({cursors.length})
										</span>
									)}
									<span>UTF-8</span>
									<span>TypeScript JSX</span>
								</div>
							</div>

							<BottomPanel isOpen={bottomPanelOpen} onClose={() => setBottomPanelOpen(false)} />
						</div>

						{/* AI Panel */}
						{aiOpen && (
							<div className="w-[450px] flex flex-col border-l border-[#30363d] bg-[#0d1117] z-20">
								<div className="h-10 border-b border-[#30363d] flex items-center justify-between px-4 bg-[#010409]">
									<div className="flex items-center gap-4 text-[11px] font-bold text-[#8b949e] uppercase tracking-widest">
										<button className="text-white border-b border-white h-10">Chat</button>
										<button className="hover:text-white transition-colors">Composer</button>
									</div>
									<div className="flex items-center gap-3 text-gray-500">
										<RefreshCcw size={14} className="cursor-pointer hover:text-white" />
										<X
											size={16}
											className="cursor-pointer hover:text-white"
											onClick={() => setAiOpen(false)}
										/>
									</div>
								</div>
								<div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0d1117]">
									<div className="p-3 rounded-lg bg-[#161b22] border border-[#30363d] text-[13px] leading-relaxed text-[#e6edf3] text-left">
										Hello! I'm your Nexus assistant. Working on{" "}
										<span className="text-[#58a6ff] font-bold">{activeFileId}</span>. How can I
										help?
									</div>
								</div>
								<div className="p-4 border-t border-[#30363d] space-y-3 bg-[#0d1117]">
									<div className="relative group">
										<textarea
											className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 pt-4 text-xs text-white resize-none h-32 outline-none focus:border-[#58a6ff] transition-colors shadow-inner"
											placeholder="Plan, @ for context, / for commands"
											value={userInput}
											onChange={(e) => setUserInput(e.target.value)}
										/>
										<div className="absolute bottom-3 left-3 flex items-center gap-2">
											<div className="relative">
												<button
													onClick={(e) => {
														e.stopPropagation();
														setShowAiModeDropdown(!showAiModeDropdown);
													}}
													className="bg-[#21262d] border border-[#30363d] rounded px-2 py-1 text-[11px] text-gray-300 flex items-center gap-1.5 hover:bg-[#30363d] transition-colors"
												>
													{aiMode === "Agent" ? (
														<InfinityIcon size={12} className="text-[#8b949e]" />
													) : aiMode === "Plan" ? (
														<Layers size={12} />
													) : aiMode === "Debug" ? (
														<Bug size={12} />
													) : (
														<MessageSquare size={12} />
													)}
													{aiMode} <ChevronDown size={10} />
												</button>
												{showAiModeDropdown && (
													<div className="absolute bottom-full left-0 mb-1 w-32 bg-[#161b22] border border-[#30363d] rounded shadow-2xl z-[200] overflow-hidden animate-in slide-in-from-bottom-1 duration-150">
														{[
															{
																name: "Agent",
																icon: <InfinityIcon size={12} />,
															},
															{ name: "Plan", icon: <Layers size={12} /> },
															{ name: "Debug", icon: <Bug size={12} /> },
															{
																name: "Ask",
																icon: <MessageSquare size={12} />,
															},
														].map((mode) => (
															<button
																key={mode.name}
																onClick={() => {
																	setAiMode(mode.name);
																	setShowAiModeDropdown(false);
																}}
																className="w-full text-left px-3 py-2 text-[11px] hover:bg-blue-600 hover:text-white flex items-center justify-between transition-colors text-gray-200 group-hover:text-white"
															>
																<span className="flex items-center gap-2">
																	{mode.icon} {mode.name}
																</span>
																{mode.name === aiMode && (
																	<Check size={14} className="text-[#58a6ff]" />
																)}
															</button>
														))}
													</div>
												)}
											</div>
											<div className="text-[11px] text-[#8b949e] bg-[#21262d] px-1.5 py-0.5 rounded border border-[#30363d]">
												Composer 1 <ChevronDown size={10} className="inline opacity-50" />
											</div>
											<div className="text-[11px] text-[#8b949e]">1x</div>
										</div>
										<div className="absolute bottom-3 right-3 flex items-center gap-3 text-[#8b949e]">
											<Globe size={14} className="hover:text-[#58a6ff] cursor-pointer" />
											<ImageIcon size={14} className="hover:text-[#58a6ff] cursor-pointer" />
											<Mic size={14} className="hover:text-[#58a6ff] cursor-pointer" />
										</div>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Settings Modal */}
					{showSettings && (
						<div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-12 animate-in fade-in duration-150">
							<div className="bg-[#0d1117] w-full max-w-6xl h-full rounded-2xl flex border border-[#30363d] shadow-2xl overflow-hidden text-[#c9d1d9]">
								<div className="w-72 bg-[#010409] border-r border-[#30363d] p-8 flex flex-col">
									<div className="flex items-center gap-4 mb-10 text-white">
										<div className="w-10 h-10 rounded-full bg-[#21262d] flex items-center justify-center text-xs border border-[#30363d] shadow-inner font-bold text-[#8b949e]">
											Y
										</div>
										<div className="overflow-hidden text-left">
											<div className="text-sm font-bold truncate">yorkie@yorkiebrown.uk</div>
											<div className="text-[10px] text-[#8b949e] uppercase tracking-widest font-bold">
												Ultra Plan
											</div>
										</div>
									</div>
									<div className="flex-1 overflow-y-auto space-y-0.5 custom-scrollbar pr-2">
										{SETTINGS_TABS.map((tab, i) =>
											tab.type === "divider" ? (
												<div key={i} className="h-px bg-[#30363d] my-4 mx-2" />
											) : tab.type === "spacer" ? (
												<div key={i} className="flex-1" />
											) : (
												<button
													key={tab.id || i}
													onClick={() => tab.id && setActiveTab(tab.id)}
													className={`w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all text-left ${activeTab === tab.id ? "bg-[#21262d] text-white shadow-sm" : "text-[#8b949e] hover:text-[#c9d1d9] hover:bg-white/5"}`}
												>
													{tab.label}
												</button>
											),
										)}
									</div>
								</div>
								<div className="flex-1 flex flex-col bg-[#0d1117]">
									<div className="p-6 flex justify-end">
										<button onClick={() => setShowSettings(false)}>
											<X size={28} className="text-[#8b949e] hover:text-white transition-colors" />
										</button>
									</div>
									<div className="flex-1 overflow-y-auto px-20 pb-32 max-w-4xl mx-auto w-full custom-scrollbar">
										{renderSettingsContent()}
									</div>
								</div>
							</div>
						</div>
					)}

					<FindReplaceDialog
						isOpen={showFindReplace}
						onClose={() => setShowFindReplace(false)}
						findText={findText}
						replaceText={replaceText}
						onFindChange={setFindText}
						onReplaceChange={setReplaceText}
						onFind={handleFind}
						onReplace={handleReplace}
						onReplaceAll={handleReplaceAll}
						matchCase={matchCase}
						matchWholeWord={matchWholeWord}
						useRegex={useRegex}
						onMatchCaseChange={setMatchCase}
						onMatchWholeWordChange={setMatchWholeWord}
						onUseRegexChange={setUseRegex}
					/>

					{/* Global CSS */}
					<style
						dangerouslySetInnerHTML={{
							__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #30363d; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #484f58; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
              `,
						}}
					/>
				</div>
			</div>
		</div>
	);
}

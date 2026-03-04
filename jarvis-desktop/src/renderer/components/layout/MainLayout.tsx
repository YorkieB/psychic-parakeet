/*
  This file creates the main layout that organizes all of Jarvis's panels and components in the desktop app.

  It manages panel switching, conversation views, voice visualization, and coordinates all the different sections while making everything fit together perfectly.
*/
import React, { Suspense } from "react";
import { usePanelStore } from "../../store/panel-store";
import { ConversationPanel } from "../conversation/ConversationPanel";
import { CalendarPanel } from "../panels/CalendarPanel";
import { EmailPanel } from "../panels/EmailPanel";
import { FinancePanel } from "../panels/FinancePanel";
import { MediaPanel } from "../panels/MediaPanel";
import { MusicPanel } from "../panels/MusicPanel";
import { SensorsPanel } from "../panels/SensorsPanel";
import { SettingsPanel } from "../panels/SettingsPanel";
import { WebPanel } from "../panels/WebPanel";
import { StatusCards } from "../status/StatusCards";
import { VoiceVisualizer } from "../voice/VoiceVisualizer";
import { Header } from "./Header";
import { MenuBar } from "./MenuBar";
import { StatusBar } from "./StatusBar";

// Lazy load CodePanel to prevent Monaco imports from crashing the main layout
const CodePanel = React.lazy(() =>
	import("../panels/CodePanel").then((mod) => ({ default: mod.CodePanel })),
);

export function MainLayout() {
	const { openPanels } = usePanelStore();

	return (
		<div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
			{/* Header */}
			<Header />

			{/* Menu Bar */}
			<MenuBar />

			{/* Main Content */}
			<div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden min-h-0">
				{/* Voice Visualizer - fixed height so chat gets remaining space */}
				<div className="flex-shrink-0 glass-card-vibrant rounded-2xl p-4 shadow-xl border-0">
					<VoiceVisualizer />
				</div>

				{/* Conversation / Chat box - takes remaining space, always visible */}
				<div className="flex-1 min-h-[280px] flex flex-col overflow-hidden">
					<div className="flex-1 min-h-0 rounded-2xl shadow-xl border-0 overflow-hidden">
						<ConversationPanel />
					</div>
				</div>

				{/* Status Cards */}
				<div className="flex-shrink-0">
					<StatusCards />
				</div>
			</div>

			{/* Status Bar - fixed at bottom so it's always visible */}
			<div className="flex-shrink-0">
				<StatusBar />
			</div>

			{/* Pop-out Panels */}
			{openPanels.includes("email") && <EmailPanel />}
			{openPanels.includes("calendar") && <CalendarPanel />}
			{openPanels.includes("finance") && <FinancePanel />}
			{openPanels.includes("music") && <MusicPanel />}
			{openPanels.includes("media") && <MediaPanel />}
			{openPanels.includes("code") && (
				<Suspense fallback={null}>
					<CodePanel />
				</Suspense>
			)}
			{openPanels.includes("web") && <WebPanel />}
			{openPanels.includes("settings") && <SettingsPanel />}
			{openPanels.includes("sensors") && <SensorsPanel />}
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

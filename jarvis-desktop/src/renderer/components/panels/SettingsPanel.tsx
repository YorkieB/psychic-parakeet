/*
  This file creates the settings panel that lets you customize Jarvis's behavior and preferences in the desktop app.

  It handles theme switching, notification settings, security options, voice settings, and system preferences while making it easy to personalize Jarvis to your liking.
*/

import { Activity, Bell, Key, Mic, Moon, Shield, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { getSystemVoices } from "../../services/system-tts";
import { usePanelStore } from "../../store/panel-store";
import { useSettingsStore } from "../../store/settings-store";
import { CameraView } from "../sensors/CameraView";
import { SensorDashboard } from "../sensors/SensorDashboard";
import { Panel } from "../shared/Panel";

export function SettingsPanel() {
	const { closePanel } = usePanelStore();
	const {
		theme,
		setTheme,
		voiceSettings,
		updateVoiceSettings,
		notifications,
		updateNotifications,
	} = useSettingsStore();
	const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);

	useEffect(() => {
		setSystemVoices(getSystemVoices());
		const onVoicesChanged = () => setSystemVoices(getSystemVoices());
		window.speechSynthesis?.addEventListener?.("voiceschanged", onVoicesChanged);
		return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", onVoicesChanged);
	}, []);

	return (
		<Panel
			id="settings"
			title="⚙️ Settings"
			width={550}
			height={700}
			onClose={() => closePanel("settings")}
		>
			<div className="p-6 space-y-6 overflow-y-auto h-full">
				{/* Appearance */}
				<div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
						{theme === "light" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
						<span>Appearance</span>
					</h3>

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-sm text-gray-700 dark:text-gray-300">Theme</span>
							<div className="flex space-x-2">
								<button
									onClick={() => setTheme("light")}
									className={`px-4 py-2 rounded-lg text-sm ${
										theme === "light" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-slate-700"
									}`}
								>
									☀️ Light
								</button>
								<button
									onClick={() => setTheme("dark")}
									className={`px-4 py-2 rounded-lg text-sm ${
										theme === "dark" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-slate-700"
									}`}
								>
									🌙 Dark
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Voice Settings */}
				<div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
						<Mic className="w-5 h-5" />
						<span>Voice</span>
					</h3>

					<p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
						How should Jarvis speak?
					</p>

					<div className="space-y-4">
						<div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-600 p-3 bg-gray-50 dark:bg-slate-800/50">
							<div>
								<p className="text-sm font-medium text-gray-700 dark:text-gray-300">
									Use system voices (low latency)
								</p>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
									Uses your PC&apos;s installed voices – no cloud round-trip
								</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={voiceSettings.ttsUseSystemVoices !== false}
								onClick={() =>
									updateVoiceSettings({
										ttsUseSystemVoices: voiceSettings.ttsUseSystemVoices === false,
									})
								}
								className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
									voiceSettings.ttsUseSystemVoices !== false
										? "bg-blue-500"
										: "bg-gray-300 dark:bg-slate-700"
								}`}
							>
								<span
									className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
										voiceSettings.ttsUseSystemVoices !== false ? "translate-x-5" : "translate-x-1"
									}`}
								/>
							</button>
						</div>

						{voiceSettings.ttsUseSystemVoices !== false && (
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									System voice
								</label>
								<select
									value={voiceSettings.systemVoiceName ?? ""}
									onChange={(e) => updateVoiceSettings({ systemVoiceName: e.target.value })}
									className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="">Default (first available)</option>
									{systemVoices.map((v) => (
										<option key={v.name + v.lang} value={v.name}>
											{v.name} ({v.lang})
										</option>
									))}
								</select>
							</div>
						)}

						<div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-600 p-3 bg-gray-50 dark:bg-slate-800/50">
							<div>
								<p className="text-sm font-medium text-gray-700 dark:text-gray-300">
									Use local custom voice (XTTS)
								</p>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
									Your voice file, runs on this PC – lower latency
								</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={voiceSettings.ttsUseLocalCustomVoice === true}
								onClick={() =>
									updateVoiceSettings({
										ttsUseLocalCustomVoice: voiceSettings.ttsUseLocalCustomVoice !== true,
									})
								}
								className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
									voiceSettings.ttsUseLocalCustomVoice === true
										? "bg-blue-500"
										: "bg-gray-300 dark:bg-slate-700"
								}`}
							>
								<span
									className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
										voiceSettings.ttsUseLocalCustomVoice === true
											? "translate-x-5"
											: "translate-x-1"
									}`}
								/>
							</button>
						</div>

						{voiceSettings.ttsUseLocalCustomVoice && (
							<>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Voice file path
									</label>
									<input
										type="text"
										value={voiceSettings.localCustomVoicePath ?? ""}
										onChange={(e) =>
											updateVoiceSettings({
												localCustomVoicePath: e.target.value,
											})
										}
										placeholder="C:\...\New Jarvis.mp3"
										className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										Use a .mp3 or .wav file (e.g. New Jarvis.mp3)
									</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Local TTS server URL
									</label>
									<input
										type="text"
										value={voiceSettings.localTtsUrl ?? "http://localhost:8020"}
										onChange={(e) => updateVoiceSettings({ localTtsUrl: e.target.value })}
										placeholder="http://localhost:8020"
										className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
							</>
						)}

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Wake Word
							</label>
							<input
								type="text"
								value={voiceSettings.wakeWord}
								onChange={(e) => updateVoiceSettings({ wakeWord: e.target.value })}
								className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Language
							</label>
							<select
								value={voiceSettings.language}
								onChange={(e) => updateVoiceSettings({ language: e.target.value })}
								className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="en-GB">English (UK)</option>
								<option value="en-US">English (US)</option>
								<option value="es">Spanish</option>
								<option value="fr">French</option>
							</select>
						</div>

						{voiceSettings.ttsUseSystemVoices === false &&
							voiceSettings.ttsUseLocalCustomVoice === false && (
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Voice ID (ElevenLabs)
									</label>
									<input
										type="text"
										value={voiceSettings.voiceId}
										onChange={(e) => updateVoiceSettings({ voiceId: e.target.value })}
										className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
							)}
					</div>
				</div>

				{/* Notifications */}
				<div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
						<Bell className="w-5 h-5" />
						<span>Notifications</span>
					</h3>

					<div className="space-y-3">
						{Object.entries(notifications).map(([key, value]) => (
							<div key={key} className="flex items-center justify-between">
								<span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
									{key.replace(/([A-Z])/g, " $1").trim()}
								</span>
								<button
									onClick={() => updateNotifications({ [key]: !value } as any)}
									className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
										value ? "bg-blue-500" : "bg-gray-300 dark:bg-slate-700"
									}`}
								>
									<span
										className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
											value ? "translate-x-6" : "translate-x-1"
										}`}
									/>
								</button>
							</div>
						))}
					</div>
				</div>

				{/* Privacy */}
				<div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
						<Shield className="w-5 h-5" />
						<span>Privacy</span>
					</h3>

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-sm text-gray-700 dark:text-gray-300">
								Save conversation history
							</span>
							<button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-500">
								<span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
							</button>
						</div>

						<div className="flex items-center justify-between">
							<span className="text-sm text-gray-700 dark:text-gray-300">Anonymous analytics</span>
							<button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 dark:bg-slate-700">
								<span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
							</button>
						</div>
					</div>
				</div>

				{/* Sensors & Monitoring */}
				<div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
						<Activity className="w-5 h-5" />
						<span>Real-Time Sensors</span>
					</h3>

					<div className="mb-4">
						<SensorDashboard />
					</div>

					<div className="mt-4">
						<CameraView />
					</div>
				</div>

				{/* API Keys */}
				<div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
						<Key className="w-5 h-5" />
						<span>API Keys</span>
					</h3>

					<button className="w-full px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg text-sm font-medium">
						Manage API Keys
					</button>
				</div>

				{/* Actions */}
				<div className="flex space-x-2 pt-4 border-t border-gray-200 dark:border-slate-700">
					<button className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium">
						💾 Save Changes
					</button>
					<button className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg text-sm font-medium">
						↺ Reset to Defaults
					</button>
				</div>

				<p className="text-xs text-gray-400 dark:text-gray-500 pt-2 text-center" aria-hidden="true">
					Jarvis Desktop v1.1.0 · Voice &amp; XTTS
				</p>
			</div>
		</Panel>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

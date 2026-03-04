import { create } from "zustand";

interface VoiceSettings {
	wakeWord: string;
	language: string;
	voiceId: string;
	/** Use PC's installed voices (low latency). If false, uses local XTTS or cloud when wired. */
	ttsUseSystemVoices: boolean;
	/** Selected system voice name from speechSynthesis.getVoices() */
	systemVoiceName: string;
	/** Use local Coqui XTTS with your own voice file (low latency, runs on this PC). */
	ttsUseLocalCustomVoice: boolean;
	/** Path to your voice sample for local XTTS (e.g. New Jarvis.mp3). */
	localCustomVoicePath: string;
	/** Local TTS server URL (default http://localhost:8020). */
	localTtsUrl: string;
}

interface NotificationSettings {
	emailAlerts: boolean;
	calendarReminders: boolean;
	budgetWarnings: boolean;
	generationComplete: boolean;
}

interface SettingsStore {
	theme: "light" | "dark";
	voiceSettings: VoiceSettings;
	notifications: NotificationSettings;
	setTheme: (theme: "light" | "dark") => void;
	updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
	updateNotifications: (settings: Partial<NotificationSettings>) => void;
}

// Default voice settings (so we can merge with old saved data)
const defaultVoiceSettings: VoiceSettings = {
	wakeWord: "Jarvis",
	language: "en-GB",
	voiceId: "D4b9MCBz2LeyvNPigvDx",
	ttsUseSystemVoices: true,
	systemVoiceName: "",
	ttsUseLocalCustomVoice: false,
	localCustomVoicePath: "C:\\Users\\conta\\OneDrive\\Voice Library\\Male\\New Jarvis.mp3",
	localTtsUrl: "http://localhost:8020",
};

// Simple localStorage persistence; merge with defaults so new options appear after app updates
const loadSettings = (): Partial<SettingsStore> => {
	try {
		const stored = localStorage.getItem("jarvis-settings");
		if (!stored) return {};
		const loaded = JSON.parse(stored) as Record<string, unknown>;
		return {
			...loaded,
			voiceSettings: {
				...defaultVoiceSettings,
				...((loaded.voiceSettings as object) || {}),
			},
			notifications: {
				emailAlerts: true,
				calendarReminders: true,
				budgetWarnings: true,
				generationComplete: true,
				...((loaded.notifications as object) || {}),
			},
		};
	} catch {
		return {};
	}
};

const saveSettings = (settings: Partial<SettingsStore>) => {
	try {
		localStorage.setItem("jarvis-settings", JSON.stringify(settings));
	} catch {
		// Ignore storage errors
	}
};

const defaultSettings: SettingsStore = {
	theme: "light",
	voiceSettings: defaultVoiceSettings,
	notifications: {
		emailAlerts: true,
		calendarReminders: true,
		budgetWarnings: true,
		generationComplete: true,
	},
	setTheme: () => {},
	updateVoiceSettings: () => {},
	updateNotifications: () => {},
};

const loadedSettings = loadSettings();

export const useSettingsStore = create<SettingsStore>((set, get) => ({
	...defaultSettings,
	...loadedSettings,

	setTheme: (theme) => {
		set({ theme });
		const current = get();
		saveSettings({ ...current, theme });
	},

	updateVoiceSettings: (settings) => {
		set((state) => ({
			voiceSettings: { ...state.voiceSettings, ...settings },
		}));
		const current = get();
		saveSettings(current);
	},

	updateNotifications: (settings) => {
		set((state) => ({
			notifications: { ...state.notifications, ...settings },
		}));
		const current = get();
		saveSettings(current);
	},
}));

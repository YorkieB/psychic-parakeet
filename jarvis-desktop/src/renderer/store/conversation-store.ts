import { create } from "zustand";
import { audioService } from "../services/audio-service";

// Store reference to speech timeout for cleanup
let speechTimeoutId: NodeJS.Timeout | null = null;

/**
 * Local fallback responses when the backend is not running.
 * Jarvis can still hold a basic conversation without the server.
 */
function getLocalFallbackReply(input: string): string {
	const lower = input.toLowerCase().trim();

	// Greetings
	if (/^(hi|hello|hey|yo|sup|good\s*(morning|afternoon|evening))/.test(lower)) {
		return "Hello! I'm Jarvis, your AI assistant. The backend server isn't running right now, but I can still chat with you. How can I help?";
	}

	// How are you
	if (/how\s+are\s+you|how('?s|\s+is)\s+it\s+going/.test(lower)) {
		return "I'm running well, thank you for asking! The backend is currently offline, but my core systems are operational.";
	}

	// What can you do
	if (/what\s+can\s+you\s+do|help|capabilities|features/.test(lower)) {
		return "I can help with many things! When the backend is running I can manage emails, calendar, finances, play music, browse the web, write code, and much more. Right now I'm in offline mode — start the backend with `npm run dev` in the root project folder to unlock all features.";
	}

	// Time / date
	if (/what\s+time|current\s+time/.test(lower)) {
		return `The current time is ${new Date().toLocaleTimeString()}.`;
	}
	if (/what('?s| is)\s+(the\s+)?date|today('?s)?\s+date/.test(lower)) {
		return `Today's date is ${new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;
	}

	// Who are you / name
	if (/who\s+are\s+you|what('?s| is)\s+your\s+name|your\s+name/.test(lower)) {
		return "I'm Jarvis — your personal AI assistant built by Yorkie. I'm designed to help you manage your digital life.";
	}

	// Thank you
	if (/thanks|thank\s+you|cheers|ta/.test(lower)) {
		return "You're welcome! Let me know if there's anything else I can help with.";
	}

	// Goodbye
	if (/bye|goodbye|see\s+you|later|good\s*night/.test(lower)) {
		return "Goodbye! I'll be here whenever you need me.";
	}

	// Backend / server questions
	if (/backend|server|port\s+3000|start.*server|not\s+connect/.test(lower)) {
		return "The Jarvis backend server runs on port 3000. To start it, open a terminal in your Jarvis Orchestrator folder and run: `npm run dev`. Once it's running, I'll have full access to all my agents and capabilities.";
	}

	// Default
	return "I hear you! The backend server isn't running right now so my responses are limited. Start the backend (`npm run dev` in the project root) and I'll be able to give you full AI-powered answers. In the meantime, feel free to ask me the time, date, or what I can do!";
}

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
	attachments?: any[];
}

interface ConversationStore {
	messages: Message[];
	isTyping: boolean;
	connectionError: boolean;
	initialize: () => void;
	sendMessage: (content: string) => Promise<void>;
	addMessage: (message: Message) => void;
	clearMessages: () => void;
	dismissConnectionError: () => void;
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
	messages: [],
	isTyping: false,
	connectionError: false,

	initialize: () => {
		// Load saved messages from localStorage
		try {
			const saved = localStorage.getItem("jarvis_conversation");
			if (saved) {
				const parsed = JSON.parse(saved);
				// Convert timestamp strings back to Date objects
				const messages = parsed.map((msg: any) => ({
					...msg,
					timestamp: new Date(msg.timestamp),
				}));
				// Only set messages if we have valid messages
				if (messages && messages.length > 0) {
					set({ messages });
				} else {
					// If parsed but empty, show welcome message
					const welcomeMessage: Message = {
						id: "welcome",
						role: "assistant",
						content: "Hello! I'm Jarvis, your AI assistant. How can I help you today?",
						timestamp: new Date(),
					};
					set({ messages: [welcomeMessage] });

					// Trigger KITT scanner for welcome message
					setTimeout(() => {
						audioService.notifySpeechStart();
						setTimeout(() => audioService.notifySpeechEnd(), 3000);
					}, 500);
				}
			} else {
				// Add welcome message
				const welcomeMessage: Message = {
					id: "welcome",
					role: "assistant",
					content: "Hello! I'm Jarvis, your AI assistant. How can I help you today?",
					timestamp: new Date(),
				};
				set({ messages: [welcomeMessage] });

				// Trigger KITT scanner for welcome message
				setTimeout(() => {
					audioService.notifySpeechStart();
					setTimeout(() => audioService.notifySpeechEnd(), 3000);
				}, 500);
			}
		} catch (error) {
			console.error("Failed to load conversation:", error);
			// Even on error, show welcome message
			const welcomeMessage: Message = {
				id: "welcome",
				role: "assistant",
				content: "Hello! I'm Jarvis, your AI assistant. How can I help you today?",
				timestamp: new Date(),
			};
			set({ messages: [welcomeMessage] });

			// Trigger KITT scanner for welcome message
			setTimeout(() => {
				audioService.notifySpeechStart();
				setTimeout(() => audioService.notifySpeechEnd(), 3000);
			}, 500);
		}
	},

	sendMessage: async (content: string) => {
		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content,
			timestamp: new Date(),
		};

		// Add user message
		set((state) => ({
			messages: [...state.messages, userMessage],
			isTyping: true,
		}));

		try {
			set({ connectionError: false });
			const api = typeof window !== "undefined" && (window as any).jarvisAPI;
			// Send to backend (use local fallback when not in Electron)
			const response = api?.sendMessage
				? await Promise.race([
						api.sendMessage(content),
						new Promise((_, reject) => {
							setTimeout(
								() => reject(new Error("Chat request timed out. Please try again.")),
								35000,
							);
						}),
					])
				: null;

			const replyText =
				(response && (response?.text || response?.message || response?.response || "").trim()) ||
				"";

			// Detect when backend returned an LLM failure wrapped as a "success"
			const isLLMFailure =
				!replyText ||
				replyText.startsWith("Sorry, I couldn't generate a response") ||
				replyText.includes("fetch failed") ||
				replyText.includes("LLM not configured") ||
				replyText.includes("Using mock responses");

			const finalText = isLLMFailure ? getLocalFallbackReply(content) : replyText;
			const assistantMessage: Message = {
				id: (Date.now() + 1).toString(),
				role: "assistant",
				content: finalText,
				timestamp: new Date(),
				attachments: response?.attachments,
			};

			set((state) => ({
				messages: [...state.messages, assistantMessage],
				isTyping: false,
			}));

			// 🚗 JARVIS VOICE with KITT SCANNER
			console.log("[JARVIS VOICE] Response received:", {
				text: `${finalText.substring(0, 50)}...`,
			});

			// Clear any existing speech timeout
			if (speechTimeoutId) {
				clearTimeout(speechTimeoutId);
				speechTimeoutId = null;
			}

			// ALWAYS START KITT SCANNER
			console.log("[KITT] ✅ Starting scanner...");
			audioService.notifySpeechStart();

			// Function to stop scanner
			const stopScanner = () => {
				console.log("[KITT] ✅ Stopping scanner...");
				if (speechTimeoutId) {
					clearTimeout(speechTimeoutId);
					speechTimeoutId = null;
				}
				audioService.notifySpeechEnd();
			};

			// USE CUSTOM VOICE via local XTTS TTS server (through IPC)
			console.log("[JARVIS VOICE] 🎤 Requesting TTS for reply text...");

			try {
				const ttsApi = typeof window !== "undefined" && (window as any).jarvisAPI;
				const ttsResult = ttsApi?.tts
					? await ttsApi.tts(finalText)
					: { success: false, error: "TTS not available in browser" };

				if (!ttsResult.success || !ttsResult.audio) {
					console.error("[JARVIS VOICE] ❌ TTS failed:", ttsResult.error);
					stopScanner();
				} else {
					const audioSrc = `data:audio/wav;base64,${ttsResult.audio}`;
					const audio = new Audio(audioSrc);
					audio.volume = 1.0;

					audio.onloadeddata = () => {
						console.log("[JARVIS VOICE] ✅ TTS audio loaded, duration:", audio.duration, "seconds");
					};

					audio.onplay = () => {
						console.log("[JARVIS VOICE] ✅ TTS audio playing!");
					};

					audio.onended = () => {
						console.log("[JARVIS VOICE] ✅ TTS audio finished");
						stopScanner();
					};

					audio.onerror = () => {
						console.error("[JARVIS VOICE] ❌ TTS audio playback error");
						stopScanner();
					};

					audio.play().catch((err) => {
						console.error("[JARVIS VOICE] ❌ Failed to play TTS audio:", err);
						stopScanner();
					});

					// Safety timeout
					speechTimeoutId = setTimeout(() => {
						console.log("[JARVIS VOICE] ⚠️ Safety timeout");
						stopScanner();
					}, 60000);
				}
			} catch (error) {
				console.error("[JARVIS VOICE] ❌ TTS request failed:", error);
				stopScanner();
			}

			// Save to localStorage
			try {
				localStorage.setItem("jarvis_conversation", JSON.stringify(get().messages));
			} catch (error) {
				console.error("Failed to save conversation:", error);
			}
		} catch (error: any) {
			console.error("Failed to send message:", error);
			const errorMsg = error?.message || "Unknown error";
			const isBackendOffline =
				errorMsg.includes("ECONNREFUSED") ||
				errorMsg.includes("ENOTFOUND") ||
				errorMsg.includes("Network Error") ||
				errorMsg.includes("fetch") ||
				errorMsg.includes("timed out");

			if (isBackendOffline) set({ connectionError: true });

			// Use local fallback when backend is unreachable so Jarvis still replies
			const fallbackText = isBackendOffline
				? getLocalFallbackReply(content)
				: `Sorry, something went wrong: ${errorMsg}. Please try again.`;

			const fallbackMessage: Message = {
				id: (Date.now() + 2).toString(),
				role: "assistant",
				content: fallbackText,
				timestamp: new Date(),
			};
			set((state) => ({
				messages: [...state.messages, fallbackMessage],
				isTyping: false,
			}));

			// Save conversation even for fallback replies
			try {
				localStorage.setItem("jarvis_conversation", JSON.stringify(get().messages));
			} catch (_) {
				/* ignore */
			}
		}
	},

	addMessage: (message: Message) => {
		set((state) => ({
			messages: [...state.messages, message],
		}));
	},

	clearMessages: () => {
		set({ messages: [], connectionError: false });
		localStorage.removeItem("jarvis_conversation");
	},

	dismissConnectionError: () => set({ connectionError: false }),
}));

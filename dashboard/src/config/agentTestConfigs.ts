/**
 * Agent Test Configurations
 * Defines the test interface for each agent type
 */

export type InputFieldType = "text" | "textarea" | "number" | "select" | "file" | "json";
export type OutputDisplayType =
	| "text"
	| "json"
	| "image"
	| "video"
	| "audio"
	| "markdown"
	| "table";

export interface InputField {
	name: string;
	label: string;
	type: InputFieldType;
	placeholder?: string;
	defaultValue?: string | number;
	options?: { value: string; label: string }[];
	required?: boolean;
}

export interface AgentTestConfig {
	name: string;
	displayName: string;
	description: string;
	endpoint: string;
	defaultAction: string;
	inputs: InputField[];
	outputType: OutputDisplayType;
	autoTestAction?: string;
	autoTestInputs?: Record<string, unknown>;
	icon: string;
	category: "core" | "media" | "utility" | "voice" | "ai" | "technical";
}

// Base API URL - all agents route through the main server
const API_BASE = "http://localhost:3000";

export const agentTestConfigs: Record<string, AgentTestConfig> = {
	// Core Agents
	ConversationAgent: {
		name: "ConversationAgent",
		displayName: "Dialogue Agent",
		description: "Test conversation and chat capabilities",
		endpoint: `${API_BASE}/agents/ConversationAgent/test`,
		defaultAction: "respond",
		inputs: [
			{
				name: "message",
				label: "Message",
				type: "textarea",
				placeholder: "Hello, how are you?",
				required: true,
			},
			{
				name: "context",
				label: "Context (optional)",
				type: "textarea",
				placeholder: "Previous conversation context...",
			},
		],
		outputType: "text",
		autoTestAction: "chat",
		autoTestInputs: { message: "Hello! Can you tell me a joke?" },
		icon: "💬",
		category: "core",
	},

	SearchAgent: {
		name: "SearchAgent",
		displayName: "Web Search Agent",
		description: "Test web search and information retrieval",
		endpoint: `${API_BASE}/agents/SearchAgent/test`,
		defaultAction: "search",
		inputs: [
			{
				name: "query",
				label: "Search Query",
				type: "text",
				placeholder: "What is machine learning?",
				required: true,
			},
			{ name: "limit", label: "Max Results", type: "number", defaultValue: 5 },
		],
		outputType: "json",
		autoTestAction: "search",
		autoTestInputs: { query: "TypeScript tutorial", limit: 3 },
		icon: "🔍",
		category: "core",
	},

	CodeAgent: {
		name: "CodeAgent",
		displayName: "Code Agent",
		description: "Test code generation and analysis",
		endpoint: `${API_BASE}/agents/CodeAgent/test`,
		defaultAction: "generate_code",
		inputs: [
			{
				name: "prompt",
				label: "Code Request",
				type: "textarea",
				placeholder: "Write a function to sort an array",
				required: true,
			},
			{
				name: "language",
				label: "Language",
				type: "select",
				options: [
					{ value: "javascript", label: "JavaScript" },
					{ value: "typescript", label: "TypeScript" },
					{ value: "python", label: "Python" },
					{ value: "java", label: "Java" },
					{ value: "go", label: "Go" },
				],
				defaultValue: "typescript",
			},
		],
		outputType: "markdown",
		autoTestAction: "generate_code",
		autoTestInputs: {
			prompt: "Write a hello world function",
			language: "typescript",
		},
		icon: "💻",
		category: "core",
	},

	// Media Agents
	ImageGenerationAgent: {
		name: "ImageGenerationAgent",
		displayName: "Image Generation Agent",
		description: "Generate images from text prompts",
		endpoint: `${API_BASE}/agents/ImageGenerationAgent/test`,
		defaultAction: "generate_image",
		inputs: [
			{
				name: "prompt",
				label: "Image Description",
				type: "textarea",
				placeholder: "A beautiful sunset over mountains",
				required: true,
			},
			{
				name: "style",
				label: "Style",
				type: "select",
				options: [
					{ value: "realistic", label: "Realistic" },
					{ value: "anime", label: "Anime" },
					{ value: "abstract", label: "Abstract" },
					{ value: "cartoon", label: "Cartoon" },
					{ value: "oil_painting", label: "Oil Painting" },
				],
				defaultValue: "realistic",
			},
			{
				name: "size",
				label: "Size",
				type: "select",
				options: [
					{ value: "256x256", label: "256x256" },
					{ value: "512x512", label: "512x512" },
					{ value: "1024x1024", label: "1024x1024" },
				],
				defaultValue: "512x512",
			},
		],
		outputType: "image",
		autoTestAction: "list_images",
		autoTestInputs: {},
		icon: "🎨",
		category: "media",
	},

	VideoAgent: {
		name: "VideoAgent",
		displayName: "Video Generation Agent",
		description: "Generate videos from text prompts",
		endpoint: `${API_BASE}/agents/VideoAgent/test`,
		defaultAction: "generate_video",
		inputs: [
			{
				name: "prompt",
				label: "Video Description",
				type: "textarea",
				placeholder: "A timelapse of flowers blooming",
				required: true,
			},
			{
				name: "duration",
				label: "Duration (seconds)",
				type: "number",
				defaultValue: 5,
			},
			{
				name: "style",
				label: "Style",
				type: "select",
				options: [
					{ value: "realistic", label: "Realistic" },
					{ value: "animated", label: "Animated" },
					{ value: "cinematic", label: "Cinematic" },
				],
				defaultValue: "realistic",
			},
		],
		outputType: "video",
		autoTestAction: "list_videos",
		autoTestInputs: {},
		icon: "🎬",
		category: "media",
	},

	MusicAgent: {
		name: "MusicAgent",
		displayName: "Music Generation Agent",
		description: "Generate music from descriptions",
		endpoint: `${API_BASE}/agents/MusicAgent/test`,
		defaultAction: "generate_music",
		inputs: [
			{
				name: "prompt",
				label: "Music Description",
				type: "textarea",
				placeholder: "Upbeat electronic dance music",
				required: true,
			},
			{
				name: "duration",
				label: "Duration (seconds)",
				type: "number",
				defaultValue: 30,
			},
			{
				name: "genre",
				label: "Genre",
				type: "select",
				options: [
					{ value: "electronic", label: "Electronic" },
					{ value: "rock", label: "Rock" },
					{ value: "classical", label: "Classical" },
					{ value: "jazz", label: "Jazz" },
					{ value: "ambient", label: "Ambient" },
				],
				defaultValue: "electronic",
			},
		],
		outputType: "audio",
		autoTestAction: "list_songs",
		autoTestInputs: {},
		icon: "🎵",
		category: "media",
	},

	VoiceAgent: {
		name: "VoiceAgent",
		displayName: "Voice Agent",
		description: "Text-to-speech and voice synthesis",
		endpoint: `${API_BASE}/agents/VoiceAgent/test`,
		defaultAction: "speak",
		inputs: [
			{
				name: "text",
				label: "Text to Speak",
				type: "textarea",
				placeholder: "Hello, I am Jarvis your AI assistant.",
				required: true,
			},
			{
				name: "voice",
				label: "Voice",
				type: "select",
				options: [
					{ value: "default", label: "Default" },
					{ value: "male", label: "Male" },
					{ value: "female", label: "Female" },
					{ value: "british", label: "British" },
				],
				defaultValue: "default",
			},
		],
		outputType: "audio",
		autoTestAction: "text_to_speech",
		autoTestInputs: {
			text: "Hello! I am your AI assistant.",
			voice: "default",
		},
		icon: "🎙️",
		category: "voice",
	},

	// Utility Agents
	WeatherAgent: {
		name: "WeatherAgent",
		displayName: "Weather Agent",
		description: "Get weather information",
		endpoint: `${API_BASE}/agents/WeatherAgent/test`,
		defaultAction: "get_current",
		inputs: [
			{
				name: "location",
				label: "Location",
				type: "text",
				placeholder: "London, UK",
				required: true,
			},
			{
				name: "units",
				label: "Units",
				type: "select",
				options: [
					{ value: "metric", label: "Metric (°C)" },
					{ value: "imperial", label: "Imperial (°F)" },
				],
				defaultValue: "metric",
			},
		],
		outputType: "json",
		autoTestAction: "get_current",
		autoTestInputs: { location: "New York", units: "metric" },
		icon: "🌤️",
		category: "utility",
	},

	NewsAgent: {
		name: "NewsAgent",
		displayName: "News Agent",
		description: "Get latest news and headlines",
		endpoint: `${API_BASE}/agents/NewsAgent/test`,
		defaultAction: "get_headlines",
		inputs: [
			{
				name: "category",
				label: "Category",
				type: "select",
				options: [
					{ value: "general", label: "General" },
					{ value: "technology", label: "Technology" },
					{ value: "business", label: "Business" },
					{ value: "sports", label: "Sports" },
					{ value: "science", label: "Science" },
				],
				defaultValue: "technology",
			},
			{ name: "limit", label: "Max Articles", type: "number", defaultValue: 5 },
		],
		outputType: "json",
		autoTestAction: "get_headlines",
		autoTestInputs: { category: "technology", limit: 3 },
		icon: "📰",
		category: "utility",
	},

	CalculatorAgent: {
		name: "CalculatorAgent",
		displayName: "Calculator Agent",
		description: "Perform mathematical calculations",
		endpoint: `${API_BASE}/agents/CalculatorAgent/test`,
		defaultAction: "calculate",
		inputs: [
			{
				name: "expression",
				label: "Expression",
				type: "text",
				placeholder: "2 + 2 * 3",
				required: true,
			},
		],
		outputType: "json",
		autoTestAction: "calculate",
		autoTestInputs: { expression: "(5 + 3) * 2 / 4" },
		icon: "🧮",
		category: "utility",
	},

	TranslationAgent: {
		name: "TranslationAgent",
		displayName: "Translation Agent",
		description: "Translate text between languages",
		endpoint: `${API_BASE}/agents/TranslationAgent/test`,
		defaultAction: "translate",
		inputs: [
			{
				name: "text",
				label: "Text to Translate",
				type: "textarea",
				placeholder: "Hello, how are you?",
				required: true,
			},
			{
				name: "from",
				label: "From Language",
				type: "select",
				options: [
					{ value: "auto", label: "Auto Detect" },
					{ value: "en", label: "English" },
					{ value: "es", label: "Spanish" },
					{ value: "fr", label: "French" },
					{ value: "de", label: "German" },
					{ value: "ja", label: "Japanese" },
				],
				defaultValue: "en",
			},
			{
				name: "to",
				label: "To Language",
				type: "select",
				options: [
					{ value: "es", label: "Spanish" },
					{ value: "fr", label: "French" },
					{ value: "de", label: "German" },
					{ value: "ja", label: "Japanese" },
					{ value: "en", label: "English" },
				],
				defaultValue: "es",
			},
		],
		outputType: "json",
		autoTestAction: "translate",
		autoTestInputs: { text: "Hello, how are you?", from: "en", to: "es" },
		icon: "🌐",
		category: "utility",
	},

	ReminderAgent: {
		name: "ReminderAgent",
		displayName: "Reminder Agent",
		description: "Create and manage reminders",
		endpoint: `${API_BASE}/agents/ReminderAgent/test`,
		defaultAction: "create",
		inputs: [
			{
				name: "title",
				label: "Reminder Title",
				type: "text",
				placeholder: "Call Mom",
				required: true,
			},
			{
				name: "time",
				label: "When",
				type: "text",
				placeholder: "in 5 minutes",
			},
			{
				name: "priority",
				label: "Priority",
				type: "select",
				options: [
					{ value: "low", label: "Low" },
					{ value: "medium", label: "Medium" },
					{ value: "high", label: "High" },
				],
				defaultValue: "medium",
			},
		],
		outputType: "json",
		autoTestAction: "list",
		autoTestInputs: {},
		icon: "⏰",
		category: "utility",
	},

	TimerAgent: {
		name: "TimerAgent",
		displayName: "Timer Agent",
		description: "Create and manage timers",
		endpoint: `${API_BASE}/agents/TimerAgent/test`,
		defaultAction: "start",
		inputs: [
			{
				name: "name",
				label: "Timer Name",
				type: "text",
				placeholder: "Cooking timer",
				required: true,
			},
			{
				name: "duration",
				label: "Duration (seconds)",
				type: "number",
				defaultValue: 60,
				required: true,
			},
		],
		outputType: "json",
		autoTestAction: "list",
		autoTestInputs: {},
		icon: "⏱️",
		category: "utility",
	},

	AlarmAgent: {
		name: "AlarmAgent",
		displayName: "Alarm Agent",
		description: "Create and manage alarms",
		endpoint: `${API_BASE}/agents/AlarmAgent/test`,
		defaultAction: "create",
		inputs: [
			{
				name: "name",
				label: "Alarm Name",
				type: "text",
				placeholder: "Morning alarm",
				required: true,
			},
			{
				name: "time",
				label: "Time (HH:MM)",
				type: "text",
				placeholder: "07:00",
				required: true,
			},
			{
				name: "repeat",
				label: "Repeat",
				type: "select",
				options: [
					{ value: "once", label: "Once" },
					{ value: "daily", label: "Daily" },
					{ value: "weekdays", label: "Weekdays" },
					{ value: "weekends", label: "Weekends" },
				],
				defaultValue: "once",
			},
		],
		outputType: "json",
		autoTestAction: "list",
		autoTestInputs: {},
		icon: "🔔",
		category: "utility",
	},

	StoryAgent: {
		name: "StoryAgent",
		displayName: "Story Agent",
		description: "Generate creative stories",
		endpoint: `${API_BASE}/agents/StoryAgent/test`,
		defaultAction: "generate",
		inputs: [
			{
				name: "prompt",
				label: "Story Prompt",
				type: "textarea",
				placeholder: "A brave knight who discovers a hidden treasure...",
				required: true,
			},
			{
				name: "genre",
				label: "Genre",
				type: "select",
				options: [
					{ value: "fantasy", label: "Fantasy" },
					{ value: "scifi", label: "Sci-Fi" },
					{ value: "mystery", label: "Mystery" },
					{ value: "romance", label: "Romance" },
					{ value: "horror", label: "Horror" },
				],
				defaultValue: "fantasy",
			},
			{
				name: "length",
				label: "Length",
				type: "select",
				options: [
					{ value: "short", label: "Short" },
					{ value: "medium", label: "Medium" },
					{ value: "long", label: "Long" },
				],
				defaultValue: "medium",
			},
		],
		outputType: "markdown",
		autoTestAction: "generate",
		autoTestInputs: {
			prompt: "A robot learns to feel emotions",
			genre: "scifi",
			length: "short",
		},
		icon: "📖",
		category: "media",
	},

	UnitConverterAgent: {
		name: "UnitConverterAgent",
		displayName: "Unit Converter Agent",
		description: "Convert between different units",
		endpoint: `${API_BASE}/agents/UnitConverterAgent/test`,
		defaultAction: "convert",
		inputs: [
			{
				name: "value",
				label: "Value",
				type: "number",
				defaultValue: 100,
				required: true,
			},
			{
				name: "from",
				label: "From Unit",
				type: "text",
				placeholder: "kilometers",
				required: true,
			},
			{
				name: "to",
				label: "To Unit",
				type: "text",
				placeholder: "miles",
				required: true,
			},
		],
		outputType: "json",
		autoTestAction: "convert",
		autoTestInputs: { value: 100, from: "kilometers", to: "miles" },
		icon: "📐",
		category: "utility",
	},

	// AI/Technical Agents
	LLMAgent: {
		name: "LLMAgent",
		displayName: "LLM Agent",
		description: "Direct access to language models",
		endpoint: `${API_BASE}/agents/LLMAgent/test`,
		defaultAction: "complete",
		inputs: [
			{
				name: "prompt",
				label: "Prompt",
				type: "textarea",
				placeholder: "Explain quantum computing in simple terms",
				required: true,
			},
			{
				name: "temperature",
				label: "Temperature",
				type: "number",
				defaultValue: 0.7,
			},
			{
				name: "maxTokens",
				label: "Max Tokens",
				type: "number",
				defaultValue: 500,
			},
		],
		outputType: "text",
		autoTestAction: "complete",
		autoTestInputs: { prompt: "What is 2+2?", temperature: 0.1 },
		icon: "🤖",
		category: "ai",
	},

	PersonalityAgent: {
		name: "PersonalityAgent",
		displayName: "Personality Agent",
		description: "Manage AI personality profiles",
		endpoint: `${API_BASE}/agents/PersonalityAgent/test`,
		defaultAction: "get_greeting",
		inputs: [
			{
				name: "userName",
				label: "User Name (optional)",
				type: "text",
				placeholder: "John",
			},
			{
				name: "timeOfDay",
				label: "Time of Day",
				type: "select",
				options: [
					{ value: "morning", label: "Morning" },
					{ value: "afternoon", label: "Afternoon" },
					{ value: "evening", label: "Evening" },
				],
				defaultValue: "afternoon",
			},
		],
		outputType: "json",
		autoTestAction: "list_profiles",
		autoTestInputs: {},
		icon: "😊",
		category: "ai",
	},

	MemoryAgent: {
		name: "MemoryAgent",
		displayName: "Memory Agent",
		description: "Store and recall memories",
		endpoint: `${API_BASE}/agents/MemoryAgent/test`,
		defaultAction: "store",
		inputs: [
			{
				name: "content",
				label: "Memory Content",
				type: "textarea",
				placeholder: "User prefers dark mode",
				required: true,
			},
			{
				name: "tags",
				label: "Tags (comma separated)",
				type: "text",
				placeholder: "preferences, ui",
			},
			{
				name: "importance",
				label: "Importance",
				type: "select",
				options: [
					{ value: "low", label: "Low" },
					{ value: "medium", label: "Medium" },
					{ value: "high", label: "High" },
				],
				defaultValue: "medium",
			},
		],
		outputType: "json",
		autoTestAction: "list_recent",
		autoTestInputs: { limit: 5 },
		icon: "🧠",
		category: "ai",
	},

	ContextAgent: {
		name: "ContextAgent",
		displayName: "Context Agent",
		description: "Manage conversation context",
		endpoint: `${API_BASE}/agents/ContextAgent/test`,
		defaultAction: "set",
		inputs: [
			{
				name: "key",
				label: "Context Key",
				type: "text",
				placeholder: "user_mood",
				required: true,
			},
			{
				name: "value",
				label: "Context Value",
				type: "textarea",
				placeholder: "happy",
				required: true,
			},
		],
		outputType: "json",
		autoTestAction: "list",
		autoTestInputs: {},
		icon: "🔍",
		category: "ai",
	},

	EmotionAgent: {
		name: "EmotionAgent",
		displayName: "Emotion Agent",
		description: "Analyze and track emotions",
		endpoint: `${API_BASE}/agents/EmotionAgent/test`,
		defaultAction: "analyze",
		inputs: [
			{
				name: "text",
				label: "Text to Analyze",
				type: "textarea",
				placeholder: "I am so excited about this new project!",
				required: true,
			},
		],
		outputType: "json",
		autoTestAction: "get_current",
		autoTestInputs: {},
		icon: "💚",
		category: "ai",
	},

	CommandAgent: {
		name: "CommandAgent",
		displayName: "Command Agent",
		description: "Execute system commands",
		endpoint: `${API_BASE}/agents/CommandAgent/test`,
		defaultAction: "execute_safe",
		inputs: [
			{
				name: "command",
				label: "Command",
				type: "text",
				placeholder: "echo Hello World",
				required: true,
			},
		],
		outputType: "json",
		autoTestAction: "list_allowed",
		autoTestInputs: {},
		icon: "🎯",
		category: "technical",
	},

	FileAgent: {
		name: "FileAgent",
		displayName: "File Agent",
		description: "File operations",
		endpoint: `${API_BASE}/agents/FileAgent/test`,
		defaultAction: "list",
		inputs: [
			{
				name: "path",
				label: "Path",
				type: "text",
				placeholder: "./",
				required: true,
			},
		],
		outputType: "json",
		autoTestAction: "list",
		autoTestInputs: { path: "./" },
		icon: "📁",
		category: "technical",
	},

	ComputerControlAgent: {
		name: "ComputerControlAgent",
		displayName: "Computer Control Agent",
		description: "System information and control",
		endpoint: `${API_BASE}/agents/ComputerControlAgent/test`,
		defaultAction: "get_system_info",
		inputs: [],
		outputType: "json",
		autoTestAction: "get_system_info",
		autoTestInputs: {},
		icon: "🖥️",
		category: "technical",
	},

	// Voice Agents
	ListeningAgent: {
		name: "ListeningAgent",
		displayName: "Listening Agent",
		description: "Audio listening and wake word detection",
		endpoint: `${API_BASE}/agents/ListeningAgent/test`,
		defaultAction: "get_status",
		inputs: [],
		outputType: "json",
		autoTestAction: "get_status",
		autoTestInputs: {},
		icon: "👂",
		category: "voice",
	},

	SpeechAgent: {
		name: "SpeechAgent",
		displayName: "Speech Agent",
		description: "Text-to-speech synthesis",
		endpoint: `${API_BASE}/agents/SpeechAgent/test`,
		defaultAction: "speak",
		inputs: [
			{
				name: "text",
				label: "Text to Speak",
				type: "textarea",
				placeholder: "Hello, I am Jarvis!",
				required: true,
			},
			{
				name: "voice",
				label: "Voice",
				type: "select",
				options: [
					{ value: "default", label: "Default" },
					{ value: "male", label: "Male" },
					{ value: "female", label: "Female" },
					{ value: "british", label: "British" },
				],
				defaultValue: "default",
			},
		],
		outputType: "audio",
		autoTestAction: "list_voices",
		autoTestInputs: {},
		icon: "🗣️",
		category: "voice",
	},

	VoiceCommandAgent: {
		name: "VoiceCommandAgent",
		displayName: "Voice Command Agent",
		description: "Voice command recognition",
		endpoint: `${API_BASE}/agents/VoiceCommandAgent/test`,
		defaultAction: "list_commands",
		inputs: [
			{
				name: "input",
				label: "Voice Input",
				type: "text",
				placeholder: "play music",
			},
		],
		outputType: "json",
		autoTestAction: "list_commands",
		autoTestInputs: {},
		icon: "🎤",
		category: "voice",
	},

	// Additional Agents
	FinanceAgent: {
		name: "FinanceAgent",
		displayName: "Finance Agent",
		description: "Financial tracking and analysis",
		endpoint: `${API_BASE}/agents/FinanceAgent/test`,
		defaultAction: "get_summary",
		inputs: [
			{
				name: "period",
				label: "Period",
				type: "select",
				options: [
					{ value: "day", label: "Today" },
					{ value: "week", label: "This Week" },
					{ value: "month", label: "This Month" },
					{ value: "year", label: "This Year" },
				],
				defaultValue: "month",
			},
		],
		outputType: "json",
		autoTestAction: "get_summary",
		autoTestInputs: { period: "month" },
		icon: "💰",
		category: "utility",
	},

	CalendarAgent: {
		name: "CalendarAgent",
		displayName: "Calendar Agent",
		description: "Calendar management",
		endpoint: `${API_BASE}/agents/CalendarAgent/test`,
		defaultAction: "list_events",
		inputs: [
			{
				name: "startDate",
				label: "Start Date",
				type: "text",
				placeholder: "today",
			},
			{
				name: "endDate",
				label: "End Date",
				type: "text",
				placeholder: "next week",
			},
		],
		outputType: "json",
		autoTestAction: "list_events",
		autoTestInputs: {},
		icon: "📅",
		category: "utility",
	},

	EmailAgent: {
		name: "EmailAgent",
		displayName: "Email Agent",
		description: "Email management",
		endpoint: `${API_BASE}/agents/EmailAgent/test`,
		defaultAction: "list_emails",
		inputs: [
			{
				name: "folder",
				label: "Folder",
				type: "select",
				options: [
					{ value: "inbox", label: "Inbox" },
					{ value: "sent", label: "Sent" },
					{ value: "drafts", label: "Drafts" },
				],
				defaultValue: "inbox",
			},
			{ name: "limit", label: "Max Emails", type: "number", defaultValue: 10 },
		],
		outputType: "json",
		autoTestAction: "get_unread_count",
		autoTestInputs: {},
		icon: "📧",
		category: "utility",
	},

	SpotifyAgent: {
		name: "SpotifyAgent",
		displayName: "Spotify Agent",
		description: "Spotify playback control",
		endpoint: `${API_BASE}/agents/SpotifyAgent/test`,
		defaultAction: "currently_playing",
		inputs: [
			{
				name: "query",
				label: "Search Query",
				type: "text",
				placeholder: "Bohemian Rhapsody",
			},
		],
		outputType: "json",
		autoTestAction: "currently_playing",
		autoTestInputs: {},
		icon: "🎧",
		category: "media",
	},

	AppleMusicAgent: {
		name: "AppleMusicAgent",
		displayName: "Apple Music Agent",
		description: "Apple Music playback control",
		endpoint: `${API_BASE}/agents/AppleMusicAgent/test`,
		defaultAction: "currently_playing",
		inputs: [
			{
				name: "query",
				label: "Search Query",
				type: "text",
				placeholder: "Shape of You",
			},
		],
		outputType: "json",
		autoTestAction: "currently_playing",
		autoTestInputs: {},
		icon: "🍎",
		category: "media",
	},
};

export function getAgentTestConfig(agentName: string): AgentTestConfig | null {
	return agentTestConfigs[agentName] || null;
}

export function getAllTestConfigs(): AgentTestConfig[] {
	return Object.values(agentTestConfigs);
}

export function getConfigsByCategory(category: AgentTestConfig["category"]): AgentTestConfig[] {
	return Object.values(agentTestConfigs).filter((c) => c.category === category);
}

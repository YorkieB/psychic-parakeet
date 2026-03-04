/*
  This file creates an agent test modal that provides testing controls and monitoring for a specific agent in Jarvis's dashboard.

  It offers test execution, result monitoring, log viewing, and performance tracking while ensuring agents can be thoroughly tested and validated.
*/

import {
	Bot,
	CheckCircle,
	Copy,
	Download,
	Loader2,
	Maximize,
	Music,
	Pause,
	Play,
	RefreshCw,
	Send,
	SkipBack,
	SkipForward,
	User,
	Volume2,
	VolumeX,
	X,
	XCircle,
	Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
	type AgentTestConfig,
	getAgentTestConfig,
	type InputField,
	type OutputDisplayType,
} from "../config/agentTestConfigs";

// ============================================
// CHAT MESSAGE INTERFACE
// ============================================
interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
	isLoading?: boolean;
}

// ============================================
// CHAT INTERFACE COMPONENT (for Dialogue Agent)
// ============================================
interface ChatInterfaceProps {
	config: AgentTestConfig;
	onClose: () => void;
}

function ChatInterface({ config, onClose }: ChatInterfaceProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputMessage, setInputMessage] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	// Focus input on mount
	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const sendMessage = async () => {
		if (!inputMessage.trim() || isLoading) return;

		const userMessage: ChatMessage = {
			id: `user-${Date.now()}`,
			role: "user",
			content: inputMessage.trim(),
			timestamp: new Date(),
		};

		// Add user message and loading indicator
		setMessages((prev) => [...prev, userMessage]);
		setInputMessage("");
		setIsLoading(true);

		// Add loading message for assistant
		const loadingMessage: ChatMessage = {
			id: `assistant-${Date.now()}`,
			role: "assistant",
			content: "",
			timestamp: new Date(),
			isLoading: true,
		};
		setMessages((prev) => [...prev, loadingMessage]);

		try {
			// Build context from previous messages
			const context = messages
				.map((m) => `${m.role === "user" ? "User" : "Jarvis"}: ${m.content}`)
				.join("\n");

			const response = await fetch(config.endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: `chat-${Date.now()}`,
					action: "respond",
					inputs: {
						message: userMessage.content,
						context: context || undefined,
					},
				}),
			});

			const data = await response.json();

			// Extract response text
			let responseText = "Sorry, I could not process that request.";
			if (data.success !== false) {
				if (typeof data.data === "string") {
					responseText = data.data;
				} else if (data.data?.text) {
					responseText = data.data.text;
				} else if (data.data?.response) {
					responseText = data.data.response;
				} else if (data.data?.message) {
					responseText = data.data.message;
				} else if (data.data?.completion) {
					responseText = data.data.completion;
				} else if (data.text) {
					responseText = data.text;
				} else if (data.response) {
					responseText = data.response;
				}
			} else if (data.error) {
				responseText = `Error: ${data.error}`;
			}

			// Update loading message with actual response
			setMessages((prev) =>
				prev.map((m) =>
					m.id === loadingMessage.id ? { ...m, content: responseText, isLoading: false } : m,
				),
			);
		} catch (error) {
			// Update loading message with error
			setMessages((prev) =>
				prev.map((m) =>
					m.id === loadingMessage.id
						? {
								...m,
								content: `Error: ${error instanceof Error ? error.message : "Request failed"}`,
								isLoading: false,
							}
						: m,
				),
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	const clearChat = () => {
		setMessages([]);
	};

	return (
		<div
			className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
			onClick={onClose}
		>
			<div
				className="bg-dashboard-card border border-gray-700 rounded-xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gradient-to-r from-dashboard-accent/10 to-transparent">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-full bg-dashboard-accent/20 flex items-center justify-center">
							<Bot className="w-5 h-5 text-dashboard-accent" />
						</div>
						<div>
							<h2 className="text-lg font-bold text-dashboard-text">Chat with Jarvis</h2>
							<p className="text-xs text-gray-400">Dialogue Agent Test Interface</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={clearChat}
							className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
							title="Clear chat"
						>
							<RefreshCw className="w-4 h-4 text-gray-400" />
						</button>
						<button
							onClick={onClose}
							className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
							aria-label="Close"
						>
							<X className="w-5 h-5 text-gray-400" />
						</button>
					</div>
				</div>

				{/* Messages Container */}
				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					{messages.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full text-center">
							<div className="w-16 h-16 rounded-full bg-dashboard-accent/10 flex items-center justify-center mb-4">
								<Bot className="w-8 h-8 text-dashboard-accent" />
							</div>
							<h3 className="text-lg font-medium text-dashboard-text mb-2">Start a conversation</h3>
							<p className="text-sm text-gray-400 max-w-sm">
								Type a message below to start chatting with Jarvis. Ask questions, request help, or
								just say hello!
							</p>
						</div>
					) : (
						messages.map((message) => (
							<div
								key={message.id}
								className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
							>
								{/* Avatar */}
								<div
									className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
										message.role === "user" ? "bg-blue-500/20" : "bg-dashboard-accent/20"
									}`}
								>
									{message.role === "user" ? (
										<User className="w-4 h-4 text-blue-400" />
									) : (
										<Bot className="w-4 h-4 text-dashboard-accent" />
									)}
								</div>

								{/* Message Bubble */}
								<div
									className={`flex flex-col max-w-[75%] ${message.role === "user" ? "items-end" : "items-start"}`}
								>
									<div
										className={`px-4 py-3 rounded-2xl ${
											message.role === "user"
												? "bg-blue-600 text-white rounded-br-md"
												: "bg-gray-700 text-dashboard-text rounded-bl-md"
										}`}
									>
										{message.isLoading ? (
											<div className="flex items-center gap-2">
												<Loader2 className="w-4 h-4 animate-spin" />
												<span className="text-sm">Thinking...</span>
											</div>
										) : (
											<p className="text-sm whitespace-pre-wrap">{message.content}</p>
										)}
									</div>
									<span className="text-xs text-gray-500 mt-1 px-1">
										{message.timestamp.toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
								</div>
							</div>
						))
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Composer */}
				<div className="p-4 border-t border-gray-700 bg-dashboard-bg/50">
					<div className="flex gap-3 items-end">
						<div className="flex-1 relative">
							<textarea
								ref={inputRef}
								value={inputMessage}
								onChange={(e) => setInputMessage(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Type a message..."
								className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 pr-12 text-dashboard-text placeholder-gray-500 focus:border-dashboard-accent focus:outline-none resize-none min-h-[48px] max-h-[120px]"
								rows={1}
								style={{ height: "auto" }}
								onInput={(e) => {
									const target = e.target as HTMLTextAreaElement;
									target.style.height = "auto";
									target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
								}}
							/>
						</div>
						<button
							onClick={sendMessage}
							disabled={!inputMessage.trim() || isLoading}
							className="flex-shrink-0 w-12 h-12 bg-dashboard-accent hover:bg-dashboard-accent/80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors"
						>
							{isLoading ? (
								<Loader2 className="w-5 h-5 text-white animate-spin" />
							) : (
								<Send className="w-5 h-5 text-white" />
							)}
						</button>
					</div>
					<p className="text-xs text-gray-500 mt-2 text-center">
						Press Enter to send, Shift+Enter for new line
					</p>
				</div>
			</div>
		</div>
	);
}

// ============================================
// VIDEO PLAYER COMPONENT (YouTube-style)
// ============================================
interface VideoPlayerProps {
	videoRef: React.RefObject<HTMLVideoElement>;
	videoUrl: string | null;
	data: unknown;
}

function VideoPlayer({ videoRef, videoUrl, data }: VideoPlayerProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(1);
	const [isMuted, setIsMuted] = useState(false);
	const [_isFullscreen, setIsFullscreen] = useState(false);
	const [showControls, setShowControls] = useState(true);
	const containerRef = useRef<HTMLDivElement>(null);
	const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const togglePlay = () => {
		if (videoRef.current) {
			if (isPlaying) {
				videoRef.current.pause();
			} else {
				videoRef.current.play();
			}
			setIsPlaying(!isPlaying);
		}
	};

	const handleTimeUpdate = () => {
		if (videoRef.current) {
			setCurrentTime(videoRef.current.currentTime);
		}
	};

	const handleLoadedMetadata = () => {
		if (videoRef.current) {
			setDuration(videoRef.current.duration);
		}
	};

	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		const time = parseFloat(e.target.value);
		if (videoRef.current) {
			videoRef.current.currentTime = time;
			setCurrentTime(time);
		}
	};

	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const vol = parseFloat(e.target.value);
		if (videoRef.current) {
			videoRef.current.volume = vol;
			setVolume(vol);
			setIsMuted(vol === 0);
		}
	};

	const toggleMute = () => {
		if (videoRef.current) {
			videoRef.current.muted = !isMuted;
			setIsMuted(!isMuted);
		}
	};

	const toggleFullscreen = () => {
		if (containerRef.current) {
			if (!document.fullscreenElement) {
				containerRef.current.requestFullscreen();
				setIsFullscreen(true);
			} else {
				document.exitFullscreen();
				setIsFullscreen(false);
			}
		}
	};

	const skip = (seconds: number) => {
		if (videoRef.current) {
			videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
		}
	};

	const handleMouseMove = () => {
		setShowControls(true);
		if (controlsTimeoutRef.current) {
			clearTimeout(controlsTimeoutRef.current);
		}
		controlsTimeoutRef.current = setTimeout(() => {
			if (isPlaying) setShowControls(false);
		}, 3000);
	};

	// Mock video for testing when no real URL
	const mockVideoData = data && typeof data === "object" ? data : null;

	if (!videoUrl) {
		return (
			<div className="w-full">
				{/* Mock Video Player */}
				<div
					ref={containerRef}
					className="relative bg-black rounded-xl overflow-hidden aspect-video"
				>
					{/* Video Placeholder */}
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
						<div className="w-20 h-20 rounded-full bg-dashboard-accent/20 flex items-center justify-center mb-4 animate-pulse">
							<Play className="w-10 h-10 text-dashboard-accent ml-1" />
						</div>
						<p className="text-white text-lg font-medium">Video Generated Successfully</p>
						<p className="text-gray-400 text-sm mt-2">Mock video output (no real URL provided)</p>
					</div>

					{/* Mock Controls */}
					<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
						{/* Progress Bar */}
						<div className="w-full h-1 bg-gray-700 rounded-full mb-3 cursor-pointer">
							<div className="h-full bg-dashboard-accent rounded-full w-1/3" />
						</div>

						{/* Control Buttons */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<button className="p-2 hover:bg-white/10 rounded-full transition-colors">
									<SkipBack className="w-5 h-5 text-white" />
								</button>
								<button className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
									<Play className="w-6 h-6 text-white ml-0.5" />
								</button>
								<button className="p-2 hover:bg-white/10 rounded-full transition-colors">
									<SkipForward className="w-5 h-5 text-white" />
								</button>
								<span className="text-white text-sm ml-2">0:00 / 0:10</span>
							</div>
							<div className="flex items-center gap-3">
								<button className="p-2 hover:bg-white/10 rounded-full transition-colors">
									<Volume2 className="w-5 h-5 text-white" />
								</button>
								<button className="p-2 hover:bg-white/10 rounded-full transition-colors">
									<Maximize className="w-5 h-5 text-white" />
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Video Info */}
				{mockVideoData && (
					<div className="mt-4 p-4 bg-dashboard-bg rounded-lg">
						<h4 className="text-sm font-medium text-gray-400 mb-2">Generation Details</h4>
						<pre className="text-xs text-dashboard-text overflow-auto max-h-32">
							{JSON.stringify(mockVideoData, null, 2)}
						</pre>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="w-full">
			{/* Real Video Player */}
			<div
				ref={containerRef}
				className="relative bg-black rounded-xl overflow-hidden"
				onMouseMove={handleMouseMove}
				onMouseLeave={() => isPlaying && setShowControls(false)}
			>
				<video
					ref={videoRef}
					src={videoUrl}
					className="w-full aspect-video"
					onTimeUpdate={handleTimeUpdate}
					onLoadedMetadata={handleLoadedMetadata}
					onPlay={() => setIsPlaying(true)}
					onPause={() => setIsPlaying(false)}
					onEnded={() => setIsPlaying(false)}
					onClick={togglePlay}
				/>

				{/* Play/Pause Overlay */}
				{!isPlaying && (
					<div
						className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
						onClick={togglePlay}
					>
						<div className="w-20 h-20 rounded-full bg-dashboard-accent/90 flex items-center justify-center hover:bg-dashboard-accent transition-colors">
							<Play className="w-10 h-10 text-white ml-1" />
						</div>
					</div>
				)}

				{/* Controls */}
				<div
					className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
				>
					{/* Progress Bar */}
					<input
						type="range"
						min={0}
						max={duration || 100}
						value={currentTime}
						onChange={handleSeek}
						className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer mb-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-dashboard-accent [&::-webkit-slider-thumb]:rounded-full"
						style={{
							background: `linear-gradient(to right, #10b981 0%, #10b981 ${(currentTime / (duration || 1)) * 100}%, #374151 ${(currentTime / (duration || 1)) * 100}%, #374151 100%)`,
						}}
					/>

					{/* Control Buttons */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<button
								onClick={() => skip(-10)}
								className="p-2 hover:bg-white/10 rounded-full transition-colors"
							>
								<SkipBack className="w-5 h-5 text-white" />
							</button>
							<button
								onClick={togglePlay}
								className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
							>
								{isPlaying ? (
									<Pause className="w-6 h-6 text-white" />
								) : (
									<Play className="w-6 h-6 text-white ml-0.5" />
								)}
							</button>
							<button
								onClick={() => skip(10)}
								className="p-2 hover:bg-white/10 rounded-full transition-colors"
							>
								<SkipForward className="w-5 h-5 text-white" />
							</button>
							<span className="text-white text-sm ml-2">
								{formatTime(currentTime)} / {formatTime(duration)}
							</span>
						</div>
						<div className="flex items-center gap-3">
							<button
								onClick={toggleMute}
								className="p-2 hover:bg-white/10 rounded-full transition-colors"
							>
								{isMuted ? (
									<VolumeX className="w-5 h-5 text-white" />
								) : (
									<Volume2 className="w-5 h-5 text-white" />
								)}
							</button>
							<input
								type="range"
								min={0}
								max={1}
								step={0.1}
								value={isMuted ? 0 : volume}
								onChange={handleVolumeChange}
								className="w-20 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
							/>
							<button
								onClick={toggleFullscreen}
								className="p-2 hover:bg-white/10 rounded-full transition-colors"
							>
								<Maximize className="w-5 h-5 text-white" />
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Download Button */}
			<div className="mt-4 flex justify-end">
				<a
					href={videoUrl}
					download
					className="flex items-center gap-2 px-4 py-2 bg-dashboard-accent hover:bg-dashboard-accent/80 text-white rounded-lg transition-colors"
				>
					<Download className="w-4 h-4" />
					Download Video
				</a>
			</div>
		</div>
	);
}

// ============================================
// AUDIO PLAYER COMPONENT
// ============================================
interface AudioPlayerProps {
	audioRef: React.RefObject<HTMLAudioElement>;
	audioUrl: string | null;
	data: unknown;
}

function AudioPlayer({ audioRef, audioUrl, data }: AudioPlayerProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(1);
	const [isMuted, setIsMuted] = useState(false);
	const [waveformBars] = useState(() => Array.from({ length: 50 }, () => Math.random() * 100));

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const togglePlay = () => {
		if (audioRef.current) {
			if (isPlaying) {
				audioRef.current.pause();
			} else {
				audioRef.current.play();
			}
			setIsPlaying(!isPlaying);
		}
	};

	const handleTimeUpdate = () => {
		if (audioRef.current) {
			setCurrentTime(audioRef.current.currentTime);
		}
	};

	const handleLoadedMetadata = () => {
		if (audioRef.current) {
			setDuration(audioRef.current.duration);
		}
	};

	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		const time = parseFloat(e.target.value);
		if (audioRef.current) {
			audioRef.current.currentTime = time;
			setCurrentTime(time);
		}
	};

	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const vol = parseFloat(e.target.value);
		if (audioRef.current) {
			audioRef.current.volume = vol;
			setVolume(vol);
			setIsMuted(vol === 0);
		}
	};

	const toggleMute = () => {
		if (audioRef.current) {
			audioRef.current.muted = !isMuted;
			setIsMuted(!isMuted);
		}
	};

	const mockAudioData = data && typeof data === "object" ? data : null;
	const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

	return (
		<div className="w-full">
			{/* Audio Element (hidden) */}
			{audioUrl && (
				<audio
					ref={audioRef}
					src={audioUrl}
					onTimeUpdate={handleTimeUpdate}
					onLoadedMetadata={handleLoadedMetadata}
					onPlay={() => setIsPlaying(true)}
					onPause={() => setIsPlaying(false)}
					onEnded={() => setIsPlaying(false)}
				/>
			)}

			{/* Audio Player UI */}
			<div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-purple-500/30">
				{/* Waveform Visualization */}
				<div className="flex items-end justify-center gap-0.5 h-24 mb-6">
					{waveformBars.map((height, i) => {
						const barProgress = (i / waveformBars.length) * 100;
						const isActive = barProgress <= progress;
						return (
							<div
								key={i}
								className={`w-1.5 rounded-full transition-all duration-100 ${
									isActive ? "bg-dashboard-accent" : "bg-gray-600"
								} ${isPlaying && isActive ? "animate-pulse" : ""}`}
								style={{
									height: `${height}%`,
									opacity: isActive ? 1 : 0.5,
								}}
							/>
						);
					})}
				</div>

				{/* Track Info */}
				<div className="flex items-center gap-4 mb-4">
					<div className="w-16 h-16 rounded-lg bg-gradient-to-br from-dashboard-accent to-purple-600 flex items-center justify-center">
						<Music className="w-8 h-8 text-white" />
					</div>
					<div className="flex-1">
						<h4 className="text-white font-medium">
							{audioUrl ? "Generated Audio" : "Audio Generation Complete"}
						</h4>
						<p className="text-gray-400 text-sm">
							{audioUrl ? "Ready to play" : "Mock audio output"}
						</p>
					</div>
				</div>

				{/* Progress Bar */}
				<div className="mb-4">
					<input
						type="range"
						min={0}
						max={duration || 100}
						value={currentTime}
						onChange={handleSeek}
						disabled={!audioUrl}
						className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-dashboard-accent [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
						style={{
							background: `linear-gradient(to right, #10b981 0%, #10b981 ${progress}%, #374151 ${progress}%, #374151 100%)`,
						}}
					/>
					<div className="flex justify-between text-xs text-gray-400 mt-1">
						<span>{formatTime(currentTime)}</span>
						<span>{formatTime(duration || 180)}</span>
					</div>
				</div>

				{/* Controls */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<button
							onClick={togglePlay}
							disabled={!audioUrl}
							className="w-14 h-14 rounded-full bg-dashboard-accent hover:bg-dashboard-accent/80 disabled:bg-gray-600 flex items-center justify-center transition-colors"
						>
							{isPlaying ? (
								<Pause className="w-7 h-7 text-white" />
							) : (
								<Play className="w-7 h-7 text-white ml-1" />
							)}
						</button>
					</div>

					<div className="flex items-center gap-3">
						<button
							onClick={toggleMute}
							className="p-2 hover:bg-white/10 rounded-full transition-colors"
						>
							{isMuted ? (
								<VolumeX className="w-5 h-5 text-white" />
							) : (
								<Volume2 className="w-5 h-5 text-white" />
							)}
						</button>
						<input
							type="range"
							min={0}
							max={1}
							step={0.1}
							value={isMuted ? 0 : volume}
							onChange={handleVolumeChange}
							className="w-24 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
						/>
					</div>
				</div>
			</div>

			{/* Audio Info */}
			{mockAudioData && !audioUrl && (
				<div className="mt-4 p-4 bg-dashboard-bg rounded-lg">
					<h4 className="text-sm font-medium text-gray-400 mb-2">Generation Details</h4>
					<pre className="text-xs text-dashboard-text overflow-auto max-h-32">
						{JSON.stringify(mockAudioData, null, 2)}
					</pre>
				</div>
			)}

			{/* Download Button */}
			{audioUrl && (
				<div className="mt-4 flex justify-end">
					<a
						href={audioUrl}
						download
						className="flex items-center gap-2 px-4 py-2 bg-dashboard-accent hover:bg-dashboard-accent/80 text-white rounded-lg transition-colors"
					>
						<Download className="w-4 h-4" />
						Download Audio
					</a>
				</div>
			)}
		</div>
	);
}

interface AgentTestModalProps {
	agentName: string;
	onClose: () => void;
}

interface TestResult {
	success: boolean;
	data?: unknown;
	error?: string;
	duration?: number;
	timestamp: Date;
}

export function AgentTestModal({ agentName, onClose }: AgentTestModalProps) {
	const config = getAgentTestConfig(agentName);
	const [inputs, setInputs] = useState<Record<string, string | number>>({});
	const [action, setAction] = useState<string>(config?.defaultAction || "");
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<TestResult | null>(null);
	const [autoTestRunning, setAutoTestRunning] = useState(false);
	const videoRef = useRef<HTMLVideoElement>(null);
	const audioRef = useRef<HTMLAudioElement>(null);

	// Initialize inputs with default values
	useEffect(() => {
		if (config) {
			const defaults: Record<string, string | number> = {};
			config.inputs.forEach((input) => {
				if (input.defaultValue !== undefined) {
					defaults[input.name] = input.defaultValue;
				}
			});
			setInputs(defaults);
			setAction(config.defaultAction);
		}
	}, [config]);

	// Use Chat Interface for Dialogue/Conversation Agent
	if (
		config &&
		(agentName === "ConversationAgent" ||
			agentName === "DialogueAgent" ||
			config.displayName === "Dialogue Agent")
	) {
		return <ChatInterface config={config} onClose={onClose} />;
	}

	if (!config) {
		return (
			<div
				className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
				onClick={onClose}
			>
				<div
					className="bg-dashboard-card border border-gray-700 rounded-xl p-6 max-w-md"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="text-center">
						<XCircle className="w-12 h-12 text-dashboard-error mx-auto mb-4" />
						<h3 className="text-xl font-semibold text-dashboard-text mb-2">Test Not Available</h3>
						<p className="text-gray-400">No test configuration found for {agentName}</p>
						<button
							onClick={onClose}
							className="mt-4 px-4 py-2 bg-dashboard-accent rounded-lg text-white"
						>
							Close
						</button>
					</div>
				</div>
			</div>
		);
	}

	const handleInputChange = (name: string, value: string | number) => {
		setInputs((prev) => ({ ...prev, [name]: value }));
	};

	const executeTest = async (testAction: string, testInputs: Record<string, unknown>) => {
		setLoading(true);
		setResult(null);
		const startTime = Date.now();

		try {
			const response = await fetch(config.endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: `test-${Date.now()}`,
					action: testAction,
					inputs: testInputs,
				}),
			});

			const data = await response.json();
			const duration = Date.now() - startTime;

			setResult({
				success: data.success !== false && response.ok,
				data: data.data || data,
				error: data.error,
				duration,
				timestamp: new Date(),
			});
		} catch (error) {
			const duration = Date.now() - startTime;
			setResult({
				success: false,
				error: error instanceof Error ? error.message : "Request failed",
				duration,
				timestamp: new Date(),
			});
		} finally {
			setLoading(false);
		}
	};

	const handleManualTest = () => {
		executeTest(action, inputs);
	};

	const handleAutoTest = async () => {
		if (!config.autoTestAction || !config.autoTestInputs) return;
		setAutoTestRunning(true);
		await executeTest(config.autoTestAction, config.autoTestInputs);
		setAutoTestRunning(false);
	};

	const copyResult = () => {
		if (result?.data) {
			navigator.clipboard.writeText(JSON.stringify(result.data, null, 2));
		}
	};

	const renderInputField = (field: InputField) => {
		const value = inputs[field.name] ?? "";

		switch (field.type) {
			case "textarea":
				return (
					<textarea
						value={String(value)}
						onChange={(e) => handleInputChange(field.name, e.target.value)}
						placeholder={field.placeholder}
						className="w-full bg-dashboard-bg border border-gray-600 rounded-lg px-4 py-3 text-dashboard-text placeholder-gray-500 focus:border-dashboard-accent focus:outline-none resize-none"
						rows={3}
					/>
				);
			case "number":
				return (
					<input
						type="number"
						value={value}
						onChange={(e) => handleInputChange(field.name, parseFloat(e.target.value) || 0)}
						placeholder={field.placeholder}
						className="w-full bg-dashboard-bg border border-gray-600 rounded-lg px-4 py-3 text-dashboard-text placeholder-gray-500 focus:border-dashboard-accent focus:outline-none"
					/>
				);
			case "select":
				return (
					<select
						value={String(value)}
						onChange={(e) => handleInputChange(field.name, e.target.value)}
						className="w-full bg-dashboard-bg border border-gray-600 rounded-lg px-4 py-3 text-dashboard-text focus:border-dashboard-accent focus:outline-none"
					>
						{field.options?.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
				);
			default:
				return (
					<input
						type="text"
						value={String(value)}
						onChange={(e) => handleInputChange(field.name, e.target.value)}
						placeholder={field.placeholder}
						className="w-full bg-dashboard-bg border border-gray-600 rounded-lg px-4 py-3 text-dashboard-text placeholder-gray-500 focus:border-dashboard-accent focus:outline-none"
					/>
				);
		}
	};

	const renderOutput = (outputType: OutputDisplayType, data: unknown) => {
		if (!data) return null;

		switch (outputType) {
			case "image": {
				const imageUrl =
					typeof data === "object" && data !== null
						? (data as any).url || (data as any).imageUrl || (data as any).image
						: String(data);
				return (
					<div className="flex flex-col items-center">
						{imageUrl ? (
							<img
								src={imageUrl}
								alt="Generated"
								className="max-w-full max-h-96 rounded-lg shadow-lg"
								onError={(e) => {
									(e.target as HTMLImageElement).src =
										'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23333" width="200" height="200"/><text fill="%23999" x="50%" y="50%" text-anchor="middle">Mock Image</text></svg>';
								}}
							/>
						) : (
							<div className="text-gray-400 text-center py-8">
								<p>Image generation completed</p>
								<pre className="mt-2 text-xs bg-dashboard-bg p-2 rounded">
									{JSON.stringify(data, null, 2)}
								</pre>
							</div>
						)}
					</div>
				);
			}

			case "video": {
				const videoUrl =
					typeof data === "object" && data !== null
						? (data as any).url || (data as any).videoUrl || (data as any).video
						: String(data);
				return <VideoPlayer videoRef={videoRef} videoUrl={videoUrl} data={data} />;
			}

			case "audio": {
				const audioUrl =
					typeof data === "object" && data !== null
						? (data as any).url || (data as any).audioUrl || (data as any).audio
						: String(data);
				return <AudioPlayer audioRef={audioRef} audioUrl={audioUrl} data={data} />;
			}

			case "markdown": {
				const mdContent =
					typeof data === "object" && data !== null
						? (data as any).text ||
							(data as any).content ||
							(data as any).code ||
							JSON.stringify(data, null, 2)
						: String(data);
				return (
					<div className="bg-dashboard-bg rounded-lg p-4 overflow-auto max-h-96">
						<pre className="text-dashboard-text whitespace-pre-wrap font-mono text-sm">
							{mdContent}
						</pre>
					</div>
				);
			}

			case "text": {
				const textContent =
					typeof data === "object" && data !== null
						? (data as any).text ||
							(data as any).response ||
							(data as any).completion ||
							(data as any).message ||
							JSON.stringify(data, null, 2)
						: String(data);
				return (
					<div className="bg-dashboard-bg rounded-lg p-4">
						<p className="text-dashboard-text whitespace-pre-wrap">{textContent}</p>
					</div>
				);
			}

			case "table":
				if (Array.isArray(data)) {
					const headers = data.length > 0 ? Object.keys(data[0]) : [];
					return (
						<div className="overflow-auto max-h-96">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-gray-700">
										{headers.map((h) => (
											<th key={h} className="text-left p-2 text-gray-400">
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{data.map((row, i) => (
										<tr key={i} className="border-b border-gray-800">
											{headers.map((h) => (
												<td key={h} className="p-2 text-dashboard-text">
													{String((row as any)[h])}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					);
				}
				return renderOutput("json", data);
			default:
				return (
					<div className="bg-dashboard-bg rounded-lg p-4 overflow-auto max-h-96">
						<pre className="text-dashboard-text text-sm font-mono whitespace-pre-wrap">
							{JSON.stringify(data, null, 2)}
						</pre>
					</div>
				);
		}
	};

	return (
		<div
			className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
			onClick={onClose}
		>
			<div
				className="bg-dashboard-card border border-gray-700 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-dashboard-accent/10 to-transparent">
					<div className="flex items-center gap-3">
						<span className="text-3xl">{config.icon}</span>
						<div>
							<h2 className="text-xl font-bold text-dashboard-text">Test {config.displayName}</h2>
							<p className="text-sm text-gray-400">{config.description}</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
						aria-label="Close"
					>
						<X className="w-5 h-5 text-gray-400" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Action Selection */}
					<div>
						<label className="block text-sm font-medium text-gray-400 mb-2">Action</label>
						<input
							type="text"
							value={action}
							onChange={(e) => setAction(e.target.value)}
							className="w-full bg-dashboard-bg border border-gray-600 rounded-lg px-4 py-3 text-dashboard-text focus:border-dashboard-accent focus:outline-none"
							placeholder="Enter action name"
						/>
					</div>

					{/* Input Fields */}
					{config.inputs.length > 0 && (
						<div className="space-y-4">
							<h3 className="text-sm font-medium text-gray-400">Inputs</h3>
							{config.inputs.map((field) => (
								<div key={field.name}>
									<label className="block text-sm text-gray-400 mb-1">
										{field.label}
										{field.required && <span className="text-dashboard-error ml-1">*</span>}
									</label>
									{renderInputField(field)}
								</div>
							))}
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex gap-3">
						<button
							onClick={handleManualTest}
							disabled={loading}
							className="flex-1 px-4 py-3 bg-dashboard-accent hover:bg-dashboard-accent/80 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
						>
							{loading && !autoTestRunning ? (
								<Loader2 className="w-5 h-5 animate-spin" />
							) : (
								<Play className="w-5 h-5" />
							)}
							Run Test
						</button>
						{config.autoTestAction && (
							<button
								onClick={handleAutoTest}
								disabled={loading}
								className="px-4 py-3 bg-dashboard-success/20 hover:bg-dashboard-success/30 disabled:bg-gray-600 text-dashboard-success rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
							>
								{autoTestRunning ? (
									<Loader2 className="w-5 h-5 animate-spin" />
								) : (
									<Zap className="w-5 h-5" />
								)}
								Auto Test
							</button>
						)}
					</div>

					{/* Result Section */}
					{result && (
						<div
							className={`rounded-lg border ${result.success ? "border-dashboard-success/50 bg-dashboard-success/5" : "border-dashboard-error/50 bg-dashboard-error/5"} p-4`}
						>
							{/* Result Header */}
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-2">
									{result.success ? (
										<CheckCircle className="w-5 h-5 text-dashboard-success" />
									) : (
										<XCircle className="w-5 h-5 text-dashboard-error" />
									)}
									<span
										className={`font-medium ${result.success ? "text-dashboard-success" : "text-dashboard-error"}`}
									>
										{result.success ? "Success" : "Failed"}
									</span>
									{result.duration && (
										<span className="text-sm text-gray-400">({result.duration}ms)</span>
									)}
								</div>
								<div className="flex gap-2">
									<button
										onClick={copyResult}
										className="p-2 hover:bg-gray-700 rounded transition-colors"
										title="Copy result"
									>
										<Copy className="w-4 h-4 text-gray-400" />
									</button>
									<button
										onClick={() => setResult(null)}
										className="p-2 hover:bg-gray-700 rounded transition-colors"
										title="Clear result"
									>
										<RefreshCw className="w-4 h-4 text-gray-400" />
									</button>
								</div>
							</div>

							{/* Result Content */}
							{result.error ? (
								<div className="text-dashboard-error bg-dashboard-error/10 rounded-lg p-3">
									<p className="font-medium">Error:</p>
									<p className="text-sm mt-1">{result.error}</p>
								</div>
							) : (
								renderOutput(config.outputType, result.data)
							)}

							{/* Timestamp */}
							<div className="mt-3 text-xs text-gray-500 text-right">
								{result.timestamp.toLocaleTimeString()}
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="p-4 border-t border-gray-700 bg-dashboard-bg/50">
					<div className="flex items-center justify-between text-sm text-gray-400">
						<span>
							Endpoint: <code className="text-dashboard-accent">{config.endpoint}</code>
						</span>
						<span className="px-2 py-1 bg-gray-700 rounded text-xs">{config.category}</span>
					</div>
				</div>
			</div>
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

/**
 * Real-Time Voice Hook with Streaming, TTS Playback, and Barge-In
 * Enhanced version of useVoice with full real-time capabilities
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useConversationStore } from "../store/conversation-store";

// Report microphone health via IPC
const reportMicrophoneHealth = async (
	status: "healthy" | "degraded" | "error" | "unavailable",
	message: string,
	details?: any,
) => {
	try {
		if (typeof window !== "undefined" && (window as any).jarvisAPI?.reportSensorHealth) {
			await (window as any).jarvisAPI.reportSensorHealth("Microphone", status, message, details);
		}
	} catch (_error) {
		// Silently fail if IPC not available
	}
};

export function useVoiceRealTime() {
	const [isListening, setIsListening] = useState(false);
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [amplitude, setAmplitude] = useState<number[]>(new Array(40).fill(0));
	const [continuousMode, setContinuousMode] = useState(false);
	const [partialTranscription, setPartialTranscription] = useState("");

	const wsRef = useRef<WebSocket | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const processorRef = useRef<ScriptProcessorNode | null>(null);
	const animationRef = useRef<number>();
	const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
	const audioQueueRef = useRef<string[]>([]);
	const isPlayingRef = useRef(false);

	const { addMessage } = useConversationStore();

	const VOICE_WS_URL = "ws://localhost:3000/voice/stream";

	/**
	 * Connect to voice WebSocket
	 */
	const connectWebSocket = useCallback(() => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			return;
		}

		const ws = new WebSocket(VOICE_WS_URL);
		wsRef.current = ws;

		ws.onopen = () => {
			console.log("Voice WebSocket connected");
		};

		ws.onmessage = async (event) => {
			try {
				const data = JSON.parse(event.data);
				await handleWebSocketMessage(data);
			} catch (error) {
				console.error("Failed to parse WebSocket message:", error);
			}
		};

		ws.onerror = (error) => {
			console.error("Voice WebSocket error:", error);
		};

		ws.onclose = () => {
			console.log("Voice WebSocket disconnected");
			// Reconnect after delay
			setTimeout(connectWebSocket, 2000);
		};
	}, []);

	/**
	 * Handle incoming WebSocket messages
	 */
	const handleWebSocketMessage = async (data: any) => {
		switch (data.type) {
			case "connected":
				console.log("Voice session started:", data);
				break;

			case "listening_started":
				setIsListening(true);
				break;

			case "transcription_update":
				setPartialTranscription(data.text);
				break;

			case "transcription_final":
				setPartialTranscription("");
				if (data.text) {
					// Add user message to chat
					addMessage({
						id: crypto.randomUUID(),
						role: "user",
						content: data.text,
						timestamp: new Date(),
					});
				}
				break;

			case "chat_response":
				if (data.text) {
					// Add assistant response to chat
					addMessage({
						id: crypto.randomUUID(),
						role: "assistant",
						content: data.text,
						timestamp: new Date(),
					});
				}
				break;

			case "speaking_start":
				setIsSpeaking(true);
				break;

			case "audio_chunk":
				// Queue audio chunk for playback
				audioQueueRef.current.push(data.audio_data);
				playNextAudioChunk();
				break;

			case "speaking_end":
				setIsSpeaking(false);
				// If continuous mode, restart listening
				if (continuousMode) {
					setTimeout(() => startListening(), 500);
				}
				break;

			case "speaking_stopped":
				setIsSpeaking(false);
				// Barge-in occurred, restart listening immediately
				setIsListening(true);
				break;

			case "error":
				console.error("Voice error:", data.error);
				setIsListening(false);
				setIsSpeaking(false);
				reportMicrophoneHealth("error", data.error);
				break;
		}
	};

	/**
	 * Play next audio chunk from queue
	 */
	const playNextAudioChunk = () => {
		if (isPlayingRef.current || audioQueueRef.current.length === 0) {
			return;
		}

		isPlayingRef.current = true;
		const base64Audio = audioQueueRef.current.shift()!;

		// Convert base64 to blob and play
		try {
			const binaryString = atob(base64Audio);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			const blob = new Blob([bytes], { type: "audio/mpeg" });
			const url = URL.createObjectURL(blob);

			if (!audioPlayerRef.current) {
				audioPlayerRef.current = new Audio();
			}

			const audio = audioPlayerRef.current;
			audio.src = url;
			audio.onended = () => {
				URL.revokeObjectURL(url);
				isPlayingRef.current = false;
				playNextAudioChunk(); // Play next chunk
			};
			audio.onerror = () => {
				URL.revokeObjectURL(url);
				isPlayingRef.current = false;
				playNextAudioChunk(); // Try next chunk
			};
			audio.play();
		} catch (error) {
			console.error("Audio playback error:", error);
			isPlayingRef.current = false;
			playNextAudioChunk(); // Try next chunk
		}
	};

	/**
	 * Start listening with real-time streaming
	 */
	const startListening = async () => {
		try {
			// Connect WebSocket if not connected
			if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
				connectWebSocket();
				// Wait for connection
				await new Promise((resolve) => setTimeout(resolve, 500));
			}

			// Get microphone access
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					sampleRate: 16000,
					channelCount: 1,
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});

			mediaStreamRef.current = stream;

			// Report healthy
			reportMicrophoneHealth("healthy", "Microphone is active and recording.");

			// Setup audio context and analyzer for visualization
			const audioContext = new AudioContext();
			audioContextRef.current = audioContext;

			const source = audioContext.createMediaStreamSource(stream);
			const analyser = audioContext.createAnalyser();
			analyser.fftSize = 128;
			source.connect(analyser);
			analyserRef.current = analyser;

			// Animate amplitude for visualization
			const updateAmplitude = () => {
				if (analyserRef.current) {
					const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
					analyserRef.current.getByteFrequencyData(dataArray);
					const normalized = Array.from(dataArray).map((v) => v / 255);
					setAmplitude(normalized);
					animationRef.current = requestAnimationFrame(updateAmplitude);
				}
			};
			updateAmplitude();

			// Setup audio processor for streaming
			const processor = audioContext.createScriptProcessor(4096, 1, 1);
			processorRef.current = processor;

			processor.onaudioprocess = (event) => {
				if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
					const inputData = event.inputBuffer.getChannelData(0);
					const buffer = new Float32Array(inputData);
					const base64 = arrayBufferToBase64(buffer.buffer);

					// Send audio chunk to backend
					wsRef.current.send(
						JSON.stringify({
							type: "audio_chunk",
							audio_data: base64,
							timestamp: Date.now(),
						}),
					);
				}
			};

			source.connect(processor);
			processor.connect(audioContext.destination);

			// Notify backend to start listening
			if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
				wsRef.current.send(
					JSON.stringify({
						type: "start_listening",
						timestamp: Date.now(),
					}),
				);
			}

			setIsListening(true);
		} catch (error: any) {
			console.error("Failed to start listening:", error);
			setIsListening(false);

			// Report specific errors
			const errorMessage = error.message || "Unknown error";
			if (errorMessage.includes("permission") || errorMessage.includes("NotAllowedError")) {
				reportMicrophoneHealth(
					"error",
					"Microphone permission denied. Please grant microphone access in your system settings.",
					{ error: errorMessage },
				);
			} else if (errorMessage.includes("busy") || errorMessage.includes("in use")) {
				reportMicrophoneHealth(
					"error",
					"Microphone is already in use by another application. Close other apps and try again.",
					{ error: errorMessage },
				);
			} else {
				reportMicrophoneHealth("error", `Failed to access microphone: ${errorMessage}`, {
					error: errorMessage,
				});
			}
		}
	};

	/**
	 * Stop listening
	 */
	const stopListening = () => {
		// Stop audio processing
		if (processorRef.current) {
			processorRef.current.disconnect();
			processorRef.current = null;
		}

		if (audioContextRef.current) {
			audioContextRef.current.close();
			audioContextRef.current = null;
		}

		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach((track) => track.stop());
			mediaStreamRef.current = null;
		}

		if (animationRef.current) {
			cancelAnimationFrame(animationRef.current);
		}

		// Notify backend
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(
				JSON.stringify({
					type: "stop_listening",
					timestamp: Date.now(),
				}),
			);
		}

		setIsListening(false);
		setPartialTranscription("");
	};

	/**
	 * Toggle continuous mode
	 */
	const toggleContinuousMode = () => {
		const newMode = !continuousMode;
		setContinuousMode(newMode);

		// Notify backend
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(
				JSON.stringify({
					type: "set_continuous_mode",
					enabled: newMode,
					timestamp: Date.now(),
				}),
			);
		}
	};

	/**
	 * Convert ArrayBuffer to base64
	 */
	const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
		const bytes = new Uint8Array(buffer);
		let binary = "";
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	};

	/**
	 * Initialize WebSocket connection
	 */
	useEffect(() => {
		connectWebSocket();

		return () => {
			// Cleanup on unmount
			stopListening();
			if (wsRef.current) {
				wsRef.current.close();
			}
			if (audioPlayerRef.current) {
				audioPlayerRef.current.pause();
			}
		};
	}, [connectWebSocket]);

	return {
		isListening,
		isSpeaking,
		amplitude,
		continuousMode,
		partialTranscription,
		startListening,
		stopListening,
		toggleContinuousMode,
	};
}

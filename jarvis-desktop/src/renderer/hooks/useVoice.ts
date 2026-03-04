import { useEffect, useRef, useState } from "react";
import { audioService } from "../services/audio-service";
import { useConversationStore } from "../store/conversation-store";

// Helper to report microphone health via IPC
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

export function useVoice() {
	const [isListening, setIsListening] = useState(false);
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [amplitude, setAmplitude] = useState<number[]>(new Array(40).fill(0));

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const animationRef = useRef<number>();
	const outputAnimationRef = useRef<number>();
	const { sendMessage } = useConversationStore();

	const startListening = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;
			audioChunksRef.current = [];

			// Report microphone health
			reportMicrophoneHealth("healthy", "Microphone is active and ready to record audio.");

			// Setup audio analysis
			const audioContext = new AudioContext();
			const source = audioContext.createMediaStreamSource(stream);
			const analyser = audioContext.createAnalyser();
			analyser.fftSize = 128;
			source.connect(analyser);
			analyserRef.current = analyser;

			// Animate amplitude
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

			mediaRecorder.ondataavailable = (event) => {
				audioChunksRef.current.push(event.data);
			};

			mediaRecorder.onstop = async () => {
				const audioBlob = new Blob(audioChunksRef.current, {
					type: "audio/wav",
				});
				const arrayBuffer = await audioBlob.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);

				const api = (window as any).jarvisAPI;
				if (!api?.voiceInput) {
					stream.getTracks().forEach((track) => track.stop());
					if (animationRef.current) cancelAnimationFrame(animationRef.current);
					return;
				}

				try {
					const text = await api.voiceInput(buffer);
					// Send transcribed text to conversation
					if (text) {
						await sendMessage(text);
						reportMicrophoneHealth("healthy", "Voice input processed successfully.");
					}
				} catch (error: any) {
					console.error("Voice input failed:", error);
					reportMicrophoneHealth(
						"error",
						`Failed to process voice input: ${error.message || "Unknown error"}. Check your internet connection and try again.`,
						{ error: error.message },
					);
				}

				stream.getTracks().forEach((track) => track.stop());
				if (animationRef.current) {
					cancelAnimationFrame(animationRef.current);
				}
			};

			mediaRecorder.start();
			setIsListening(true);
		} catch (error: any) {
			console.error("Failed to start listening:", error);
			setIsListening(false);

			// Report error to Health API
			const errorMessage = error.message || "Unknown error";
			if (errorMessage.includes("permission") || errorMessage.includes("NotAllowedError")) {
				reportMicrophoneHealth(
					"error",
					"Microphone permission denied. Please grant microphone access in your browser or system settings.",
					{ error: errorMessage },
				);
			} else if (errorMessage.includes("busy") || errorMessage.includes("in use")) {
				reportMicrophoneHealth(
					"error",
					"Microphone is already in use by another application. Close other apps using the microphone and try again.",
					{ error: errorMessage },
				);
			} else if (errorMessage.includes("not found") || errorMessage.includes("NotFoundError")) {
				reportMicrophoneHealth(
					"error",
					"Microphone not found. Make sure a microphone is connected to your device.",
					{ error: errorMessage },
				);
			} else {
				reportMicrophoneHealth("error", `Failed to access microphone: ${errorMessage}`, {
					error: errorMessage,
				});
			}
		}
	};

	const stopListening = () => {
		if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
			mediaRecorderRef.current.stop();
			setIsListening(false);
		}
	};

	useEffect(() => {
		// Listen for voice activation from tray (only in Electron; jarvisAPI is undefined in browser).
		const api = (window as any).jarvisAPI;
		if (api?.onVoiceActivate) {
			api.onVoiceActivate(() => {
				if (!isListening) {
					startListening();
				}
			});
		}

		return () => {
			stopListening();
		};
	}, [isListening]);

	// Setup audio output visualization for when Jarvis is speaking
	useEffect(() => {
		const handleSpeechStart = () => {
			setIsSpeaking(true);

			// Animate output amplitude
			const updateOutputAmplitude = () => {
				const analyser = audioService.getAnalyser();
				if (analyser && isSpeaking) {
					const dataArray = new Uint8Array(analyser.frequencyBinCount);
					analyser.getByteFrequencyData(dataArray);

					const normalized = Array.from(dataArray).map((v) => Math.min(1, v / 255));
					const bars = new Array(40).fill(0).map((_, i) => {
						const index = Math.floor((i / 40) * normalized.length);
						return normalized[index] || 0;
					});

					setAmplitude(bars);
					outputAnimationRef.current = requestAnimationFrame(updateOutputAmplitude);
				}
			};
			updateOutputAmplitude();
		};

		const handleSpeechEnd = () => {
			setIsSpeaking(false);
			if (outputAnimationRef.current) {
				cancelAnimationFrame(outputAnimationRef.current);
			}
			// Fade out
			let fadeValue = 0.1;
			const fadeInterval = setInterval(() => {
				fadeValue *= 0.8;
				if (fadeValue < 0.01) {
					clearInterval(fadeInterval);
					setAmplitude(new Array(40).fill(0));
				} else {
					setAmplitude(new Array(40).fill(fadeValue));
				}
			}, 50);
		};

		// Register callbacks
		audioService.onSpeechStart(handleSpeechStart);
		audioService.onSpeechEnd(handleSpeechEnd);

		return () => {
			if (outputAnimationRef.current) {
				cancelAnimationFrame(outputAnimationRef.current);
			}
		};
	}, [isSpeaking]);

	return {
		isListening,
		isSpeaking,
		amplitude,
		startListening,
		stopListening,
	};
}

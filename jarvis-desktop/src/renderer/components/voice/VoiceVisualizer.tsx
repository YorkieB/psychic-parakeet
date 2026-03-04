import { Mic, MicOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useVoice } from "../../hooks/useVoice";
import { audioService } from "../../services/audio-service";
import { VoiceWaveform } from "./VoiceWaveform";

export function VoiceVisualizer() {
	const { isListening, isSpeaking, startListening, stopListening, amplitude } = useVoice();
	const [status, setStatus] = useState("Ready to assist...");

	useEffect(() => {
		if (isListening) {
			setStatus("Listening...");
		} else if (isSpeaking) {
			setStatus("Speaking...");
		} else {
			setStatus("Ready to assist...");
		}
	}, [isListening, isSpeaking]);

	// Test KITT Scanner button
	const testKITTScanner = () => {
		// Trigger scanner for 5 seconds
		audioService.notifySpeechStart();

		// Use browser TTS for testing
		const utterance = new SpeechSynthesisUtterance(
			"Turbo boost activated, Michael! KITT scanner is now operational.",
		);
		utterance.rate = 0.9;
		utterance.pitch = 0.8;
		utterance.onend = () => {
			audioService.notifySpeechEnd();
		};

		window.speechSynthesis.speak(utterance);
	};

	// Removed spacebar hotkey - too annoying as it's the most used key
	// Users can click the mic button instead

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-4">
					{/* KITT-style animated icon */}
					<div
						className={`
            relative w-16 h-16 rounded-2xl flex items-center justify-center
            ${
							isListening
								? "bg-gradient-to-br from-red-600 to-red-800 shadow-lg shadow-red-600/50"
								: isSpeaking
									? "bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/70 animate-pulse"
									: "bg-gradient-to-br from-gray-700 to-gray-900 shadow-lg"
						}
          `}
					>
						{isListening ? (
							<Mic className="w-8 h-8 text-red-100" />
						) : isSpeaking ? (
							<div className="relative">
								<Mic className="w-8 h-8 text-red-50 animate-pulse" />
								{/* Pulsing rings for KITT effect */}
								<div className="absolute inset-0 rounded-full animate-ping bg-red-500 opacity-30" />
								<div
									className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-20"
									style={{ animationDelay: "0.3s" }}
								/>
							</div>
						) : (
							<MicOff className="w-8 h-8 text-gray-400" />
						)}

						{/* Scanner ripple effect */}
						{(isListening || isSpeaking) && (
							<>
								<div className="absolute inset-0 rounded-2xl animate-ping bg-red-600 opacity-25" />
								<div
									className="absolute inset-0 rounded-2xl animate-ping bg-red-500 opacity-15"
									style={{ animationDelay: "0.5s" }}
								/>
							</>
						)}
					</div>

					<div>
						<h3
							className={`text-2xl font-bold ${
								isSpeaking
									? "bg-gradient-to-r from-red-500 via-red-600 to-red-700 bg-clip-text text-transparent animate-pulse"
									: "bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent"
							}`}
						>
							VOICE ASSISTANT
						</h3>
						<p
							className={`text-sm font-medium ${
								isListening
									? "text-red-500 animate-pulse"
									: isSpeaking
										? "text-red-400"
										: "text-gray-600 dark:text-gray-400"
							}`}
						>
							{status}
						</p>
					</div>
				</div>

				<button
					onClick={isListening ? stopListening : startListening}
					className={`
            px-6 py-3 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl
            transform hover:-translate-y-0.5 transition-all flex items-center space-x-2
            ${
							isListening || isSpeaking
								? "bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white"
								: "bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800 text-white"
						}
          `}
				>
					<Mic className="w-4 h-4" />
					<span>{isListening ? "Stop Recording" : "Start Voice"}</span>
				</button>

				{/* TEST KITT SCANNER BUTTON */}
				<button
					onClick={testKITTScanner}
					className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center space-x-2"
					title="Test KITT Scanner Effect"
				>
					<span>🚗</span>
					<span>TEST KITT</span>
				</button>
			</div>

			{/* KITT-style Scanner Display */}
			<div className="relative rounded-xl overflow-hidden bg-black border border-red-900/30 p-4 shadow-[0_0_20px_rgba(255,0,0,0.2)]">
				{/* Grid lines effect (like KITT dashboard) */}
				<div className="absolute inset-0 opacity-10">
					<div className="grid grid-cols-10 h-full">
						{Array.from({ length: 10 }).map((_, i) => (
							<div key={i} className="border-r border-red-500/30" />
						))}
					</div>
				</div>

				{/* Status indicator */}
				<div className="absolute top-2 right-2 flex items-center space-x-2 text-xs">
					<div
						className={`w-2 h-2 rounded-full ${
							isListening
								? "bg-red-500 animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.8)]"
								: isSpeaking
									? "bg-red-400 animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.6)]"
									: "bg-gray-600"
						}`}
					/>
					<span
						className={`font-mono ${isListening || isSpeaking ? "text-red-400" : "text-gray-600"}`}
					>
						{isListening ? "REC" : isSpeaking ? "PLAY" : "IDLE"}
					</span>
				</div>

				<VoiceWaveform amplitude={amplitude} isActive={isListening || isSpeaking} />

				{/* Bottom "KNIGHT INDUSTRIES" text effect */}
				<div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-[10px] font-mono text-red-900/50 tracking-widest">
					KNIGHT INDUSTRIES AI ASSISTANT
				</div>
			</div>
		</div>
	);
}

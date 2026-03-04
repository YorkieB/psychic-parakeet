/**
 * Real-Time Voice Visualizer with Streaming, TTS, Barge-In, and Continuous Mode
 * Enhanced version with full real-time capabilities
 */

import { Mic, MicOff, Repeat, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useVoiceRealTime } from "../../hooks/useVoiceRealTime";
import { VoiceWaveform } from "./VoiceWaveform";

export function VoiceVisualizerRealTime() {
	const {
		isListening,
		isSpeaking,
		amplitude,
		continuousMode,
		partialTranscription,
		startListening,
		stopListening,
		toggleContinuousMode,
	} = useVoiceRealTime();

	const [status, setStatus] = useState("Ready to assist...");

	useEffect(() => {
		if (isListening) {
			setStatus(partialTranscription || "Listening...");
		} else if (isSpeaking) {
			setStatus("Speaking...");
		} else {
			setStatus("Ready to assist...");
		}
	}, [isListening, isSpeaking, partialTranscription]);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-4">
					{/* Animated microphone icon */}
					<div
						className={`
            relative w-16 h-16 rounded-2xl flex items-center justify-center
            ${
							isListening
								? "bg-gradient-to-br from-red-500 to-pink-500 shadow-lg shadow-red-500/50"
								: isSpeaking
									? "bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/50"
									: "bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/50"
						}
            ${isListening || isSpeaking ? "animate-pulse" : ""}
          `}
					>
						{isListening ? (
							<Mic className="w-8 h-8 text-white" />
						) : isSpeaking ? (
							<Volume2 className="w-8 h-8 text-white" />
						) : (
							<MicOff className="w-8 h-8 text-white" />
						)}

						{/* Ripple effect */}
						{isListening && (
							<div className="absolute inset-0 rounded-2xl animate-ping bg-red-500 opacity-20" />
						)}
						{isSpeaking && (
							<div className="absolute inset-0 rounded-2xl animate-ping bg-green-500 opacity-20" />
						)}
					</div>

					<div>
						<h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
							VOICE ASSISTANT
						</h3>
						<p
							className={`text-sm font-medium ${
								isListening
									? "text-red-500"
									: isSpeaking
										? "text-green-500"
										: "text-gray-600 dark:text-gray-400"
							}`}
						>
							{status}
						</p>
						{partialTranscription && (
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
								"{partialTranscription}"
							</p>
						)}
					</div>
				</div>

				<div className="flex items-center space-x-3">
					{/* Continuous Mode Toggle */}
					<button
						onClick={toggleContinuousMode}
						className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center space-x-2 ${
							continuousMode
								? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
								: "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
						}`}
						title={continuousMode ? "Continuous mode ON" : "Continuous mode OFF"}
					>
						<Repeat className="w-4 h-4" />
						<span>{continuousMode ? "Continuous" : "Single"}</span>
					</button>

					{/* Main Voice Button */}
					<button
						onClick={isListening ? stopListening : startListening}
						disabled={isSpeaking}
						className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:transform-none flex items-center space-x-2"
					>
						<Mic className="w-4 h-4" />
						<span>
							{isListening ? "Stop Recording" : isSpeaking ? "Speaking..." : "Start Voice"}
						</span>
					</button>
				</div>
			</div>

			{/* Colorful Waveform */}
			<div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 p-4">
				<VoiceWaveform amplitude={amplitude} isActive={isListening || isSpeaking} />
			</div>

			{/* Status Indicators */}
			<div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
				<div className="flex items-center space-x-4">
					<div className="flex items-center space-x-1">
						<div
							className={`w-2 h-2 rounded-full ${isListening ? "bg-red-500 animate-pulse" : "bg-gray-300"}`}
						/>
						<span>Listening</span>
					</div>
					<div className="flex items-center space-x-1">
						<div
							className={`w-2 h-2 rounded-full ${isSpeaking ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
						/>
						<span>Speaking</span>
					</div>
					<div className="flex items-center space-x-1">
						<div
							className={`w-2 h-2 rounded-full ${continuousMode ? "bg-blue-500 animate-pulse" : "bg-gray-300"}`}
						/>
						<span>Continuous</span>
					</div>
				</div>
				<div className="text-xs">
					<span className="font-semibold">Real-Time Mode</span> • Barge-In Enabled
				</div>
			</div>
		</div>
	);
}

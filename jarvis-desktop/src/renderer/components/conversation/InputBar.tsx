import { Mic, Send } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useVoice } from "../../hooks/useVoice";
import { useConversationStore } from "../../store/conversation-store";

export function InputBar() {
	const [input, setInput] = useState("");
	const { sendMessage } = useConversationStore();
	const { isListening, startListening, stopListening } = useVoice();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim()) return;

		await sendMessage(input);
		setInput("");
	};

	// Ensure Space is never captured by parent/window (e.g. voice hotkeys); keep it in the input.
	// Use both bubble and capture so no global listener can intercept.
	const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === " ") {
			e.stopPropagation();
		}
	};
	const handleInputKeyDownCapture = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === " ") {
			e.stopPropagation();
		}
	};

	return (
		<form onSubmit={handleSubmit} className="p-3 sm:p-4">
			<div className="flex items-center gap-2 sm:gap-3">
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleInputKeyDown}
					onKeyDownCapture={handleInputKeyDownCapture}
					placeholder="Type a message or use Voice..."
					className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
					aria-label="Chat message"
				/>

				<button
					type="button"
					onClick={isListening ? stopListening : startListening}
					className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all ${
						isListening
							? "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white animate-pulse"
							: "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
					}`}
					title={isListening ? "Click to stop and send" : "Click to start voice input"}
				>
					<Mic className="w-4 h-4" />
					<span>{isListening ? "Stop & Send" : "Voice"}</span>
				</button>

				<button
					type="submit"
					disabled={!input.trim()}
					className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:transform-none"
				>
					<Send className="w-5 h-5" />
				</button>
			</div>
		</form>
	);
}

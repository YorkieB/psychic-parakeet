import { AlertCircle, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useConversationStore } from "../../store/conversation-store";
import { InputBar } from "./InputBar";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

export function ConversationPanel() {
	const { messages, isTyping, connectionError, dismissConnectionError } = useConversationStore();
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	return (
		<div className="flex flex-col h-full min-h-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden">
			{/* Header */}
			<div className="p-3 border-b border-gray-200/50 dark:border-slate-700/50 flex-shrink-0">
				<h3 className="text-lg font-bold text-gray-900 dark:text-white">CONVERSATION</h3>
			</div>

			{/* Backend connection warning */}
			{connectionError && (
				<div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-2 bg-amber-500/20 dark:bg-amber-600/20 border-b border-amber-500/30 text-amber-800 dark:text-amber-200 text-sm">
					<span className="flex items-center gap-2">
						<AlertCircle className="w-4 h-4 flex-shrink-0" />
						Backend not reachable. Start the Jarvis server (port 3000) to use chat.
					</span>
					<button
						type="button"
						onClick={dismissConnectionError}
						className="p-1 rounded hover:bg-amber-500/30"
						aria-label="Dismiss"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* Messages - scrollable area with min height so input is never squashed */}
			<div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-h-[120px]">
				{messages.length === 0 ? (
					<div className="flex items-center justify-center min-h-[140px]">
						<div className="text-center text-gray-500 dark:text-gray-400 px-4">
							<p className="text-lg mb-2">No messages yet</p>
							<p className="text-sm">Type below or use the Voice button to start a conversation.</p>
						</div>
					</div>
				) : (
					<>
						{messages.map((message) => (
							<MessageBubble key={message.id} message={message} />
						))}

						{isTyping && <TypingIndicator />}

						<div ref={messagesEndRef} />
					</>
				)}
			</div>

			{/* Input - always visible at bottom */}
			<div className="flex-shrink-0 border-t border-gray-200/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/50">
				<InputBar />
			</div>
		</div>
	);
}

import { format } from "date-fns";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
	attachments?: any[];
}

interface MessageBubbleProps {
	message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
	const isUser = message.role === "user";

	return (
		<div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
			<div
				className={`
        max-w-[70%] rounded-2xl px-5 py-3 shadow-lg
        ${
					isUser
						? "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white"
						: "bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-2 border-purple-200 dark:border-purple-900/30"
				}
      `}
			>
				<p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

				{/* Attachments with colors */}
				{message.attachments && message.attachments.length > 0 && (
					<div className="mt-3 space-y-2">
						{message.attachments.map((attachment, idx) => (
							<div key={idx} className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
								{attachment.type === "music" && (
									<div className="flex items-center space-x-3">
										<div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
											<span className="text-xl">🎵</span>
										</div>
										<div className="flex-1">
											<p className="text-sm font-semibold">{attachment.title}</p>
											<p className="text-xs opacity-80">Ready to play</p>
										</div>
										<button className="px-3 py-1 bg-white/30 hover:bg-white/40 rounded-lg text-xs font-semibold">
											Play
										</button>
									</div>
								)}
							</div>
						))}
					</div>
				)}

				<p
					className={`text-xs mt-2 ${isUser ? "text-white/70" : "text-gray-500 dark:text-gray-400"}`}
				>
					{format(message.timestamp, "h:mm a")}
				</p>
			</div>
		</div>
	);
}

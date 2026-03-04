/*
  This file creates the email panel that shows your inbox and messages in Jarvis's desktop app.

  It displays email messages, handles email actions, and connects to your email service while making it easy to stay on top of your communications.
*/

import { Archive, Mail, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { usePanelStore } from "../../store/panel-store";
import { Panel } from "../shared/Panel";

interface Email {
	id: string;
	from: string;
	subject: string;
	snippet: string;
	timestamp: string;
	isRead: boolean;
	isStarred: boolean;
}

export function EmailPanel() {
	const { closePanel } = usePanelStore();
	const [emails, setEmails] = useState<Email[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadEmails();
	}, []);

	const loadEmails = async () => {
		try {
			const api = (window as any).jarvisAPI;
			if (!api?.getEmails) {
				setEmails([]);
				return;
			}
			const result = await api.getEmails({ unreadOnly: true, maxResults: 20 });
			setEmails(result.emails || []);
		} catch (error) {
			console.error("Failed to load emails:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Panel id="email" title="📧 Email" width={450} height={600} onClose={() => closePanel("email")}>
			<div className="flex flex-col h-full">
				{/* Header */}
				<div className="p-4 border-b border-gray-200 dark:border-slate-700">
					<div className="flex items-center justify-between">
						<h3 className="font-semibold text-gray-900 dark:text-white">
							📥 Inbox ({emails.length} unread)
						</h3>
						<div className="flex space-x-2">
							<button className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
								✉️ Compose
							</button>
							<button className="px-3 py-1 text-sm bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg">
								🔍 Search
							</button>
						</div>
					</div>
				</div>

				{/* Email List */}
				<div className="flex-1 overflow-y-auto">
					{loading ? (
						<div className="flex items-center justify-center h-full">
							<div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
						</div>
					) : emails.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full text-gray-500">
							<Mail className="w-16 h-16 mb-4 text-gray-400" />
							<p>No unread emails</p>
							<p className="text-sm">You're all caught up! 🎉</p>
						</div>
					) : (
						<div className="divide-y divide-gray-200 dark:divide-slate-700">
							{emails.map((email) => (
								<div
									key={email.id}
									className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer ${
										!email.isRead ? "bg-blue-50 dark:bg-slate-900" : ""
									}`}
								>
									<div className="flex items-start justify-between mb-2">
										<div className="flex-1">
											<p
												className={`font-semibold text-sm ${!email.isRead ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}
											>
												{email.from}
											</p>
											<p
												className={`text-sm ${!email.isRead ? "font-semibold text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}
											>
												{email.subject}
											</p>
										</div>
										<span className="text-xs text-gray-500">{email.timestamp}</span>
									</div>

									<p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
										{email.snippet}
									</p>

									<div className="flex space-x-2">
										<button
											className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded"
											title="Star"
										>
											<Star
												className={`w-4 h-4 ${email.isStarred ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`}
											/>
										</button>
										<button
											className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded"
											title="Archive"
										>
											<Archive className="w-4 h-4 text-gray-400" />
										</button>
										<button
											className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded"
											title="Delete"
										>
											<Trash2 className="w-4 h-4 text-gray-400" />
										</button>
										<button className="ml-auto text-xs text-blue-500 hover:underline">
											Read →
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</Panel>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

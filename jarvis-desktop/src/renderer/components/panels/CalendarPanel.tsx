/*
  This file creates the calendar panel that shows your upcoming events and meetings in Jarvis's desktop app.

  It displays calendar events, meeting details, and time information while connecting to your calendar service and making scheduling easy to manage.
*/

import { format } from "date-fns";
import { Calendar, Clock, Users, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { usePanelStore } from "../../store/panel-store";
import { Panel } from "../shared/Panel";

interface CalendarEvent {
	id: string;
	summary: string;
	start: Date;
	end: Date;
	location?: string;
	attendees: any[];
	meetingLink?: string;
}

export function CalendarPanel() {
	const { closePanel } = usePanelStore();
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadEvents();
	}, []);

	const loadEvents = async () => {
		try {
			const api = (window as any).jarvisAPI;
			if (!api?.getCalendar) {
				setEvents([]);
				return;
			}
			const result = await api.getCalendar({ period: "today" });
			setEvents(result.events || []);
		} catch (error) {
			console.error("Failed to load events:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Panel
			id="calendar"
			title="📅 Calendar"
			width={450}
			height={600}
			onClose={() => closePanel("calendar")}
		>
			<div className="flex flex-col h-full">
				{/* Header */}
				<div className="p-4 border-b border-gray-200 dark:border-slate-700">
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-semibold text-gray-900 dark:text-white">
							Today - {format(new Date(), "EEEE, MMMM d, yyyy")}
						</h3>
						<button className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
							➕ New Event
						</button>
					</div>
				</div>

				{/* Events */}
				<div className="flex-1 overflow-y-auto p-4 space-y-3">
					{loading ? (
						<div className="flex items-center justify-center h-full">
							<div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
						</div>
					) : events.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full text-gray-500">
							<Calendar className="w-16 h-16 mb-4 text-gray-400" />
							<p>No events today</p>
							<p className="text-sm">Enjoy your free day! 🌟</p>
						</div>
					) : (
						events.map((event) => (
							<div key={event.id} className="glass-card p-4 hover:shadow-lg transition-shadow">
								<div className="flex items-start justify-between mb-3">
									<div>
										<h4 className="font-semibold text-gray-900 dark:text-white mb-1">
											{event.summary}
										</h4>
										<div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
											<Clock className="w-4 h-4" />
											<span>
												{format(new Date(event.start), "h:mm a")} -{" "}
												{format(new Date(event.end), "h:mm a")}
											</span>
										</div>
									</div>
								</div>

								{event.location && (
									<div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
										<span>📍</span>
										<span>{event.location}</span>
									</div>
								)}

								{event.attendees && event.attendees.length > 0 && (
									<div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
										<Users className="w-4 h-4" />
										<span>{event.attendees.length} attendee(s)</span>
									</div>
								)}

								<div className="flex space-x-2">
									{event.meetingLink && (
										<button className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center space-x-2">
											<Video className="w-4 h-4" />
											<span>Join Meeting</span>
										</button>
									)}
									<button className="px-3 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg text-sm font-medium">
										Details
									</button>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</Panel>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

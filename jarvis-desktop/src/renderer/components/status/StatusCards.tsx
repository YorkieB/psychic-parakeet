import { Brain, Calendar, DollarSign, Mail, Music } from "lucide-react";
import { useAgentStatus } from "../../hooks/useAgentStatus";
import { usePanelStore } from "../../store/panel-store";
import { StatusCard } from "./StatusCard";

export function StatusCards() {
	const { togglePanel } = usePanelStore();
	const { badges } = useAgentStatus();

	const cards = [
		{
			id: "email",
			icon: Mail,
			title: "Email",
			value: `${badges.emailCount || 0} New`,
			subtitle: "Click →",
			color: "bg-blue-500",
		},
		{
			id: "calendar",
			icon: Calendar,
			title: "Sched",
			value: `${badges.eventCount || 0} Today`,
			subtitle: "Click →",
			color: "bg-green-500",
		},
		{
			id: "finance",
			icon: DollarSign,
			title: "Money",
			value: `£${badges.balance?.toLocaleString() || "0"}`,
			subtitle: "Click →",
			color: "bg-purple-500",
		},
		{
			id: "music",
			icon: Music,
			title: "Music",
			value: badges.musicPlaying ? "Playing" : "Ready",
			subtitle: "Click →",
			color: "bg-pink-500",
		},
		{
			id: "media",
			icon: Brain,
			title: "Art",
			value: `${badges.mediaCount || 0} New`,
			subtitle: "Click →",
			color: "bg-orange-500",
		},
	];

	return (
		<div className="grid grid-cols-5 gap-4">
			{cards.map((card) => (
				<StatusCard key={card.id} {...card} onClick={() => togglePanel(card.id)} />
			))}
		</div>
	);
}

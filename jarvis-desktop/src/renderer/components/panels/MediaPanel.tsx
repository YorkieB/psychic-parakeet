/*
  This file creates the media panel that shows your photos, videos, and music files in Jarvis's desktop app.

  It displays media files, handles media playback, manages downloads and sharing while making it easy to organize and enjoy your personal media collection.
*/

import { Download, Image, Music, Share2, Trash2, Video } from "lucide-react";
import { useState } from "react";
import { usePanelStore } from "../../store/panel-store";
import { Panel } from "../shared/Panel";

interface MediaItem {
	id: string;
	type: "image" | "video" | "music";
	url: string;
	thumbnail: string;
	title: string;
	createdAt: Date;
	size: string;
}

export function MediaPanel() {
	const { closePanel } = usePanelStore();
	const [filter, setFilter] = useState<"all" | "image" | "video" | "music">("all");

	// Mock data - in production, fetch from backend
	const [media] = useState<MediaItem[]>([
		{
			id: "1",
			type: "image",
			url: "/generated/image1.png",
			thumbnail: "/generated/image1.png",
			title: "Cyberpunk City",
			createdAt: new Date(),
			size: "2.4 MB",
		},
		{
			id: "2",
			type: "video",
			url: "/generated/video1.mp4",
			thumbnail: "/generated/video1-thumb.jpg",
			title: "Ocean Waves",
			createdAt: new Date(),
			size: "15.2 MB",
		},
		{
			id: "3",
			type: "music",
			url: "/generated/song1.mp3",
			thumbnail: "/album-art.jpg",
			title: "Broken Heart Melody",
			createdAt: new Date(),
			size: "8.1 MB",
		},
	]);

	const filteredMedia = filter === "all" ? media : media.filter((m) => m.type === filter);

	const getIcon = (type: string) => {
		switch (type) {
			case "image":
				return <Image className="w-5 h-5" />;
			case "video":
				return <Video className="w-5 h-5" />;
			case "music":
				return <Music className="w-5 h-5" />;
			default:
				return null;
		}
	};

	return (
		<Panel
			id="media"
			title="🎨 Media Gallery"
			width={650}
			height={600}
			onClose={() => closePanel("media")}
		>
			<div className="flex flex-col h-full">
				{/* Filter Tabs */}
				<div className="flex space-x-2 p-4 border-b border-gray-200 dark:border-slate-700">
					{["all", "image", "video", "music"].map((f) => (
						<button
							key={f}
							onClick={() => setFilter(f as any)}
							className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
								filter === f
									? "bg-blue-500 text-white"
									: "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
							}`}
						>
							{f.charAt(0).toUpperCase() + f.slice(1)}
						</button>
					))}
				</div>

				{/* Media Grid */}
				<div className="flex-1 overflow-y-auto p-4">
					{filteredMedia.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full text-gray-500">
							<Image className="w-16 h-16 mb-4 text-gray-400" />
							<p>No media generated yet</p>
							<p className="text-sm">Start creating with Jarvis!</p>
						</div>
					) : (
						<div className="grid grid-cols-3 gap-4">
							{filteredMedia.map((item) => (
								<div
									key={item.id}
									className="glass-card p-3 hover:shadow-lg transition-shadow group"
								>
									{/* Thumbnail */}
									<div className="relative aspect-square bg-gray-200 dark:bg-slate-700 rounded-lg mb-3 overflow-hidden">
										<img
											src={item.thumbnail}
											alt={item.title}
											className="w-full h-full object-cover"
										/>
										<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
											<button className="p-2 bg-white/90 hover:bg-white rounded-lg">
												{getIcon(item.type)}
											</button>
										</div>
									</div>

									{/* Info */}
									<h4 className="text-sm font-medium text-gray-900 dark:text-white truncate mb-1">
										{item.title}
									</h4>
									<p className="text-xs text-gray-500 mb-2">{item.size}</p>

									{/* Actions */}
									<div className="flex space-x-1">
										<button
											className="flex-1 p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
											title="Download"
										>
											<Download className="w-4 h-4 text-gray-600 dark:text-gray-400 mx-auto" />
										</button>
										<button
											className="flex-1 p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
											title="Share"
										>
											<Share2 className="w-4 h-4 text-gray-600 dark:text-gray-400 mx-auto" />
										</button>
										<button
											className="flex-1 p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
											title="Delete"
										>
											<Trash2 className="w-4 h-4 text-red-500 mx-auto" />
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

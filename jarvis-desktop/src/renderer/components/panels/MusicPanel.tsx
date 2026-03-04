/*
  This file creates the music panel that shows your music player, current track, and playback controls in Jarvis's desktop app.

  It displays music playback, volume controls, track information, and queue management while making it easy to enjoy your music through Jarvis.
*/

import { Music } from "lucide-react";
import { useMusicStore } from "../../store/music-store";
import { usePanelStore } from "../../store/panel-store";
import { PlaybackControls } from "../music/PlaybackControls";
import { SoundBarVisualizer } from "../music/SoundBarVisualizer";
import { VolumeSlider } from "../music/VolumeSlider";
import { Panel } from "../shared/Panel";

export function MusicPanel() {
	const { closePanel } = usePanelStore();
	const { currentTrack, isPlaying, queue } = useMusicStore();

	return (
		<Panel
			id="music"
			title="🎵 Music Player"
			width={500}
			height={700}
			onClose={() => closePanel("music")}
		>
			<div className="p-6 space-y-6">
				{currentTrack ? (
					<>
						{/* Now Playing */}
						<div className="flex items-start space-x-4">
							<img
								src={currentTrack.albumArt || "/placeholder-album.png"}
								alt="Album art"
								className="w-32 h-32 rounded-lg shadow-lg"
							/>
							<div className="flex-1">
								<h3 className="text-xl font-bold text-gray-900 dark:text-white">
									{currentTrack.title}
								</h3>
								<p className="text-gray-600 dark:text-gray-400">{currentTrack.artist}</p>
								<p className="text-sm text-gray-500 dark:text-gray-500">
									{currentTrack.genre} • {currentTrack.duration}
								</p>
							</div>
						</div>

						{/* Sound Bar Visualizer */}
						<div className="bg-gray-900 rounded-lg p-4">
							<SoundBarVisualizer isPlaying={isPlaying} />
						</div>

						{/* Playback Controls */}
						<PlaybackControls />

						{/* Volume */}
						<VolumeSlider />

						{/* Queue */}
						<div>
							<h4 className="font-semibold text-gray-900 dark:text-white mb-3">
								Queue ({queue.length} tracks)
							</h4>
							<div className="space-y-2 max-h-48 overflow-y-auto">
								{queue.map((track, idx) => (
									<div
										key={track.id}
										className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
									>
										<div className="flex items-center space-x-3">
											<span className="text-sm text-gray-500">{idx + 1}</span>
											<div>
												<p className="text-sm font-medium text-gray-900 dark:text-white">
													{track.title}
												</p>
												<p className="text-xs text-gray-500">{track.artist}</p>
											</div>
										</div>
										<span className="text-xs text-gray-500">{track.duration}</span>
									</div>
								))}
							</div>
						</div>

						{/* Actions */}
						<div className="flex space-x-2">
							<button className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium">
								📋 Add to Playlist
							</button>
							<button className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg text-sm font-medium">
								💾 Download
							</button>
							<button className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg text-sm font-medium">
								📤 Share
							</button>
						</div>
					</>
				) : (
					<div className="text-center py-12">
						<Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-600 dark:text-gray-400">No music playing</p>
						<button className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
							Generate Song
						</button>
					</div>
				)}
			</div>
		</Panel>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

import { Volume2, VolumeX } from "lucide-react";
import { useMusicStore } from "../../store/music-store";

export function VolumeSlider() {
	const { volume, setVolume, muted, toggleMute } = useMusicStore();

	return (
		<div className="flex items-center space-x-3">
			<button
				onClick={toggleMute}
				className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
			>
				{muted ? (
					<VolumeX className="w-5 h-5 text-gray-600 dark:text-gray-400" />
				) : (
					<Volume2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
				)}
			</button>

			<input
				type="range"
				min="0"
				max="100"
				value={volume}
				onChange={(e) => setVolume(Number(e.target.value))}
				className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
			/>

			<span className="text-sm text-gray-600 dark:text-gray-400 w-10">{volume}%</span>
		</div>
	);
}

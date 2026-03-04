import { Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { useMusicStore } from "../../store/music-store";

export function PlaybackControls() {
	const {
		isPlaying,
		currentTime,
		duration,
		shuffle,
		repeat,
		play,
		pause,
		skipPrevious,
		skipNext,
		toggleShuffle,
		toggleRepeat,
		seek,
	} = useMusicStore();

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	return (
		<div className="space-y-4">
			{/* Progress Bar */}
			<div className="space-y-2">
				<input
					type="range"
					min="0"
					max={duration}
					value={currentTime}
					onChange={(e) => seek(Number(e.target.value))}
					className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
				/>
				<div className="flex justify-between text-xs text-gray-500">
					<span>{formatTime(currentTime)}</span>
					<span>{formatTime(duration)}</span>
				</div>
			</div>

			{/* Controls */}
			<div className="flex items-center justify-center space-x-6">
				<button
					onClick={toggleShuffle}
					className={`p-2 rounded-lg ${shuffle ? "bg-blue-500 text-white" : "hover:bg-gray-100 dark:hover:bg-slate-700"}`}
				>
					<Shuffle className="w-5 h-5" />
				</button>

				<button
					onClick={skipPrevious}
					className="p-3 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
				>
					<SkipBack className="w-6 h-6" />
				</button>

				<button
					onClick={isPlaying ? pause : play}
					className="p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg"
				>
					{isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7" />}
				</button>

				<button
					onClick={skipNext}
					className="p-3 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
				>
					<SkipForward className="w-6 h-6" />
				</button>

				<button
					onClick={toggleRepeat}
					className={`p-2 rounded-lg ${repeat !== "off" ? "bg-blue-500 text-white" : "hover:bg-gray-100 dark:hover:bg-slate-700"}`}
				>
					<Repeat className="w-5 h-5" />
				</button>
			</div>
		</div>
	);
}

import { Howl } from "howler";
import { create } from "zustand";

interface Track {
	id: string;
	title: string;
	artist: string;
	duration: string;
	albumArt?: string;
	url: string;
	genre?: string;
}

interface MusicStore {
	currentTrack: Track | null;
	queue: Track[];
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	muted: boolean;
	shuffle: boolean;
	repeat: "off" | "one" | "all";
	howl: Howl | null;

	setTrack: (track: Track) => void;
	play: () => void;
	pause: () => void;
	stop: () => void;
	skipNext: () => void;
	skipPrevious: () => void;
	seek: (time: number) => void;
	setVolume: (volume: number) => void;
	toggleMute: () => void;
	toggleShuffle: () => void;
	toggleRepeat: () => void;
	addToQueue: (track: Track) => void;
}

export const useMusicStore = create<MusicStore>((set, get) => ({
	currentTrack: null,
	queue: [],
	isPlaying: false,
	currentTime: 0,
	duration: 0,
	volume: 75,
	muted: false,
	shuffle: false,
	repeat: "off",
	howl: null,

	setTrack: (track: Track) => {
		const { howl } = get();
		if (howl) {
			// Clear time interval if exists
			if ((howl as any)._timeInterval) {
				clearInterval((howl as any)._timeInterval);
			}
			howl.unload();
		}

		const newHowl = new Howl({
			src: [track.url],
			html5: true,
			onplay: () => {
				set({ isPlaying: true });
				// Start time update loop
				const interval = setInterval(() => {
					const { howl, isPlaying } = get();
					if (howl && isPlaying) {
						const time = howl.seek() as number;
						set({ currentTime: time });
					} else {
						clearInterval(interval);
					}
				}, 100);
				// Store interval ID for cleanup
				(newHowl as any)._timeInterval = interval;
			},
			onpause: () => set({ isPlaying: false }),
			onstop: () => {
				set({ isPlaying: false, currentTime: 0 });
				if ((newHowl as any)._timeInterval) {
					clearInterval((newHowl as any)._timeInterval);
				}
			},
			onend: () => {
				const { repeat, skipNext } = get();
				if ((newHowl as any)._timeInterval) {
					clearInterval((newHowl as any)._timeInterval);
				}
				if (repeat === "one") {
					get().play();
				} else if (repeat === "all" || get().queue.length > 0) {
					skipNext();
				} else {
					set({ isPlaying: false, currentTime: 0 });
				}
			},
		});

		set({
			currentTrack: track,
			howl: newHowl,
			duration: newHowl.duration() || 0,
		});
	},

	play: () => {
		const { howl } = get();
		if (howl) {
			howl.play();
		}
	},

	pause: () => {
		const { howl } = get();
		if (howl) {
			howl.pause();
		}
	},

	stop: () => {
		const { howl } = get();
		if (howl) {
			howl.stop();
		}
	},

	skipNext: () => {
		const { queue, currentTrack, shuffle } = get();
		if (queue.length > 0) {
			let nextTrack: Track;
			if (shuffle) {
				nextTrack = queue[Math.floor(Math.random() * queue.length)];
			} else {
				const currentIndex = currentTrack ? queue.findIndex((t) => t.id === currentTrack.id) : -1;
				nextTrack = queue[(currentIndex + 1) % queue.length];
			}
			set({ queue: queue.filter((t) => t.id !== nextTrack.id) });
			get().setTrack(nextTrack);
			get().play();
		}
	},

	skipPrevious: () => {
		get().seek(0);
	},

	seek: (time: number) => {
		const { howl } = get();
		if (howl) {
			howl.seek(time);
			set({ currentTime: time });
		}
	},

	setVolume: (volume: number) => {
		const { howl } = get();
		if (howl) {
			howl.volume(volume / 100);
		}
		set({ volume, muted: false });
	},

	toggleMute: () => {
		const { howl, muted } = get();
		if (howl) {
			howl.mute(!muted);
		}
		set({ muted: !muted });
	},

	toggleShuffle: () => {
		set((state) => ({ shuffle: !state.shuffle }));
	},

	toggleRepeat: () => {
		set((state) => ({
			repeat: state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off",
		}));
	},

	addToQueue: (track: Track) => {
		set((state) => ({
			queue: [...state.queue, track],
		}));
	},
}));

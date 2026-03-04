import { Howl } from "howler";

export class AudioService {
	private currentSound: Howl | null = null;
	private speechCallbacks: { onStart: (() => void)[]; onEnd: (() => void)[] } = {
		onStart: [],
		onEnd: [],
	};

	// Register callbacks for speech events
	onSpeechStart(callback: () => void) {
		this.speechCallbacks.onStart.push(callback);
	}

	onSpeechEnd(callback: () => void) {
		this.speechCallbacks.onEnd.push(callback);
	}

	// Public methods to trigger speech events
	public notifySpeechStart() {
		this.speechCallbacks.onStart.forEach((cb) => cb());
	}

	public notifySpeechEnd() {
		this.speechCallbacks.onEnd.forEach((cb) => cb());
	}

	private notifySpeechStartInternal() {
		this.speechCallbacks.onStart.forEach((cb) => cb());
	}

	private notifySpeechEndInternal() {
		this.speechCallbacks.onEnd.forEach((cb) => cb());
	}

	playNotification() {
		const sound = new Howl({
			src: ["/sounds/notification.mp3"],
			volume: 0.5,
		});
		sound.play();
	}

	playVoiceBeep() {
		const sound = new Howl({
			src: ["/sounds/voice-beep.mp3"],
			volume: 0.3,
		});
		sound.play();
	}

	// Play Jarvis speech with visualization
	playJarvisSpeech(audioData: ArrayBuffer | string) {
		if (this.currentSound) {
			this.currentSound.stop();
		}

		let src: string;
		if (typeof audioData === "string") {
			src = audioData;
		} else {
			const blob = new Blob([audioData], { type: "audio/mpeg" });
			src = URL.createObjectURL(blob);
		}

		this.currentSound = new Howl({
			src: [src],
			html5: true,
			onplay: () => this.notifySpeechStartInternal(),
			onend: () => this.notifySpeechEndInternal(),
			onstop: () => this.notifySpeechEndInternal(),
		});

		this.currentSound.play();
		return this.currentSound;
	}

	playMusic(url: string, onEnd?: () => void) {
		if (this.currentSound) {
			this.currentSound.stop();
		}

		this.currentSound = new Howl({
			src: [url],
			html5: true,
			onend: onEnd,
		});

		this.currentSound.play();
		return this.currentSound;
	}

	stopMusic() {
		if (this.currentSound) {
			this.currentSound.stop();
			this.currentSound = null;
			this.notifySpeechEndInternal();
		}
	}

	pauseMusic() {
		if (this.currentSound) {
			this.currentSound.pause();
		}
	}

	resumeMusic() {
		if (this.currentSound) {
			this.currentSound.play();
		}
	}

	setVolume(volume: number) {
		if (this.currentSound) {
			this.currentSound.volume(volume / 100);
		}
	}

	// Get audio analyser for real-time visualization
	getAnalyser(): AnalyserNode | null {
		if (this.currentSound && (this.currentSound as any)._sounds[0]) {
			const sound = (this.currentSound as any)._sounds[0];
			if (sound._node) {
				const audioContext = (Howler as any).ctx;
				const analyser = audioContext.createAnalyser();
				analyser.fftSize = 128;
				sound._node.connect(analyser);
				analyser.connect(audioContext.destination);
				return analyser;
			}
		}
		return null;
	}
}

export const audioService = new AudioService();

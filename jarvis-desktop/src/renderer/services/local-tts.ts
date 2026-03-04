/**
 * Local TTS client – calls the Coqui XTTS server (local-tts) with your voice file.
 * Low latency: runs on your PC, no cloud.
 */

const defaultUrl = "http://localhost:8020";

export interface LocalTTSOptions {
	speakerAudioPath: string;
	language?: string;
	baseUrl?: string;
}

let currentAudio: HTMLAudioElement | null = null;

/**
 * Check if the local TTS server is reachable.
 */
export async function isLocalTTSAvailable(baseUrl: string = defaultUrl): Promise<boolean> {
	try {
		const res = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, {
			method: "GET",
		});
		return res.ok;
	} catch {
		return false;
	}
}

/**
 * Speak text using the local XTTS server. Returns a promise that resolves when playback ends or fails.
 */
export function speakWithLocalVoice(text: string, options: LocalTTSOptions): Promise<void> {
	const baseUrl = (options.baseUrl || defaultUrl).replace(/\/$/, "");
	const language = (options.language || "en").slice(0, 2);
	const speakerPath = options.speakerAudioPath?.trim();
	if (!speakerPath || !text?.trim()) {
		return Promise.resolve();
	}

	return fetch(`${baseUrl}/tts`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			text: text.trim(),
			speaker_audio_path: speakerPath,
			language,
		}),
	})
		.then(async (res) => {
			if (!res.ok) {
				const err = await res.text();
				throw new Error(err || `Local TTS failed: ${res.status}`);
			}
			return res.arrayBuffer();
		})
		.then((arrayBuffer) => {
			return new Promise<void>((resolve, reject) => {
				const blob = new Blob([arrayBuffer], { type: "audio/wav" });
				const url = URL.createObjectURL(blob);
				const audio = new Audio();
				currentAudio = audio;
				audio.src = url;
				audio.onended = () => {
					URL.revokeObjectURL(url);
					if (currentAudio === audio) currentAudio = null;
					resolve();
				};
				audio.onerror = (_e) => {
					URL.revokeObjectURL(url);
					if (currentAudio === audio) currentAudio = null;
					reject(new Error("Local TTS playback failed"));
				};
				audio.play().catch(reject);
			});
		});
}

export function cancelLocalSpeech(): void {
	if (currentAudio) {
		currentAudio.pause();
		currentAudio.src = "";
		currentAudio = null;
	}
}

export function isLocalSpeechSpeaking(): boolean {
	return currentAudio != null && !currentAudio.paused && !currentAudio.ended;
}

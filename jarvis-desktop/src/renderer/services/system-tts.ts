/**
 * System TTS using the Web Speech API (your PC's installed voices).
 * Low latency – no network round-trip.
 */

let voicesCache: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
	const v = typeof window !== "undefined" ? window.speechSynthesis.getVoices() : [];
	if (v.length > 0) voicesCache = v;
	return voicesCache;
}

if (typeof window !== "undefined") {
	loadVoices();
	window.speechSynthesis.onvoiceschanged = () => loadVoices();
}

export function getSystemVoices(): SpeechSynthesisVoice[] {
	if (voicesCache.length === 0) loadVoices();
	return [...voicesCache];
}

export function getSystemVoiceByName(name: string): SpeechSynthesisVoice | null {
	const voices = getSystemVoices();
	return voices.find((v) => v.name === name) || null;
}

export function getDefaultSystemVoice(lang: string = "en"): SpeechSynthesisVoice | null {
	const voices = getSystemVoices();
	const match =
		voices.find((v) => v.lang.startsWith(lang) && v.default) ||
		voices.find((v) => v.lang.startsWith(lang)) ||
		voices.find((v) => v.default) ||
		voices[0] ||
		null;
	return match;
}

export function speakWithSystemVoice(
	text: string,
	options: {
		voiceName?: string;
		lang?: string;
		rate?: number;
		pitch?: number;
	} = {},
): void {
	if (typeof window === "undefined" || !window.speechSynthesis) return;

	window.speechSynthesis.cancel();

	const utterance = new SpeechSynthesisUtterance(text);
	utterance.rate = options.rate ?? 1;
	utterance.pitch = options.pitch ?? 1;
	if (options.lang) utterance.lang = options.lang;

	if (options.voiceName) {
		const voice = getSystemVoiceByName(options.voiceName);
		if (voice) utterance.voice = voice;
	} else {
		const defaultVoice = getDefaultSystemVoice(options.lang?.slice(0, 2) || "en");
		if (defaultVoice) utterance.voice = defaultVoice;
	}

	window.speechSynthesis.speak(utterance);
}

export function cancelSystemSpeech(): void {
	if (typeof window !== "undefined" && window.speechSynthesis) {
		window.speechSynthesis.cancel();
	}
}

export function isSystemSpeechSpeaking(): boolean {
	return typeof window !== "undefined" && window.speechSynthesis?.speaking;
}

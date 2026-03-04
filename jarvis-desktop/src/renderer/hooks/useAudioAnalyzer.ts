import { Howler } from "howler";
import { useEffect, useRef, useState } from "react";
import { useMusicStore } from "../store/music-store";

export function useAudioAnalyzer() {
	const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(100));
	const { howl, isPlaying } = useMusicStore();
	const animationRef = useRef<number>();
	const analyserRef = useRef<AnalyserNode | null>(null);

	useEffect(() => {
		if (howl && isPlaying) {
			try {
				// Get audio context from Howler
				const ctx = Howler.ctx;
				if (!ctx) return;

				// Create analyser
				const analyser = ctx.createAnalyser();
				analyser.fftSize = 256;
				analyserRef.current = analyser;

				// Connect to Howler's master gain
				const masterGain = (Howler as any).masterGain;
				if (masterGain) {
					masterGain.connect(analyser);
				}

				// Animate frequency data
				const updateFrequency = () => {
					if (analyserRef.current && isPlaying) {
						const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
						analyserRef.current.getByteFrequencyData(dataArray);
						setFrequencyData(dataArray);
						animationRef.current = requestAnimationFrame(updateFrequency);
					}
				};

				updateFrequency();
			} catch (error) {
				console.error("Failed to setup audio analyzer:", error);
			}
		}

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
		};
	}, [howl, isPlaying]);

	return { frequencyData };
}

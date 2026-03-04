import { useEffect, useRef } from "react";
import { useAudioAnalyzer } from "../../hooks/useAudioAnalyzer";

interface SoundBarVisualizerProps {
	isPlaying: boolean;
}

export function SoundBarVisualizer({ isPlaying }: SoundBarVisualizerProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const { frequencyData } = useAudioAnalyzer();
	const animationRef = useRef<number>();

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const barCount = 100;
		const barWidth = canvas.width / barCount;
		const maxHeight = canvas.height;

		const draw = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			for (let i = 0; i < barCount; i++) {
				const value = isPlaying ? (frequencyData[i] || 0) / 255 : Math.random() * 0.1;
				const height = value * maxHeight;
				const x = i * barWidth;
				const y = canvas.height - height;

				// Create gradient
				const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);

				// Color based on frequency (low = blue, mid = purple, high = pink)
				if (i < barCount / 3) {
					gradient.addColorStop(0, "#3B82F6"); // Blue
					gradient.addColorStop(1, "#60A5FA");
				} else if (i < (barCount * 2) / 3) {
					gradient.addColorStop(0, "#8B5CF6"); // Purple
					gradient.addColorStop(1, "#A78BFA");
				} else {
					gradient.addColorStop(0, "#EC4899"); // Pink
					gradient.addColorStop(1, "#F472B6");
				}

				ctx.fillStyle = gradient;
				ctx.fillRect(x, y, barWidth - 1, height);
			}

			animationRef.current = requestAnimationFrame(draw);
		};

		draw();

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
		};
	}, [frequencyData, isPlaying]);

	return <canvas ref={canvasRef} width={900} height={120} className="w-full rounded-lg" />;
}

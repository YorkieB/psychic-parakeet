import { useEffect, useRef, useState } from "react";

interface VoiceWaveformProps {
	amplitude: number[];
	isActive: boolean;
}

export function VoiceWaveform({ amplitude, isActive }: VoiceWaveformProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animationRef = useRef<number>();
	const scanPositionRef = useRef<number>(0);
	const scanDirectionRef = useRef<number>(1); // 1 = right, -1 = left
	const [trailIntensity, setTrailIntensity] = useState<number[]>(new Array(40).fill(0));
	const isFadingOutRef = useRef<boolean>(false);
	const fadeIntensityRef = useRef<number>(1);

	// Reset when becoming active
	useEffect(() => {
		if (isActive) {
			isFadingOutRef.current = false;
			fadeIntensityRef.current = 1;
		} else {
			// Start fade out when becoming inactive
			isFadingOutRef.current = true;
		}
	}, [isActive]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const barCount = 40;
		const barWidth = canvas.width / barCount;
		const maxHeight = canvas.height * 0.8;
		const scanSpeed = 0.8; // Speed of the KITT scanner
		const trailLength = 8; // How many bars trail behind

		const draw = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			if (isActive || isFadingOutRef.current) {
				// KNIGHT RIDER SCANNING EFFECT

				// Only update scan position if not fading out or still visible
				if (!isFadingOutRef.current || fadeIntensityRef.current > 0.1) {
					// Update scan position
					scanPositionRef.current += scanSpeed * scanDirectionRef.current;

					// Bounce at edges (like KITT)
					if (scanPositionRef.current >= barCount - 1) {
						scanPositionRef.current = barCount - 1;
						scanDirectionRef.current = -1;
					} else if (scanPositionRef.current <= 0) {
						scanPositionRef.current = 0;
						scanDirectionRef.current = 1;
					}
				}

				// Handle fade out
				if (isFadingOutRef.current) {
					fadeIntensityRef.current *= 0.92; // Smooth fade out
					if (fadeIntensityRef.current < 0.01) {
						fadeIntensityRef.current = 0;
						isFadingOutRef.current = false;
						// Reset scanner position for next time
						scanPositionRef.current = 0;
						scanDirectionRef.current = 1;
					}
				}

				// Update trail intensity
				const newTrail = new Array(barCount).fill(0);
				const currentPos = Math.floor(scanPositionRef.current);

				// Create the trailing effect
				for (let i = 0; i < barCount; i++) {
					const distance = Math.abs(i - currentPos);
					if (distance < trailLength) {
						// Intensity falls off with distance from scan position
						const baseIntensity = Math.max(0, 1 - distance / trailLength);
						newTrail[i] = baseIntensity * fadeIntensityRef.current;
					}
				}

				setTrailIntensity(newTrail);

				// Draw bars with KITT-style red glow
				for (let i = 0; i < barCount; i++) {
					const intensity = newTrail[i];
					const amp = amplitude[i] || 0.3; // Use audio amplitude for height variation

					// Height influenced by both intensity and amplitude
					const baseHeight = intensity * maxHeight * 0.7;
					const ampHeight = amp * maxHeight * 0.3;
					const height = Math.max(baseHeight + ampHeight, 4);

					const x = i * barWidth;
					const y = (canvas.height - height) / 2;

					if (intensity > 0) {
						// KITT Red Glow Effect
						const gradient = ctx.createLinearGradient(0, y, 0, y + height);

						// Brightest red at the center of the scan
						if (intensity > 0.7) {
							gradient.addColorStop(0, "#ff0000"); // Bright red
							gradient.addColorStop(0.5, "#ff4444"); // Medium red
							gradient.addColorStop(1, "#ff0000"); // Bright red

							// Add glow effect for brightest bars
							ctx.shadowBlur = 20;
							ctx.shadowColor = "#ff0000";
						} else {
							// Darker red for trailing bars
							const r = Math.floor(255 * intensity);
							gradient.addColorStop(0, `rgb(${r}, 0, 0)`);
							gradient.addColorStop(0.5, `rgb(${Math.floor(r * 1.2)}, 0, 0)`);
							gradient.addColorStop(1, `rgb(${r}, 0, 0)`);

							ctx.shadowBlur = 10 * intensity;
							ctx.shadowColor = `rgba(255, 0, 0, ${intensity})`;
						}

						ctx.fillStyle = gradient;
						ctx.fillRect(x + 1, y, barWidth - 3, height);

						// Reset shadow
						ctx.shadowBlur = 0;
					} else {
						// Dim idle bars (dark red)
						ctx.fillStyle = "#330000";
						ctx.fillRect(x + 1, y + height / 2 - 2, barWidth - 3, 4);
					}
				}

				// Add reflection effect at the bottom
				ctx.globalAlpha = 0.15;
				for (let i = 0; i < barCount; i++) {
					const intensity = newTrail[i];
					if (intensity > 0.3) {
						const amp = amplitude[i] || 0.3;
						const baseHeight = intensity * maxHeight * 0.7;
						const ampHeight = amp * maxHeight * 0.3;
						const height = Math.max(baseHeight + ampHeight, 4);

						const x = i * barWidth;
						const y = canvas.height / 2 + height / 2;

						const gradient = ctx.createLinearGradient(0, y, 0, y + height * 0.3);
						gradient.addColorStop(0, `rgba(255, 0, 0, ${intensity})`);
						gradient.addColorStop(1, "rgba(255, 0, 0, 0)");

						ctx.fillStyle = gradient;
						ctx.fillRect(x + 1, y, barWidth - 3, height * 0.3);
					}
				}
				ctx.globalAlpha = 1.0;
			} else {
				// Idle state - dim bars
				for (let i = 0; i < barCount; i++) {
					const x = i * barWidth;
					const y = canvas.height / 2 - 2;
					ctx.fillStyle = "#220000";
					ctx.fillRect(x + 1, y, barWidth - 3, 4);
				}
			}

			animationRef.current = requestAnimationFrame(draw);
		};

		draw();

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
		};
	}, [amplitude, isActive, trailIntensity]);

	return (
		<canvas
			ref={canvasRef}
			width={800}
			height={60}
			className="w-full h-16 rounded-lg bg-black"
			style={{
				boxShadow: isActive ? "0 0 20px rgba(255, 0, 0, 0.5)" : "none",
				border: "1px solid #440000",
			}}
		/>
	);
}

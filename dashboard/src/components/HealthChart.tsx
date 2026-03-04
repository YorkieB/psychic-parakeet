/*
  This file creates a health chart component that displays agent health metrics over time in Jarvis's dashboard.

  It shows real-time health data visualization, historical trends, performance metrics, and interactive charts while providing comprehensive health monitoring and analysis.
*/

import { Download, Pause, Play, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentStatus } from "../types";

interface HealthChartProps {
	agentName?: string;
	agents?: AgentStatus[];
}

interface DataPoint {
	time: number;
	values: Record<string, number>;
}

const API_URL = "http://localhost:3000";

// Agent colors
const AGENT_COLORS: Record<string, string> = {
	ConversationAgent: "#00d4ff",
	SearchAgent: "#00ff88",
	CodeAgent: "#ffaa00",
	VoiceAgent: "#ff4444",
	MusicAgent: "#9d4edd",
	ImageGenerationAgent: "#ff6b6b",
	VideoAgent: "#4ecdc4",
	WeatherAgent: "#45b7d1",
};

function getAgentColor(agentName: string, index: number): string {
	if (AGENT_COLORS[agentName]) return AGENT_COLORS[agentName];
	const defaultColors = [
		"#00d4ff",
		"#00ff88",
		"#ffaa00",
		"#ff4444",
		"#9d4edd",
		"#ff6b6b",
		"#4ecdc4",
		"#45b7d1",
	];
	return defaultColors[index % defaultColors.length];
}

export function HealthChart({ agentName }: HealthChartProps) {
	const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
	const [isLive, setIsLive] = useState(true);
	const [displayAgents, setDisplayAgents] = useState<string[]>([]);
	const [_loading, setLoading] = useState(true);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const dataIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const animationRef = useRef<number | null>(null);
	const startTimeRef = useRef<number | null>(null);
	const dataPointsRef = useRef<DataPoint[]>([]);
	const displayAgentsRef = useRef<string[]>([]);

	const VISIBLE_SECONDS = 30;

	// Keep refs in sync with state
	useEffect(() => {
		dataPointsRef.current = dataPoints;
	}, [dataPoints]);

	useEffect(() => {
		displayAgentsRef.current = displayAgents;
	}, [displayAgents]);

	// Reset the chart
	const handleReset = useCallback(() => {
		setDataPoints([]);
		dataPointsRef.current = [];
		startTimeRef.current = null; // Will be set on next animation frame
		setLoading(true);
	}, []);

	// Fetch latest metrics
	const fetchMetrics = useCallback(async () => {
		try {
			const response = await fetch(`${API_URL}/health/metrics/latest`);
			if (!response.ok) throw new Error("Failed to fetch metrics");

			const data = await response.json();

			if (data.success && startTimeRef.current !== null) {
				// API returns data.data.agents with metrics arrays
				// Transform to { agentName: { healthScore: number } } format
				const agents = data.data?.agents || {};
				const agentNames = Object.keys(agents);
				const topAgents = agentName ? [agentName] : agentNames.slice(0, 6);

				setDisplayAgents(topAgents);

				const currentSecond = Math.floor((Date.now() - startTimeRef.current) / 1000) + 1;

				const values: Record<string, number> = {};
				for (const agent of topAgents) {
					const agentData = agents[agent];
					if (agentData?.metrics && agentData.metrics.length > 0) {
						// Get the latest metric's healthScore
						const latestMetric = agentData.metrics[agentData.metrics.length - 1];
						values[agent] = latestMetric.healthScore ?? 0;
					}
				}

				setDataPoints((prevPoints) => {
					if (prevPoints.length > 0 && prevPoints[prevPoints.length - 1].time >= currentSecond) {
						return prevPoints;
					}
					const newPoint: DataPoint = { time: currentSecond, values };
					const updated = [...prevPoints, newPoint];
					return updated.slice(-120);
				});

				setLoading(false);
			}
		} catch (error) {
			console.error("Failed to fetch metrics:", error);
			setLoading(false);
		}
	}, [agentName]);

	// Animation loop
	const animate = useCallback(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) {
			animationRef.current = requestAnimationFrame(animate);
			return;
		}

		const ctx = canvas.getContext("2d");
		if (!ctx) {
			animationRef.current = requestAnimationFrame(animate);
			return;
		}

		// Initialize start time on FIRST animation frame
		if (startTimeRef.current === null) {
			startTimeRef.current = Date.now();
		}

		const points = dataPointsRef.current;
		const agents = displayAgentsRef.current;

		const width = container.clientWidth;
		const height = 200;
		const padding = { top: 20, right: 60, bottom: 40, left: 50 };
		const chartWidth = width - padding.left - padding.right;
		const chartHeight = height - padding.top - padding.bottom;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		ctx.scale(dpr, dpr);

		// Clear canvas
		ctx.fillStyle = "#141b2d";
		ctx.fillRect(0, 0, width, height);

		// Calculate smooth elapsed time from when animation actually started
		const elapsedMs = Date.now() - startTimeRef.current;
		const elapsedSeconds = elapsedMs / 1000;

		const pixelsPerSecond = chartWidth / VISIBLE_SECONDS;

		// Clip to chart area for vertical grid lines
		ctx.save();
		ctx.beginPath();
		ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
		ctx.clip();

		// Draw vertical grid lines that scroll left
		ctx.strokeStyle = "#374151";
		ctx.lineWidth = 0.5;
		ctx.setLineDash([3, 3]);

		// Only draw lines for seconds that have actually passed
		const maxSecond = Math.floor(elapsedSeconds);
		for (let sec = 1; sec <= maxSecond; sec++) {
			const secondsFromNow = elapsedSeconds - sec;
			if (secondsFromNow > VISIBLE_SECONDS) continue;

			const x = padding.left + chartWidth - secondsFromNow * pixelsPerSecond;
			if (x >= padding.left && x <= padding.left + chartWidth) {
				ctx.beginPath();
				ctx.moveTo(x, padding.top);
				ctx.lineTo(x, padding.top + chartHeight);
				ctx.stroke();
			}
		}

		ctx.restore();

		// Draw horizontal grid lines (static)
		ctx.strokeStyle = "#374151";
		ctx.lineWidth = 0.5;
		ctx.setLineDash([3, 3]);
		for (let i = 0; i <= 4; i++) {
			const y = padding.top + (chartHeight / 4) * i;
			ctx.beginPath();
			ctx.moveTo(padding.left, y);
			ctx.lineTo(padding.left + chartWidth, y);
			ctx.stroke();
		}

		// Y-axis labels (static)
		ctx.setLineDash([]);
		ctx.fillStyle = "#9ca3af";
		ctx.font = "10px monospace";
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";
		for (let i = 0; i <= 4; i++) {
			const value = 100 - i * 25;
			const y = padding.top + (chartHeight / 4) * i;
			ctx.fillText(`${value}%`, padding.left - 8, y);
		}

		// Draw scrolling X-axis labels below chart
		ctx.save();
		ctx.beginPath();
		ctx.rect(padding.left, padding.top + chartHeight, chartWidth, padding.bottom);
		ctx.clip();

		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.setLineDash([]);

		// Calculate label interval based on chart width
		const minLabelSpacing = 40; // minimum pixels between labels
		const labelInterval = Math.max(1, Math.ceil(minLabelSpacing / pixelsPerSecond));

		// Only draw labels for seconds that have actually passed AND have moved enough from the right edge
		for (let sec = 1; sec <= maxSecond; sec++) {
			const secondsFromNow = elapsedSeconds - sec;
			if (secondsFromNow > VISIBLE_SECONDS) continue;

			const x = padding.left + chartWidth - secondsFromNow * pixelsPerSecond;

			// Only draw if within visible area AND has moved at least 30px from right edge
			const rightEdge = padding.left + chartWidth;
			const distanceFromRight = rightEdge - x;

			if (x >= padding.left && x <= rightEdge && distanceFromRight >= 20) {
				// Tick mark
				ctx.strokeStyle = "#4b5563";
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(x, padding.top + chartHeight);
				ctx.lineTo(x, padding.top + chartHeight + 4);
				ctx.stroke();

				// Label at intervals - only show if enough space
				if (sec % labelInterval === 0) {
					ctx.fillStyle = "#9ca3af";
					ctx.font = "10px monospace";
					ctx.fillText(`${sec}s`, x, padding.top + chartHeight + 8);
				}
			}
		}
		ctx.restore();

		// Draw data lines with smooth curves
		ctx.save();
		ctx.beginPath();
		ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
		ctx.clip();

		agents.forEach((agent, agentIndex) => {
			const color = getAgentColor(agent, agentIndex);

			// Collect visible points for this agent
			const visiblePoints: { x: number; y: number; time: number }[] = [];

			points.forEach((point) => {
				const value = point.values[agent];
				if (value === undefined) return;

				const secondsFromNow = elapsedSeconds - point.time;
				if (secondsFromNow < 0 || secondsFromNow > VISIBLE_SECONDS + 1) return;

				const x = padding.left + chartWidth - secondsFromNow * pixelsPerSecond;
				const y = padding.top + chartHeight - (value / 100) * chartHeight;

				if (x >= padding.left - 20 && x <= padding.left + chartWidth + 20) {
					visiblePoints.push({ x, y, time: point.time });
				}
			});

			if (visiblePoints.length === 0) return;

			// Sort by x position (left to right)
			visiblePoints.sort((a, b) => a.x - b.x);

			// Draw gradient line with glow effect
			ctx.save();

			// Glow effect
			ctx.shadowColor = color;
			ctx.shadowBlur = 8;
			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.setLineDash([]);

			// Draw smooth curve using quadratic bezier
			ctx.beginPath();

			if (visiblePoints.length === 1) {
				// Single point - draw a dot
				ctx.arc(visiblePoints[0].x, visiblePoints[0].y, 3, 0, Math.PI * 2);
				ctx.fillStyle = color;
				ctx.fill();
			} else {
				// Multiple points - draw smooth curve
				ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);

				for (let i = 1; i < visiblePoints.length; i++) {
					const prev = visiblePoints[i - 1];
					const curr = visiblePoints[i];

					// Use quadratic bezier for smooth curves
					const cpX = (prev.x + curr.x) / 2;
					const cpY = (prev.y + curr.y) / 2;

					if (i === 1) {
						ctx.lineTo(cpX, cpY);
					} else {
						ctx.quadraticCurveTo(prev.x, prev.y, cpX, cpY);
					}
				}

				// Connect to last point
				const lastPoint = visiblePoints[visiblePoints.length - 1];
				ctx.lineTo(lastPoint.x, lastPoint.y);
				ctx.stroke();

				// Draw animated pulse on the newest point (rightmost)
				const newestPoint = visiblePoints[visiblePoints.length - 1];
				const pulsePhase = (elapsedMs % 1000) / 1000; // 0 to 1 over 1 second
				const pulseRadius = 3 + Math.sin(pulsePhase * Math.PI * 2) * 2;
				const pulseAlpha = 0.5 + Math.sin(pulsePhase * Math.PI * 2) * 0.3;

				ctx.beginPath();
				ctx.arc(newestPoint.x, newestPoint.y, pulseRadius, 0, Math.PI * 2);
				ctx.fillStyle = color;
				ctx.globalAlpha = pulseAlpha;
				ctx.fill();
				ctx.globalAlpha = 1;

				// Solid center dot
				ctx.beginPath();
				ctx.arc(newestPoint.x, newestPoint.y, 3, 0, Math.PI * 2);
				ctx.fillStyle = color;
				ctx.fill();
			}

			ctx.restore();
		});

		ctx.restore();

		// Draw axis lines
		ctx.strokeStyle = "#4b5563";
		ctx.lineWidth = 1;
		ctx.setLineDash([]);

		ctx.beginPath();
		ctx.moveTo(padding.left, padding.top);
		ctx.lineTo(padding.left, padding.top + chartHeight);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(padding.left, padding.top + chartHeight);
		ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
		ctx.stroke();

		// Current time display on right side with trend indicators
		const displaySecond = Math.floor(elapsedSeconds) + 1;
		ctx.fillStyle = "#00d4ff";
		ctx.font = "bold 12px monospace";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(`${displaySecond}s`, padding.left + chartWidth + 8, padding.top + chartHeight / 2);

		// Draw trend arrows for each agent on the right side
		const rightMargin = padding.left + chartWidth + 5;
		agents.forEach((agent, agentIndex) => {
			const agentPoints = points.filter((p) => p.values[agent] !== undefined);
			if (agentPoints.length >= 2) {
				const latest = agentPoints[agentPoints.length - 1].values[agent];
				const previous = agentPoints[agentPoints.length - 2].values[agent];
				const diff = latest - previous;

				if (Math.abs(diff) > 0.5) {
					// Only show if significant change
					const latestY = padding.top + chartHeight - (latest / 100) * chartHeight;
					const color = getAgentColor(agent, agentIndex);

					ctx.save();
					ctx.fillStyle = color;
					ctx.strokeStyle = color;
					ctx.lineWidth = 2;

					// Draw small triangle arrow
					ctx.beginPath();
					if (diff > 0) {
						// Health improved - arrow up (green tint)
						ctx.moveTo(rightMargin, latestY + 4);
						ctx.lineTo(rightMargin + 4, latestY - 2);
						ctx.lineTo(rightMargin + 8, latestY + 4);
					} else {
						// Health deteriorated - arrow down (red tint)
						ctx.moveTo(rightMargin, latestY - 4);
						ctx.lineTo(rightMargin + 4, latestY + 2);
						ctx.lineTo(rightMargin + 8, latestY - 4);
					}
					ctx.closePath();
					ctx.fill();
					ctx.restore();
				}
			}
		});

		// Continue animation
		animationRef.current = requestAnimationFrame(animate);
	}, []);

	// Data fetching interval
	useEffect(() => {
		if (isLive) {
			fetchMetrics();
			dataIntervalRef.current = setInterval(fetchMetrics, 1000);
		} else {
			if (dataIntervalRef.current) {
				clearInterval(dataIntervalRef.current);
				dataIntervalRef.current = null;
			}
		}

		return () => {
			if (dataIntervalRef.current) {
				clearInterval(dataIntervalRef.current);
			}
		};
	}, [isLive, fetchMetrics]);

	// Animation loop - only runs when isLive is true
	useEffect(() => {
		if (isLive) {
			animationRef.current = requestAnimationFrame(animate);
		} else {
			// When paused, cancel animation but keep the last frame visible
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
				animationRef.current = null;
			}
		}

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
		};
	}, [animate, isLive]);

	const handleExportPNG = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		canvas.toBlob((blob) => {
			if (blob) {
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = `health-trend-${new Date().toISOString()}.png`;
				link.click();
				URL.revokeObjectURL(url);
			}
		});
	};

	return (
		<div ref={containerRef} className="bg-dashboard-card border border-gray-700 rounded-lg p-4">
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-3">
					<h2 className="text-lg font-semibold text-dashboard-text">Health Trend</h2>
					<div className="flex items-center gap-1 px-2 py-1 bg-dashboard-bg rounded text-xs">
						<span
							className={`w-2 h-2 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-gray-500"}`}
						/>
						<span className="text-gray-400">{isLive ? "LIVE" : "PAUSED"}</span>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => setIsLive(!isLive)}
						className={`p-1.5 rounded transition-colors ${isLive ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-green-500/20 text-green-400 hover:bg-green-500/30"}`}
						aria-label={isLive ? "Pause" : "Resume"}
						title={isLive ? "Pause live updates" : "Resume live updates"}
					>
						{isLive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
					</button>
					<button
						onClick={handleReset}
						className="p-1.5 hover:bg-gray-700 rounded transition-colors"
						aria-label="Reset"
						title="Reset chart (start from 1s)"
					>
						<RefreshCw className="w-4 h-4 text-dashboard-text" />
					</button>
					<button
						onClick={handleExportPNG}
						className="p-1.5 hover:bg-gray-700 rounded transition-colors"
						aria-label="Export as PNG"
						title="Export as PNG"
					>
						<Download className="w-4 h-4 text-dashboard-text" />
					</button>
				</div>
			</div>

			{/* Canvas Chart */}
			<canvas ref={canvasRef} className="w-full" style={{ height: "200px" }} />

			{/* Legend */}
			<div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-2 border-t border-gray-700">
				{displayAgents.map((name, index) => (
					<div key={name} className="flex items-center gap-1.5">
						<div
							className="w-3 h-0.5 rounded"
							style={{ backgroundColor: getAgentColor(name, index) }}
						/>
						<span className="text-xs text-gray-400">{name.replace("Agent", "")}</span>
					</div>
				))}
			</div>
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

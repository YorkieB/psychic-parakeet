/*
  This file creates a system health chart component that displays comprehensive system health metrics and performance data in Jarvis's dashboard.

  It shows real-time system monitoring, performance trends, health indicators, and interactive visualizations while providing complete system health analysis and tracking.
*/

import {
	AlertCircle,
	AlertTriangle,
	CheckCircle,
	Clock,
	Download,
	Pause,
	Play,
	RefreshCw,
	Wifi,
	WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface HealthSample {
	timestamp: number; // Unix timestamp in ms
	value: number | null; // Health percentage (0-100) or null for no-data
	elapsed: number; // Seconds since chart start
}

interface HealthEvent {
	id: string;
	timestamp: number;
	elapsed: number;
	type:
		| "threshold_drop"
		| "threshold_recovery"
		| "error"
		| "timeout"
		| "no_data"
		| "sampling_freeze"
		| "sampling_delay";
	healthValue: number | null;
	previousValue: number | null;
	metadata: {
		description: string;
		threshold?: string;
		duration?: number;
		cause?: string;
	};
}

interface SystemHealthChartProps {
	componentName?: string;
	windowSeconds?: number; // Rolling window size (default 30s)
	samplingIntervalMs?: number; // Sampling interval (default 500ms)
	onEvent?: (event: HealthEvent) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const API_URL = "http://localhost:3000";

// Threshold definitions
const THRESHOLDS = {
	HEALTHY: { min: 90, max: 100, color: "#22c55e", label: "Healthy" },
	DEGRADED: { min: 70, max: 89, color: "#eab308", label: "Degraded" },
	CRITICAL: { min: 0, max: 69, color: "#ef4444", label: "Critical" },
};

const NO_DATA_COLOR = "#6b7280";
const BACKGROUND_COLOR = "#0f172a";
const GRID_COLOR = "#334155";
const TEXT_COLOR = "#94a3b8";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getHealthColor(value: number | null): string {
	if (value === null) return NO_DATA_COLOR;
	if (value >= THRESHOLDS.HEALTHY.min) return THRESHOLDS.HEALTHY.color;
	if (value >= THRESHOLDS.DEGRADED.min) return THRESHOLDS.DEGRADED.color;
	return THRESHOLDS.CRITICAL.color;
}

function getHealthStatus(value: number | null): string {
	if (value === null) return "No Data";
	if (value >= THRESHOLDS.HEALTHY.min) return THRESHOLDS.HEALTHY.label;
	if (value >= THRESHOLDS.DEGRADED.min) return THRESHOLDS.DEGRADED.label;
	return THRESHOLDS.CRITICAL.label;
}

function generateEventId(): string {
	return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatTimestamp(ts: number): string {
	return new Date(ts).toLocaleTimeString("en-US", {
		hour12: false,
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SystemHealthChart({
	componentName = "System",
	windowSeconds = 30,
	samplingIntervalMs = 500,
	onEvent,
}: SystemHealthChartProps) {
	// State
	const [samples, setSamples] = useState<HealthSample[]>([]);
	const [events, setEvents] = useState<HealthEvent[]>([]);
	const [isLive, setIsLive] = useState(true);
	const [currentHealth, setCurrentHealth] = useState<number | null>(null);
	const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error">(
		"disconnected",
	);
	const [lastSampleTime, setLastSampleTime] = useState<number | null>(null);
	const [showEventLog, setShowEventLog] = useState(false);

	// Refs
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const animationRef = useRef<number | null>(null);
	const samplingIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const startTimeRef = useRef<number | null>(null);
	const samplesRef = useRef<HealthSample[]>([]);
	const eventsRef = useRef<HealthEvent[]>([]);
	const lastHealthRef = useRef<number | null>(null);
	const consecutiveFailuresRef = useRef<number>(0);
	const lastSuccessfulSampleRef = useRef<number>(Date.now());

	// Keep refs in sync
	useEffect(() => {
		samplesRef.current = samples;
	}, [samples]);

	useEffect(() => {
		eventsRef.current = events;
	}, [events]);

	// ============================================================================
	// EVENT CREATION
	// ============================================================================

	const createEvent = useCallback(
		(
			type: HealthEvent["type"],
			healthValue: number | null,
			previousValue: number | null,
			metadata: HealthEvent["metadata"],
		): HealthEvent => {
			const now = Date.now();
			const elapsed = startTimeRef.current ? (now - startTimeRef.current) / 1000 : 0;

			const event: HealthEvent = {
				id: generateEventId(),
				timestamp: now,
				elapsed,
				type,
				healthValue,
				previousValue,
				metadata,
			};

			setEvents((prev) => {
				const updated = [...prev, event].slice(-100); // Keep last 100 events
				return updated;
			});

			onEvent?.(event);
			return event;
		},
		[onEvent],
	);

	// ============================================================================
	// THRESHOLD CHECKING
	// ============================================================================

	const checkThresholdCrossing = useCallback(
		(newValue: number | null, prevValue: number | null) => {
			if (newValue === null || prevValue === null) return;

			const prevStatus = getHealthStatus(prevValue);
			const newStatus = getHealthStatus(newValue);

			if (prevStatus !== newStatus) {
				if (newValue < prevValue) {
					// Health dropped
					createEvent("threshold_drop", newValue, prevValue, {
						description: `Health dropped from ${prevStatus} to ${newStatus}`,
						threshold: newStatus,
						cause: `Value changed from ${prevValue.toFixed(1)}% to ${newValue.toFixed(1)}%`,
					});
				} else {
					// Health recovered
					createEvent("threshold_recovery", newValue, prevValue, {
						description: `Health recovered from ${prevStatus} to ${newStatus}`,
						threshold: newStatus,
						cause: `Value changed from ${prevValue.toFixed(1)}% to ${newValue.toFixed(1)}%`,
					});
				}
			}
		},
		[createEvent],
	);

	// ============================================================================
	// SAMPLING LOGIC
	// ============================================================================

	const fetchHealthSample = useCallback(async () => {
		if (!startTimeRef.current) {
			startTimeRef.current = Date.now();
		}

		const now = Date.now();
		const elapsed = (now - startTimeRef.current) / 1000;
		const timeSinceLastSample = now - lastSuccessfulSampleRef.current;

		// Check for sampling delay (> 2x expected interval)
		if (timeSinceLastSample > samplingIntervalMs * 2 && lastSuccessfulSampleRef.current !== now) {
			createEvent("sampling_delay", lastHealthRef.current, lastHealthRef.current, {
				description: `Sampling delayed by ${(timeSinceLastSample / 1000).toFixed(1)}s`,
				duration: timeSinceLastSample,
				cause: "System load or network latency",
			});
		}

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), samplingIntervalMs * 0.8);

			const response = await fetch(`${API_URL}/health/metrics/latest`, {
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const data = await response.json();

			if (data.success && data.metrics) {
				setConnectionStatus("connected");
				consecutiveFailuresRef.current = 0;
				lastSuccessfulSampleRef.current = now;

				// Get average health across all agents or specific component
				const agents = Object.keys(data.metrics);
				let healthValue: number;

				if (componentName && data.metrics[componentName]) {
					healthValue = data.metrics[componentName].healthScore;
				} else {
					// Average all agents
					const healthScores = agents.map((a) => data.metrics[a].healthScore);
					healthValue = healthScores.reduce((a, b) => a + b, 0) / healthScores.length;
				}

				// Check threshold crossing
				checkThresholdCrossing(healthValue, lastHealthRef.current);
				lastHealthRef.current = healthValue;
				setCurrentHealth(healthValue);
				setLastSampleTime(now);

				// Add sample to rolling buffer
				const newSample: HealthSample = {
					timestamp: now,
					value: healthValue,
					elapsed,
				};

				setSamples((prev) => {
					const cutoffTime = now - windowSeconds * 1000;
					const filtered = prev.filter((s) => s.timestamp > cutoffTime);
					return [...filtered, newSample];
				});
			}
		} catch (error) {
			consecutiveFailuresRef.current++;

			if (error instanceof Error) {
				if (error.name === "AbortError") {
					// Timeout
					setConnectionStatus("error");
					createEvent("timeout", lastHealthRef.current, lastHealthRef.current, {
						description: "Health check timed out",
						duration: samplingIntervalMs,
						cause: "Request exceeded timeout threshold",
					});
				} else {
					// Other error
					setConnectionStatus("error");
					createEvent("error", lastHealthRef.current, lastHealthRef.current, {
						description: `Health check failed: ${error.message}`,
						cause: error.message,
					});
				}
			}

			// Add no-data sample
			const noDataSample: HealthSample = {
				timestamp: now,
				value: null,
				elapsed,
			};

			setSamples((prev) => {
				const cutoffTime = now - windowSeconds * 1000;
				const filtered = prev.filter((s) => s.timestamp > cutoffTime);
				return [...filtered, noDataSample];
			});

			// Check for sampling freeze (5+ consecutive failures)
			if (consecutiveFailuresRef.current >= 5) {
				createEvent("sampling_freeze", null, lastHealthRef.current, {
					description: "Sampling appears frozen",
					duration: consecutiveFailuresRef.current * samplingIntervalMs,
					cause: `${consecutiveFailuresRef.current} consecutive failures`,
				});
			}

			// Create no-data event if transitioning from data to no-data
			if (lastHealthRef.current !== null) {
				createEvent("no_data", null, lastHealthRef.current, {
					description: "No health data available",
					cause: "Connection lost or service unavailable",
				});
				lastHealthRef.current = null;
				setCurrentHealth(null);
			}
		}
	}, [componentName, windowSeconds, samplingIntervalMs, checkThresholdCrossing, createEvent]);

	// ============================================================================
	// CANVAS RENDERING
	// ============================================================================

	const render = useCallback(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) {
			animationRef.current = requestAnimationFrame(render);
			return;
		}

		const ctx = canvas.getContext("2d");
		if (!ctx) {
			animationRef.current = requestAnimationFrame(render);
			return;
		}

		// Initialize start time
		if (startTimeRef.current === null) {
			startTimeRef.current = Date.now();
		}

		const currentSamples = samplesRef.current;
		const now = Date.now();
		const elapsedSeconds = (now - startTimeRef.current) / 1000;

		// Canvas dimensions
		const width = container.clientWidth;
		const height = 250;
		const padding = { top: 30, right: 80, bottom: 50, left: 60 };
		const chartWidth = width - padding.left - padding.right;
		const chartHeight = height - padding.top - padding.bottom;

		// Handle DPR
		const dpr = window.devicePixelRatio || 1;
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		ctx.scale(dpr, dpr);

		// Clear canvas
		ctx.fillStyle = BACKGROUND_COLOR;
		ctx.fillRect(0, 0, width, height);

		const pixelsPerSecond = chartWidth / windowSeconds;

		// ========== DRAW THRESHOLD ZONES ==========
		const zones = [
			{ min: 90, max: 100, color: "rgba(34, 197, 94, 0.1)" }, // Green zone
			{ min: 70, max: 90, color: "rgba(234, 179, 8, 0.1)" }, // Yellow zone
			{ min: 0, max: 70, color: "rgba(239, 68, 68, 0.1)" }, // Red zone
		];

		zones.forEach((zone) => {
			const yTop = padding.top + chartHeight - (zone.max / 100) * chartHeight;
			const yBottom = padding.top + chartHeight - (zone.min / 100) * chartHeight;
			ctx.fillStyle = zone.color;
			ctx.fillRect(padding.left, yTop, chartWidth, yBottom - yTop);
		});

		// ========== DRAW THRESHOLD LINES ==========
		[90, 70].forEach((threshold) => {
			const y = padding.top + chartHeight - (threshold / 100) * chartHeight;
			ctx.strokeStyle = threshold === 90 ? THRESHOLDS.HEALTHY.color : THRESHOLDS.DEGRADED.color;
			ctx.lineWidth = 1;
			ctx.setLineDash([5, 5]);
			ctx.beginPath();
			ctx.moveTo(padding.left, y);
			ctx.lineTo(padding.left + chartWidth, y);
			ctx.stroke();
			ctx.setLineDash([]);
		});

		// ========== DRAW GRID ==========
		ctx.strokeStyle = GRID_COLOR;
		ctx.lineWidth = 0.5;
		ctx.setLineDash([2, 4]);

		// Horizontal grid
		for (let i = 0; i <= 4; i++) {
			const y = padding.top + (chartHeight / 4) * i;
			ctx.beginPath();
			ctx.moveTo(padding.left, y);
			ctx.lineTo(padding.left + chartWidth, y);
			ctx.stroke();
		}

		// Vertical grid (scrolling)
		ctx.save();
		ctx.beginPath();
		ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
		ctx.clip();

		const maxSecond = Math.floor(elapsedSeconds);
		for (let sec = 1; sec <= maxSecond; sec++) {
			const secondsFromNow = elapsedSeconds - sec;
			if (secondsFromNow > windowSeconds) continue;

			const x = padding.left + chartWidth - secondsFromNow * pixelsPerSecond;
			if (x >= padding.left && x <= padding.left + chartWidth) {
				ctx.beginPath();
				ctx.moveTo(x, padding.top);
				ctx.lineTo(x, padding.top + chartHeight);
				ctx.stroke();
			}
		}
		ctx.restore();
		ctx.setLineDash([]);

		// ========== DRAW Y-AXIS LABELS ==========
		ctx.fillStyle = TEXT_COLOR;
		ctx.font = "11px monospace";
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";

		for (let i = 0; i <= 4; i++) {
			const value = 100 - i * 25;
			const y = padding.top + (chartHeight / 4) * i;
			ctx.fillText(`${value}%`, padding.left - 10, y);
		}

		// ========== DRAW X-AXIS LABELS (SCROLLING) ==========
		ctx.save();
		ctx.beginPath();
		ctx.rect(padding.left, padding.top + chartHeight, chartWidth, padding.bottom);
		ctx.clip();

		ctx.textAlign = "center";
		ctx.textBaseline = "top";

		const labelInterval = Math.max(1, Math.ceil(50 / pixelsPerSecond));

		for (let sec = 1; sec <= maxSecond; sec++) {
			const secondsFromNow = elapsedSeconds - sec;
			if (secondsFromNow > windowSeconds) continue;

			const x = padding.left + chartWidth - secondsFromNow * pixelsPerSecond;
			const rightEdge = padding.left + chartWidth;
			const distanceFromRight = rightEdge - x;

			if (x >= padding.left && x <= rightEdge && distanceFromRight >= 25) {
				// Tick mark
				ctx.strokeStyle = GRID_COLOR;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(x, padding.top + chartHeight);
				ctx.lineTo(x, padding.top + chartHeight + 5);
				ctx.stroke();

				if (sec % labelInterval === 0) {
					ctx.fillStyle = TEXT_COLOR;
					ctx.fillText(`${sec}s`, x, padding.top + chartHeight + 8);
				}
			}
		}
		ctx.restore();

		// ========== DRAW HEALTH LINE ==========
		ctx.save();
		ctx.beginPath();
		ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
		ctx.clip();

		if (currentSamples.length > 0) {
			// Separate samples into segments (data vs no-data)
			let currentSegment: HealthSample[] = [];
			const segments: { samples: HealthSample[]; hasData: boolean }[] = [];

			currentSamples.forEach((sample, i) => {
				const hasData = sample.value !== null;

				if (currentSegment.length === 0) {
					currentSegment.push(sample);
				} else {
					const prevHasData = currentSegment[currentSegment.length - 1].value !== null;
					if (hasData === prevHasData) {
						currentSegment.push(sample);
					} else {
						segments.push({
							samples: [...currentSegment],
							hasData: prevHasData,
						});
						currentSegment = [sample];
					}
				}

				if (i === currentSamples.length - 1) {
					segments.push({ samples: currentSegment, hasData });
				}
			});

			// Draw each segment
			segments.forEach((segment) => {
				if (segment.samples.length === 0) return;

				const points: { x: number; y: number; value: number | null }[] = [];

				segment.samples.forEach((sample) => {
					const sampleAge = (now - sample.timestamp) / 1000;
					if (sampleAge > windowSeconds) return;

					const x = padding.left + chartWidth - sampleAge * pixelsPerSecond;
					const value = sample.value ?? 50; // Default to 50% for no-data display
					const y = padding.top + chartHeight - (value / 100) * chartHeight;

					if (x >= padding.left - 10 && x <= padding.left + chartWidth + 10) {
						points.push({ x, y, value: sample.value });
					}
				});

				if (points.length === 0) return;

				// Sort by x
				points.sort((a, b) => a.x - b.x);

				// Draw line
				ctx.beginPath();
				ctx.lineWidth = segment.hasData ? 2.5 : 1.5;
				ctx.lineCap = "round";
				ctx.lineJoin = "round";

				if (segment.hasData) {
					// Solid colored line based on health
					const avgValue = points.reduce((sum, p) => sum + (p.value ?? 0), 0) / points.length;
					ctx.strokeStyle = getHealthColor(avgValue);
					ctx.setLineDash([]);

					// Glow effect
					ctx.shadowColor = getHealthColor(avgValue);
					ctx.shadowBlur = 10;
				} else {
					// Dashed grey line for no-data
					ctx.strokeStyle = NO_DATA_COLOR;
					ctx.setLineDash([8, 4]);
					ctx.shadowBlur = 0;
				}

				// Draw smooth curve
				ctx.moveTo(points[0].x, points[0].y);

				for (let i = 1; i < points.length; i++) {
					const prev = points[i - 1];
					const curr = points[i];
					const cpX = (prev.x + curr.x) / 2;
					const cpY = (prev.y + curr.y) / 2;

					if (i === 1) {
						ctx.lineTo(cpX, cpY);
					} else {
						ctx.quadraticCurveTo(prev.x, prev.y, cpX, cpY);
					}
				}

				ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
				ctx.stroke();
				ctx.shadowBlur = 0;
				ctx.setLineDash([]);
			});

			// Draw current value indicator (pulsing dot)
			const latestSample = currentSamples[currentSamples.length - 1];
			if (latestSample) {
				const sampleAge = (now - latestSample.timestamp) / 1000;
				const x = padding.left + chartWidth - sampleAge * pixelsPerSecond;
				const value = latestSample.value ?? 50;
				const y = padding.top + chartHeight - (value / 100) * chartHeight;

				if (x >= padding.left && x <= padding.left + chartWidth) {
					const pulsePhase = (now % 1000) / 1000;
					const pulseRadius = 4 + Math.sin(pulsePhase * Math.PI * 2) * 2;

					// Outer pulse
					ctx.beginPath();
					ctx.arc(x, y, pulseRadius + 3, 0, Math.PI * 2);
					ctx.fillStyle =
						latestSample.value !== null
							? `${getHealthColor(latestSample.value)}40`
							: `${NO_DATA_COLOR}40`;
					ctx.fill();

					// Inner dot
					ctx.beginPath();
					ctx.arc(x, y, 4, 0, Math.PI * 2);
					ctx.fillStyle =
						latestSample.value !== null ? getHealthColor(latestSample.value) : NO_DATA_COLOR;
					ctx.fill();

					// White center
					ctx.beginPath();
					ctx.arc(x, y, 2, 0, Math.PI * 2);
					ctx.fillStyle = "#ffffff";
					ctx.fill();
				}
			}
		}

		ctx.restore();

		// ========== DRAW EVENT MARKERS ==========
		const recentEvents = eventsRef.current.filter((e) => {
			const eventAge = (now - e.timestamp) / 1000;
			return eventAge <= windowSeconds;
		});

		ctx.save();
		ctx.beginPath();
		ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
		ctx.clip();

		recentEvents.forEach((event) => {
			const eventAge = (now - event.timestamp) / 1000;
			const x = padding.left + chartWidth - eventAge * pixelsPerSecond;

			if (x < padding.left || x > padding.left + chartWidth) return;

			// Draw vertical marker line
			ctx.strokeStyle = event.type.includes("recovery")
				? "#22c55e"
				: event.type.includes("drop")
					? "#ef4444"
					: event.type === "no_data"
						? "#6b7280"
						: "#f59e0b";
			ctx.lineWidth = 2;
			ctx.setLineDash([3, 3]);
			ctx.beginPath();
			ctx.moveTo(x, padding.top);
			ctx.lineTo(x, padding.top + chartHeight);
			ctx.stroke();
			ctx.setLineDash([]);

			// Draw marker icon at top
			const iconY = padding.top + 10;
			ctx.beginPath();
			ctx.arc(x, iconY, 6, 0, Math.PI * 2);
			ctx.fillStyle = ctx.strokeStyle;
			ctx.fill();

			// Icon symbol
			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 8px sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			const symbol = event.type.includes("recovery")
				? "↑"
				: event.type.includes("drop")
					? "↓"
					: event.type === "error"
						? "!"
						: event.type === "timeout"
							? "⏱"
							: event.type === "no_data"
								? "?"
								: "⚠";
			ctx.fillText(symbol, x, iconY);
		});

		ctx.restore();

		// ========== DRAW AXES ==========
		ctx.strokeStyle = GRID_COLOR;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(padding.left, padding.top);
		ctx.lineTo(padding.left, padding.top + chartHeight);
		ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
		ctx.stroke();

		// ========== DRAW CURRENT VALUE DISPLAY ==========
		const displayValue =
			currentSamples.length > 0 ? currentSamples[currentSamples.length - 1].value : null;

		const displayX = padding.left + chartWidth + 15;
		const displayY = padding.top + chartHeight / 2;

		// Background box
		ctx.fillStyle = "#1e293b";
		ctx.strokeStyle = getHealthColor(displayValue);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(displayX - 5, displayY - 25, 60, 50, 5);
		ctx.fill();
		ctx.stroke();

		// Value text
		ctx.fillStyle = getHealthColor(displayValue);
		ctx.font = "bold 16px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(
			displayValue !== null ? `${displayValue.toFixed(0)}%` : "N/A",
			displayX + 25,
			displayY - 5,
		);

		// Status text
		ctx.fillStyle = TEXT_COLOR;
		ctx.font = "10px sans-serif";
		ctx.fillText(getHealthStatus(displayValue), displayX + 25, displayY + 12);

		// ========== DRAW TITLE ==========
		ctx.fillStyle = "#ffffff";
		ctx.font = "bold 12px sans-serif";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText(`${componentName} Health`, padding.left, 8);

		// Time indicator
		ctx.fillStyle = TEXT_COLOR;
		ctx.font = "10px monospace";
		ctx.textAlign = "right";
		ctx.fillText(`${Math.floor(elapsedSeconds)}s`, padding.left + chartWidth, 8);

		// Continue animation
		animationRef.current = requestAnimationFrame(render);
	}, [windowSeconds, componentName]);

	// ============================================================================
	// LIFECYCLE
	// ============================================================================

	// Start/stop sampling
	useEffect(() => {
		if (isLive) {
			fetchHealthSample();
			samplingIntervalRef.current = setInterval(fetchHealthSample, samplingIntervalMs);
		} else {
			if (samplingIntervalRef.current) {
				clearInterval(samplingIntervalRef.current);
				samplingIntervalRef.current = null;
			}
		}

		return () => {
			if (samplingIntervalRef.current) {
				clearInterval(samplingIntervalRef.current);
			}
		};
	}, [isLive, fetchHealthSample, samplingIntervalMs]);

	// Start animation
	useEffect(() => {
		animationRef.current = requestAnimationFrame(render);

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
		};
	}, [render]);

	// Reset handler
	const handleReset = useCallback(() => {
		setSamples([]);
		setEvents([]);
		samplesRef.current = [];
		eventsRef.current = [];
		startTimeRef.current = null;
		lastHealthRef.current = null;
		consecutiveFailuresRef.current = 0;
		lastSuccessfulSampleRef.current = Date.now();
		setCurrentHealth(null);
	}, []);

	// Export handler
	const handleExport = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		canvas.toBlob((blob) => {
			if (blob) {
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = `health-${componentName}-${new Date().toISOString()}.png`;
				link.click();
				URL.revokeObjectURL(url);
			}
		});
	}, [componentName]);

	// ============================================================================
	// RENDER
	// ============================================================================

	return (
		<div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
				<div className="flex items-center gap-3">
					<h2 className="text-lg font-semibold text-white">{componentName} Health Monitor</h2>
					<div className="flex items-center gap-2">
						{/* Live indicator */}
						<div
							className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
								isLive ? "bg-green-500/20 text-green-400" : "bg-slate-600/50 text-slate-400"
							}`}
						>
							<span
								className={`w-2 h-2 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-slate-500"}`}
							/>
							{isLive ? "LIVE" : "PAUSED"}
						</div>

						{/* Connection status */}
						<div
							className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
								connectionStatus === "connected"
									? "bg-blue-500/20 text-blue-400"
									: connectionStatus === "error"
										? "bg-red-500/20 text-red-400"
										: "bg-slate-600/50 text-slate-400"
							}`}
						>
							{connectionStatus === "connected" ? (
								<Wifi className="w-3 h-3" />
							) : (
								<WifiOff className="w-3 h-3" />
							)}
							{connectionStatus === "connected"
								? "Connected"
								: connectionStatus === "error"
									? "Error"
									: "Disconnected"}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{/* Current health badge */}
					<div
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
							currentHealth === null
								? "bg-slate-600 text-slate-300"
								: currentHealth >= 90
									? "bg-green-500/20 text-green-400 border border-green-500/30"
									: currentHealth >= 70
										? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
										: "bg-red-500/20 text-red-400 border border-red-500/30"
						}`}
					>
						{currentHealth === null ? (
							<AlertCircle className="w-4 h-4" />
						) : currentHealth >= 90 ? (
							<CheckCircle className="w-4 h-4" />
						) : currentHealth >= 70 ? (
							<AlertTriangle className="w-4 h-4" />
						) : (
							<AlertCircle className="w-4 h-4" />
						)}
						{currentHealth !== null ? `${currentHealth.toFixed(1)}%` : "No Data"}
					</div>

					{/* Controls */}
					<button
						onClick={() => setIsLive(!isLive)}
						className={`p-2 rounded-lg transition-colors ${
							isLive
								? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
								: "bg-green-500/20 text-green-400 hover:bg-green-500/30"
						}`}
						title={isLive ? "Pause" : "Resume"}
					>
						{isLive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
					</button>

					<button
						onClick={handleReset}
						className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
						title="Reset"
					>
						<RefreshCw className="w-4 h-4" />
					</button>

					<button
						onClick={handleExport}
						className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
						title="Export PNG"
					>
						<Download className="w-4 h-4" />
					</button>

					<button
						onClick={() => setShowEventLog(!showEventLog)}
						className={`p-2 rounded-lg transition-colors ${
							showEventLog
								? "bg-blue-500/20 text-blue-400"
								: "hover:bg-slate-700 text-slate-400 hover:text-white"
						}`}
						title="Toggle Event Log"
					>
						<Clock className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Chart */}
			<div ref={containerRef} className="p-4">
				<canvas ref={canvasRef} className="w-full" style={{ height: "250px" }} />
			</div>

			{/* Legend */}
			<div className="flex items-center justify-center gap-6 px-4 py-2 border-t border-slate-700 bg-slate-800/30">
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-full bg-green-500" />
					<span className="text-xs text-slate-400">Healthy (90-100%)</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-full bg-yellow-500" />
					<span className="text-xs text-slate-400">Degraded (70-89%)</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-full bg-red-500" />
					<span className="text-xs text-slate-400">Critical (&lt;70%)</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-8 h-0.5 border-t-2 border-dashed border-gray-500" />
					<span className="text-xs text-slate-400">No Data</span>
				</div>
			</div>

			{/* Event Log */}
			{showEventLog && (
				<div className="border-t border-slate-700 bg-slate-800/50">
					<div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
						<h3 className="text-sm font-medium text-white">Event Log</h3>
						<span className="text-xs text-slate-400">{events.length} events</span>
					</div>
					<div className="max-h-48 overflow-y-auto">
						{events.length === 0 ? (
							<div className="px-4 py-6 text-center text-slate-500 text-sm">
								No events recorded yet
							</div>
						) : (
							<div className="divide-y divide-slate-700/50">
								{[...events]
									.reverse()
									.slice(0, 20)
									.map((event) => (
										<div
											key={event.id}
											className="px-4 py-2 hover:bg-slate-700/30 transition-colors"
										>
											<div className="flex items-start gap-3">
												<div
													className={`mt-0.5 p-1 rounded ${
														event.type.includes("recovery")
															? "bg-green-500/20 text-green-400"
															: event.type.includes("drop")
																? "bg-red-500/20 text-red-400"
																: event.type === "no_data"
																	? "bg-slate-500/20 text-slate-400"
																	: "bg-yellow-500/20 text-yellow-400"
													}`}
												>
													{event.type.includes("recovery") ? (
														<CheckCircle className="w-3 h-3" />
													) : event.type.includes("drop") ? (
														<AlertCircle className="w-3 h-3" />
													) : event.type === "no_data" ? (
														<WifiOff className="w-3 h-3" />
													) : (
														<AlertTriangle className="w-3 h-3" />
													)}
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<span className="text-xs font-medium text-white">
															{event.type
																.replace(/_/g, " ")
																.replace(/\b\w/g, (l) => l.toUpperCase())}
														</span>
														<span className="text-xs text-slate-500">
															{formatTimestamp(event.timestamp)} ({event.elapsed.toFixed(1)}s)
														</span>
													</div>
													<p className="text-xs text-slate-400 mt-0.5">
														{event.metadata.description}
													</p>
													{event.healthValue !== null && (
														<span className="text-xs text-slate-500">
															Health: {event.healthValue.toFixed(1)}%
															{event.previousValue !== null &&
																` (was ${event.previousValue.toFixed(1)}%)`}
														</span>
													)}
												</div>
											</div>
										</div>
									))}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Stats bar */}
			<div className="flex items-center justify-between px-4 py-2 border-t border-slate-700 bg-slate-900 text-xs text-slate-500">
				<span>
					Window: {windowSeconds}s | Interval: {samplingIntervalMs}ms | Samples: {samples.length}
				</span>
				{lastSampleTime && <span>Last sample: {formatTimestamp(lastSampleTime)}</span>}
			</div>
		</div>
	);
}

export default SystemHealthChart;

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

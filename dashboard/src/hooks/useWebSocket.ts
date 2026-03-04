import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { HealthEvent } from "../types";

const WS_URL = (import.meta.env?.VITE_WS_URL as string) || "http://localhost:3000";

// Enhanced reconnection configuration for stability
const SOCKET_CONFIG = {
	transports: ["polling"], // Use polling only - WebSocket upgrade causes "Invalid frame header" errors
	reconnection: true,
	reconnectionDelay: 1000,
	reconnectionDelayMax: 10000,
	reconnectionAttempts: Infinity, // Keep trying forever
	timeout: 20000,
	autoConnect: true,
	forceNew: false,
	upgrade: false, // Disable WebSocket upgrade to avoid frame header issues
};

// Health check interval (ms) - verify connection is alive
const HEALTH_CHECK_INTERVAL = 30000;

export function useWebSocket() {
	const [socket, setSocket] = useState<Socket | null>(null);
	const [events, setEvents] = useState<HealthEvent[]>([]);
	const [connected, setConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [reconnectAttempt, setReconnectAttempt] = useState(0);
	const [lastPong, setLastPong] = useState<Date | null>(null);
	const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
	const healthCheckRef = useRef<NodeJS.Timeout | null>(null);

	const addEvent = useCallback((event: HealthEvent) => {
		setEvents((prev: HealthEvent[]) => [event, ...prev].slice(0, 1000)); // Keep last 1000 events
	}, []);

	// Add system event for connection status changes
	const addSystemEvent = useCallback(
		(type: string, message: string, severity: HealthEvent["severity"]) => {
			addEvent({
				id: `system-${Date.now()}-${Math.random()}`,
				type: type as HealthEvent["type"],
				agentName: "System",
				timestamp: new Date(),
				message,
				details: {},
				severity,
			});
		},
		[addEvent],
	);

	useEffect(() => {
		const newSocket = io(WS_URL, SOCKET_CONFIG);

		newSocket.on("connect", () => {
			setConnected(true);
			setError(null);
			setReconnectAttempt(0);
			setLastPong(new Date());
			console.log("[WebSocket] Connected to backend");
			addSystemEvent("agent_spawned", "Dashboard connected to backend", "success");

			// Clear any pending reconnect timer
			if (reconnectTimerRef.current) {
				clearTimeout(reconnectTimerRef.current);
				reconnectTimerRef.current = null;
			}

			// Start health check interval
			if (healthCheckRef.current) {
				clearInterval(healthCheckRef.current);
			}
			healthCheckRef.current = setInterval(() => {
				if (newSocket.connected) {
					// Socket.IO handles ping/pong internally, but we track last activity
					setLastPong(new Date());
				}
			}, HEALTH_CHECK_INTERVAL);
		});

		newSocket.on("disconnect", (reason) => {
			setConnected(false);
			console.log("[WebSocket] Disconnected:", reason);

			// Add disconnect event
			if (reason !== "io client disconnect") {
				addSystemEvent("agent_crashed", `Dashboard disconnected: ${reason}`, "warning");
			}
		});

		newSocket.on("connect_error", (err) => {
			setError(err.message);
			setConnected(false);
			console.error("[WebSocket] Connection error:", err.message, err);
		});

		// Track reconnection attempts
		newSocket.io.on("reconnect_attempt", (attempt) => {
			setReconnectAttempt(attempt);
			console.log(`[WebSocket] Reconnection attempt ${attempt}`);
		});

		newSocket.io.on("reconnect", (attempt) => {
			console.log(`[WebSocket] Reconnected after ${attempt} attempts`);
			addSystemEvent(
				"agent_respawned",
				`Dashboard reconnected after ${attempt} attempts`,
				"success",
			);
		});

		newSocket.io.on("reconnect_failed", () => {
			console.error("[WebSocket] Reconnection failed after all attempts");
			addSystemEvent("agent_error", "Failed to reconnect to backend", "error");

			// Schedule a manual reconnection attempt
			reconnectTimerRef.current = setTimeout(() => {
				console.log("[WebSocket] Attempting manual reconnection...");
				newSocket.connect();
			}, 5000);
		});

		// Agent lifecycle events
		newSocket.on("agent_spawned", (data: any) => {
			addEvent({
				id: `spawned-${Date.now()}-${Math.random()}`,
				type: "agent_spawned",
				agentName: data.agentName || data.name,
				timestamp: new Date(),
				message: `${data.agentName || data.name} spawned`,
				details: data,
				severity: "success",
			});
		});

		newSocket.on("agent_crashed", (data: any) => {
			addEvent({
				id: `crashed-${Date.now()}-${Math.random()}`,
				type: "agent_crashed",
				agentName: data.agentName || data.name,
				timestamp: new Date(),
				message: `${data.agentName || data.name} crashed`,
				details: data,
				severity: "error",
			});
		});

		newSocket.on("agent_respawned", (data: any) => {
			addEvent({
				id: `respawned-${Date.now()}-${Math.random()}`,
				type: "agent_respawned",
				agentName: data.agentName || data.name,
				timestamp: new Date(),
				message: `${data.agentName || data.name} respawned (downtime: ${data.downtime || "N/A"})`,
				details: data,
				severity: "info",
			});
		});

		newSocket.on("agent_health_changed", (data: any) => {
			addEvent({
				id: `health-${Date.now()}-${Math.random()}`,
				type: "agent_health_changed",
				agentName: data.agentName || data.name,
				timestamp: new Date(),
				message: `${data.agentName || data.name} health: ${data.oldScore || "N/A"} → ${data.newScore || data.healthScore || "N/A"}`,
				details: data,
				severity: "info",
			});
		});

		newSocket.on("agent_killed", (data: any) => {
			addEvent({
				id: `killed-${Date.now()}-${Math.random()}`,
				type: "agent_killed",
				agentName: data.agentName || data.name,
				timestamp: new Date(),
				message: `${data.agentName || data.name} killed`,
				details: data,
				severity: "warning",
			});
		});

		newSocket.on("agent_error", (data: any) => {
			addEvent({
				id: `error-${Date.now()}-${Math.random()}`,
				type: "agent_error",
				agentName: data.agentName || data.name,
				timestamp: new Date(),
				message: `${data.agentName || data.name} error: ${data.error || "Unknown error"}`,
				details: data,
				severity: "error",
			});
		});

		setSocket(newSocket);

		return () => {
			// Clean up timers
			if (reconnectTimerRef.current) {
				clearTimeout(reconnectTimerRef.current);
			}
			if (healthCheckRef.current) {
				clearInterval(healthCheckRef.current);
			}
			newSocket.disconnect();
		};
	}, [addEvent, addSystemEvent]);

	const clearEvents = useCallback(() => {
		setEvents([]);
	}, []);

	// Manual reconnect function
	const reconnect = useCallback(() => {
		if (socket && !connected) {
			console.log("[WebSocket] Manual reconnection triggered");
			socket.connect();
		}
	}, [socket, connected]);

	return {
		socket,
		events,
		connected,
		error,
		reconnectAttempt,
		lastPong,
		clearEvents,
		reconnect,
	};
}

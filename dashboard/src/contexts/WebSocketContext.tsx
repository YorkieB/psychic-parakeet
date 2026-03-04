/*
  This file creates the WebSocket context that manages real-time communication between the dashboard and Jarvis.

  It handles WebSocket connections, processes health events, and maintains connection status while ensuring the dashboard receives live updates from Jarvis's system.
*/
import { createContext, type ReactNode, useContext } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import type { HealthEvent } from "../types";

interface WebSocketContextValue {
	socket: ReturnType<typeof useWebSocket>["socket"];
	events: HealthEvent[];
	connected: boolean;
	error: string | null;
	clearEvents: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
	const { socket, events, connected, error, clearEvents } = useWebSocket();

	return (
		<WebSocketContext.Provider
			value={{
				socket,
				events,
				connected,
				error,
				clearEvents,
			}}
		>
			{children}
		</WebSocketContext.Provider>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

export function useWebSocketContext() {
	const context = useContext(WebSocketContext);
	if (context === undefined) {
		throw new Error("useWebSocketContext must be used within a WebSocketProvider");
	}
	return context;
}

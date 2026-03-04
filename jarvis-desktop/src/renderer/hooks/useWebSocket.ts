import { useEffect, useRef, useState } from "react";

interface UseWebSocketReturn {
	isConnected: boolean;
	send: (data: any) => void;
	lastMessage: any;
}

export function useWebSocket(url: string): UseWebSocketReturn {
	const [isConnected, _setIsConnected] = useState(false);
	const [lastMessage, _setLastMessage] = useState<any>(null);
	const wsRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		// WebSocket connection would be established here
		// For now, return mock implementation
		// In production, connect to backend WebSocket server

		return () => {
			if (wsRef.current) {
				wsRef.current.close();
			}
		};
	}, [url]);

	const send = (data: any) => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(data));
		}
	};

	return {
		isConnected,
		send,
		lastMessage,
	};
}

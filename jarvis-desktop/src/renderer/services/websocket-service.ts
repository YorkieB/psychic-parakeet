export class WebSocketService {
	private ws: WebSocket | null = null;
	private url: string;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private listeners: Map<string, Set<(data: any) => void>> = new Map();

	constructor(url: string) {
		this.url = url;
	}

	connect() {
		try {
			this.ws = new WebSocket(this.url);

			this.ws.onopen = () => {
				console.log("WebSocket connected");
				this.reconnectAttempts = 0;
				this.emit("connected", {});
			};

			this.ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					this.emit(data.type || "message", data);
				} catch (error) {
					console.error("Failed to parse WebSocket message:", error);
				}
			};

			this.ws.onerror = (error) => {
				console.error("WebSocket error:", error);
				this.emit("error", error);
			};

			this.ws.onclose = () => {
				console.log("WebSocket disconnected");
				this.emit("disconnected", {});
				this.reconnect();
			};
		} catch (error) {
			console.error("Failed to connect WebSocket:", error);
		}
	}

	disconnect() {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	send(type: string, data: any) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify({ type, data }));
		}
	}

	on(event: string, callback: (data: any) => void) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)?.add(callback);
	}

	off(event: string, callback: (data: any) => void) {
		const eventListeners = this.listeners.get(event);
		if (eventListeners) {
			eventListeners.delete(callback);
		}
	}

	private emit(event: string, data: any) {
		const eventListeners = this.listeners.get(event);
		if (eventListeners) {
			eventListeners.forEach((callback) => callback(data));
		}
	}

	private reconnect() {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			setTimeout(() => {
				console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
				this.connect();
			}, 1000 * this.reconnectAttempts);
		}
	}

	isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
	}
}

export type Theme = "light" | "dark";

export interface PanelConfig {
	id: string;
	title: string;
	width: number;
	height: number;
}

export interface NotificationOptions {
	title: string;
	body: string;
	icon?: string;
}

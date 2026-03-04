import { create } from "zustand";

interface PanelState {
	openPanels: string[];
	togglePanel: (panelId: string) => void;
	openPanel: (panelId: string) => void;
	closePanel: (panelId: string) => void;
	closeAllPanels: () => void;
}

export const usePanelStore = create<PanelState>((set) => ({
	openPanels: [],

	togglePanel: (panelId: string) => {
		set((state) => {
			if (state.openPanels.includes(panelId)) {
				return {
					openPanels: state.openPanels.filter((id) => id !== panelId),
				};
			} else {
				return {
					openPanels: [...state.openPanels, panelId],
				};
			}
		});
	},

	openPanel: (panelId: string) => {
		set((state) => {
			if (!state.openPanels.includes(panelId)) {
				return {
					openPanels: [...state.openPanels, panelId],
				};
			}
			return state;
		});
	},

	closePanel: (panelId: string) => {
		set((state) => ({
			openPanels: state.openPanels.filter((id) => id !== panelId),
		}));
	},

	closeAllPanels: () => {
		set({ openPanels: [] });
	},
}));

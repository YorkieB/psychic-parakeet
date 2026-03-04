import { useEffect } from "react";

interface KeyboardShortcut {
	key: string;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	callback: () => void;
}

export function useKeyboard(shortcuts: KeyboardShortcut[]) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			shortcuts.forEach((shortcut) => {
				const keyMatch = e.key === shortcut.key || e.code === shortcut.key;
				const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
				const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
				const altMatch = shortcut.alt ? e.altKey : !e.altKey;

				if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
					e.preventDefault();
					shortcut.callback();
				}
			});
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [shortcuts]);
}

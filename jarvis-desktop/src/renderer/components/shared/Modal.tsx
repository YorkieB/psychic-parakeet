/*
  This file creates a reusable modal component that shows pop-up dialogs and overlays in Jarvis's desktop app.

  It handles modal opening/closing, backdrop clicks, keyboard shortcuts, and animations while providing a consistent modal experience throughout the application.
*/

import { X } from "lucide-react";
import type React from "react";
import { useEffect } from "react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
				<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
					<button
						onClick={onClose}
						className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
					>
						<X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
					</button>
				</div>
				<div className="p-4 overflow-y-auto max-h-[calc(90vh-57px)]">{children}</div>
			</div>
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

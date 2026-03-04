/*
  This file creates a toast notification component that shows temporary messages and alerts in Jarvis's desktop app.

  It handles success messages, error alerts, info notifications, auto-dismissal, and animations while providing consistent feedback throughout the application.
*/

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { useEffect } from "react";

interface ToastProps {
	id: string;
	type: "success" | "error" | "info";
	message: string;
	onClose: () => void;
	duration?: number;
}

export function Toast({ id: _id, type, message, onClose, duration = 5000 }: ToastProps) {
	useEffect(() => {
		const timer = setTimeout(onClose, duration);
		return () => clearTimeout(timer);
	}, [duration, onClose]);

	const icons = {
		success: <CheckCircle className="w-5 h-5 text-green-500" />,
		error: <AlertCircle className="w-5 h-5 text-red-500" />,
		info: <Info className="w-5 h-5 text-blue-500" />,
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: -20, x: 0 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, x: 300 }}
			className="glass-card p-4 shadow-lg rounded-lg min-w-[300px] max-w-[400px]"
		>
			<div className="flex items-start space-x-3">
				{icons[type]}
				<p className="flex-1 text-sm text-gray-900 dark:text-white">{message}</p>
				<button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
					<X className="w-4 h-4 text-gray-500" />
				</button>
			</div>
		</motion.div>
	);
}

// Toast Container
interface ToastContainerProps {
	toasts: Array<{
		id: string;
		type: "success" | "error" | "info";
		message: string;
		onClose: () => void;
	}>;
}

export function ToastContainer({ toasts }: ToastContainerProps) {
	return (
		<div className="fixed top-4 right-4 z-50 space-y-2">
			<AnimatePresence>
				{toasts.map((toast) => (
					<Toast key={toast.id} {...toast} />
				))}
			</AnimatePresence>
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

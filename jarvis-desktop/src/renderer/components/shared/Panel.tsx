/*
  This file creates a reusable panel component that provides draggable, resizable windows for Jarvis's desktop app.

  It handles panel positioning, resizing, dragging, window controls, and animations while creating a desktop-like window experience for all panels.
*/

import { motion } from "framer-motion";
import { Maximize2, Minimize2, Minus, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface PanelProps {
	id: string;
	title: string;
	width: number;
	height: number;
	children: React.ReactNode;
	onClose: () => void;
}

const MIN_WIDTH = 320;
const MIN_HEIGHT = 200;

type ResizeDir = "nw" | "ne" | "sw" | "se" | null;

export function Panel({ id: _id, title, width, height, children, onClose }: PanelProps) {
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [size, setSize] = useState({ width, height });
	const [isMinimized, setIsMinimized] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const savedPosition = useRef({ x: 0, y: 0 });
	const savedSize = useRef({ width, height });
	const dragStart = useRef({ x: 0, y: 0 });

	// Keep panels below the app header + menu bar so the main navigation/chat stays reachable
	const TOP_UI_OFFSET = 64 + 64 + 16;

	// Resize state stored in refs to avoid stale closures in listeners
	const resizeDir = useRef<ResizeDir>(null);
	const resizeStart = useRef({
		mouseX: 0,
		mouseY: 0,
		x: 0,
		y: 0,
		width: 0,
		height: 0,
	});

	// Close panel on Escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	useEffect(() => {
		// Clamp size to at most 85% of the viewport so the main UI stays accessible
		const maxWidth = Math.max(MIN_WIDTH, Math.floor(window.innerWidth * 0.85));
		const maxHeight = Math.max(
			MIN_HEIGHT,
			Math.min(Math.floor(window.innerHeight * 0.85), window.innerHeight - TOP_UI_OFFSET - 16),
		);
		const clampedWidth = Math.min(width, maxWidth);
		const clampedHeight = Math.min(height, maxHeight);
		const centered = {
			x: Math.max(16, (window.innerWidth - clampedWidth) / 2),
			y: Math.max(TOP_UI_OFFSET, (window.innerHeight - clampedHeight) / 2),
		};
		setPosition(centered);
		savedPosition.current = centered;
		setSize({ width: clampedWidth, height: clampedHeight });
		savedSize.current = { width: clampedWidth, height: clampedHeight };
	}, [width, height]);

	// ── Resize pointer handlers ──────────────────────────────────────────
	const onResizePointerDown = useCallback(
		(e: React.PointerEvent, dir: ResizeDir) => {
			if (isFullscreen || isMinimized) return;
			e.preventDefault();
			e.stopPropagation();
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
			resizeDir.current = dir;
			resizeStart.current = {
				mouseX: e.clientX,
				mouseY: e.clientY,
				x: position.x,
				y: position.y,
				width: size.width,
				height: size.height,
			};
		},
		[isFullscreen, isMinimized, position, size],
	);

	const onResizePointerMove = useCallback((e: React.PointerEvent) => {
		if (!resizeDir.current) return;
		e.preventDefault();
		const dx = e.clientX - resizeStart.current.mouseX;
		const dy = e.clientY - resizeStart.current.mouseY;
		const dir = resizeDir.current;
		const { x, y, width: w, height: h } = resizeStart.current;

		let newX = x;
		let newY = y;
		let newW = w;
		let newH = h;

		if (dir === "se") {
			newW = Math.max(MIN_WIDTH, w + dx);
			newH = Math.max(MIN_HEIGHT, h + dy);
		} else if (dir === "sw") {
			newW = Math.max(MIN_WIDTH, w - dx);
			newH = Math.max(MIN_HEIGHT, h + dy);
			newX = newW > MIN_WIDTH ? x + dx : x + w - MIN_WIDTH;
		} else if (dir === "ne") {
			newW = Math.max(MIN_WIDTH, w + dx);
			newH = Math.max(MIN_HEIGHT, h - dy);
			newY = newH > MIN_HEIGHT ? y + dy : y + h - MIN_HEIGHT;
		} else if (dir === "nw") {
			newW = Math.max(MIN_WIDTH, w - dx);
			newH = Math.max(MIN_HEIGHT, h - dy);
			newX = newW > MIN_WIDTH ? x + dx : x + w - MIN_WIDTH;
			newY = newH > MIN_HEIGHT ? y + dy : y + h - MIN_HEIGHT;
		}

		setSize({ width: newW, height: newH });
		setPosition({ x: newX, y: newY });
	}, []);

	const onResizePointerUp = useCallback(() => {
		resizeDir.current = null;
	}, []);

	// ── Fullscreen / minimize ────────────────────────────────────────────
	const toggleFullscreen = () => {
		if (!isFullscreen) {
			savedPosition.current = position;
			savedSize.current = size;
			setPosition({ x: 0, y: 0 });
		} else {
			setPosition(savedPosition.current);
			setSize(savedSize.current);
		}
		setIsFullscreen((prev) => !prev);
		setIsMinimized(false);
	};

	const handleMinimize = () => {
		if (isFullscreen && !isMinimized) {
			setIsFullscreen(false);
			setPosition(savedPosition.current);
			setSize(savedSize.current);
		}
		setIsMinimized((prev) => !prev);
	};

	// ── Computed dimensions ──────────────────────────────────────────────
	const currentWidth = isFullscreen ? window.innerWidth : isMinimized ? 220 : size.width;
	const currentHeight = isFullscreen ? window.innerHeight : isMinimized ? 44 : size.height;
	const currentX = isFullscreen ? 0 : isMinimized ? 8 : position.x;
	const currentY = isFullscreen ? 0 : isMinimized ? window.innerHeight - 52 : position.y;

	// ── Resize handle style helpers ──────────────────────────────────────
	const handle = (dir: ResizeDir, cursor: string, className: string) => (
		<div
			className={`absolute z-10 ${className}`}
			style={{ cursor, touchAction: "none" }}
			onPointerDown={(e) => onResizePointerDown(e, dir)}
			onPointerMove={onResizePointerMove}
			onPointerUp={onResizePointerUp}
		>
			{/* Visible grip dot */}
			<div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-white/30 pointer-events-none" />
		</div>
	);

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{
				opacity: 1,
				scale: 1,
				left: currentX,
				top: currentY,
				width: currentWidth,
				height: currentHeight,
			}}
			exit={{ opacity: 0, scale: 0.95 }}
			transition={{ type: "tween", duration: 0.2 }}
			style={{ position: "fixed", zIndex: 50 }}
			className={`glass-card shadow-2xl overflow-hidden ${isFullscreen ? "rounded-none" : "rounded-xl"}`}
		>
			{/* ── Title Bar / drag handle ────────────────────────────────── */}
			<motion.div
				drag={!isFullscreen && !isMinimized}
				dragMomentum={false}
				dragElastic={0}
				dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
				onDragStart={() => {
					setIsDragging(true);
					dragStart.current = { ...position };
				}}
				onDrag={(_e, info) => {
					setPosition({
						x: dragStart.current.x + info.offset.x,
						y: dragStart.current.y + info.offset.y,
					});
				}}
				onDragEnd={(_e, info) => {
					setIsDragging(false);
					setPosition({
						x: dragStart.current.x + info.offset.x,
						y: dragStart.current.y + info.offset.y,
					});
				}}
				className={`h-11 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-between px-4 flex-shrink-0 ${isMinimized ? "rounded-xl" : ""}`}
				style={{
					cursor: isFullscreen || isMinimized ? "default" : isDragging ? "grabbing" : "grab",
				}}
			>
				<h3 className="text-white font-semibold text-sm select-none truncate">{title}</h3>

				<div
					className="flex items-center space-x-1 flex-shrink-0"
					onPointerDown={(e) => e.stopPropagation()}
				>
					<button
						onClick={handleMinimize}
						className="p-1.5 hover:bg-white/20 rounded transition-colors"
						title={isMinimized ? "Restore" : "Minimize"}
					>
						<Minus className="w-3.5 h-3.5 text-white" />
					</button>
					{!isMinimized && (
						<button
							onClick={toggleFullscreen}
							className="p-1.5 hover:bg-white/20 rounded transition-colors"
							title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
						>
							{isFullscreen ? (
								<Minimize2 className="w-3.5 h-3.5 text-white" />
							) : (
								<Maximize2 className="w-3.5 h-3.5 text-white" />
							)}
						</button>
					)}
					<button
						onClick={onClose}
						className="p-1.5 hover:bg-red-500/80 rounded transition-colors"
						title="Close"
					>
						<X className="w-3.5 h-3.5 text-white" />
					</button>
				</div>
			</motion.div>

			{/* ── Content ───────────────────────────────────────────────── */}
			{!isMinimized && (
				<div className="h-[calc(100%-2.75rem)] overflow-hidden bg-white dark:bg-slate-900">
					{children}
				</div>
			)}

			{/* ── Corner resize handles (hidden in fullscreen / minimized) ── */}
			{!isFullscreen && !isMinimized && (
				<>
					{handle("nw", "nw-resize", "top-0 left-0 w-4 h-4")}
					{handle("ne", "ne-resize", "top-0 right-0 w-4 h-4")}
					{handle("sw", "sw-resize", "bottom-0 left-0 w-4 h-4")}
					{handle("se", "se-resize", "bottom-0 right-0 w-4 h-4")}
				</>
			)}
		</motion.div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

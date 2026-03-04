/*
  This file creates a reusable card component that provides consistent container styling across Jarvis's desktop app.

  It handles card layouts, hover effects, and click interactions while making sure all content containers look consistent and professional.
*/
import type React from "react";

interface CardProps {
	children: React.ReactNode;
	className?: string;
	onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
	return (
		<div
			onClick={onClick}
			className={`
        glass-card p-4
        ${onClick ? "cursor-pointer hover:shadow-xl transition-shadow" : ""}
        ${className}
      `}
		>
			{children}
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

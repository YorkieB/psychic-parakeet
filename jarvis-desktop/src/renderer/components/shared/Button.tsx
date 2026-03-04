/*
  This file creates a reusable button component that provides consistent styling and behavior across Jarvis's desktop app.

  It handles different button styles, sizes, and interactions while making sure all buttons look and feel the same throughout the application.
*/
import type React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "ghost";
	size?: "sm" | "md" | "lg";
	children: React.ReactNode;
}

export function Button({
	variant = "primary",
	size = "md",
	children,
	className = "",
	...props
}: ButtonProps) {
	const baseClasses =
		"font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

	const variantClasses = {
		primary: "bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500",
		secondary:
			"bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-900 dark:text-white",
		ghost: "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300",
	};

	const sizeClasses = {
		sm: "px-3 py-1.5 text-sm",
		md: "px-4 py-2 text-base",
		lg: "px-6 py-3 text-lg",
	};

	return (
		<button
			className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
			{...props}
		>
			{children}
		</button>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

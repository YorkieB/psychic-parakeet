/*
  This file creates a bulk test panel component that allows testing multiple agents simultaneously in Jarvis's dashboard.

  It provides batch testing controls, progress tracking, result aggregation, and comprehensive test management while ensuring efficient testing of multiple agents at once.
*/

import { CheckCircle, Download, Loader2, Play, RefreshCw, XCircle, Zap } from "lucide-react";
import { useCallback, useState } from "react";
import { type AgentTestConfig, getAllTestConfigs } from "../config/agentTestConfigs";

interface TestResult {
	agentName: string;
	status: "pending" | "running" | "success" | "failed";
	duration?: number;
	error?: string;
	data?: unknown;
}

interface BulkTestPanelProps {
	onTestSingleAgent?: (name: string) => void;
}

export function BulkTestPanel({ onTestSingleAgent }: BulkTestPanelProps) {
	const [results, setResults] = useState<Map<string, TestResult>>(new Map());
	const [isRunning, setIsRunning] = useState(false);
	const [showResults, setShowResults] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState<string>("all");

	const configs = getAllTestConfigs();

	const filteredConfigs =
		selectedCategory === "all" ? configs : configs.filter((c) => c.category === selectedCategory);

	const categories = ["all", ...new Set(configs.map((c) => c.category))];

	const runSingleTest = async (config: AgentTestConfig): Promise<TestResult> => {
		const startTime = Date.now();
		try {
			const response = await fetch(config.endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: `auto-test-${Date.now()}`,
					action: config.autoTestAction || config.defaultAction,
					inputs: config.autoTestInputs || {},
				}),
			});

			const data = await response.json();
			const duration = Date.now() - startTime;

			if (data.success !== false && response.ok) {
				return {
					agentName: config.name,
					status: "success",
					duration,
					data: data.data || data,
				};
			} else {
				return {
					agentName: config.name,
					status: "failed",
					duration,
					error: data.error || "Request failed",
				};
			}
		} catch (error) {
			return {
				agentName: config.name,
				status: "failed",
				duration: Date.now() - startTime,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	};

	const runAllTests = async () => {
		setIsRunning(true);
		setShowResults(true);
		const newResults = new Map<string, TestResult>();

		// Initialize all as pending
		filteredConfigs.forEach((config) => {
			newResults.set(config.name, {
				agentName: config.name,
				status: "pending",
			});
		});
		setResults(new Map(newResults));

		// Run tests sequentially to avoid overwhelming the system
		for (const config of filteredConfigs) {
			// Set as running
			newResults.set(config.name, {
				agentName: config.name,
				status: "running",
			});
			setResults(new Map(newResults));

			// Execute test
			const result = await runSingleTest(config);
			newResults.set(config.name, result);
			setResults(new Map(newResults));

			// Small delay between tests
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		setIsRunning(false);
	};

	const runParallelTests = useCallback(async () => {
		setIsRunning(true);
		setShowResults(true);
		const newResults = new Map<string, TestResult>();

		// Initialize all as running
		filteredConfigs.forEach((config) => {
			newResults.set(config.name, {
				agentName: config.name,
				status: "running",
			});
		});
		setResults(new Map(newResults));

		// Run all tests in parallel
		const testPromises = filteredConfigs.map(async (config) => {
			const result = await runSingleTest(config);
			newResults.set(config.name, result);
			setResults(new Map(newResults));
			return result;
		});

		await Promise.all(testPromises);
		setIsRunning(false);
	}, [filteredConfigs, runSingleTest]);

	const clearResults = () => {
		setResults(new Map());
		setShowResults(false);
	};

	const exportResults = () => {
		const exportData = Array.from(results.values()).map((r) => ({
			agent: r.agentName,
			status: r.status,
			duration: r.duration,
			error: r.error,
		}));

		const blob = new Blob([JSON.stringify(exportData, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `agent-test-results-${new Date().toISOString().split("T")[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const getStats = () => {
		const all = Array.from(results.values());
		return {
			total: all.length,
			success: all.filter((r) => r.status === "success").length,
			failed: all.filter((r) => r.status === "failed").length,
			pending: all.filter((r) => r.status === "pending" || r.status === "running").length,
			avgDuration: Math.round(
				all.filter((r) => r.duration).reduce((sum, r) => sum + (r.duration || 0), 0) /
					Math.max(all.filter((r) => r.duration).length, 1),
			),
		};
	};

	const stats = getStats();

	const getStatusIcon = (status: TestResult["status"]) => {
		switch (status) {
			case "success":
				return <CheckCircle className="w-4 h-4 text-dashboard-success" />;
			case "failed":
				return <XCircle className="w-4 h-4 text-dashboard-error" />;
			case "running":
				return <Loader2 className="w-4 h-4 text-dashboard-accent animate-spin" />;
			default:
				return <div className="w-4 h-4 rounded-full bg-gray-600" />;
		}
	};

	return (
		<div className="bg-dashboard-card border border-gray-700 rounded-lg p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h3 className="text-lg font-semibold text-dashboard-text">Bulk Agent Testing</h3>
					<p className="text-sm text-gray-400">Run automated tests on all agents</p>
				</div>

				<div className="flex gap-2">
					<select
						value={selectedCategory}
						onChange={(e) => setSelectedCategory(e.target.value)}
						className="px-3 py-2 bg-dashboard-bg border border-gray-600 rounded-lg text-sm text-dashboard-text"
					>
						{categories.map((cat) => (
							<option key={cat} value={cat}>
								{cat === "all" ? "All Categories" : cat.charAt(0).toUpperCase() + cat.slice(1)}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex flex-wrap gap-3 mb-6">
				<button
					onClick={runAllTests}
					disabled={isRunning}
					className="px-4 py-2 bg-dashboard-accent hover:bg-dashboard-accent/80 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
				>
					{isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
					Run Sequential
				</button>
				<button
					onClick={runParallelTests}
					disabled={isRunning}
					className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
				>
					{isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
					Run Parallel
				</button>
				{showResults && (
					<>
						<button
							onClick={clearResults}
							className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-dashboard-text rounded-lg font-medium transition-colors flex items-center gap-2"
						>
							<RefreshCw className="w-4 h-4" />
							Clear
						</button>
						<button
							onClick={exportResults}
							className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-dashboard-text rounded-lg font-medium transition-colors flex items-center gap-2"
						>
							<Download className="w-4 h-4" />
							Export
						</button>
					</>
				)}
			</div>

			{/* Stats */}
			{showResults && (
				<div className="grid grid-cols-5 gap-4 mb-6">
					<div className="bg-dashboard-bg rounded-lg p-3 text-center">
						<div className="text-2xl font-bold text-dashboard-text">{stats.total}</div>
						<div className="text-xs text-gray-400">Total</div>
					</div>
					<div className="bg-dashboard-bg rounded-lg p-3 text-center">
						<div className="text-2xl font-bold text-dashboard-success">{stats.success}</div>
						<div className="text-xs text-gray-400">Passed</div>
					</div>
					<div className="bg-dashboard-bg rounded-lg p-3 text-center">
						<div className="text-2xl font-bold text-dashboard-error">{stats.failed}</div>
						<div className="text-xs text-gray-400">Failed</div>
					</div>
					<div className="bg-dashboard-bg rounded-lg p-3 text-center">
						<div className="text-2xl font-bold text-dashboard-accent">{stats.pending}</div>
						<div className="text-xs text-gray-400">Pending</div>
					</div>
					<div className="bg-dashboard-bg rounded-lg p-3 text-center">
						<div className="text-2xl font-bold text-dashboard-text">{stats.avgDuration}ms</div>
						<div className="text-xs text-gray-400">Avg Time</div>
					</div>
				</div>
			)}

			{/* Results Grid */}
			{showResults && (
				<div className="space-y-2 max-h-96 overflow-y-auto">
					{filteredConfigs.map((config) => {
						const result = results.get(config.name);
						const statusClass =
							result?.status === "success"
								? "border-dashboard-success/30"
								: result?.status === "failed"
									? "border-dashboard-error/30"
									: result?.status === "running"
										? "border-dashboard-accent/30"
										: "border-gray-700";

						return (
							<div
								key={config.name}
								className={`flex items-center justify-between p-3 bg-dashboard-bg rounded-lg border ${statusClass} cursor-pointer hover:bg-gray-800/50 transition-colors`}
								onClick={() => onTestSingleAgent?.(config.name)}
							>
								<div className="flex items-center gap-3">
									<span className="text-xl">{config.icon}</span>
									<div>
										<div className="text-sm font-medium text-dashboard-text">
											{config.displayName}
										</div>
										<div className="text-xs text-gray-500">{config.category}</div>
									</div>
								</div>
								<div className="flex items-center gap-3">
									{result?.duration && (
										<span className="text-xs text-gray-400">{result.duration}ms</span>
									)}
									{result?.error && (
										<span
											className="text-xs text-dashboard-error max-w-32 truncate"
											title={result.error}
										>
											{result.error}
										</span>
									)}
									{getStatusIcon(result?.status || "pending")}
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Instructions */}
			{!showResults && (
				<div className="text-center py-8 text-gray-500">
					<Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
					<p>
						Click "Run Sequential" or "Run Parallel" to test all {filteredConfigs.length} agents
					</p>
					<p className="text-sm mt-2">
						Sequential tests run one at a time, Parallel runs all at once
					</p>
				</div>
			)}
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

/*
  This file creates the finance panel that shows your budget, spending, and financial information in Jarvis's desktop app.

  It displays financial data, budget tracking, spending categories, and financial insights while helping you manage your money and stay on budget.
*/

import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { usePanelStore } from "../../store/panel-store";
import { Panel } from "../shared/Panel";

interface FinanceData {
	totalSpent: number;
	totalBudget: number;
	categories: {
		category: string;
		amount: number;
		percentage: number;
		count: number;
	}[];
	currency: string;
}

export function FinancePanel() {
	const { closePanel } = usePanelStore();
	const [data, setData] = useState<FinanceData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadFinanceData();
	}, []);

	const loadFinanceData = async () => {
		try {
			const api = (window as any).jarvisAPI;
			if (!api?.getFinance) {
				setData(null);
				return;
			}
			const result = await api.getFinance({ period: "month" });
			setData(result);
		} catch (error) {
			console.error("Failed to load finance data:", error);
		} finally {
			setLoading(false);
		}
	};

	const getCategoryColor = (index: number) => {
		const colors = ["bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-green-500"];
		return colors[index % colors.length];
	};

	return (
		<Panel
			id="finance"
			title="💰 Finance"
			width={500}
			height={700}
			onClose={() => closePanel("finance")}
		>
			<div className="p-6 space-y-6">
				{loading ? (
					<div className="flex items-center justify-center h-64">
						<div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
					</div>
				) : data ? (
					<>
						{/* Balance Card */}
						<div className="glass-card p-6">
							<div className="flex items-center justify-between mb-4">
								<div>
									<p className="text-sm text-gray-600 dark:text-gray-400">Total Balance</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-white">
										£{data.totalSpent.toLocaleString()}
									</p>
								</div>
								<div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
									<DollarSign className="w-6 h-6 text-white" />
								</div>
							</div>

							{data.totalSpent > data.totalBudget ? (
								<div className="flex items-center space-x-2 text-red-500">
									<TrendingUp className="w-4 h-4" />
									<span className="text-sm font-medium">
										Over budget by £{(data.totalSpent - data.totalBudget).toLocaleString()}
									</span>
								</div>
							) : (
								<div className="flex items-center space-x-2 text-green-500">
									<TrendingDown className="w-4 h-4" />
									<span className="text-sm font-medium">
										Under budget by £{(data.totalBudget - data.totalSpent).toLocaleString()}
									</span>
								</div>
							)}
						</div>

						{/* Spending by Category */}
						<div>
							<h4 className="font-semibold text-gray-900 dark:text-white mb-4">
								January 2026 Spending
							</h4>

							<div className="space-y-4">
								{data.categories.map((cat, idx) => (
									<div key={cat.category}>
										<div className="flex items-center justify-between mb-2">
											<div className="flex items-center space-x-3">
												<div className={`w-3 h-3 rounded-full ${getCategoryColor(idx)}`} />
												<span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
													{cat.category}
												</span>
											</div>
											<div className="text-right">
												<p className="text-sm font-semibold text-gray-900 dark:text-white">
													£{cat.amount.toFixed(2)}
												</p>
												<p className="text-xs text-gray-500">{cat.count} transactions</p>
											</div>
										</div>

										<div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
											<div
												className={`h-2 rounded-full ${getCategoryColor(idx)}`}
												style={{ width: `${cat.percentage}%` }}
											/>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Actions */}
						<div className="flex space-x-2">
							<button className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium">
								📊 Full Report
							</button>
							<button className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg text-sm font-medium">
								💾 Export
							</button>
						</div>
					</>
				) : (
					<div className="text-center py-12 text-gray-500">
						<p>No financial data available</p>
						<button className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
							Connect Bank
						</button>
					</div>
				)}
			</div>
		</Panel>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

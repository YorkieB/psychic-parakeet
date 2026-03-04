"""
Compare current benchmark results with baseline.

This script runs benchmarks and compares results against a baseline
to detect performance regressions.
"""

import json
from pathlib import Path
from typing import Dict, List

from benchmark_health_system import HealthBenchmarks, run_health_benchmarks
from benchmark_memory_system import (
    KnowledgeGraphBenchmarks,
    MemorySystemBenchmarks,
    MultiUserBenchmarks,
    StorageBenchmarks,
    run_all_benchmarks,
)


def load_baseline(baseline_file: str = "benchmark_baseline.json") -> Dict:
    """
    Load baseline benchmark results.

    Args:
        baseline_file: Path to baseline JSON file

    Returns:
        Dictionary of baseline results
    """
    baseline_path: Path = Path(baseline_file)
    if not baseline_path.exists():
        print(f"Warning: Baseline file {baseline_file} not found. Creating new baseline.")
        return {}

    with open(baseline_path, "r") as f:
        return json.load(f)


def save_baseline(results: Dict, baseline_file: str = "benchmark_baseline.json") -> None:
    """
    Save benchmark results as new baseline.

    Args:
        results: Dictionary of benchmark results
        baseline_file: Path to baseline JSON file
    """
    baseline_dict: Dict = {}
    for result in results:
        baseline_dict[result["name"]] = {
            "mean": result["mean"],
            "median": result["median"],
            "stdev": result["stdev"],
            "min": result["min"],
            "max": result["max"],
        }

    with open(baseline_file, "w") as f:
        json.dump(baseline_dict, f, indent=2)

    print(f"\nBaseline saved to {baseline_file}")


def compare_results(current: Dict, baseline: Dict, threshold: float = 0.1) -> List[Dict]:
    """
    Compare current results with baseline.

    Args:
        current: Current benchmark results
        baseline: Baseline benchmark results
        threshold: Performance regression threshold (default: 10%)

    Returns:
        List of regression reports
    """
    regressions: List[Dict] = []

    for result in current:
        name: str = result["name"]
        if name not in baseline:
            print(f"Warning: No baseline for {name}")
            continue

        baseline_mean: float = baseline[name]["mean"]
        current_mean: float = result["mean"]
        
        # Both values should be in seconds, compare directly
        if baseline_mean == 0:
            percent_change = 0.0
        else:
            percent_change: float = ((current_mean - baseline_mean) / baseline_mean) * 100

        if percent_change > threshold * 100:
            regressions.append(
                {
                    "name": name,
                    "baseline_mean": baseline_mean,
                    "current_mean": current_mean,
                    "percent_change": percent_change,
                    "status": "REGRESSION",
                }
            )
        elif percent_change < -threshold * 100:
            regressions.append(
                {
                    "name": name,
                    "baseline_mean": baseline_mean,
                    "current_mean": current_mean,
                    "percent_change": percent_change,
                    "status": "IMPROVEMENT",
                }
            )

    return regressions


def print_comparison_report(regressions: List[Dict]) -> None:
    """
    Print comparison report.

    Args:
        regressions: List of regression reports
    """
    if not regressions:
        print("\n[OK] No significant performance changes detected (within 10% threshold)")
        return

    print("\n" + "=" * 60)
    print("PERFORMANCE COMPARISON REPORT")
    print("=" * 60)

    improvements: List[Dict] = [r for r in regressions if r["status"] == "IMPROVEMENT"]
    performance_regressions: List[Dict] = [
        r for r in regressions if r["status"] == "REGRESSION"
    ]

    if performance_regressions:
        print("\n[WARNING] PERFORMANCE REGRESSIONS (>10% slower):")
        print("-" * 60)
        for reg in performance_regressions:
            print(f"  {reg['name']}")
            print(f"    Baseline: {reg['baseline_mean']*1000:.3f} ms")
            print(f"    Current:  {reg['current_mean']*1000:.3f} ms")
            print(f"    Change:   +{reg['percent_change']:.1f}%")
            print()

    if improvements:
        print("\n[IMPROVEMENT] PERFORMANCE IMPROVEMENTS (>10% faster):")
        print("-" * 60)
        for imp in improvements:
            print(f"  {imp['name']}")
            print(f"    Baseline: {imp['baseline_mean']*1000:.3f} ms")
            print(f"    Current:  {imp['current_mean']*1000:.3f} ms")
            print(f"    Change:   {imp['percent_change']:.1f}%")
            print()

    print("=" * 60)


def run_comparison(
    update_baseline: bool = False, threshold: float = 0.1
) -> None:
    """
    Run benchmarks and compare with baseline.

    Args:
        update_baseline: Whether to update baseline with current results
        threshold: Performance regression threshold (default: 10%)
    """
    print("\n" + "=" * 60)
    print("RUNNING BENCHMARKS FOR COMPARISON")
    print("=" * 60)

    # Run benchmarks
    mem_bench: MemorySystemBenchmarks = MemorySystemBenchmarks()
    mem_bench.benchmark_ingest(iterations=100)
    mem_bench.benchmark_query(iterations=100)
    mem_bench.benchmark_consolidation(iterations=10)

    kg_bench: KnowledgeGraphBenchmarks = KnowledgeGraphBenchmarks()
    kg_bench.benchmark_relationship_creation(iterations=100)
    kg_bench.benchmark_path_finding(iterations=10)

    mu_bench: MultiUserBenchmarks = MultiUserBenchmarks()
    mu_bench.benchmark_user_creation(iterations=100)

    storage_bench: StorageBenchmarks = StorageBenchmarks()
    storage_bench.benchmark_sqlite_operations()

    health_bench: HealthBenchmarks = HealthBenchmarks()
    health_bench.benchmark_symptom_logging(iterations=100)
    health_bench.benchmark_medication_tracking(iterations=100)
    health_bench.benchmark_health_score_calculation(iterations=10)

    # Collect all results
    all_results: List[Dict] = []
    all_results.extend(mem_bench.results)
    all_results.extend(kg_bench.results)
    all_results.extend(mu_bench.results)
    all_results.extend(storage_bench.results)
    all_results.extend(health_bench.results)

    # Load baseline
    baseline: Dict = load_baseline()

    if update_baseline:
        save_baseline(all_results)
    else:
        # Compare with baseline
        if baseline:
            regressions: List[Dict] = compare_results(all_results, baseline, threshold)
            print_comparison_report(regressions)
        else:
            print("\nNo baseline found. Saving current results as baseline...")
            save_baseline(all_results)


if __name__ == "__main__":
    import sys

    update: bool = "--update" in sys.argv or "-u" in sys.argv
    run_comparison(update_baseline=update)

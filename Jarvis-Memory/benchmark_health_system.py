"""
Performance benchmarks for health memory system.

This module provides comprehensive benchmarking for health tracking operations
including symptom logging, medication tracking, wearable sync, and health analysis.
"""

import statistics
import tempfile
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List

from health_export_formats import HealthExportFormats
from health_visualization import HealthVisualization
from smart_health_alerts import SmartHealthMemory
from wearable_device_integration import WearableHealthMemory


class HealthBenchmarks:
    """Benchmarks for health system operations."""

    def __init__(self) -> None:
        """Initialize benchmarks."""
        self.results: List[Dict] = []

    def benchmark_symptom_logging(self, iterations: int = 1000) -> Dict:
        """
        Benchmark symptom logging.

        Args:
            iterations: Number of iterations to run

        Returns:
            Statistics dictionary
        """
        health: SmartHealthMemory = SmartHealthMemory("bench_user")

        times: List[float] = []
        for i in range(iterations):
            start: float = time.perf_counter()
            health.log_symptom(f"symptom_{i}", severity=i % 10)
            elapsed: float = time.perf_counter() - start
            times.append(elapsed)

        stats: Dict = self._calculate_stats("Symptom Logging", times)
        self._print_stats(stats)
        self.results.append(stats)
        return stats

    def benchmark_medication_tracking(self, iterations: int = 1000) -> Dict:
        """
        Benchmark medication tracking.

        Args:
            iterations: Number of iterations to run

        Returns:
            Statistics dictionary
        """
        health: SmartHealthMemory = SmartHealthMemory("bench_user")

        times: List[float] = []
        for i in range(iterations):
            start: float = time.perf_counter()
            health.log_medication(f"med_{i}", "10mg", "condition", "daily")
            elapsed: float = time.perf_counter() - start
            times.append(elapsed)

        stats: Dict = self._calculate_stats("Medication Tracking", times)
        self._print_stats(stats)
        self.results.append(stats)
        return stats

    def benchmark_wearable_sync(self, iterations: int = 1000) -> Dict:
        """
        Benchmark wearable device sync.

        Args:
            iterations: Number of iterations to run

        Returns:
            Statistics dictionary
        """
        health: WearableHealthMemory = WearableHealthMemory("bench_user")
        health.register_device("dev1", "fitness_tracker", "Fitbit")

        times: List[float] = []
        for i in range(iterations):
            start: float = time.perf_counter()
            health.sync_device_data("dev1", heart_rate=60 + (i % 40))
            elapsed: float = time.perf_counter() - start
            times.append(elapsed)

        stats: Dict = self._calculate_stats("Wearable Sync (Heart Rate)", times)
        self._print_stats(stats)
        self.results.append(stats)
        return stats

    def benchmark_health_score_calculation(self, iterations: int = 100) -> Dict:
        """
        Benchmark health score calculation.

        Args:
            iterations: Number of iterations to run

        Returns:
            Statistics dictionary
        """
        health: HealthVisualization = HealthVisualization("bench_user")

        # Add some data first
        for i in range(100):
            health.log_symptom(f"symptom_{i}", i % 10)
            health.log_exercise(f"activity_{i}", 30, "moderate")

        times: List[float] = []
        for _ in range(iterations):
            start: float = time.perf_counter()
            health.calculate_health_score()
            elapsed: float = time.perf_counter() - start
            times.append(elapsed)

        stats: Dict = self._calculate_stats("Health Score Calculation", times)
        self._print_stats(stats)
        self.results.append(stats)
        return stats

    def benchmark_fhir_export(self, iterations: int = 100) -> Dict:
        """
        Benchmark FHIR export.

        Args:
            iterations: Number of iterations to run

        Returns:
            Statistics dictionary
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            health: HealthExportFormats = HealthExportFormats("bench_user", "John Doe")

            # Add data
            for i in range(50):
                health.log_medication(f"med_{i}", "10mg", "condition", "daily")

            times: List[float] = []
            for _ in range(iterations):
                start: float = time.perf_counter()
                filename: str = str(Path(tmpdir) / f"export_{time.time()}.json")
                health.export_fhir_bundle(filename)
                elapsed: float = time.perf_counter() - start
                times.append(elapsed)

            stats: Dict = self._calculate_stats("FHIR Export", times)
            self._print_stats(stats)
            self.results.append(stats)
            return stats

    def benchmark_hl7_export(self, iterations: int = 100) -> Dict:
        """
        Benchmark HL7 export.

        Args:
            iterations: Number of iterations to run

        Returns:
            Statistics dictionary
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            health: HealthExportFormats = HealthExportFormats("bench_user", "John Doe")

            # Add data
            for i in range(50):
                health.log_medication(f"med_{i}", "10mg", "condition", "daily")

            times: List[float] = []
            for _ in range(iterations):
                start: float = time.perf_counter()
                filename: str = str(Path(tmpdir) / f"export_{time.time()}.hl7")
                health.export_hl7_message(filename)
                elapsed: float = time.perf_counter() - start
                times.append(elapsed)

            stats: Dict = self._calculate_stats("HL7 Export", times)
            self._print_stats(stats)
            self.results.append(stats)
            return stats

    def _calculate_stats(self, name: str, times: List[float]) -> Dict:
        """
        Calculate statistics from timing data.

        Args:
            name: Name of the benchmark
            times: List of timing measurements

        Returns:
            Statistics dictionary
        """
        return {
            "name": name,
            "iterations": len(times),
            "mean": statistics.mean(times),
            "median": statistics.median(times),
            "stdev": statistics.stdev(times) if len(times) > 1 else 0.0,
            "min": min(times),
            "max": max(times),
            "total": sum(times),
        }

    def _print_stats(self, stats: Dict) -> None:
        """
        Print benchmark statistics.

        Args:
            stats: Statistics dictionary
        """
        print(f"\n{'='*60}")
        print(f"BENCHMARK: {stats['name']}")
        print(f"{'='*60}")
        print(f"Iterations:  {stats['iterations']}")
        print(f"Mean:        {stats['mean']*1000:.3f} ms")
        print(f"Median:      {stats['median']*1000:.3f} ms")
        if stats['stdev'] > 0:
            print(f"Std Dev:     {stats['stdev']*1000:.3f} ms")
        print(f"Min:         {stats['min']*1000:.3f} ms")
        print(f"Max:         {stats['max']*1000:.3f} ms")
        print(f"Total:       {stats['total']:.3f} s")
        print(f"{'='*60}")


def run_health_benchmarks() -> None:
    """Run health system benchmarks."""
    print("\n" + "=" * 60)
    print("HEALTH SYSTEM - PERFORMANCE BENCHMARKS")
    print("=" * 60)

    bench: HealthBenchmarks = HealthBenchmarks()

    bench.benchmark_symptom_logging(iterations=1000)
    bench.benchmark_medication_tracking(iterations=1000)
    bench.benchmark_wearable_sync(iterations=1000)
    bench.benchmark_health_score_calculation(iterations=100)
    bench.benchmark_fhir_export(iterations=100)
    bench.benchmark_hl7_export(iterations=100)

    print("\n" + "=" * 60)
    print("HEALTH BENCHMARK SUITE COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    run_health_benchmarks()

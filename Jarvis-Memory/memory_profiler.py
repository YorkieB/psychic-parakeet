"""
Memory usage profiler for Jarvis system.

This module provides memory profiling capabilities to measure memory usage
of various operations in the Jarvis memory system.
"""

import sys
import tracemalloc
from typing import Callable, Dict

from jarvis_memory_system import JarvisMemorySystem
from knowledge_graph_jarvis import KnowledgeGraphJarvis
from smart_health_alerts import SmartHealthMemory


class MemoryProfiler:
    """Profile memory usage of operations."""

    def __init__(self) -> None:
        """Initialize profiler."""
        self.snapshots: list = []

    def profile(self, func: Callable[[], None], name: str) -> Dict:
        """
        Profile memory usage of function.

        Args:
            func: Function to profile (must be callable with no args)
            name: Name of operation

        Returns:
            Memory statistics dictionary
        """
        tracemalloc.start()

        # Take snapshot before
        snapshot_before = tracemalloc.take_snapshot()

        # Run function
        func()

        # Take snapshot after
        snapshot_after = tracemalloc.take_snapshot()

        # Calculate difference
        top_stats = snapshot_after.compare_to(snapshot_before, "lineno")

        current: int
        peak: int
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        return {
            "name": name,
            "current_mb": current / 1024 / 1024,
            "peak_mb": peak / 1024 / 1024,
            "top_allocations": len(top_stats),
            "top_stats": top_stats[:10] if top_stats else [],
        }

    def print_stats(self, stats: Dict) -> None:
        """
        Print memory statistics.

        Args:
            stats: Memory statistics dictionary
        """
        print(f"\n{'='*60}")
        print(f"MEMORY PROFILE: {stats['name']}")
        print(f"{'='*60}")
        print(f"Current:     {stats['current_mb']:.2f} MB")
        print(f"Peak:        {stats['peak_mb']:.2f} MB")
        print(f"Allocations: {stats['top_allocations']}")
        if stats["top_stats"]:
            print("\nTop 5 Memory Allocations:")
            for stat in stats["top_stats"][:5]:
                print(f"  {stat}")
        print(f"{'='*60}")


def profile_memory_operations() -> None:
    """Profile memory usage of key operations."""
    profiler: MemoryProfiler = MemoryProfiler()

    # Profile: Ingest 1000 memories
    def ingest_1000() -> None:
        jarvis: JarvisMemorySystem = JarvisMemorySystem()
        for i in range(1000):
            jarvis.ingest(f"Memory {i} with content")

    stats: Dict = profiler.profile(ingest_1000, "Ingest 1000 Memories")
    profiler.print_stats(stats)

    # Profile: Knowledge graph with 100 facts
    def knowledge_graph_100() -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            jarvis: KnowledgeGraphJarvis = KnowledgeGraphJarvis(
                storage_dir=tmpdir, auto_load=False, auto_save=False
            )
            facts: list = []
            for i in range(100):
                mem = jarvis.ingest(f"Fact {i}")
                facts.append(mem)

    stats = profiler.profile(knowledge_graph_100, "Knowledge Graph (100 facts)")
    profiler.print_stats(stats)

    # Profile: Health system with 500 logs
    def health_500_logs() -> None:
        health: SmartHealthMemory = SmartHealthMemory("profile_user")
        for i in range(500):
            health.log_symptom(f"symptom_{i}", i % 10)

    stats = profiler.profile(health_500_logs, "Health System (500 logs)")
    profiler.print_stats(stats)

    # Profile: Large query operation
    def large_query() -> None:
        jarvis: JarvisMemorySystem = JarvisMemorySystem()
        for i in range(5000):
            jarvis.ingest(f"Memory {i} with varied content")
        for _ in range(100):
            jarvis.query("memory", top_k=10)

    stats = profiler.profile(large_query, "Large Query Operation (5k memories, 100 queries)")
    profiler.print_stats(stats)


if __name__ == "__main__":
    profile_memory_operations()

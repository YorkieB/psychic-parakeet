"""
Performance benchmarks for Jarvis Memory System.

This module provides comprehensive benchmarking for all major memory operations
including ingestion, querying, consolidation, and knowledge graph operations.
"""

import statistics
import tempfile
import time
from typing import Callable, Dict, List

from jarvis_memory_system import JarvisMemorySystem
from knowledge_graph_jarvis import KnowledgeGraphJarvis
from knowledge_graph import RelationType
from memory import Memory
from multi_user_jarvis import MultiUserJarvis
from sqlite_jarvis import SQLiteJarvis


class Benchmark:
    """Benchmark runner for timing operations."""

    def __init__(self, name: str) -> None:
        """
        Initialize benchmark.

        Args:
            name: Name of the benchmark
        """
        self.name: str = name
        self.results: List[float] = []

    def run(self, func: Callable[[], None], iterations: int = 100) -> Dict:
        """
        Run benchmark multiple times and collect statistics.

        Args:
            func: Function to benchmark (must be callable with no args)
            iterations: Number of times to run

        Returns:
            Statistics dictionary with timing information
        """
        self.results = []

        for _ in range(iterations):
            start: float = time.perf_counter()
            func()
            elapsed: float = time.perf_counter() - start
            self.results.append(elapsed)

        return {
            "name": self.name,
            "iterations": iterations,
            "mean": statistics.mean(self.results),
            "median": statistics.median(self.results),
            "stdev": statistics.stdev(self.results) if len(self.results) > 1 else 0.0,
            "min": min(self.results),
            "max": max(self.results),
            "total": sum(self.results),
        }

    def print_results(self, stats: Dict) -> None:
        """
        Print benchmark results in formatted output.

        Args:
            stats: Statistics dictionary from run()
        """
        print(f"\n{'='*60}")
        print(f"BENCHMARK: {stats['name']}")
        print(f"{'='*60}")
        print(f"Iterations:  {stats['iterations']}")
        print(f"Mean:        {stats['mean']*1000:.3f} ms")
        print(f"Median:      {stats['median']*1000:.3f} ms")
        print(f"Std Dev:     {stats['stdev']*1000:.3f} ms")
        print(f"Min:         {stats['min']*1000:.3f} ms")
        print(f"Max:         {stats['max']*1000:.3f} ms")
        print(f"Total:       {stats['total']:.3f} s")
        print(f"{'='*60}")


class MemorySystemBenchmarks:
    """Benchmarks for core memory operations."""

    def __init__(self) -> None:
        """Initialize benchmarks."""
        self.jarvis: JarvisMemorySystem = JarvisMemorySystem()
        self.results: List[Dict] = []

    def benchmark_ingest(self, iterations: int = 1000) -> Dict:
        """
        Benchmark memory ingestion.

        Args:
            iterations: Number of iterations to run

        Returns:
            Statistics dictionary
        """
        bench: Benchmark = Benchmark("Memory Ingestion")

        counter: int = 0

        def ingest() -> None:
            nonlocal counter
            self.jarvis.ingest(f"Test memory {counter}")
            counter += 1

        stats: Dict = bench.run(ingest, iterations)
        bench.print_results(stats)
        self.results.append(stats)
        return stats

    def benchmark_query(self, iterations: int = 1000) -> Dict:
        """
        Benchmark memory queries.

        Args:
            iterations: Number of iterations to run

        Returns:
            Statistics dictionary
        """
        # First, ingest data
        for i in range(1000):
            self.jarvis.ingest(f"Memory number {i} with content")

        bench: Benchmark = Benchmark("Memory Query (top_k=10)")

        def query() -> None:
            self.jarvis.query("memory", top_k=10)

        stats: Dict = bench.run(query, iterations)
        bench.print_results(stats)
        self.results.append(stats)
        return stats

    def benchmark_consolidation(self, iterations: int = 100) -> Dict:
        """
        Benchmark memory consolidation.

        Args:
            iterations: Number of iterations to run

        Returns:
            Statistics dictionary
        """
        bench: Benchmark = Benchmark("Memory Consolidation")

        def consolidate() -> None:
            jarvis: JarvisMemorySystem = JarvisMemorySystem()
            # Ingest same content 3 times to trigger consolidation
            for _ in range(3):
                jarvis.ingest("repeated fact for consolidation")

        stats: Dict = bench.run(consolidate, iterations)
        bench.print_results(stats)
        self.results.append(stats)
        return stats

    def benchmark_large_dataset_query(self) -> Dict:
        """
        Benchmark queries on large dataset.

        Returns:
            Statistics dictionary
        """
        jarvis: JarvisMemorySystem = JarvisMemorySystem()

        # Ingest 10,000 memories
        print("\nIngesting 10,000 memories...")
        start: float = time.time()
        for i in range(10000):
            jarvis.ingest(f"Large dataset memory {i} with varied content")
        ingest_time: float = time.time() - start
        print(f"Ingestion completed in {ingest_time:.2f}s")

        # Benchmark queries
        bench: Benchmark = Benchmark("Large Dataset Query (10k memories, top_k=10)")

        def query() -> None:
            jarvis.query("memory", top_k=10)

        stats: Dict = bench.run(query, iterations=100)
        bench.print_results(stats)
        self.results.append(stats)
        return stats


class KnowledgeGraphBenchmarks:
    """Benchmarks for knowledge graph operations."""

    def __init__(self) -> None:
        """Initialize benchmarks."""
        self.results: List[Dict] = []

    def benchmark_relationship_creation(self, iterations: int = 1000) -> Dict:
        """
        Benchmark creating relationships.

        Args:
            iterations: Number of iterations to run

        Returns:
            Statistics dictionary
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            jarvis: KnowledgeGraphJarvis = KnowledgeGraphJarvis(
                storage_dir=tmpdir, auto_load=False, auto_save=False
            )

            # Create facts first
            facts: List[Memory] = []
            for i in range(100):
                mem: Memory = jarvis.ingest(f"Fact {i}")
                facts.append(mem)

            bench: Benchmark = Benchmark("Knowledge Graph Relationship Creation")
            counter: int = 0

            def create_relation() -> None:
                nonlocal counter
                i: int = counter % len(facts)
                j: int = (counter + 1) % len(facts)
                jarvis.relate(facts[i].id, facts[j].id, RelationType.RELATED_TO)
                counter += 1

            stats: Dict = bench.run(create_relation, iterations)
            bench.print_results(stats)
            self.results.append(stats)
            return stats

    def benchmark_path_finding(self, iterations: int = 100) -> Dict:
        """
        Benchmark finding paths between facts.

        Args:
            iterations: Number of iterations to run

        Returns:
            Statistics dictionary
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            jarvis: KnowledgeGraphJarvis = KnowledgeGraphJarvis(
                storage_dir=tmpdir, auto_load=False, auto_save=False
            )

            # Create chain of facts
            facts: List[Memory] = []
            for i in range(50):
                mem: Memory = jarvis.ingest(f"Fact {i}")
                facts.append(mem)

            # Create chain relationships
            for i in range(len(facts) - 1):
                jarvis.relate(facts[i].id, facts[i + 1].id, RelationType.CAUSE_EFFECT)

            bench: Benchmark = Benchmark("Knowledge Graph Path Finding")

            def find_path() -> None:
                jarvis.find_path(facts[0].id, facts[-1].id)

            stats: Dict = bench.run(find_path, iterations)
            bench.print_results(stats)
            self.results.append(stats)
            return stats


class MultiUserBenchmarks:
    """Benchmarks for multi-user operations."""

    def __init__(self) -> None:
        """Initialize benchmarks."""
        self.results: List[Dict] = []

    def benchmark_user_creation(self, iterations: int = 1000) -> Dict:
        """
        Benchmark user creation.

        Args:
            iterations: Number of iterations to run

        Returns:
            Statistics dictionary
        """
        bench: Benchmark = Benchmark("Multi-User Creation")
        counter: int = 0

        def create_user() -> None:
            nonlocal counter
            with tempfile.TemporaryDirectory() as tmpdir:
                system: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)
                system.create_user(f"user_{counter}")
                counter += 1

        stats: Dict = bench.run(create_user, iterations)
        bench.print_results(stats)
        self.results.append(stats)
        return stats

    def benchmark_concurrent_user_operations(self) -> Dict:
        """
        Benchmark multiple users operating concurrently.

        Returns:
            Statistics dictionary
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            system: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

            # Create 10 users
            users: List[str] = []
            for i in range(10):
                system.create_user(f"user_{i}")
                users.append(f"user_{i}")

            bench: Benchmark = Benchmark("Concurrent User Operations (10 users)")
            counter: int = 0

            def concurrent_ops() -> None:
                nonlocal counter
                user_id: str = users[counter % len(users)]
                system.ingest(user_id, f"Memory from user {counter}")
                counter += 1

            stats: Dict = bench.run(concurrent_ops, iterations=1000)
            bench.print_results(stats)
            self.results.append(stats)
            return stats


class StorageBenchmarks:
    """Benchmarks for storage backends."""

    def __init__(self) -> None:
        """Initialize benchmarks."""
        self.results: List[Dict] = []

    def benchmark_sqlite_operations(self) -> List[Dict]:
        """
        Benchmark SQLite storage operations.

        Returns:
            List of statistics dictionaries
        """
        jarvis: SQLiteJarvis = SQLiteJarvis(db_path=":memory:", auto_load=False, auto_save=False)

        # Benchmark inserts
        bench_insert: Benchmark = Benchmark("SQLite Insert (1000 memories)")

        def insert_batch() -> None:
            jarvis_temp: SQLiteJarvis = SQLiteJarvis(
                db_path=":memory:", auto_load=False, auto_save=False
            )
            for i in range(1000):
                jarvis_temp.ingest(f"Memory {i}")

        stats_insert: Dict = bench_insert.run(insert_batch, iterations=10)
        bench_insert.print_results(stats_insert)

        # Ingest data for query benchmark
        for i in range(1000):
            jarvis.ingest(f"SQLite memory {i}")

        # Benchmark queries
        bench_query: Benchmark = Benchmark("SQLite Query (1000 memories)")

        def query() -> None:
            jarvis.query("memory", top_k=10)

        stats_query: Dict = bench_query.run(query, iterations=1000)
        bench_query.print_results(stats_query)

        self.results.extend([stats_insert, stats_query])
        return [stats_insert, stats_query]


def run_all_benchmarks() -> None:
    """Run complete benchmark suite."""
    print("\n" + "=" * 60)
    print("JARVIS MEMORY SYSTEM - PERFORMANCE BENCHMARKS")
    print("=" * 60)

    # Memory system benchmarks
    print("\n### CORE MEMORY SYSTEM BENCHMARKS ###")
    mem_bench: MemorySystemBenchmarks = MemorySystemBenchmarks()
    mem_bench.benchmark_ingest(iterations=1000)
    mem_bench.benchmark_query(iterations=1000)
    mem_bench.benchmark_consolidation(iterations=100)
    mem_bench.benchmark_large_dataset_query()

    # Knowledge graph benchmarks
    print("\n### KNOWLEDGE GRAPH BENCHMARKS ###")
    kg_bench: KnowledgeGraphBenchmarks = KnowledgeGraphBenchmarks()
    kg_bench.benchmark_relationship_creation(iterations=1000)
    kg_bench.benchmark_path_finding(iterations=100)

    # Multi-user benchmarks
    print("\n### MULTI-USER BENCHMARKS ###")
    mu_bench: MultiUserBenchmarks = MultiUserBenchmarks()
    mu_bench.benchmark_user_creation(iterations=1000)
    mu_bench.benchmark_concurrent_user_operations()

    # Storage benchmarks
    print("\n### STORAGE BENCHMARKS ###")
    storage_bench: StorageBenchmarks = StorageBenchmarks()
    storage_bench.benchmark_sqlite_operations()

    # Summary
    print("\n" + "=" * 60)
    print("BENCHMARK SUITE COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    run_all_benchmarks()

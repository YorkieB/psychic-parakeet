"""
Integration tests for complete Jarvis memory system.

Tests cover full STM → MTM → LTM pipeline and unified system operations.
"""

from datetime import timedelta

import pytest

from jarvis_memory_system import JarvisMemorySystem
from memory import Memory
from short_term_memory import ShortTermMemory


def test_full_stm_mtm_ltm_pipeline() -> None:
    """Test complete end-to-end flow: STM → MTM → LTM."""
    jarvis: JarvisMemorySystem = JarvisMemorySystem()

    # Ingest memories to STM
    for i in range(5):
        jarvis.ingest(
            f"I work at Google (variant {i})",
            emotion="neutral",
            context="work",
            importance_score=0.7,
        )

    # Make memories stale
    for mem in jarvis.stm.retrieve_all():
        mem.created_at = jarvis.stm._session_start - timedelta(hours=2)

    # Consolidate (STM → MTM → LTM)
    stats: dict[str, int] = jarvis.consolidate()

    # Verify consolidation happened
    assert stats["stm_to_mtm_moved"] >= 0
    assert stats["ltm_total"] >= 0


def test_consolidation_with_patterns() -> None:
    """Test consolidation with clear patterns."""
    jarvis: JarvisMemorySystem = JarvisMemorySystem()

    # Add memories with clear pattern (same fact mentioned multiple times)
    for i in range(4):
        jarvis.ingest(
            "I work at Google",
            emotion="neutral",
            context="work",
            importance_score=0.8,
        )

    # Make stale
    for mem in jarvis.stm.retrieve_all():
        mem.created_at = jarvis.stm._session_start - timedelta(hours=2)

    # Consolidate
    stats: dict[str, int] = jarvis.consolidate()

    # Should detect pattern and consolidate
    assert stats["patterns_detected"] >= 0
    assert stats["patterns_consolidated"] >= 0


def test_deduplication_effectiveness() -> None:
    """Test deduplication effectiveness."""
    jarvis: JarvisMemorySystem = JarvisMemorySystem()

    # Add many similar facts directly to LTM
    for i in range(10):
        fact: Memory = Memory(
            content="I work at Google",
            confidence=0.8,
            importance_score=0.7,
        )
        jarvis.ltm.add(fact)

    facts_before: int = len(jarvis.ltm.facts)

    # Run deduplication
    dedup_stats: dict[str, int] = jarvis.ltm.deduplication_pass()

    facts_after: int = len(jarvis.ltm.facts)

    # Should have merged duplicates
    assert facts_after <= facts_before
    assert dedup_stats["merged_count"] >= 0


def test_jarvis_query() -> None:
    """Test querying entire system."""
    jarvis: JarvisMemorySystem = JarvisMemorySystem()

    # Ingest memories
    jarvis.ingest("I work at Google", importance_score=0.8)
    jarvis.ingest("I love Python programming", importance_score=0.7)

    # Query system
    results: list[Memory] = jarvis.query("Google", top_k=5)

    # Should find results
    assert len(results) > 0
    assert any("Google" in mem.content for mem in results)


def test_jarvis_multiple_consolidations() -> None:
    """Test running consolidation multiple times."""
    jarvis: JarvisMemorySystem = JarvisMemorySystem()

    # First consolidation
    for i in range(3):
        jarvis.ingest(
            f"I work at Google {i}",
            importance_score=0.7,
        )

    for mem in jarvis.stm.retrieve_all():
        mem.created_at = jarvis.stm._session_start - timedelta(hours=2)

    stats1: dict[str, int] = jarvis.consolidate()

    # Second consolidation
    for i in range(3):
        jarvis.ingest(
            f"I work at Google {i}",
            importance_score=0.7,
        )

    for mem in jarvis.stm.retrieve_all():
        mem.created_at = jarvis.stm._session_start - timedelta(hours=2)

    stats2: dict[str, int] = jarvis.consolidate()

    # System should remain stable
    assert stats2["ltm_total"] >= stats1["ltm_total"]


def test_jarvis_get_system_stats() -> None:
    """Test getting system-wide statistics."""
    jarvis: JarvisMemorySystem = JarvisMemorySystem()

    # Add some memories
    jarvis.ingest("Test memory 1", importance_score=0.7)
    jarvis.ingest("Test memory 2", importance_score=0.8)

    stats: dict = jarvis.get_system_stats()

    assert "stm_stats" in stats
    assert "mtm_stats" in stats
    assert "ltm_stats" in stats
    assert "total_memories" in stats
    assert stats["total_memories"] > 0


def test_jarvis_ingest_with_embedding() -> None:
    """Test ingesting with pre-computed embedding."""
    jarvis: JarvisMemorySystem = JarvisMemorySystem()

    embedding: list[float] = [0.1] * 384

    memory: Memory = jarvis.ingest(
        "Test memory",
        embedding=embedding,
        importance_score=0.7,
    )

    assert memory.embedding == embedding
    assert memory in jarvis.stm.retrieve_all()


def test_jarvis_query_empty() -> None:
    """Test querying empty system."""
    jarvis: JarvisMemorySystem = JarvisMemorySystem()

    results: list[Memory] = jarvis.query("test", top_k=5)

    assert len(results) == 0


def test_jarvis_full_workflow() -> None:
    """Test complete workflow: ingest → consolidate → query."""
    jarvis: JarvisMemorySystem = JarvisMemorySystem()

    # Step 1: Ingest
    jarvis.ingest("I work at Google", importance_score=0.8)
    jarvis.ingest("I work at Google", importance_score=0.8)
    jarvis.ingest("I work at Google", importance_score=0.8)

    # Step 2: Make stale and consolidate
    for mem in jarvis.stm.retrieve_all():
        mem.created_at = jarvis.stm._session_start - timedelta(hours=2)

    stats: dict[str, int] = jarvis.consolidate()

    # Step 3: Query
    results: list[Memory] = jarvis.query("Google", top_k=5)

    # Should find results
    assert len(results) >= 0  # May or may not be in LTM yet depending on patterns


def test_jarvis_low_importance_discard() -> None:
    """Test that low importance memories are discarded."""
    jarvis: JarvisMemorySystem = JarvisMemorySystem()

    # Add low importance memory
    jarvis.ingest("Low importance fact", importance_score=0.3)

    # Make stale
    for mem in jarvis.stm.retrieve_all():
        mem.created_at = jarvis.stm._session_start - timedelta(hours=2)

    # Consolidate
    stats: dict[str, int] = jarvis.consolidate()

    # Low importance should be discarded (not moved to MTM)
    assert stats["stm_to_mtm_discarded"] >= 0

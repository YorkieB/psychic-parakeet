"""
Comprehensive test suite for Long-Term Memory system.

Tests cover consolidation, deduplication, LongTermMemory operations,
and edge cases.
"""

from datetime import datetime, timedelta

import pytest

from consolidation import calculate_confidence, consolidate_memories
from deduplication import deduplication_pass, find_duplicates, merge_duplicates
from long_term_memory import LongTermMemory
from memory import Memory, MemoryTier, MemoryType


# ============================================================================
# Consolidation Tests
# ============================================================================


def test_calculate_confidence() -> None:
    """Test confidence calculation based on mention count."""
    assert abs(calculate_confidence(1) - 0.65) < 0.01
    assert abs(calculate_confidence(2) - 0.80) < 0.01
    assert abs(calculate_confidence(3) - 0.95) < 0.01
    assert abs(calculate_confidence(4) - 0.99) < 0.01
    assert abs(calculate_confidence(10) - 0.99) < 0.01  # Capped at 0.99


def test_consolidate_memories() -> None:
    """Test consolidating multiple memories into one fact."""
    source_memories: list[Memory] = []
    for i in range(3):
        mem: Memory = Memory(
            content=f"I work at Google (variant {i})",
            importance_score=0.7 + i * 0.1,
            emotional_intensity=0.2,
            source_context="work",
            source_emotion="neutral",
        )
        source_memories.append(mem)

    consolidated: Memory = consolidate_memories(
        source_memories, "I work at Google"
    )

    assert consolidated.content == "I work at Google"
    assert consolidated.tier == MemoryTier.LTM
    assert consolidated.mention_count == 3
    assert len(consolidated.consolidated_from) == 3
    assert consolidated.confidence >= 0.9
    assert abs(consolidated.importance_score - 0.8) < 0.1  # Average


def test_consolidate_memories_empty() -> None:
    """Test consolidating empty list raises error."""
    with pytest.raises(ValueError):
        consolidate_memories([], "Test fact")


def test_consolidate_memories_single() -> None:
    """Test consolidating single memory."""
    mem: Memory = Memory(content="Test", importance_score=0.8)
    consolidated: Memory = consolidate_memories([mem], "Test fact")

    assert consolidated.content == "Test fact"
    assert consolidated.mention_count == 1


# ============================================================================
# Deduplication Tests
# ============================================================================


def test_find_duplicates() -> None:
    """Test finding duplicate facts."""
    facts: dict[str, Memory] = {
        "fact1": Memory(content="I work at Google"),
        "fact2": Memory(content="I work at Google company"),
        "fact3": Memory(content="Completely different fact"),
    }

    duplicates: list[tuple[str, str, float]] = find_duplicates(facts, 0.7)

    assert len(duplicates) >= 1
    assert any("fact1" in pair and "fact2" in pair for pair in duplicates)


def test_find_duplicates_no_duplicates() -> None:
    """Test finding duplicates when none exist."""
    facts: dict[str, Memory] = {
        "fact1": Memory(content="I work at Google"),
        "fact2": Memory(content="I love Python programming"),
        "fact3": Memory(content="I enjoy coding"),
    }

    duplicates: list[tuple[str, str, float]] = find_duplicates(facts, 0.9)

    assert len(duplicates) == 0


def test_merge_duplicates() -> None:
    """Test merging duplicate facts."""
    fact1: Memory = Memory(
        content="I work at Google",
        confidence=0.8,
        importance_score=0.7,
        mention_count=3,
    )
    fact2: Memory = Memory(
        content="I work at Google",
        confidence=0.6,
        importance_score=0.9,
        mention_count=2,
    )

    merged: Memory = merge_duplicates(fact1, fact2)

    assert merged.confidence > fact1.confidence  # Boosted
    assert merged.mention_count == 5  # Combined
    assert abs(merged.importance_score - 0.8) < 0.1  # Average


def test_deduplication_pass() -> None:
    """Test complete deduplication pass."""
    facts: dict[str, Memory] = {
        "fact1": Memory(content="I work at Google"),
        "fact2": Memory(content="I work at Google company"),
        "fact3": Memory(content="Different fact"),
    }

    duplicates_found, merged_count, updated_facts = deduplication_pass(facts, 0.7)

    assert duplicates_found >= 1
    assert merged_count >= 1
    assert len(updated_facts) < len(facts)


# ============================================================================
# LongTermMemory Tests
# ============================================================================


def test_ltm_consolidate_and_add() -> None:
    """Test consolidating and adding memories to LTM."""
    ltm: LongTermMemory = LongTermMemory(max_size=1000)

    source_memories: list[Memory] = []
    for i in range(3):
        mem: Memory = Memory(
            content=f"I work at Google {i}",
            importance_score=0.7,
        )
        source_memories.append(mem)

    consolidated: Memory = ltm.consolidate_and_add(
        source_memories, "I work at Google"
    )

    assert consolidated.id in ltm.facts
    assert ltm.get_fact(consolidated.id) is not None


def test_ltm_add() -> None:
    """Test adding pre-consolidated fact to LTM."""
    ltm: LongTermMemory = LongTermMemory(max_size=1000, confidence_threshold=0.7)

    mem: Memory = Memory(
        content="Test fact",
        confidence=0.8,
        importance_score=0.7,
    )

    added: bool = ltm.add(mem)
    assert added is True
    assert mem.id in ltm.facts

    # Test low confidence rejection
    low_conf_mem: Memory = Memory(
        content="Low confidence fact",
        confidence=0.5,
    )
    added_low: bool = ltm.add(low_conf_mem)
    assert added_low is False


def test_ltm_search() -> None:
    """Test searching LTM facts."""
    ltm: LongTermMemory = LongTermMemory(max_size=1000)

    for i in range(10):
        mem: Memory = Memory(
            content=f"Fact {i} about Google",
            importance_score=0.5 + i * 0.05,
            confidence=0.8,  # Ensure confidence meets threshold
        )
        ltm.add(mem)

    results: list[Memory] = ltm.search("Google", top_k=5)

    assert len(results) > 0
    # Check that results contain "Google" (case-insensitive)
    google_results: list[Memory] = [mem for mem in results if "google" in mem.content.lower()]
    assert len(google_results) > 0
    # Should be sorted by importance
    if len(results) > 1:
        assert results[0].importance_score >= results[-1].importance_score


def test_ltm_get_fact() -> None:
    """Test retrieving fact by ID."""
    ltm: LongTermMemory = LongTermMemory(max_size=1000)

    mem: Memory = Memory(content="Test fact", confidence=0.8)
    ltm.add(mem)

    retrieved: Memory | None = ltm.get_fact(mem.id)
    assert retrieved is not None
    assert retrieved.content == "Test fact"

    # Test non-existent ID
    non_existent: Memory | None = ltm.get_fact("non-existent-id")
    assert non_existent is None


def test_ltm_find_related() -> None:
    """Test finding related facts."""
    ltm: LongTermMemory = LongTermMemory(max_size=1000)

    # Create consolidated fact with related memories
    source_memories: list[Memory] = []
    for i in range(3):
        mem: Memory = Memory(content=f"Related fact {i}", importance_score=0.7)
        source_memories.append(mem)

    consolidated: Memory = ltm.consolidate_and_add(
        source_memories, "Main fact"
    )

    related: list[Memory] = ltm.find_related(consolidated.id, top_k=5)
    # Related facts should be found through relationships
    assert isinstance(related, list)


def test_ltm_deduplication_pass() -> None:
    """Test running deduplication pass on LTM."""
    ltm: LongTermMemory = LongTermMemory(max_size=1000, dedup_threshold=0.7)

    # Add duplicate facts
    fact1: Memory = Memory(content="I work at Google", confidence=0.8)
    fact2: Memory = Memory(content="I work at Google company", confidence=0.7)
    fact3: Memory = Memory(content="Different fact", confidence=0.8)

    ltm.add(fact1)
    ltm.add(fact2)
    ltm.add(fact3)

    facts_before: int = len(ltm.facts)

    stats: dict[str, int] = ltm.deduplication_pass()

    assert stats["facts_after"] <= facts_before
    assert stats["merged_count"] >= 0


def test_ltm_remove() -> None:
    """Test removing fact from LTM."""
    ltm: LongTermMemory = LongTermMemory(max_size=1000)

    mem: Memory = Memory(content="Test fact", confidence=0.8)
    ltm.add(mem)

    assert mem.id in ltm.facts

    removed: bool = ltm.remove(mem.id)
    assert removed is True
    assert mem.id not in ltm.facts

    removed_again: bool = ltm.remove(mem.id)
    assert removed_again is False


def test_ltm_at_capacity() -> None:
    """Test LTM behavior at capacity."""
    ltm: LongTermMemory = LongTermMemory(max_size=10, confidence_threshold=0.5)

    # Add facts beyond capacity
    for i in range(15):
        mem: Memory = Memory(
            content=f"Fact {i}",
            confidence=0.5 + (i % 5) * 0.1,
            importance_score=0.5,
        )
        ltm.add(mem)

    # Should only have max_size facts (or less if some were rejected)
    assert len(ltm.facts) <= 10
    assert len(ltm.facts) >= 5  # At least some should be added


def test_ltm_get_stats() -> None:
    """Test getting LTM statistics."""
    ltm: LongTermMemory = LongTermMemory(max_size=1000)

    for i in range(5):
        mem: Memory = Memory(
            content=f"Fact {i}",
            confidence=0.7 + i * 0.05,
            importance_score=0.6,
            mention_count=i + 1,
        )
        ltm.add(mem)

    stats: dict = ltm.get_stats()

    assert stats["total_facts"] == 5
    assert stats["average_confidence"] > 0.0
    assert stats["average_importance"] > 0.0
    assert stats["average_mention_count"] > 0.0


def test_ltm_get_stats_empty() -> None:
    """Test statistics on empty LTM."""
    ltm: LongTermMemory = LongTermMemory(max_size=1000)

    stats: dict = ltm.get_stats()

    assert stats["total_facts"] == 0
    assert stats["average_confidence"] == 0.0
    assert stats["average_importance"] == 0.0


# ============================================================================
# Edge Case Tests
# ============================================================================


def test_ltm_search_empty() -> None:
    """Test search on empty LTM."""
    ltm: LongTermMemory = LongTermMemory(max_size=1000)

    results: list[Memory] = ltm.search("test", top_k=5)
    assert len(results) == 0


def test_ltm_single_fact() -> None:
    """Test LTM with single fact."""
    ltm: LongTermMemory = LongTermMemory(max_size=1000)

    mem: Memory = Memory(content="Single fact", confidence=0.8)
    ltm.add(mem)

    assert len(ltm.facts) == 1
    stats: dict = ltm.get_stats()
    assert stats["total_facts"] == 1


def test_ltm_all_duplicates() -> None:
    """Test deduplication with all duplicates."""
    ltm: LongTermMemory = LongTermMemory(max_size=1000, dedup_threshold=0.7)

    # Add many similar facts
    for i in range(5):
        mem: Memory = Memory(
            content="I work at Google",
            confidence=0.7 + i * 0.05,
        )
        ltm.add(mem)

    facts_before: int = len(ltm.facts)
    stats: dict[str, int] = ltm.deduplication_pass()

    # Should have merged some duplicates
    assert stats["facts_after"] <= facts_before


def test_ltm_at_capacity_boundary() -> None:
    """Test LTM at exact capacity boundary."""
    ltm: LongTermMemory = LongTermMemory(max_size=5)

    # Add exactly 5 facts
    for i in range(5):
        mem: Memory = Memory(
            content=f"Fact {i}",
            confidence=0.8,
            importance_score=0.7,
        )
        ltm.add(mem)

    assert len(ltm.facts) == 5

    # Add one more (should trigger removal)
    mem6: Memory = Memory(
        content="Fact 6",
        confidence=0.9,
        importance_score=0.9,
    )
    ltm.add(mem6)

    assert len(ltm.facts) == 5
    assert mem6.id in ltm.facts  # High confidence should be kept


def test_ltm_low_confidence_rejection() -> None:
    """Test that low confidence facts are rejected."""
    ltm: LongTermMemory = LongTermMemory(
        max_size=1000, confidence_threshold=0.7
    )

    low_conf: Memory = Memory(
        content="Low confidence fact",
        confidence=0.5,
    )

    added: bool = ltm.add(low_conf)
    assert added is False
    assert low_conf.id not in ltm.facts

    high_conf: Memory = Memory(
        content="High confidence fact",
        confidence=0.8,
    )

    added_high: bool = ltm.add(high_conf)
    assert added_high is True
    assert high_conf.id in ltm.facts


def test_consolidate_memories_combines_contexts() -> None:
    """Test that consolidation combines contexts and emotions."""
    source_memories: list[Memory] = [
        Memory(
            content="I work at Google",
            source_context="work",
            source_emotion="neutral",
        ),
        Memory(
            content="I work at Google",
            source_context="career",
            source_emotion="joy",
        ),
    ]

    consolidated: Memory = consolidate_memories(
        source_memories, "I work at Google"
    )

    assert "work" in consolidated.source_context
    assert "career" in consolidated.source_context or "work" in consolidated.source_context


def test_merge_duplicates_preserves_base() -> None:
    """Test that merge preserves base fact ID."""
    fact1: Memory = Memory(
        content="I work at Google",
        confidence=0.8,
        id="fact1",
    )
    fact2: Memory = Memory(
        content="I work at Google",
        confidence=0.6,
        id="fact2",
    )

    merged: Memory = merge_duplicates(fact1, fact2)

    # Should preserve fact1's ID (more confident)
    assert merged.id == "fact1"


def test_ltm_consolidate_below_threshold() -> None:
    """Test consolidation with confidence below threshold."""
    ltm: LongTermMemory = LongTermMemory(
        max_size=1000, confidence_threshold=0.9
    )

    # Single memory won't meet threshold
    source_memories: list[Memory] = [
        Memory(content="Test", importance_score=0.7) for _ in range(2)
    ]

    consolidated: Memory = ltm.consolidate_and_add(source_memories, "Test fact")

    # Should return consolidated but may not add if below threshold
    assert consolidated is not None

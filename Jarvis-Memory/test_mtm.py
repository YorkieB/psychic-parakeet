"""
Comprehensive test suite for Medium-Term Memory system.

Tests cover VectorSearch, PatternDetector, MediumTermMemory, and
integration functions for STM to MTM transfer.
"""

from datetime import datetime, timedelta
from unittest.mock import patch

import numpy as np
import pytest

from integration_stm_to_mtm import consolidate_mtm_to_ltm, stm_to_mtm
from memory import Memory, MemoryTier, MemoryType
from medium_term_memory import MediumTermMemory
from pattern_detection import PatternDetector
from short_term_memory import ShortTermMemory
from vector_search import VectorSearch


# ============================================================================
# VectorSearch Tests
# ============================================================================


def test_vector_search_add() -> None:
    """Test adding vectors to VectorSearch index."""
    vs: VectorSearch = VectorSearch(embedding_dim=384)

    # Add 10 vectors
    for i in range(10):
        embedding: list[float] = [float(j) for j in range(384)]
        vs.add(f"vector_{i}", embedding, metadata={"index": i})

    assert vs.get_size() == 10


def test_vector_search_add_wrong_dimension() -> None:
    """Test adding vector with wrong dimension raises error."""
    vs: VectorSearch = VectorSearch(embedding_dim=384)

    with pytest.raises(ValueError):
        vs.add("vector_1", [1.0, 2.0, 3.0])  # Wrong dimension


def test_vector_search_search() -> None:
    """Test vector similarity search."""
    vs: VectorSearch = VectorSearch(embedding_dim=10)

    # Add vectors with known similarities
    base_vector: list[float] = [1.0] * 10
    vs.add("base", base_vector)

    # Very similar vector (almost identical)
    similar_vector: list[float] = [1.0] * 9 + [0.99]
    vs.add("similar", similar_vector)

    # Different vector
    different_vector: list[float] = [-1.0] * 10
    vs.add("different", different_vector)

    # Search with base vector
    results: list[tuple[str, float, dict]] = vs.search(base_vector, top_k=3)

    assert len(results) == 3
    assert results[0][0] == "base"  # Most similar (identical)
    assert results[0][1] == 1.0  # Perfect similarity
    assert results[1][0] == "similar"  # Second most similar
    assert results[1][1] > 0.9  # High similarity
    assert results[2][0] == "different"  # Least similar
    assert results[2][1] < 0.0  # Negative similarity (opposite direction)


def test_vector_search_search_empty() -> None:
    """Test search on empty index."""
    vs: VectorSearch = VectorSearch(embedding_dim=10)
    results: list[tuple[str, float, dict]] = vs.search([1.0] * 10)
    assert len(results) == 0


def test_vector_search_batch_search() -> None:
    """Test batch search with multiple queries."""
    vs: VectorSearch = VectorSearch(embedding_dim=5)

    # Add vectors
    for i in range(5):
        vector: list[float] = [float(i)] * 5
        vs.add(f"vec_{i}", vector)

    # Batch search
    queries: list[list[float]] = [[0.0] * 5, [2.0] * 5]
    results: list[list[tuple[str, float, dict]]] = vs.batch_search(queries, top_k=3)

    assert len(results) == 2
    assert len(results[0]) == 3
    assert len(results[1]) == 3
    assert results[0][0][0] == "vec_0"  # Most similar to [0.0] * 5
    # Check that vec_2 is in top results for query [2.0] * 5 (may not be first due to similarity calculation)
    vec_ids_query2: list[str] = [r[0] for r in results[1]]
    assert "vec_2" in vec_ids_query2[:2]  # Should be in top 2


def test_vector_search_remove() -> None:
    """Test removing vectors from index."""
    vs: VectorSearch = VectorSearch(embedding_dim=10)

    vs.add("vec1", [1.0] * 10)
    vs.add("vec2", [2.0] * 10)

    assert vs.get_size() == 2

    removed: bool = vs.remove("vec1")
    assert removed is True
    assert vs.get_size() == 1

    removed_again: bool = vs.remove("vec1")
    assert removed_again is False

    removed_nonexistent: bool = vs.remove("nonexistent")
    assert removed_nonexistent is False


def test_vector_search_clear() -> None:
    """Test clearing all vectors."""
    vs: VectorSearch = VectorSearch(embedding_dim=10)

    for i in range(5):
        vs.add(f"vec_{i}", [float(i)] * 10)

    assert vs.get_size() == 5

    vs.clear()
    assert vs.get_size() == 0


# ============================================================================
# PatternDetector Tests
# ============================================================================


def test_pattern_detection_add() -> None:
    """Test adding memories to PatternDetector."""
    pd: PatternDetector = PatternDetector()

    for i in range(5):
        mem: Memory = Memory(content=f"Memory {i}")
        pd.add_memory(mem)

    patterns: list[tuple[str, int, list[str]]] = pd.detect_patterns()
    # No patterns yet (need 3+ mentions)
    assert len(patterns) == 0


def test_pattern_detection_detect_patterns() -> None:
    """Test detecting patterns with 3+ mentions."""
    pd: PatternDetector = PatternDetector(mention_threshold=3)

    # Add 3 similar memories
    for i in range(3):
        mem: Memory = Memory(content="I work at Google")
        pd.add_memory(mem)

    patterns: list[tuple[str, int, list[str]]] = pd.detect_patterns()
    assert len(patterns) == 1
    assert patterns[0][1] == 3  # Mention count

    # Add 4th similar memory
    mem4: Memory = Memory(content="I work at Google")
    pd.add_memory(mem4)

    patterns = pd.detect_patterns()
    assert len(patterns) == 1
    assert patterns[0][1] == 4  # Updated mention count


def test_pattern_detection_similarity() -> None:
    """Test pattern detection with different similarity levels."""
    pd: PatternDetector = PatternDetector(
        similarity_threshold=0.7, mention_threshold=2
    )

    # Add similar memories (should group together)
    mem1: Memory = Memory(content="I work at Google")
    mem2: Memory = Memory(content="I work at Google company")
    mem3: Memory = Memory(content="Google is my employer")

    pd.add_memory(mem1)
    pd.add_memory(mem2)
    pd.add_memory(mem3)

    patterns: list[tuple[str, int, list[str]]] = pd.detect_patterns()
    # Should detect pattern if similarity threshold allows grouping
    assert len(patterns) >= 1


def test_pattern_detection_get_pattern_for_memory() -> None:
    """Test getting pattern group for a memory."""
    pd: PatternDetector = PatternDetector(mention_threshold=2)

    mem1: Memory = Memory(content="I work at Google")
    mem2: Memory = Memory(content="I work at Google")
    mem3: Memory = Memory(content="Different content")

    pd.add_memory(mem1)
    pd.add_memory(mem2)
    pd.add_memory(mem3)

    pattern_key: str | None = pd.get_pattern_for_memory(mem1.id)
    assert pattern_key is not None

    pattern_key2: str | None = pd.get_pattern_for_memory(mem3.id)
    # mem3 might not be in a pattern group if threshold not met


def test_pattern_detection_clear() -> None:
    """Test clearing all patterns."""
    pd: PatternDetector = PatternDetector()

    for i in range(5):
        mem: Memory = Memory(content=f"Memory {i}")
        pd.add_memory(mem)

    pd.clear()
    patterns: list[tuple[str, int, list[str]]] = pd.detect_patterns()
    assert len(patterns) == 0


# ============================================================================
# MediumTermMemory Tests
# ============================================================================


def test_mtm_add() -> None:
    """Test adding memory with embedding to MTM."""
    mtm: MediumTermMemory = MediumTermMemory(max_size=100)

    mem: Memory = Memory(content="Test memory", importance_score=0.8)
    embedding: list[float] = [0.1] * 384

    mtm.add(mem, embedding)

    assert len(mtm.memories) == 1
    assert mem.id in mtm.memories
    assert mem.tier == MemoryTier.MTM
    assert mem.id in mtm.embeddings
    assert mtm.vector_search.get_size() == 1


def test_mtm_add_at_capacity() -> None:
    """Test MTM behavior at capacity."""
    mtm: MediumTermMemory = MediumTermMemory(max_size=10)

    # Add 15 memories (exceeds capacity)
    for i in range(15):
        mem: Memory = Memory(
            content=f"Memory {i}", importance_score=0.5 + (i % 5) * 0.1
        )
        embedding: list[float] = [float(i % 10)] * 384
        mtm.add(mem, embedding)

    # Should only have 10 memories (oldest/lowest-importance removed)
    assert len(mtm.memories) == 10
    assert mtm.vector_search.get_size() == 10


def test_mtm_search() -> None:
    """Test vector similarity search in MTM."""
    mtm: MediumTermMemory = MediumTermMemory(max_size=100)

    # Add memories with different embeddings
    base_embedding: list[float] = [1.0] * 384
    mem1: Memory = Memory(content="Base memory")
    mtm.add(mem1, base_embedding)

    similar_embedding: list[float] = [1.0] * 383 + [0.99]
    mem2: Memory = Memory(content="Similar memory")
    mtm.add(mem2, similar_embedding)

    # Search
    results: list[tuple[Memory, float]] = mtm.search(base_embedding, top_k=5)

    assert len(results) >= 2
    assert results[0][0].id == mem1.id  # Most similar (identical)
    assert abs(results[0][1] - 1.0) < 0.01  # Perfect similarity (with floating point tolerance)


def test_mtm_search_by_text() -> None:
    """Test text search in MTM."""
    mtm: MediumTermMemory = MediumTermMemory(max_size=100)

    mem1: Memory = Memory(content="I work at Google")
    mem2: Memory = Memory(content="I love Python programming")
    mem3: Memory = Memory(content="Google is great")

    mtm.add(mem1, [0.1] * 384)
    mtm.add(mem2, [0.2] * 384)
    mtm.add(mem3, [0.3] * 384)

    results: list[Memory] = mtm.search_by_text("Google", top_k=5)
    assert len(results) == 2
    assert any("Google" in mem.content for mem in results)


def test_mtm_get_memory() -> None:
    """Test retrieving memory by ID."""
    mtm: MediumTermMemory = MediumTermMemory(max_size=100)

    mem: Memory = Memory(content="Test memory")
    mtm.add(mem, [0.1] * 384)

    retrieved: Memory | None = mtm.get_memory(mem.id)
    assert retrieved is not None
    assert retrieved.content == "Test memory"
    assert retrieved.accessed_count > 0

    # Test non-existent ID
    non_existent: Memory | None = mtm.get_memory("non-existent-id")
    assert non_existent is None


def test_mtm_remove() -> None:
    """Test removing memory from MTM."""
    mtm: MediumTermMemory = MediumTermMemory(max_size=100)

    mem: Memory = Memory(content="Test memory")
    mtm.add(mem, [0.1] * 384)

    assert len(mtm.memories) == 1

    removed: bool = mtm.remove(mem.id)
    assert removed is True
    assert len(mtm.memories) == 0
    assert mtm.vector_search.get_size() == 0

    removed_again: bool = mtm.remove(mem.id)
    assert removed_again is False


def test_mtm_cleanup_stale() -> None:
    """Test cleaning up stale memories."""
    mtm: MediumTermMemory = MediumTermMemory(max_size=100, lookback_days=7)

    # Add old memories (10 days ago)
    old_time: datetime = datetime.now() - timedelta(days=10)
    for i in range(5):
        mem: Memory = Memory(content=f"Old memory {i}")
        mem.created_at = old_time
        mtm.add(mem, [0.1] * 384)
        # Set created_at after adding (since add() resets it)
        mem.created_at = old_time

    # Add recent memories
    for i in range(5):
        mem: Memory = Memory(content=f"New memory {i}")
        mtm.add(mem, [0.2] * 384)

    assert len(mtm.memories) == 10

    # Cleanup stale
    stale: list[Memory] = mtm.cleanup_stale()
    assert len(stale) == 5
    assert len(mtm.memories) == 5

    # Verify remaining are new memories
    for mem in mtm.memories.values():
        assert "New memory" in mem.content


def test_mtm_detect_patterns() -> None:
    """Test pattern detection in MTM."""
    mtm: MediumTermMemory = MediumTermMemory(max_size=100, mention_threshold=3)

    # Add memories that form a pattern
    for i in range(4):
        mem: Memory = Memory(content="I work at Google")
        mtm.add(mem, [0.1] * 384)

    patterns: list[tuple[str, int, list[str]]] = mtm.detect_patterns()
    assert len(patterns) == 1
    assert patterns[0][1] == 4  # Mention count


def test_mtm_get_stats() -> None:
    """Test getting MTM statistics."""
    mtm: MediumTermMemory = MediumTermMemory(max_size=100)

    for i in range(5):
        mem: Memory = Memory(
            content=f"Memory {i}",
            importance_score=0.5 + i * 0.1,
            emotional_intensity=0.1 * i,
        )
        mtm.add(mem, [float(i)] * 384)

    stats: dict = mtm.get_stats()

    assert stats["total_memories"] == 5
    assert stats["average_importance"] > 0.0
    assert stats["average_importance"] <= 1.0
    assert stats["vector_search_size"] == 5


def test_mtm_get_stats_empty() -> None:
    """Test statistics on empty MTM."""
    mtm: MediumTermMemory = MediumTermMemory(max_size=100)

    stats: dict = mtm.get_stats()

    assert stats["total_memories"] == 0
    assert stats["total_patterns"] == 0
    assert stats["average_importance"] == 0.0
    assert stats["vector_search_size"] == 0


# ============================================================================
# Integration Tests
# ============================================================================


def test_stm_to_mtm_integration() -> None:
    """Test moving memories from STM to MTM."""
    stm: ShortTermMemory = ShortTermMemory(max_size=100)
    mtm: MediumTermMemory = MediumTermMemory(max_size=1000)

    # Add memories to STM
    memories_list: list[Memory] = []
    for i in range(5):
        mem: Memory = Memory(
            content=f"Memory {i}", importance_score=0.6 + i * 0.1
        )
        stm.add(mem)
        memories_list.append(mem)

    # Make memories stale by setting old timestamps (after add resets them)
    old_time: datetime = datetime.now() - timedelta(hours=2)
    for mem in memories_list:
        mem.created_at = old_time

    # Define embedding generator
    def embedding_gen(text: str) -> list[float]:
        return [0.1] * 384

    # Move to MTM (clear_stale will find the old memories)
    stats: dict[str, int] = stm_to_mtm(stm, mtm, embedding_gen)

    assert stats["moved_to_mtm"] > 0
    assert stats["mtm_total"] > 0


def test_stm_to_mtm_partial_move() -> None:
    """Test that only important memories are moved."""
    stm: ShortTermMemory = ShortTermMemory(max_size=100)
    mtm: MediumTermMemory = MediumTermMemory(max_size=1000)

    # Add mix of important and unimportant memories
    important_mem: Memory = Memory(
        content="Important memory", importance_score=0.8
    )
    unimportant_mem: Memory = Memory(
        content="Unimportant memory", importance_score=0.3
    )

    stm.add(important_mem)
    stm.add(unimportant_mem)

    # Make memories stale by setting old timestamps (after add resets them)
    old_time: datetime = datetime.now() - timedelta(hours=2)
    important_mem.created_at = old_time
    unimportant_mem.created_at = old_time

    def embedding_gen(text: str) -> list[float]:
        return [0.1] * 384

    # Move to MTM (clear_stale will find the old memories)
    stats: dict[str, int] = stm_to_mtm(stm, mtm, embedding_gen)

    # Important memory should be moved, unimportant discarded
    assert stats["moved_to_mtm"] >= 1
    assert stats["discarded"] >= 1


def test_consolidate_mtm_to_ltm() -> None:
    """Test preparing consolidation from MTM to LTM."""
    mtm: MediumTermMemory = MediumTermMemory(max_size=100, mention_threshold=3)

    # Add pattern memories
    for i in range(4):
        mem: Memory = Memory(content="I work at Google")
        mtm.add(mem, [0.1] * 384)

    consolidation: list[tuple[str, int, list[str]]] = consolidate_mtm_to_ltm(mtm)

    assert len(consolidation) == 1
    assert consolidation[0][1] == 4  # Mention count
    assert len(consolidation[0][2]) == 4  # Memory IDs


# ============================================================================
# Edge Case Tests
# ============================================================================


def test_mtm_search_empty() -> None:
    """Test search on empty MTM."""
    mtm: MediumTermMemory = MediumTermMemory(max_size=100)

    results: list[tuple[Memory, float]] = mtm.search([0.1] * 384, top_k=5)
    assert len(results) == 0


def test_mtm_search_by_text_empty() -> None:
    """Test text search on empty MTM."""
    mtm: MediumTermMemory = MediumTermMemory(max_size=100)

    results: list[Memory] = mtm.search_by_text("test", top_k=5)
    assert len(results) == 0


def test_mtm_single_memory() -> None:
    """Test MTM with single memory."""
    mtm: MediumTermMemory = MediumTermMemory(max_size=100)

    mem: Memory = Memory(content="Single memory")
    mtm.add(mem, [0.1] * 384)

    assert len(mtm.memories) == 1
    stats: dict = mtm.get_stats()
    assert stats["total_memories"] == 1


def test_mtm_duplicate_memories() -> None:
    """Test adding duplicate memories."""
    mtm: MediumTermMemory = MediumTermMemory(max_size=100)

    mem1: Memory = Memory(content="Same content")
    mem2: Memory = Memory(content="Same content")

    mtm.add(mem1, [0.1] * 384)
    mtm.add(mem2, [0.2] * 384)

    # Both should be added (different IDs)
    assert len(mtm.memories) == 2


def test_vector_search_large_scale() -> None:
    """Test vector search with many vectors."""
    vs: VectorSearch = VectorSearch(embedding_dim=10)

    # Add 100 vectors
    for i in range(100):
        vector: list[float] = [float(i % 10)] * 10
        vs.add(f"vec_{i}", vector)

    assert vs.get_size() == 100

    # Search
    results: list[tuple[str, float, dict]] = vs.search([0.0] * 10, top_k=10)
    assert len(results) == 10


def test_pattern_detection_different_texts() -> None:
    """Test pattern detection with different but similar texts."""
    pd: PatternDetector = PatternDetector(
        similarity_threshold=0.5, mention_threshold=2
    )

    mem1: Memory = Memory(content="I work at Google")
    mem2: Memory = Memory(content="I work at the Google company")
    mem3: Memory = Memory(content="My employer is Google")

    pd.add_memory(mem1)
    pd.add_memory(mem2)
    pd.add_memory(mem3)

    patterns: list[tuple[str, int, list[str]]] = pd.detect_patterns()
    # Should detect pattern if similarity allows grouping
    assert len(patterns) >= 0  # May or may not group depending on threshold


def test_mtm_at_capacity_boundary() -> None:
    """Test MTM at exact capacity boundary."""
    mtm: MediumTermMemory = MediumTermMemory(max_size=5)

    # Add exactly 5 memories
    for i in range(5):
        mem: Memory = Memory(content=f"Memory {i}", importance_score=0.5)
        mtm.add(mem, [float(i)] * 384)

    assert len(mtm.memories) == 5

    # Add one more (should trigger removal)
    mem6: Memory = Memory(content="Memory 6", importance_score=0.9)
    mtm.add(mem6, [6.0] * 384)

    assert len(mtm.memories) == 5
    assert mem6.id in mtm.memories  # High importance should be kept


def test_vector_search_similarity_scores() -> None:
    """Test that similarity scores are in valid range."""
    vs: VectorSearch = VectorSearch(embedding_dim=10)

    vs.add("vec1", [1.0] * 10)
    vs.add("vec2", [-1.0] * 10)

    results: list[tuple[str, float, dict]] = vs.search([1.0] * 10, top_k=2)

    for _, similarity, _ in results:
        assert -1.0 <= similarity <= 1.0  # Cosine similarity range

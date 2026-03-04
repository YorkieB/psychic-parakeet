"""
Comprehensive test suite for Short-Term Memory system.

Tests cover Memory class functionality and ShortTermMemory operations
including add, retrieve, search, expiration, and statistics.
"""

from datetime import datetime, timedelta
from unittest.mock import patch

import pytest

from memory import Memory, MemoryTier, MemoryType
from short_term_memory import ShortTermMemory


def test_memory_creation() -> None:
    """Test Memory creation and field initialization."""
    memory: Memory = Memory(
        content="Test memory",
        importance_score=0.8,
        source_emotion="neutral",
        source_context="work",
    )

    assert memory.content == "Test memory"
    assert memory.importance_score == 0.8
    assert memory.source_emotion == "neutral"
    assert memory.source_context == "work"
    assert memory.tier == MemoryTier.STM
    assert memory.memory_type == MemoryType.FACT
    assert memory.id is not None
    assert memory.created_at is not None
    assert memory.last_accessed is not None
    assert memory.accessed_count == 0
    assert memory.decay_rate == 0.02
    assert memory.embedding is None
    assert memory.mention_count == 0
    assert len(memory.related_memories) == 0
    assert len(memory.consolidated_from) == 0


def test_memory_decay() -> None:
    """Test memory decay calculation."""
    memory: Memory = Memory(
        content="Test memory",
        importance_score=0.8,
        decay_rate=0.02,
    )

    # Immediately after creation, decay should be minimal
    decayed: float = memory.decay()
    assert 0.0 <= decayed <= 1.0
    assert decayed <= memory.importance_score

    # Test with old memory
    old_memory: Memory = Memory(
        content="Old memory",
        importance_score=0.8,
        decay_rate=0.02,
    )
    # Mock created_at to be 10 days ago
    old_memory.created_at = datetime.now() - timedelta(days=10)
    decayed_old: float = old_memory.decay()
    assert decayed_old < memory.importance_score
    assert decayed_old >= 0.0


def test_memory_is_stale() -> None:
    """Test memory staleness check."""
    memory: Memory = Memory(content="Test memory")
    assert not memory.is_stale(1)

    old_memory: Memory = Memory(content="Old memory")
    old_memory.created_at = datetime.now() - timedelta(days=2)
    assert old_memory.is_stale(1)
    assert not old_memory.is_stale(3)


def test_memory_to_dict() -> None:
    """Test memory serialization to dictionary."""
    memory: Memory = Memory(
        content="Test memory",
        importance_score=0.75,
        source_emotion="joy",
    )
    memory_dict: dict = memory.to_dict()

    assert memory_dict["content"] == "Test memory"
    assert memory_dict["importance_score"] == 0.75
    assert memory_dict["source_emotion"] == "joy"
    assert memory_dict["tier"] == "STM"
    assert "created_at" in memory_dict
    assert "id" in memory_dict


def test_memory_to_json() -> None:
    """Test memory serialization to JSON."""
    memory: Memory = Memory(content="Test memory")
    json_str: str = memory.to_json()

    assert isinstance(json_str, str)
    assert "Test memory" in json_str
    assert memory.id in json_str


def test_stm_add() -> None:
    """Test adding memories to STM."""
    stm: ShortTermMemory = ShortTermMemory(max_size=100)

    memories: list[Memory] = []
    for i in range(5):
        mem: Memory = Memory(
            content=f"Memory {i}",
            importance_score=0.5 + i * 0.1,
        )
        memories.append(mem)
        stm.add(mem)

    assert stm.get_size() == 5
    all_memories: list[Memory] = stm.retrieve_all()
    assert len(all_memories) == 5

    # Verify all memories have STM tier
    for mem in all_memories:
        assert mem.tier == MemoryTier.STM


def test_stm_retrieve_all() -> None:
    """Test retrieving all memories."""
    stm: ShortTermMemory = ShortTermMemory(max_size=100)

    # Add 10 memories
    for i in range(10):
        mem: Memory = Memory(content=f"Memory {i}")
        stm.add(mem)

    all_memories: list[Memory] = stm.retrieve_all()
    assert len(all_memories) == 10

    # Verify order (most recent first)
    assert all_memories[0].content == "Memory 9"
    assert all_memories[9].content == "Memory 0"


def test_stm_retrieve_recent() -> None:
    """Test retrieving recent memories."""
    stm: ShortTermMemory = ShortTermMemory(max_size=100)

    # Add 20 memories
    for i in range(20):
        mem: Memory = Memory(content=f"Memory {i}")
        stm.add(mem)

    recent: list[Memory] = stm.retrieve_recent(5)
    assert len(recent) == 5

    # Verify they're the newest ones
    assert recent[0].content == "Memory 19"
    assert recent[4].content == "Memory 15"


def test_stm_search() -> None:
    """Test searching memories by content."""
    stm: ShortTermMemory = ShortTermMemory(max_size=100)

    stm.add(Memory(content="I work at Google"))
    stm.add(Memory(content="I love Python programming"))
    stm.add(Memory(content="Google is a great company"))
    stm.add(Memory(content="I enjoy coding"))

    results: list[Memory] = stm.search("Google", top_k=3)
    assert len(results) == 2
    assert any("Google" in mem.content for mem in results)

    results_python: list[Memory] = stm.search("Python", top_k=3)
    assert len(results_python) == 1
    assert "Python" in results_python[0].content


def test_stm_search_case_insensitive() -> None:
    """Test case-insensitive search."""
    stm: ShortTermMemory = ShortTermMemory(max_size=100)

    stm.add(Memory(content="I work at google"))
    stm.add(Memory(content="I love Python programming"))

    results: list[Memory] = stm.search("GOOGLE", top_k=5)
    assert len(results) == 1
    assert "google" in results[0].content.lower()

    results_lower: list[Memory] = stm.search("python", top_k=5)
    assert len(results_lower) == 1
    assert "Python" in results_lower[0].content


def test_get_by_id() -> None:
    """Test retrieving memory by ID."""
    stm: ShortTermMemory = ShortTermMemory(max_size=100)

    mem: Memory = Memory(content="Test memory")
    memory_id: str = mem.id
    stm.add(mem)

    retrieved: Memory | None = stm.get_by_id(memory_id)
    assert retrieved is not None
    assert retrieved.content == "Test memory"
    assert retrieved.id == memory_id

    # Verify last_accessed was updated
    initial_access: datetime = retrieved.last_accessed
    retrieved2: Memory | None = stm.get_by_id(memory_id)
    assert retrieved2 is not None
    assert retrieved2.last_accessed >= initial_access
    assert retrieved2.accessed_count > 0

    # Test non-existent ID
    non_existent: Memory | None = stm.get_by_id("non-existent-id")
    assert non_existent is None


def test_clear_stale() -> None:
    """Test clearing stale memories."""
    stm: ShortTermMemory = ShortTermMemory(max_size=100)

    # Add 5 old memories (2 hours ago)
    old_time: datetime = datetime.now() - timedelta(hours=2)
    for i in range(5):
        mem: Memory = Memory(content=f"Old memory {i}")
        stm.add(mem)
        # Set created_at after adding (since add() resets it)
        mem.created_at = old_time

    # Add 5 new memories (now)
    for i in range(5):
        mem: Memory = Memory(content=f"New memory {i}")
        stm.add(mem)

    assert stm.get_size() == 10

    # Clear stale memories
    stale: list[Memory] = stm.clear_stale()
    assert len(stale) == 5
    assert stm.get_size() == 5

    # Verify remaining are new memories
    remaining: list[Memory] = stm.retrieve_all()
    for mem in remaining:
        assert "New memory" in mem.content


def test_stm_at_capacity() -> None:
    """Test STM behavior at capacity (FIFO)."""
    stm: ShortTermMemory = ShortTermMemory(max_size=10)

    # Add 15 memories (exceeds capacity)
    for i in range(15):
        mem: Memory = Memory(content=f"Memory {i}")
        stm.add(mem)

    # Should only have 10 memories (FIFO)
    assert stm.get_size() == 10

    # Verify oldest ones were removed
    all_memories: list[Memory] = stm.retrieve_all()
    assert all_memories[0].content == "Memory 14"  # Most recent
    assert all_memories[9].content == "Memory 5"  # Oldest remaining


def test_session_expiration() -> None:
    """Test session expiration check."""
    stm: ShortTermMemory = ShortTermMemory(session_timeout_minutes=1)

    assert not stm.is_session_expired()

    # Mock time forward 2 minutes
    with patch("short_term_memory.datetime") as mock_datetime:
        mock_datetime.now.return_value = datetime.now() + timedelta(minutes=2)
        mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)

        # Need to patch the actual datetime used in is_session_expired
        stm._session_start = datetime.now() - timedelta(minutes=2)
        assert stm.is_session_expired()


def test_get_stats() -> None:
    """Test statistics calculation."""
    stm: ShortTermMemory = ShortTermMemory(max_size=100)

    # Add memories with varying importance
    for i in range(5):
        mem: Memory = Memory(
            content=f"Memory {i}",
            importance_score=0.2 + i * 0.2,
            emotional_intensity=0.1 * i,
            mention_count=i,
        )
        stm.add(mem)

    stats: dict = stm.get_stats()

    assert stats["total_memories"] == 5
    assert stats["average_importance"] > 0.0
    assert stats["average_importance"] <= 1.0
    assert stats["average_emotional_intensity"] >= 0.0
    assert stats["average_mention_count"] >= 0.0
    assert stats["oldest_memory_age_minutes"] >= 0
    assert stats["newest_memory_age_seconds"] >= 0


def test_get_stats_empty() -> None:
    """Test statistics on empty STM."""
    stm: ShortTermMemory = ShortTermMemory(max_size=100)

    stats: dict = stm.get_stats()

    assert stats["total_memories"] == 0
    assert stats["average_importance"] == 0.0
    assert stats["average_emotional_intensity"] == 0.0
    assert stats["average_mention_count"] == 0.0


def test_get_size() -> None:
    """Test getting STM size."""
    stm: ShortTermMemory = ShortTermMemory(max_size=100)

    assert stm.get_size() == 0

    for i in range(5):
        stm.add(Memory(content=f"Memory {i}"))

    assert stm.get_size() == 5


def test_get_capacity_percent() -> None:
    """Test capacity percentage calculation."""
    stm: ShortTermMemory = ShortTermMemory(max_size=10)

    assert stm.get_capacity_percent() == 0.0

    for i in range(5):
        stm.add(Memory(content=f"Memory {i}"))

    assert stm.get_capacity_percent() == 50.0

    for i in range(5, 10):
        stm.add(Memory(content=f"Memory {i}"))

    assert stm.get_capacity_percent() == 100.0


def test_stm_add_duplicate_id() -> None:
    """Test adding memory with duplicate ID updates existing."""
    stm: ShortTermMemory = ShortTermMemory(max_size=100)

    mem: Memory = Memory(content="Original content")
    memory_id: str = mem.id
    stm.add(mem)

    # Add same memory again (same ID)
    mem2: Memory = Memory(content="Updated content")
    mem2.id = memory_id
    stm.add(mem2)

    assert stm.get_size() == 1
    retrieved: Memory | None = stm.get_by_id(memory_id)
    assert retrieved is not None
    assert retrieved.content == "Updated content"


def test_search_no_results() -> None:
    """Test search with no matching results."""
    stm: ShortTermMemory = ShortTermMemory(max_size=100)

    stm.add(Memory(content="I work at Google"))
    stm.add(Memory(content="I love Python"))

    results: list[Memory] = stm.search("JavaScript", top_k=5)
    assert len(results) == 0


def test_retrieve_recent_more_than_available() -> None:
    """Test retrieving more recent memories than available."""
    stm: ShortTermMemory = ShortTermMemory(max_size=100)

    for i in range(3):
        stm.add(Memory(content=f"Memory {i}"))

    recent: list[Memory] = stm.retrieve_recent(10)
    assert len(recent) == 3


def test_memory_decay_zero_rate() -> None:
    """Test memory decay with zero decay rate."""
    memory: Memory = Memory(
        content="Test",
        importance_score=0.8,
        decay_rate=0.0,
    )
    memory.created_at = datetime.now() - timedelta(days=10)

    decayed: float = memory.decay()
    assert decayed == 0.8  # No decay


def test_memory_decay_high_rate() -> None:
    """Test memory decay with high decay rate."""
    memory: Memory = Memory(
        content="Test",
        importance_score=1.0,
        decay_rate=0.5,  # 50% per day
    )
    memory.created_at = datetime.now() - timedelta(days=2)

    decayed: float = memory.decay()
    assert decayed < memory.importance_score
    assert decayed >= 0.0

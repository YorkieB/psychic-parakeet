"""
Short-Term Memory (STM) management system for Jarvis AI.

This module provides the ShortTermMemory class for managing in-memory
short-term memories with automatic expiration and capacity management.
"""

from collections import deque
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from memory import Memory, MemoryTier


class ShortTermMemory:
    """
    Manages short-term memories in-memory with automatic expiration.

    STM uses a deque-based FIFO structure with a maximum capacity.
    Memories older than the session timeout are considered stale and
    can be cleared for promotion to MTM.

    Attributes:
        max_size: Maximum number of memories to store
        session_timeout_minutes: Minutes before session expires
        _memories: Internal deque storing memories (most recent at end)
        _session_start: Timestamp when session started
        _memory_index: Dictionary mapping memory IDs to Memory objects
    """

    def __init__(
        self, max_size: int = 500, session_timeout_minutes: int = 60
    ) -> None:
        """
        Initialize Short-Term Memory system.

        Args:
            max_size: Maximum number of memories to keep (default: 500)
            session_timeout_minutes: Minutes before session expires (default: 60)
        """
        self.max_size: int = max_size
        self.session_timeout_minutes: int = session_timeout_minutes
        self._memories: deque = deque(maxlen=max_size)
        self._session_start: datetime = datetime.now()
        self._memory_index: Dict[str, Memory] = {}

    def add(self, memory: Memory) -> None:
        """
        Add a memory to STM.

        Sets the memory tier to STM, updates timestamps, and adds to
        the internal storage. If at capacity, oldest memories are
        automatically removed (FIFO).

        Args:
            memory: Memory object to add
        """
        memory.tier = MemoryTier.STM
        now: datetime = datetime.now()
        memory.created_at = now
        memory.last_accessed = now

        # If memory already exists, update it instead of duplicating
        if memory.id in self._memory_index:
            existing: Memory = self._memory_index[memory.id]
            existing.content = memory.content
            existing.last_accessed = now
            existing.accessed_count += 1
            return

        # Add to deque (automatically removes oldest if at capacity)
        self._memories.append(memory)
        self._memory_index[memory.id] = memory

    def retrieve_all(self) -> List[Memory]:
        """
        Retrieve all memories in STM.

        Returns memories in reverse order (most recent first).

        Returns:
            List of all Memory objects, most recent first
        """
        return list(reversed(self._memories))

    def retrieve_recent(self, num: int = 10) -> List[Memory]:
        """
        Retrieve the most recent N memories.

        Args:
            num: Number of recent memories to retrieve (default: 10)

        Returns:
            List of most recent Memory objects, most recent first
        """
        all_memories: List[Memory] = self.retrieve_all()
        return all_memories[:num]

    def search(self, query: str, top_k: int = 5) -> List[Memory]:
        """
        Search memories by content using case-insensitive substring matching.

        Args:
            query: Search query string
            top_k: Maximum number of results to return (default: 5)

        Returns:
            List of matching Memory objects, sorted by recency (newest first)
        """
        query_lower: str = query.lower()
        matches: List[Memory] = []

        # Search in reverse order (newest first) to prioritize recent memories
        for memory in reversed(self._memories):
            if query_lower in memory.content.lower():
                matches.append(memory)
                if len(matches) >= top_k:
                    break

        return matches

    def get_by_id(self, memory_id: str) -> Optional[Memory]:
        """
        Get a specific memory by ID.

        Updates last_accessed timestamp and increments accessed_count.

        Args:
            memory_id: UUID of the memory to retrieve

        Returns:
            Memory object if found, None otherwise
        """
        memory: Optional[Memory] = self._memory_index.get(memory_id)
        if memory is not None:
            memory.last_accessed = datetime.now()
            memory.accessed_count += 1
        return memory

    def clear_stale(self) -> List[Memory]:
        """
        Remove memories older than 1 hour from STM.

        Returns the removed memories for potential promotion to MTM.

        Returns:
            List of stale Memory objects that were removed
        """
        cutoff_time: datetime = datetime.now() - timedelta(hours=1)
        stale_memories: List[Memory] = []
        remaining_memories: deque = deque(maxlen=self.max_size)

        for memory in self._memories:
            if memory.created_at < cutoff_time:
                stale_memories.append(memory)
                del self._memory_index[memory.id]
            else:
                remaining_memories.append(memory)

        self._memories = remaining_memories
        return stale_memories

    def is_session_expired(self) -> bool:
        """
        Check if the current session has expired.

        A session expires after session_timeout_minutes have passed
        since session_start.

        Returns:
            True if session has expired, False otherwise
        """
        elapsed: timedelta = datetime.now() - self._session_start
        return elapsed.total_seconds() >= (self.session_timeout_minutes * 60)

    def get_size(self) -> int:
        """
        Get current number of memories in STM.

        Returns:
            Number of memories currently stored
        """
        return len(self._memories)

    def get_capacity_percent(self) -> float:
        """
        Get current capacity usage as a percentage.

        Returns:
            Percentage of capacity used (0.0 to 100.0)
        """
        if self.max_size == 0:
            return 0.0
        return (len(self._memories) / self.max_size) * 100.0

    def get_stats(self) -> Dict:
        """
        Get comprehensive statistics about STM.

        Returns:
            Dictionary containing:
                - total_memories: Total number of memories
                - oldest_memory_age_minutes: Age of oldest memory in minutes
                - newest_memory_age_seconds: Age of newest memory in seconds
                - average_importance: Average importance score
                - average_emotional_intensity: Average emotional intensity
                - average_mention_count: Average mention count
        """
        if len(self._memories) == 0:
            return {
                "total_memories": 0,
                "oldest_memory_age_minutes": 0,
                "newest_memory_age_seconds": 0,
                "average_importance": 0.0,
                "average_emotional_intensity": 0.0,
                "average_mention_count": 0.0,
            }

        now: datetime = datetime.now()
        total_importance: float = 0.0
        total_emotional: float = 0.0
        total_mentions: int = 0
        oldest_time: Optional[datetime] = None
        newest_time: Optional[datetime] = None

        for memory in self._memories:
            total_importance += memory.importance_score
            total_emotional += memory.emotional_intensity
            total_mentions += memory.mention_count

            if oldest_time is None or memory.created_at < oldest_time:
                oldest_time = memory.created_at
            if newest_time is None or memory.created_at > newest_time:
                newest_time = memory.created_at

        count: int = len(self._memories)
        oldest_age_minutes: int = 0
        newest_age_seconds: int = 0

        if oldest_time is not None:
            oldest_age: timedelta = now - oldest_time
            oldest_age_minutes = int(oldest_age.total_seconds() / 60)

        if newest_time is not None:
            newest_age: timedelta = now - newest_time
            newest_age_seconds = int(newest_age.total_seconds())

        return {
            "total_memories": count,
            "oldest_memory_age_minutes": oldest_age_minutes,
            "newest_memory_age_seconds": newest_age_seconds,
            "average_importance": total_importance / count,
            "average_emotional_intensity": total_emotional / count,
            "average_mention_count": total_mentions / count,
        }

"""
Medium-Term Memory (MTM) management system for Jarvis AI.

This module provides the MediumTermMemory class for managing memories
with vector search capabilities and pattern detection.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from memory import Memory, MemoryTier
from pattern_detection import PatternDetector
from vector_search import VectorSearch


class MediumTermMemory:
    """
    Manages medium-term memories with vector search and pattern detection.

    MTM stores memories with embeddings for semantic search and tracks
    patterns to identify frequently-mentioned facts. Memories older than
    lookback_days are considered stale and can be cleaned up.

    Attributes:
        max_size: Maximum number of memories to store
        lookback_days: Days before memory is considered stale
        similarity_threshold: Minimum similarity for pattern detection
        mention_threshold: Minimum mentions to form a pattern
        memories: Dictionary mapping memory_id to Memory object
        embeddings: Dictionary mapping memory_id to embedding vector
        vector_search: VectorSearch instance for semantic search
        pattern_detector: PatternDetector instance for pattern detection
    """

    def __init__(
        self,
        max_size: int = 5000,
        lookback_days: int = 60,
        similarity_threshold: float = 0.7,
        mention_threshold: int = 3,
    ) -> None:
        """
        Initialize Medium-Term Memory system.

        Args:
            max_size: Maximum number of memories to store (default: 5000)
            lookback_days: Days before memory is considered stale (default: 60)
            similarity_threshold: Minimum similarity for patterns (default: 0.7)
            mention_threshold: Minimum mentions to form pattern (default: 3)
        """
        self.max_size: int = max_size
        self.lookback_days: int = lookback_days
        self.similarity_threshold: float = similarity_threshold
        self.mention_threshold: int = mention_threshold
        self.memories: Dict[str, Memory] = {}
        self.embeddings: Dict[str, List[float]] = {}
        self.vector_search: VectorSearch = VectorSearch(
            embedding_dim=384, similarity_threshold=similarity_threshold
        )
        self.pattern_detector: PatternDetector = PatternDetector(
            similarity_threshold=similarity_threshold,
            mention_threshold=mention_threshold,
        )

    def add(self, memory: Memory, embedding: List[float]) -> None:
        """
        Add memory with embedding to MTM.

        Sets memory tier to MTM, tracks in pattern detector, and adds
        to vector search index. If at max_size, removes oldest
        low-importance memory.

        Args:
            memory: Memory object to add
            embedding: Vector embedding for the memory content
        """
        memory.tier = MemoryTier.MTM
        now: datetime = datetime.now()
        memory.created_at = now
        memory.last_accessed = now

        # If at capacity, remove oldest low-importance memory
        if len(self.memories) >= self.max_size:
            self._remove_oldest_low_importance()

        # Store memory and embedding
        self.memories[memory.id] = memory
        self.embeddings[memory.id] = embedding

        # Add to vector search
        self.vector_search.add(
            vector_id=memory.id, embedding=embedding, metadata={"memory_id": memory.id}
        )

        # Track in pattern detector
        self.pattern_detector.add_memory(memory)

    def _remove_oldest_low_importance(self) -> None:
        """
        Remove oldest memory with lowest importance score.

        Used when at capacity to make room for new memories.
        """
        if not self.memories:
            return

        # Find memory with lowest importance and oldest age
        oldest_lowest: Optional[Tuple[str, float, datetime]] = None
        for memory_id, memory in self.memories.items():
            score: float = memory.importance_score
            age: datetime = memory.created_at
            if oldest_lowest is None:
                oldest_lowest = (memory_id, score, age)
            else:
                # Prefer lower importance, then older age
                if score < oldest_lowest[1] or (
                    score == oldest_lowest[1] and age < oldest_lowest[2]
                ):
                    oldest_lowest = (memory_id, score, age)

        if oldest_lowest:
            self.remove(oldest_lowest[0])

    def search(
        self, query_embedding: List[float], top_k: int = 10
    ) -> List[Tuple[Memory, float]]:
        """
        Search memories using vector similarity.

        Args:
            query_embedding: Query vector to search for
            top_k: Maximum number of results to return (default: 10)

        Returns:
            List of tuples (memory, similarity_score) sorted by similarity
            (highest first). Similarity scores range from 0.0 to 1.0.
        """
        results: List[Tuple[str, float, Dict]] = self.vector_search.search(
            query_embedding, top_k=top_k
        )

        memory_results: List[Tuple[Memory, float]] = []
        for vector_id, similarity, metadata in results:
            memory: Optional[Memory] = self.memories.get(vector_id)
            if memory:
                memory_results.append((memory, similarity))

        return memory_results

    def search_by_text(self, query_text: str, top_k: int = 10) -> List[Memory]:
        """
        Search memories by text content (exact/substring match).

        Fallback method when embeddings are unavailable.
        Case-insensitive substring matching.

        Args:
            query_text: Text to search for
            top_k: Maximum number of results to return (default: 10)

        Returns:
            List of matching Memory objects, sorted by recency (newest first)
        """
        query_lower: str = query_text.lower()
        matches: List[Memory] = []

        # Sort by created_at (newest first) for consistent ordering
        sorted_memories: List[Tuple[datetime, Memory]] = sorted(
            [(mem.created_at, mem) for mem in self.memories.values()],
            reverse=True,
        )

        for _, memory in sorted_memories:
            if query_lower in memory.content.lower():
                matches.append(memory)
                if len(matches) >= top_k:
                    break

        return matches

    def detect_patterns(self) -> List[Tuple[str, int, List[str]]]:
        """
        Detect patterns in MTM (facts mentioned 3+ times).

        Returns:
            List of tuples (fact_text, mention_count, [memory_ids])
            sorted by mention_count (highest first)
        """
        return self.pattern_detector.detect_patterns()

    def get_memory(self, memory_id: str) -> Optional[Memory]:
        """
        Retrieve memory by ID.

        Updates last_accessed timestamp and increments accessed_count.

        Args:
            memory_id: UUID of the memory to retrieve

        Returns:
            Memory object if found, None otherwise
        """
        memory: Optional[Memory] = self.memories.get(memory_id)
        if memory is not None:
            memory.last_accessed = datetime.now()
            memory.accessed_count += 1
        return memory

    def remove(self, memory_id: str) -> bool:
        """
        Remove memory from MTM.

        Removes from memories, embeddings, vector search, and pattern detector.

        Args:
            memory_id: ID of memory to remove

        Returns:
            True if memory was removed, False if not found
        """
        removed: bool = False

        if memory_id in self.memories:
            del self.memories[memory_id]
            removed = True

        if memory_id in self.embeddings:
            del self.embeddings[memory_id]

        self.vector_search.remove(memory_id)

        return removed

    def cleanup_stale(self) -> List[Memory]:
        """
        Remove memories older than lookback_days.

        Returns:
            List of removed Memory objects (for deletion/archival)
        """
        cutoff_time: datetime = datetime.now() - timedelta(days=self.lookback_days)
        stale_memories: List[Memory] = []

        memory_ids_to_remove: List[str] = []
        for memory_id, memory in self.memories.items():
            if memory.created_at < cutoff_time:
                stale_memories.append(memory)
                memory_ids_to_remove.append(memory_id)

        for memory_id in memory_ids_to_remove:
            self.remove(memory_id)

        return stale_memories

    def get_stats(self) -> Dict:
        """
        Get comprehensive statistics about MTM.

        Returns:
            Dictionary containing:
                - total_memories: Total number of memories
                - total_patterns: Number of detected patterns
                - oldest_memory_age_days: Age of oldest memory in days
                - newest_memory_age_hours: Age of newest memory in hours
                - average_importance: Average importance score
                - average_emotional_intensity: Average emotional intensity
                - vector_search_size: Number of vectors in search index
        """
        if len(self.memories) == 0:
            return {
                "total_memories": 0,
                "total_patterns": 0,
                "oldest_memory_age_days": 0,
                "newest_memory_age_hours": 0,
                "average_importance": 0.0,
                "average_emotional_intensity": 0.0,
                "vector_search_size": 0,
            }

        now: datetime = datetime.now()
        total_importance: float = 0.0
        total_emotional: float = 0.0
        oldest_time: Optional[datetime] = None
        newest_time: Optional[datetime] = None

        for memory in self.memories.values():
            total_importance += memory.importance_score
            total_emotional += memory.emotional_intensity

            if oldest_time is None or memory.created_at < oldest_time:
                oldest_time = memory.created_at
            if newest_time is None or memory.created_at > newest_time:
                newest_time = memory.created_at

        count: int = len(self.memories)
        oldest_age_days: int = 0
        newest_age_hours: int = 0

        if oldest_time is not None:
            oldest_age: timedelta = now - oldest_time
            oldest_age_days = int(oldest_age.total_seconds() / 86400)

        if newest_time is not None:
            newest_age: timedelta = now - newest_time
            newest_age_hours = int(newest_age.total_seconds() / 3600)

        patterns: List[Tuple[str, int, List[str]]] = self.detect_patterns()

        return {
            "total_memories": count,
            "total_patterns": len(patterns),
            "oldest_memory_age_days": oldest_age_days,
            "newest_memory_age_hours": newest_age_hours,
            "average_importance": total_importance / count,
            "average_emotional_intensity": total_emotional / count,
            "vector_search_size": self.vector_search.get_size(),
        }

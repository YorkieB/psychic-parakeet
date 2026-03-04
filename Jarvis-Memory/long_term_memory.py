"""
Long-Term Memory (LTM) management system for Jarvis AI.

This module provides the LongTermMemory class for managing consolidated
facts with deduplication and relationship tracking.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional

from consolidation import consolidate_memories
from deduplication import deduplication_pass
from memory import Memory, MemoryTier


class LongTermMemory:
    """
    Manages long-term consolidated facts with deduplication.

    LTM stores high-confidence consolidated facts that have been
    mentioned multiple times. Includes deduplication to maintain
    a clean knowledge base and relationship tracking.

    Attributes:
        max_size: Maximum number of facts to store
        dedup_threshold: Similarity threshold for duplicates (0-1)
        confidence_threshold: Minimum confidence to store fact (0-1)
        facts: Dictionary mapping fact_id to Memory object
        fact_index: Dictionary mapping normalized text to list of fact IDs
        relationships: Dictionary mapping fact_id to list of related fact IDs
    """

    def __init__(
        self,
        max_size: int = 100000,
        dedup_threshold: float = 0.8,
        confidence_threshold: float = 0.7,
    ) -> None:
        """
        Initialize Long-Term Memory system.

        Args:
            max_size: Maximum number of facts to store (default: 100000)
            dedup_threshold: Similarity threshold for duplicates (default: 0.8)
            confidence_threshold: Minimum confidence to store fact (default: 0.7)
        """
        self.max_size: int = max_size
        self.dedup_threshold: float = dedup_threshold
        self.confidence_threshold: float = confidence_threshold
        self.facts: Dict[str, Memory] = {}
        self.fact_index: Dict[str, List[str]] = {}
        self.relationships: Dict[str, List[str]] = {}

    def _index_fact(self, fact: Memory) -> None:
        """
        Add fact to text index for fast lookup.

        Args:
            fact: Memory to index
        """
        normalized: str = fact.content.lower().strip()
        if normalized not in self.fact_index:
            self.fact_index[normalized] = []
        if fact.id not in self.fact_index[normalized]:
            self.fact_index[normalized].append(fact.id)

    def _remove_from_index(self, fact_id: str, fact: Memory) -> None:
        """
        Remove fact from text index.

        Args:
            fact_id: ID of fact to remove
            fact: Memory object
        """
        normalized: str = fact.content.lower().strip()
        if normalized in self.fact_index:
            if fact_id in self.fact_index[normalized]:
                self.fact_index[normalized].remove(fact_id)
            if not self.fact_index[normalized]:
                del self.fact_index[normalized]

    def consolidate_and_add(
        self, source_memories: List[Memory], fact_text: str
    ) -> Memory:
        """
        Consolidate memories from MTM and add to LTM.

        Args:
            source_memories: List of memories to consolidate (3+ same fact)
            fact_text: The canonical fact text

        Returns:
            Consolidated Memory that was added to LTM

        Raises:
            ValueError: If source_memories is empty
        """
        if not source_memories:
            raise ValueError("Cannot consolidate empty list of memories")

        # Consolidate memories
        consolidated: Memory = consolidate_memories(source_memories, fact_text)

        # Check confidence threshold
        if consolidated.confidence < self.confidence_threshold:
            return consolidated  # Return but don't add if below threshold

        # If at capacity, remove lowest-confidence fact
        if len(self.facts) >= self.max_size:
            self._remove_lowest_confidence()

        # Add to LTM
        self.facts[consolidated.id] = consolidated
        self._index_fact(consolidated)

        # Update relationships
        for source_id in consolidated.consolidated_from:
            if source_id not in self.relationships:
                self.relationships[source_id] = []
            if consolidated.id not in self.relationships[source_id]:
                self.relationships[source_id].append(consolidated.id)

        return consolidated

    def _remove_lowest_confidence(self) -> None:
        """
        Remove fact with lowest confidence score.

        Used when at capacity to make room for new facts.
        """
        if not self.facts:
            return

        lowest_id: Optional[str] = None
        lowest_confidence: float = 1.0

        for fact_id, fact in self.facts.items():
            if fact.confidence < lowest_confidence:
                lowest_confidence = fact.confidence
                lowest_id = fact_id

        if lowest_id:
            self.remove(lowest_id)

    def add(self, memory: Memory) -> bool:
        """
        Add pre-consolidated fact to LTM.

        Checks confidence threshold before adding.

        Args:
            memory: Pre-consolidated Memory to add

        Returns:
            True if fact was added, False if rejected (low confidence)
        """
        if memory.confidence < self.confidence_threshold:
            return False

        # If at capacity, remove lowest-confidence fact
        if len(self.facts) >= self.max_size:
            self._remove_lowest_confidence()

        memory.tier = MemoryTier.LTM
        self.facts[memory.id] = memory
        self._index_fact(memory)

        return True

    def search(self, query: str, top_k: int = 10) -> List[Memory]:
        """
        Search LTM facts by text content.

        Supports substring/exact matching (case-insensitive).
        Results sorted by importance (highest first).

        Args:
            query: Search query text
            top_k: Maximum number of results to return (default: 10)

        Returns:
            List of matching Memory objects, sorted by importance
        """
        query_lower: str = query.lower()
        matches: List[Memory] = []

        # Search in fact_index for exact matches first
        if query_lower in self.fact_index:
            for fact_id in self.fact_index[query_lower]:
                if fact_id in self.facts:
                    matches.append(self.facts[fact_id])

        # Search all facts for substring matches
        for fact in self.facts.values():
            if query_lower in fact.content.lower():
                if fact not in matches:
                    matches.append(fact)

        # Sort by importance (highest first)
        matches.sort(key=lambda x: x.importance_score, reverse=True)

        return matches[:top_k]

    def get_fact(self, fact_id: str) -> Optional[Memory]:
        """
        Retrieve fact by ID.

        Updates last_accessed timestamp.

        Args:
            fact_id: UUID of the fact to retrieve

        Returns:
            Memory object if found, None otherwise
        """
        fact: Optional[Memory] = self.facts.get(fact_id)
        if fact is not None:
            fact.last_accessed = datetime.now()
        return fact

    def find_related(self, fact_id: str, top_k: int = 5) -> List[Memory]:
        """
        Find related facts using relationship graph.

        Args:
            fact_id: ID of fact to find related facts for
            top_k: Maximum number of related facts to return (default: 5)

        Returns:
            List of related Memory objects, sorted by importance
        """
        if fact_id not in self.relationships:
            return []

        related_ids: List[str] = self.relationships[fact_id]
        related_facts: List[Memory] = []

        for rid in related_ids:
            if rid in self.facts:
                related_facts.append(self.facts[rid])

        # Sort by importance
        related_facts.sort(key=lambda x: x.importance_score, reverse=True)

        return related_facts[:top_k]

    def deduplication_pass(self) -> Dict[str, int]:
        """
        Run deduplication on all LTM facts.

        Returns:
            Dictionary with statistics:
                - duplicates_found: Number of duplicate pairs found
                - merged_count: Number of facts merged
                - facts_before: Number of facts before dedup
                - facts_after: Number of facts after dedup
        """
        facts_before: int = len(self.facts)

        duplicates_found, merged_count, updated_facts = deduplication_pass(
            self.facts, self.dedup_threshold
        )

        # Update facts dictionary
        self.facts = updated_facts

        # Rebuild index
        self.fact_index.clear()
        for fact in self.facts.values():
            self._index_fact(fact)

        # Rebuild relationships
        self.relationships.clear()
        for fact in self.facts.values():
            for source_id in fact.consolidated_from:
                if source_id not in self.relationships:
                    self.relationships[source_id] = []
                if fact.id not in self.relationships[source_id]:
                    self.relationships[source_id].append(fact.id)

        facts_after: int = len(self.facts)

        return {
            "duplicates_found": duplicates_found,
            "merged_count": merged_count,
            "facts_before": facts_before,
            "facts_after": facts_after,
        }

    def remove(self, fact_id: str) -> bool:
        """
        Remove fact from LTM.

        Args:
            fact_id: ID of fact to remove

        Returns:
            True if fact was removed, False if not found
        """
        if fact_id not in self.facts:
            return False

        fact: Memory = self.facts[fact_id]
        self._remove_from_index(fact_id, fact)

        del self.facts[fact_id]

        # Remove from relationships
        if fact_id in self.relationships:
            del self.relationships[fact_id]

        # Remove from other facts' relationships
        for other_id, related_list in self.relationships.items():
            if fact_id in related_list:
                related_list.remove(fact_id)

        return True

    def get_stats(self) -> Dict:
        """
        Get comprehensive statistics about LTM.

        Returns:
            Dictionary containing:
                - total_facts: Total number of facts
                - average_confidence: Average confidence score
                - average_importance: Average importance score
                - average_mention_count: Average mention count
                - oldest_fact_age_days: Age of oldest fact in days
                - newest_fact_age_hours: Age of newest fact in hours
                - dedup_ratio: Ratio of duplicates merged (0-1)
        """
        if len(self.facts) == 0:
            return {
                "total_facts": 0,
                "average_confidence": 0.0,
                "average_importance": 0.0,
                "average_mention_count": 0.0,
                "oldest_fact_age_days": 0,
                "newest_fact_age_hours": 0,
                "dedup_ratio": 0.0,
            }

        now: datetime = datetime.now()
        total_confidence: float = 0.0
        total_importance: float = 0.0
        total_mentions: int = 0
        oldest_time: Optional[datetime] = None
        newest_time: Optional[datetime] = None

        for fact in self.facts.values():
            total_confidence += fact.confidence
            total_importance += fact.importance_score
            total_mentions += fact.mention_count

            if oldest_time is None or fact.created_at < oldest_time:
                oldest_time = fact.created_at
            if newest_time is None or fact.created_at > newest_time:
                newest_time = fact.created_at

        count: int = len(self.facts)
        oldest_age_days: int = 0
        newest_age_hours: int = 0

        if oldest_time is not None:
            oldest_age: timedelta = now - oldest_time
            oldest_age_days = int(oldest_age.total_seconds() / 86400)

        if newest_time is not None:
            newest_age: timedelta = now - newest_time
            newest_age_hours = int(newest_age.total_seconds() / 3600)

        # Calculate dedup ratio (estimate based on consolidated_from)
        consolidated_count: int = sum(
            1 for fact in self.facts.values() if fact.consolidated_from
        )
        dedup_ratio: float = (
            consolidated_count / count if count > 0 else 0.0
        )

        return {
            "total_facts": count,
            "average_confidence": total_confidence / count,
            "average_importance": total_importance / count,
            "average_mention_count": total_mentions / count,
            "oldest_fact_age_days": oldest_age_days,
            "newest_fact_age_hours": newest_age_hours,
            "dedup_ratio": dedup_ratio,
        }

"""
Pattern detection module for Jarvis MTM system.

This module identifies frequently-mentioned facts and patterns by grouping
similar memories together using text similarity metrics.
"""

from typing import Dict, List, Optional, Set, Tuple

from memory import Memory


class PatternDetector:
    """
    Detects patterns in memories by grouping similar content.

    Uses Jaccard similarity (word overlap) to identify when multiple
    memories represent the same fact or pattern. Groups memories
    that exceed the similarity threshold together.

    Attributes:
        similarity_threshold: Minimum similarity to consider memories "same" (0-1)
        mention_threshold: Minimum mentions to consider a pattern (default: 3)
        _memories: Dictionary mapping memory_id to Memory object
        _pattern_groups: Dictionary mapping pattern_key to set of memory_ids
    """

    def __init__(
        self, similarity_threshold: float = 0.7, mention_threshold: int = 3
    ) -> None:
        """
        Initialize PatternDetector.

        Args:
            similarity_threshold: Two memories are "same fact" if similarity > threshold (default: 0.7)
            mention_threshold: Consolidate after N mentions (default: 3)
        """
        self.similarity_threshold: float = similarity_threshold
        self.mention_threshold: int = mention_threshold
        self._memories: Dict[str, Memory] = {}
        self._pattern_groups: Dict[str, Set[str]] = {}

    def _normalize_text(self, text: str) -> Set[str]:
        """
        Normalize text for comparison.

        Converts to lowercase and splits into word set.

        Args:
            text: Text to normalize

        Returns:
            Set of normalized words
        """
        words: List[str] = text.lower().split()
        return set(word.strip(".,!?;:()[]{}'\"") for word in words if word.strip())

    def _jaccard_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate Jaccard similarity between two texts.

        Jaccard similarity = |A ∩ B| / |A ∪ B|
        where A and B are sets of words.

        Args:
            text1: First text
            text2: Second text

        Returns:
            Similarity score from 0.0 to 1.0
        """
        words1: Set[str] = self._normalize_text(text1)
        words2: Set[str] = self._normalize_text(text2)

        if not words1 and not words2:
            return 1.0
        if not words1 or not words2:
            return 0.0

        intersection: Set[str] = words1 & words2
        union: Set[str] = words1 | words2

        return len(intersection) / len(union) if union else 0.0

    def _find_similar_pattern(self, memory: Memory) -> Optional[str]:
        """
        Find existing pattern group that this memory belongs to.

        Args:
            memory: Memory to find pattern for

        Returns:
            Pattern key if found, None otherwise
        """
        for pattern_key, memory_ids in self._pattern_groups.items():
            # Check similarity with first memory in group (representative)
            if memory_ids:
                representative_id: str = next(iter(memory_ids))
                representative: Memory = self._memories.get(representative_id)
                if representative:
                    similarity: float = self._jaccard_similarity(
                        memory.content, representative.content
                    )
                    if similarity >= self.similarity_threshold:
                        return pattern_key
        return None

    def add_memory(self, memory: Memory) -> None:
        """
        Track memory for pattern detection.

        Groups similar memories together based on content similarity.

        Args:
            memory: Memory object to track
        """
        self._memories[memory.id] = memory

        # Find if this memory belongs to an existing pattern
        existing_pattern: Optional[str] = self._find_similar_pattern(memory)

        if existing_pattern:
            # Add to existing pattern group
            self._pattern_groups[existing_pattern].add(memory.id)
        else:
            # Create new pattern group using memory content as key
            pattern_key: str = memory.content.lower().strip()
            if pattern_key not in self._pattern_groups:
                self._pattern_groups[pattern_key] = set()
            self._pattern_groups[pattern_key].add(memory.id)

    def detect_patterns(self) -> List[Tuple[str, int, List[str]]]:
        """
        Detect patterns (facts mentioned 3+ times).

        Finds memory groups that exceed the mention threshold and
        returns them as consolidation candidates.

        Returns:
            List of tuples (fact_text, mention_count, [memory_ids])
            sorted by mention_count (highest first).
            Only includes patterns with mention_count >= mention_threshold.
        """
        patterns: List[Tuple[str, int, List[str]]] = []

        for pattern_key, memory_ids in self._pattern_groups.items():
            mention_count: int = len(memory_ids)
            if mention_count >= self.mention_threshold:
                # Get representative text from first memory in group
                memory_ids_list: List[str] = list(memory_ids)
                if memory_ids_list:
                    representative_id: str = memory_ids_list[0]
                    representative: Memory = self._memories.get(representative_id)
                    fact_text: str = (
                        representative.content if representative else pattern_key
                    )
                    patterns.append((fact_text, mention_count, memory_ids_list))

        # Sort by mention count (highest first)
        patterns.sort(key=lambda x: x[1], reverse=True)
        return patterns

    def get_pattern_for_memory(self, memory_id: str) -> Optional[str]:
        """
        Get which pattern group a memory belongs to.

        Args:
            memory_id: ID of memory to check

        Returns:
            Pattern key if memory belongs to a pattern, None otherwise
        """
        for pattern_key, memory_ids in self._pattern_groups.items():
            if memory_id in memory_ids:
                return pattern_key
        return None

    def clear(self) -> None:
        """Clear all patterns and tracked memories."""
        self._memories.clear()
        self._pattern_groups.clear()

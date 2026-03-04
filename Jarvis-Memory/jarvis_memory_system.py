"""
Unified three-tier memory system for Jarvis AI.

This module provides the JarvisMemorySystem class that orchestrates
the complete memory hierarchy: STM → MTM → LTM.
"""

from typing import Callable, Dict, List, Optional

from integration_stm_to_mtm import consolidate_mtm_to_ltm, stm_to_mtm
from long_term_memory import LongTermMemory
from medium_term_memory import MediumTermMemory
from memory import Memory, MemoryType
from short_term_memory import ShortTermMemory


class JarvisMemorySystem:
    """
    Complete three-tier memory system: STM → MTM → LTM.

    Orchestrates data flow between tiers and provides unified interface
    for memory operations including ingestion, consolidation, and querying.

    Attributes:
        stm: ShortTermMemory instance
        mtm: MediumTermMemory instance
        ltm: LongTermMemory instance
        embedding_generator: Function to generate embeddings from text
    """

    def __init__(
        self,
        stm_max_size: int = 500,
        mtm_max_size: int = 5000,
        ltm_max_size: int = 100000,
        embedding_generator: Optional[Callable[[str], List[float]]] = None,
    ) -> None:
        """
        Initialize Jarvis Memory System.

        Args:
            stm_max_size: Maximum memories in STM (default: 500)
            mtm_max_size: Maximum memories in MTM (default: 5000)
            ltm_max_size: Maximum facts in LTM (default: 100000)
            embedding_generator: Function to generate embeddings (default: dummy)
        """
        self.stm: ShortTermMemory = ShortTermMemory(max_size=stm_max_size)
        self.mtm: MediumTermMemory = MediumTermMemory(max_size=mtm_max_size)
        self.ltm: LongTermMemory = LongTermMemory(max_size=ltm_max_size)

        if embedding_generator is None:
            self.embedding_generator: Callable[[str], List[float]] = (
                self._generate_embedding
            )
        else:
            self.embedding_generator = embedding_generator

    def ingest(
        self,
        text: str,
        emotion: Optional[str] = None,
        context: Optional[str] = None,
        embedding: Optional[List[float]] = None,
        importance_score: Optional[float] = None,
    ) -> Memory:
        """
        Ingest new memory into system.

        Automatically routes: ingest → STM

        Args:
            text: Memory content text
            emotion: Source emotion (e.g., "joy", "frustration")
            context: Source context (e.g., "work", "relationship")
            embedding: Optional pre-computed embedding
            importance_score: Optional importance score (auto-calculated if None)

        Returns:
            Memory object that was added to STM
        """
        if importance_score is None:
            importance_score = self._calculate_importance(text, emotion)

        memory: Memory = Memory(
            content=text,
            importance_score=importance_score,
            source_emotion=emotion if emotion else "neutral",
            source_context=context if context else "general",
            memory_type=MemoryType.FACT,
            embedding=embedding,
        )

        self.stm.add(memory)
        return memory

    def consolidate(self) -> Dict[str, int]:
        """
        Run full consolidation pipeline: STM → MTM → LTM.

        Process:
        1. Move stale STM to MTM
        2. Detect patterns in MTM (3+ mentions)
        3. Consolidate MTM patterns to LTM
        4. Dedup LTM
        5. Clean up stale MTM/STM

        Returns:
            Dictionary with statistics for all operations:
                - stm_to_mtm_moved: Memories moved from STM to MTM
                - stm_to_mtm_discarded: Memories discarded (low importance)
                - patterns_detected: Patterns detected in MTM
                - patterns_consolidated: Patterns consolidated to LTM
                - ltm_dedup_merged: Facts merged during deduplication
                - ltm_total: Total facts in LTM after consolidation
        """
        stats: Dict[str, int] = {}

        # Step 1: Move stale STM to MTM
        stm_stats: Dict[str, int] = stm_to_mtm(
            self.stm, self.mtm, self.embedding_generator
        )
        stats["stm_to_mtm_moved"] = stm_stats["moved_to_mtm"]
        stats["stm_to_mtm_discarded"] = stm_stats["discarded"]

        # Step 2: Detect patterns in MTM
        patterns: List[tuple[str, int, List[str]]] = consolidate_mtm_to_ltm(self.mtm)
        stats["patterns_detected"] = len(patterns)

        # Step 3: Consolidate patterns to LTM
        consolidated_count: int = 0
        for fact_text, mention_count, memory_ids in patterns:
            # Get memories from MTM
            source_memories: List[Memory] = []
            for mem_id in memory_ids:
                mem: Optional[Memory] = self.mtm.get_memory(mem_id)
                if mem:
                    source_memories.append(mem)

            if len(source_memories) >= 3:  # Only consolidate if 3+ memories
                self.ltm.consolidate_and_add(source_memories, fact_text)
                consolidated_count += 1

        stats["patterns_consolidated"] = consolidated_count

        # Step 4: Deduplicate LTM
        dedup_stats: Dict[str, int] = self.ltm.deduplication_pass()
        stats["ltm_dedup_merged"] = dedup_stats["merged_count"]

        # Step 5: Clean up stale MTM
        stale_mtm: List[Memory] = self.mtm.cleanup_stale()
        stats["mtm_cleaned"] = len(stale_mtm)

        stats["ltm_total"] = len(self.ltm.facts)

        return stats

    def query(self, query_text: str, top_k: int = 10) -> List[Memory]:
        """
        Query entire system for memories.

        Searches STM first, then MTM, then LTM.
        Returns best matches from any tier.

        Args:
            query_text: Query text to search for
            top_k: Maximum number of results to return (default: 10)

        Returns:
            List of Memory objects from any tier, sorted by importance
        """
        all_results: List[Memory] = []

        # Search STM
        stm_results: List[Memory] = self.stm.search(query_text, top_k=top_k)
        all_results.extend(stm_results)

        # Search MTM by text
        mtm_results: List[Memory] = self.mtm.search_by_text(query_text, top_k=top_k)
        all_results.extend(mtm_results)

        # Search LTM
        ltm_results: List[Memory] = self.ltm.search(query_text, top_k=top_k)
        all_results.extend(ltm_results)

        # Remove duplicates (same ID) and sort by importance
        seen_ids: set[str] = set()
        unique_results: List[Memory] = []
        for mem in all_results:
            if mem.id not in seen_ids:
                seen_ids.add(mem.id)
                unique_results.append(mem)

        # Sort by importance (highest first)
        unique_results.sort(key=lambda x: x.importance_score, reverse=True)

        return unique_results[:top_k]

    def get_system_stats(self) -> Dict:
        """
        Get statistics for entire system.

        Returns:
            Dictionary containing statistics from all three tiers:
                - stm_stats: STM statistics
                - mtm_stats: MTM statistics
                - ltm_stats: LTM statistics
                - total_memories: Total across all tiers
        """
        stm_stats: Dict = self.stm.get_stats()
        mtm_stats: Dict = self.mtm.get_stats()
        ltm_stats: Dict = self.ltm.get_stats()

        total_memories: int = (
            stm_stats["total_memories"]
            + mtm_stats["total_memories"]
            + ltm_stats["total_facts"]
        )

        return {
            "stm_stats": stm_stats,
            "mtm_stats": mtm_stats,
            "ltm_stats": ltm_stats,
            "total_memories": total_memories,
        }

    def _calculate_importance(self, text: str, emotion: Optional[str]) -> float:
        """
        Calculate importance score for a memory.

        Simple heuristic based on text length and emotion.

        Args:
            text: Memory content text
            emotion: Source emotion (if any)

        Returns:
            Importance score from 0.0 to 1.0
        """
        base_score: float = 0.5

        # Boost for longer text (more information)
        length_factor: float = min(1.0, len(text) / 100.0)
        base_score += length_factor * 0.2

        # Boost for emotional content
        if emotion and emotion != "neutral":
            base_score += 0.1

        return min(1.0, base_score)

    def _generate_embedding(self, text: str) -> List[float]:
        """
        Generate dummy embedding for demonstration.

        In production, replace with actual embedding model:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer('all-MiniLM-L6-v2')
        return model.encode(text).tolist()

        Args:
            text: Text to generate embedding for

        Returns:
            List of 384 floats representing the embedding
        """
        import random

        # Create deterministic embedding based on text hash
        random.seed(hash(text) % (2**32))
        return [random.random() for _ in range(384)]

"""
Real-time consolidation extension for Jarvis Memory System.

This module provides RealtimeJarvis class that automatically consolidates
memories in real-time when patterns are detected.
"""

from typing import Callable, Dict, List, Optional

from jarvis_memory_system import JarvisMemorySystem
from memory import Memory


class RealtimeJarvis(JarvisMemorySystem):
    """
    Jarvis with automatic real-time consolidation.

    Extends JarvisMemorySystem to automatically consolidate memories
    when patterns are detected during ingestion, without requiring
    explicit consolidate() calls.

    Attributes:
        consolidation_callbacks: List of callbacks to invoke on consolidation
        consolidation_stats: Statistics about auto-consolidation operations
    """

    def __init__(
        self,
        stm_max_size: int = 500,
        mtm_max_size: int = 5000,
        ltm_max_size: int = 100000,
        embedding_generator: Optional[Callable[[str], List[float]]] = None,
    ) -> None:
        """
        Initialize RealtimeJarvis.

        Args:
            stm_max_size: Maximum memories in STM (default: 500)
            mtm_max_size: Maximum memories in MTM (default: 5000)
            ltm_max_size: Maximum facts in LTM (default: 100000)
            embedding_generator: Function to generate embeddings (default: dummy)
        """
        super().__init__(
            stm_max_size=stm_max_size,
            mtm_max_size=mtm_max_size,
            ltm_max_size=ltm_max_size,
            embedding_generator=embedding_generator,
        )
        self.consolidation_callbacks: List[Callable] = []
        self.consolidation_stats: Dict[str, int] = {
            "total_auto_consolidations": 0,
            "patterns_detected": 0,
            "facts_consolidated": 0,
        }

    def ingest(
        self,
        text: str,
        emotion: Optional[str] = None,
        context: Optional[str] = None,
        embedding: Optional[List[float]] = None,
        importance_score: Optional[float] = None,
        auto_consolidate: bool = True,
    ) -> Memory:
        """
        Ingest memory and auto-consolidate if pattern detected.

        Args:
            text: Memory content text
            emotion: Source emotion (e.g., "joy", "frustration")
            context: Source context (e.g., "work", "relationship")
            embedding: Optional pre-computed embedding
            importance_score: Optional importance score (auto-calculated if None)
            auto_consolidate: Whether to auto-consolidate on pattern detection (default: True)

        Returns:
            Memory object that was added to STM
        """
        memory: Memory = super().ingest(
            text=text,
            emotion=emotion,
            context=context,
            embedding=embedding,
            importance_score=importance_score,
        )

        if auto_consolidate and len(self.mtm.memories) > 0:
            patterns: List[tuple[str, int, List[str]]] = self.mtm.detect_patterns()

            if patterns:
                self.consolidation_stats["patterns_detected"] += len(patterns)

                for fact_text, mention_count, memory_ids in patterns:
                    if mention_count >= 3:
                        source_memories: List[Memory] = []
                        for mem_id in memory_ids:
                            if mem_id:
                                mem: Optional[Memory] = self.mtm.get_memory(mem_id)
                                if mem:
                                    source_memories.append(mem)

                        if len(source_memories) >= 3:
                            self.ltm.consolidate_and_add(source_memories, fact_text)
                            self.consolidation_stats["total_auto_consolidations"] += 1
                            self.consolidation_stats["facts_consolidated"] += 1

                            # Invoke callbacks
                            for callback in self.consolidation_callbacks:
                                try:
                                    callback(fact_text, mention_count, memory_ids)
                                except Exception as e:
                                    print(f"Callback error: {e}")

        return memory

    def register_consolidation_callback(self, callback: Callable) -> None:
        """
        Register callback for when consolidation happens.

        Callback signature: callback(fact_text: str, mention_count: int, memory_ids: List[str])

        Args:
            callback: Function to call when consolidation occurs
        """
        self.consolidation_callbacks.append(callback)

    def get_consolidation_stats(self) -> Dict:
        """
        Get real-time consolidation statistics.

        Returns:
            Dictionary containing:
                - total_auto_consolidations: Total number of auto-consolidations
                - patterns_detected: Total patterns detected
                - facts_consolidated: Total facts consolidated
                - avg_mentions: Average mentions per consolidation
        """
        stats: Dict = self.consolidation_stats.copy()

        if stats["total_auto_consolidations"] > 0:
            stats["avg_mentions"] = (
                stats["patterns_detected"] / stats["total_auto_consolidations"]
            )
        else:
            stats["avg_mentions"] = 0.0

        return stats

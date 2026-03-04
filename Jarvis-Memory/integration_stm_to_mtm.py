"""
Integration functions for moving memories from STM to MTM.

This module provides functions to transfer memories from Short-Term Memory
to Medium-Term Memory, including embedding generation and filtering.
"""

from typing import Callable, Dict, List

from memory import Memory
from medium_term_memory import MediumTermMemory
from short_term_memory import ShortTermMemory


def stm_to_mtm(
    stm: ShortTermMemory,
    mtm: MediumTermMemory,
    embedding_generator: Callable[[str], List[float]],
) -> Dict[str, int]:
    """
    Move stale memories from STM to MTM.

    Process:
    1. Clear stale from STM (memories >1 hour old)
    2. For each stale memory:
       - If importance_score >= 0.5, add to MTM
       - Generate embedding if not present
       - If importance_score < 0.5, discard
    3. Return statistics

    Args:
        stm: ShortTermMemory instance
        mtm: MediumTermMemory instance
        embedding_generator: Function that takes text and returns embedding vector

    Returns:
        Dictionary with statistics:
            - moved_to_mtm: Number of memories moved to MTM
            - discarded: Number of memories discarded (low importance)
            - mtm_total: Total memories in MTM after move
    """
    IMPORTANCE_THRESHOLD: float = 0.5

    # Get stale memories from STM
    stale_memories: List[Memory] = stm.clear_stale()

    moved_count: int = 0
    discarded_count: int = 0

    for memory in stale_memories:
        if memory.importance_score >= IMPORTANCE_THRESHOLD:
            # Generate embedding if not present
            embedding: List[float]
            if memory.embedding is not None:
                embedding = memory.embedding
            else:
                embedding = embedding_generator(memory.content)
                memory.embedding = embedding

            # Add to MTM
            mtm.add(memory, embedding)
            moved_count += 1
        else:
            # Discard low-importance memory
            discarded_count += 1

    return {
        "moved_to_mtm": moved_count,
        "discarded": discarded_count,
        "mtm_total": len(mtm.memories),
    }


def consolidate_mtm_to_ltm(
    mtm: MediumTermMemory,
) -> List[tuple[str, int, List[str]]]:
    """
    Prepare consolidation from MTM to LTM.

    Process:
    1. Detect patterns (3+ mentions)
    2. Return pattern groups ready for consolidation

    Args:
        mtm: MediumTermMemory instance

    Returns:
        List of tuples (fact_text, mention_count, memory_ids)
        representing patterns ready for consolidation.
        Sorted by mention_count (highest first).
    """
    patterns: List[tuple[str, int, List[str]]] = mtm.detect_patterns()
    return patterns

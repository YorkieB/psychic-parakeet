"""
Consolidation module for Jarvis LTM system.

This module provides functions to consolidate multiple similar memories
from MTM into single consolidated facts for LTM storage.
"""

from typing import List

from memory import Memory, MemoryTier


def calculate_confidence(mention_count: int) -> float:
    """
    Calculate confidence based on mention count.

    Formula: confidence = min(0.99, 0.5 + (0.15 * mention_count))
    - 1 mention: 0.65 confidence
    - 2 mentions: 0.80 confidence
    - 3 mentions: 0.95 confidence
    - 4+ mentions: 0.99 confidence (capped)

    Args:
        mention_count: Number of times the fact was mentioned

    Returns:
        Confidence score from 0.5 to 0.99
    """
    confidence: float = 0.5 + (0.15 * mention_count)
    return min(0.99, confidence)


def consolidate_memories(source_memories: List[Memory], fact_text: str) -> Memory:
    """
    Consolidate multiple similar memories into one LTM fact.

    Process:
    1. Take 3+ similar memories (same fact mentioned multiple times)
    2. Combine their information:
       - Use fact_text as consolidated content
       - Average importance scores
       - Average emotional intensity
       - Combine contexts
       - Increase confidence with each mention (0.5 + 0.15*mentions)
       - Set mention_count to number of source memories
    3. Return consolidated memory ready for LTM storage

    Args:
        source_memories: List of memories to consolidate (3+ same fact)
        fact_text: The canonical fact text

    Returns:
        Consolidated Memory with:
        - content = fact_text
        - importance_score = average of sources
        - emotional_intensity = average of sources
        - confidence = calculated from mention_count
        - mention_count = len(source_memories)
        - consolidated_from = list of source memory IDs
        - related_memories = cross-references
        - tier = LTM
    """
    if not source_memories:
        raise ValueError("Cannot consolidate empty list of memories")

    mention_count: int = len(source_memories)

    # Calculate averages
    total_importance: float = sum(mem.importance_score for mem in source_memories)
    average_importance: float = total_importance / mention_count

    total_emotional: float = sum(mem.emotional_intensity for mem in source_memories)
    average_emotional: float = total_emotional / mention_count

    # Collect all contexts and emotions
    contexts: set[str] = set()
    emotions: set[str] = set()
    for mem in source_memories:
        if mem.source_context:
            contexts.add(mem.source_context)
        if mem.source_emotion:
            emotions.add(mem.source_emotion)

    # Combine contexts (comma-separated if multiple)
    combined_context: str = ", ".join(sorted(contexts)) if contexts else "general"
    combined_emotion: str = ", ".join(sorted(emotions)) if emotions else "neutral"

    # Collect source memory IDs
    source_ids: List[str] = [mem.id for mem in source_memories]

    # Collect related memory IDs (from all sources)
    related_ids: List[str] = []
    for mem in source_memories:
        related_ids.extend(mem.related_memories)
    # Remove duplicates while preserving order
    seen: set[str] = set()
    unique_related: List[str] = []
    for rid in related_ids:
        if rid not in seen and rid not in source_ids:
            seen.add(rid)
            unique_related.append(rid)

    # Create consolidated memory
    consolidated: Memory = Memory(
        content=fact_text,
        tier=MemoryTier.LTM,
        importance_score=average_importance,
        emotional_intensity=average_emotional,
        source_context=combined_context,
        source_emotion=combined_emotion,
        mention_count=mention_count,
        consolidated_from=source_ids,
        related_memories=unique_related,
        confidence=calculate_confidence(mention_count),
    )

    return consolidated

"""
Deduplication module for Jarvis LTM system.

This module provides functions to identify and merge duplicate facts
in Long-Term Memory to maintain a clean, deduplicated knowledge base.
"""

from typing import Dict, List, Tuple

from memory import Memory


def _normalize_text(text: str) -> set[str]:
    """
    Normalize text for similarity comparison.

    Converts to lowercase and splits into word set.

    Args:
        text: Text to normalize

    Returns:
        Set of normalized words
    """
    words: List[str] = text.lower().split()
    return set(word.strip(".,!?;:()[]{}'\"") for word in words if word.strip())


def _jaccard_similarity(text1: str, text2: str) -> float:
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
    words1: set[str] = _normalize_text(text1)
    words2: set[str] = _normalize_text(text2)

    if not words1 and not words2:
        return 1.0
    if not words1 or not words2:
        return 0.0

    intersection: set[str] = words1 & words2
    union: set[str] = words1 | words2

    return len(intersection) / len(union) if union else 0.0


def find_duplicates(
    ltm_facts: Dict[str, Memory], similarity_threshold: float = 0.8
) -> List[Tuple[str, str, float]]:
    """
    Find duplicate/similar facts in LTM.

    Process:
    1. Compare all LTM facts pairwise
    2. If text similarity >threshold, they're duplicates
    3. Return list of duplicate pairs

    Args:
        ltm_facts: Dictionary of fact_id -> Memory
        similarity_threshold: Minimum similarity to consider duplicates (default: 0.8)

    Returns:
        List of tuples (fact_id_1, fact_id_2, similarity_score)
        sorted by similarity (highest first).
        Only includes pairs with similarity >= threshold.
    """
    duplicates: List[Tuple[str, str, float]] = []
    fact_ids: List[str] = list(ltm_facts.keys())

    # Compare all pairs (avoid comparing same pair twice)
    for i in range(len(fact_ids)):
        for j in range(i + 1, len(fact_ids)):
            fact_id1: str = fact_ids[i]
            fact_id2: str = fact_ids[j]

            fact1: Memory = ltm_facts[fact_id1]
            fact2: Memory = ltm_facts[fact_id2]

            similarity: float = _jaccard_similarity(fact1.content, fact2.content)

            if similarity >= similarity_threshold:
                duplicates.append((fact_id1, fact_id2, similarity))

    # Sort by similarity (highest first)
    duplicates.sort(key=lambda x: x[2], reverse=True)
    return duplicates


def merge_duplicates(fact1: Memory, fact2: Memory) -> Memory:
    """
    Merge two duplicate facts into one.

    Process:
    1. Keep the more confident fact as base
    2. Add less confident fact to related_memories
    3. Combine mention_count
    4. Average importance/emotional_intensity
    5. Combine consolidated_from lists
    6. Boost confidence: min(0.99, fact1.confidence + 0.05)

    Args:
        fact1: First fact to merge
        fact2: Second fact to merge

    Returns:
        Merged fact (superset of both facts)
    """
    # Determine which fact is more confident (use as base)
    base_fact: Memory
    other_fact: Memory
    if fact1.confidence >= fact2.confidence:
        base_fact = fact1
        other_fact = fact2
    else:
        base_fact = fact2
        other_fact = fact1

    # Combine mention counts
    combined_mention_count: int = base_fact.mention_count + other_fact.mention_count

    # Average importance and emotional intensity
    avg_importance: float = (base_fact.importance_score + other_fact.importance_score) / 2.0
    avg_emotional: float = (
        base_fact.emotional_intensity + other_fact.emotional_intensity
    ) / 2.0

    # Combine consolidated_from lists
    combined_consolidated: List[str] = list(base_fact.consolidated_from)
    for cid in other_fact.consolidated_from:
        if cid not in combined_consolidated:
            combined_consolidated.append(cid)

    # Combine related_memories
    combined_related: List[str] = list(base_fact.related_memories)
    for rid in other_fact.related_memories:
        if rid not in combined_related and rid != base_fact.id and rid != other_fact.id:
            combined_related.append(rid)

    # Add other fact to related_memories if not already there
    if other_fact.id not in combined_related:
        combined_related.append(other_fact.id)

    # Boost confidence
    boosted_confidence: float = min(0.99, base_fact.confidence + 0.05)

    # Create merged fact (preserve base fact's ID and content)
    merged: Memory = Memory(
        id=base_fact.id,
        content=base_fact.content,
        tier=base_fact.tier,
        memory_type=base_fact.memory_type,
        created_at=base_fact.created_at,
        last_accessed=base_fact.last_accessed,
        accessed_count=base_fact.accessed_count,
        importance_score=avg_importance,
        emotional_intensity=avg_emotional,
        source_emotion=base_fact.source_emotion,
        source_context=base_fact.source_context,
        embedding=base_fact.embedding,
        mention_count=combined_mention_count,
        related_memories=combined_related,
        consolidated_from=combined_consolidated,
        confidence=boosted_confidence,
        decay_rate=base_fact.decay_rate,
    )

    return merged


def deduplication_pass(
    ltm_facts: Dict[str, Memory], similarity_threshold: float = 0.8
) -> Tuple[int, int, Dict[str, Memory]]:
    """
    Run one complete deduplication pass.

    Process:
    1. Find all duplicates
    2. Merge similar facts
    3. Remove merged duplicates from LTM

    Args:
        ltm_facts: Dictionary of fact_id -> Memory
        similarity_threshold: Minimum similarity to consider duplicates (default: 0.8)

    Returns:
        Tuple of (duplicates_found, merged_count, updated_facts_dict)
        - duplicates_found: Number of duplicate pairs found
        - merged_count: Number of facts merged
        - updated_facts_dict: Updated facts dictionary after merging
    """
    if len(ltm_facts) < 2:
        return (0, 0, ltm_facts.copy())

    # Find duplicates
    duplicates: List[Tuple[str, str, float]] = find_duplicates(
        ltm_facts, similarity_threshold
    )
    duplicates_found: int = len(duplicates)

    if duplicates_found == 0:
        return (0, 0, ltm_facts.copy())

    # Track which facts have been merged (to avoid double-merging)
    merged_facts: set[str] = set()
    updated_facts: Dict[str, Memory] = ltm_facts.copy()
    merged_count: int = 0

    # Merge duplicates (process in order of similarity)
    for fact_id1, fact_id2, similarity in duplicates:
        # Skip if either fact already merged
        if fact_id1 in merged_facts or fact_id2 in merged_facts:
            continue

        fact1: Memory = updated_facts[fact_id1]
        fact2: Memory = updated_facts[fact_id2]

        # Merge facts
        merged: Memory = merge_duplicates(fact1, fact2)

        # Update facts dictionary
        updated_facts[fact_id1] = merged
        del updated_facts[fact_id2]

        # Mark both as processed
        merged_facts.add(fact_id1)
        merged_facts.add(fact_id2)
        merged_count += 1

    return (duplicates_found, merged_count, updated_facts)

"""
Example usage of the Medium-Term Memory system.

This script demonstrates how to use MTM with vector search, pattern detection,
and integration with STM.
"""

import random

from integration_stm_to_mtm import consolidate_mtm_to_ltm, stm_to_mtm
from memory import Memory, MemoryType
from medium_term_memory import MediumTermMemory
from short_term_memory import ShortTermMemory


def dummy_embedding(text: str) -> list[float]:
    """
    Generate dummy embedding for demonstration.

    In production, use sentence-transformers or similar:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer('all-MiniLM-L6-v2')
    return model.encode(text).tolist()

    Args:
        text: Text to generate embedding for

    Returns:
        List of 384 floats representing the embedding
    """
    # Create deterministic embedding based on text hash
    random.seed(hash(text) % (2**32))
    return [random.random() for _ in range(384)]


def main() -> None:
    """Run example usage demonstration."""
    # Setup
    stm: ShortTermMemory = ShortTermMemory(max_size=500)
    mtm: MediumTermMemory = MediumTermMemory(max_size=5000)

    print("=" * 60)
    print("Jarvis Medium-Term Memory (MTM) System Demo")
    print("=" * 60)

    # Add memories to STM (they age and become stale)
    print("\n1. Adding memories to STM...")
    mem1: Memory = Memory(
        content="I work at Google",
        importance_score=0.8,
        source_emotion="neutral",
        source_context="work",
        memory_type=MemoryType.FACT,
    )
    stm.add(mem1)

    mem2: Memory = Memory(
        content="Google is my employer",
        importance_score=0.75,
        source_emotion="neutral",
        source_context="work",
        memory_type=MemoryType.FACT,
    )
    stm.add(mem2)

    mem3: Memory = Memory(
        content="I lead auth team at Google",
        importance_score=0.85,
        source_emotion="joy",
        source_context="work",
        memory_type=MemoryType.EXPERIENCE,
    )
    stm.add(mem3)

    mem4: Memory = Memory(
        content="I've been at Google for 5 years",
        importance_score=0.7,
        source_emotion="neutral",
        source_context="work",
        memory_type=MemoryType.EXPERIENCE,
    )
    stm.add(mem4)

    print(f"   Added {stm.get_size()} memories to STM")

    # Make memories stale (simulate aging)
    print("\n2. Making memories stale (simulating 2 hours passing)...")
    stale_memories: list[Memory] = stm.clear_stale()
    for mem in stale_memories:
        mem.created_at = stm._session_start - timedelta(hours=2)

    # Re-add to STM to make them stale
    for mem in stale_memories:
        stm.add(mem)
        mem.created_at = stm._session_start - timedelta(hours=2)

    # Move from STM to MTM with embeddings
    print("\n3. Moving memories from STM to MTM...")
    stats: dict[str, int] = stm_to_mtm(stm, mtm, dummy_embedding)

    print(f"   Moved to MTM: {stats['moved_to_mtm']}")
    print(f"   Discarded (low importance): {stats['discarded']}")
    print(f"   MTM total: {stats['mtm_total']}")

    # Add more memories directly to MTM to demonstrate patterns
    print("\n4. Adding more memories to MTM for pattern detection...")
    for i in range(3):
        mem: Memory = Memory(
            content="I work at Google",
            importance_score=0.8,
            memory_type=MemoryType.FACT,
        )
        embedding: list[float] = dummy_embedding(mem.content)
        mtm.add(mem, embedding)

    print(f"   MTM now has {len(mtm.memories)} memories")

    # Search MTM
    print("\n5. Searching MTM with vector similarity...")
    query_text: str = "Work at Google"
    query_embedding: list[float] = dummy_embedding(query_text)
    results: list[tuple[Memory, float]] = mtm.search(query_embedding, top_k=5)

    print(f"   Found {len(results)} similar memories:")
    for i, (memory, similarity) in enumerate(results, 1):
        print(f"   {i}. Similarity: {similarity:.3f} - {memory.content}")

    # Text search
    print("\n6. Text search in MTM...")
    text_results: list[Memory] = mtm.search_by_text("Google", top_k=5)
    print(f"   Found {len(text_results)} memories containing 'Google':")
    for i, mem in enumerate(text_results, 1):
        print(f"   {i}. {mem.content}")

    # Detect patterns (3+ mentions)
    print("\n7. Detecting patterns (facts mentioned 3+ times)...")
    patterns: list[tuple[str, int, list[str]]] = mtm.detect_patterns()
    print(f"   Detected {len(patterns)} patterns:")
    for i, (fact_text, mention_count, memory_ids) in enumerate(patterns, 1):
        print(f"   Pattern {i}: '{fact_text}'")
        print(f"      Mentioned {mention_count} times")
        print(f"      Memory IDs: {len(memory_ids)} memories")

    # Get stats
    print("\n8. MTM Statistics:")
    stats_mtm: dict = mtm.get_stats()
    print(f"   Total memories: {stats_mtm['total_memories']}")
    print(f"   Total patterns: {stats_mtm['total_patterns']}")
    print(f"   Average importance: {stats_mtm['average_importance']:.2f}")
    print(f"   Average emotional intensity: {stats_mtm['average_emotional_intensity']:.2f}")
    print(f"   Vector search size: {stats_mtm['vector_search_size']}")
    print(f"   Oldest memory age: {stats_mtm['oldest_memory_age_days']} days")
    print(f"   Newest memory age: {stats_mtm['newest_memory_age_hours']} hours")

    # Prepare consolidation to LTM
    print("\n9. Preparing consolidation to LTM...")
    consolidation: list[tuple[str, int, list[str]]] = consolidate_mtm_to_ltm(mtm)
    print(f"   Ready for consolidation: {len(consolidation)} pattern groups")
    for i, (fact_text, mention_count, memory_ids) in enumerate(consolidation, 1):
        print(f"   Group {i}: '{fact_text}' ({mention_count} mentions)")

    # Demonstrate memory retrieval
    print("\n10. Retrieving memory by ID...")
    if len(mtm.memories) > 0:
        memory_id: str = next(iter(mtm.memories.keys()))
        retrieved: Memory | None = mtm.get_memory(memory_id)
        if retrieved:
            print(f"   Retrieved: {retrieved.content}")
            print(f"   Accessed count: {retrieved.accessed_count}")
            print(f"   Last accessed: {retrieved.last_accessed}")

    print("\n" + "=" * 60)
    print("Demo complete!")
    print("=" * 60)


if __name__ == "__main__":
    from datetime import timedelta

    main()

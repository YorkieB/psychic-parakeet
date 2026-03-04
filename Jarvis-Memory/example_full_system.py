"""
Complete working example of Jarvis Memory System.

Demonstrates the full three-tier memory system: STM → MTM → LTM
with consolidation, deduplication, and querying.
"""

from datetime import timedelta

from jarvis_memory_system import JarvisMemorySystem


def main() -> None:
    """Run complete system demonstration."""
    print("=" * 70)
    print("Jarvis Complete Memory System - Full Demo")
    print("=" * 70)

    # Initialize system
    jarvis: JarvisMemorySystem = JarvisMemorySystem(
        stm_max_size=500,
        mtm_max_size=5000,
        ltm_max_size=100000,
    )

    print("\n1. Ingesting memories into STM...")
    # Ingest various memories
    jarvis.ingest(
        "I work at Google",
        emotion="neutral",
        context="work",
        importance_score=0.8,
    )
    jarvis.ingest(
        "I work at Google as a software engineer",
        emotion="joy",
        context="work",
        importance_score=0.85,
    )
    jarvis.ingest(
        "I've been at Google for 5 years",
        emotion="neutral",
        context="work",
        importance_score=0.75,
    )
    jarvis.ingest(
        "I work at Google",
        emotion="neutral",
        context="career",
        importance_score=0.8,
    )
    jarvis.ingest(
        "I love Python programming",
        emotion="joy",
        context="hobby",
        importance_score=0.7,
    )

    print(f"   Ingested {jarvis.stm.get_size()} memories to STM")

    # Show STM stats
    stm_stats: dict = jarvis.stm.get_stats()
    print(f"   STM: {stm_stats['total_memories']} memories")

    print("\n2. Making memories stale (simulating time passage)...")
    # Make memories stale for consolidation
    for mem in jarvis.stm.retrieve_all():
        mem.created_at = jarvis.stm._session_start - timedelta(hours=2)

    print("   Memories are now stale (>1 hour old)")

    print("\n3. Running full consolidation pipeline (STM -> MTM -> LTM)...")
    # Run consolidation
    consolidation_stats: dict[str, int] = jarvis.consolidate()

    print(f"   STM -> MTM: Moved {consolidation_stats['stm_to_mtm_moved']} memories")
    print(
        f"   STM -> MTM: Discarded {consolidation_stats['stm_to_mtm_discarded']} low-importance memories"
    )
    print(f"   Patterns detected: {consolidation_stats['patterns_detected']}")
    print(
        f"   Patterns consolidated to LTM: {consolidation_stats['patterns_consolidated']}"
    )
    print(f"   LTM deduplication: Merged {consolidation_stats['ltm_dedup_merged']} facts")
    print(f"   MTM cleaned: {consolidation_stats['mtm_cleaned']} stale memories removed")
    print(f"   LTM total facts: {consolidation_stats['ltm_total']}")

    # Show system stats
    print("\n4. System Statistics:")
    system_stats: dict = jarvis.get_system_stats()
    print(f"   STM: {system_stats['stm_stats']['total_memories']} memories")
    print(f"   MTM: {system_stats['mtm_stats']['total_memories']} memories")
    print(f"   LTM: {system_stats['ltm_stats']['total_facts']} facts")
    print(f"   Total: {system_stats['total_memories']} memories across all tiers")

    print("\n5. Querying system for 'Google'...")
    # Query system
    query_results: list = jarvis.query("Google", top_k=5)

    print(f"   Found {len(query_results)} results:")
    for i, mem in enumerate(query_results, 1):
        tier_str: str = mem.tier.value if hasattr(mem.tier, "value") else str(mem.tier)
        print(
            f"   {i}. [{tier_str}] {mem.content} (importance: {mem.importance_score:.2f})"
        )

    print("\n6. Querying system for 'Python'...")
    python_results: list = jarvis.query("Python", top_k=5)

    print(f"   Found {len(python_results)} results:")
    for i, mem in enumerate(python_results, 1):
        tier_str: str = mem.tier.value if hasattr(mem.tier, "value") else str(mem.tier)
        print(
            f"   {i}. [{tier_str}] {mem.content} (importance: {mem.importance_score:.2f})"
        )

    print("\n7. LTM Statistics:")
    ltm_stats: dict = jarvis.ltm.get_stats()
    print(f"   Total facts: {ltm_stats['total_facts']}")
    print(f"   Average confidence: {ltm_stats['average_confidence']:.2f}")
    print(f"   Average importance: {ltm_stats['average_importance']:.2f}")
    print(f"   Average mention count: {ltm_stats['average_mention_count']:.2f}")
    print(f"   Dedup ratio: {ltm_stats['dedup_ratio']:.2f}")

    print("\n8. Running second consolidation pass...")
    # Add more memories and consolidate again
    jarvis.ingest("I work at Google", importance_score=0.8)
    jarvis.ingest("I work at Google", importance_score=0.8)

    for mem in jarvis.stm.retrieve_all():
        mem.created_at = jarvis.stm._session_start - timedelta(hours=2)

    stats2: dict[str, int] = jarvis.consolidate()
    print(f"   Second pass: {stats2['patterns_consolidated']} patterns consolidated")
    print(f"   LTM now has {stats2['ltm_total']} facts")

    print("\n9. Demonstrating deduplication...")
    # Add duplicate facts directly to LTM
    for i in range(3):
        from memory import Memory

        fact: Memory = Memory(
            content="I work at Google",
            confidence=0.8,
            importance_score=0.7,
        )
        jarvis.ltm.add(fact)

    facts_before: int = len(jarvis.ltm.facts)
    print(f"   Facts before dedup: {facts_before}")

    dedup_stats: dict[str, int] = jarvis.ltm.deduplication_pass()
    facts_after: int = len(jarvis.ltm.facts)

    print(f"   Duplicates found: {dedup_stats['duplicates_found']}")
    print(f"   Facts merged: {dedup_stats['merged_count']}")
    print(f"   Facts after dedup: {facts_after}")
    print(f"   Reduction: {facts_before - facts_after} facts removed")

    print("\n" + "=" * 70)
    print("Demo complete! Jarvis memory system is fully operational.")
    print("=" * 70)


if __name__ == "__main__":
    main()

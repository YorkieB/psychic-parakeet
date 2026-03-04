"""
Example usage of Phase 6A: Real-Time Consolidation.

Demonstrates RealtimeJarvis with automatic consolidation and callbacks.
"""

from realtime_jarvis import RealtimeJarvis


def consolidation_callback(fact_text: str, mention_count: int, memory_ids: list[str]) -> None:
    """Callback function for consolidation events."""
    print(f"  [CALLBACK] Consolidated: '{fact_text}' ({mention_count} mentions)")
    print(f"  [CALLBACK] Memory IDs: {len(memory_ids)} memories")


def main() -> None:
    """Run real-time consolidation demonstration."""
    print("=" * 70)
    print("Phase 6A: Real-Time Consolidation Demo")
    print("=" * 70)

    # Initialize RealtimeJarvis
    jarvis: RealtimeJarvis = RealtimeJarvis()

    # Register consolidation callback
    jarvis.register_consolidation_callback(consolidation_callback)

    print("\n1. Ingesting memories with auto-consolidation enabled...")
    jarvis.ingest("I work at Google", emotion="neutral", context="work", importance_score=0.8)
    jarvis.ingest("I work at Google", emotion="joy", context="career", importance_score=0.85)
    jarvis.ingest("I work at Google", emotion="neutral", context="work", importance_score=0.8)

    print(f"   Ingested {jarvis.stm.get_size()} memories to STM")

    # Move to MTM to enable pattern detection
    print("\n2. Moving memories to MTM for pattern detection...")
    from datetime import timedelta
    from integration_stm_to_mtm import stm_to_mtm

    for mem in jarvis.stm.retrieve_all():
        mem.created_at = jarvis.stm._session_start - timedelta(hours=2)

    stm_to_mtm(jarvis.stm, jarvis.mtm, jarvis.embedding_generator)
    print(f"   MTM now has {len(jarvis.mtm.memories)} memories")

    # Ingest another similar memory - should trigger consolidation
    print("\n3. Ingesting another similar memory (should trigger consolidation)...")
    jarvis.ingest("I work at Google", emotion="neutral", context="work", importance_score=0.8)

    # Check consolidation stats
    print("\n4. Consolidation Statistics:")
    stats: dict = jarvis.get_consolidation_stats()
    print(f"   Total auto-consolidations: {stats['total_auto_consolidations']}")
    print(f"   Patterns detected: {stats['patterns_detected']}")
    print(f"   Facts consolidated: {stats['facts_consolidated']}")
    print(f"   Average mentions: {stats['avg_mentions']:.2f}")

    # Query system
    print("\n5. Querying system for 'Google'...")
    results: list = jarvis.query("Google", top_k=5)
    print(f"   Found {len(results)} results:")
    for i, mem in enumerate(results, 1):
        tier_str: str = mem.tier.value if hasattr(mem.tier, "value") else str(mem.tier)
        print(f"   {i}. [{tier_str}] {mem.content}")

    # Test disabling auto-consolidation
    print("\n6. Testing with auto-consolidation disabled...")
    jarvis.ingest(
        "Test memory", auto_consolidate=False, importance_score=0.7
    )
    print("   Memory ingested without auto-consolidation")

    # System stats
    print("\n7. System Statistics:")
    system_stats: dict = jarvis.get_system_stats()
    print(f"   STM: {system_stats['stm_stats']['total_memories']} memories")
    print(f"   MTM: {system_stats['mtm_stats']['total_memories']} memories")
    print(f"   LTM: {system_stats['ltm_stats']['total_facts']} facts")

    print("\n" + "=" * 70)
    print("Real-time consolidation demo complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()

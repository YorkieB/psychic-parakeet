"""
Example usage of Knowledge Graph feature.

Demonstrates semantic knowledge graph with relationship tracking.
"""

import tempfile

from knowledge_graph import RelationType
from knowledge_graph_jarvis import KnowledgeGraphJarvis


def main() -> None:
    """Run knowledge graph demonstration."""
    print("=" * 70)
    print("Feature 1: Knowledge Graph Demo")
    print("=" * 70)

    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: KnowledgeGraphJarvis = KnowledgeGraphJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        print("\n1. Ingesting facts...")
        mem1 = jarvis.ingest("I work at Google", importance_score=0.8)
        mem2 = jarvis.ingest("Google is a tech company", importance_score=0.8)
        mem3 = jarvis.ingest("I use Python for programming", importance_score=0.7)

        print(f"   Ingested {len(jarvis.graph.fact_nodes)} facts")

        print("\n2. Adding relationships...")
        jarvis.relate(mem1.id, mem2.id, RelationType.RELATED_TO, confidence=0.9)
        jarvis.relate(mem1.id, mem3.id, RelationType.RELATED_TO, confidence=0.7)

        print(f"   Added relationships")

        print("\n3. Finding related facts...")
        related = jarvis.get_related(mem1.id, depth=1)

        print(f"   Found {len(related)} related facts:")
        for i, mem in enumerate(related, 1):
            print(f"   {i}. {mem.content}")

        print("\n4. Finding path between facts...")
        path = jarvis.find_path(mem1.id, mem2.id)

        if path:
            print(f"   Path found ({len(path)} facts):")
            for i, mem in enumerate(path, 1):
                print(f"   {i}. {mem.content}")
        else:
            print("   No path found")

        print("\n5. Knowledge Graph Statistics:")
        stats = jarvis.get_graph_stats()
        print(f"   Total facts: {stats['total_facts']}")
        print(f"   Total relationships: {stats['total_relationships']}")
        print(f"   Average relationships per fact: {stats['average_relationships_per_fact']:.2f}")

        print("\n" + "=" * 70)
        print("Knowledge Graph demo complete!")
        print("=" * 70)


if __name__ == "__main__":
    main()

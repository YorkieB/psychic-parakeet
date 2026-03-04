"""
Complete example of Jarvis v3.0 with all 6 advanced features.

Demonstrates the omni-system with all Phase 7 features.
"""

import tempfile

from fulltext_jarvis import FullTextJarvis
from knowledge_graph import RelationType
from knowledge_graph_jarvis import KnowledgeGraphJarvis
from multimodal_jarvis import MultimodalJarvis
from multi_user_jarvis import MultiUserJarvis
from reranking_jarvis import ReRankingJarvis
from sqlite_jarvis import SQLiteJarvis


def main() -> None:
    """Run complete v3.0 demonstration."""
    print("=" * 70)
    print("Jarvis v3.0 Omni-System - Complete Demo")
    print("=" * 70)

    with tempfile.TemporaryDirectory() as tmpdir:
        print("\n=== Feature 1: Knowledge Graph ===")
        kg_jarvis: KnowledgeGraphJarvis = KnowledgeGraphJarvis(
            storage_dir=tmpdir + "/kg", auto_load=False, auto_save=False
        )
        mem1 = kg_jarvis.ingest("I work at Google", importance_score=0.8)
        mem2 = kg_jarvis.ingest("Google is a tech company", importance_score=0.8)
        kg_jarvis.relate(mem1.id, mem2.id, RelationType.RELATED_TO)
        print(f"   Knowledge Graph: {kg_jarvis.get_graph_stats()['total_facts']} facts")

        print("\n=== Feature 2: Multi-User ===")
        multi_jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir + "/multi")
        multi_jarvis.create_user("user1")
        multi_jarvis.ingest("user1", "User 1 memory", importance_score=0.8)
        print(f"   Multi-User: {len(multi_jarvis.users)} users")

        print("\n=== Feature 3: Multi-Modal ===")
        mm_jarvis: MultimodalJarvis = MultimodalJarvis(
            storage_dir=tmpdir + "/mm", auto_load=False, auto_save=False
        )
        mm_jarvis.ingest_multimodal("Multimodal memory")
        print(f"   Multi-Modal: {mm_jarvis.stm.get_size()} memories")

        print("\n=== Feature 4: Full-Text Search ===")
        ft_jarvis: FullTextJarvis = FullTextJarvis(
            storage_dir=tmpdir + "/ft", auto_load=False, auto_save=False
        )
        ft_jarvis.ingest("I work at Google", importance_score=0.8)
        results = ft_jarvis.full_text_search("Google", top_k=5)
        print(f"   Full-Text: Found {len(results)} results")

        print("\n=== Feature 5: LLM Reranking ===")
        rr_jarvis: ReRankingJarvis = ReRankingJarvis(
            storage_dir=tmpdir + "/rr", auto_load=False, auto_save=False
        )
        rr_jarvis.ingest("I work at Google", importance_score=0.8)
        ranked = rr_jarvis.query("Google", top_k=5)
        print(f"   Reranking: {len(ranked)} reranked results")

        print("\n=== Feature 6: SQLite Backend ===")
        import tempfile as tf

        with tf.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            db_path: str = tmp.name

        try:
            sql_jarvis: SQLiteJarvis = SQLiteJarvis(
                db_path=db_path, auto_load=False, auto_save=False
            )
            sql_jarvis.ingest("SQLite memory", importance_score=0.8)
            stats = sql_jarvis.get_db_stats()
            print(f"   SQLite: {stats['total_memories']} memories")
        finally:
            from pathlib import Path

            Path(db_path).unlink(missing_ok=True)

        print("\n" + "=" * 70)
        print("Jarvis v3.0 Omni-System demo complete!")
        print("All 6 advanced features operational!")
        print("=" * 70)


if __name__ == "__main__":
    main()

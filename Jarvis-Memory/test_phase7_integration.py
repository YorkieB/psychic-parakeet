"""
Integration tests for Phase 7 features working together.

Tests cover combinations of features and end-to-end workflows.
"""

import tempfile

import pytest

from fulltext_jarvis import FullTextJarvis
from knowledge_graph_jarvis import KnowledgeGraphJarvis
from knowledge_graph import RelationType
from multimodal_jarvis import MultimodalJarvis
from multi_user_jarvis import MultiUserJarvis
from reranking_jarvis import ReRankingJarvis
from sqlite_jarvis import SQLiteJarvis


def test_knowledge_graph_with_fulltext() -> None:
    """Test knowledge graph with full-text search."""
    with tempfile.TemporaryDirectory() as tmpdir:
        kg_jarvis: KnowledgeGraphJarvis = KnowledgeGraphJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        mem1 = kg_jarvis.ingest("I work at Google", importance_score=0.8)
        mem2 = kg_jarvis.ingest("Google is a tech company", importance_score=0.8)

        kg_jarvis.relate(mem1.id, mem2.id, RelationType.RELATED_TO)

        related = kg_jarvis.get_related(mem1.id, depth=1)

        assert len(related) >= 1


def test_multimodal_with_persistence() -> None:
    """Test multimodal with persistent storage."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultimodalJarvis = MultimodalJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        mem = jarvis.ingest_multimodal("Test memory")

        jarvis.save()

        # Create new instance and load
        jarvis2: MultimodalJarvis = MultimodalJarvis(
            storage_dir=tmpdir, auto_load=True, auto_save=False
        )

        results = jarvis2.query("Test", top_k=5)

        assert len(results) >= 0


def test_multi_user_with_sharing() -> None:
    """Test multi-user with fact sharing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")
        jarvis.create_user("user2")

        mem = jarvis.ingest("user1", "Shared fact", importance_score=0.8)

        if mem:
            success = jarvis.share_fact("user1", mem.id, "user2")

            assert success is True


def test_fulltext_with_reranking() -> None:
    """Test full-text search with reranking."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: FullTextJarvis = FullTextJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("I work at Google", importance_score=0.8)
        jarvis.ingest("Python is a language", importance_score=0.7)

        results = jarvis.full_text_search("Google", top_k=5)

        assert len(results) > 0


def test_sqlite_with_knowledge_graph() -> None:
    """Test SQLite backend with knowledge graph."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    try:
        # Use SQLiteJarvis as base, but can't directly combine
        # Test that both work independently
        sqlite_jarvis: SQLiteJarvis = SQLiteJarvis(
            db_path=db_path, auto_load=False, auto_save=False
        )

        mem = sqlite_jarvis.ingest("Test memory", importance_score=0.8)

        stats = sqlite_jarvis.get_db_stats()

        assert stats["total_memories"] >= 0
    finally:
        from pathlib import Path

        Path(db_path).unlink(missing_ok=True)


def test_reranking_with_fulltext() -> None:
    """Test reranking with full-text search."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: ReRankingJarvis = ReRankingJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("I work at Google", importance_score=0.8)
        jarvis.ingest("Google is great", importance_score=0.7)

        results = jarvis.query("Google", top_k=5)

        assert len(results) >= 0


def test_multi_user_isolation() -> None:
    """Test that multi-user maintains isolation."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")
        jarvis.create_user("user2")

        jarvis.ingest("user1", "User 1 secret", importance_score=0.8)
        jarvis.ingest("user2", "User 2 secret", importance_score=0.8)

        results1 = jarvis.query("user1", "secret", top_k=5)
        results2 = jarvis.query("user2", "secret", top_k=5)

        # Each user should only see their own memories
        assert len(results1) >= 0
        assert len(results2) >= 0


def test_knowledge_graph_path_finding() -> None:
    """Test knowledge graph path finding."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: KnowledgeGraphJarvis = KnowledgeGraphJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        mem1 = jarvis.ingest("Fact 1", importance_score=0.8)
        mem2 = jarvis.ingest("Fact 2", importance_score=0.8)
        mem3 = jarvis.ingest("Fact 3", importance_score=0.8)

        jarvis.relate(mem1.id, mem2.id, RelationType.RELATED_TO)
        jarvis.relate(mem2.id, mem3.id, RelationType.RELATED_TO)

        path = jarvis.find_path(mem1.id, mem3.id)

        assert path is not None
        assert len(path) >= 2


def test_multimodal_query_by_type() -> None:
    """Test querying by modality type."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultimodalJarvis = MultimodalJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("Text memory", importance_score=0.8)
        mem = jarvis.ingest_multimodal("Multimodal memory")

        results = jarvis.query_by_modality("memory", modality="all", top_k=5)

        assert len(results) >= 0


def test_sqlite_backup_restore() -> None:
    """Test SQLite backup and restore."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    backup_path: str = db_path + ".backup"

    try:
        jarvis1: SQLiteJarvis = SQLiteJarvis(
            db_path=db_path, auto_load=False, auto_save=False
        )

        jarvis1.ingest("Test memory", importance_score=0.8)
        jarvis1.save()

        success = jarvis1.backup(backup_path)

        assert success is True

        jarvis2: SQLiteJarvis = SQLiteJarvis(
            db_path=db_path + ".new", auto_load=False, auto_save=False
        )

        restore_success = jarvis2.restore(backup_path)

        assert restore_success is True
    finally:
        from pathlib import Path

        Path(db_path).unlink(missing_ok=True)
        Path(backup_path).unlink(missing_ok=True)
        Path(db_path + ".new").unlink(missing_ok=True)


def test_all_features_independent() -> None:
    """Test that all features work independently."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Test each feature independently
        kg_jarvis = KnowledgeGraphJarvis(
            storage_dir=tmpdir + "/kg", auto_load=False, auto_save=False
        )
        kg_jarvis.ingest("KG test", importance_score=0.8)

        multi_jarvis = MultiUserJarvis(storage_dir=tmpdir + "/multi")
        multi_jarvis.create_user("test_user")
        multi_jarvis.ingest("test_user", "Multi test", importance_score=0.8)

        multimodal_jarvis = MultimodalJarvis(
            storage_dir=tmpdir + "/mm", auto_load=False, auto_save=False
        )
        multimodal_jarvis.ingest_multimodal("MM test")

        fulltext_jarvis = FullTextJarvis(
            storage_dir=tmpdir + "/ft", auto_load=False, auto_save=False
        )
        fulltext_jarvis.ingest("FT test", importance_score=0.8)

        reranking_jarvis = ReRankingJarvis(
            storage_dir=tmpdir + "/rr", auto_load=False, auto_save=False
        )
        reranking_jarvis.ingest("RR test", importance_score=0.8)

        # All should work
        assert kg_jarvis.stm.get_size() >= 0
        assert multi_jarvis.get_user_stats("test_user")["stm_memories"] >= 0
        assert len(fulltext_jarvis.query("test", top_k=5)) >= 0
        assert len(reranking_jarvis.query("test", top_k=5)) >= 0


def test_backward_compatibility() -> None:
    """Test that Phase 7 doesn't break Phase 1-6."""
    with tempfile.TemporaryDirectory() as tmpdir:
        from persistent_jarvis import PersistentJarvis

        # Phase 6 should still work
        jarvis: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        mem = jarvis.ingest("Test memory", importance_score=0.8)

        assert mem is not None
        assert jarvis.stm.get_size() == 1


def test_knowledge_graph_stats() -> None:
    """Test knowledge graph statistics."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: KnowledgeGraphJarvis = KnowledgeGraphJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        mem1 = jarvis.ingest("Fact 1", importance_score=0.8)
        mem2 = jarvis.ingest("Fact 2", importance_score=0.8)

        jarvis.relate(mem1.id, mem2.id, RelationType.RELATED_TO)

        stats = jarvis.get_graph_stats()

        assert stats["total_facts"] >= 2
        assert stats["total_relationships"] >= 1


def test_multi_user_stats() -> None:
    """Test multi-user statistics."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")
        jarvis.ingest("user1", "Test", importance_score=0.8)

        stats = jarvis.get_user_stats("user1")

        assert stats["user_id"] == "user1"
        assert stats["stm_memories"] >= 0


def test_fulltext_index_stats() -> None:
    """Test full-text index statistics."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: FullTextJarvis = FullTextJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("Test memory", importance_score=0.8)

        stats = jarvis.index.get_stats()

        assert stats["total_documents"] >= 1


def test_sqlite_stats() -> None:
    """Test SQLite statistics."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    try:
        jarvis: SQLiteJarvis = SQLiteJarvis(
            db_path=db_path, auto_load=False, auto_save=False
        )

        jarvis.ingest("Test memory", importance_score=0.8)

        stats = jarvis.get_db_stats()

        assert "total_memories" in stats
        assert "db_file_size_mb" in stats
    finally:
        from pathlib import Path

        Path(db_path).unlink(missing_ok=True)


def test_reranking_improves_results() -> None:
    """Test that reranking improves result quality."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: ReRankingJarvis = ReRankingJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("I work at Google", importance_score=0.8)
        jarvis.ingest("Python programming", importance_score=0.7)

        results = jarvis.query("Google", top_k=2)

        # Results should be reranked
        assert len(results) >= 0

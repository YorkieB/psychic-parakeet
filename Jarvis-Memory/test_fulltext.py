"""
Comprehensive test suite for Full-Text Search feature.

Tests cover InvertedIndex and FullTextJarvis functionality.
"""

import tempfile

import pytest

from fulltext_jarvis import FullTextJarvis
from inverted_index import InvertedIndex
from memory import Memory


def test_inverted_index_tokenize() -> None:
    """Test text tokenization."""
    index: InvertedIndex = InvertedIndex()

    tokens: list[str] = index.tokenize("The quick brown fox")

    assert "quick" in tokens
    assert "brown" in tokens
    assert "fox" in tokens
    assert "the" not in tokens  # Stop word


def test_inverted_index_index_document() -> None:
    """Test indexing document."""
    index: InvertedIndex = InvertedIndex()

    index.index_document("doc1", "The quick brown fox")

    assert "doc1" in index.documents
    assert "quick" in index.index
    assert "doc1" in index.index["quick"]


def test_inverted_index_search() -> None:
    """Test searching index."""
    index: InvertedIndex = InvertedIndex()

    index.index_document("doc1", "The quick brown fox")
    index.index_document("doc2", "The lazy dog")

    results: list[str] = index.search("quick brown")

    assert "doc1" in results


def test_inverted_index_phrase_search() -> None:
    """Test phrase search."""
    index: InvertedIndex = InvertedIndex()

    index.index_document("doc1", "The quick brown fox")
    index.index_document("doc2", "The lazy dog")

    results: list[str] = index.phrase_search("quick brown")

    assert "doc1" in results


def test_inverted_index_get_stats() -> None:
    """Test getting index statistics."""
    index: InvertedIndex = InvertedIndex()

    index.index_document("doc1", "The quick brown fox")
    index.index_document("doc2", "The lazy dog")

    stats: dict = index.get_stats()

    assert stats["total_documents"] == 2
    assert stats["total_terms"] > 0


def test_fulltext_jarvis_ingest() -> None:
    """Test ingesting memory with full-text indexing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: FullTextJarvis = FullTextJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        memory: Memory = jarvis.ingest("I work at Google", importance_score=0.8)

        assert memory.id in jarvis.corpus
        assert jarvis.corpus[memory.id] == "I work at Google"


def test_fulltext_jarvis_full_text_search() -> None:
    """Test full-text search."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: FullTextJarvis = FullTextJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("I work at Google", importance_score=0.8)
        jarvis.ingest("I love Python programming", importance_score=0.7)

        results: list[Memory] = jarvis.full_text_search("Google", top_k=5)

        assert len(results) > 0
        assert any("Google" in mem.content for mem in results)


def test_fulltext_jarvis_phrase_search() -> None:
    """Test phrase search."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: FullTextJarvis = FullTextJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("I work at Google", importance_score=0.8)

        results: list[Memory] = jarvis.phrase_search("work at Google", top_k=5)

        assert len(results) > 0


def test_fulltext_jarvis_search_empty() -> None:
    """Test search on empty index."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: FullTextJarvis = FullTextJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        results: list[Memory] = jarvis.full_text_search("test", top_k=5)

        assert len(results) == 0


def test_fulltext_jarvis_stop_words() -> None:
    """Test that stop words are filtered."""
    index: InvertedIndex = InvertedIndex()

    index.index_document("doc1", "The quick brown fox")

    # Stop words should not be in index
    assert "the" not in index.index or len(index.index.get("the", set())) == 0


def test_fulltext_jarvis_multiple_terms() -> None:
    """Test search with multiple terms."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: FullTextJarvis = FullTextJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("Python programming language", importance_score=0.8)
        jarvis.ingest("Java programming language", importance_score=0.7)

        results: list[Memory] = jarvis.full_text_search("Python programming", top_k=5)

        assert len(results) > 0


def test_fulltext_jarvis_case_insensitive() -> None:
    """Test case-insensitive search."""
    index: InvertedIndex = InvertedIndex()

    index.index_document("doc1", "The Quick Brown Fox")

    results: list[str] = index.search("quick")

    assert "doc1" in results


def test_fulltext_jarvis_inherits_persistent() -> None:
    """Test that FullTextJarvis inherits from PersistentJarvis."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: FullTextJarvis = FullTextJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        assert hasattr(jarvis, "save")
        assert hasattr(jarvis, "load")


def test_inverted_index_empty_query() -> None:
    """Test search with empty query."""
    index: InvertedIndex = InvertedIndex()

    index.index_document("doc1", "Test document")

    results: list[str] = index.search("")

    assert len(results) == 0


def test_inverted_index_no_match() -> None:
    """Test search with no matching documents."""
    index: InvertedIndex = InvertedIndex()

    index.index_document("doc1", "The quick brown fox")

    results: list[str] = index.search("zebra")

    assert len(results) == 0


def test_fulltext_jarvis_index_stats() -> None:
    """Test index statistics."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: FullTextJarvis = FullTextJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("Test memory 1", importance_score=0.8)
        jarvis.ingest("Test memory 2", importance_score=0.7)

        stats: dict = jarvis.index.get_stats()

        assert stats["total_documents"] == 2


def test_fulltext_jarvis_phrase_not_found() -> None:
    """Test phrase search when phrase not found."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: FullTextJarvis = FullTextJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("I work at Google", importance_score=0.8)

        results: list[Memory] = jarvis.phrase_search("nonexistent phrase", top_k=5)

        assert len(results) == 0

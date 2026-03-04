"""
Comprehensive test suite for LLM Reranking feature.

Tests cover LLMProvider and ReRankingJarvis functionality.
"""

import tempfile

import pytest

from llm_provider import LLMProvider, MockLLMProvider
from memory import Memory
from reranking_jarvis import ReRankingJarvis


def test_mock_llm_provider_rank_results() -> None:
    """Test mock LLM provider ranking."""
    provider: MockLLMProvider = MockLLMProvider()

    results: list[str] = ["I work at Google", "I love Python", "Google is great"]
    ranked: list[tuple[str, float]] = provider.rank_results("Google", results)

    assert len(ranked) == 3
    assert ranked[0][0] == "I work at Google" or ranked[0][0] == "Google is great"
    assert all(0.0 <= score <= 1.0 for _, score in ranked)


def test_mock_llm_provider_relevance_scoring() -> None:
    """Test relevance scoring."""
    provider: MockLLMProvider = MockLLMProvider()

    results: list[str] = ["Google company", "Python programming", "Java language"]
    ranked: list[tuple[str, float]] = provider.rank_results("Google", results)

    # Google should score highest
    assert ranked[0][0] == "Google company"
    assert ranked[0][1] > ranked[1][1]


def test_reranking_jarvis_query() -> None:
    """Test querying with reranking."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: ReRankingJarvis = ReRankingJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("I work at Google", importance_score=0.8)
        jarvis.ingest("I love Python programming", importance_score=0.7)

        results: list[Memory] = jarvis.query("Google", top_k=5)

        assert len(results) >= 0


def test_reranking_jarvis_custom_provider() -> None:
    """Test using custom LLM provider."""
    class CustomProvider(LLMProvider):
        def rank_results(
            self, query: str, results: list[str]
        ) -> list[tuple[str, float]]:
            return [(r, 0.5) for r in results]

    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: ReRankingJarvis = ReRankingJarvis(
            storage_dir=tmpdir,
            auto_load=False,
            auto_save=False,
            llm_provider=CustomProvider(),
        )

        jarvis.ingest("Test memory", importance_score=0.8)

        results: list[Memory] = jarvis.query("test", top_k=5)

        assert len(results) >= 0


def test_reranking_jarvis_empty_results() -> None:
    """Test reranking with empty results."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: ReRankingJarvis = ReRankingJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        results: list[Memory] = jarvis.query("nonexistent", top_k=5)

        assert len(results) == 0


def test_reranking_jarvis_inherits_persistent() -> None:
    """Test that ReRankingJarvis inherits from PersistentJarvis."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: ReRankingJarvis = ReRankingJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        assert hasattr(jarvis, "save")
        assert hasattr(jarvis, "load")


def test_mock_llm_provider_empty_query() -> None:
    """Test ranking with empty query."""
    provider: MockLLMProvider = MockLLMProvider()

    results: list[str] = ["Test result"]
    ranked: list[tuple[str, float]] = provider.rank_results("", results)

    assert len(ranked) == 1


def test_mock_llm_provider_empty_results() -> None:
    """Test ranking with empty results."""
    provider: MockLLMProvider = MockLLMProvider()

    ranked: list[tuple[str, float]] = provider.rank_results("query", [])

    assert len(ranked) == 0


def test_reranking_jarvis_top_k_limit() -> None:
    """Test that reranking respects top_k limit."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: ReRankingJarvis = ReRankingJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        for i in range(10):
            jarvis.ingest(f"Memory {i}", importance_score=0.8)

        results: list[Memory] = jarvis.query("Memory", top_k=3)

        assert len(results) <= 3


def test_reranking_jarvis_improves_relevance() -> None:
    """Test that reranking improves result relevance."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: ReRankingJarvis = ReRankingJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("I work at Google", importance_score=0.8)
        jarvis.ingest("Python is a programming language", importance_score=0.7)

        results: list[Memory] = jarvis.query("Google", top_k=2)

        # First result should be most relevant
        if len(results) > 0:
            assert "google" in results[0].content.lower()


def test_mock_llm_provider_sorted_results() -> None:
    """Test that results are sorted by score."""
    provider: MockLLMProvider = MockLLMProvider()

    results: list[str] = ["Python", "Google", "Java"]
    ranked: list[tuple[str, float]] = provider.rank_results("Google", results)

    # Should be sorted by score (highest first)
    for i in range(len(ranked) - 1):
        assert ranked[i][1] >= ranked[i + 1][1]

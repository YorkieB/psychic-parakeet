"""
LLM provider interface for result reranking.

This module provides abstract LLM provider interface and mock
implementation for testing reranking functionality.
"""

from abc import ABC, abstractmethod
from typing import List, Tuple


class LLMProvider(ABC):
    """
    Abstract LLM provider for result reranking.

    All LLM providers must implement the rank_results method.
    """

    @abstractmethod
    def rank_results(
        self, query: str, results: List[str]
    ) -> List[Tuple[str, float]]:
        """
        Rank results by relevance to query.

        Args:
            query: Search query text
            results: List of result texts to rank

        Returns:
            List of tuples (result_text, relevance_score) sorted by score (highest first)
        """
        pass


class MockLLMProvider(LLMProvider):
    """
    Mock LLM provider for testing.

    Provides simple word-overlap based scoring without requiring
    actual LLM API access.
    """

    def rank_results(
        self, query: str, results: List[str]
    ) -> List[Tuple[str, float]]:
        """
        Simple mock scoring based on word overlap.

        Args:
            query: Search query text
            results: List of result texts to rank

        Returns:
            List of tuples (result_text, relevance_score) sorted by score
        """
        query_words: set[str] = set(query.lower().split())
        scores: List[Tuple[str, float]] = []

        for result in results:
            result_words: set[str] = set(result.lower().split())
            overlap: int = len(query_words & result_words)
            total_words: int = max(len(query_words), len(result_words), 1)
            score: float = overlap / total_words
            scores.append((result, score))

        # Sort by score (highest first)
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores

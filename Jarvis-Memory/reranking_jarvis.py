"""
LLM-based reranking extension for Jarvis.

This module provides ReRankingJarvis class that uses LLM providers
to rerank search results for improved relevance.
"""

from typing import List, Optional, Tuple

from llm_provider import LLMProvider, MockLLMProvider
from memory import Memory
from persistent_jarvis import PersistentJarvis


class ReRankingJarvis(PersistentJarvis):
    """
    Jarvis with LLM-based result reranking.

    Extends PersistentJarvis to add automatic reranking of search
    results using an LLM provider for improved relevance.

    Attributes:
        llm: LLMProvider instance for reranking
    """

    def __init__(
        self,
        storage_dir: str = "./jarvis_data",
        auto_load: bool = True,
        auto_save: bool = True,
        llm_provider: Optional[LLMProvider] = None,
    ) -> None:
        """
        Initialize ReRankingJarvis.

        Args:
            storage_dir: Directory for storage (default: "./jarvis_data")
            auto_load: Whether to load on initialization (default: True)
            auto_save: Whether to enable auto-save (default: True)
            llm_provider: LLM provider instance (default: MockLLMProvider)
        """
        super().__init__(storage_dir=storage_dir, auto_load=auto_load, auto_save=auto_save)
        self.llm: LLMProvider = llm_provider or MockLLMProvider()

    def query(self, query: str, top_k: int = 5) -> List[Memory]:
        """
        Query with automatic reranking.

        Gets initial results, then reranks them using LLM provider
        for improved relevance.

        Args:
            query: Search query text
            top_k: Maximum number of results to return

        Returns:
            List of Memory objects, reranked by relevance
        """
        # Get initial results (more than needed for reranking)
        results: List[Memory] = super().query(query, top_k=top_k * 2)

        if not results:
            return []

        # Rerank with LLM
        result_texts: List[str] = [r.content for r in results]
        ranked: List[Tuple[str, float]] = self.llm.rank_results(query, result_texts)

        # Return top K reranked results
        ranked_results: List[Memory] = []
        seen_texts: set[str] = set()

        for text, score in ranked[:top_k]:
            if text in seen_texts:
                continue

            for result in results:
                if result.content == text and result.id not in [r.id for r in ranked_results]:
                    ranked_results.append(result)
                    seen_texts.add(text)
                    break

        return ranked_results

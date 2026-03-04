"""
Full-text search extension for Jarvis.

This module provides FullTextJarvis class that adds full-text
search capabilities using an inverted index.
"""

from typing import List, Optional

from inverted_index import InvertedIndex
from memory import Memory
from persistent_jarvis import PersistentJarvis


class FullTextJarvis(PersistentJarvis):
    """
    Jarvis with full-text search capabilities.

    Extends PersistentJarvis to add inverted index for efficient
    full-text search over all memories.

    Attributes:
        index: InvertedIndex instance for full-text search
        corpus: Dictionary mapping memory_id to text content
    """

    def __init__(
        self, storage_dir: str = "./jarvis_data", auto_load: bool = True, auto_save: bool = True
    ) -> None:
        """
        Initialize FullTextJarvis.

        Args:
            storage_dir: Directory for storage (default: "./jarvis_data")
            auto_load: Whether to load on initialization (default: True)
            auto_save: Whether to enable auto-save (default: True)
        """
        super().__init__(storage_dir=storage_dir, auto_load=auto_load, auto_save=auto_save)
        self.index: InvertedIndex = InvertedIndex()
        self.corpus: dict[str, str] = {}

    def ingest(
        self,
        text: str,
        emotion: Optional[str] = None,
        context: Optional[str] = None,
        embedding: Optional[List[float]] = None,
        importance_score: Optional[float] = None,
        save_immediately: bool = False,
    ) -> Memory:
        """
        Ingest memory and index for full-text search.

        Args:
            text: Memory content text
            emotion: Source emotion
            context: Source context
            save_immediately: Whether to save immediately

        Returns:
            Memory object that was added
        """
        memory: Memory = super().ingest(
            text=text,
            emotion=emotion,
            context=context,
            embedding=embedding,
            importance_score=importance_score,
            save_immediately=save_immediately,
        )

        # Index for full-text search
        self.index.index_document(memory.id, text)
        self.corpus[memory.id] = text

        return memory

    def full_text_search(self, query: str, top_k: int = 5) -> List[Memory]:
        """
        Search memories using full-text index.

        Args:
            query: Search query text
            top_k: Maximum number of results

        Returns:
            List of Memory objects matching the query
        """
        doc_ids: List[str] = self.index.search(query)
        results: List[Memory] = []

        for doc_id in doc_ids:
            mem: Optional[Memory] = self.stm.get_by_id(doc_id)
            if not mem:
                mem = self.mtm.get_memory(doc_id)
            if mem:
                results.append(mem)

        return results[:top_k]

    def phrase_search(self, phrase: str, top_k: int = 5) -> List[Memory]:
        """
        Search for exact phrase.

        Args:
            phrase: Exact phrase to search for
            top_k: Maximum number of results

        Returns:
            List of Memory objects containing the phrase
        """
        doc_ids: List[str] = self.index.phrase_search(phrase)
        results: List[Memory] = []

        for doc_id in doc_ids:
            mem: Optional[Memory] = self.stm.get_by_id(doc_id)
            if not mem:
                mem = self.mtm.get_memory(doc_id)
            if mem:
                results.append(mem)

        return results[:top_k]

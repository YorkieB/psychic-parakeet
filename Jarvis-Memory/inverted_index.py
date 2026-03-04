"""
Inverted index for full-text search.

This module provides InvertedIndex class for efficient full-text
search over document collections.
"""

import re
from collections import defaultdict
from typing import Dict, List, Optional, Set


class InvertedIndex:
    """
    Inverted index for full-text search.

    Maintains an inverted index mapping words to document IDs
    for efficient text search operations.

    Attributes:
        index: Dictionary mapping word to set of document IDs
        documents: Dictionary mapping document ID to document text
        stop_words: Set of stop words to ignore during indexing
    """

    def __init__(self, stop_words: Optional[Set[str]] = None) -> None:
        """
        Initialize inverted index.

        Args:
            stop_words: Set of stop words to ignore (default: English stop words)
        """
        self.index: Dict[str, Set[str]] = defaultdict(set)
        self.documents: Dict[str, str] = {}
        self.stop_words: Set[str] = stop_words or self._default_stop_words()

    def _default_stop_words(self) -> Set[str]:
        """
        Get default English stop words.

        Returns:
            Set of common English stop words
        """
        return {
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
            "from",
            "as",
            "is",
            "was",
            "are",
            "were",
            "be",
            "been",
            "being",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "should",
            "could",
            "may",
            "might",
            "must",
            "can",
        }

    def tokenize(self, text: str) -> List[str]:
        """
        Tokenize text into words.

        Converts to lowercase and removes stop words.

        Args:
            text: Text to tokenize

        Returns:
            List of tokenized words
        """
        words: List[str] = re.findall(r"\w+", text.lower())
        return [w for w in words if w not in self.stop_words]

    def index_document(self, doc_id: str, text: str) -> None:
        """
        Index document for search.

        Args:
            doc_id: Unique identifier for the document
            text: Document text content
        """
        self.documents[doc_id] = text
        tokens: List[str] = self.tokenize(text)

        for token in tokens:
            self.index[token].add(doc_id)

    def search(self, query: str) -> List[str]:
        """
        Search for documents containing all query terms.

        Args:
            query: Search query text

        Returns:
            List of document IDs matching the query
        """
        tokens: List[str] = self.tokenize(query)
        if not tokens:
            return []

        # Start with documents containing first token
        results: Set[str] = set(self.index.get(tokens[0], set()))

        # Intersect with documents containing other tokens
        for token in tokens[1:]:
            results &= self.index.get(token, set())

        return list(results)

    def phrase_search(self, phrase: str) -> List[str]:
        """
        Search for exact phrase.

        Args:
            phrase: Exact phrase to search for

        Returns:
            List of document IDs containing the phrase
        """
        results: List[str] = []
        phrase_lower: str = phrase.lower()

        for doc_id, text in self.documents.items():
            if phrase_lower in text.lower():
                results.append(doc_id)

        return results

    def get_stats(self) -> Dict:
        """
        Get index statistics.

        Returns:
            Dictionary containing:
                - total_documents: Number of indexed documents
                - total_terms: Number of unique terms
                - average_terms_per_doc: Average terms per document
        """
        total_terms: int = len(self.index)
        total_docs: int = len(self.documents)

        avg_terms: float = (
            sum(len(self.tokenize(text)) for text in self.documents.values())
            / total_docs
            if total_docs > 0
            else 0.0
        )

        return {
            "total_documents": total_docs,
            "total_terms": total_terms,
            "average_terms_per_doc": avg_terms,
        }

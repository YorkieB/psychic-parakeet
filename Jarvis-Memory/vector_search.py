"""
Vector similarity search module for Jarvis MTM system.

This module provides semantic similarity search using cosine similarity
for finding related memories based on vector embeddings.
"""

from typing import Dict, List, Optional, Tuple

import numpy as np


class VectorSearch:
    """
    Vector similarity search using cosine similarity.

    Provides efficient semantic search over vector embeddings with
    metadata storage and batch search capabilities.

    Attributes:
        embedding_dim: Dimension of embedding vectors
        similarity_threshold: Minimum similarity score to consider related
        _vectors: Dictionary mapping vector_id to embedding vector
        _metadata: Dictionary mapping vector_id to metadata dict
    """

    def __init__(
        self, embedding_dim: int = 384, similarity_threshold: float = 0.7
    ) -> None:
        """
        Initialize VectorSearch index.

        Args:
            embedding_dim: Dimension of embedding vectors (default: 384)
            similarity_threshold: Minimum similarity to consider related (default: 0.7)
        """
        self.embedding_dim: int = embedding_dim
        self.similarity_threshold: float = similarity_threshold
        self._vectors: Dict[str, np.ndarray] = {}
        self._metadata: Dict[str, Dict] = {}

    def add(
        self, vector_id: str, embedding: List[float], metadata: Optional[Dict] = None
    ) -> None:
        """
        Add vector to search index.

        Args:
            vector_id: Unique identifier for the vector
            embedding: List of floats representing the embedding
            metadata: Optional metadata dictionary to store with vector

        Raises:
            ValueError: If embedding dimension doesn't match expected dimension
        """
        if len(embedding) != self.embedding_dim:
            raise ValueError(
                f"Embedding dimension {len(embedding)} doesn't match "
                f"expected {self.embedding_dim}"
            )

        embedding_array: np.ndarray = np.array(embedding, dtype=np.float32)
        self._vectors[vector_id] = embedding_array
        self._metadata[vector_id] = metadata if metadata is not None else {}

    def search(
        self, query_embedding: List[float], top_k: int = 10
    ) -> List[Tuple[str, float, Dict]]:
        """
        Search for similar vectors using cosine similarity.

        Args:
            query_embedding: Query vector to search for
            top_k: Maximum number of results to return (default: 10)

        Returns:
            List of tuples (vector_id, similarity_score, metadata)
            sorted by similarity (highest first).
            Similarity scores range from 0.0 to 1.0 (1.0 = identical).

        Raises:
            ValueError: If query embedding dimension doesn't match
            ValueError: If index is empty
        """
        if len(self._vectors) == 0:
            return []

        if len(query_embedding) != self.embedding_dim:
            raise ValueError(
                f"Query embedding dimension {len(query_embedding)} doesn't match "
                f"expected {self.embedding_dim}"
            )

        query_array: np.ndarray = np.array(query_embedding, dtype=np.float32)
        query_norm: float = np.linalg.norm(query_array)
        if query_norm == 0:
            query_norm = 1.0

        # Calculate cosine similarity with each stored vector
        similarities: List[float] = []
        vector_ids: List[str] = list(self._vectors.keys())
        for vid in vector_ids:
            vector: np.ndarray = self._vectors[vid]
            vector_norm: float = np.linalg.norm(vector)
            if vector_norm == 0:
                similarity: float = 0.0
            else:
                dot_product: float = np.dot(query_array, vector)
                similarity = dot_product / (query_norm * vector_norm)
            similarities.append(similarity)

        # Create results with (vector_id, similarity, metadata)
        results: List[Tuple[str, float, Dict]] = [
            (vector_ids[i], float(sim), self._metadata[vector_ids[i]])
            for i, sim in enumerate(similarities)
        ]

        # Sort by similarity (descending) and take top_k
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

    def batch_search(
        self, query_embeddings: List[List[float]], top_k: int = 10
    ) -> List[List[Tuple[str, float, Dict]]]:
        """
        Search multiple queries efficiently.

        Args:
            query_embeddings: List of query vectors to search for
            top_k: Maximum number of results per query (default: 10)

        Returns:
            List of result lists, one per query.
            Each result list contains (vector_id, similarity_score, metadata) tuples.

        Raises:
            ValueError: If any query embedding dimension doesn't match
            ValueError: If index is empty
        """
        if len(self._vectors) == 0:
            return [[] for _ in query_embeddings]

        if not query_embeddings:
            return []

        # Validate all query dimensions
        for i, query in enumerate(query_embeddings):
            if len(query) != self.embedding_dim:
                raise ValueError(
                    f"Query {i} embedding dimension {len(query)} doesn't match "
                    f"expected {self.embedding_dim}"
                )

        # Convert stored vectors to list
        vector_ids: List[str] = list(self._vectors.keys())
        vectors_list: List[np.ndarray] = [
            self._vectors[vid] for vid in vector_ids
        ]

        # Process results for each query
        all_results: List[List[Tuple[str, float, Dict]]] = []
        for query_embedding in query_embeddings:
            query_array: np.ndarray = np.array(query_embedding, dtype=np.float32)
            query_norm: float = np.linalg.norm(query_array)
            if query_norm == 0:
                query_norm = 1.0

            # Calculate cosine similarity with each stored vector
            query_similarities: List[float] = []
            for vector in vectors_list:
                vector_norm: float = np.linalg.norm(vector)
                if vector_norm == 0:
                    similarity: float = 0.0
                else:
                    dot_product: float = np.dot(query_array, vector)
                    similarity = dot_product / (query_norm * vector_norm)
                query_similarities.append(similarity)
            results: List[Tuple[str, float, Dict]] = [
                (vector_ids[i], float(sim), self._metadata[vector_ids[i]])
                for i, sim in enumerate(query_similarities)
            ]
            results.sort(key=lambda x: x[1], reverse=True)
            all_results.append(results[:top_k])

        return all_results

    def remove(self, vector_id: str) -> bool:
        """
        Remove vector from search index.

        Args:
            vector_id: ID of vector to remove

        Returns:
            True if vector was removed, False if not found
        """
        if vector_id in self._vectors:
            del self._vectors[vector_id]
            if vector_id in self._metadata:
                del self._metadata[vector_id]
            return True
        return False

    def get_size(self) -> int:
        """
        Get number of vectors in index.

        Returns:
            Number of vectors currently stored
        """
        return len(self._vectors)

    def clear(self) -> None:
        """Clear all vectors from the search index."""
        self._vectors.clear()
        self._metadata.clear()

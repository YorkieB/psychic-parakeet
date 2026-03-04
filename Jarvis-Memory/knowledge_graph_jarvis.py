"""
Knowledge graph extension for Jarvis memory system.

This module provides KnowledgeGraphJarvis class that combines
persistent storage with semantic knowledge graph capabilities.
"""

from typing import Dict, List, Optional

from knowledge_graph import KnowledgeGraph, RelationType
from memory import Memory
from persistent_jarvis import PersistentJarvis


class KnowledgeGraphJarvis(PersistentJarvis):
    """
    Jarvis with semantic knowledge graph.

    Extends PersistentJarvis to add knowledge graph functionality
    for tracking relationships between facts.

    Attributes:
        graph: KnowledgeGraph instance for relationship tracking
    """

    def __init__(
        self, storage_dir: str = "./jarvis_data", auto_load: bool = True, auto_save: bool = True
    ) -> None:
        """
        Initialize KnowledgeGraphJarvis.

        Args:
            storage_dir: Directory for storage (default: "./jarvis_data")
            auto_load: Whether to load on initialization (default: True)
            auto_save: Whether to enable auto-save (default: True)
        """
        super().__init__(storage_dir=storage_dir, auto_load=auto_load, auto_save=auto_save)
        self.graph: KnowledgeGraph = KnowledgeGraph()

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
        Ingest memory and add to knowledge graph.

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
        self.graph.add_fact(memory.id, memory)
        return memory

    def relate(
        self,
        source_id: str,
        target_id: str,
        relation_type: RelationType,
        confidence: float = 0.8,
    ) -> bool:
        """
        Add relationship between facts.

        Args:
            source_id: ID of source fact
            target_id: ID of target fact
            relation_type: Type of relationship
            confidence: Confidence score (default: 0.8)

        Returns:
            True if relationship added successfully, False otherwise
        """
        return self.graph.add_relationship(
            source_id, target_id, relation_type, confidence
        )

    def get_related(self, fact_id: str, depth: int = 1) -> List[Memory]:
        """
        Get facts related to given fact.

        Args:
            fact_id: ID of fact to find related facts for
            depth: Maximum depth to search (default: 1)

        Returns:
            List of related Memory objects
        """
        related_dict: Dict[str, Memory] = self.graph.find_related(fact_id, depth)
        return list(related_dict.values())

    def find_path(
        self, source_id: str, target_id: str
    ) -> Optional[List[Memory]]:
        """
        Find path between two facts.

        Args:
            source_id: ID of source fact
            target_id: ID of target fact

        Returns:
            List of Memory objects representing the path, or None if no path exists
        """
        path_ids: Optional[List[str]] = self.graph.find_path(source_id, target_id)
        if not path_ids:
            return None
        return [
            self.graph.fact_nodes[id]
            for id in path_ids
            if id in self.graph.fact_nodes
        ]

    def get_graph_stats(self) -> Dict:
        """
        Get knowledge graph statistics.

        Returns:
            Dictionary containing graph statistics
        """
        return self.graph.get_stats()

"""
Semantic knowledge graph for Jarvis memory system.

This module provides a knowledge graph structure for representing
relationships between facts and memories.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Set

from memory import Memory


class RelationType(Enum):
    """Types of relationships between facts."""

    CAUSE_EFFECT = "cause_effect"
    BEFORE_AFTER = "before_after"
    SIMILARITY = "similarity"
    PART_OF = "part_of"
    RELATED_TO = "related_to"
    CONTRARY = "contrary"
    PROPERTY = "property"


@dataclass
class Relationship:
    """
    Represents a relationship between two facts.

    Attributes:
        source_id: ID of source fact
        target_id: ID of target fact
        relation_type: Type of relationship
        confidence: Confidence score (0.0 to 1.0)
        context: Optional context for the relationship
    """

    source_id: str
    target_id: str
    relation_type: RelationType
    confidence: float
    context: Optional[str] = None


class KnowledgeGraph:
    """
    Semantic knowledge graph for fact relationships.

    Maintains a graph structure where nodes are facts (memories)
    and edges are relationships between facts.

    Attributes:
        relationships: Dictionary mapping fact_id to list of outgoing relationships
        reverse_relationships: Dictionary mapping fact_id to list of incoming relationships
        fact_nodes: Dictionary mapping fact_id to Memory objects
    """

    def __init__(self) -> None:
        """Initialize empty knowledge graph."""
        self.relationships: Dict[str, List[Relationship]] = {}
        self.reverse_relationships: Dict[str, List[Relationship]] = {}
        self.fact_nodes: Dict[str, Memory] = {}

    def add_fact(self, fact_id: str, fact: Memory) -> None:
        """
        Add fact node to graph.

        Args:
            fact_id: Unique identifier for the fact
            fact: Memory object representing the fact
        """
        self.fact_nodes[fact_id] = fact
        if fact_id not in self.relationships:
            self.relationships[fact_id] = []
        if fact_id not in self.reverse_relationships:
            self.reverse_relationships[fact_id] = []

    def add_relationship(
        self,
        source_id: str,
        target_id: str,
        relation_type: RelationType,
        confidence: float = 0.8,
        context: Optional[str] = None,
    ) -> bool:
        """
        Add relationship between two facts.

        Args:
            source_id: ID of source fact
            target_id: ID of target fact
            relation_type: Type of relationship
            confidence: Confidence score (0.0 to 1.0, default: 0.8)
            context: Optional context for the relationship

        Returns:
            True if relationship added successfully, False otherwise
        """
        try:
            rel: Relationship = Relationship(
                source_id, target_id, relation_type, confidence, context
            )

            if source_id not in self.relationships:
                self.relationships[source_id] = []
            self.relationships[source_id].append(rel)

            if target_id not in self.reverse_relationships:
                self.reverse_relationships[target_id] = []
            self.reverse_relationships[target_id].append(rel)

            return True
        except Exception as e:
            print(f"Error adding relationship: {e}")
            return False

    def get_relationships(self, fact_id: str) -> List[Relationship]:
        """
        Get all outgoing relationships from fact.

        Args:
            fact_id: ID of fact to get relationships for

        Returns:
            List of Relationship objects
        """
        return self.relationships.get(fact_id, [])

    def find_related(self, fact_id: str, depth: int = 1) -> Dict[str, Memory]:
        """
        Find all facts related to given fact.

        Uses breadth-first search to find related facts up to specified depth.

        Args:
            fact_id: ID of fact to find related facts for
            depth: Maximum depth to search (default: 1)

        Returns:
            Dictionary mapping fact_id to Memory objects
        """
        related: Dict[str, Memory] = {}
        visited: Set[str] = {fact_id}
        queue: List[tuple[str, int]] = [(fact_id, 0)]

        while queue:
            current_id, current_depth = queue.pop(0)

            if current_depth >= depth:
                continue

            for rel in self.relationships.get(current_id, []):
                target_id: str = rel.target_id
                if target_id not in visited:
                    visited.add(target_id)
                    if target_id in self.fact_nodes:
                        related[target_id] = self.fact_nodes[target_id]
                    queue.append((target_id, current_depth + 1))

        return related

    def find_path(
        self, source_id: str, target_id: str
    ) -> Optional[List[str]]:
        """
        Find shortest path between two facts using BFS.

        Args:
            source_id: ID of source fact
            target_id: ID of target fact

        Returns:
            List of fact IDs representing the path, or None if no path exists
        """
        if source_id == target_id:
            return [source_id]

        visited: Set[str] = {source_id}
        queue: List[tuple[str, List[str]]] = [(source_id, [source_id])]

        while queue:
            current_id, path = queue.pop(0)

            for rel in self.relationships.get(current_id, []):
                next_id: str = rel.target_id

                if next_id == target_id:
                    return path + [next_id]

                if next_id not in visited:
                    visited.add(next_id)
                    queue.append((next_id, path + [next_id]))

        return None

    def get_stats(self) -> Dict:
        """
        Get knowledge graph statistics.

        Returns:
            Dictionary containing:
                - total_facts: Number of fact nodes
                - total_relationships: Total number of relationships
                - average_relationships_per_fact: Average outgoing relationships
        """
        total_relationships: int = sum(
            len(rels) for rels in self.relationships.values()
        )
        total_facts: int = len(self.fact_nodes)

        avg_relationships: float = (
            total_relationships / total_facts if total_facts > 0 else 0.0
        )

        return {
            "total_facts": total_facts,
            "total_relationships": total_relationships,
            "average_relationships_per_fact": avg_relationships,
        }

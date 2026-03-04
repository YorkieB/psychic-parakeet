"""
Comprehensive test suite for Knowledge Graph feature.

Tests cover KnowledgeGraph and KnowledgeGraphJarvis functionality.
"""

import pytest

from knowledge_graph import KnowledgeGraph, RelationType, Relationship
from knowledge_graph_jarvis import KnowledgeGraphJarvis
from memory import Memory, MemoryTier


def test_knowledge_graph_add_fact() -> None:
    """Test adding fact to graph."""
    graph: KnowledgeGraph = KnowledgeGraph()

    mem: Memory = Memory(content="Test fact", tier=MemoryTier.LTM)
    graph.add_fact(mem.id, mem)

    assert mem.id in graph.fact_nodes
    assert graph.fact_nodes[mem.id].content == "Test fact"


def test_knowledge_graph_add_relationship() -> None:
    """Test adding relationship between facts."""
    graph: KnowledgeGraph = KnowledgeGraph()

    mem1: Memory = Memory(content="Fact 1", tier=MemoryTier.LTM)
    mem2: Memory = Memory(content="Fact 2", tier=MemoryTier.LTM)

    graph.add_fact(mem1.id, mem1)
    graph.add_fact(mem2.id, mem2)

    success: bool = graph.add_relationship(
        mem1.id, mem2.id, RelationType.RELATED_TO, confidence=0.8
    )

    assert success is True
    assert len(graph.get_relationships(mem1.id)) == 1


def test_knowledge_graph_get_relationships() -> None:
    """Test getting relationships for a fact."""
    graph: KnowledgeGraph = KnowledgeGraph()

    mem1: Memory = Memory(content="Fact 1", tier=MemoryTier.LTM)
    mem2: Memory = Memory(content="Fact 2", tier=MemoryTier.LTM)

    graph.add_fact(mem1.id, mem1)
    graph.add_fact(mem2.id, mem2)
    graph.add_relationship(mem1.id, mem2.id, RelationType.RELATED_TO)

    relationships: list[Relationship] = graph.get_relationships(mem1.id)

    assert len(relationships) == 1
    assert relationships[0].target_id == mem2.id


def test_knowledge_graph_find_related() -> None:
    """Test finding related facts."""
    graph: KnowledgeGraph = KnowledgeGraph()

    mem1: Memory = Memory(content="Fact 1", tier=MemoryTier.LTM)
    mem2: Memory = Memory(content="Fact 2", tier=MemoryTier.LTM)
    mem3: Memory = Memory(content="Fact 3", tier=MemoryTier.LTM)

    graph.add_fact(mem1.id, mem1)
    graph.add_fact(mem2.id, mem2)
    graph.add_fact(mem3.id, mem3)

    graph.add_relationship(mem1.id, mem2.id, RelationType.RELATED_TO)
    graph.add_relationship(mem2.id, mem3.id, RelationType.RELATED_TO)

    related: dict[str, Memory] = graph.find_related(mem1.id, depth=2)

    assert mem2.id in related
    assert mem3.id in related


def test_knowledge_graph_find_path() -> None:
    """Test finding path between facts."""
    graph: KnowledgeGraph = KnowledgeGraph()

    mem1: Memory = Memory(content="Fact 1", tier=MemoryTier.LTM)
    mem2: Memory = Memory(content="Fact 2", tier=MemoryTier.LTM)
    mem3: Memory = Memory(content="Fact 3", tier=MemoryTier.LTM)

    graph.add_fact(mem1.id, mem1)
    graph.add_fact(mem2.id, mem2)
    graph.add_fact(mem3.id, mem3)

    graph.add_relationship(mem1.id, mem2.id, RelationType.RELATED_TO)
    graph.add_relationship(mem2.id, mem3.id, RelationType.RELATED_TO)

    path: list[str] | None = graph.find_path(mem1.id, mem3.id)

    assert path is not None
    assert len(path) == 3
    assert path[0] == mem1.id
    assert path[-1] == mem3.id


def test_knowledge_graph_find_path_nonexistent() -> None:
    """Test finding path when no path exists."""
    graph: KnowledgeGraph = KnowledgeGraph()

    mem1: Memory = Memory(content="Fact 1", tier=MemoryTier.LTM)
    mem2: Memory = Memory(content="Fact 2", tier=MemoryTier.LTM)

    graph.add_fact(mem1.id, mem1)
    graph.add_fact(mem2.id, mem2)

    path: list[str] | None = graph.find_path(mem1.id, mem2.id)

    assert path is None


def test_knowledge_graph_get_stats() -> None:
    """Test getting graph statistics."""
    graph: KnowledgeGraph = KnowledgeGraph()

    mem1: Memory = Memory(content="Fact 1", tier=MemoryTier.LTM)
    mem2: Memory = Memory(content="Fact 2", tier=MemoryTier.LTM)

    graph.add_fact(mem1.id, mem1)
    graph.add_fact(mem2.id, mem2)
    graph.add_relationship(mem1.id, mem2.id, RelationType.RELATED_TO)

    stats: dict = graph.get_stats()

    assert stats["total_facts"] == 2
    assert stats["total_relationships"] == 1


def test_knowledge_graph_jarvis_ingest() -> None:
    """Test ingesting memory into knowledge graph jarvis."""
    jarvis: KnowledgeGraphJarvis = KnowledgeGraphJarvis(
        storage_dir="./test_kg_data", auto_load=False, auto_save=False
    )

    memory: Memory = jarvis.ingest("Test fact", importance_score=0.8)

    assert memory.id in jarvis.graph.fact_nodes


def test_knowledge_graph_jarvis_relate() -> None:
    """Test adding relationship in knowledge graph jarvis."""
    jarvis: KnowledgeGraphJarvis = KnowledgeGraphJarvis(
        storage_dir="./test_kg_data", auto_load=False, auto_save=False
    )

    mem1: Memory = jarvis.ingest("Fact 1", importance_score=0.8)
    mem2: Memory = jarvis.ingest("Fact 2", importance_score=0.8)

    success: bool = jarvis.relate(mem1.id, mem2.id, RelationType.RELATED_TO)

    assert success is True


def test_knowledge_graph_jarvis_get_related() -> None:
    """Test getting related facts."""
    jarvis: KnowledgeGraphJarvis = KnowledgeGraphJarvis(
        storage_dir="./test_kg_data", auto_load=False, auto_save=False
    )

    mem1: Memory = jarvis.ingest("Fact 1", importance_score=0.8)
    mem2: Memory = jarvis.ingest("Fact 2", importance_score=0.8)

    jarvis.relate(mem1.id, mem2.id, RelationType.RELATED_TO)

    related: list[Memory] = jarvis.get_related(mem1.id, depth=1)

    assert len(related) >= 1


def test_knowledge_graph_jarvis_find_path() -> None:
    """Test finding path between facts."""
    jarvis: KnowledgeGraphJarvis = KnowledgeGraphJarvis(
        storage_dir="./test_kg_data", auto_load=False, auto_save=False
    )

    mem1: Memory = jarvis.ingest("Fact 1", importance_score=0.8)
    mem2: Memory = jarvis.ingest("Fact 2", importance_score=0.8)
    mem3: Memory = jarvis.ingest("Fact 3", importance_score=0.8)

    jarvis.relate(mem1.id, mem2.id, RelationType.RELATED_TO)
    jarvis.relate(mem2.id, mem3.id, RelationType.RELATED_TO)

    path: list[Memory] | None = jarvis.find_path(mem1.id, mem3.id)

    assert path is not None
    assert len(path) >= 2


def test_knowledge_graph_jarvis_get_graph_stats() -> None:
    """Test getting graph statistics."""
    jarvis: KnowledgeGraphJarvis = KnowledgeGraphJarvis(
        storage_dir="./test_kg_data", auto_load=False, auto_save=False
    )

    jarvis.ingest("Fact 1", importance_score=0.8)
    jarvis.ingest("Fact 2", importance_score=0.8)

    stats: dict = jarvis.get_graph_stats()

    assert "total_facts" in stats
    assert "total_relationships" in stats


def test_knowledge_graph_multiple_relationships() -> None:
    """Test multiple relationships from one fact."""
    graph: KnowledgeGraph = KnowledgeGraph()

    mem1: Memory = Memory(content="Fact 1", tier=MemoryTier.LTM)
    mem2: Memory = Memory(content="Fact 2", tier=MemoryTier.LTM)
    mem3: Memory = Memory(content="Fact 3", tier=MemoryTier.LTM)

    graph.add_fact(mem1.id, mem1)
    graph.add_fact(mem2.id, mem2)
    graph.add_fact(mem3.id, mem3)

    graph.add_relationship(mem1.id, mem2.id, RelationType.RELATED_TO)
    graph.add_relationship(mem1.id, mem3.id, RelationType.CAUSE_EFFECT)

    relationships: list[Relationship] = graph.get_relationships(mem1.id)

    assert len(relationships) == 2


def test_knowledge_graph_relation_types() -> None:
    """Test different relation types."""
    graph: KnowledgeGraph = KnowledgeGraph()

    mem1: Memory = Memory(content="Fact 1", tier=MemoryTier.LTM)
    mem2: Memory = Memory(content="Fact 2", tier=MemoryTier.LTM)

    graph.add_fact(mem1.id, mem1)
    graph.add_fact(mem2.id, mem2)

    for rel_type in RelationType:
        graph.add_relationship(mem1.id, mem2.id, rel_type, confidence=0.8)

    relationships: list[Relationship] = graph.get_relationships(mem1.id)

    assert len(relationships) == len(RelationType)


def test_knowledge_graph_empty_graph() -> None:
    """Test operations on empty graph."""
    graph: KnowledgeGraph = KnowledgeGraph()

    relationships: list[Relationship] = graph.get_relationships("nonexistent")
    assert len(relationships) == 0

    related: dict[str, Memory] = graph.find_related("nonexistent")
    assert len(related) == 0

    stats: dict = graph.get_stats()
    assert stats["total_facts"] == 0


def test_knowledge_graph_self_relationship() -> None:
    """Test relationship to self."""
    graph: KnowledgeGraph = KnowledgeGraph()

    mem: Memory = Memory(content="Fact 1", tier=MemoryTier.LTM)
    graph.add_fact(mem.id, mem)

    path: list[str] | None = graph.find_path(mem.id, mem.id)
    assert path == [mem.id]


def test_knowledge_graph_depth_limit() -> None:
    """Test depth limit in find_related."""
    graph: KnowledgeGraph = KnowledgeGraph()

    mem1: Memory = Memory(content="Fact 1", tier=MemoryTier.LTM)
    mem2: Memory = Memory(content="Fact 2", tier=MemoryTier.LTM)
    mem3: Memory = Memory(content="Fact 3", tier=MemoryTier.LTM)

    graph.add_fact(mem1.id, mem1)
    graph.add_fact(mem2.id, mem2)
    graph.add_fact(mem3.id, mem3)

    graph.add_relationship(mem1.id, mem2.id, RelationType.RELATED_TO)
    graph.add_relationship(mem2.id, mem3.id, RelationType.RELATED_TO)

    related_depth1: dict[str, Memory] = graph.find_related(mem1.id, depth=1)
    related_depth2: dict[str, Memory] = graph.find_related(mem1.id, depth=2)

    assert mem2.id in related_depth1
    assert mem3.id not in related_depth1
    assert mem3.id in related_depth2


def test_knowledge_graph_confidence() -> None:
    """Test relationship confidence."""
    graph: KnowledgeGraph = KnowledgeGraph()

    mem1: Memory = Memory(content="Fact 1", tier=MemoryTier.LTM)
    mem2: Memory = Memory(content="Fact 2", tier=MemoryTier.LTM)

    graph.add_fact(mem1.id, mem1)
    graph.add_fact(mem2.id, mem2)

    graph.add_relationship(mem1.id, mem2.id, RelationType.RELATED_TO, confidence=0.9)

    relationships: list[Relationship] = graph.get_relationships(mem1.id)

    assert relationships[0].confidence == 0.9


def test_knowledge_graph_context() -> None:
    """Test relationship context."""
    graph: KnowledgeGraph = KnowledgeGraph()

    mem1: Memory = Memory(content="Fact 1", tier=MemoryTier.LTM)
    mem2: Memory = Memory(content="Fact 2", tier=MemoryTier.LTM)

    graph.add_fact(mem1.id, mem1)
    graph.add_fact(mem2.id, mem2)

    graph.add_relationship(
        mem1.id, mem2.id, RelationType.RELATED_TO, context="work"
    )

    relationships: list[Relationship] = graph.get_relationships(mem1.id)

    assert relationships[0].context == "work"


def test_knowledge_graph_jarvis_inherits_persistent() -> None:
    """Test that KnowledgeGraphJarvis inherits from PersistentJarvis."""
    jarvis: KnowledgeGraphJarvis = KnowledgeGraphJarvis(
        storage_dir="./test_kg_data", auto_load=False, auto_save=False
    )

    # Should have PersistentJarvis methods
    assert hasattr(jarvis, "save")
    assert hasattr(jarvis, "load")
    assert hasattr(jarvis, "backup")


def test_knowledge_graph_circular_relationships() -> None:
    """Test circular relationships."""
    graph: KnowledgeGraph = KnowledgeGraph()

    mem1: Memory = Memory(content="Fact 1", tier=MemoryTier.LTM)
    mem2: Memory = Memory(content="Fact 2", tier=MemoryTier.LTM)

    graph.add_fact(mem1.id, mem1)
    graph.add_fact(mem2.id, mem2)

    graph.add_relationship(mem1.id, mem2.id, RelationType.RELATED_TO)
    graph.add_relationship(mem2.id, mem1.id, RelationType.RELATED_TO)

    path: list[str] | None = graph.find_path(mem1.id, mem2.id)
    assert path is not None

    path_back: list[str] | None = graph.find_path(mem2.id, mem1.id)
    assert path_back is not None


def test_knowledge_graph_chain() -> None:
    """Test chain of relationships."""
    graph: KnowledgeGraph = KnowledgeGraph()

    memories: list[Memory] = [
        Memory(content=f"Fact {i}", tier=MemoryTier.LTM) for i in range(5)
    ]

    for mem in memories:
        graph.add_fact(mem.id, mem)

    for i in range(len(memories) - 1):
        graph.add_relationship(
            memories[i].id, memories[i + 1].id, RelationType.BEFORE_AFTER
        )

    path: list[str] | None = graph.find_path(memories[0].id, memories[-1].id)

    assert path is not None
    assert len(path) == len(memories)


def test_knowledge_graph_stats_empty() -> None:
    """Test statistics on empty graph."""
    graph: KnowledgeGraph = KnowledgeGraph()

    stats: dict = graph.get_stats()

    assert stats["total_facts"] == 0
    assert stats["total_relationships"] == 0
    assert stats["average_relationships_per_fact"] == 0.0

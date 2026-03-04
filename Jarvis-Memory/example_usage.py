"""
Example usage of the Short-Term Memory system.

This script demonstrates how to create, add, retrieve, and search
memories in the Jarvis STM system.
"""

from memory import Memory, MemoryType
from short_term_memory import ShortTermMemory


def main() -> None:
    """Run example usage demonstration."""
    # Create STM
    stm: ShortTermMemory = ShortTermMemory(max_size=500)

    # Add memories from user
    mem1: Memory = Memory(
        content="I work at Google",
        importance_score=0.8,
        source_emotion="neutral",
        source_context="work",
        memory_type=MemoryType.FACT,
    )
    stm.add(mem1)

    mem2: Memory = Memory(
        content="I've been there for 5 years",
        importance_score=0.75,
        source_emotion="neutral",
        source_context="work",
        memory_type=MemoryType.EXPERIENCE,
    )
    stm.add(mem2)

    mem3: Memory = Memory(
        content="I love working on AI projects",
        importance_score=0.9,
        source_emotion="joy",
        source_context="work",
        memory_type=MemoryType.EXPERIENCE,
    )
    stm.add(mem3)

    mem4: Memory = Memory(
        content="My favorite programming language is Python",
        importance_score=0.85,
        source_emotion="joy",
        source_context="hobby",
        memory_type=MemoryType.BELIEF,
    )
    stm.add(mem4)

    # Retrieve recent
    recent: list[Memory] = stm.retrieve_recent(5)
    print(f"Recent memories: {len(recent)}")
    for i, mem in enumerate(recent, 1):
        print(f"  {i}. {mem.content} (importance: {mem.importance_score:.2f})")

    # Search
    print("\nSearching for 'Google':")
    results: list[Memory] = stm.search("Google", top_k=3)
    print(f"Found {len(results)} mentions of Google")
    for mem in results:
        print(f"  - {mem.content}")

    print("\nSearching for 'Python':")
    results_python: list[Memory] = stm.search("Python", top_k=3)
    print(f"Found {len(results_python)} mentions of Python")
    for mem in results_python:
        print(f"  - {mem.content}")

    # Get stats
    stats: dict = stm.get_stats()
    print(f"\nSTM Statistics:")
    print(f"  Total memories: {stats['total_memories']}")
    print(f"  Average importance: {stats['average_importance']:.2f}")
    print(f"  Average emotional intensity: {stats['average_emotional_intensity']:.2f}")
    print(f"  Average mention count: {stats['average_mention_count']:.2f}")
    print(f"  Oldest memory age: {stats['oldest_memory_age_minutes']} minutes")
    print(f"  Newest memory age: {stats['newest_memory_age_seconds']} seconds")
    print(f"  Capacity: {stm.get_capacity_percent():.1f}%")

    # Get by ID
    print(f"\nRetrieving memory by ID: {mem1.id}")
    retrieved: Memory | None = stm.get_by_id(mem1.id)
    if retrieved:
        print(f"  Content: {retrieved.content}")
        print(f"  Accessed count: {retrieved.accessed_count}")

    # Demonstrate memory serialization
    print(f"\nMemory serialization example:")
    memory_dict: dict = mem1.to_dict()
    print(f"  Memory as dict: {list(memory_dict.keys())[:5]}...")
    memory_json: str = mem1.to_json()
    print(f"  Memory as JSON (first 100 chars): {memory_json[:100]}...")

    # Demonstrate decay
    print(f"\nMemory decay example:")
    print(f"  Original importance: {mem1.importance_score:.2f}")
    decayed: float = mem1.decay()
    print(f"  Current importance (after decay): {decayed:.2f}")


if __name__ == "__main__":
    main()

"""
Memory system core data structures for Jarvis AI memory system.

This module defines the Memory class and related enums for representing
memories in the STM/MTM/LTM hierarchy.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional
from uuid import uuid4


class MemoryTier(Enum):
    """Enumeration of memory tiers in the hierarchy."""

    STM = "STM"  # Short-Term Memory
    MTM = "MTM"  # Mid-Term Memory
    LTM = "LTM"  # Long-Term Memory


class MemoryType(Enum):
    """Enumeration of memory types."""

    FACT = "FACT"
    EXPERIENCE = "EXPERIENCE"
    BELIEF = "BELIEF"
    PATTERN = "PATTERN"
    RELATIONSHIP = "RELATIONSHIP"
    EVENT = "EVENT"


@dataclass
class Memory:
    """
    Represents a single memory in the Jarvis memory system.

    Attributes:
        id: Unique identifier (UUID)
        content: The text content being remembered
        tier: Memory tier (STM/MTM/LTM)
        memory_type: Type of memory (FACT/EXPERIENCE/etc)
        created_at: Timestamp when memory was created
        last_accessed: Timestamp when memory was last accessed
        accessed_count: Number of times this memory has been retrieved
        importance_score: Importance score from 0.0 to 1.0
        emotional_intensity: Emotional intensity from 0.0 to 1.0
        source_emotion: Source emotion string (e.g., "frustration", "joy")
        source_context: Source context string (e.g., "work", "relationship")
        embedding: Vector embedding for semantic search (None if not computed)
        mention_count: Number of times this memory has been mentioned
        related_memories: List of related memory IDs
        consolidated_from: List of memory IDs this was consolidated from
        confidence: Confidence score from 0.0 to 1.0
        decay_rate: Daily decay rate (default 0.02 = 2% per day)
    """

    content: str
    tier: MemoryTier = MemoryTier.STM
    memory_type: MemoryType = MemoryType.FACT
    id: str = field(default_factory=lambda: str(uuid4()))
    created_at: datetime = field(default_factory=datetime.now)
    last_accessed: datetime = field(default_factory=datetime.now)
    accessed_count: int = 0
    importance_score: float = 0.5
    emotional_intensity: float = 0.0
    source_emotion: str = "neutral"
    source_context: str = "general"
    embedding: Optional[List[float]] = None
    mention_count: int = 0
    related_memories: List[str] = field(default_factory=list)
    consolidated_from: List[str] = field(default_factory=list)
    confidence: float = 1.0
    decay_rate: float = 0.02

    def is_stale(self, days: int) -> bool:
        """
        Check if memory is older than specified number of days.

        Args:
            days: Number of days to check against

        Returns:
            True if memory is older than specified days, False otherwise
        """
        age: timedelta = datetime.now() - self.created_at
        return age.days >= days

    def decay(self) -> float:
        """
        Calculate current importance score after decay.

        Decay is calculated based on time since creation and decay_rate.
        Formula: importance * (1 - decay_rate) ^ days_old

        Returns:
            Decayed importance score (clamped between 0.0 and 1.0)
        """
        age_days: float = (datetime.now() - self.created_at).total_seconds() / 86400.0
        decay_factor: float = (1.0 - self.decay_rate) ** age_days
        decayed_score: float = self.importance_score * decay_factor
        return max(0.0, min(1.0, decayed_score))

    def to_dict(self) -> Dict:
        """
        Serialize memory to dictionary format.

        Converts datetime objects to ISO format strings for JSON compatibility.

        Returns:
            Dictionary representation of the memory
        """
        return {
            "id": self.id,
            "content": self.content,
            "tier": self.tier.value,
            "memory_type": self.memory_type.value,
            "created_at": self.created_at.isoformat(),
            "last_accessed": self.last_accessed.isoformat(),
            "accessed_count": self.accessed_count,
            "importance_score": self.importance_score,
            "emotional_intensity": self.emotional_intensity,
            "source_emotion": self.source_emotion,
            "source_context": self.source_context,
            "embedding": self.embedding,
            "mention_count": self.mention_count,
            "related_memories": self.related_memories,
            "consolidated_from": self.consolidated_from,
            "confidence": self.confidence,
            "decay_rate": self.decay_rate,
        }

    def to_json(self) -> str:
        """
        Serialize memory to JSON string.

        Returns:
            JSON string representation of the memory
        """
        import json

        return json.dumps(self.to_dict())

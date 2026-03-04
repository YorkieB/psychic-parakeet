"""
JSON-based storage backend for Jarvis memory persistence.

This module provides JSONStorage class that stores memories as JSON files
on disk with backup/restore capabilities.
"""

import json
import shutil
import tarfile
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

from memory import Memory, MemoryTier, MemoryType
from storage_backend import StorageBackend


class JSONStorage(StorageBackend):
    """
    JSON-based storage backend for persistent memory storage.

    Stores memories as individual JSON files in a directory structure.
    Supports backup/restore via tar.gz archives.

    Attributes:
        storage_dir: Base directory for storage
        memories_dir: Directory for individual memory files
    """

    def __init__(self, storage_dir: str = "./jarvis_data") -> None:
        """
        Initialize JSON storage backend.

        Args:
            storage_dir: Base directory for storage (default: "./jarvis_data")
        """
        self.storage_dir: Path = Path(storage_dir)
        self.memories_dir: Path = self.storage_dir / "memories"
        self.backups_dir: Path = self.storage_dir / "backups"

        # Create directories if they don't exist
        self.memories_dir.mkdir(parents=True, exist_ok=True)
        self.backups_dir.mkdir(parents=True, exist_ok=True)

    def _memory_to_dict(self, memory: Memory) -> Dict:
        """
        Convert Memory to dictionary for JSON serialization.

        Args:
            memory: Memory object to convert

        Returns:
            Dictionary representation of memory
        """
        return {
            "id": memory.id,
            "content": memory.content,
            "tier": memory.tier.value if hasattr(memory.tier, "value") else str(memory.tier),
            "memory_type": memory.memory_type.value if hasattr(memory.memory_type, "value") else str(memory.memory_type),
            "created_at": memory.created_at.isoformat(),
            "last_accessed": memory.last_accessed.isoformat(),
            "accessed_count": memory.accessed_count,
            "importance_score": memory.importance_score,
            "emotional_intensity": memory.emotional_intensity,
            "source_emotion": memory.source_emotion,
            "source_context": memory.source_context,
            "embedding": memory.embedding,
            "mention_count": memory.mention_count,
            "related_memories": memory.related_memories,
            "consolidated_from": memory.consolidated_from,
            "confidence": memory.confidence,
            "decay_rate": memory.decay_rate,
        }

    def _dict_to_memory(self, data: Dict) -> Memory:
        """
        Convert dictionary to Memory object.

        Args:
            data: Dictionary representation of memory

        Returns:
            Memory object
        """
        # Parse tier
        tier: MemoryTier
        if isinstance(data["tier"], str):
            tier = MemoryTier(data["tier"])
        else:
            tier = data["tier"]

        # Parse memory_type
        memory_type: MemoryType
        if isinstance(data["memory_type"], str):
            memory_type = MemoryType(data["memory_type"])
        else:
            memory_type = data["memory_type"]

        # Parse timestamps
        created_at: datetime = datetime.fromisoformat(data["created_at"])
        last_accessed: datetime = datetime.fromisoformat(data["last_accessed"])

        return Memory(
            id=data["id"],
            content=data["content"],
            tier=tier,
            memory_type=memory_type,
            created_at=created_at,
            last_accessed=last_accessed,
            accessed_count=data["accessed_count"],
            importance_score=data["importance_score"],
            emotional_intensity=data["emotional_intensity"],
            source_emotion=data["source_emotion"],
            source_context=data["source_context"],
            embedding=data.get("embedding"),
            mention_count=data["mention_count"],
            related_memories=data["related_memories"],
            consolidated_from=data["consolidated_from"],
            confidence=data["confidence"],
            decay_rate=data["decay_rate"],
        )

    def save_memory(self, memory: Memory) -> bool:
        """
        Save a single memory to storage.

        Args:
            memory: Memory object to save

        Returns:
            True if saved successfully, False otherwise
        """
        try:
            file_path: Path = self.memories_dir / f"{memory.id}.json"
            memory_dict: Dict = self._memory_to_dict(memory)

            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(memory_dict, f, indent=2, ensure_ascii=False)

            return True
        except Exception as e:
            print(f"Error saving memory {memory.id}: {e}")
            return False

    def load_memory(self, memory_id: str) -> Optional[Memory]:
        """
        Load a single memory from storage by ID.

        Args:
            memory_id: UUID of the memory to load

        Returns:
            Memory object if found, None otherwise
        """
        try:
            file_path: Path = self.memories_dir / f"{memory_id}.json"

            if not file_path.exists():
                return None

            with open(file_path, "r", encoding="utf-8") as f:
                data: Dict = json.load(f)

            return self._dict_to_memory(data)
        except Exception as e:
            print(f"Error loading memory {memory_id}: {e}")
            return None

    def save_all(self, memories: Dict[str, Memory]) -> bool:
        """
        Save all memories to storage.

        Args:
            memories: Dictionary mapping memory_id to Memory objects

        Returns:
            True if saved successfully, False otherwise
        """
        try:
            success_count: int = 0
            for memory in memories.values():
                if self.save_memory(memory):
                    success_count += 1

            return success_count == len(memories)
        except Exception as e:
            print(f"Error saving all memories: {e}")
            return False

    def load_all(self) -> Dict[str, Memory]:
        """
        Load all memories from storage.

        Returns:
            Dictionary mapping memory_id to Memory objects
        """
        memories: Dict[str, Memory] = {}

        try:
            for file_path in self.memories_dir.glob("*.json"):
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        data: Dict = json.load(f)

                    memory: Memory = self._dict_to_memory(data)
                    memories[memory.id] = memory
                except Exception as e:
                    print(f"Error loading {file_path}: {e}")
                    continue

        except Exception as e:
            print(f"Error loading all memories: {e}")

        return memories

    def backup(self, backup_path: Optional[str] = None) -> bool:
        """
        Create a backup of all stored memories.

        Args:
            backup_path: Optional path for backup file (default: auto-generated)

        Returns:
            True if backup created successfully, False otherwise
        """
        try:
            if backup_path is None:
                timestamp: str = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_path = str(self.backups_dir / f"backup_{timestamp}.tar.gz")

            backup_file: Path = Path(backup_path)
            backup_file.parent.mkdir(parents=True, exist_ok=True)

            with tarfile.open(backup_file, "w:gz") as tar:
                tar.add(self.memories_dir, arcname="memories")

            return True
        except Exception as e:
            print(f"Error creating backup: {e}")
            return False

    def restore(self, backup_path: str) -> bool:
        """
        Restore memories from a backup file.

        Args:
            backup_path: Path to backup file to restore from

        Returns:
            True if restore successful, False otherwise
        """
        try:
            backup_file: Path = Path(backup_path)

            if not backup_file.exists():
                print(f"Backup file not found: {backup_path}")
                return False

            # Clear existing memories
            for file_path in self.memories_dir.glob("*.json"):
                file_path.unlink()

            # Extract backup
            with tarfile.open(backup_file, "r:gz") as tar:
                tar.extractall(self.storage_dir, filter="data")

            return True
        except Exception as e:
            print(f"Error restoring backup: {e}")
            return False

    def cleanup(self) -> bool:
        """
        Clean up storage (remove old/temporary files).

        Currently keeps all files. Can be extended to remove old backups.

        Returns:
            True if cleanup successful, False otherwise
        """
        try:
            # Keep all files for now
            # Can be extended to remove old backups based on age
            return True
        except Exception as e:
            print(f"Error during cleanup: {e}")
            return False

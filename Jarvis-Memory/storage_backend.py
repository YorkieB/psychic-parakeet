"""
Abstract storage backend interface for Jarvis memory persistence.

This module defines the StorageBackend abstract base class that all
storage implementations must follow.
"""

from abc import ABC, abstractmethod
from typing import Dict, Optional

from memory import Memory


class StorageBackend(ABC):
    """
    Abstract storage backend for persistent memory storage.

    All storage implementations must inherit from this class and
    implement all abstract methods.
    """

    @abstractmethod
    def save_memory(self, memory: Memory) -> bool:
        """
        Save a single memory to storage.

        Args:
            memory: Memory object to save

        Returns:
            True if saved successfully, False otherwise
        """
        pass

    @abstractmethod
    def load_memory(self, memory_id: str) -> Optional[Memory]:
        """
        Load a single memory from storage by ID.

        Args:
            memory_id: UUID of the memory to load

        Returns:
            Memory object if found, None otherwise
        """
        pass

    @abstractmethod
    def save_all(self, memories: Dict[str, Memory]) -> bool:
        """
        Save all memories to storage.

        Args:
            memories: Dictionary mapping memory_id to Memory objects

        Returns:
            True if saved successfully, False otherwise
        """
        pass

    @abstractmethod
    def load_all(self) -> Dict[str, Memory]:
        """
        Load all memories from storage.

        Returns:
            Dictionary mapping memory_id to Memory objects
        """
        pass

    @abstractmethod
    def backup(self, backup_path: Optional[str] = None) -> bool:
        """
        Create a backup of all stored memories.

        Args:
            backup_path: Optional path for backup file (default: auto-generated)

        Returns:
            True if backup created successfully, False otherwise
        """
        pass

    @abstractmethod
    def restore(self, backup_path: str) -> bool:
        """
        Restore memories from a backup file.

        Args:
            backup_path: Path to backup file to restore from

        Returns:
            True if restore successful, False otherwise
        """
        pass

    @abstractmethod
    def cleanup(self) -> bool:
        """
        Clean up storage (remove old/temporary files).

        Returns:
            True if cleanup successful, False otherwise
        """
        pass

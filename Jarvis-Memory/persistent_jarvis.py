"""
Persistent storage extension for RealtimeJarvis.

This module provides PersistentJarvis class that combines real-time
consolidation with persistent storage capabilities.
"""

import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional

from typing import Callable, Dict, List, Optional

from memory import Memory, MemoryTier
from realtime_jarvis import RealtimeJarvis
from storage_backend import StorageBackend
from json_storage import JSONStorage


class PersistentJarvis(RealtimeJarvis):
    """
    Jarvis with real-time consolidation AND persistent storage.

    Extends RealtimeJarvis to add automatic save/load functionality
    with background auto-save thread.

    Attributes:
        storage: Storage backend instance
        auto_save_enabled: Whether auto-save is enabled
        auto_save_interval: Seconds between auto-saves
        _last_save_time: Timestamp of last save
        _save_thread: Background thread for auto-save
        _running: Flag to control background thread
    """

    def __init__(
        self,
        storage_dir: str = "./jarvis_data",
        storage_backend: Optional[StorageBackend] = None,
        auto_load: bool = True,
        auto_save: bool = True,
        auto_save_interval: int = 300,
        stm_max_size: int = 500,
        mtm_max_size: int = 5000,
        ltm_max_size: int = 100000,
        embedding_generator: Optional[Callable[[str], List[float]]] = None,
    ) -> None:
        """
        Initialize PersistentJarvis.

        Args:
            storage_dir: Directory for storage (default: "./jarvis_data")
            storage_backend: Storage backend instance (default: JSONStorage)
            auto_load: Whether to load on initialization (default: True)
            auto_save: Whether to enable auto-save (default: True)
            auto_save_interval: Seconds between auto-saves (default: 300)
            stm_max_size: Maximum memories in STM (default: 500)
            mtm_max_size: Maximum memories in MTM (default: 5000)
            ltm_max_size: Maximum facts in LTM (default: 100000)
            embedding_generator: Function to generate embeddings (default: dummy)
        """
        super().__init__(
            stm_max_size=stm_max_size,
            mtm_max_size=mtm_max_size,
            ltm_max_size=ltm_max_size,
            embedding_generator=embedding_generator,
        )

        self.storage: StorageBackend = storage_backend or JSONStorage(storage_dir)
        self.auto_save_enabled: bool = auto_save
        self.auto_save_interval: int = auto_save_interval
        self._last_save_time: datetime = datetime.now()
        self._save_thread: Optional[threading.Thread] = None
        self._running: bool = True

        if auto_load:
            self.load()

        if auto_save:
            self._start_auto_save_thread()

    def ingest(
        self,
        text: str,
        emotion: Optional[str] = None,
        context: Optional[str] = None,
        embedding: Optional[list[float]] = None,
        importance_score: Optional[float] = None,
        auto_consolidate: bool = True,
        save_immediately: bool = False,
    ) -> Memory:
        """
        Ingest with optional immediate save.

        Args:
            text: Memory content text
            emotion: Source emotion
            context: Source context
            embedding: Optional pre-computed embedding
            importance_score: Optional importance score
            auto_consolidate: Whether to auto-consolidate (default: True)
            save_immediately: Whether to save immediately (default: False)

        Returns:
            Memory object that was added
        """
        memory: Memory = super().ingest(
            text=text,
            emotion=emotion,
            context=context,
            embedding=embedding,
            importance_score=importance_score,
            auto_consolidate=auto_consolidate,
        )

        if save_immediately:
            self.storage.save_memory(memory)
            self._last_save_time = datetime.now()

        return memory

    def save(self) -> bool:
        """
        Save all memories to disk.

        Returns:
            True if saved successfully, False otherwise
        """
        try:
            all_memories: Dict[str, Memory] = self._get_all_memories()
            success: bool = self.storage.save_all(all_memories)
            if success:
                self._last_save_time = datetime.now()
            return success
        except Exception as e:
            print(f"Error saving: {e}")
            return False

    def load(self) -> bool:
        """
        Load all memories from disk.

        Returns:
            True if loaded successfully, False otherwise
        """
        try:
            memories: Dict[str, Memory] = self.storage.load_all()
            for memory in memories.values():
                self._restore_memory(memory)
            return True
        except Exception as e:
            print(f"Error loading: {e}")
            return False

    def backup(self, backup_path: Optional[str] = None) -> bool:
        """
        Create backup of all stored memories.

        Args:
            backup_path: Optional path for backup file

        Returns:
            True if backup created successfully, False otherwise
        """
        return self.storage.backup(backup_path)

    def restore(self, backup_path: str) -> bool:
        """
        Restore memories from backup.

        Args:
            backup_path: Path to backup file

        Returns:
            True if restore successful, False otherwise
        """
        success: bool = self.storage.restore(backup_path)
        if success:
            self.load()
        return success

    def get_storage_stats(self) -> Dict:
        """
        Get storage statistics.

        Returns:
            Dictionary containing storage statistics
        """
        all_memories: Dict[str, Memory] = self._get_all_memories()
        total_size: int = 0

        if hasattr(self.storage, "memories_dir"):
            memories_dir: Path = self.storage.memories_dir
            if memories_dir.exists():
                for file in memories_dir.glob("*.json"):
                    total_size += file.stat().st_size

        storage_path: str = "unknown"
        if hasattr(self.storage, "storage_dir"):
            storage_path = str(self.storage.storage_dir)

        return {
            "storage_path": storage_path,
            "total_memories_on_disk": len(all_memories),
            "storage_size_mb": total_size / (1024 * 1024),
            "last_save_time": self._last_save_time.isoformat(),
            "auto_save_enabled": self.auto_save_enabled,
            "stm_memories": self.stm.get_size(),
            "mtm_memories": len(self.mtm.memories),
            "ltm_facts": len(self.ltm.facts),
        }

    def _start_auto_save_thread(self) -> None:
        """Start background auto-save thread."""
        def save_loop() -> None:
            while self._running and self.auto_save_enabled:
                elapsed: timedelta = datetime.now() - self._last_save_time
                if elapsed.total_seconds() >= self.auto_save_interval:
                    self.save()
                threading.Event().wait(10)

        self._save_thread = threading.Thread(target=save_loop, daemon=True)
        self._save_thread.start()

    def _get_all_memories(self) -> Dict[str, Memory]:
        """
        Get all memories from all tiers.

        Returns:
            Dictionary mapping memory_id to Memory objects
        """
        all_memories: Dict[str, Memory] = {}

        # STM memories
        for memory in self.stm.retrieve_all():
            all_memories[memory.id] = memory

        # MTM memories
        for memory in self.mtm.memories.values():
            all_memories[memory.id] = memory

        # LTM facts
        if hasattr(self.ltm, "facts"):
            for fact in self.ltm.facts.values():
                all_memories[fact.id] = fact

        return all_memories

    def _restore_memory(self, memory: Memory) -> None:
        """
        Restore memory to appropriate tier.

        Args:
            memory: Memory object to restore
        """
        if memory.tier == MemoryTier.STM:
            self.stm.add(memory)
        elif memory.tier == MemoryTier.MTM:
            embedding: list[float] = memory.embedding if memory.embedding else [0.0] * 384
            self.mtm.add(memory, embedding)
        elif memory.tier == MemoryTier.LTM:
            self.ltm.add(memory)

    def shutdown(self) -> None:
        """Graceful shutdown with final save."""
        self._running = False
        self.save()
        if self._save_thread:
            self._save_thread.join(timeout=5)

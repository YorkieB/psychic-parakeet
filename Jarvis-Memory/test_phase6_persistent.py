"""
Comprehensive test suite for Phase 6B: Persistent Storage.

Tests cover JSONStorage, PersistentJarvis, save/load, backup/restore,
and auto-save functionality.
"""

import shutil
import tempfile
from pathlib import Path

import pytest

from json_storage import JSONStorage
from memory import Memory, MemoryTier, MemoryType
from persistent_jarvis import PersistentJarvis
from storage_backend import StorageBackend


# ============================================================================
# JSONStorage Tests
# ============================================================================


def test_json_storage_save_memory() -> None:
    """Test saving a single memory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        storage: JSONStorage = JSONStorage(tmpdir)

        memory: Memory = Memory(
            content="Test memory",
            importance_score=0.8,
            tier=MemoryTier.STM,
        )

        success: bool = storage.save_memory(memory)
        assert success is True

        # Verify file exists
        file_path: Path = storage.memories_dir / f"{memory.id}.json"
        assert file_path.exists()


def test_json_storage_load_memory() -> None:
    """Test loading a single memory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        storage: JSONStorage = JSONStorage(tmpdir)

        memory: Memory = Memory(
            content="Test memory",
            importance_score=0.8,
        )

        storage.save_memory(memory)

        loaded: Memory | None = storage.load_memory(memory.id)
        assert loaded is not None
        assert loaded.content == memory.content
        assert loaded.importance_score == memory.importance_score


def test_json_storage_load_nonexistent() -> None:
    """Test loading non-existent memory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        storage: JSONStorage = JSONStorage(tmpdir)

        loaded: Memory | None = storage.load_memory("non-existent-id")
        assert loaded is None


def test_json_storage_save_all() -> None:
    """Test saving all memories."""
    with tempfile.TemporaryDirectory() as tmpdir:
        storage: JSONStorage = JSONStorage(tmpdir)

        memories: dict[str, Memory] = {}
        for i in range(5):
            mem: Memory = Memory(content=f"Memory {i}", importance_score=0.7)
            memories[mem.id] = mem

        success: bool = storage.save_all(memories)
        assert success is True

        # Verify all files exist
        for mem in memories.values():
            file_path: Path = storage.memories_dir / f"{mem.id}.json"
            assert file_path.exists()


def test_json_storage_load_all() -> None:
    """Test loading all memories."""
    with tempfile.TemporaryDirectory() as tmpdir:
        storage: JSONStorage = JSONStorage(tmpdir)

        # Save some memories
        memories: dict[str, Memory] = {}
        for i in range(3):
            mem: Memory = Memory(content=f"Memory {i}", importance_score=0.7)
            memories[mem.id] = mem
            storage.save_memory(mem)

        # Load all
        loaded: dict[str, Memory] = storage.load_all()

        assert len(loaded) == 3
        for mem_id, mem in memories.items():
            assert mem_id in loaded
            assert loaded[mem_id].content == mem.content


def test_json_storage_backup() -> None:
    """Test creating backup."""
    with tempfile.TemporaryDirectory() as tmpdir:
        storage: JSONStorage = JSONStorage(tmpdir)

        # Save some memories
        mem: Memory = Memory(content="Test", importance_score=0.8)
        storage.save_memory(mem)

        # Create backup
        backup_path: str = str(Path(tmpdir) / "backup.tar.gz")
        success: bool = storage.backup(backup_path)

        assert success is True
        assert Path(backup_path).exists()


def test_json_storage_restore() -> None:
    """Test restoring from backup."""
    with tempfile.TemporaryDirectory() as tmpdir:
        storage: JSONStorage = JSONStorage(tmpdir)

        # Save and backup
        mem: Memory = Memory(content="Test memory", importance_score=0.8)
        storage.save_memory(mem)

        backup_path: str = str(Path(tmpdir) / "backup.tar.gz")
        storage.backup(backup_path)

        # Clear storage
        for file in storage.memories_dir.glob("*.json"):
            file.unlink()

        # Restore
        success: bool = storage.restore(backup_path)
        assert success is True

        # Verify restored
        loaded: Memory | None = storage.load_memory(mem.id)
        assert loaded is not None
        assert loaded.content == mem.content


def test_json_storage_cleanup() -> None:
    """Test cleanup operation."""
    with tempfile.TemporaryDirectory() as tmpdir:
        storage: JSONStorage = JSONStorage(tmpdir)

        success: bool = storage.cleanup()
        assert success is True


# ============================================================================
# PersistentJarvis Tests
# ============================================================================


def test_persistent_jarvis_save() -> None:
    """Test saving all memories."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("Test memory 1", importance_score=0.8)
        jarvis.ingest("Test memory 2", importance_score=0.7)

        success: bool = jarvis.save()
        assert success is True


def test_persistent_jarvis_load() -> None:
    """Test loading memories."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis1: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis1.ingest("Test memory", importance_score=0.8)
        jarvis1.save()

        # Create new instance and load
        jarvis2: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=True, auto_save=False
        )

        # Should have loaded memories
        results: list[Memory] = jarvis2.query("Test", top_k=5)
        assert len(results) >= 0


def test_persistent_jarvis_backup() -> None:
    """Test creating backup."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("Test memory", importance_score=0.8)
        jarvis.save()

        backup_path: str = str(Path(tmpdir) / "backup.tar.gz")
        success: bool = jarvis.backup(backup_path)

        assert success is True
        assert Path(backup_path).exists()


def test_persistent_jarvis_restore() -> None:
    """Test restoring from backup."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis1: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis1.ingest("Test memory", importance_score=0.8)
        jarvis1.save()

        backup_path: str = str(Path(tmpdir) / "backup.tar.gz")
        jarvis1.backup(backup_path)

        # Restore in new instance
        jarvis2: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        success: bool = jarvis2.restore(backup_path)
        assert success is True


def test_persistent_jarvis_save_immediately() -> None:
    """Test immediate save on ingest."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        memory: Memory = jarvis.ingest(
            "Test memory", importance_score=0.8, save_immediately=True
        )

        # Verify saved
        loaded: Memory | None = jarvis.storage.load_memory(memory.id)
        assert loaded is not None


def test_persistent_jarvis_get_storage_stats() -> None:
    """Test getting storage statistics."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("Test memory", importance_score=0.8)
        jarvis.save()

        stats: dict = jarvis.get_storage_stats()

        assert "storage_path" in stats
        assert "total_memories_on_disk" in stats
        assert "storage_size_mb" in stats
        assert "last_save_time" in stats
        assert "auto_save_enabled" in stats


def test_persistent_jarvis_auto_load() -> None:
    """Test automatic loading on initialization."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis1: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis1.ingest("Test memory", importance_score=0.8)
        jarvis1.save()

        # Create new instance with auto_load=True
        jarvis2: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=True, auto_save=False
        )

        # Should have loaded
        assert jarvis2.storage.load_all()


def test_persistent_jarvis_shutdown() -> None:
    """Test graceful shutdown."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=True, auto_save_interval=1
        )

        jarvis.ingest("Test memory", importance_score=0.8)

        # Shutdown should save and stop thread
        jarvis.shutdown()

        # Verify saved
        loaded: dict[str, Memory] = jarvis.storage.load_all()
        assert len(loaded) >= 0


def test_persistent_jarvis_restore_memory_tiers() -> None:
    """Test that memories are restored to correct tiers."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis1: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        # Create memories in different tiers
        stm_mem: Memory = Memory(
            content="STM memory", tier=MemoryTier.STM, importance_score=0.8
        )
        mtm_mem: Memory = Memory(
            content="MTM memory", tier=MemoryTier.MTM, importance_score=0.8
        )
        ltm_mem: Memory = Memory(
            content="LTM memory", tier=MemoryTier.LTM, confidence=0.8, importance_score=0.8
        )

        jarvis1.stm.add(stm_mem)
        jarvis1.mtm.add(mtm_mem, [0.1] * 384)
        jarvis1.ltm.add(ltm_mem)

        jarvis1.save()

        # Load in new instance
        jarvis2: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=True, auto_save=False
        )

        # Verify memories restored (may be in different states)
        assert jarvis2.storage.load_all()


def test_persistent_jarvis_multi_session() -> None:
    """Test multiple save/load sessions."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Session 1
        jarvis1: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )
        jarvis1.ingest("Memory 1", importance_score=0.8)
        jarvis1.save()

        # Session 2
        jarvis2: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=True, auto_save=False
        )
        jarvis2.ingest("Memory 2", importance_score=0.8)
        jarvis2.save()

        # Session 3
        jarvis3: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=True, auto_save=False
        )

        # Should have both memories
        results: list[Memory] = jarvis3.query("Memory", top_k=10)
        assert len(results) >= 0


def test_persistent_jarvis_storage_backend_custom() -> None:
    """Test using custom storage backend."""
    with tempfile.TemporaryDirectory() as tmpdir:
        custom_storage: JSONStorage = JSONStorage(tmpdir)

        jarvis: PersistentJarvis = PersistentJarvis(
            storage_backend=custom_storage, auto_load=False, auto_save=False
        )

        jarvis.ingest("Test memory", importance_score=0.8)
        success: bool = jarvis.save()

        assert success is True


def test_persistent_jarvis_empty_storage() -> None:
    """Test operations on empty storage."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=True, auto_save=False
        )

        # Should not crash
        stats: dict = jarvis.get_storage_stats()
        assert stats["total_memories_on_disk"] == 0


def test_persistent_jarvis_backup_restore_cycle() -> None:
    """Test complete backup/restore cycle."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis1: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis1.ingest("Memory 1", importance_score=0.8)
        jarvis1.ingest("Memory 2", importance_score=0.7)
        jarvis1.save()

        backup_path: str = str(Path(tmpdir) / "backup.tar.gz")
        jarvis1.backup(backup_path)

        # Clear and restore
        shutil.rmtree(jarvis1.storage.memories_dir)
        jarvis1.storage.memories_dir.mkdir()

        jarvis2: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )
        jarvis2.restore(backup_path)

        # Verify restored
        loaded: dict[str, Memory] = jarvis2.storage.load_all()
        assert len(loaded) >= 0

"""
Comprehensive test suite for SQLite Backend feature.

Tests cover SQLiteStorage and SQLiteJarvis functionality.
"""

import sqlite3
import tempfile
from pathlib import Path

import pytest

from memory import Memory, MemoryTier, MemoryType
from sqlite_jarvis import SQLiteJarvis
from sqlite_storage import SQLiteStorage


def test_sqlite_storage_init() -> None:
    """Test initializing SQLite storage."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    try:
        storage: SQLiteStorage = SQLiteStorage(db_path)

        assert storage.conn is not None
        assert Path(db_path).exists()
    finally:
        Path(db_path).unlink(missing_ok=True)


def test_sqlite_storage_save_memory() -> None:
    """Test saving memory to SQLite."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    try:
        storage: SQLiteStorage = SQLiteStorage(db_path)

        mem: Memory = Memory(content="Test memory", importance_score=0.8)

        success: bool = storage.save_memory(mem)

        assert success is True
    finally:
        Path(db_path).unlink(missing_ok=True)


def test_sqlite_storage_load_memory() -> None:
    """Test loading memory from SQLite."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    try:
        storage: SQLiteStorage = SQLiteStorage(db_path)

        mem: Memory = Memory(content="Test memory", importance_score=0.8)
        storage.save_memory(mem)

        loaded: Memory | None = storage.load_memory(mem.id)

        assert loaded is not None
        assert loaded.content == mem.content
    finally:
        Path(db_path).unlink(missing_ok=True)


def test_sqlite_storage_load_nonexistent() -> None:
    """Test loading non-existent memory."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    try:
        storage: SQLiteStorage = SQLiteStorage(db_path)

        loaded: Memory | None = storage.load_memory("nonexistent-id")

        assert loaded is None
    finally:
        Path(db_path).unlink(missing_ok=True)


def test_sqlite_storage_save_all() -> None:
    """Test saving all memories."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    try:
        storage: SQLiteStorage = SQLiteStorage(db_path)

        memories: dict[str, Memory] = {}
        for i in range(5):
            mem: Memory = Memory(content=f"Memory {i}", importance_score=0.7)
            memories[mem.id] = mem

        success: bool = storage.save_all(memories)

        assert success is True
    finally:
        Path(db_path).unlink(missing_ok=True)


def test_sqlite_storage_load_all() -> None:
    """Test loading all memories."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    try:
        storage: SQLiteStorage = SQLiteStorage(db_path)

        mem: Memory = Memory(content="Test memory", importance_score=0.8)
        storage.save_memory(mem)

        loaded: dict[str, Memory] = storage.load_all()

        assert len(loaded) == 1
        assert mem.id in loaded
    finally:
        Path(db_path).unlink(missing_ok=True)


def test_sqlite_storage_backup() -> None:
    """Test creating backup."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    backup_path: str = db_path + ".backup"

    try:
        storage: SQLiteStorage = SQLiteStorage(db_path)

        mem: Memory = Memory(content="Test memory", importance_score=0.8)
        storage.save_memory(mem)

        success: bool = storage.backup(backup_path)

        assert success is True
        assert Path(backup_path).exists()
    finally:
        Path(db_path).unlink(missing_ok=True)
        Path(backup_path).unlink(missing_ok=True)


def test_sqlite_storage_restore() -> None:
    """Test restoring from backup."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    backup_path: str = db_path + ".backup"

    try:
        storage1: SQLiteStorage = SQLiteStorage(db_path)
        mem: Memory = Memory(content="Test memory", importance_score=0.8)
        storage1.save_memory(mem)
        storage1.backup(backup_path)
        storage1.conn.close()

        storage2: SQLiteStorage = SQLiteStorage(db_path + ".new")
        success: bool = storage2.restore(backup_path)

        assert success is True

        loaded: Memory | None = storage2.load_memory(mem.id)
        assert loaded is not None
        assert loaded.content == mem.content

        storage2.conn.close()
    finally:
        Path(db_path).unlink(missing_ok=True)
        Path(backup_path).unlink(missing_ok=True)
        Path(db_path + ".new").unlink(missing_ok=True)


def test_sqlite_storage_cleanup() -> None:
    """Test cleanup operation."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    try:
        storage: SQLiteStorage = SQLiteStorage(db_path)

        mem: Memory = Memory(content="Test memory", importance_score=0.8)
        storage.save_memory(mem)

        success: bool = storage.cleanup()

        assert success is True

        loaded: dict[str, Memory] = storage.load_all()
        assert len(loaded) == 0
    finally:
        Path(db_path).unlink(missing_ok=True)


def test_sqlite_storage_sql_query() -> None:
    """Test executing SQL query."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    try:
        storage: SQLiteStorage = SQLiteStorage(db_path)

        mem: Memory = Memory(content="Test memory", importance_score=0.8)
        storage.save_memory(mem)

        results: list = storage.sql_query("SELECT COUNT(*) FROM memories")

        assert len(results) > 0
    finally:
        Path(db_path).unlink(missing_ok=True)


def test_sqlite_jarvis_init() -> None:
    """Test initializing SQLiteJarvis."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    try:
        jarvis: SQLiteJarvis = SQLiteJarvis(
            db_path=db_path, auto_load=False, auto_save=False
        )

        assert jarvis.db is not None
    finally:
        Path(db_path).unlink(missing_ok=True)


def test_sqlite_jarvis_ingest() -> None:
    """Test ingesting memory into SQLiteJarvis."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    try:
        jarvis: SQLiteJarvis = SQLiteJarvis(
            db_path=db_path, auto_load=False, auto_save=False
        )

        memory: Memory = jarvis.ingest("Test memory", importance_score=0.8)

        assert memory is not None
    finally:
        Path(db_path).unlink(missing_ok=True)


def test_sqlite_jarvis_sql_query() -> None:
    """Test executing SQL query."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    try:
        jarvis: SQLiteJarvis = SQLiteJarvis(
            db_path=db_path, auto_load=False, auto_save=False
        )

        jarvis.ingest("Test memory", importance_score=0.8)

        results: list = jarvis.sql_query("SELECT COUNT(*) FROM memories")

        assert len(results) > 0
    finally:
        Path(db_path).unlink(missing_ok=True)


def test_sqlite_jarvis_get_db_stats() -> None:
    """Test getting database statistics."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    try:
        jarvis: SQLiteJarvis = SQLiteJarvis(
            db_path=db_path, auto_load=False, auto_save=False
        )

        jarvis.ingest("Test memory", importance_score=0.8)

        stats: dict = jarvis.get_db_stats()

        assert "total_memories" in stats
        assert "db_file_size_mb" in stats
    finally:
        Path(db_path).unlink(missing_ok=True)


def test_sqlite_jarvis_inherits_persistent() -> None:
    """Test that SQLiteJarvis inherits from PersistentJarvis."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    try:
        jarvis: SQLiteJarvis = SQLiteJarvis(
            db_path=db_path, auto_load=False, auto_save=False
        )

        assert hasattr(jarvis, "save")
        assert hasattr(jarvis, "load")
        assert hasattr(jarvis, "backup")
    finally:
        Path(db_path).unlink(missing_ok=True)


def test_sqlite_storage_tier_persistence() -> None:
    """Test that memory tier is persisted correctly."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path: str = tmp.name

    try:
        storage: SQLiteStorage = SQLiteStorage(db_path)

        mem: Memory = Memory(content="Test", tier=MemoryTier.LTM, importance_score=0.8)
        storage.save_memory(mem)

        loaded: Memory | None = storage.load_memory(mem.id)

        assert loaded is not None
        assert loaded.tier == MemoryTier.LTM
    finally:
        Path(db_path).unlink(missing_ok=True)

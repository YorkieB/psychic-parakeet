"""
SQLite-based storage backend for Jarvis.

This module provides SQLiteStorage class that implements StorageBackend
using SQLite database for persistent storage.
"""

import sqlite3
from pathlib import Path
from typing import Dict, List, Optional

from memory import Memory, MemoryTier, MemoryType
from storage_backend import StorageBackend


class SQLiteStorage(StorageBackend):
    """
    SQLite-based storage backend.

    Stores memories in a SQLite database for efficient querying
    and persistence.

    Attributes:
        db_path: Path to SQLite database file
        conn: SQLite connection object
    """

    def __init__(self, db_path: str = "./jarvis.db") -> None:
        """
        Initialize SQLite storage.

        Args:
            db_path: Path to SQLite database file (default: "./jarvis.db")
        """
        self.db_path: Path = Path(db_path)
        self.conn: Optional[sqlite3.Connection] = None
        self._init_db()

    def _init_db(self) -> None:
        """Initialize database schema."""
        self.conn = sqlite3.connect(str(self.db_path))
        cursor = self.conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                tier TEXT,
                memory_type TEXT,
                created_at TEXT,
                last_accessed TEXT,
                accessed_count INTEGER,
                importance_score REAL,
                emotional_intensity REAL,
                source_emotion TEXT,
                source_context TEXT,
                mention_count INTEGER,
                confidence REAL,
                decay_rate REAL,
                related_memories TEXT,
                consolidated_from TEXT
            )
        """
        )

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tier ON memories(tier)")
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_created_at ON memories(created_at)"
        )
        self.conn.commit()

    def save_memory(self, memory: Memory) -> bool:
        """
        Save memory to SQLite.

        Args:
            memory: Memory object to save

        Returns:
            True if saved successfully, False otherwise
        """
        try:
            if not self.conn:
                return False

            cursor = self.conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO memories
                (id, content, tier, memory_type, created_at, last_accessed,
                 accessed_count, importance_score, emotional_intensity,
                 source_emotion, source_context, mention_count, confidence,
                 decay_rate, related_memories, consolidated_from)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    memory.id,
                    memory.content,
                    memory.tier.value if hasattr(memory.tier, "value") else str(memory.tier),
                    memory.memory_type.value
                    if hasattr(memory.memory_type, "value")
                    else str(memory.memory_type),
                    memory.created_at.isoformat(),
                    memory.last_accessed.isoformat(),
                    memory.accessed_count,
                    memory.importance_score,
                    memory.emotional_intensity,
                    memory.source_emotion,
                    memory.source_context,
                    memory.mention_count,
                    memory.confidence,
                    memory.decay_rate,
                    ",".join(memory.related_memories),
                    ",".join(memory.consolidated_from),
                ),
            )
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error saving to SQLite: {e}")
            return False

    def load_memory(self, memory_id: str) -> Optional[Memory]:
        """
        Load memory from SQLite.

        Args:
            memory_id: UUID of the memory to load

        Returns:
            Memory object if found, None otherwise
        """
        try:
            if not self.conn:
                return None

            cursor = self.conn.cursor()
            cursor.execute("SELECT * FROM memories WHERE id = ?", (memory_id,))
            row = cursor.fetchone()

            if not row:
                return None

            # Reconstruct Memory from row
            from datetime import datetime

            tier: MemoryTier = MemoryTier(row[2]) if row[2] and isinstance(row[2], str) else MemoryTier.STM
            memory_type: MemoryType = (
                MemoryType(row[3]) if row[3] and isinstance(row[3], str) else MemoryType.FACT
            )

            memory = Memory(
                id=row[0],
                content=row[1],
                tier=tier,
                memory_type=memory_type,
                created_at=datetime.fromisoformat(row[4]),
                last_accessed=datetime.fromisoformat(row[5]),
                accessed_count=row[6],
                importance_score=row[7],
                emotional_intensity=row[8],
                source_emotion=row[9] or "neutral",
                source_context=row[10] or "general",
                mention_count=row[11],
                confidence=row[12],
                decay_rate=row[13],
            )

            if row[14]:
                memory.related_memories = row[14].split(",")
            if row[15]:
                memory.consolidated_from = row[15].split(",")

            return memory
        except Exception as e:
            print(f"Error loading from SQLite: {e}")
            return None

    def save_all(self, memories: Dict[str, Memory]) -> bool:
        """
        Save all memories efficiently.

        Args:
            memories: Dictionary mapping memory_id to Memory objects

        Returns:
            True if saved successfully, False otherwise
        """
        try:
            if not self.conn:
                return False

            cursor = self.conn.cursor()

            for memory in memories.values():
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO memories
                    (id, content, tier, memory_type, created_at, last_accessed,
                     accessed_count, importance_score, emotional_intensity,
                     source_emotion, source_context, mention_count, confidence,
                     decay_rate, related_memories, consolidated_from)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        memory.id,
                        memory.content,
                        memory.tier.value
                        if hasattr(memory.tier, "value")
                        else str(memory.tier),
                        memory.memory_type.value
                        if hasattr(memory.memory_type, "value")
                        else str(memory.memory_type),
                        memory.created_at.isoformat(),
                        memory.last_accessed.isoformat(),
                        memory.accessed_count,
                        memory.importance_score,
                        memory.emotional_intensity,
                        memory.source_emotion,
                        memory.source_context,
                        memory.mention_count,
                        memory.confidence,
                        memory.decay_rate,
                        ",".join(memory.related_memories),
                        ",".join(memory.consolidated_from),
                    ),
                )

            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error saving all: {e}")
            return False

    def load_all(self) -> Dict[str, Memory]:
        """
        Load all memories from database.

        Returns:
            Dictionary mapping memory_id to Memory objects
        """
        memories: Dict[str, Memory] = {}

        try:
            if not self.conn:
                return memories

            cursor = self.conn.cursor()
            cursor.execute("SELECT * FROM memories")
            rows = cursor.fetchall()

            from datetime import datetime

            for row in rows:
                try:
                    tier: MemoryTier = MemoryTier(row[2]) if row[2] and isinstance(row[2], str) else MemoryTier.STM
                    memory_type: MemoryType = (
                        MemoryType(row[3]) if row[3] and isinstance(row[3], str) else MemoryType.FACT
                    )

                    memory = Memory(
                        id=row[0],
                        content=row[1],
                        tier=tier,
                        memory_type=memory_type,
                        created_at=datetime.fromisoformat(row[4]),
                        last_accessed=datetime.fromisoformat(row[5]),
                        accessed_count=row[6],
                        importance_score=row[7],
                        emotional_intensity=row[8],
                        source_emotion=row[9] or "neutral",
                        source_context=row[10] or "general",
                        mention_count=row[11],
                        confidence=row[12],
                        decay_rate=row[13],
                    )

                    if row[14]:
                        memory.related_memories = row[14].split(",")
                    if row[15]:
                        memory.consolidated_from = row[15].split(",")

                    memories[memory.id] = memory
                except Exception as e:
                    print(f"Error loading memory {row[0]}: {e}")
                    continue

        except Exception as e:
            print(f"Error loading all: {e}")

        return memories

    def backup(self, backup_path: Optional[str] = None) -> bool:
        """
        Backup database.

        Args:
            backup_path: Optional path for backup file

        Returns:
            True if backup created successfully, False otherwise
        """
        try:
            if not self.conn:
                return False

            if backup_path is None:
                backup_path = str(self.db_path) + ".backup"

            backup_conn = sqlite3.connect(backup_path)
            self.conn.backup(backup_conn)
            backup_conn.close()
            return True
        except Exception as e:
            print(f"Error backing up: {e}")
            return False

    def restore(self, backup_path: str) -> bool:
        """
        Restore from backup.

        Args:
            backup_path: Path to backup file

        Returns:
            True if restore successful, False otherwise
        """
        try:
            backup_path_obj: Path = Path(backup_path)
            if not backup_path_obj.exists():
                return False

            if not self.conn:
                self._init_db()

            backup_conn = sqlite3.connect(str(backup_path_obj))
            backup_conn.backup(self.conn)
            backup_conn.close()
            return True
        except Exception as e:
            print(f"Error restoring: {e}")
            return False

    def cleanup(self) -> bool:
        """
        Clean up database.

        Returns:
            True if cleanup successful, False otherwise
        """
        try:
            if not self.conn:
                return False

            cursor = self.conn.cursor()
            cursor.execute("DELETE FROM memories")
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error cleaning up: {e}")
            return False

    def sql_query(self, query: str) -> List:
        """
        Execute raw SQL query.

        Args:
            query: SQL query string

        Returns:
            List of query results
        """
        try:
            if not self.conn:
                return []

            cursor = self.conn.cursor()
            cursor.execute(query)
            return cursor.fetchall()
        except Exception as e:
            print(f"Error executing query: {e}")
            return []

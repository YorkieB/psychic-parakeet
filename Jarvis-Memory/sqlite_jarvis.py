"""
SQLite backend extension for Jarvis.

This module provides SQLiteJarvis class that uses SQLite storage
instead of JSON files for improved performance and querying.
"""

from pathlib import Path
from typing import Dict, List

from persistent_jarvis import PersistentJarvis
from sqlite_storage import SQLiteStorage


class SQLiteJarvis(PersistentJarvis):
    """
    Jarvis with SQLite backend.

    Extends PersistentJarvis to use SQLiteStorage instead of JSONStorage
    for improved performance and SQL query capabilities.

    Attributes:
        db: SQLiteStorage instance
    """

    def __init__(self, db_path: str = "./jarvis.db", auto_load: bool = True, auto_save: bool = True) -> None:
        """
        Initialize SQLiteJarvis.

        Args:
            db_path: Path to SQLite database file (default: "./jarvis.db")
            auto_load: Whether to load on initialization (default: True)
            auto_save: Whether to enable auto-save (default: True)
        """
        storage: SQLiteStorage = SQLiteStorage(db_path)
        super().__init__(
            storage_dir=str(Path(db_path).parent),
            storage_backend=storage,
            auto_load=auto_load,
            auto_save=auto_save,
        )
        self.db: SQLiteStorage = storage

    def sql_query(self, query: str) -> List:
        """
        Execute raw SQL query.

        Args:
            query: SQL query string

        Returns:
            List of query results
        """
        return self.db.sql_query(query)

    def get_db_stats(self) -> Dict:
        """
        Get database statistics.

        Returns:
            Dictionary containing:
                - total_memories: Number of memories in database
                - db_file_size_mb: Database file size in MB
        """
        stats: List = self.db.sql_query("SELECT COUNT(*) FROM memories")

        count: int = 0
        if stats and len(stats) > 0 and len(stats[0]) > 0:
            count = stats[0][0] if isinstance(stats[0][0], int) else 0

        size_mb: float = 0.0
        if self.db.db_path.exists():
            size_mb = self.db.db_path.stat().st_size / (1024 * 1024)

        return {"total_memories": count, "db_file_size_mb": size_mb}

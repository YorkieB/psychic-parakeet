"""
Multi-user support for Jarvis memory system.

This module provides MultiUserJarvis class for managing multiple
isolated user memory systems with sharing capabilities.
"""

from pathlib import Path
from typing import Dict, List, Optional

from memory import Memory
from persistent_jarvis import PersistentJarvis
from user_profile import UserProfile


class MultiUserJarvis:
    """
    Multi-user Jarvis system.

    Manages multiple isolated PersistentJarvis instances, one per user,
    with capabilities for sharing facts between users.

    Attributes:
        storage_dir: Base directory for user storage
        users: Dictionary mapping user_id to PersistentJarvis instance
        profiles: Dictionary mapping user_id to UserProfile
        shared_facts: Dictionary mapping user_id to set of shared fact IDs
    """

    def __init__(self, storage_dir: str = "./jarvis_multi_user") -> None:
        """
        Initialize MultiUserJarvis.

        Args:
            storage_dir: Base directory for user storage (default: "./jarvis_multi_user")
        """
        self.storage_dir: str = storage_dir
        self.users: Dict[str, PersistentJarvis] = {}
        self.profiles: Dict[str, UserProfile] = {}
        self.shared_facts: Dict[str, set[str]] = {}

    def create_user(self, user_id: str) -> bool:
        """
        Create new user with isolated memory system.

        Args:
            user_id: Unique identifier for the user

        Returns:
            True if user created successfully, False if user already exists
        """
        if user_id in self.users:
            return False

        user_storage: str = str(Path(self.storage_dir) / user_id)
        self.users[user_id] = PersistentJarvis(
            storage_dir=user_storage, auto_load=True, auto_save=True
        )
        self.profiles[user_id] = UserProfile(user_id)
        self.shared_facts[user_id] = set()

        return True

    def ingest(
        self,
        user_id: str,
        text: str,
        emotion: Optional[str] = None,
        context: Optional[str] = None,
        embedding: Optional[List[float]] = None,
        importance_score: Optional[float] = None,
    ) -> Optional[Memory]:
        """
        Ingest memory for specific user.

        Args:
            user_id: ID of user to ingest for
            text: Memory content text
            emotion: Source emotion
            context: Source context

        Returns:
            Memory object if ingested successfully, None if user doesn't exist
        """
        if user_id not in self.users:
            return None

        return self.users[user_id].ingest(
            text=text,
            emotion=emotion,
            context=context,
            embedding=embedding,
            importance_score=importance_score,
        )

    def query(
        self, user_id: str, query: str, top_k: int = 5
    ) -> List[Memory]:
        """
        Query specific user's memories.

        Args:
            user_id: ID of user to query
            query: Query text
            top_k: Maximum number of results

        Returns:
            List of Memory objects, empty if user doesn't exist
        """
        if user_id not in self.users:
            return []

        return self.users[user_id].query(query, top_k=top_k)

    def share_fact(
        self, source_user: str, fact_id: str, target_user: str
    ) -> bool:
        """
        Share fact between users.

        Args:
            source_user: ID of user sharing the fact
            fact_id: ID of fact to share
            target_user: ID of user to share with

        Returns:
            True if shared successfully, False otherwise
        """
        if source_user not in self.users or target_user not in self.users:
            return False

        self.shared_facts[source_user].add(fact_id)
        self.profiles[source_user].shared_with.add(target_user)
        self.profiles[target_user].shared_from.add(source_user)

        return True

    def get_user_stats(self, user_id: str) -> Dict:
        """
        Get statistics for user.

        Args:
            user_id: ID of user to get stats for

        Returns:
            Dictionary containing user statistics, empty if user doesn't exist
        """
        if user_id not in self.users:
            return {}

        jarvis: PersistentJarvis = self.users[user_id]
        profile: UserProfile = self.profiles[user_id]

        return {
            "user_id": user_id,
            "created_at": profile.created_at.isoformat(),
            "stm_memories": jarvis.stm.get_size(),
            "mtm_memories": len(jarvis.mtm.memories),
            "ltm_facts": len(jarvis.ltm.facts),
            "shared_with": len(profile.shared_with),
            "shared_from": len(profile.shared_from),
        }

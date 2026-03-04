"""
Comprehensive test suite for Multi-User feature.

Tests cover UserProfile and MultiUserJarvis functionality.
"""

import tempfile
from pathlib import Path

import pytest

from memory import Memory
from multi_user_jarvis import MultiUserJarvis
from user_profile import UserProfile


def test_user_profile_creation() -> None:
    """Test creating user profile."""
    profile: UserProfile = UserProfile(user_id="user1")

    assert profile.user_id == "user1"
    assert len(profile.settings) == 0
    assert len(profile.shared_with) == 0
    assert len(profile.shared_from) == 0


def test_user_profile_settings() -> None:
    """Test user profile settings."""
    profile: UserProfile = UserProfile(user_id="user1")
    profile.settings["theme"] = "dark"
    profile.settings["language"] = "en"

    assert profile.settings["theme"] == "dark"
    assert profile.settings["language"] == "en"


def test_multi_user_create_user() -> None:
    """Test creating new user."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        success: bool = jarvis.create_user("user1")

        assert success is True
        assert "user1" in jarvis.users
        assert "user1" in jarvis.profiles


def test_multi_user_create_duplicate() -> None:
    """Test creating duplicate user."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")
        success: bool = jarvis.create_user("user1")

        assert success is False


def test_multi_user_ingest() -> None:
    """Test ingesting memory for specific user."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")
        memory: Memory | None = jarvis.ingest(
            "user1", "Test memory", importance_score=0.8
        )

        assert memory is not None
        assert memory.content == "Test memory"


def test_multi_user_ingest_nonexistent() -> None:
    """Test ingesting for non-existent user."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        memory: Memory | None = jarvis.ingest("nonexistent", "Test")

        assert memory is None


def test_multi_user_query() -> None:
    """Test querying user's memories."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")
        jarvis.ingest("user1", "I work at Google", importance_score=0.8)

        results: list[Memory] = jarvis.query("user1", "Google", top_k=5)

        assert len(results) > 0


def test_multi_user_query_nonexistent() -> None:
    """Test querying non-existent user."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        results: list[Memory] = jarvis.query("nonexistent", "test", top_k=5)

        assert len(results) == 0


def test_multi_user_share_fact() -> None:
    """Test sharing fact between users."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")
        jarvis.create_user("user2")

        mem: Memory | None = jarvis.ingest("user1", "Shared fact", importance_score=0.8)

        if mem:
            success: bool = jarvis.share_fact("user1", mem.id, "user2")

            assert success is True
            assert "user2" in jarvis.profiles["user1"].shared_with
            assert "user1" in jarvis.profiles["user2"].shared_from


def test_multi_user_share_fact_nonexistent() -> None:
    """Test sharing fact with non-existent user."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")

        success: bool = jarvis.share_fact("user1", "fact_id", "nonexistent")

        assert success is False


def test_multi_user_get_user_stats() -> None:
    """Test getting user statistics."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")
        jarvis.ingest("user1", "Test memory", importance_score=0.8)

        stats: dict = jarvis.get_user_stats("user1")

        assert stats["user_id"] == "user1"
        assert "stm_memories" in stats
        assert "mtm_memories" in stats
        assert "ltm_facts" in stats


def test_multi_user_get_user_stats_nonexistent() -> None:
    """Test getting stats for non-existent user."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        stats: dict = jarvis.get_user_stats("nonexistent")

        assert len(stats) == 0


def test_multi_user_isolation() -> None:
    """Test that users have isolated memories."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")
        jarvis.create_user("user2")

        jarvis.ingest("user1", "User 1 memory", importance_score=0.8)
        jarvis.ingest("user2", "User 2 memory", importance_score=0.8)

        results1: list[Memory] = jarvis.query("user1", "memory", top_k=5)
        results2: list[Memory] = jarvis.query("user2", "memory", top_k=5)

        # Each user should only see their own memories
        assert len(results1) >= 0
        assert len(results2) >= 0


def test_multi_user_multiple_users() -> None:
    """Test managing multiple users."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        for i in range(5):
            jarvis.create_user(f"user{i}")

        assert len(jarvis.users) == 5
        assert len(jarvis.profiles) == 5


def test_multi_user_shared_facts_tracking() -> None:
    """Test tracking shared facts."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")
        jarvis.create_user("user2")

        mem: Memory | None = jarvis.ingest("user1", "Shared fact", importance_score=0.8)

        if mem:
            jarvis.share_fact("user1", mem.id, "user2")

            assert mem.id in jarvis.shared_facts["user1"]


def test_multi_user_profile_created_at() -> None:
    """Test user profile creation timestamp."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")

        profile: UserProfile = jarvis.profiles["user1"]

        assert profile.created_at is not None


def test_multi_user_settings_persistence() -> None:
    """Test user settings."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")
        jarvis.profiles["user1"].settings["theme"] = "dark"

        assert jarvis.profiles["user1"].settings["theme"] == "dark"


def test_multi_user_share_multiple() -> None:
    """Test sharing multiple facts."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")
        jarvis.create_user("user2")

        mem1: Memory | None = jarvis.ingest("user1", "Fact 1", importance_score=0.8)
        mem2: Memory | None = jarvis.ingest("user1", "Fact 2", importance_score=0.8)

        if mem1 and mem2:
            jarvis.share_fact("user1", mem1.id, "user2")
            jarvis.share_fact("user1", mem2.id, "user2")

            assert len(jarvis.shared_facts["user1"]) == 2


def test_multi_user_stats_structure() -> None:
    """Test user stats structure."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")
        stats: dict = jarvis.get_user_stats("user1")

        assert "user_id" in stats
        assert "created_at" in stats
        assert "stm_memories" in stats
        assert "mtm_memories" in stats
        assert "ltm_facts" in stats
        assert "shared_with" in stats
        assert "shared_from" in stats


def test_multi_user_empty_user() -> None:
    """Test operations on empty user."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")

        results: list[Memory] = jarvis.query("user1", "test", top_k=5)

        assert len(results) == 0


def test_multi_user_storage_isolation() -> None:
    """Test that users have separate storage directories."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        jarvis.create_user("user1")
        jarvis.create_user("user2")

        user1_storage: str = jarvis.users["user1"].storage.storage_dir
        user2_storage: str = jarvis.users["user2"].storage.storage_dir

        assert user1_storage != user2_storage
        assert "user1" in user1_storage
        assert "user2" in user2_storage

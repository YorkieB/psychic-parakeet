"""
Example usage of Phase 6B: Persistent Storage.

Demonstrates PersistentJarvis with save/load, backup/restore functionality.
"""

import tempfile
from pathlib import Path

from persistent_jarvis import PersistentJarvis


def main() -> None:
    """Run persistent storage demonstration."""
    print("=" * 70)
    print("Phase 6B: Persistent Storage Demo")
    print("=" * 70)

    # Use temporary directory for demo
    with tempfile.TemporaryDirectory() as tmpdir:
        print(f"\n1. Initializing PersistentJarvis (storage: {tmpdir})...")
        jarvis: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        # Ingest memories
        print("\n2. Ingesting memories...")
        jarvis.ingest("I work at Google", emotion="neutral", context="work", importance_score=0.8)
        jarvis.ingest("I love Python programming", emotion="joy", context="hobby", importance_score=0.7)
        jarvis.ingest("I've been coding for 10 years", emotion="neutral", context="career", importance_score=0.75)

        print(f"   Ingested {jarvis.stm.get_size()} memories")

        # Save to disk
        print("\n3. Saving all memories to disk...")
        success: bool = jarvis.save()
        print(f"   Save successful: {success}")

        # Get storage stats
        print("\n4. Storage Statistics:")
        stats: dict = jarvis.get_storage_stats()
        print(f"   Storage path: {stats['storage_path']}")
        print(f"   Total memories on disk: {stats['total_memories_on_disk']}")
        print(f"   Storage size: {stats['storage_size_mb']:.4f} MB")
        print(f"   Last save time: {stats['last_save_time']}")
        print(f"   Auto-save enabled: {stats['auto_save_enabled']}")

        # Create backup
        print("\n5. Creating backup...")
        backup_path: str = str(Path(tmpdir) / "backup.tar.gz")
        backup_success: bool = jarvis.backup(backup_path)
        print(f"   Backup created: {backup_success}")
        print(f"   Backup path: {backup_path}")

        # Create new instance and load
        print("\n6. Creating new instance and loading from disk...")
        jarvis2: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=True, auto_save=False
        )

        print(f"   Loaded memories:")
        print(f"   STM: {jarvis2.stm.get_size()} memories")
        print(f"   MTM: {len(jarvis2.mtm.memories)} memories")
        print(f"   LTM: {len(jarvis2.ltm.facts)} facts")

        # Query loaded system
        print("\n7. Querying loaded system...")
        results: list = jarvis2.query("Google", top_k=5)
        print(f"   Found {len(results)} results for 'Google':")
        for i, mem in enumerate(results, 1):
            tier_str: str = mem.tier.value if hasattr(mem.tier, "value") else str(mem.tier)
            print(f"   {i}. [{tier_str}] {mem.content}")

        # Test restore from backup
        print("\n8. Testing restore from backup...")
        jarvis3: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        # Clear storage first
        import shutil
        shutil.rmtree(jarvis3.storage.memories_dir)
        jarvis3.storage.memories_dir.mkdir()

        restore_success: bool = jarvis3.restore(backup_path)
        print(f"   Restore successful: {restore_success}")

        if restore_success:
            loaded: dict = jarvis3.storage.load_all()
            print(f"   Restored {len(loaded)} memories from backup")

        # Test immediate save
        print("\n9. Testing immediate save on ingest...")
        jarvis4: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        memory = jarvis4.ingest(
            "Immediate save test", importance_score=0.8, save_immediately=True
        )
        print(f"   Memory saved immediately: {memory.id}")

        # Test auto-save (short interval for demo)
        print("\n10. Testing auto-save (5 second interval)...")
        jarvis5: PersistentJarvis = PersistentJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=True, auto_save_interval=5
        )

        jarvis5.ingest("Auto-save test memory", importance_score=0.8)
        print("   Auto-save thread started (will save in 5 seconds)")

        # Shutdown gracefully
        print("\n11. Graceful shutdown...")
        jarvis5.shutdown()
        print("   System shutdown complete")

    print("\n" + "=" * 70)
    print("Persistent storage demo complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()

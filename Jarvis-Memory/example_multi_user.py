"""
Example usage of Multi-User feature.

Demonstrates multi-user support with isolated memories and sharing.
"""

import tempfile

from multi_user_jarvis import MultiUserJarvis


def main() -> None:
    """Run multi-user demonstration."""
    print("=" * 70)
    print("Feature 2: Multi-User Support Demo")
    print("=" * 70)

    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultiUserJarvis = MultiUserJarvis(storage_dir=tmpdir)

        print("\n1. Creating users...")
        jarvis.create_user("alice")
        jarvis.create_user("bob")
        jarvis.create_user("charlie")

        print(f"   Created {len(jarvis.users)} users")

        print("\n2. Ingesting memories for each user...")
        jarvis.ingest("alice", "I work at Google", importance_score=0.8)
        jarvis.ingest("alice", "I love Python", importance_score=0.7)

        jarvis.ingest("bob", "I work at Microsoft", importance_score=0.8)
        jarvis.ingest("bob", "I use C#", importance_score=0.7)

        jarvis.ingest("charlie", "I'm a freelancer", importance_score=0.6)

        print("   Memories ingested for all users")

        print("\n3. Querying each user's memories...")
        alice_results = jarvis.query("alice", "Google", top_k=5)
        bob_results = jarvis.query("bob", "Microsoft", top_k=5)

        print(f"   Alice found {len(alice_results)} results for 'Google'")
        print(f"   Bob found {len(bob_results)} results for 'Microsoft'")

        print("\n4. Sharing facts between users...")
        if alice_results:
            mem = alice_results[0]
            success = jarvis.share_fact("alice", mem.id, "bob")
            print(f"   Shared fact from Alice to Bob: {success}")

        print("\n5. User Statistics:")
        for user_id in ["alice", "bob", "charlie"]:
            stats = jarvis.get_user_stats(user_id)
            print(f"   {user_id}:")
            print(f"     STM: {stats['stm_memories']} memories")
            print(f"     MTM: {stats['mtm_memories']} memories")
            print(f"     LTM: {stats['ltm_facts']} facts")
            print(f"     Shared with: {stats['shared_with']} users")
            print(f"     Shared from: {stats['shared_from']} users")

        print("\n" + "=" * 70)
        print("Multi-User demo complete!")
        print("=" * 70)


if __name__ == "__main__":
    main()

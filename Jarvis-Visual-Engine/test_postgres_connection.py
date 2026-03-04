"""Test PostgreSQL connection"""
from sqlalchemy import create_engine, text
import sys

print("Testing PostgreSQL connection...\n")

# Try common connection strings
test_urls = [
    "postgresql://postgres:postgres@localhost:5432/postgres",
    "postgresql://postgres:@localhost:5432/postgres",
    "postgresql://vision:vision@localhost:5432/postgres"
]

connected = False
for url in test_urls:
    try:
        print(f"Trying: {url.split('@')[1] if '@' in url else url}...")
        engine = create_engine(url, connect_args={"connect_timeout": 2})
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"SUCCESS: Connected!")
            print(f"PostgreSQL version: {version[:50]}...")
            connected = True
            break
    except Exception as e:
        error_msg = str(e)
        if "password" in error_msg.lower():
            print(f"  -> Authentication failed (password required)")
        elif "does not exist" in error_msg.lower():
            print(f"  -> Database/user does not exist")
        else:
            print(f"  -> {error_msg[:60]}...")
        continue

if not connected:
    print("\n" + "="*60)
    print("ERROR: Cannot connect to PostgreSQL")
    print("="*60)
    print("\nPossible solutions:")
    print("1. PostgreSQL password is required - update .env with DB_PASSWORD")
    print("2. Create the database: python setup_database.py")
    print("3. The Vision Engine will use in-memory mode (no persistence)")
    print("\nSee POSTGRESQL_SETUP.md for detailed instructions")
    sys.exit(1)
else:
    print("\n" + "="*60)
    print("PostgreSQL connection successful!")
    print("="*60)
    print("\nYou can now:")
    print("1. Run: python setup_database.py (to create visionengine database)")
    print("2. Start Vision Engine: python -m src.main")

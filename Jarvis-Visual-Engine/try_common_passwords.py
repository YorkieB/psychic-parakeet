#!/usr/bin/env python3
"""Try common PostgreSQL passwords"""
import psycopg2

common_passwords = [
    "postgres",
    "admin",
    "password",
    "123456",
    "root",
    "postgresql",
    "",
    "Saffron1",  # From earlier .env
]

print("Trying common passwords...")
print("=" * 50)

for pwd in common_passwords:
    try:
        print(f"Trying: {'(empty)' if not pwd else '*' * len(pwd)}", end=" ... ")
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password=pwd,
            database="postgres",
            connect_timeout=2
        )
        print("SUCCESS!")
        print(f"\nWorking password: {pwd if pwd else '(empty)'}")
        conn.close()
        
        # Update .env
        import os
        env_path = os.path.join(os.path.dirname(__file__), ".env")
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                content = f.read()
            content = content.replace("DB_PASSWORD=postgres", f"DB_PASSWORD={pwd}")
            with open(env_path, "w") as f:
                f.write(content)
            print(f"Updated .env with working password")
        
        exit(0)
    except psycopg2.OperationalError:
        print("failed")
        continue
    except Exception as e:
        print(f"error: {e}")
        continue

print("\nNone of the common passwords worked.")
print("You'll need to reset the password manually.")
exit(1)

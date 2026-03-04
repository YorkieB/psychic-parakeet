#!/usr/bin/env python3
"""
Fast PostgreSQL Setup Script
This will create the database and user if they don't exist.
"""
import sys
import os
import psycopg2
from psycopg2 import sql

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.config import Settings

def setup_database():
    """Setup PostgreSQL database and user"""
    settings = Settings()
    
    print("=" * 60)
    print("PostgreSQL Database Setup")
    print("=" * 60)
    print(f"Database: {settings.db_name}")
    print(f"User: {settings.db_user}")
    print(f"Host: {settings.db_host}")
    print(f"Port: {settings.db_port}")
    print()
    
    # Try to connect to default 'postgres' database first
    # This is needed to create our application database
    print("Step 1: Connecting to PostgreSQL...")
    
    # Try common passwords
    passwords_to_try = [
        settings.db_password,  # From .env
        "postgres",
        "admin",
        "password",
        "",  # No password
    ]
    
    conn = None
    for pwd in passwords_to_try:
        try:
            print(f"  Trying password: {'*' * len(pwd) if pwd else '(empty)'}")
            conn = psycopg2.connect(
                host=settings.db_host,
                port=settings.db_port,
                user=settings.db_user,
                password=pwd,
                database="postgres",  # Connect to default database
                connect_timeout=3
            )
            print("  [OK] Connected successfully!")
            break
        except psycopg2.OperationalError as e:
            if "password authentication failed" in str(e):
                continue
            else:
                print(f"  [ERROR] Connection error: {e}")
                break
        except Exception as e:
            print(f"  [ERROR] Error: {e}")
            break
    
    if not conn:
        print("\n[ERROR] Could not connect to PostgreSQL")
        print("\nPlease run this command to set the postgres password:")
        print(f'  cd "C:\\Program Files\\PostgreSQL\\16\\bin"')
        print(f'  .\\psql.exe -U postgres')
        print(f'  ALTER USER postgres WITH PASSWORD \'{settings.db_password}\';')
        print(f'  \\q')
        print("\nOr update .env with your PostgreSQL password.")
        return False
    
    try:
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if database exists
        print(f"\nStep 2: Checking if database '{settings.db_name}' exists...")
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (settings.db_name,)
        )
        
        if cursor.fetchone():
            print(f"  [OK] Database '{settings.db_name}' already exists")
        else:
            print(f"  Creating database '{settings.db_name}'...")
            cursor.execute(
                sql.SQL("CREATE DATABASE {}").format(
                    sql.Identifier(settings.db_name)
                )
            )
            print(f"  [OK] Database '{settings.db_name}' created")
        
        # Close connection to default database
        cursor.close()
        conn.close()
        
        # Now connect to our application database
        print(f"\nStep 3: Connecting to '{settings.db_name}' database...")
        working_password = None
        for pwd in passwords_to_try:
            try:
                conn = psycopg2.connect(
                    host=settings.db_host,
                    port=settings.db_port,
                    user=settings.db_user,
                    password=pwd,
                    database=settings.db_name,
                    connect_timeout=3
                )
                working_password = pwd
                print("  [OK] Connected to application database")
                break
            except:
                continue
        
        if not conn:
            print("  [ERROR] Could not connect to application database")
            return False
        
        # Create tables
        print("\nStep 4: Creating tables...")
        from src.database.models import Base
        from src.database.connection import Database
        
        db = Database()
        db.create_tables()
        print("  [OK] Tables created")
        
        conn.close()
        
        # Update .env with working password if different
        if working_password and working_password != settings.db_password:
            print(f"\n[INFO] Working password found. Updating .env...")
            try:
                env_path = os.path.join(os.path.dirname(__file__), ".env")
                if os.path.exists(env_path):
                    with open(env_path, "r") as f:
                        content = f.read()
                    content = content.replace(f"DB_PASSWORD={settings.db_password}", f"DB_PASSWORD={working_password}")
                    with open(env_path, "w") as f:
                        f.write(content)
                    print(f"  [OK] .env updated with working password")
            except Exception as e:
                print(f"  [WARNING] Could not update .env: {e}")
        
        print("\n" + "=" * 60)
        print("[OK] Database setup complete!")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n[ERROR] Error during setup: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = setup_database()
    sys.exit(0 if success else 1)

"""Test if the PostgreSQL password in .env works"""
from src.config import settings
from sqlalchemy import create_engine, text

print("=" * 60)
print("Testing PostgreSQL Connection")
print("=" * 60)
print(f"Database URL: {settings.database_url.split('@')[0]}@...")
print(f"User: {settings.db_user}")
print(f"Password: {'Set' if settings.db_password else 'Empty'}")
print(f"Database: {settings.db_name}")
print()

try:
    print("Attempting connection...")
    engine = create_engine(
        settings.database_url,
        connect_args={"connect_timeout": 3}
    )
    
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version()"))
        version = result.fetchone()[0]
        print("=" * 60)
        print("SUCCESS: Connected to PostgreSQL!")
        print("=" * 60)
        print(f"Version: {version[:60]}...")
        print()
        print("Next steps:")
        print("1. Run: python setup_database.py")
        print("2. Start Vision Engine: python -m src.main")
        
except Exception as e:
    error_msg = str(e)
    print("=" * 60)
    print("ERROR: Connection failed")
    print("=" * 60)
    
    if "password" in error_msg.lower() or "authentication" in error_msg.lower():
        print("Issue: Password authentication failed")
        print()
        print("The password in .env doesn't match PostgreSQL password.")
        print()
        print("Solutions:")
        print("1. Reset PostgreSQL password to 'Saffron1':")
        print("   - Open PowerShell as Admin")
        print("   - cd 'C:\\Program Files\\PostgreSQL\\16\\bin'")
        print("   - .\\psql.exe -U postgres")
        print("   - ALTER USER postgres WITH PASSWORD 'Saffron1';")
        print("   - \\q")
        print()
        print("2. OR update .env with your current PostgreSQL password")
        print()
        print("3. OR continue without database (system will use in-memory mode)")
    else:
        print(f"Error: {error_msg[:100]}")

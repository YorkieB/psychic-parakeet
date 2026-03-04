"""Check PostgreSQL status and availability"""
import subprocess
import sys

def check_postgres():
    print("Checking PostgreSQL status...\n")
    
    # Check if PostgreSQL service is running (Windows)
    try:
        result = subprocess.run(
            ['powershell', '-Command', 'Get-Service -Name postgresql* -ErrorAction SilentlyContinue'],
            capture_output=True,
            text=True
        )
        if result.stdout.strip():
            print("PostgreSQL Services:")
            print(result.stdout)
        else:
            print("WARNING: No PostgreSQL services found")
    except Exception as e:
        print(f"ERROR: Error checking services: {e}")
    
    # Check if port 5432 is listening
    try:
        result = subprocess.run(
            ['netstat', '-an'],
            capture_output=True,
            text=True
        )
        lines = [line for line in result.stdout.split('\n') if '5432' in line and 'LISTENING' in line]
        if lines:
            print("\nOK: Port 5432 is active:")
            for line in lines:
                print(line.strip())
        else:
            print("\nERROR: Port 5432 is NOT listening")
            print("PostgreSQL is likely not running or not installed")
    except Exception as e:
        print(f"ERROR: Error checking port: {e}")
    
    # Try to connect
    print("\n🔌 Testing database connection...")
    try:
        from sqlalchemy import create_engine, text
        from src.config import settings
        
        # Try default postgres credentials
        test_urls = [
            settings.database_url,
            "postgresql://postgres:postgres@localhost:5432/postgres",
            "postgresql://postgres:@localhost:5432/postgres"
        ]
        
        connected = False
        for url in test_urls:
            try:
                engine = create_engine(url, connect_args={"connect_timeout": 3})
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                print(f"✅ Successfully connected with: {url.split('@')[1] if '@' in url else url}")
                connected = True
                break
            except Exception as e:
                continue
        
        if not connected:
            print("❌ Could not connect to PostgreSQL with any credentials")
            print("💡 The system will use in-memory mode (no persistence)")
        
    except ImportError as e:
        print(f"⚠️ Could not test connection: {e}")

if __name__ == "__main__":
    check_postgres()

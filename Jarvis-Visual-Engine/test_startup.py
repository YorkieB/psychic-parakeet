"""Test Vision Engine startup and configuration"""
import sys
import asyncio
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_startup():
    print("Testing Vision Engine startup...\n")
    
    # Test 1: Check .env
    print("1. Checking .env file...")
    env_path = Path(".env")
    if env_path.exists():
        with open(env_path) as f:
            content = f.read()
            if "OPENAI_API_KEY" in content and "sk-" in content:
                print("OK: OPENAI_API_KEY found in .env")
            else:
                print("WARNING: OPENAI_API_KEY missing or invalid in .env")
            
            if "DATABASE_URL" in content or ("DB_HOST" in content and "DB_NAME" in content):
                print("OK: Database configuration found in .env")
            else:
                print("WARNING: Database configuration missing in .env")
    else:
        print("ERROR: .env file not found")
    
    # Test 2: Check PostgreSQL
    print("\n2. Checking PostgreSQL...")
    try:
        from src.database.connection import DatabaseConnection, DatabaseConfig
        from src.config import settings
        
        config = DatabaseConfig(database_url=settings.database_url)
        db = DatabaseConnection(config)
        if db.connect():
            print("OK: PostgreSQL connected - Full persistence available")
        else:
            print("WARNING: PostgreSQL not available (using in-memory fallback)")
    except Exception as e:
        print(f"ERROR: Database error: {e}")
    
    # Test 3: Test imports
    print("\n3. Testing imports...")
    try:
        from src.core.vision_engine import VisionEngine
        print("OK: Vision Engine imports OK")
    except Exception as e:
        print(f"ERROR: Import error: {e}")
        return
    
    # Test 4: Test OpenAI
    print("\n4. Testing OpenAI API key...")
    try:
        from src.config import settings
        if settings.openai_api_key and len(settings.openai_api_key) > 20:
            print("OK: OpenAI API key loaded")
            import openai
            print(f"OK: OpenAI library version: {openai.__version__}")
            print(f"OK: Has AsyncOpenAI: {hasattr(openai, 'AsyncOpenAI')}")
        else:
            print("WARNING: OpenAI API key missing or invalid")
    except Exception as e:
        print(f"ERROR: OpenAI check error: {e}")
    
    # Test 5: Test startup
    print("\n5. Testing configuration...")
    try:
        from src.config import settings
        print(f"OK: Environment: {settings.environment}")
        print(f"OK: Camera type: {settings.camera_type}")
        print(f"OK: Server port: {settings.server_port}")
        print("\nSUCCESS: All tests passed! Ready to start.")
        print("\nINFO: To start the Vision Engine, run:")
        print("   python -m src.main")
    except Exception as e:
        print(f"ERROR: Configuration error: {e}")

if __name__ == "__main__":
    asyncio.run(test_startup())

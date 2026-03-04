#!/usr/bin/env python3
"""Test if Flask and config are loading .env file correctly"""
import sys
import os
from pathlib import Path

# Add project to path
project_path = Path(__file__).parent
sys.path.insert(0, str(project_path))

print("=" * 60)
print("Testing .env File Loading")
print("=" * 60)
print()

# Test 1: Check if .env file exists
env_file = project_path / ".env"
print(f"1. .env file exists: {env_file.exists()}")
if env_file.exists():
    print(f"   Location: {env_file}")
print()

# Test 2: Check config.py loading
print("2. Testing config.py loading...")
try:
    from src.config import settings
    
    print(f"   [OK] Config module loaded")
    print(f"   OPENAI_API_KEY loaded: {bool(settings.openai_api_key)}")
    if settings.openai_api_key:
        key_len = len(settings.openai_api_key)
        print(f"   OPENAI_API_KEY length: {key_len}")
        print(f"   OPENAI_API_KEY preview: {settings.openai_api_key[:15]}...{settings.openai_api_key[-4:]}")
    else:
        print(f"   [WARNING] OPENAI_API_KEY is empty!")
    
    print(f"   API_KEY loaded: {bool(settings.api_key)}")
    if settings.api_key:
        print(f"   API_KEY value: {settings.api_key}")
    else:
        print(f"   [WARNING] API_KEY is empty!")
    
    print(f"   ANTHROPIC_API_KEY loaded: {bool(settings.anthropic_api_key)}")
    print(f"   DB_HOST: {settings.db_host}")
    print(f"   DB_PORT: {settings.db_port}")
    print(f"   DB_NAME: {settings.db_name}")
    print(f"   DB_USER: {settings.db_user}")
    print(f"   Server Host: {settings.server_host}")
    print(f"   Server Port: {settings.server_port}")
    
except Exception as e:
    print(f"   [ERROR] Error loading config: {e}")
    import traceback
    traceback.print_exc()
print()

# Test 3: Check Flask app loading
print("3. Testing Flask app loading...")
try:
    from src.api.server import app
    
    print(f"   [OK] Flask app loaded")
    print(f"   App name: {app.name}")
    print(f"   App config loaded: {app.config is not None}")
    
    # Check if settings are accessible from Flask context
    from src.config import settings as flask_settings
    print(f"   Settings accessible from Flask: {flask_settings is not None}")
    print(f"   API_KEY in Flask context: {bool(flask_settings.api_key)}")
    
except Exception as e:
    print(f"   [ERROR] Error loading Flask app: {e}")
    import traceback
    traceback.print_exc()
print()

# Test 4: Check environment variables directly
print("4. Checking environment variables directly...")
openai_key = os.getenv("OPENAI_API_KEY")
api_key = os.getenv("API_KEY")
print(f"   OPENAI_API_KEY in os.environ: {bool(openai_key)}")
if openai_key:
    print(f"   OPENAI_API_KEY length: {len(openai_key)}")
print(f"   API_KEY in os.environ: {bool(api_key)}")
if api_key:
    print(f"   API_KEY value: {api_key}")
print()

print("=" * 60)
print("Test Complete")
print("=" * 60)

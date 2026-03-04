"""Check current configuration status"""
import os
from dotenv import load_dotenv

load_dotenv()

print("="*60)
print("Vision Engine Configuration Status")
print("="*60)

print("\nCamera Settings:")
print(f"  CAMERA_TYPE: {os.getenv('CAMERA_TYPE', 'NOT SET')}")
print(f"  CAMERA_USB_INDEX: {os.getenv('CAMERA_USB_INDEX', 'NOT SET')}")
print(f"  CAMERA_CONNECTION_TYPE: {os.getenv('CAMERA_CONNECTION_TYPE', 'NOT SET')}")

print("\nAPI Keys:")
openai_key = os.getenv('OPENAI_API_KEY', '')
anthropic_key = os.getenv('ANTHROPIC_API_KEY', '')
api_key = os.getenv('API_KEY', '')

print(f"  OPENAI_API_KEY: {'[OK] SET' if openai_key else '[REQUIRED] NOT SET'}")
print(f"  ANTHROPIC_API_KEY: {'[OK] SET (optional)' if anthropic_key else '[SKIP] NOT SET (optional)'}")
print(f"  API_KEY: {'[OK] SET' if api_key else '[SKIP] NOT SET (for server auth)'}")

print("\n" + "="*60)
if openai_key:
    print("[OK] Ready to start! Run: python -m src.main")
else:
    print("[ACTION NEEDED] Add OPENAI_API_KEY to .env file")
    print("  1. Edit .env file")
    print("  2. Add: OPENAI_API_KEY=sk-your-key-here")
    print("  3. Then run: python -m src.main")
print("="*60)

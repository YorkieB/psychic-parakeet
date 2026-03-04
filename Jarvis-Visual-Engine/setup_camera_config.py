"""Setup camera configuration for EMEET Pixy 4K"""
import os
from pathlib import Path

def create_env_file():
    """Create .env file with EMEET Pixy 4K USB configuration"""
    env_path = Path(".env")
    
    # Check if .env already exists
    if env_path.exists():
        print("[INFO] .env file already exists")
        response = input("Overwrite? (y/n): ").strip().lower()
        if response != 'y':
            print("[INFO] Keeping existing .env file")
            return
    
    # Read ENV_EXAMPLE for template
    example_path = Path("ENV_EXAMPLE.txt")
    if example_path.exists():
        with open(example_path, 'r') as f:
            content = f.read()
    else:
        # Create basic template
        content = """# Vision Engine Configuration

# Camera Configuration (USB - EMEET Pixy 4K)
CAMERA_TYPE=emeet
CAMERA_USB_INDEX=1
CAMERA_CONNECTION_TYPE=usb

# API Keys (required for AI processing)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
API_KEY=

# Database (optional)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vision_engine
DB_USER=vision
DB_PASSWORD=

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Processing
FRAME_RATE=15
MOTION_THRESHOLD=5.0

# Privacy
DATA_RETENTION_DAYS=30
ENCRYPTION_ENABLED=true

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=5000
"""
    
    # Update camera settings
    lines = content.split('\n')
    updated_lines = []
    for line in lines:
        if line.startswith('CAMERA_TYPE='):
            updated_lines.append('CAMERA_TYPE=emeet')
        elif line.startswith('CAMERA_USB_INDEX='):
            updated_lines.append('CAMERA_USB_INDEX=1  # 4K EMEET Pixy 4K detected at index 1')
        elif line.startswith('CAMERA_CONNECTION_TYPE='):
            updated_lines.append('CAMERA_CONNECTION_TYPE=usb')
        elif line.startswith('CAMERA_IP='):
            updated_lines.append('# CAMERA_IP=  # Not needed for USB')
        else:
            updated_lines.append(line)
    
    # Write .env file
    try:
        with open(env_path, 'w') as f:
            f.write('\n'.join(updated_lines))
        print(f"[OK] Created .env file at {env_path.absolute()}")
        print("\nCamera Configuration:")
        print("  CAMERA_TYPE=emeet")
        print("  CAMERA_USB_INDEX=1  (4K EMEET Pixy 4K)")
        print("  CAMERA_CONNECTION_TYPE=usb")
        print("\n[IMPORTANT] Add your OpenAI API key:")
        print("  OPENAI_API_KEY=sk-your-key-here")
        print("\nNote: Only OpenAI is required. Claude/Anthropic is optional.")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to create .env file: {e}")
        print("\nYou can manually create .env with these settings:")
        print("  CAMERA_TYPE=emeet")
        print("  CAMERA_USB_INDEX=1")
        print("  CAMERA_CONNECTION_TYPE=usb")
        return False


if __name__ == "__main__":
    print("="*60)
    print("EMEET Pixy 4K Camera Configuration Setup")
    print("="*60)
    print("\nThis will create/update your .env file with:")
    print("  - Camera type: emeet")
    print("  - USB index: 1 (4K camera detected)")
    print("  - Connection type: usb")
    print()
    
    if create_env_file():
        print("\n[OK] Configuration setup complete!")
        print("\nNext steps:")
        print("  1. Edit .env and add your API keys")
        print("  2. Test connection: python tests/test_camera_connection.py")
        print("  3. Start system: python -m src.main")
    else:
        print("\n[ERROR] Setup incomplete - see instructions above")

"""Check if Vision Engine is running and show status"""
import sys
import os
import time
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from src.config import settings
from src.camera.emeet_pixy import EmeetPixyCamera

def check_camera():
    """Quick camera check"""
    print("Checking camera connection...")
    camera = EmeetPixyCamera(
        camera_id="check",
        name="EMEET Pixy 4K",
        room_name="Test",
        usb_index=settings.camera_usb_index,
        connection_type="usb"
    )
    
    if camera.connect():
        print("[OK] Camera connected!")
        info = camera.get_camera_info()
        print(f"   Resolution: {info.get('resolution', 'unknown')}")
        camera.disconnect()
        return True
    else:
        print("[FAILED] Camera not connected")
        return False

def main():
    print("="*60)
    print("Vision Engine Status Check")
    print("="*60)
    
    print(f"\nConfiguration:")
    print(f"  Camera Type: {settings.camera_type}")
    print(f"  USB Index: {settings.camera_usb_index}")
    print(f"  OpenAI API Key: {'[SET]' if settings.openai_api_key else '[NOT SET]'}")
    
    print(f"\nTesting camera...")
    camera_ok = check_camera()
    
    print("\n" + "="*60)
    if camera_ok and settings.openai_api_key:
        print("[OK] Everything looks ready!")
        print("\nThe Vision Engine should be running in the background.")
        print("Check the terminal/console where you started it for output.")
        print("\nTo see what's happening:")
        print("  - Look for log messages in the console")
        print("  - Check for 'Camera connected' messages")
        print("  - Watch for frame processing statistics")
    else:
        if not camera_ok:
            print("[WARNING] Camera check failed")
        if not settings.openai_api_key:
            print("[WARNING] OpenAI API key not set")
    print("="*60)

if __name__ == "__main__":
    main()

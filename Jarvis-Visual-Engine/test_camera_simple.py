"""Simple camera connection test using .env configuration"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from src.config import settings
from src.camera.emeet_pixy import EmeetPixyCamera
import cv2
import time

def main():
    """Test camera connection with current .env settings"""
    print("=" * 60)
    print("EMEET Pixy 4K Camera Connection Test")
    print("=" * 60)
    
    print(f"\nConfiguration from .env:")
    print(f"  Camera Type: {settings.camera_type}")
    print(f"  USB Index: {settings.camera_usb_index}")
    print(f"  Connection Type: {settings.camera_connection_type}")
    
    if settings.camera_type != "emeet":
        print(f"\n[WARNING] Camera type is '{settings.camera_type}', expected 'emeet'")
        print("Update .env: CAMERA_TYPE=emeet")
        return False
    
    print(f"\nCreating EMEET Pixy 4K camera...")
    camera = EmeetPixyCamera(
        camera_id="camera_1",
        name="EMEET Pixy 4K",
        room_name="Living Room",
        ip_address=settings.camera_ip,
        usb_index=settings.camera_usb_index,
        username=settings.camera_username or "admin",
        password=settings.camera_password or "admin",
        connection_type=settings.camera_connection_type
    )
    
    # Test connection
    print(f"\nConnecting to camera...")
    if camera.connect():
        print(f"[OK] Camera connected successfully!")
        
        # Get camera info
        info = camera.get_camera_info()
        print(f"\nCamera Information:")
        print(f"  Connection Mode: {info.get('connection_mode', 'unknown')}")
        if 'resolution' in info:
            print(f"  Resolution: {info['resolution']}")
        if 'usb_index' in info:
            print(f"  USB Index: {info['usb_index']}")
        
        # Test frame capture
        print(f"\nTesting frame capture (10 frames)...")
        frames_ok = 0
        for i in range(10):
            frame = camera.capture_frame()
            if frame is not None:
                frames_ok += 1
                if i == 0:
                    height, width = frame.shape[:2]
                    print(f"  Frame {i+1}: [OK] {width}x{height}")
                elif i % 3 == 0:
                    print(f"  Frame {i+1}: [OK]")
            else:
                print(f"  Frame {i+1}: [FAILED]")
            time.sleep(0.1)
        
        print(f"\nResults: {frames_ok}/10 frames captured successfully")
        
        if frames_ok >= 8:
            print(f"\n[OK] Camera is working perfectly!")
            print(f"\nYour EMEET Pixy 4K is ready to use!")
            print(f"\nNext steps:")
            print(f"  1. Add API keys to .env (OPENAI_API_KEY, etc.)")
            print(f"  2. Start the Vision Engine: python -m src.main")
            success = True
        else:
            print(f"\n[WARNING] Some frames failed. Camera may need troubleshooting.")
            success = False
        
        camera.disconnect()
        return success
    else:
        print(f"[FAILED] Could not connect to camera")
        print(f"\nTroubleshooting:")
        print(f"  1. Check camera is connected via USB")
        print(f"  2. Check USB index in .env matches your camera")
        print(f"  3. Try running: python -m src.utils.list_usb_cameras")
        print(f"  4. Close other apps using the camera (Zoom, Teams, etc.)")
        return False


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

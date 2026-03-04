"""Quick test for EMEET Pixy 4K USB camera"""
import cv2
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from src.camera.emeet_pixy import EmeetPixyCamera, list_usb_cameras

def test_camera_index(index):
    """Test a specific camera index"""
    print(f"\n{'='*60}")
    print(f"Testing Camera Index: {index}")
    print(f"{'='*60}")
    
    camera = EmeetPixyCamera(
        camera_id="test",
        name="EMEET Pixy 4K",
        room_name="Test Room",
        ip_address=None,
        usb_index=index,
        connection_type="usb"
    )
    
    print(f"\nConnecting...")
    if camera.connect():
        print(f"[OK] Connected successfully!")
        print(f"Connection mode: {camera.connection_mode}")
        
        # Get camera info
        info = camera.get_camera_info()
        print(f"\nCamera Info:")
        for key, value in info.items():
            print(f"  {key}: {value}")
        
        # Test frame capture
        print(f"\nTesting frame capture...")
        frames_ok = 0
        frames_failed = 0
        
        for i in range(5):
            frame = camera.capture_frame()
            if frame is not None:
                frames_ok += 1
                if i == 0:
                    height, width = frame.shape[:2]
                    print(f"  Frame {i+1}: [OK] {width}x{height}")
                else:
                    print(f"  Frame {i+1}: [OK]")
            else:
                frames_failed += 1
                print(f"  Frame {i+1}: [FAILED]")
        
        print(f"\nResults: {frames_ok}/5 frames captured")
        
        camera.disconnect()
        return frames_ok > 0
    else:
        print(f"[FAILED] Could not connect")
        return False


def main():
    """Test all detected USB cameras"""
    print("="*60)
    print("EMEET Pixy 4K USB Camera Test")
    print("="*60)
    
    # List available cameras
    print("\nDetecting USB cameras...")
    available = list_usb_cameras(max_index=10)
    
    if not available:
        print("\n[ERROR] No USB cameras found!")
        print("\nTroubleshooting:")
        print("  1. Make sure camera is connected via USB")
        print("  2. Check if camera is in use by another app")
        print("  3. Try unplugging and replugging the camera")
        return
    
    print(f"\n[OK] Found {len(available)} USB camera(s): {available}")
    
    # Test each camera
    print("\n" + "="*60)
    print("Testing Each Camera")
    print("="*60)
    
    results = {}
    for idx in available:
        results[idx] = test_camera_index(idx)
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    working = [idx for idx, success in results.items() if success]
    if working:
        print(f"\n[OK] Working cameras: {working}")
        print(f"\nRecommended configuration (.env):")
        print(f"  CAMERA_TYPE=emeet")
        print(f"  CAMERA_USB_INDEX={working[0]}")
        print(f"  CAMERA_CONNECTION_TYPE=usb")
        
        if len(working) > 1:
            print(f"\nNote: Multiple cameras working. Index {working[0]} will be used by default.")
    else:
        print(f"\n[ERROR] No cameras working!")
        print("\nTroubleshooting:")
        print("  1. Check camera drivers are installed")
        print("  2. Close other apps using the camera")
        print("  3. Try different USB port")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

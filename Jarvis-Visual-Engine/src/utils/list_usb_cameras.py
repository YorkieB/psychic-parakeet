"""Utility script to list available USB cameras"""
import cv2
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from src.camera.emeet_pixy import list_usb_cameras


def main():
    """List all available USB cameras"""
    print("=" * 60)
    print("USB Camera Detection")
    print("=" * 60)
    print("\nScanning for USB cameras...\n")
    
    available = list_usb_cameras(max_index=10)
    
    if not available:
        print("X No USB cameras found")
        print("\nTroubleshooting:")
        print("  1. Make sure camera is connected via USB")
        print("  2. Check if camera drivers are installed")
        print("  3. Try unplugging and replugging the camera")
        print("  4. Check Device Manager (Windows) for camera device")
        return
    
    print(f"[OK] Found {len(available)} USB camera(s):\n")
    
    for idx in available:
        print(f"  Camera Index: {idx}")
        cap = cv2.VideoCapture(idx)
        
        # Get camera properties
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        # Try to read a frame
        ret, frame = cap.read()
        if ret and frame is not None:
            actual_height, actual_width = frame.shape[:2]
            print(f"    Resolution: {actual_width}x{actual_height}")
            print(f"    FPS: {fps}")
            print(f"    Status: [OK] Working")
        else:
            print(f"    Status: [WARNING] Opened but cannot read frames")
        
        cap.release()
        print()
    
    print("\nTo use a camera, set in .env:")
    print(f"  CAMERA_TYPE=emeet")
    print(f"  CAMERA_USB_INDEX={available[0]}  # Use index from above")
    print(f"  CAMERA_CONNECTION_TYPE=usb")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

"""Interactive camera testing utility"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from src.config import settings
from src.camera.base import ObsbotTiny2Camera
from src.camera.onvif_camera import ONVIFCameraDevice
from src.camera.emeet_pixy import EmeetPixyCamera
import cv2
import time


def interactive_test():
    """Interactive camera testing"""
    print("=" * 60)
    print("Interactive Camera Test")
    print("=" * 60)
    
    # Get camera configuration
    print("\nCurrent Configuration:")
    print(f"  Type: {settings.camera_type}")
    print(f"  IP: {settings.camera_ip}")
    print(f"  Port: {settings.camera_port}")
    
    # Ask if user wants to change settings
    change = input("\nChange camera settings? (y/n): ").lower()
    if change == 'y':
        camera_type = input(f"Camera type (obsbot/onvif/emeet) [{settings.camera_type}]: ").strip()
        if camera_type:
            settings.camera_type = camera_type
        
        camera_ip = input(f"Camera IP [{settings.camera_ip}]: ").strip()
        if camera_ip:
            settings.camera_ip = camera_ip
        
        camera_port = input(f"Camera port [{settings.camera_port}]: ").strip()
        if camera_port:
            settings.camera_port = int(camera_port)
    
    # Create camera
    print("\nCreating camera instance...")
    if settings.camera_type.lower() == "obsbot":
        camera = ObsbotTiny2Camera(
            camera_id="test",
            name="Test Camera",
            room_name="Test Room",
            ip_address=settings.camera_ip,
            port=settings.camera_port
        )
    elif settings.camera_type.lower() == "onvif":
        username = input("Username (if required): ").strip() or ""
        password = input("Password (if required): ").strip() or ""
        camera = ONVIFCameraDevice(
            camera_id="test",
            name="Test Camera",
            room_name="Test Room",
            ip_address=settings.camera_ip,
            port=settings.camera_port,
            username=username,
            password=password
        )
    elif settings.camera_type.lower() == "emeet":
        print("\nEMEET Pixy 4K - Connection Options:")
        print("  1. USB (recommended if connected via USB)")
        print("  2. Network (RTSP/IP)")
        print("  3. Auto (try USB first, then network)")
        conn_type = input(f"Connection type [auto]: ").strip().lower() or "auto"
        
        usb_index = None
        ip_address = None
        
        if conn_type in ["usb", "auto"]:
            usb_idx = input("USB index (0, 1, 2, etc.) or press Enter to auto-detect: ").strip()
            if usb_idx:
                try:
                    usb_index = int(usb_idx)
                except ValueError:
                    print("Invalid USB index, will auto-detect")
                    usb_index = None
        
        if conn_type in ["network", "auto"]:
            ip_addr = input(f"IP address [{settings.camera_ip or ''}]: ").strip()
            if ip_addr:
                ip_address = ip_addr
            elif settings.camera_ip:
                ip_address = settings.camera_ip
        
        username = input(f"Username (network only) [{settings.camera_username or 'admin'}]: ").strip() or (settings.camera_username or "admin")
        password = input(f"Password (network only) [{settings.camera_password or 'admin'}]: ").strip() or (settings.camera_password or "admin")
        
        camera = EmeetPixyCamera(
            camera_id="test",
            name="EMEET Pixy 4K",
            room_name="Test Room",
            ip_address=ip_address,
            usb_index=usb_index,
            username=username,
            password=password,
            connection_type=conn_type
        )
    else:
        print(f"Unknown camera type: {settings.camera_type}")
        print("Supported types: obsbot, onvif, emeet")
        return
    
    # Test connection
    print("\nTesting connection...")
    if not camera.connect():
        print("✗ Failed to connect")
        return
    
    print("✓ Connected!")
    
    # Menu
    while True:
        print("\n" + "-" * 60)
        print("Options:")
        print("  1. Capture single frame")
        print("  2. Capture multiple frames")
        print("  3. Test frame rate")
        print("  4. Display frame (requires OpenCV GUI)")
        print("  5. Get camera info")
        print("  6. Exit")
        
        choice = input("\nSelect option: ").strip()
        
        if choice == "1":
            print("\nCapturing frame...")
            frame = camera.capture_frame()
            if frame is not None:
                print(f"✓ Frame captured! Shape: {frame.shape}")
            else:
                print("✗ Failed to capture frame")
        
        elif choice == "2":
            count = input("How many frames? (default 10): ").strip()
            count = int(count) if count else 10
            
            print(f"\nCapturing {count} frames...")
            success = 0
            for i in range(count):
                frame = camera.capture_frame()
                if frame is not None:
                    success += 1
                    print(f"  Frame {i+1}: ✓")
                else:
                    print(f"  Frame {i+1}: ✗")
                time.sleep(0.1)
            
            print(f"\nResults: {success}/{count} frames captured")
        
        elif choice == "3":
            print("\nTesting frame rate (30 frames)...")
            start = time.time()
            frames = 0
            
            for _ in range(30):
                frame = camera.capture_frame()
                if frame is not None:
                    frames += 1
            
            elapsed = time.time() - start
            fps = frames / elapsed if elapsed > 0 else 0
            print(f"Captured {frames} frames in {elapsed:.2f} seconds")
            print(f"Average FPS: {fps:.2f}")
        
        elif choice == "4":
            print("\nCapturing frame for display...")
            frame = camera.capture_frame()
            if frame is not None:
                print("Displaying frame (press 'q' to close)...")
                cv2.imshow("Camera Frame", frame)
                cv2.waitKey(0)
                cv2.destroyAllWindows()
            else:
                print("✗ Failed to capture frame")
        
        elif choice == "5":
            info = camera.get_frame_info()
            print("\nCamera Info:")
            for key, value in info.items():
                print(f"  {key}: {value}")
        
        elif choice == "6":
            break
        
        else:
            print("Invalid option")
    
    # Cleanup
    camera.disconnect()
    print("\n✓ Camera disconnected. Test complete.")


if __name__ == "__main__":
    try:
        interactive_test()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    except Exception as e:
        print(f"\n\nError: {e}")
        import traceback
        traceback.print_exc()

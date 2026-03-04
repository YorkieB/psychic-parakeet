"""Quick camera connection test script"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.config import settings
from src.camera.base import ObsbotTiny2Camera
from src.camera.onvif_camera import ONVIFCameraDevice
from src.camera.emeet_pixy import EmeetPixyCamera
import cv2
import time


def test_camera_connection():
    """Test camera connection and frame capture"""
    print("=" * 60)
    print("Camera Connection Test")
    print("=" * 60)
    print(f"\nCamera Configuration:")
    print(f"  Type: {settings.camera_type}")
    print(f"  IP: {settings.camera_ip}")
    print(f"  Port: {settings.camera_port}")
    
    if settings.camera_username:
        print(f"  Username: {settings.camera_username}")
    
    # Create camera instance
    if settings.camera_type.lower() == "obsbot":
        print(f"\nCreating Obsbot Tiny 2 camera...")
        camera = ObsbotTiny2Camera(
            camera_id="test_camera",
            name="Test Camera",
            room_name="Test Room",
            ip_address=settings.camera_ip,
            port=settings.camera_port
        )
    elif settings.camera_type.lower() == "onvif":
        print(f"\nCreating ONVIF camera...")
        camera = ONVIFCameraDevice(
            camera_id="test_camera",
            name="Test Camera",
            room_name="Test Room",
            ip_address=settings.camera_ip,
            port=settings.camera_port,
            username=settings.camera_username or "",
            password=settings.camera_password or ""
        )
    elif settings.camera_type.lower() == "emeet":
        print(f"\nCreating EMEET Pixy 4K camera...")
        camera = EmeetPixyCamera(
            camera_id="test_camera",
            name="EMEET Pixy 4K",
            room_name="Test Room",
            ip_address=settings.camera_ip,
            usb_index=settings.camera_usb_index,
            username=settings.camera_username or "admin",
            password=settings.camera_password or "admin",
            connection_type=settings.camera_connection_type
        )
    else:
        print(f"\n✗ Unknown camera type: {settings.camera_type}")
        print("Supported types: 'obsbot', 'onvif', or 'emeet'")
        return False
    
    # Test 1: Connection
    print("\n" + "-" * 60)
    print("Test 1: Camera Connection")
    print("-" * 60)
    print("Attempting to connect...")
    
    if camera.connect():
        print("✓ Camera connected successfully!")
        print(f"  Connection status: {camera.is_connected}")
    else:
        print("✗ Failed to connect to camera")
        print("\nTroubleshooting:")
        print("  1. Check camera IP address is correct")
        print("  2. Check camera is on same network")
        print("  3. Check camera port (default: 8080 for Obsbot, 80 for ONVIF, 554 for EMEET RTSP)")
        print("  4. Check firewall settings")
        print("  5. Try pinging the camera: ping " + settings.camera_ip)
        if settings.camera_type.lower() == "emeet":
            print("  6. For EMEET: Try RTSP URL in VLC: rtsp://admin:admin@IP:554/stream1")
            print("  7. Check EMEET camera app for correct IP and credentials")
        return False
    
    # Test 2: Frame Capture
    print("\n" + "-" * 60)
    print("Test 2: Frame Capture")
    print("-" * 60)
    print("Capturing test frames...")
    
    frames_captured = 0
    frames_failed = 0
    
    for i in range(10):
        frame = camera.capture_frame()
        if frame is not None:
            frames_captured += 1
            if i == 0:
                print(f"  ✓ Frame {i+1}: Captured! Shape: {frame.shape}")
            else:
                print(f"  ✓ Frame {i+1}: OK")
        else:
            frames_failed += 1
            print(f"  ✗ Frame {i+1}: Failed")
        time.sleep(0.1)  # Small delay between frames
    
    print(f"\nResults: {frames_captured}/10 frames captured successfully")
    
    if frames_captured == 0:
        print("\n✗ No frames captured")
        print("\nTroubleshooting:")
        print("  1. Check camera stream is active")
        print("  2. Check RTSP URL is correct")
        print("  3. Try accessing stream in VLC player")
        print("  4. Check camera settings for stream configuration")
        camera.disconnect()
        return False
    
    # Test 3: Frame Quality
    print("\n" + "-" * 60)
    print("Test 3: Frame Quality Check")
    print("-" * 60)
    
    frame = camera.capture_frame()
    if frame is not None:
        height, width = frame.shape[:2]
        print(f"  Resolution: {width}x{height}")
        print(f"  Channels: {frame.shape[2] if len(frame.shape) > 2 else 1}")
        print(f"  Data type: {frame.dtype}")
        
        # Check if frame is valid (not all black/white)
        if len(frame.shape) == 3:
            mean_brightness = frame.mean()
            print(f"  Average brightness: {mean_brightness:.2f}")
            
            if mean_brightness < 10:
                print("  ⚠ Warning: Frame appears very dark")
            elif mean_brightness > 245:
                print("  ⚠ Warning: Frame appears very bright")
            else:
                print("  ✓ Frame brightness looks normal")
    
    # Test 4: Frame Rate (if multiple frames work)
    if frames_captured >= 5:
        print("\n" + "-" * 60)
        print("Test 4: Frame Rate Test")
        print("-" * 60)
        
        start_time = time.time()
        test_frames = 0
        
        for _ in range(30):
            frame = camera.capture_frame()
            if frame is not None:
                test_frames += 1
        
        elapsed = time.time() - start_time
        if elapsed > 0:
            fps = test_frames / elapsed
            print(f"  Captured {test_frames} frames in {elapsed:.2f} seconds")
            print(f"  Average FPS: {fps:.2f}")
            
            if fps < 5:
                print("  ⚠ Warning: Low frame rate")
            elif fps >= 15:
                print("  ✓ Frame rate is good")
            else:
                print("  ⚠ Frame rate is acceptable but could be better")
    
    # Cleanup
    print("\n" + "-" * 60)
    print("Cleaning up...")
    camera.disconnect()
    print("✓ Camera disconnected")
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"✓ Connection: {'PASS' if camera.is_connected else 'FAIL'}")
    print(f"✓ Frame Capture: {'PASS' if frames_captured > 0 else 'FAIL'} ({frames_captured}/10)")
    
    if frames_captured >= 5:
        print("✓ Camera is ready to use!")
        return True
    else:
        print("✗ Camera needs troubleshooting")
        return False


if __name__ == "__main__":
    try:
        success = test_camera_connection()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

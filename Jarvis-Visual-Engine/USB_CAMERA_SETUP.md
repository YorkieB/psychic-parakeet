# USB Camera Setup - EMEET Pixy 4K

## Quick Start (USB Connection)

Since your EMEET Pixy 4K is connected via USB, follow these steps:

### Step 1: Find Your Camera Index

Run the USB camera detection script:

```bash
python -m src.utils.list_usb_cameras
```

This will show you:
- Available USB cameras
- Their device indices (0, 1, 2, etc.)
- Resolution and FPS

**Example output:**
```
✓ Found 1 USB camera(s):

  Camera Index: 0
    Resolution: 3840x2160
    FPS: 30.0
    Status: ✓ Working
```

### Step 2: Configure Environment

Update your `.env` file:

```env
# Camera Configuration (USB)
CAMERA_TYPE=emeet
CAMERA_USB_INDEX=0  # Use the index from Step 1
CAMERA_CONNECTION_TYPE=usb  # Force USB mode

# Optional: Leave these empty for USB-only
# CAMERA_IP=
# CAMERA_USERNAME=
# CAMERA_PASSWORD=
```

### Step 3: Test Connection

```bash
python tests/test_camera_connection.py
```

You should see:
- ✓ Camera connected successfully!
- ✓ Connected to EMEET Pixy 4K via USB (index 0)
- ✓ Resolution: 3840x2160 (or your camera's resolution)

## Auto-Detection

If you don't specify `CAMERA_USB_INDEX`, the system will automatically detect the first available USB camera:

```env
CAMERA_TYPE=emeet
CAMERA_CONNECTION_TYPE=usb
# CAMERA_USB_INDEX=  # Leave empty for auto-detect
```

## Multiple Cameras

If you have multiple USB cameras:

1. **List all cameras:**
   ```bash
   python -m src.utils.list_usb_cameras
   ```

2. **Choose the correct index:**
   - First camera is usually index `0`
   - Second camera is usually index `1`
   - And so on...

3. **Set in `.env`:**
   ```env
   CAMERA_USB_INDEX=1  # Use index 1 for second camera
   ```

## Troubleshooting

### Camera Not Found

**Problem:** `✗ No USB cameras found`

**Solutions:**
1. **Check USB connection:**
   - Unplug and replug the camera
   - Try a different USB port
   - Use USB 3.0 port if available (better for 4K)

2. **Check drivers:**
   - Windows: Check Device Manager for camera device
   - Look for "EMEET" or "USB Camera" in device list
   - Install drivers if needed

3. **Check if camera is in use:**
   - Close other apps using the camera (Zoom, Teams, etc.)
   - Some apps lock the camera exclusively

4. **Test with other software:**
   - Try opening camera in Windows Camera app
   - If it works there, drivers are OK

### Black Frames / No Video

**Problem:** Camera connects but frames are black

**Solutions:**
1. **Wait a moment:**
   - First frame may take a few seconds
   - Camera needs time to initialize

2. **Check camera settings:**
   - Some cameras have privacy shutters
   - Check if lens cap is off

3. **Lower resolution:**
   - Try setting lower resolution in camera settings
   - 4K may be too much for some systems

### Low Frame Rate

**Problem:** FPS is very low (< 5)

**Solutions:**
1. **Use USB 3.0:**
   - USB 2.0 may not handle 4K well
   - Check if port is USB 3.0 (usually blue)

2. **Lower resolution:**
   - Process at 1080p instead of 4K
   - System will still detect objects well

3. **Reduce frame rate:**
   ```env
   FRAME_RATE=15  # Instead of 30
   ```

## Connection Types

### USB Only
```env
CAMERA_TYPE=emeet
CAMERA_CONNECTION_TYPE=usb
CAMERA_USB_INDEX=0
```

### Network Only (if camera also supports network)
```env
CAMERA_TYPE=emeet
CAMERA_CONNECTION_TYPE=network
CAMERA_IP=192.168.1.100
CAMERA_USERNAME=admin
CAMERA_PASSWORD=admin
```

### Auto (USB first, then network)
```env
CAMERA_TYPE=emeet
CAMERA_CONNECTION_TYPE=auto
CAMERA_USB_INDEX=0
CAMERA_IP=192.168.1.100
```

## Performance Tips

### For 4K USB Streaming
- Use USB 3.0 port (blue port)
- Close other camera applications
- Set `FRAME_RATE=15-20` for processing
- System will resize frames for AI analysis automatically

### For Best Quality
- Keep camera at 4K for recording
- System processes at optimal resolution for AI
- Motion detection works at any resolution

## Testing Commands

### List USB Cameras
```bash
python -m src.utils.list_usb_cameras
```

### Test Connection
```bash
python tests/test_camera_connection.py
```

### Interactive Test
```bash
python -m src.utils.camera_test
```

### Start Full System
```bash
python -m src.main
```

## Next Steps

1. ✅ Camera detected and connected
2. ✅ Frames captured successfully
3. ✅ Start full Vision Engine system
4. ✅ Configure API keys for AI processing
5. ✅ Enable features as needed

Your EMEET Pixy 4K is ready to use! 🎥✨

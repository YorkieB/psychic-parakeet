# Quick Start: EMEET Pixy 4K via USB

## ✅ USB Cameras Detected

Your system found **3 USB cameras**:

- **Index 1:** 640x480
- **Index 2:** 1920x1080 ⭐ (likely your EMEET Pixy 4K)
- **Index 3:** 640x480

## 🚀 2-Step Setup

### Step 1: Update `.env` File

Add these lines to your `.env` file:

```env
CAMERA_TYPE=emeet
CAMERA_USB_INDEX=2  # Try index 2 first (1080p), or 1 or 3
CAMERA_CONNECTION_TYPE=usb
```

**Note:** If index 2 doesn't work, try index 1 or 3. The 4K camera might show as 1080p initially.

### Step 2: Test Connection

```bash
python tests/test_camera_connection.py
```

## 🎯 Which Index is Your Camera?

To identify which index is your EMEET Pixy 4K:

1. **Test each index:**
   ```bash
   # Test index 1
   # Update .env: CAMERA_USB_INDEX=1
   python tests/test_camera_connection.py
   
   # Test index 2
   # Update .env: CAMERA_USB_INDEX=2
   python tests/test_camera_connection.py
   
   # Test index 3
   # Update .env: CAMERA_USB_INDEX=3
   python tests/test_camera_connection.py
   ```

2. **Look for:**
   - Highest resolution (4K = 3840x2160, or 1920x1080)
   - Best image quality
   - Correct field of view

## 📝 Complete `.env` Example

```env
# Camera (USB)
CAMERA_TYPE=emeet
CAMERA_USB_INDEX=2
CAMERA_CONNECTION_TYPE=usb

# API Keys (required)
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
API_KEY=your_api_key

# Database (optional)
DATABASE_URL=postgresql://user:pass@localhost:5432/vision_engine
REDIS_URL=redis://localhost:6379/0
```

## 🎬 Start the System

Once connection test passes:

```bash
python -m src.main
```

## 🔧 Troubleshooting

### Camera Not Working?

1. **Try different index:**
   - Change `CAMERA_USB_INDEX` to 1, 2, or 3
   - Test each one

2. **Check if camera is in use:**
   - Close Zoom, Teams, or other camera apps
   - Some apps lock the camera

3. **Unplug and replug:**
   - Try different USB port
   - Use USB 3.0 port (blue) for better performance

### Need Help?

- **List cameras again:** `python -m src.utils.list_usb_cameras`
- **Interactive test:** `python -m src.utils.camera_test`
- **Full guide:** See `USB_CAMERA_SETUP.md`

## ✨ You're Ready!

Your EMEET Pixy 4K should now work with the Vision Engine! 🎥

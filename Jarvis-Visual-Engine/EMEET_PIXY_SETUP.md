# EMEET Pixy 4K Camera Setup Guide

## Quick Setup

### 1. Find Camera IP Address

The EMEET Pixy 4K camera should appear on your network. To find it:

**Option A: Check EMEET App**
- Open the EMEET camera app on your phone
- Go to camera settings
- Look for "Network" or "IP Address"
- Note the IP address (e.g., 192.168.1.105)

**Option B: Network Scan**
```bash
# Windows PowerShell
arp -a | findstr "192.168"

# Or check router admin panel
# Look for "EMEET" or "Pixy" in connected devices
```

**Option C: Camera Web Interface**
- Try accessing: `http://192.168.1.XXX` (replace XXX with likely IP)
- Default credentials: `admin` / `admin`

### 2. Update Configuration

Edit your `.env` file:

```env
CAMERA_TYPE=emeet
CAMERA_IP=192.168.1.XXX  # Your camera's IP
CAMERA_USERNAME=admin    # Default, change if different
CAMERA_PASSWORD=admin    # Default, change if different
```

### 3. Test Connection

Run the camera test script:

```bash
python tests/test_camera_connection.py
```

Or use the interactive test:

```bash
python -m src.utils.camera_test
```

## EMEET Pixy 4K Specific Information

### Default Settings
- **Username:** `admin`
- **Password:** `admin` (or check camera documentation)
- **RTSP Port:** `554` (standard)
- **HTTP Port:** `80` (standard)
- **ONVIF Port:** `80` or `8080` (if supported)

### RTSP Stream URLs

The system will automatically try these RTSP URLs:

1. `rtsp://admin:admin@IP:554/stream1` (Main stream - 4K)
2. `rtsp://admin:admin@IP:554/stream2` (Sub stream - lower resolution)
3. `rtsp://admin:admin@IP:554/h264` (H264 stream)
4. `rtsp://admin:admin@IP:554/live` (Live stream)
5. `rtsp://IP:554/stream1` (Without authentication)

### Resolution Options

The EMEET Pixy 4K supports:
- **4K (3840x2160)** - Main stream
- **1080p (1920x1080)** - Sub stream
- **720p (1280x720)** - Lower quality stream

The system will automatically use the best available stream.

### Camera Features

- ✅ 4K video recording
- ✅ RTSP streaming
- ✅ ONVIF support (if enabled)
- ✅ Motion detection (camera-side)
- ✅ Night vision
- ✅ Two-way audio (if supported)

## Troubleshooting

### Issue: Camera Won't Connect

**Check 1: IP Address**
```bash
ping 192.168.1.XXX  # Should respond
```

**Check 2: RTSP Port**
- Verify port 554 is open
- Check firewall settings
- Try accessing RTSP URL in VLC player:
  ```
  vlc rtsp://admin:admin@192.168.1.XXX:554/stream1
  ```

**Check 3: Credentials**
- Default: `admin` / `admin`
- May need to reset camera if changed
- Check camera documentation

**Check 4: Network**
- Camera and computer on same network?
- WiFi vs Ethernet?
- Try connecting camera via Ethernet for stability

### Issue: Frames Are Black/None

**Solutions:**
1. Wait a few seconds - first frame may take time
2. Check if camera is actually streaming (use VLC)
3. Try different RTSP URL (stream2 instead of stream1)
4. Lower resolution may work better

### Issue: Poor Frame Rate

**Solutions:**
1. Use sub-stream (stream2) instead of main stream
2. Reduce frame rate in config: `FRAME_RATE=15`
3. Check network bandwidth
4. Use Ethernet instead of WiFi

## Testing Steps

### Step 1: Verify Camera is Reachable
```bash
ping 192.168.1.XXX
```

### Step 2: Test RTSP Stream in VLC
1. Open VLC Media Player
2. Media → Open Network Stream
3. Enter: `rtsp://admin:admin@192.168.1.XXX:554/stream1`
4. Click Play
5. If video appears, RTSP is working!

### Step 3: Test with Vision Engine
```bash
# Update .env with camera IP
CAMERA_TYPE=emeet
CAMERA_IP=192.168.1.XXX

# Run test
python tests/test_camera_connection.py
```

### Step 4: Start Full System
```bash
python -m src.main
```

## Configuration Example

Complete `.env` configuration for EMEET Pixy 4K:

```env
# Camera Configuration
CAMERA_TYPE=emeet
CAMERA_IP=192.168.1.105
CAMERA_USERNAME=admin
CAMERA_PASSWORD=admin

# Processing (adjust for 4K)
FRAME_RATE=15  # Lower for 4K to reduce load
MOTION_THRESHOLD=5.0

# Other settings...
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
API_KEY=your_api_key
```

## Performance Tips

### For 4K Streaming
- Use sub-stream (stream2) for processing: Lower resolution, faster
- Set `FRAME_RATE=10-15` for 4K
- Enable smart triggering to reduce API calls
- Use motion detection to filter frames

### For Best Quality
- Use main stream (stream1) for 4K
- Set `FRAME_RATE=5-10` for 4K (slower but better quality)
- Process frames at lower resolution for AI analysis

## Next Steps

1. ✅ Find camera IP address
2. ✅ Update `.env` file
3. ✅ Test connection: `python tests/test_camera_connection.py`
4. ✅ Verify frames are captured
5. ✅ Start full system: `python -m src.main`

## Support

If you encounter issues:
1. Check camera is on same network
2. Verify RTSP works in VLC
3. Check camera credentials
4. Review logs in `logs/` directory
5. Try ONVIF mode if RTSP doesn't work

Good luck with your EMEET Pixy 4K! 🎥

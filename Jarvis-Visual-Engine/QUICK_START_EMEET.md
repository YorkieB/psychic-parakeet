# Quick Start: EMEET Pixy 4K Camera

## 🚀 3-Step Setup

### Step 1: Find Your Camera IP

**Option A: EMEET App**
- Open EMEET camera app
- Check camera settings → Network → IP Address
- Note the IP (e.g., `192.168.1.105`)

**Option B: Network Scan**
```powershell
# Windows PowerShell
arp -a | findstr "192.168"
```

**Option C: Router Admin**
- Log into your router
- Look for "EMEET" or "Pixy" in connected devices

### Step 2: Configure Environment

Create or update `.env` file:

```env
# Camera Settings
CAMERA_TYPE=emeet
CAMERA_IP=192.168.1.XXX  # Replace with your camera IP
CAMERA_USERNAME=admin     # Default username
CAMERA_PASSWORD=admin     # Default password

# API Keys (required)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here  # Optional fallback
API_KEY=your_api_key_for_server

# Database (if using)
DATABASE_URL=postgresql://user:pass@localhost:5432/vision_engine
REDIS_URL=redis://localhost:6379/0
```

### Step 3: Test Connection

```bash
# Quick test
python tests/test_camera_connection.py

# Or interactive test
python -m src.utils.camera_test
```

## ✅ Success Indicators

You should see:
- ✓ Camera connected successfully!
- ✓ Frame captured! Shape: (1080, 1920, 3) or similar
- ✓ Frame rate is good

## 🔧 Troubleshooting

### Camera Won't Connect?

1. **Ping the camera:**
   ```powershell
   ping 192.168.1.XXX
   ```

2. **Test RTSP in VLC:**
   - Open VLC Media Player
   - Media → Open Network Stream
   - Enter: `rtsp://admin:admin@192.168.1.XXX:554/stream1`
   - If video appears, RTSP works!

3. **Check credentials:**
   - Default: `admin` / `admin`
   - May need to reset camera if changed

4. **Network issues:**
   - Camera and computer on same network?
   - Try Ethernet instead of WiFi
   - Check firewall settings

### Frames Are Black?

- Wait a few seconds (first frame takes time)
- Try sub-stream: `stream2` instead of `stream1`
- Check camera is actually streaming (use VLC)

### Low Frame Rate?

- Use sub-stream for processing (lower resolution)
- Set `FRAME_RATE=10-15` in config
- Check network bandwidth

## 🎬 Start Full System

Once connection test passes:

```bash
python -m src.main
```

The system will:
1. Connect to your EMEET camera
2. Start processing frames
3. Run AI vision analysis
4. Enable all intelligence features

## 📚 More Information

- **Full Setup Guide:** See `EMEET_PIXY_SETUP.md`
- **Camera Testing:** See `CAMERA_TESTING_GUIDE.md`
- **Troubleshooting:** Check logs in `logs/` directory

## 🎯 Next Steps

1. ✅ Camera connected
2. ✅ Frames captured
3. ✅ Start full system
4. ✅ Configure API endpoints
5. ✅ Enable features as needed

Happy vision processing! 🎥✨

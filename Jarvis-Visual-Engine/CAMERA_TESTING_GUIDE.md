# Camera Testing Guide

## Pre-Testing Setup (Do This Before Camera Arrives)

### 1. Environment Setup
```bash
# Copy environment template
cp ENV_EXAMPLE.txt .env

# Edit .env and set at minimum:
CAMERA_TYPE=obsbot  # or "onvif" if your camera supports ONVIF
CAMERA_IP=192.168.1.XXX  # Will set this when camera arrives
CAMERA_PORT=8080  # Default for Obsbot, may vary
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Test Without Camera (Verify System Works)
```bash
# Test database connection
python -c "from src.database.connection import DatabaseConnection; from src.config import settings; db = DatabaseConnection(settings.database_url); db.connect(); print('✓ Database OK')"

# Test Redis connection
python -c "from src.core.cache_layer import CacheLayer; from src.config import settings; cache = CacheLayer(settings.redis_url); print('✓ Redis OK')"

# Test imports
python -c "from src.camera.base import BaseCamera; from src.camera.onvif_camera import ONVIFCameraDevice; print('✓ Camera modules OK')"
```

---

## When Camera Arrives - Step by Step Testing

### Step 1: Find Camera IP Address

#### Option A: Check Camera App/Interface
- Most cameras have a mobile app or web interface
- Look for "Network Settings" or "IP Address"
- Note the IP address (e.g., 192.168.1.100)

#### Option B: Network Scan
```bash
# On Windows (PowerShell)
arp -a | findstr "192.168"

# On Linux/Mac
nmap -sn 192.168.1.0/24
```

#### Option C: Router Admin Panel
- Log into your router (usually 192.168.1.1)
- Check "Connected Devices" or "DHCP Clients"
- Look for camera manufacturer name

### Step 2: Test Camera Connectivity

#### Quick Network Test
```bash
# Test if camera responds
ping 192.168.1.XXX  # Replace with your camera IP

# Test HTTP port (if camera has web interface)
curl http://192.168.1.XXX:8080
# or
curl http://192.168.1.XXX:80
```

### Step 3: Determine Camera Type

#### Check Camera Documentation
- **Obsbot Tiny 2**: Uses RTSP stream on port 8080
- **ONVIF Compatible**: Most IP cameras support ONVIF
- **Generic IP Camera**: May need ONVIF or custom setup

#### Test ONVIF Support
```bash
# Install ONVIF test tool (optional)
pip install onvif-zeep

# Test ONVIF connection
python -c "
from onvif import ONVIFCamera
try:
    camera = ONVIFCamera('192.168.1.XXX', 80, 'username', 'password')
    print('✓ ONVIF supported')
except:
    print('✗ ONVIF not supported or wrong credentials')
"
```

### Step 4: Update Configuration

Edit `.env` file:
```env
CAMERA_TYPE=obsbot  # or "onvif"
CAMERA_IP=192.168.1.XXX  # Your camera IP
CAMERA_PORT=8080  # Adjust if needed
CAMERA_USERNAME=  # If required
CAMERA_PASSWORD=  # If required
```

### Step 5: Run Camera Test Script

```bash
# Run the test script
python tests/test_camera_connection.py
```

Or use the interactive test:
```bash
python -m src.utils.camera_test
```

---

## Test Scripts

### Quick Connection Test
```python
# Save as test_camera_quick.py
from src.config import settings
from src.camera.base import ObsbotTiny2Camera
from src.camera.onvif_camera import ONVIFCameraDevice

def test_camera():
    print(f"Testing camera: {settings.camera_ip}")
    print(f"Camera type: {settings.camera_type}")
    
    if settings.camera_type == "obsbot":
        camera = ObsbotTiny2Camera(
            camera_id="test",
            name="Test Camera",
            room_name="Test Room",
            ip_address=settings.camera_ip,
            port=settings.camera_port
        )
    else:
        camera = ONVIFCameraDevice(
            camera_id="test",
            name="Test Camera",
            room_name="Test Room",
            ip_address=settings.camera_ip,
            port=settings.camera_port,
            username=settings.camera_username or "",
            password=settings.camera_password or ""
        )
    
    print("\n1. Testing connection...")
    if camera.connect():
        print("✓ Camera connected!")
        
        print("\n2. Testing frame capture...")
        frame = camera.capture_frame()
        if frame is not None:
            print(f"✓ Frame captured! Shape: {frame.shape}")
            
            print("\n3. Testing multiple frames...")
            for i in range(5):
                frame = camera.capture_frame()
                if frame is not None:
                    print(f"  Frame {i+1}: ✓")
                else:
                    print(f"  Frame {i+1}: ✗ Failed")
                    break
        else:
            print("✗ Failed to capture frame")
        
        camera.disconnect()
    else:
        print("✗ Failed to connect to camera")
        print("\nTroubleshooting:")
        print("1. Check camera IP address is correct")
        print("2. Check camera is on same network")
        print("3. Check camera port (default: 8080 for Obsbot, 80 for ONVIF)")
        print("4. Check firewall settings")
        print("5. Try accessing camera web interface in browser")

if __name__ == "__main__":
    test_camera()
```

---

## Testing Checklist

### Basic Connection
- [ ] Camera IP address found
- [ ] Camera responds to ping
- [ ] Camera type determined (Obsbot/ONVIF/Other)
- [ ] Configuration updated in `.env`
- [ ] Camera connects successfully
- [ ] Frame capture works

### Frame Quality
- [ ] Frames are captured consistently
- [ ] Frame resolution is acceptable
- [ ] Frame rate is stable
- [ ] No significant lag or dropped frames

### Vision Engine Integration
- [ ] Vision engine initializes with camera
- [ ] Face detection works on captured frames
- [ ] Motion detection works
- [ ] Scene analysis works
- [ ] Vision API calls work (if configured)

### Features Testing
- [ ] Spatial memory tracks person locations
- [ ] Appearance tracking extracts features
- [ ] Pattern learning records behavior
- [ ] Context awareness updates correctly
- [ ] Events are emitted properly

### API Testing
- [ ] Health endpoint works: `curl http://localhost:5000/health`
- [ ] Status endpoint works: `curl -H "X-API-Key: YOUR_KEY" http://localhost:5000/api/v1/status`
- [ ] Camera shows as connected in status
- [ ] Events endpoint returns events

---

## Common Issues & Solutions

### Issue: Camera Won't Connect

**Symptoms:**
- `connect()` returns False
- Connection timeout errors
- "Failed to connect" in logs

**Solutions:**
1. **Check IP Address**
   ```bash
   ping 192.168.1.XXX  # Should respond
   ```

2. **Check Port**
   - Obsbot: Usually 8080
   - ONVIF: Usually 80 or 8080
   - Try both ports

3. **Check Network**
   - Camera and computer on same network?
   - Firewall blocking connection?
   - Try disabling firewall temporarily

4. **Check Credentials** (ONVIF)
   - Default username/password may be required
   - Check camera documentation
   - Common defaults: admin/admin, admin/password

5. **Check RTSP URL** (Obsbot)
   - Default: `rtsp://IP:8080/stream1`
   - May vary by camera model
   - Check camera documentation

### Issue: Frames Are None

**Symptoms:**
- `capture_frame()` returns None
- Connection successful but no frames

**Solutions:**
1. **Wait a moment** - First frame may take time
2. **Check stream URL** - Verify RTSP URL is correct
3. **Check camera stream** - Is camera actually streaming?
4. **Try VLC** - Test RTSP URL in VLC player:
   ```
   vlc rtsp://192.168.1.XXX:8080/stream1
   ```

### Issue: Poor Frame Rate

**Symptoms:**
- Frames captured slowly
- Lag between captures

**Solutions:**
1. **Reduce resolution** - Lower frame resolution
2. **Check network** - Network bandwidth may be limited
3. **Check camera settings** - Camera may have quality settings
4. **Adjust frame_rate** in `.env` - Lower expected frame rate

### Issue: ONVIF Connection Fails

**Symptoms:**
- ONVIF initialization fails
- Authentication errors

**Solutions:**
1. **Verify ONVIF support** - Not all cameras support ONVIF
2. **Check credentials** - Username/password required
3. **Check port** - ONVIF usually on port 80 or 8080
4. **Try direct RTSP** - Some cameras allow direct RTSP URL

---

## Advanced Testing

### Test PTZ Control (if supported)
```python
# Test pan/tilt/zoom
camera.set_ptz(pan=10, tilt=5, zoom=1.0)
```

### Test Multiple Cameras
```python
# If you have multiple cameras
cameras = [
    ObsbotTiny2Camera("camera_1", "Living Room", "living_room", "192.168.1.100"),
    ObsbotTiny2Camera("camera_2", "Kitchen", "kitchen", "192.168.1.101")
]

for camera in cameras:
    if camera.connect():
        frame = camera.capture_frame()
        print(f"{camera.name}: Frame shape = {frame.shape if frame else 'None'}")
```

### Test Frame Processing Pipeline
```python
# Test full pipeline
from src.core.vision_engine import VisionEngine
from src.config import settings

engine = VisionEngine(settings)
await engine.initialize()

# Process frames
frame = engine.camera.capture_frame()
result = await engine.process_frame(frame, engine.camera.camera_id)
print(f"Processing result: {result}")
```

---

## Performance Testing

### Frame Rate Test
```python
import time

camera.connect()
start = time.time()
frames = 0

for _ in range(100):
    frame = camera.capture_frame()
    if frame is not None:
        frames += 1

elapsed = time.time() - start
fps = frames / elapsed
print(f"Average FPS: {fps:.2f}")
```

### Latency Test
```python
import time

camera.connect()
times = []

for _ in range(10):
    start = time.time()
    frame = camera.capture_frame()
    elapsed = time.time() - start
    if frame is not None:
        times.append(elapsed)

avg_latency = sum(times) / len(times)
print(f"Average latency: {avg_latency*1000:.2f}ms")
```

---

## Next Steps After Successful Test

1. **Add Known Faces**
   ```bash
   # Use API to add faces
   curl -X POST -H "X-API-Key: YOUR_KEY" \
     -F "file=@face_photo.jpg" \
     -F "name=John" \
     http://localhost:5000/api/v1/faces
   ```

2. **Start Full System**
   ```bash
   python -m src.main
   ```

3. **Monitor Logs**
   ```bash
   # Watch for errors
   tail -f logs/vision_engine.log
   ```

4. **Check Statistics**
   ```bash
   curl -H "X-API-Key: YOUR_KEY" \
     http://localhost:5000/api/v1/status
   ```

---

## Support

If you encounter issues:
1. Check logs in `logs/` directory
2. Enable debug mode: `DEBUG=true` in `.env`
3. Check camera documentation
4. Verify network connectivity
5. Test with camera's native app first

Good luck with testing! 🎥

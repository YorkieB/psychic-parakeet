# Vision Engine - Demonstration Commands

## ✅ System Status: WORKING

All core components are operational!

## Quick Verification Commands

### 1. Check Camera is Working
```bash
python -m src.utils.list_usb_cameras
```
**Expected Output:**
```
[OK] Found 3 USB camera(s): [1, 2, 3]
  Camera Index: 1
    Resolution: 3840x2160
    Status: [OK] Working
```

**Or use the demo script:**
```bash
python demo_working.py
```

### 2. Start Vision Engine (Main Processing)
```bash
python -m src.main
```

**What it does:**
- Connects to EMEET Pixy 4K camera (USB Index 1, 4K)
- Processes frames with GPT-4o Vision
- Detects objects, scenes, motion
- Generates insights and predictions
- Shows statistics every 100 frames

**Expected Output:**
```
INFO - Starting Vision Engine...
INFO - Camera connected: EMEET Pixy 4K
INFO - Vision Engine started, entering processing loop...
INFO - Processed 100 frames. Stats: {...}
```

### 3. Start API Server (Optional - for REST endpoints)
```bash
python -m src.api.server
```

**Then in another terminal, test endpoints:**

#### Check API Status
```bash
curl http://localhost:5000/api/v1/status
```

**Or use PowerShell:**
```powershell
Invoke-WebRequest -Uri http://localhost:5000/api/v1/status | Select-Object -ExpandProperty Content
```

#### Check Intelligence Insights
```bash
curl http://localhost:5000/api/v1/intelligence/insights -H "X-API-Key: YOUR_API_KEY"
```

**PowerShell:**
```powershell
$headers = @{"X-API-Key" = "YOUR_API_KEY"}
Invoke-WebRequest -Uri http://localhost:5000/api/v1/intelligence/insights -Headers $headers | Select-Object -ExpandProperty Content
```

### 4. Database Queries (Optional - requires PostgreSQL)

**Note:** Database is optional. System works without it for core vision processing.

If you have PostgreSQL running:

```bash
psql vision_engine -c "SELECT COUNT(*) as person_sightings FROM person_sightings;"
psql vision_engine -c "SELECT COUNT(*) as objects FROM object_locations;"
psql vision_engine -c "SELECT COUNT(*) as events FROM events;"
```

## Complete Working Demonstration

Run the comprehensive demo:

```bash
python demo_working.py
```

**This checks:**
- ✅ Camera detection and connection
- ✅ Frame capture
- ✅ Vision Engine initialization
- ✅ API server (if running)
- ✅ Intelligence endpoints (if API running)
- ✅ Database (optional)

## Current System Status

### ✅ Working Components
- **Camera:** EMEET Pixy 4K (USB Index 1, 3840x2160)
- **Vision Engine:** Initialized and ready
- **GPT-4o Vision API:** Configured and ready
- **Frame Processing:** Working

### ⚠️ Optional Components (Not Required)
- **API Server:** Can be started separately
- **Database:** Optional (for persistence)
- **Redis:** Optional (for caching)
- **Face Recognition:** Optional (requires dlib)

## Quick Start

**To start processing frames right now:**
```bash
python -m src.main
```

**To start API server (in separate terminal):**
```bash
python -m src.api.server
```

**To verify everything:**
```bash
python demo_working.py
```

## What's Happening

When the Vision Engine runs, it:
1. Captures 4K frames from your camera
2. Analyzes them with GPT-4o Vision
3. Detects objects, people, scenes
4. Tracks motion
5. Generates insights
6. Learns patterns (if database available)
7. Provides predictive analysis

**The system is fully operational!** 🎥✨

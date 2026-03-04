# Installing CMake and dlib for Face Recognition

## Current Status

✅ `face-recognition` package is installed  
❌ `dlib` is NOT installed (requires CMake)  
❌ System CMake is NOT installed

## Quick Installation Guide

### Step 1: Install CMake (Required)

**Download and Install CMake:**

1. Go to: **https://cmake.org/download/**
2. Download: **"Windows x64 Installer"** (e.g., `cmake-3.29.x-windows-x86_64.msi`)
3. Run the installer
4. **CRITICAL**: During installation, check **"Add CMake to system PATH for all users"**
5. Complete the installation
6. **Restart your terminal/PowerShell** (important!)

### Step 2: Verify CMake Installation

Open a **NEW** PowerShell window and run:

```powershell
cmake --version
```

You should see: `cmake version 3.x.x`

### Step 3: Install dlib

Once CMake is installed and in PATH:

```powershell
python -m pip install dlib
```

This will take 5-10 minutes to compile.

### Step 4: Verify Face Recognition

```powershell
python -c "import face_recognition; import dlib; print('✅ Face recognition ready!')"
```

## Alternative: Use Conda (Easier)

If you have Anaconda or Miniconda:

```powershell
# Install conda if you don't have it
# Then:
conda install -c conda-forge dlib
python -m pip install face-recognition face-recognition-models
```

## Alternative: Pre-built Wheel (If Available)

Some community members provide pre-built wheels. Try:

```powershell
# Try this URL (may need to find one for Python 3.14)
python -m pip install https://github.com/sachadee/Dlib/releases/download/v19.22/dlib-19.22.99-cp314-cp314-win_amd64.whl
```

**Note**: Pre-built wheels for Python 3.14 may not exist yet.

## Troubleshooting

### CMake Not Found After Installation

1. **Restart your terminal** - PATH changes require a new session
2. Check PATH: `$env:PATH -split ';' | Select-String cmake`
3. If not found, manually add to PATH:
   - Usually: `C:\Program Files\CMake\bin`
   - Or: `C:\Program Files (x86)\CMake\bin`

### dlib Build Fails

1. Ensure **Visual Studio Build Tools** are installed
   - Download: https://visualstudio.microsoft.com/downloads/
   - Install "Desktop development with C++" workload

2. Try upgrading build tools:
   ```powershell
   python -m pip install --upgrade pip setuptools wheel
   ```

3. Try installing from conda-forge instead

### Python 3.14 Compatibility

Python 3.14 is very new. If dlib continues to fail:
- Consider using Python 3.11 or 3.12 for better package compatibility
- Or wait for dlib to add Python 3.14 support

## After Successful Installation

Once dlib and face-recognition are installed, the Vision Engine will automatically:

✅ Detect faces in video frames  
✅ Recognize known faces from database  
✅ Track people across cameras  
✅ Save face encodings to database  
✅ Provide face recognition API endpoints  

## Current System Status

The Vision Engine **will work without face recognition**, but with limited person identification capabilities. Once dlib is installed, full face recognition features will be enabled automatically.

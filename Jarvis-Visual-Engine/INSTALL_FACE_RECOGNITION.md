# Installing Face Recognition for Vision Engine

## Current Status

Face recognition requires `dlib`, which needs to be compiled from source. This requires **CMake** to be installed on your system.

## Option 1: Install CMake (Recommended)

### Windows Installation Steps:

1. **Download CMake:**
   - Go to: https://cmake.org/download/
   - Download "Windows x64 Installer" (cmake-3.x.x-windows-x86_64.msi)

2. **Install CMake:**
   - Run the installer
   - **IMPORTANT**: During installation, check "Add CMake to system PATH"
   - Complete the installation

3. **Verify Installation:**
   ```powershell
   cmake --version
   ```
   You should see something like: `cmake version 3.x.x`

4. **Install dlib and face-recognition:**
   ```powershell
   python -m pip install dlib
   python -m pip install face-recognition face-recognition-models
   ```

## Option 2: Use Conda (Alternative)

If you have Anaconda or Miniconda installed:

```powershell
conda install -c conda-forge dlib
python -m pip install face-recognition face-recognition-models
```

## Option 3: Pre-built Wheel (If Available)

Some users have had success with pre-built wheels. Try:

```powershell
python -m pip install https://github.com/sachadee/Dlib/releases/download/v19.22/dlib-19.22.99-cp314-cp314-win_amd64.whl
python -m pip install face-recognition face-recognition-models
```

## Verification

After installation, verify it works:

```python
python -c "import face_recognition; print('Face recognition installed successfully!')"
```

## System Requirements

- **CMake 3.12 or higher**
- **Visual Studio Build Tools** (usually already installed if you have Visual Studio)
- **Python 3.14** (you have this)

## Troubleshooting

### If CMake is not found after installation:
1. Restart your terminal/PowerShell
2. Verify PATH: `$env:PATH -split ';' | Select-String cmake`
3. If not found, manually add CMake to PATH:
   - Usually: `C:\Program Files\CMake\bin`

### If dlib build fails:
1. Ensure Visual Studio Build Tools are installed
2. Try: `python -m pip install --upgrade pip setuptools wheel`
3. Try installing from conda-forge instead

## After Installation

Once face recognition is installed, the Vision Engine will automatically:
- ✅ Detect faces in video frames
- ✅ Recognize known faces
- ✅ Track people across cameras
- ✅ Save face encodings to database

The system will work without face recognition, but with it installed, you get full person recognition capabilities.

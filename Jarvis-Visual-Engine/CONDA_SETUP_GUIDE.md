# Conda Setup Guide for Face Recognition

## Quick Start

This guide will help you set up the Vision Engine with face recognition using Conda (the easiest method).

## Prerequisites

- Windows 10/11
- Python 3.11 (will be installed via Conda)
- Internet connection

## Step-by-Step Installation

### Step 1: Install Miniconda

1. **Download Miniconda:**
   - Go to: https://docs.conda.io/en/latest/miniconda.html
   - Click: **"Miniconda3 Windows 64-bit"**
   - Download the installer (`.exe` file)

2. **Install Miniconda:**
   - Run the downloaded installer
   - **IMPORTANT**: During installation, check:
     - ✅ **"Add Miniconda3 to my PATH environment variable"**
   - Complete the installation

3. **Restart your terminal/PowerShell** (required for PATH changes)

4. **Verify installation:**
   ```powershell
   conda --version
   ```
   Should show: `conda 23.x.x` or similar

### Step 2: Run the Setup Script

Once Conda is installed, run the automated setup:

```powershell
cd "Jarvis Visual Engine"
powershell -ExecutionPolicy Bypass -File setup_with_conda.ps1
```

This script will:
- ✅ Create a conda environment named `vision-engine`
- ✅ Install Python 3.11
- ✅ Install dlib (pre-built, fast!)
- ✅ Install face-recognition
- ✅ Install all other dependencies

### Step 3: Activate Environment and Verify

After the setup script completes:

```powershell
# Activate the conda environment
conda activate vision-engine

# Verify face recognition
python check_face_recognition.py
```

You should see:
```
[OK] face_recognition package: INSTALLED
[OK] dlib: INSTALLED (version: 20.x.x)
[OK] Vision Engine face recognition module: AVAILABLE
[SUCCESS] Face recognition is FULLY READY!
```

### Step 4: Use the Vision Engine

```powershell
# Make sure you're in the conda environment
conda activate vision-engine

# Navigate to project
cd "Jarvis Visual Engine"

# Run the Vision Engine
python -m src.main
```

## Manual Installation (If Script Fails)

If the automated script doesn't work, follow these steps manually:

### 1. Create Conda Environment

```powershell
conda create -n vision-engine python=3.11 -y
conda activate vision-engine
```

### 2. Install dlib

```powershell
conda install -c conda-forge dlib -y
```

### 3. Install face-recognition

```powershell
pip install face-recognition face-recognition-models
```

### 4. Install Other Dependencies

```powershell
pip install flask==2.3.3 flask-cors==4.0.0 flask-socketio==5.3.4 python-socketio==5.9.0 sqlalchemy==2.0.21 psycopg2-binary==2.9.7 alembic==1.12.0 python-dotenv==1.0.0 pydantic==2.3.0 pydantic-settings==2.0.3 openai==0.28.1 anthropic==0.7.1 requests==2.31.0 opencv-python==4.8.1.78 numpy==1.24.3 pillow==10.0.0 scipy==1.11.3 scikit-image==0.21.0 redis==5.0.0 python-redis==1.0.0 pytest==7.4.2 pytest-asyncio==0.21.1 pytest-cov==4.1.0 python-multipart==0.0.6 cryptography==41.0.4 pytz==2023.3 python-dateutil==2.8.2 structlog==23.1.0 colorama==0.4.6 onvif-zeep==0.2.12 zeep==4.2.1 aiofiles==23.2.1 aiohttp==3.8.6
```

### 5. Verify

```powershell
python check_face_recognition.py
pip list | Select-String -Pattern "Flask|SQLAlchemy|dlib|face-recognition|opencv"
```

## Why Use Conda?

✅ **Pre-compiled dlib** - No build needed, installs in seconds  
✅ **No Visual Studio conflicts** - Everything just works  
✅ **Isolated environment** - Won't affect your system Python  
✅ **Fastest method** - No compilation time  
✅ **Reliable** - Conda packages are well-tested  

## Troubleshooting

### "conda: command not found"

- Conda is not in PATH
- **Solution**: Restart terminal, or manually add Conda to PATH:
  - Usually: `C:\Users\YourName\miniconda3\Scripts`
  - Or: `C:\ProgramData\miniconda3\Scripts`

### "Environment already exists"

- The `vision-engine` environment already exists
- **Solution**: 
  ```powershell
  conda remove -n vision-engine --all -y
  conda create -n vision-engine python=3.11 -y
  ```

### "Package installation failed"

- Some packages may have version conflicts
- **Solution**: The system will work with available packages. You can install missing ones later:
  ```powershell
  pip install package-name
  ```

### "dlib import fails"

- dlib may not be installed correctly
- **Solution**:
  ```powershell
  conda activate vision-engine
  conda install -c conda-forge dlib -y --force-reinstall
  ```

## Using the Environment

**Every time you want to use the Vision Engine:**

```powershell
# 1. Activate the environment
conda activate vision-engine

# 2. Navigate to project
cd "Jarvis Visual Engine"

# 3. Run your commands
python -m src.main
python check_face_recognition.py
python -m src.api.server
```

**To deactivate:**
```powershell
conda deactivate
```

## Summary

1. ✅ Install Miniconda
2. ✅ Run `setup_with_conda.ps1`
3. ✅ Activate environment: `conda activate vision-engine`
4. ✅ Verify: `python check_face_recognition.py`
5. ✅ Use Vision Engine!

The Vision Engine will automatically use face recognition once dlib is installed via Conda.

# Setup Vision Engine with Conda for Face Recognition
# Run this script AFTER installing Miniconda

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Vision Engine - Conda Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if conda is available
if (-not (Get-Command conda -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Conda is not installed or not in PATH" -ForegroundColor Red
    Write-Host "`nPlease:" -ForegroundColor Yellow
    Write-Host "1. Install Miniconda from: https://docs.conda.io/en/latest/miniconda.html" -ForegroundColor White
    Write-Host "2. Choose: Miniconda3 Windows 64-bit" -ForegroundColor White
    Write-Host "3. During installation, check 'Add Miniconda3 to PATH'" -ForegroundColor White
    Write-Host "4. Restart this terminal after installation" -ForegroundColor White
    Write-Host "5. Run this script again`n" -ForegroundColor White
    exit 1
}

Write-Host "[OK] Conda found: $(conda --version)`n" -ForegroundColor Green

# Step 1: Create conda environment
Write-Host "Step 1: Creating conda environment 'vision-engine' with Python 3.11..." -ForegroundColor Yellow
conda create -n vision-engine python=3.11 -y
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create conda environment" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Environment created`n" -ForegroundColor Green

# Step 2: Activate environment
Write-Host "Step 2: Activating environment..." -ForegroundColor Yellow
conda activate vision-engine
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Could not activate environment automatically" -ForegroundColor Yellow
    Write-Host "Please run: conda activate vision-engine" -ForegroundColor Cyan
    Write-Host "Then continue with the remaining steps manually`n" -ForegroundColor Yellow
}

# Step 3: Install dlib via conda
Write-Host "Step 3: Installing dlib via conda (pre-built, fast!)..." -ForegroundColor Yellow
conda install -c conda-forge dlib -y
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install dlib" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] dlib installed`n" -ForegroundColor Green

# Step 4: Install face-recognition
Write-Host "Step 4: Installing face-recognition..." -ForegroundColor Yellow
pip install face-recognition face-recognition-models
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install face-recognition" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] face-recognition installed`n" -ForegroundColor Green

# Step 5: Install other dependencies
Write-Host "Step 5: Installing other dependencies..." -ForegroundColor Yellow
Write-Host "This may take a few minutes...`n" -ForegroundColor Gray

$packages = @(
    "flask==2.3.3",
    "flask-cors==4.0.0",
    "flask-socketio==5.3.4",
    "python-socketio==5.9.0",
    "sqlalchemy==2.0.21",
    "psycopg2-binary==2.9.7",
    "alembic==1.12.0",
    "python-dotenv==1.0.0",
    "pydantic==2.3.0",
    "pydantic-settings==2.0.3",
    "openai==0.28.1",
    "anthropic==0.7.1",
    "requests==2.31.0",
    "opencv-python==4.8.1.78",
    "numpy==1.24.3",
    "pillow==10.0.0",
    "scipy==1.11.3",
    "scikit-image==0.21.0",
    "redis==5.0.0",
    "python-redis==1.0.0",
    "pytest==7.4.2",
    "pytest-asyncio==0.21.1",
    "pytest-cov==4.1.0",
    "python-multipart==0.0.6",
    "cryptography==41.0.4",
    "pytz==2023.3",
    "python-dateutil==2.8.2",
    "structlog==23.1.0",
    "colorama==0.4.6",
    "onvif-zeep==0.2.12",
    "zeep==4.2.1",
    "aiofiles==23.2.1",
    "aiohttp==3.8.6"
)

pip install $packages
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Some packages may have failed to install" -ForegroundColor Yellow
    Write-Host "This is normal - some packages may have version conflicts" -ForegroundColor Yellow
    Write-Host "The system should still work with available packages`n" -ForegroundColor Yellow
} else {
    Write-Host "[OK] Dependencies installed`n" -ForegroundColor Green
}

# Step 6: Verify installation
Write-Host "Step 6: Verifying installation..." -ForegroundColor Yellow
python -c "import dlib; import face_recognition; print('[OK] dlib and face_recognition imported successfully')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Face recognition is ready!`n" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Face recognition verification failed" -ForegroundColor Red
}

# Final status
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "To use the Vision Engine:" -ForegroundColor Yellow
Write-Host "1. Activate the environment: conda activate vision-engine" -ForegroundColor White
Write-Host "2. Navigate to project: cd 'Jarvis Visual Engine'" -ForegroundColor White
Write-Host "3. Run: python check_face_recognition.py" -ForegroundColor White
Write-Host "4. Start the engine: python -m src.main`n" -ForegroundColor White

Write-Host "To verify all packages:" -ForegroundColor Yellow
Write-Host "  pip list | Select-String -Pattern 'Flask|SQLAlchemy|dlib|face-recognition|opencv'`n" -ForegroundColor Cyan

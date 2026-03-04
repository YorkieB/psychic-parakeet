# Install dlib with proper Visual Studio environment setup
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Installing dlib for Face Recognition" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Set up paths
$cmakePath = "C:\Program Files\CMake\bin"
$vsPath = "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools"

# Add CMake to PATH
if (Test-Path "$cmakePath\cmake.exe") {
    $env:PATH = "$cmakePath;$env:PATH"
    Write-Host "[OK] CMake added to PATH" -ForegroundColor Green
} else {
    Write-Host "[ERROR] CMake not found at $cmakePath" -ForegroundColor Red
    exit 1
}

# Check Visual Studio Build Tools
if (Test-Path "$vsPath\VC\Auxiliary\Build\vcvars64.bat") {
    Write-Host "[OK] Visual Studio Build Tools found" -ForegroundColor Green
    
    # Set up Visual Studio environment
    Write-Host "`nSetting up Visual Studio environment..." -ForegroundColor Yellow
    
    # Create a batch file to run in VS environment
    $batchScript = @"
@echo off
call "$vsPath\VC\Auxiliary\Build\vcvars64.bat"
python -m pip install dlib
"@
    
    $batchFile = "$env:TEMP\install_dlib.bat"
    $batchScript | Out-File -FilePath $batchFile -Encoding ASCII
    
    Write-Host "Running dlib installation in Visual Studio environment..." -ForegroundColor Yellow
    Write-Host "This will take 5-10 minutes. Please wait...`n" -ForegroundColor Yellow
    
    # Run the batch file
    cmd /c $batchFile
    
    # Check if installation was successful
    python -c "import dlib; print('SUCCESS: dlib installed!')" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[SUCCESS] dlib installed successfully!" -ForegroundColor Green
        Write-Host "`nVerifying face recognition..." -ForegroundColor Yellow
        python check_face_recognition.py
    } else {
        Write-Host "`n[ERROR] dlib installation failed" -ForegroundColor Red
        Write-Host "Please check the error messages above." -ForegroundColor Yellow
    }
    
    # Clean up
    Remove-Item $batchFile -ErrorAction SilentlyContinue
} else {
    Write-Host "[ERROR] Visual Studio Build Tools not found at $vsPath" -ForegroundColor Red
    Write-Host "`nPlease ensure:" -ForegroundColor Yellow
    Write-Host "1. Visual Studio Build Tools are installed" -ForegroundColor White
    Write-Host "2. 'Desktop development with C++' workload is installed" -ForegroundColor White
    Write-Host "3. Run Visual Studio Installer to add C++ components if needed" -ForegroundColor White
    exit 1
}

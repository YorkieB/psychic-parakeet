# Quick CMake Installation Guide for PowerShell
# Run this script to get instructions

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CMake Installation Guide" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "To install face recognition, you need CMake installed on your system.`n" -ForegroundColor Yellow

Write-Host "STEP 1: Download CMake" -ForegroundColor Green
Write-Host "  URL: https://cmake.org/download/" -ForegroundColor White
Write-Host "  File: Windows x64 Installer (cmake-3.x.x-windows-x86_64.msi)`n" -ForegroundColor White

Write-Host "STEP 2: Install CMake" -ForegroundColor Green
Write-Host "  - Run the installer" -ForegroundColor White
Write-Host "  - IMPORTANT: Check 'Add CMake to system PATH for all users'" -ForegroundColor Yellow
Write-Host "  - Complete installation`n" -ForegroundColor White

Write-Host "STEP 3: Restart Terminal" -ForegroundColor Green
Write-Host "  - Close this PowerShell window" -ForegroundColor White
Write-Host "  - Open a new PowerShell window`n" -ForegroundColor White

Write-Host "STEP 4: Verify Installation" -ForegroundColor Green
Write-Host "  Run: cmake --version" -ForegroundColor Cyan
Write-Host "  Should show: cmake version 3.x.x`n" -ForegroundColor White

Write-Host "STEP 5: Install dlib" -ForegroundColor Green
Write-Host "  Run: python -m pip install dlib" -ForegroundColor Cyan
Write-Host "  (This will take 5-10 minutes)`n" -ForegroundColor White

Write-Host "STEP 6: Verify Face Recognition" -ForegroundColor Green
Write-Host "  Run: python -c `"import face_recognition; import dlib; print('Success!')`"" -ForegroundColor Cyan
Write-Host "`n========================================`n" -ForegroundColor Cyan

Write-Host "Alternative: Use Conda (Easier)" -ForegroundColor Yellow
Write-Host "  conda install -c conda-forge dlib" -ForegroundColor Cyan
Write-Host "  python -m pip install face-recognition face-recognition-models`n" -ForegroundColor Cyan

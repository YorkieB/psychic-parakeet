#!/usr/bin/env pwsh
# Rebuild and Restart Jarvis Desktop App

Write-Host "🚗 KITT Scanner - Rebuild and Restart" -ForegroundColor Red
Write-Host "=====================================" -ForegroundColor Red
Write-Host ""

# Stop existing Electron process
Write-Host "Stopping Electron..." -ForegroundColor Yellow
Get-Process -Name electron -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# Navigate to desktop app directory
Set-Location jarvis-desktop

# Rebuild renderer
Write-Host "Building renderer..." -ForegroundColor Yellow
npm run build:renderer

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Starting desktop app..." -ForegroundColor Yellow

    # Start the app
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal

    Write-Host "✅ Desktop app starting!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚗 KITT Scanner - WITH PAUSE DETECTION!" -ForegroundColor Red
    Write-Host "   • Scanner activates on every Jarvis response" -ForegroundColor Cyan
    Write-Host "   • Stops exactly when speech ends" -ForegroundColor Cyan
    Write-Host "   • NEW: Pauses during speech pauses" -ForegroundColor Yellow
    Write-Host "   • NEW: Resumes when speech continues" -ForegroundColor Yellow
    Write-Host "   • Smooth 0.5 second fade out" -ForegroundColor Cyan
    Write-Host "   • Welcome message triggers scanner" -ForegroundColor Cyan
    Write-Host "   • Test button: 🚗 TEST KITT" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✨ NEW: Real-time pause detection!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ready for duty, Michael! 🎬" -ForegroundColor Red
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host "Check the errors above." -ForegroundColor Yellow
}

# Return to original directory
Set-Location ..

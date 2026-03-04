#!/usr/bin/env pwsh
# Install and Launch JARVIS Launcher

Write-Host "🚗 JARVIS Desktop Launcher - Setup" -ForegroundColor Red
Write-Host "====================================" -ForegroundColor Red
Write-Host ""

# Navigate to launcher directory
if (-not (Test-Path "jarvis-launcher")) {
    Write-Host "❌ jarvis-launcher directory not found!" -ForegroundColor Red
    Write-Host "Make sure you're in the correct directory." -ForegroundColor Yellow
    exit 1
}

Set-Location jarvis-launcher

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed!" -ForegroundColor Green
    Write-Host ""
    
    # Ask user what to do
    Write-Host "What would you like to do?" -ForegroundColor Cyan
    Write-Host "1. Start launcher in development mode" -ForegroundColor White
    Write-Host "2. Build Windows executable" -ForegroundColor White
    Write-Host "3. Build all platforms" -ForegroundColor White
    Write-Host "4. Exit" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Enter choice (1-4)"
    
    switch ($choice) {
        "1" {
            Write-Host ""
            Write-Host "🚀 Starting JARVIS Launcher..." -ForegroundColor Green
            npm start
        }
        "2" {
            Write-Host ""
            Write-Host "🔨 Building Windows executable..." -ForegroundColor Yellow
            npm run build:win
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✅ Build complete!" -ForegroundColor Green
                Write-Host "📦 Executable location: dist/" -ForegroundColor Cyan
                Write-Host ""
                
                # Ask if user wants to run it
                $run = Read-Host "Run the executable now? (y/n)"
                if ($run -eq "y") {
                    $exePath = Get-ChildItem -Path dist -Filter "*.exe" | Select-Object -First 1
                    if ($exePath) {
                        Start-Process $exePath.FullName
                    }
                }
            }
        }
        "3" {
            Write-Host ""
            Write-Host "🔨 Building for all platforms..." -ForegroundColor Yellow
            npm run build
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✅ Build complete!" -ForegroundColor Green
                Write-Host "📦 Executables location: dist/" -ForegroundColor Cyan
            }
        }
        "4" {
            Write-Host "Goodbye! 👋" -ForegroundColor Yellow
        }
        default {
            Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        }
    }
} else {
    Write-Host "❌ Installation failed!" -ForegroundColor Red
    Write-Host "Check the errors above." -ForegroundColor Yellow
}

Set-Location ..

Write-Host ""
Write-Host "🚗 KITT is standing by, Michael!" -ForegroundColor Red

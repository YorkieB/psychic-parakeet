# Jarvis Complete Startup Script

param(
    [switch]$SkipBackend = $false,
    [switch]$SkipDesktop = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🤖 Starting Jarvis AI Assistant..." -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$backendDir = $rootDir
$desktopDir = Join-Path $rootDir "jarvis-desktop"

# 1. Free port 3000
if (-not $SkipBackend) {
    Write-Host "1️⃣  Checking port 3000..." -ForegroundColor Yellow
    & "$scriptDir\free-port.ps1" -Port 3000
    Write-Host ""
}

# 2. Start PM2 backend
if (-not $SkipBackend) {
    Write-Host "2️⃣  Starting backend with PM2..." -ForegroundColor Yellow
    Set-Location $backendDir
    
    # Check if PM2 is installed
    try {
        pm2 --version | Out-Null
    } catch {
        Write-Host "❌ PM2 not found. Installing..." -ForegroundColor Red
        npm install -g pm2
    }
    
    # Start backend
    pm2 start ecosystem.config.js --no-daemon
    
    # Wait for backend (max 30 seconds)
    $maxWait = 30
    $waited = 0
    Write-Host "   Waiting for backend to be ready..." -ForegroundColor Yellow
    
    while ($waited -lt $maxWait) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host "   ✅ Backend is ready!" -ForegroundColor Green
                break
            }
        } catch {
            Start-Sleep -Seconds 1
            $waited++
            Write-Host "   Waiting... ($waited/$maxWait)" -ForegroundColor Gray
        }
    }
    
    if ($waited -ge $maxWait) {
        Write-Host "   ❌ Backend failed to start!" -ForegroundColor Red
        Write-Host "   Checking PM2 logs..." -ForegroundColor Yellow
        pm2 logs jarvis-backend --lines 20 --nostream
        exit 1
    }
    
    Write-Host ""
}

# 3. Start Electron app
if (-not $SkipDesktop) {
    Write-Host "3️⃣  Starting Electron app..." -ForegroundColor Yellow
    Set-Location $desktopDir
    
    if (Test-Path "node_modules") {
        npm start
    } else {
        Write-Host "   ⚠️  Desktop app not built. Run 'npm install' first." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎉 Jarvis started successfully!" -ForegroundColor Green

# Jarvis Stable Startup Script
# This script ensures Jarvis runs stably with auto-restart on crashes

param(
    [switch]$Dev,
    [switch]$Dashboard,
    [switch]$All
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Jarvis Stable Startup" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

# Check if PM2 is installed
$pm2Check = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Check) {
    Write-Host "⚠️  PM2 not found. Installing globally..." -ForegroundColor Yellow
    npm install -g pm2
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install PM2. Please run: npm install -g pm2" -ForegroundColor Red
        exit 1
    }
}

# Navigate to project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "📁 Project root: $projectRoot" -ForegroundColor Gray

# Create logs directory if it doesn't exist
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Write-Host "📁 Created logs directory" -ForegroundColor Gray
}

# Build TypeScript if needed
if (-not (Test-Path "dist/index.js") -or $Dev) {
    Write-Host "🔨 Building TypeScript..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Build complete" -ForegroundColor Green
}

# Stop any existing PM2 processes
Write-Host "🛑 Stopping existing processes..." -ForegroundColor Yellow
pm2 delete all 2>$null

# Start with PM2
if ($All -or $Dashboard) {
    Write-Host "🚀 Starting Jarvis Backend + Dashboard with PM2..." -ForegroundColor Cyan
    pm2 start ecosystem.config.js
} else {
    Write-Host "🚀 Starting Jarvis Backend with PM2..." -ForegroundColor Cyan
    pm2 start ecosystem.config.js --only jarvis-backend
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start with PM2" -ForegroundColor Red
    exit 1
}

# Wait for startup
Start-Sleep -Seconds 3

# Show status
Write-Host ""
Write-Host "📊 PM2 Status:" -ForegroundColor Cyan
pm2 status

Write-Host ""
Write-Host "✅ Jarvis is running!" -ForegroundColor Green
Write-Host ""
Write-Host "📌 Useful commands:" -ForegroundColor Yellow
Write-Host "   pm2 logs          - View logs"
Write-Host "   pm2 status        - Check status"
Write-Host "   pm2 restart all   - Restart all"
Write-Host "   pm2 stop all      - Stop all"
Write-Host ""
Write-Host "🌐 API: http://localhost:3000" -ForegroundColor Cyan
if ($All -or $Dashboard) {
    Write-Host "📊 Dashboard: http://localhost:5173" -ForegroundColor Cyan
}
Write-Host ""

# Save PM2 process list for auto-restart on system reboot
pm2 save

Write-Host "💾 PM2 process list saved" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 To enable auto-start on system boot, run:" -ForegroundColor Yellow
Write-Host "   pm2 startup" -ForegroundColor White

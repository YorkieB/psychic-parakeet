# Simple Redis startup script
# Uses Memurai (Redis-compatible) or provides instructions

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Redis Setup for Vision Engine" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Option 1: Check if Memurai is installed (Redis-compatible for Windows)
$memuraiInstalled = Get-Command memurai -ErrorAction SilentlyContinue

if ($memuraiInstalled) {
    Write-Host "[OK] Memurai found (Redis-compatible)" -ForegroundColor Green
    Write-Host "Starting Memurai..." -ForegroundColor Yellow
    Start-Process memurai -WindowStyle Hidden
    Start-Sleep -Seconds 2
    $redisRunning = Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($redisRunning) {
        Write-Host "[OK] Memurai started successfully" -ForegroundColor Green
        exit 0
    }
}

# Option 2: Check if Redis is in PATH
$redisInstalled = Get-Command redis-server -ErrorAction SilentlyContinue

if ($redisInstalled) {
    Write-Host "[OK] Redis found" -ForegroundColor Green
    Write-Host "Starting Redis server..." -ForegroundColor Yellow
    
    # Check if already running
    $redisRunning = Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($redisRunning) {
        Write-Host "[OK] Redis is already running" -ForegroundColor Green
        exit 0
    }
    
    # Start Redis
    Start-Process redis-server -WindowStyle Hidden
    Start-Sleep -Seconds 2
    
    $redisRunning = Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($redisRunning) {
        Write-Host "[OK] Redis started successfully" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "[WARNING] Redis process started but port not responding" -ForegroundColor Yellow
    }
}

# Option 3: Provide instructions
Write-Host "[INFO] Redis not found. Vision Engine will work without Redis (caching disabled)" -ForegroundColor Yellow
Write-Host ""
Write-Host "To enable Redis caching, install one of:" -ForegroundColor Cyan
Write-Host "1. Memurai (Recommended for Windows): https://www.memurai.com/get-memurai" -ForegroundColor White
Write-Host "2. Redis for Windows: https://github.com/microsoftarchive/redis/releases" -ForegroundColor White
Write-Host "3. Docker: docker run -d -p 6379:6379 redis" -ForegroundColor White
Write-Host ""
Write-Host "Vision Engine will continue without Redis (optional feature)" -ForegroundColor Green

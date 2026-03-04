# Install and Start Redis for Windows
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Redis Installation for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Redis is already installed
$redisInstalled = Get-Command redis-server -ErrorAction SilentlyContinue

if ($redisInstalled) {
    Write-Host "[OK] Redis is already installed" -ForegroundColor Green
    Write-Host "Starting Redis server..." -ForegroundColor Yellow
    
    # Check if Redis is already running
    $redisRunning = Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue
    
    if ($redisRunning) {
        Write-Host "[OK] Redis is already running on port 6379" -ForegroundColor Green
    } else {
        # Start Redis in background
        Start-Process redis-server -WindowStyle Hidden
        Start-Sleep -Seconds 2
        
        $redisRunning = Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($redisRunning) {
            Write-Host "[OK] Redis started successfully" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] Failed to start Redis" -ForegroundColor Red
            Write-Host "Try running manually: redis-server" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "[INFO] Redis not found. Installing via Chocolatey..." -ForegroundColor Yellow
    Write-Host ""
    
    # Check if Chocolatey is installed
    $chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue
    
    if (-not $chocoInstalled) {
        Write-Host "[ERROR] Chocolatey not found. Please install Redis manually:" -ForegroundColor Red
        Write-Host "1. Download from: https://github.com/microsoftarchive/redis/releases" -ForegroundColor White
        Write-Host "2. Or install Chocolatey: https://chocolatey.org/install" -ForegroundColor White
        Write-Host "3. Then run: choco install redis-64" -ForegroundColor White
        exit 1
    }
    
    Write-Host "Installing Redis..." -ForegroundColor Yellow
    choco install redis-64 -y
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Redis installed successfully" -ForegroundColor Green
        Write-Host "Starting Redis server..." -ForegroundColor Yellow
        Start-Process redis-server -WindowStyle Hidden
        Start-Sleep -Seconds 2
        
        $redisRunning = Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($redisRunning) {
            Write-Host "[OK] Redis started successfully" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Redis installed but not running. Start manually: redis-server" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[ERROR] Failed to install Redis" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Redis Setup Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

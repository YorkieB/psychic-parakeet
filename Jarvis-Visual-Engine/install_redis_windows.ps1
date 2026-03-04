# Install Redis for Windows
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installing Redis for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Method 1: Try winget (Windows Package Manager)
Write-Host "Method 1: Trying winget..." -ForegroundColor Yellow
$wingetAvailable = Get-Command winget -ErrorAction SilentlyContinue

if ($wingetAvailable) {
    Write-Host "Installing Redis via winget..." -ForegroundColor Green
    winget install Redis.Redis -y
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Redis installed via winget" -ForegroundColor Green
        
        # Find Redis installation
        $redisPath = Get-ChildItem "C:\Program Files" -Recurse -Filter "redis-server.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        
        if ($redisPath) {
            Write-Host "Found Redis at: $($redisPath.DirectoryName)" -ForegroundColor Green
            $redisDir = $redisPath.DirectoryName
            
            # Start Redis
            Write-Host "Starting Redis server..." -ForegroundColor Yellow
            Start-Process "$redisDir\redis-server.exe" -WindowStyle Hidden
            
            Start-Sleep -Seconds 3
            
            # Test connection
            $redisRunning = Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue
            if ($redisRunning) {
                Write-Host "[OK] Redis is running on port 6379" -ForegroundColor Green
                Write-Host ""
                Write-Host "Redis installation complete!" -ForegroundColor Green
                exit 0
            }
        }
    }
}

# Method 2: Download and install Redis for Windows
Write-Host ""
Write-Host "Method 2: Downloading Redis for Windows..." -ForegroundColor Yellow

$redisUrl = "https://github.com/microsoftarchive/redis/releases/download/win-3.0.504/Redis-x64-3.0.504.zip"
$downloadPath = "$env:TEMP\Redis-x64-3.0.504.zip"
$installPath = "C:\Redis"

try {
    Write-Host "Downloading Redis..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $redisUrl -OutFile $downloadPath -UseBasicParsing
    
    Write-Host "Extracting Redis..." -ForegroundColor Yellow
    if (Test-Path $installPath) {
        Remove-Item $installPath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $installPath -Force | Out-Null
    Expand-Archive -Path $downloadPath -DestinationPath $installPath -Force
    
    Write-Host "[OK] Redis extracted to $installPath" -ForegroundColor Green
    
    # Start Redis
    Write-Host "Starting Redis server..." -ForegroundColor Yellow
    $redisServer = Join-Path $installPath "redis-server.exe"
    
    if (Test-Path $redisServer) {
        Start-Process $redisServer -WindowStyle Hidden
        Start-Sleep -Seconds 3
        
        # Test connection
        $redisRunning = Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($redisRunning) {
            Write-Host "[OK] Redis is running on port 6379" -ForegroundColor Green
            Write-Host ""
            Write-Host "Redis installation complete!" -ForegroundColor Green
            Write-Host "Redis server: $redisServer" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "To start Redis manually in the future:" -ForegroundColor Yellow
            Write-Host "  $redisServer" -ForegroundColor White
            exit 0
        } else {
            Write-Host "[WARNING] Redis process started but port not responding" -ForegroundColor Yellow
            Write-Host "Try running manually: $redisServer" -ForegroundColor White
        }
    }
} catch {
    Write-Host "[ERROR] Failed to download/install Redis: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual installation options:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://github.com/microsoftarchive/redis/releases" -ForegroundColor White
    Write-Host "2. Or use Memurai: https://www.memurai.com/get-memurai" -ForegroundColor White
    Write-Host "3. Or use Docker: docker run -d -p 6379:6379 redis" -ForegroundColor White
    exit 1
}

# Cleanup
if (Test-Path $downloadPath) {
    Remove-Item $downloadPath -Force
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Redis Setup Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

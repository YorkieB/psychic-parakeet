# Free port 3000 (or specified port)
param(
    [int]$Port = 3000
)

Write-Host "Checking port $Port..." -ForegroundColor Yellow

$process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "Killing process $process on port $Port" -ForegroundColor Red
    try {
        Stop-Process -Id $process -Force -ErrorAction Stop
        Start-Sleep -Seconds 1
        Write-Host "✅ Port $Port is now free" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Could not kill process $process : $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ Port $Port is already free" -ForegroundColor Green
}

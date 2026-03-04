# Start Vision Engine with Flask API Server
# Correct path: C:\Users\conta\Jarvis Visual Engine\Jarvis Visual Engine

$projectPath = "C:\Users\conta\Jarvis Visual Engine\Jarvis Visual Engine"
$pythonExe = "C:\Users\conta\miniconda3\envs\vision-engine\python.exe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Vision Engine with Flask API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set working directory
Set-Location $projectPath

# Set environment variables
$env:PYTHONPATH = $projectPath
$env:PATH = "C:\Users\conta\miniconda3\envs\vision-engine;C:\Users\conta\miniconda3\envs\vision-engine\Scripts;C:\Users\conta\miniconda3\envs\vision-engine\Library\bin;$env:PATH"

Write-Host "Project path: $projectPath" -ForegroundColor Green
Write-Host "Python: $pythonExe" -ForegroundColor Green
Write-Host ""

# Start the server
Write-Host "Starting Vision Engine..." -ForegroundColor Yellow
& $pythonExe -m src.main

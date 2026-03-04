# Reset PostgreSQL Password Script
# This will reset the postgres user password to match .env

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Password Reset" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find PostgreSQL installation
$pgPaths = @(
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files\PostgreSQL\14\bin",
    "C:\Program Files\PostgreSQL\13\bin"
)

$found = $null
foreach ($path in $pgPaths) {
    if (Test-Path $path) {
        $found = $path
        break
    }
}

if (-not $found) {
    Write-Host "[ERROR] PostgreSQL not found in standard locations" -ForegroundColor Red
    Write-Host "Please install PostgreSQL or update this script with your installation path" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found PostgreSQL at: $found" -ForegroundColor Green
Write-Host ""

# Read password from .env
$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "[ERROR] .env file not found at: $envFile" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content $envFile -Raw
if ($envContent -match "DB_PASSWORD=(.+)") {
    $newPassword = $matches[1].Trim()
    Write-Host "Password from .env: $newPassword" -ForegroundColor Cyan
} else {
    Write-Host "[ERROR] DB_PASSWORD not found in .env" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Attempting to reset password..." -ForegroundColor Yellow
Write-Host "Note: You may be prompted for the current postgres password" -ForegroundColor Yellow
Write-Host ""

# Try to reset password
$psqlPath = Join-Path $found "psql.exe"
$resetCommand = "ALTER USER postgres WITH PASSWORD '$newPassword';"

try {
    # Try without password first (trust authentication)
    $result = & $psqlPath -U postgres -d postgres -c $resetCommand 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Password reset successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now start the Vision Engine:" -ForegroundColor Cyan
        Write-Host "  python -m src.main" -ForegroundColor White
    } else {
        Write-Host "[INFO] Direct connection failed. Trying interactive mode..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Please run this command manually:" -ForegroundColor Cyan
        Write-Host "  cd `"$found`"" -ForegroundColor White
        Write-Host "  .\psql.exe -U postgres" -ForegroundColor White
        Write-Host "  ALTER USER postgres WITH PASSWORD '$newPassword';" -ForegroundColor White
        Write-Host "  \q" -ForegroundColor White
    }
} catch {
    Write-Host "[ERROR] Failed to reset password: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run these commands manually:" -ForegroundColor Yellow
    Write-Host "  cd `"$found`"" -ForegroundColor White
    Write-Host "  .\psql.exe -U postgres" -ForegroundColor White
    Write-Host "  ALTER USER postgres WITH PASSWORD '$newPassword';" -ForegroundColor White
    Write-Host "  \q" -ForegroundColor White
}

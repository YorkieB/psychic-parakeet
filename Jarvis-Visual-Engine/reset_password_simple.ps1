# Simple PostgreSQL Password Reset
# Run this in PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Password Reset (Simple)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$pgBin = "C:\Program Files\PostgreSQL\16\bin"
$newPassword = "postgres"

Write-Host "This will reset the postgres user password to: $newPassword" -ForegroundColor Yellow
Write-Host ""
Write-Host "You will be prompted for the CURRENT postgres password." -ForegroundColor Cyan
Write-Host "This is the password you set when you installed PostgreSQL." -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Enter to continue, or Ctrl+C to cancel..." -ForegroundColor Green
Read-Host

Write-Host ""
Write-Host "Connecting to PostgreSQL..." -ForegroundColor Yellow
Write-Host ""

# Set environment variable for password prompt
$env:PGPASSWORD = ""

# Run psql command
cd $pgBin
$sql = "ALTER USER postgres WITH PASSWORD '$newPassword';"
& .\psql.exe -U postgres -d postgres -c $sql

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Password reset successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now start the Vision Engine:" -ForegroundColor Cyan
    Write-Host "  python -m src.main" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "[ERROR] Password reset failed." -ForegroundColor Red
    Write-Host ""
    Write-Host "If you don't know the current password, try:" -ForegroundColor Yellow
    Write-Host "1. Check if you wrote it down during installation" -ForegroundColor White
    Write-Host "2. Or use pgAdmin (if installed) to reset it" -ForegroundColor White
    Write-Host "3. Or reinstall PostgreSQL and set password to 'postgres'" -ForegroundColor White
}

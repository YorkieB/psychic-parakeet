# Setup PM2 to start on Windows boot

Write-Host "🔧 Setting up PM2 Windows startup..." -ForegroundColor Cyan
Write-Host ""

# Check if PM2 is installed
try {
    $pm2Version = pm2 --version
    Write-Host "✅ PM2 version: $pm2Version" -ForegroundColor Green
} catch {
    Write-Host "❌ PM2 not found. Installing..." -ForegroundColor Red
    npm install -g pm2
}

Write-Host ""
Write-Host "📋 Running PM2 startup command..." -ForegroundColor Yellow
Write-Host "   (This will generate a command for you to run as Administrator)" -ForegroundColor Gray
Write-Host ""

# Run PM2 startup
pm2 startup

Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Copy the command that PM2 output above" -ForegroundColor White
Write-Host "   2. Run PowerShell as Administrator" -ForegroundColor White
Write-Host "   3. Paste and run that command" -ForegroundColor White
Write-Host "   4. Then run: pm2 save" -ForegroundColor White
Write-Host ""

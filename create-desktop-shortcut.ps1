#!/usr/bin/env pwsh
# Create Desktop Shortcut for JARVIS

Write-Host "🚗 Creating JARVIS Desktop Shortcut..." -ForegroundColor Red
Write-Host ""

$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "JARVIS AI.lnk"
$TargetPath = Join-Path $PSScriptRoot "Launch JARVIS.bat"

$IconPath = Join-Path $PSScriptRoot "jarvis-icon.ico"

# Generate icon if it doesn't exist yet
if (-not (Test-Path $IconPath)) {
    Write-Host "Generating Jarvis icon..." -ForegroundColor Yellow
    $GenScript = Join-Path $PSScriptRoot "scripts\generate-jarvis-icon.ps1"
    if (Test-Path $GenScript) {
        & $GenScript
    }
}

try {
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $TargetPath
    $Shortcut.Description = "JARVIS AI Assistant - KITT Scanner Mode"
    $Shortcut.WorkingDirectory = $PSScriptRoot
    if (Test-Path $IconPath) {
        $Shortcut.IconLocation = "$IconPath, 0"
    }
    $Shortcut.Save()

    Write-Host "✅ Success! Shortcut created on desktop!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Location: $ShortcutPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🎯 Double-click 'JARVIS AI' on your desktop to launch!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Features:" -ForegroundColor White
    Write-Host "  • Launches backend server" -ForegroundColor Gray
    Write-Host "  • Starts desktop app" -ForegroundColor Gray
    Write-Host "  • Activates KITT scanner" -ForegroundColor Gray
    Write-Host "  • Ready in 8 seconds!" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🚗 JARVIS is ready for deployment, Michael!" -ForegroundColor Red

} catch {
    Write-Host "❌ Error creating shortcut: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual method:" -ForegroundColor Yellow
    Write-Host "1. Right-click 'Launch JARVIS.bat'" -ForegroundColor White
    Write-Host "2. Send to → Desktop (create shortcut)" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

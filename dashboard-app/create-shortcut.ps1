# Creates a desktop shortcut for Jarvis Health Dashboard
$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [System.Environment]::GetFolderPath('Desktop')
$Shortcut = $WshShell.CreateShortcut("$Desktop\Jarvis Health Dashboard.lnk")
$Shortcut.TargetPath = Join-Path $PSScriptRoot "launch-dashboard.bat"
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Description = "Launch Jarvis Health Dashboard"
$Shortcut.WindowStyle = 7
$Shortcut.Save()
Write-Host "Desktop shortcut created: $Desktop\Jarvis Health Dashboard.lnk"

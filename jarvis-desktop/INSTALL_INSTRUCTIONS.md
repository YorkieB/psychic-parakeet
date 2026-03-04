# Installation Instructions

## Desktop Shortcut Created ✅

A desktop shortcut has been created pointing to:
```
C:\Users\conta\Jarvis Ochestrator\jarvis-desktop\release\win-unpacked\Jarvis AI Assistant.exe
```

## To Install to Program Files (Requires Admin)

If you want to install to `C:\Program Files\Jarvis\`, you need to run PowerShell as Administrator:

1. **Right-click PowerShell** → **Run as Administrator**
2. Run these commands:

```powershell
cd "C:\Users\conta\Jarvis Ochestrator\jarvis-desktop"
$sourcePath = "release\win-unpacked"
$destPath = "C:\Program Files\Jarvis"
New-Item -ItemType Directory -Path $destPath -Force
Copy-Item -Path "$sourcePath\*" -Destination $destPath -Recurse -Force

# Update desktop shortcut
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = "$desktopPath\Jarvis AI Assistant.lnk"
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "$destPath\Jarvis AI Assistant.exe"
$Shortcut.WorkingDirectory = $destPath
$Shortcut.Description = "Jarvis AI Assistant"
$Shortcut.IconLocation = "$destPath\Jarvis AI Assistant.exe"
$Shortcut.Save()
```

## Alternative: Install to User Directory (No Admin Needed)

Or install to your user directory (no admin required):

```powershell
cd "C:\Users\conta\Jarvis Ochestrator\jarvis-desktop"
$sourcePath = "release\win-unpacked"
$destPath = "$env:LOCALAPPDATA\Jarvis"
New-Item -ItemType Directory -Path $destPath -Force
Copy-Item -Path "$sourcePath\*" -Destination $destPath -Recurse -Force

# Update desktop shortcut
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = "$desktopPath\Jarvis AI Assistant.lnk"
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "$destPath\Jarvis AI Assistant.exe"
$Shortcut.WorkingDirectory = $destPath
$Shortcut.Description = "Jarvis AI Assistant"
$Shortcut.IconLocation = "$destPath\Jarvis AI Assistant.exe"
$Shortcut.Save()
```

This installs to: `C:\Users\conta\AppData\Local\Jarvis\`

## Current Status

✅ **Desktop shortcut created** - You can launch Jarvis now!
⚠️ **Program Files install** - Requires Administrator privileges

The app works perfectly from its current location - you don't need to move it unless you want to!

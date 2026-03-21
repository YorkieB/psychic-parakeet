# Quick Instructions to Add JARVIS to Your Desktop

## Option 1: Simple Batch File (Fastest)

1. Find the file: `Launch JARVIS.bat` in your project folder
2. Right-click it → Send to → Desktop (create shortcut)
3. Done! Double-click the shortcut to launch JARVIS

## Option 2: Create Desktop Shortcut Manually

1. Right-click on your desktop
2. New → Shortcut
3. Type location: `C:\Users\conta\Jarvis Ochestrator\Launch JARVIS.bat`
4. Click Next
5. Name it: "🚗 JARVIS AI"
6. Click Finish

## Option 3: Quick PowerShell Script

Run this in PowerShell (as Administrator):

```powershell
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$Home\Desktop\JARVIS AI.lnk")
$Shortcut.TargetPath = "C:\Users\conta\Jarvis Ochestrator\Launch JARVIS.bat"
$Shortcut.Description = "JARVIS AI Assistant - KITT Mode"
$Shortcut.WorkingDirectory = "C:\Users\conta\Jarvis Ochestrator"
$Shortcut.Save()
```

## What Happens When You Click:

1. ✅ Backend server starts (port 3000)
2. ✅ Waits 5 seconds for initialization
3. ✅ Desktop app launches
4. ✅ KITT scanner activates
5. ✅ Ready to use!

## File Location:

The batch file is here:
```
C:\Users\conta\Jarvis Ochestrator\Launch JARVIS.bat
```

## To Add Custom Icon (Optional):

1. Find a `.ico` file online (search "KITT icon" or "AI assistant icon")
2. Save it as: `jarvis-icon.ico` in your project folder
3. Right-click the desktop shortcut → Properties
4. Click "Change Icon"
5. Browse to your `.ico` file
6. Click OK

---

**That's it! You now have a desktop launcher for JARVIS!** 🚗💨

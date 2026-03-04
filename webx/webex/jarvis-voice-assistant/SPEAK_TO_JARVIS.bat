@echo off
REM Jarvis Voice Input Launcher - Fixed Version
echo.
echo ================================================
echo    JARVIS - Voice Input Mode (Error-Free!)
echo    SPEAK to Jarvis with your microphone!
echo ================================================
echo.

cd /d "%~dp0"
.\jarvis-env\Scripts\python.exe speak_to_jarvis_fixed.py

pause

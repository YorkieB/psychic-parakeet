@echo off
title JARVIS - Smart Voice Detection
color 0A

echo.
echo ====================================================
echo    JARVIS - VOICE ACTIVITY DETECTION
echo    Automatically stops when you finish speaking!
echo ====================================================
echo.

cd /d "%~dp0"
"%~dp0jarvis-env\Scripts\python.exe" "%~dp0talk_to_jarvis_vad.py"

echo.
echo ====================================================
echo    Jarvis has shut down
echo ====================================================
echo.
pause

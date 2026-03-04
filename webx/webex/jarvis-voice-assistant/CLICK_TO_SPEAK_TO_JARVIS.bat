@echo off
title JARVIS - Speak to Me!
color 0A

echo.
echo ====================================================
echo    JARVIS VOICE ASSISTANT
echo    Press ENTER to record your voice!
echo ====================================================
echo.
echo Starting Jarvis...
echo.

cd /d "%~dp0"

"%~dp0jarvis-env\Scripts\python.exe" "%~dp0talk_to_jarvis_working.py"

echo.
echo ====================================================
echo    Jarvis has shut down
echo ====================================================
echo.
pause

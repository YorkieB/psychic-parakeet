@echo off
REM Jarvis Simple Chat Launcher
echo.
echo ================================================
echo    Starting Jarvis Simple Chat
echo    (You type, Jarvis speaks)
echo ================================================
echo.

cd /d "%~dp0"
.\jarvis-env\Scripts\python.exe chat_with_jarvis_simple.py

pause

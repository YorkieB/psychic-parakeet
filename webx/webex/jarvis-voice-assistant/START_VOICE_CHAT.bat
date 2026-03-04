@echo off
REM Jarvis Voice Chat Launcher
echo.
echo ================================================
echo    Starting Jarvis Voice Conversation
echo ================================================
echo.

cd /d "%~dp0"
.\jarvis-env\Scripts\python.exe talk_to_jarvis.py

pause

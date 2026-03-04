@echo off
title JARVIS - Complete Voice Assistant
color 0A

echo.
echo ============================================================
echo    JARVIS - COMPLETE VOICE ASSISTANT
echo ============================================================
echo.
echo    Features:
echo    - Voice Activity Detection (auto-stop when you finish)
echo    - Barge-in Support (interrupt Jarvis anytime)
echo    - Natural Conversation
echo.
echo ============================================================
echo.

cd /d "%~dp0"
"%~dp0jarvis-env\Scripts\python.exe" "%~dp0talk_to_jarvis_complete.py"

echo.
echo ============================================================
echo    Jarvis has shut down
echo ============================================================
echo.
pause

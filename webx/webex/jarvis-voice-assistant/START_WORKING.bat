@echo off
title JARVIS - Working Version
color 0A

echo.
echo ============================================================
echo    JARVIS - OpenAI TTS (Working Version)
echo    Stable and Functional
echo ============================================================
echo.

cd /d "%~dp0"
"%~dp0jarvis-env\Scripts\python.exe" "%~dp0jarvis_openai_tts.py"

echo.
pause

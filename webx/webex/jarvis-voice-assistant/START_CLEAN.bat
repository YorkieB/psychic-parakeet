@echo off
title JARVIS - Clean Version (No Errors!)
color 0A

echo.
echo ============================================================
echo    JARVIS - CLEAN VERSION
echo    No Error Messages! Pure Conversation!
echo ============================================================
echo.

cd /d "%~dp0"
"%~dp0jarvis-env\Scripts\python.exe" "%~dp0jarvis_final_clean.py"

echo.
pause

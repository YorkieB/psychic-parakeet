@echo off
title JARVIS - Realtime API (Ultra Low Latency!)
color 0A

echo.
echo ============================================================
echo    JARVIS - OPENAI REALTIME API
echo    Ultra-Low Latency WebSocket Connection
echo ============================================================
echo.

cd /d "%~dp0"
"%~dp0jarvis-env\Scripts\python.exe" "%~dp0jarvis_realtime.py"

echo.
pause

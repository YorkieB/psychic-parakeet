@echo off
title JARVIS - GPU Server Connection
color 0A

echo.
echo ============================================================
echo    JARVIS - YOUR GPU SERVER (RunPod RTX 3090)
echo    Ultra-Low Latency Mode
echo ============================================================
echo.

cd /d "%~dp0"
"%~dp0jarvis-env\Scripts\python.exe" "%~dp0jarvis_gpu_server.py"

echo.
pause

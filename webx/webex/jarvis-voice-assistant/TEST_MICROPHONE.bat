@echo off
title Test Your Microphone
color 0B

echo.
echo ====================================================
echo    MICROPHONE TEST
echo ====================================================
echo.

cd /d "%~dp0"
.\jarvis-env\Scripts\python.exe test_microphone.py

pause

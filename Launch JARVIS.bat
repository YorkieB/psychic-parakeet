@echo off
title JARVIS Launcher - Starting System...
color 0C

echo.
echo ==========================================
echo    JARVIS AI ASSISTANT - SYSTEM LAUNCH
echo ==========================================
echo.
echo  Knight Industries AI System v4.0.0
echo.
echo ==========================================
echo.

echo [0/4] Clearing stale processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [1/4] Starting Local TTS Server (XTTS voice cloning)...
cd /d "C:\Users\conta\Jarvis Ochestrator\local-tts"
start "JARVIS TTS" powershell -NoExit -Command ".\.venv\Scripts\activate; python server.py"
timeout /t 3 /nobreak >nul

echo [2/4] Starting Backend Server...
cd /d "C:\Users\conta\Jarvis Ochestrator"
start "JARVIS Backend" powershell -NoExit -Command "npm start"
timeout /t 5 /nobreak >nul

echo [3/4] Waiting for backend initialization...
timeout /t 3 /nobreak >nul

echo [4/4] Starting Desktop App...
cd /d "C:\Users\conta\Jarvis Ochestrator\jarvis-desktop"
start "JARVIS Desktop" powershell -NoExit -Command "npm run dev"

echo.
echo ==========================================
echo     JARVIS IS STARTING...
echo ==========================================
echo.
echo  TTS:      http://localhost:8020
echo  Backend:  http://localhost:3000
echo  Desktop:  Launching now...
echo.
echo  Scanner:  KITT Mode Active
echo.
echo  Press any key to close this window...
echo ==========================================
pause >nul


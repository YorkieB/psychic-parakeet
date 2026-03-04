@echo off
REM Quick Start Script for LightBrowser with Jarvis Agents
REM This script launches the app and opens DevTools automatically

cd /d "%~dp0"

echo ========================================
echo   LightBrowser - Jarvis Agent System
echo ========================================
echo.
echo Starting application...
echo.

REM Check if npm is available
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm not found. Please install Node.js
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo Starting Electron...
echo ========================================
echo.
echo When the window opens:
echo 1. Press F12 to open DevTools
echo 2. Go to Console tab
echo 3. Copy and paste commands from TEST_AGENTS.md
echo.
echo Quick command to test agents:
echo   window.electronAPI.invoke('jarvis:agents:init').then(console.log)
echo.

REM Start the app
call npm start

pause

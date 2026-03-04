@echo off
title Jarvis Health Dashboard
echo ============================================
echo   Starting Jarvis Health Dashboard...
echo ============================================
echo.

set DASHBOARD_DIR=%~dp0..\dashboard

:: Start IDE server in background
echo [1/3] Starting IDE backend server...
cd /d "%DASHBOARD_DIR%"
start /B "" node "%DASHBOARD_DIR%\ide-server.mjs" 2>&1

:: Wait a moment for IDE server
timeout /t 3 /nobreak >nul

:: Start Vite dev server in background
echo [2/3] Starting dashboard frontend...
start /B "" npx --yes vite --host --port 5173 2>&1

:: Wait for Vite to be ready by polling the port
echo [3/3] Waiting for dashboard to be ready...
set RETRIES=0
:waitloop
timeout /t 2 /nobreak >nul
set /a RETRIES+=1
powershell -Command "try { $r = Invoke-WebRequest -Uri http://localhost:5173 -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :ready
if %RETRIES% GEQ 15 (
    echo   Timed out waiting for dashboard. Opening anyway...
    goto :ready
)
echo   Still starting... (%RETRIES%/15)
goto :waitloop

:ready
echo.
echo   Opening Jarvis Health Dashboard...
echo.

:: Try Edge app mode first, then Chrome, then default browser
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5173 --new-window 2>nul
if %ERRORLEVEL% NEQ 0 (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:5173 --new-window 2>nul
    if %ERRORLEVEL% NEQ 0 (
        start http://localhost:5173
    )
)

echo.
echo   ==========================================
echo   Dashboard is running at http://localhost:5173
echo   IDE backend running at http://localhost:3100
echo   ==========================================
echo.
echo   Close this window to stop all servers.
echo   Press any key to exit...
pause >nul

@echo off
REM Start Vision Engine with Flask API Server
title Vision Engine - Starting...

echo ========================================
echo Starting Vision Engine with Flask API
echo ========================================
echo.

REM Set project path
set "PROJECT_PATH=C:\Users\conta\Jarvis Visual Engine\Jarvis Visual Engine"
set "PYTHON_EXE=C:\Users\conta\miniconda3\envs\vision-engine\python.exe"

REM Change to project directory
cd /d "%PROJECT_PATH%"

REM Set environment variables
set "PYTHONPATH=%PROJECT_PATH%"
set "PATH=C:\Users\conta\miniconda3\envs\vision-engine;C:\Users\conta\miniconda3\envs\vision-engine\Scripts;C:\Users\conta\miniconda3\envs\vision-engine\Library\bin;%PATH%"

echo Project: %PROJECT_PATH%
echo Python: %PYTHON_EXE%
echo.
echo Starting Vision Engine...
echo.

REM Start the server
"%PYTHON_EXE%" -m src.main

REM Keep window open if there's an error
if errorlevel 1 (
    echo.
    echo Error occurred. Press any key to exit...
    pause >nul
)

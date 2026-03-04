@echo off
REM Jarvis REALTIME - OpenAI Realtime API (FASTEST!)
echo ========================================
echo   JARVIS REALTIME MODE
echo   OpenAI Realtime API
echo   Expected: 1-2 second latency!
echo ========================================
cd /d C:\Users\conta\Webex\jarvis-voice-assistant
start "Jarvis Realtime" powershell -NoExit -Command "& {.\jarvis-env\Scripts\python.exe jarvis_realtime_v2.py 2>&1 | Out-String -Stream | Where-Object {$_ -notmatch 'Expression evaluation'}}"

@echo off
REM Jarvis COMPLETE - VAD + Barge-in + Fast
echo ========================================
echo   JARVIS COMPLETE MODE
echo   VAD + Barge-in + Fast (~4-5s)
echo ========================================
cd /d C:\Users\conta\Webex\jarvis-voice-assistant
start "Jarvis Complete" powershell -NoExit -Command "$ErrorActionPreference='SilentlyContinue'; $WarningPreference='SilentlyContinue'; & {.\jarvis-env\Scripts\python.exe jarvis_complete.py 2>$null | Out-String -Stream | Where-Object {$_ -notmatch '(Expression|callback|AttributeError|CallbackContext)'}}"

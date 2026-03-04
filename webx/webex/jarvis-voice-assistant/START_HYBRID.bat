@echo off
REM Jarvis HYBRID - GPU + Fast Cloud TTS
echo ========================================
echo   JARVIS HYBRID MODE
echo   GPU: Whisper + Llama
echo   Cloud: OpenAI TTS (Fast!)
echo ========================================
cd /d C:\Users\conta\Webex\jarvis-voice-assistant
start "Jarvis Hybrid" powershell -NoExit -Command "& {.\jarvis-env\Scripts\python.exe jarvis_hybrid.py 2>&1 | Out-String -Stream | Where-Object {$_ -notmatch 'Expression evaluation'}}"

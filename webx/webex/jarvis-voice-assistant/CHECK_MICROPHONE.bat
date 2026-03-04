@echo off
echo.
echo ====================================================
echo    CHECKING MICROPHONE PERMISSIONS
echo ====================================================
echo.

echo Opening Windows Microphone Settings...
start ms-settings:privacy-microphone

echo.
echo ====================================================
echo INSTRUCTIONS:
echo.
echo 1. Make sure "Microphone access" is ON
echo 2. Make sure "Let desktop apps access microphone" is ON
echo 3. Check that Python/PowerShell can access microphone
echo.
echo After enabling, close this window and try again!
echo ====================================================
echo.

pause

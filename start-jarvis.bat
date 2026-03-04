@echo off
echo Starting Jarvis Services...
echo.

echo Starting Main API Server...
start "Jarvis API" cmd /c "npm run dev:quick"

timeout /t 3 /nobreak >nul

echo Starting External LLM Agent...
start "LLM Agent" cmd /c "ts-node --transpile-only start-llm-agent.ts"

timeout /t 2 /nobreak >nul

echo Starting Ollama Agent...
start "Ollama Agent" cmd /c "ts-node --transpile-only start-ollama-agent.ts"

echo.
echo All Jarvis services started!
echo - Main API: http://localhost:3000
echo - LLM Agent: http://localhost:3028
echo - Ollama Agent: http://localhost:3030
echo.
echo Press any key to stop all services...
pause >nul

echo.
echo Stopping Jarvis services...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Jarvis API*" 2>nul
taskkill /F /IM node.exe /FI "WINDOWTITLE eq LLM Agent*" 2>nul
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Ollama Agent*" 2>nul
echo Services stopped.

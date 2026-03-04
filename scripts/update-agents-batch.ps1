# Batch update script for remaining agents
# This script updates all agents to extend EnhancedBaseAgent

$agents = @(
    "email-agent.ts",
    "code-agent.ts",
    "voice-agent.ts",
    "music-agent.ts",
    "image-agent.ts",
    "video-agent.ts",
    "spotify-agent.ts",
    "apple-music-agent.ts",
    "weather-agent.ts",
    "news-agent.ts",
    "reminder-agent.ts",
    "timer-agent.ts",
    "alarm-agent.ts",
    "story-agent.ts",
    "calculator-agent.ts",
    "unit-converter-agent.ts",
    "translation-agent.ts",
    "command-agent.ts",
    "context-agent.ts",
    "memory-agent.ts",
    "emotion-agent.ts",
    "file-agent.ts",
    "computer-control-agent.ts",
    "llm-agent.ts",
    "personality-agent.ts",
    "listening-agent.ts",
    "speech-agent.ts",
    "voice-command-agent.ts",
    "reliability-agent.ts",
    "emotions-engine-agent.ts",
    "memory-system-agent.ts",
    "visual-engine-agent.ts"
)

$basePath = "src\agents"

foreach ($agent in $agents) {
    $filePath = Join-Path $basePath $agent
    if (Test-Path $filePath) {
        Write-Output "Processing $agent..."
        # File will be updated manually or via search_replace
    } else {
        Write-Output "File not found: $filePath"
    }
}

Write-Output "Batch update script ready. Use search_replace to update each file."

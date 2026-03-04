# Run Ollama with reduced context so it fits in ~15 GiB RAM.
# Use this when you see: "more system memory (36.9 GiB) than is available (15.5 GiB)"
#
# Option A: Set for current session, then run your model
$env:OLLAMA_NUM_CTX = "4096"
Write-Host "OLLAMA_NUM_CTX=$env:OLLAMA_NUM_CTX (reduced context - fits in ~15 GiB)"
Write-Host "Starting Ollama with qwen3-coder:30b..."
ollama run qwen3-coder:30b

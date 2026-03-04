"""
Jarvis AI Server v2 - WITH SHORT RESPONSES!
- Faster-Whisper (STT)
- Ollama Llama 3.1 (AI) - NOW BRIEF!
- Piper TTS
"""
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import FileResponse
import uvicorn
import asyncio
import os
import tempfile
from pathlib import Path
import subprocess
import json

app = FastAPI(title="Jarvis AI Server v2")

PIPER_MODEL = "/workspace/piper-voices/en_US-libritts-high.onnx"

@app.get("/")
async def root():
    return {"status": "online", "version": "v2", "services": ["transcribe", "chat", "speak"]}

@app.get("/health")
async def health():
    return {"status": "healthy", "whisper": "ready", "ollama": "ready", "piper": "ready"}

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """Faster-Whisper STT"""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        from faster_whisper import WhisperModel
        model = WhisperModel('base', device='cuda', compute_type='float16')
        segments, info = model.transcribe(tmp_path)
        
        text = ' '.join([segment.text for segment in segments])
        os.unlink(tmp_path)
        
        return {'text': text.strip(), 'language': info.language}
        
    except Exception as e:
        return {'error': str(e)}

@app.post("/chat")
async def chat(message: str = Form(...)):
    """Ollama Llama 3.1 - SHORT responses!"""
    try:
        # SYSTEM PROMPT to enforce brevity
        system_prompt = "You are Jarvis, a helpful AI assistant. Keep all responses to 1-2 SHORT sentences maximum. Be conversational but BRIEF."
        
        # Construct prompt
        full_prompt = f"{system_prompt}\n\nUser: {message}\n\nAssistant:"
        
        # Call Ollama with strict token limit
        result = subprocess.run(
            ['ollama', 'run', 'llama3.1:8b', '--num-predict', '40', full_prompt],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        response = result.stdout.strip()
        
        # Aggressive truncation - max 2 sentences
        sentences = response.split('. ')
        if len(sentences) > 2:
            response = '. '.join(sentences[:2]) + '.'
        
        # Absolute character limit
        if len(response) > 150:
            response = response[:147] + '...'
        
        return {'response': response}
        
    except Exception as e:
        return {'error': str(e)}

@app.post("/speak")
async def speak(text: str = Form(...)):
    """Piper TTS"""
    try:
        output_file = f'/tmp/speech_{os.getpid()}.wav'
        
        subprocess.run(
            ['piper', '--model', PIPER_MODEL, '--output_file', output_file],
            input=text,
            text=True,
            capture_output=True
        )
        
        if os.path.exists(output_file):
            return FileResponse(output_file, media_type='audio/wav')
        
        return {'error': 'Failed'}
        
    except Exception as e:
        return {'error': str(e)}

if __name__ == "__main__":
    print("Starting Jarvis AI Server v2 on port 59000...")
    print("NOW WITH SHORT RESPONSES!")
    uvicorn.run(app, host="0.0.0.0", port=59000)

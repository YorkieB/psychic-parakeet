"""
Jarvis - OpenAI Realtime API (Clean Version)
Ultra-low latency voice assistant using OpenAI's Realtime API
"""
import asyncio
import base64
import json
import os
import sys
import numpy as np
import sounddevice as sd
import yaml
from websockets.asyncio.client import connect

# Suppress warnings
import warnings
warnings.filterwarnings('ignore')
os.environ['PYTHONWARNINGS'] = 'ignore'

# Windows error suppression
if sys.platform == 'win32':
    import ctypes
    kernel32 = ctypes.windll.kernel32
    kernel32.SetErrorMode(0x0001 | 0x0002 | 0x8000)

class RealtimeJarvis:
    """OpenAI Realtime API - Ultra Fast Voice"""
    
    def __init__(self):
        print("\n" + "="*60)
        print("   JARVIS - REALTIME MODE")
        print("   OpenAI Realtime API (1-2s latency!)")
        print("="*60)
        
        # Load API key
        with open("configs/voice_config.yaml", 'r') as f:
            config = yaml.safe_load(f)
        self.api_key = config.get('stt', {}).get('api_key')
        
        if not self.api_key:
            print("[ERROR] OpenAI API key not found!")
            sys.exit(1)
        
        self.ws = None
        self.audio_queue = asyncio.Queue()
        self.playback_queue = asyncio.Queue()
        self.is_recording = False
        self.is_playing = False
        
        print("\n[READY] Press ENTER to speak, 'quit' to exit\n")
    
    async def connect_realtime(self):
        """Connect to OpenAI Realtime API"""
        url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "OpenAI-Beta": "realtime=v1"
        }
        
        print("Connecting to OpenAI Realtime API...")
        self.ws = await connect(url, additional_headers=headers)
        print("[OK] Connected!\n")
        
        # Configure session
        await self.ws.send(json.dumps({
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],
                "instructions": "You are Jarvis, a helpful AI assistant. Keep responses brief and conversational - 1-2 sentences maximum.",
                "voice": "alloy",
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "input_audio_transcription": {
                    "model": "whisper-1"
                },
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 500
                }
            }
        }))
    
    async def record_audio(self):
        """Record audio from microphone"""
        sample_rate = 24000
        
        def audio_callback(indata, frames, time, status):
            if self.is_recording:
                # Convert float32 to int16 PCM
                audio_int16 = (indata[:, 0] * 32767).astype(np.int16)
                self.audio_queue.put_nowait(audio_int16.tobytes())
        
        with sd.InputStream(samplerate=sample_rate, channels=1, dtype='float32', 
                           callback=audio_callback, blocksize=2400):
            print("[LISTENING] Speak now (will auto-detect when you finish)...")
            self.is_recording = True
            
            # Keep recording until stopped by server VAD
            while self.is_recording:
                await asyncio.sleep(0.1)
    
    async def send_audio(self):
        """Send audio chunks to Realtime API"""
        while True:
            audio_bytes = await self.audio_queue.get()
            if audio_bytes is None:
                break
            
            # Send audio as base64
            audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
            await self.ws.send(json.dumps({
                "type": "input_audio_buffer.append",
                "audio": audio_b64
            }))
    
    async def play_audio(self):
        """Play audio from Realtime API"""
        sample_rate = 24000
        
        with sd.OutputStream(samplerate=sample_rate, channels=1, dtype='int16') as stream:
            while True:
                audio_data = await self.playback_queue.get()
                if audio_data is None:
                    break
                stream.write(audio_data)
    
    async def receive_events(self):
        """Receive and handle events from Realtime API"""
        async for message in self.ws:
            try:
                event = json.loads(message)
                event_type = event.get('type')
                
                if event_type == 'session.created':
                    print("[OK] Session created")
                
                elif event_type == 'session.updated':
                    print("[OK] Session configured")
                
                elif event_type == 'input_audio_buffer.speech_started':
                    print("\n[DETECTING] Speech detected...")
                
                elif event_type == 'input_audio_buffer.speech_stopped':
                    print("[PROCESSING] Speech ended, thinking...")
                    self.is_recording = False
                
                elif event_type == 'conversation.item.input_audio_transcription.completed':
                    transcript = event.get('transcript', '')
                    print(f"\nYou: {transcript}")
                
                elif event_type == 'response.audio.delta':
                    # Receive audio chunk
                    audio_b64 = event.get('delta', '')
                    if audio_b64:
                        audio_bytes = base64.b64decode(audio_b64)
                        audio_int16 = np.frombuffer(audio_bytes, dtype=np.int16)
                        await self.playback_queue.put(audio_int16)
                
                elif event_type == 'response.audio_transcript.delta':
                    # Show AI response text as it streams
                    delta = event.get('delta', '')
                    if delta:
                        print(delta, end='', flush=True)
                
                elif event_type == 'response.done':
                    print("\n[COMPLETE]")
                    await self.playback_queue.put(None)  # Signal done
                    return  # End this conversation turn
                
                elif event_type == 'error':
                    error = event.get('error', {})
                    print(f"\n[ERROR] {error.get('message', 'Unknown error')}")
                    return
                
            except Exception as e:
                print(f"[ERROR] Event handling: {e}")
    
    async def conversation_turn(self):
        """Handle one conversation turn"""
        # Start recording
        record_task = asyncio.create_task(self.record_audio())
        send_task = asyncio.create_task(self.send_audio())
        play_task = asyncio.create_task(self.play_audio())
        receive_task = asyncio.create_task(self.receive_events())
        
        # Wait for receive to complete (response.done)
        await receive_task
        
        # Stop recording and sending
        self.is_recording = False
        await self.audio_queue.put(None)
        
        # Cancel tasks
        record_task.cancel()
        send_task.cancel()
        
        # Wait for playback to finish
        await play_task
    
    async def run(self):
        """Main conversation loop"""
        try:
            await self.connect_realtime()
            
            print("="*60)
            print("READY! Press ENTER to speak, type 'quit' to exit")
            print("="*60 + "\n")
            
            while True:
                # Wait for user input
                user_input = await asyncio.to_thread(input, "\nPress ENTER to speak (or 'quit'): ")
                
                if user_input.strip().lower() in ['quit', 'exit', 'q']:
                    print("\nGoodbye!")
                    break
                
                # Start conversation turn
                await self.conversation_turn()
                
        except Exception as e:
            print(f"\n[ERROR] {e}")
            import traceback
            traceback.print_exc()
        finally:
            if self.ws:
                await self.ws.close()

if __name__ == "__main__":
    jarvis = RealtimeJarvis()
    asyncio.run(jarvis.run())

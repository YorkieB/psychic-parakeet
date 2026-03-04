"""
Jarvis - OpenAI Realtime API Version
TRUE real-time, low-latency voice conversation
WebSocket-based, streaming audio
"""
import asyncio
import json
import base64
import numpy as np
import sounddevice as sd
import soundfile as sf
from pathlib import Path
import tempfile
import subprocess
import websockets
import yaml
import time
import warnings
import sys
import os

warnings.filterwarnings('ignore')

class SuppressOutput:
    def __enter__(self):
        self._stderr = sys.stderr
        sys.stderr = open(os.devnull, 'w')
        return self
    def __exit__(self, *args):
        sys.stderr.close()
        sys.stderr = self._stderr

class RealtimeJarvis:
    """Jarvis using OpenAI Realtime API - Ultra Low Latency"""
    
    def __init__(self, api_key: str):
        print("\n" + "="*60)
        print("   JARVIS - REALTIME API MODE")
        print("   Ultra-Low Latency WebSocket Connection")
        print("="*60)
        print("\nInitializing...")
        
        self.api_key = api_key
        self.ws = None
        self.session_id = None
        self.temp_dir = tempfile.mkdtemp()
        
        # Audio settings (Realtime API uses 24kHz PCM16)
        self.sample_rate = 24000
        self.is_speaking = False
        self.audio_buffer = []
        
        print("  [OK] Configuration loaded")
        print("  [OK] Audio system ready (24kHz)")
        print("\n[READY] Connecting to Realtime API...\n")
    
    async def connect(self):
        """Connect to OpenAI Realtime API via WebSocket"""
        url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
        
        try:
            print("  [Connecting to Realtime API...]")
            
            # Connect with proper headers and longer ping timeout
            self.ws = await websockets.connect(
                url,
                additional_headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "OpenAI-Beta": "realtime=v1"
                },
                ping_interval=20,  # Send ping every 20 seconds
                ping_timeout=60    # Wait 60 seconds for pong response
            )
            
            print("  [✓] Connected!")
            
            # Configure session
            await self.configure_session()
            
            return True
        except Exception as e:
            print(f"  [✗] Connection failed: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def configure_session(self):
        """Configure the Realtime API session"""
        
        # First, consume the session.created event
        try:
            event = await asyncio.wait_for(self.ws.recv(), timeout=5.0)
            event_data = json.loads(event)
            print(f"  [DEBUG] Initial event: {event_data.get('type')}")
        except:
            pass
        
        # Now send our configuration
        config = {
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],  # CRITICAL: Both modalities!
                "instructions": "You are Jarvis, a helpful voice assistant. Be concise (1-2 sentences). Respond quickly.",
                "voice": "alloy",  # Male voice
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "input_audio_transcription": {
                    "model": "whisper-1"
                },
                "turn_detection": None,  # DISABLE server VAD for now to test
                "temperature": 0.7,
                "max_response_output_tokens": 150
            }
        }
        
        print("  [Sending session configuration...]")
        await self.ws.send(json.dumps(config))
        
        # Wait for session.updated confirmation
        response = await asyncio.wait_for(self.ws.recv(), timeout=5.0)
        event = json.loads(response)
        
        if event.get('type') == 'session.updated':
            session = event.get('session', {})
            modalities = session.get('modalities', [])
            print("  [✓] Session configured successfully")
            print(f"  [✓] Modalities: {modalities}")
            print(f"  [✓] Voice: {session.get('voice', 'unknown')}")
            
            if 'audio' not in modalities:
                print("  [ERROR] Audio modality NOT enabled!")
        else:
            print(f"  [ERROR] Expected session.updated, got: {event.get('type')}")
    
    async def record_and_stream(self, duration=10):
        """Record audio and stream to Realtime API"""
        print(f"\n[LISTENING] Speak for up to {duration} seconds...")
        print("  Recording: ", end="", flush=True)
        
        recorded_chunks = []
        start_time = time.time()
        silence_duration = 0.8
        silence_threshold = 100
        silence_chunks_needed = int(silence_duration * self.sample_rate / 2400)
        silence_counter = 0
        started_speaking = False
        
        # Start audio input item
        await self.ws.send(json.dumps({
            "type": "input_audio_buffer.append",
            "audio": ""  # Start stream
        }))
        
        with SuppressOutput():
            try:
                with sd.InputStream(
                    samplerate=self.sample_rate,
                    channels=1,
                    dtype='int16',
                    blocksize=2400  # 100ms chunks
                ) as stream:
                    
                    while time.time() - start_time < duration:
                        # Read audio chunk
                        chunk, _ = stream.read(2400)
                        
                        # Convert to base64 and send
                        audio_bytes = chunk.tobytes()
                        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
                        
                        await self.ws.send(json.dumps({
                            "type": "input_audio_buffer.append",
                            "audio": audio_b64
                        }))
                        
                        # Local VAD
                        volume = np.max(np.abs(chunk))
                        if volume > silence_threshold:
                            started_speaking = True
                            silence_counter = 0
                            print("█", end="", flush=True)
                        elif started_speaking:
                            silence_counter += 1
                            print("░", end="", flush=True)
                            if silence_counter >= silence_chunks_needed:
                                print("\n  [✓] Silence detected")
                                break
                        
                        recorded_chunks.append(chunk)
                        
            except Exception as e:
                print(f"\n  [ERROR] Recording failed: {e}")
                return None
        
        # Commit the audio
        await self.ws.send(json.dumps({
            "type": "input_audio_buffer.commit"
        }))
        
        # Create response (will use session modalities)
        await self.ws.send(json.dumps({
            "type": "response.create"
        }))
        
        duration = time.time() - start_time
        print(f"\n  [✓] Sent {duration:.1f}s of audio")
        
        return True
    
    async def handle_response(self):
        """Handle streaming response from Realtime API"""
        transcript = ""
        audio_chunks = []
        response_text = ""
        response_start = time.time()
        first_audio = None
        
        print("  [Processing...]")
        
        try:
            while True:
                response = await asyncio.wait_for(self.ws.recv(), timeout=15.0)
                event = json.loads(response)
                event_type = event.get('type')
                
                # Debug: show what events we're getting
                print(f"\n  [Event: {event_type}]")
                
                # Transcription of user's speech
                if event_type == 'conversation.item.input_audio_transcription.completed':
                    transcript = event.get('transcript', '')
                    print(f"\n  You: {transcript}")
                
                # Response audio transcript
                elif event_type == 'response.audio_transcript.delta':
                    response_text += event.get('delta', '')
                
                elif event_type == 'response.audio_transcript.done':
                    response_text = event.get('transcript', response_text)
                    if response_text:
                        print(f"\nJarvis: {response_text}")
                
                # Audio output (streaming)
                elif event_type == 'response.audio.delta':
                    if first_audio is None:
                        first_audio = time.time()
                        ttfb = int((first_audio - response_start) * 1000)
                        print(f"  [⚡] First audio: {ttfb}ms")
                    
                    audio_b64 = event.get('delta', '')
                    if audio_b64:
                        audio_bytes = base64.b64decode(audio_b64)
                        audio_chunk = np.frombuffer(audio_bytes, dtype=np.int16)
                        audio_chunks.append(audio_chunk)
                
                elif event_type == 'response.audio.done':
                    print(f"  [✓] Audio complete ({len(audio_chunks)} chunks)")
                
                # Response complete
                elif event_type == 'response.done':
                    total_time = int((time.time() - response_start) * 1000)
                    print(f"  [✓] Complete: {total_time}ms total")
                    break
                
                # Errors
                elif event_type == 'error':
                    error_msg = event.get('error', {}).get('message', 'Unknown error')
                    print(f"  [✗] Error: {error_msg}")
                    break
                    
        except asyncio.TimeoutError:
            print("  [✗] Timeout waiting for response")
            return None
        except Exception as e:
            print(f"  [✗] Error: {e}")
            import traceback
            traceback.print_exc()
            return None
        
        # Play audio
        if audio_chunks:
            print("  [Playing audio...]")
            await self.play_audio(audio_chunks)
        else:
            print("  [✗] No audio received!")
        
        return True
    
    async def play_audio(self, audio_chunks):
        """Play audio chunks"""
        try:
            # Combine chunks
            audio_data = np.concatenate(audio_chunks)
            
            # Save to temp file
            temp_wav = Path(self.temp_dir) / "response.wav"
            sf.write(temp_wav, audio_data, self.sample_rate, subtype='PCM_16')
            
            # Play using Windows native player
            proc = subprocess.Popen(
                ['powershell', '-Command', f'(New-Object Media.SoundPlayer "{temp_wav}").PlaySync()'],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            proc.wait()
            
            # Cleanup
            try:
                temp_wav.unlink()
            except:
                pass
                
        except Exception as e:
            print(f"  [✗] Playback error: {e}")
    
    async def run(self):
        """Main conversation loop"""
        print("="*60)
        print("REALTIME API FEATURES:")
        print("  • WebSocket streaming (ultra-low latency)")
        print("  • Server-side VAD (500ms silence detection)")
        print("  • Streaming responses (starts immediately)")
        print("  • All-in-one (STT + LLM + TTS)")
        print("\nCommands: ENTER=speak | type | q=quit")
        print("="*60 + "\n")
        
        # Connect
        if not await self.connect():
            print("[✗] Failed to connect. Exiting.")
            return
        
        # Greeting
        print("Jarvis: Hello! I'm connected via Realtime API. Press Enter to speak!\n")
        
        try:
            while True:
                print("-"*40)
                user_input = input("\n>> ").strip()
                
                if user_input.lower() in ['q', 'quit', 'exit', 'bye']:
                    print("\nJarvis: Goodbye!")
                    break
                
                start_time = time.time()
                
                if not user_input:
                    # VOICE INPUT (streaming)
                    success = await self.record_and_stream(duration=10)
                    if success:
                        await self.handle_response()
                else:
                    # TEXT INPUT
                    # Send text message
                    await self.ws.send(json.dumps({
                        "type": "conversation.item.create",
                        "item": {
                            "type": "message",
                            "role": "user",
                            "content": [
                                {
                                    "type": "input_text",
                                    "text": user_input
                                }
                            ]
                        }
                    }))
                    
                    # Create response (uses session modalities)
                    await self.ws.send(json.dumps({
                        "type": "response.create"
                    }))
                    
                    await self.handle_response()
                
                total = int((time.time() - start_time) * 1000)
                print(f"\n  ⚡ TOTAL TURN: {total}ms\n")
                
        except KeyboardInterrupt:
            print("\n\nInterrupted!")
        except Exception as e:
            print(f"\n[ERROR] {e}")
        finally:
            # Cleanup
            if self.ws:
                await self.ws.close()
            print("\n[✓] Disconnected")
            
            try:
                import shutil
                shutil.rmtree(self.temp_dir)
            except:
                pass

async def main():
    # Load API key
    try:
        with open("configs/voice_config.yaml", 'r') as f:
            config = yaml.safe_load(f)
        api_key = config.get('stt', {}).get('api_key')
        
        if not api_key:
            print("[✗] No API key found in configs/voice_config.yaml")
            return
            
    except Exception as e:
        print(f"[✗] Failed to load config: {e}")
        return
    
    # Create and run Jarvis
    jarvis = RealtimeJarvis(api_key)
    await jarvis.run()

if __name__ == "__main__":
    print("\n" + "="*60)
    print("   JARVIS - OPENAI REALTIME API")
    print("   Ultra-Low Latency Real-Time Voice")
    print("="*60)
    
    asyncio.run(main())

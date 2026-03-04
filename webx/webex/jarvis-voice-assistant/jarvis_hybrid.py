"""
Jarvis - HYBRID Version (Best of Both!)
- YOUR GPU: Whisper STT + Llama AI
- OpenAI Cloud: Fast TTS
"""
import sounddevice as sd
import soundfile as sf
import numpy as np
import requests
from pathlib import Path
import tempfile
import time
import sys
import warnings
import os
from openai import OpenAI
import yaml
import io

# Suppress ALL warnings and errors
warnings.filterwarnings('ignore')
os.environ['PYTHONWARNINGS'] = 'ignore'

# Windows-specific: Suppress sounddevice callback errors
if sys.platform == 'win32':
    import ctypes
    kernel32 = ctypes.windll.kernel32
    kernel32.SetErrorMode(0x0001 | 0x0002 | 0x8000)
    
    class SuppressStderr:
        def __enter__(self):
            self._original_stderr = sys.stderr
            sys.stderr = open(os.devnull, 'w')
            return self
        def __exit__(self, *args):
            sys.stderr.close()
            sys.stderr = self._original_stderr

SERVER_URL = "https://eternal-bearing-prospective-nottingham.trycloudflare.com"

class HybridJarvis:
    """Jarvis - Best of both worlds!"""
    
    def __init__(self):
        print("\n" + "="*60)
        print("   JARVIS - HYBRID MODE")
        print("   GPU: Whisper + Llama | Cloud: Fast TTS")
        print("="*60)
        print("\nConnecting to GPU server...")
        
        # Test GPU server connection
        try:
            response = requests.get(f"{SERVER_URL}/", timeout=5)
            if response.status_code == 200:
                print(f"[OK] GPU Server: {SERVER_URL}")
                data = response.json()
                print(f"[OK] GPU Services: Whisper, Llama")
            else:
                print(f"[ERROR] Server status {response.status_code}")
                sys.exit(1)
        except Exception as e:
            print(f"[ERROR] Cannot connect to GPU server: {e}")
            sys.exit(1)
        
        # Load OpenAI API key for TTS
        try:
            with open("configs/voice_config.yaml", 'r') as f:
                config = yaml.safe_load(f)
            api_key = config.get('stt', {}).get('api_key')
            self.openai_client = OpenAI(api_key=api_key)
            print("[OK] OpenAI TTS: Ready")
        except Exception as e:
            print(f"[ERROR] Cannot load OpenAI key: {e}")
            sys.exit(1)
        
        self.temp_dir = tempfile.mkdtemp()
        print("\n[READY] Press Enter to speak!\n")
    
    def record_audio(self, duration=10):
        """Record audio with silence detection"""
        print(f"\n[LISTENING] Speak now...")
        print("  Recording: ", end="", flush=True)
        
        sample_rate = 16000
        silence_threshold = 0.01
        silence_duration = 0.8
        silence_chunks_needed = int(silence_duration * sample_rate / 512)
        
        recorded = []
        silence_count = 0
        speaking = False
        start = time.time()
        
        # Suppress stderr during recording
        suppress = SuppressStderr() if sys.platform == 'win32' else None
        
        try:
            if suppress:
                suppress.__enter__()
                
            with sd.InputStream(samplerate=sample_rate, channels=1, dtype='float32', blocksize=512) as stream:
                while time.time() - start < duration:
                    chunk, _ = stream.read(512)
                    vol = np.max(np.abs(chunk))
                    
                    if vol > silence_threshold:
                        speaking = True
                        silence_count = 0
                        recorded.append(chunk)
                        print(".", end="", flush=True)
                    elif speaking:
                        silence_count += 1
                        recorded.append(chunk)
                        
                        if silence_count >= silence_chunks_needed:
                            print(" [Done]")
                            break
        except Exception as e:
            print(f"\n  [ERROR] {e}")
            return None
        finally:
            if suppress:
                suppress.__exit__(None, None, None)
        
        if not recorded:
            print("\n  [No speech]")
            return None
        
        audio = np.concatenate(recorded)
        temp_file = Path(self.temp_dir) / "recording.wav"
        sf.write(temp_file, audio, sample_rate)
        
        return temp_file
    
    def transcribe(self, audio_file):
        """GPU Server: Whisper transcription"""
        try:
            print("  [GPU STT]", end="", flush=True)
            start = time.time()
            
            with open(audio_file, 'rb') as f:
                files = {'audio': ('recording.wav', f, 'audio/wav')}
                response = requests.post(f"{SERVER_URL}/transcribe", files=files, timeout=30)
            
            latency = int((time.time() - start) * 1000)
            print(f" {latency}ms")
            
            if response.status_code == 200:
                data = response.json()
                return data.get('text', '')
            else:
                print(f" [ERROR {response.status_code}]")
                return None
                
        except Exception as e:
            print(f" [ERROR: {e}]")
            return None
    
    def chat(self, message):
        """GPU Server: Llama AI response"""
        try:
            print("  [GPU AI]", end="", flush=True)
            start = time.time()
            
            # Add instruction for SHORT responses
            prompt = f"Answer in 1-2 short sentences only. Keep it brief and conversational.\n\nUser: {message}\n\nAssistant:"
            
            response = requests.post(
                f"{SERVER_URL}/chat",
                data={'message': prompt},
                timeout=60
            )
            
            latency = int((time.time() - start) * 1000)
            print(f" {latency}ms")
            
            if response.status_code == 200:
                data = response.json()
                reply = data.get('response', '')
                # Truncate if still too long
                if len(reply) > 200:
                    reply = reply[:200].rsplit('.', 1)[0] + '.'
                return reply
            else:
                print(f" [ERROR {response.status_code}]")
                return None
                
        except Exception as e:
            print(f" [ERROR: {e}]")
            return None
    
    def speak(self, text):
        """OpenAI Cloud: Fast TTS"""
        try:
            # TTS Generation
            print("  [Cloud TTS]", end="", flush=True)
            start = time.time()
            
            response = self.openai_client.audio.speech.create(
                model="tts-1",
                voice="onyx",
                input=text,
                speed=1.1
            )
            
            gen_time = int((time.time() - start) * 1000)
            print(f" {gen_time}ms", end="", flush=True)
            
            # Audio conversion
            audio_bytes = response.content
            import librosa
            audio_data, _ = librosa.load(io.BytesIO(audio_bytes), sr=16000, mono=True)
            
            # Playback
            play_start = time.time()
            print(" [Play]", end="", flush=True)
            
            suppress = SuppressStderr() if sys.platform == 'win32' else None
            try:
                if suppress:
                    suppress.__enter__()
                sd.play(audio_data, 16000)
                sd.wait()
            finally:
                if suppress:
                    suppress.__exit__(None, None, None)
            
            play_time = int((time.time() - play_start) * 1000)
            print(f" {play_time}ms")
                
        except Exception as e:
            print(f" [ERROR: {e}]")
    
    def run(self):
        """Main conversation loop"""
        print("="*60)
        print("HYBRID SETUP:")
        print("  STT: YOUR GPU (Whisper)")
        print("  AI:  YOUR GPU (Llama 3.1)")
        print("  TTS: OpenAI Cloud (Fast!)")
        print("\nCommands: ENTER | type | quit")
        print("="*60 + "\n")
        
        greeting = "Hello! Hybrid mode ready."
        print(f"Jarvis: {greeting}")
        self.speak(greeting)
        
        while True:
            try:
                print("\n" + "-"*60)
                user_input = input("\nENTER=speak | type | quit: ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'bye', 'q']:
                    print("\nJarvis: Goodbye!")
                    self.speak("Goodbye!")
                    break
                
                total_start = time.time()
                
                if not user_input:
                    # VOICE INPUT
                    audio_file = self.record_audio(duration=10)
                    if audio_file:
                        text = self.transcribe(audio_file)
                        if text:
                            print(f"\n  You: {text}")
                        else:
                            continue
                    else:
                        continue
                else:
                    # TEXT INPUT
                    text = user_input
                
                if text:
                    response = self.chat(text)
                    
                    if response:
                        print(f"\nJarvis: {response}")
                        self.speak(response)
                        
                        total_time = int((time.time() - total_start) * 1000)
                        print(f"\n  [TOTAL LATENCY] {total_time}ms")
                        
                        # Show if it's good or bad
                        if total_time < 3000:
                            print("  [PERFORMANCE] Excellent!")
                        elif total_time < 5000:
                            print("  [PERFORMANCE] Good")
                        else:
                            print("  [PERFORMANCE] Needs improvement")
                
            except KeyboardInterrupt:
                print("\n\nGoodbye!")
                break
            except Exception as e:
                print(f"\n[ERROR] {e}")
        
        # Cleanup
        try:
            import shutil
            shutil.rmtree(self.temp_dir)
        except:
            pass

if __name__ == "__main__":
    jarvis = HybridJarvis()
    jarvis.run()

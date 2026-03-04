"""
Jarvis - Connected to YOUR GPU Server!
Ultra-low latency voice assistant
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

# Suppress ALL warnings and errors
warnings.filterwarnings('ignore')
os.environ['PYTHONWARNINGS'] = 'ignore'

# Windows-specific: Suppress sounddevice callback errors
if sys.platform == 'win32':
    import ctypes
    kernel32 = ctypes.windll.kernel32
    kernel32.SetErrorMode(0x0001 | 0x0002 | 0x8000)
    
    # Redirect stderr to suppress callback errors
    class SuppressStderr:
        def __enter__(self):
            self._original_stderr = sys.stderr
            sys.stderr = open(os.devnull, 'w')
            return self
        def __exit__(self, *args):
            sys.stderr.close()
            sys.stderr = self._original_stderr

SERVER_URL = "https://eternal-bearing-prospective-nottingham.trycloudflare.com"

class ServerJarvis:
    """Jarvis connected to your RunPod GPU server"""
    
    def __init__(self):
        print("\n" + "="*60)
        print("   JARVIS - YOUR GPU SERVER")
        print("   RunPod RTX 3090 (Europe)")
        print("="*60)
        print("\nConnecting to server...")
        
        # Test connection
        try:
            response = requests.get(f"{SERVER_URL}/", timeout=5)
            if response.status_code == 200:
                print(f"[OK] Connected to: {SERVER_URL}")
                data = response.json()
                print(f"[OK] Services: {', '.join(data['services'])}")
            else:
                print(f"[ERROR] Server responded with status {response.status_code}")
                sys.exit(1)
        except Exception as e:
            print(f"[ERROR] Cannot connect to server: {e}")
            print(f"\nMake sure the server is running and the URL is correct!")
            sys.exit(1)
        
        self.temp_dir = tempfile.mkdtemp()
        self.conversation_history = []
        
        print("\n[READY] Press Enter to speak!\n")
    
    def record_audio(self, duration=10):
        """Record audio with silence detection"""
        print(f"\n[LISTENING] Speak now (up to {duration} seconds)...")
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
        if sys.platform == 'win32':
            suppress = SuppressStderr()
        else:
            suppress = None
        
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
                        print("█", end="", flush=True)
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
            print("\n  [No speech detected]")
            return None
        
        audio = np.concatenate(recorded)
        temp_file = Path(self.temp_dir) / "recording.wav"
        sf.write(temp_file, audio, sample_rate)
        
        return temp_file
    
    def transcribe(self, audio_file):
        """Send audio to server for transcription"""
        try:
            print("  [Transcribing...]", end="", flush=True)
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
                print(f"\n  [ERROR] Transcription failed: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"\n  [ERROR] {e}")
            return None
    
    def chat(self, message):
        """Send message to server for AI response"""
        try:
            print("  [AI Thinking...]", end="", flush=True)
            start = time.time()
            
            response = requests.post(
                f"{SERVER_URL}/chat",
                data={'message': message},
                timeout=60
            )
            
            latency = int((time.time() - start) * 1000)
            print(f" {latency}ms")
            
            if response.status_code == 200:
                data = response.json()
                return data.get('response', '')
            else:
                print(f"\n  [ERROR] Chat failed: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"\n  [ERROR] {e}")
            return None
    
    def speak(self, text):
        """Get speech from server and play it"""
        try:
            print("  [Generating speech...]", end="", flush=True)
            start = time.time()
            
            response = requests.post(
                f"{SERVER_URL}/speak",
                data={'text': text},
                timeout=30
            )
            
            latency = int((time.time() - start) * 1000)
            print(f" {latency}ms")
            
            if response.status_code == 200:
                # Save audio to temp file
                audio_file = Path(self.temp_dir) / "response.wav"
                with open(audio_file, 'wb') as f:
                    f.write(response.content)
                
                # Play audio
                print("  [Playing...]")
                data, samplerate = sf.read(audio_file)
                sd.play(data, samplerate)
                sd.wait()
                
                # Cleanup
                try:
                    audio_file.unlink()
                except:
                    pass
            else:
                print(f"\n  [ERROR] Speech generation failed: {response.status_code}")
                
        except Exception as e:
            print(f"\n  [ERROR] {e}")
    
    def run(self):
        """Main conversation loop"""
        print("="*60)
        print("Commands:")
        print("  ENTER = Speak")
        print("  Type message = Text input")
        print("  'quit' = Exit")
        print("="*60 + "\n")
        
        greeting = "Hello! I'm Jarvis running on your GPU server in Europe!"
        print(f"Jarvis: {greeting}")
        self.speak(greeting)
        
        while True:
            try:
                print("\n" + "-"*60)
                user_input = input("\nPress ENTER to speak (or type / 'quit'): ").strip()
                
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
                        total_time = int((time.time() - total_start) * 1000)
                        print(f"\n  [TOTAL] {total_time}ms")
                        
                        print(f"\nJarvis: {response}")
                        self.speak(response)
                
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
    jarvis = ServerJarvis()
    jarvis.run()

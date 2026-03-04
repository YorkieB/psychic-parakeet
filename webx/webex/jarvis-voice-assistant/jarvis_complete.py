"""
Jarvis - COMPLETE Cloud Version
- Fast OpenAI STT + GPT-4o + TTS
- Voice Activity Detection (Utterance)
- Barge-in support
- Reliable audio
"""
import sounddevice as sd
import soundfile as sf
import numpy as np
from pathlib import Path
import tempfile
import time
import sys
import warnings
import os
import yaml
import io
import threading
from openai import OpenAI

# Suppress warnings
warnings.filterwarnings('ignore')
os.environ['PYTHONWARNINGS'] = 'ignore'

# Aggressive Windows error suppression
if sys.platform == 'win32':
    import ctypes
    kernel32 = ctypes.windll.kernel32
    kernel32.SetErrorMode(0x0001 | 0x0002 | 0x8000)
    
    # Disable Windows error reporting dialogs
    import ctypes.wintypes
    SEM_FAILCRITICALERRORS = 0x0001
    SEM_NOGPFAULTERRORBOX = 0x0002
    SEM_NOOPENFILEERRORBOX = 0x8000
    kernel32.SetErrorMode(SEM_FAILCRITICALERRORS | SEM_NOGPFAULTERRORBOX | SEM_NOOPENFILEERRORBOX)
    
    class SuppressStderr:
        def __enter__(self):
            self._original_stderr = sys.stderr
            self._original_stdout = sys.stdout
            sys.stderr = open(os.devnull, 'w')
            sys.stdout = open(os.devnull, 'w')
            return self
        def __exit__(self, *args):
            sys.stderr.close()
            sys.stdout.close()
            sys.stderr = self._original_stderr
            sys.stdout = self._original_stdout

# Suppress sounddevice callback errors specifically
import sounddevice as sd_test
sd_test._terminate = lambda: None
del sd_test

class CompleteJarvis:
    """Complete Jarvis with VAD and Barge-in"""
    
    def __init__(self):
        print("\n" + "="*60)
        print("   JARVIS - COMPLETE MODE")
        print("   Fast + VAD + Barge-in")
        print("="*60)
        
        self.temp_dir = tempfile.mkdtemp()
        
        # Load OpenAI API key
        print("\nLoading configuration...")
        try:
            with open("configs/voice_config.yaml", 'r') as f:
                config = yaml.safe_load(f)
            api_key = config.get('stt', {}).get('api_key')
            self.client = OpenAI(api_key=api_key)
            print("[OK] OpenAI ready")
        except Exception as e:
            print(f"[ERROR] Config failed: {e}")
            sys.exit(1)
        
        # Barge-in control
        self.is_speaking = False
        self.stop_playback = False
        
        print("\n[READY] Full-featured Jarvis!\n")
    
    def record_with_vad(self, duration=10):
        """Record with Voice Activity Detection"""
        print(f"\n[LISTENING] Speak now (auto-stops when you finish)...")
        print("  Recording: ", end="", flush=True)
        
        sample_rate = 16000
        silence_threshold = 0.015  # Adjusted for better detection
        silence_duration = 0.7     # Stop after 0.7s of silence
        min_speech_duration = 0.3  # Need at least 0.3s of speech
        silence_chunks_needed = int(silence_duration * sample_rate / 512)
        min_speech_chunks = int(min_speech_duration * sample_rate / 512)
        
        recorded = []
        silence_count = 0
        speech_chunks = 0
        speaking = False
        start = time.time()
        
        suppress = SuppressStderr() if sys.platform == 'win32' else None
        
        try:
            if suppress:
                suppress.__enter__()
            
            # Configure sounddevice to not show errors
            sd.default.never_drop_input = False
            sd.default.dtype = 'float32'
            sd.default.channels = 1
                
            with sd.InputStream(samplerate=sample_rate, channels=1, dtype='float32', blocksize=512, 
                               prime_output_buffers_using_stream_callback=False) as stream:
                while time.time() - start < duration:
                    chunk, _ = stream.read(512)
                    vol = np.max(np.abs(chunk))
                    
                    if vol > silence_threshold:
                        speaking = True
                        silence_count = 0
                        speech_chunks += 1
                        recorded.append(chunk)
                        print(".", end="", flush=True)
                    elif speaking:
                        silence_count += 1
                        recorded.append(chunk)
                        
                        # Only stop if we have enough speech
                        if silence_count >= silence_chunks_needed and speech_chunks >= min_speech_chunks:
                            print(" [Done]")
                            break
                    else:
                        # Not speaking yet, keep waiting
                        if time.time() - start > 8:
                            print(" [Timeout]")
                            break
                            
        except Exception as e:
            print(f"\n  [ERROR] {e}")
            return None
        finally:
            if suppress:
                suppress.__exit__(None, None, None)
        
        if not recorded or speech_chunks < min_speech_chunks:
            print("\n  [No speech detected]")
            return None
        
        audio = np.concatenate(recorded)
        temp_file = Path(self.temp_dir) / f"recording_{int(time.time())}.wav"
        sf.write(temp_file, audio, sample_rate)
        
        return temp_file
    
    def transcribe(self, audio_file):
        """OpenAI Whisper STT"""
        try:
            print("  [STT]", end="", flush=True)
            start = time.time()
            
            with open(audio_file, 'rb') as f:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=f,
                    language="en"
                )
            
            latency = int((time.time() - start) * 1000)
            print(f" {latency}ms")
            
            return transcript.text.strip()
        except Exception as e:
            print(f" [ERROR: {e}]")
            return None
    
    def chat(self, message):
        """OpenAI GPT-4o Chat"""
        try:
            print("  [AI]", end="", flush=True)
            start = time.time()
            
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are Jarvis, a helpful AI assistant. Keep responses brief and conversational - 1-2 sentences maximum."},
                    {"role": "user", "content": message}
                ],
                max_tokens=50,
                temperature=0.7
            )
            
            latency = int((time.time() - start) * 1000)
            print(f" {latency}ms")
            
            reply = response.choices[0].message.content.strip()
            return reply
        except Exception as e:
            print(f" [ERROR: {e}]")
            return None
    
    def speak_with_bargein(self, text):
        """TTS with barge-in support (SMOOTH playback)"""
        try:
            print("  [TTS]", end="", flush=True)
            start = time.time()
            
            # Generate audio
            response = self.client.audio.speech.create(
                model="tts-1",
                voice="onyx",
                input=text,
                speed=1.1
            )
            
            gen_time = int((time.time() - start) * 1000)
            print(f" {gen_time}ms", end="", flush=True)
            
            audio_bytes = response.content
            import librosa
            audio_data, _ = librosa.load(io.BytesIO(audio_bytes), sr=16000, mono=True)
            
            # Play with smooth, uninterrupted audio
            print(" [Play]", end="", flush=True)
            play_start = time.time()
            
            self.is_speaking = True
            self.stop_playback = False
            
            suppress = SuppressStderr() if sys.platform == 'win32' else None
            try:
                if suppress:
                    suppress.__enter__()
                
                # Configure sounddevice for clean playback
                sd.default.never_drop_input = False
                
                # Play entire audio smoothly (no chunks!)
                sd.play(audio_data, 16000, blocking=False)
                
                # Monitor for barge-in WITHOUT interfering with playback
                sample_rate = 16000
                barge_threshold = 0.03
                barge_confirm_count = 3  # Need 3 loud chunks to confirm barge-in
                loud_count = 0
                
                # Configure for barge-in monitoring
                sd.default.never_drop_input = False
                
                with sd.InputStream(samplerate=sample_rate, channels=1, dtype='float32', blocksize=1024,
                                   prime_output_buffers_using_stream_callback=False) as stream:
                    while sd.get_stream().active:
                        chunk, _ = stream.read(1024)
                        vol = np.max(np.abs(chunk))
                        
                        if vol > barge_threshold:
                            loud_count += 1
                            if loud_count >= barge_confirm_count:
                                # Confirmed barge-in!
                                print(" [Interrupted!]", end="")
                                sd.stop()
                                break
                        else:
                            loud_count = 0  # Reset if quiet
                
                # Wait for any remaining audio
                sd.wait()
                
            finally:
                if suppress:
                    suppress.__exit__(None, None, None)
                self.is_speaking = False
            
            play_time = int((time.time() - play_start) * 1000)
            print(f" {play_time}ms")
            
        except Exception as e:
            print(f" [ERROR: {e}]")
            self.is_speaking = False
    
    def run(self):
        """Main conversation loop"""
        print("="*60)
        print("FEATURES:")
        print("  STT: OpenAI Whisper (Fast)")
        print("  AI:  GPT-4o (Smart & Fast)")
        print("  TTS: OpenAI (Clear voice)")
        print("  VAD: Auto-detects when you finish speaking")
        print("  BARGE-IN: Speak to interrupt Jarvis!")
        print("\nCommands: ENTER=speak | type | quit")
        print("="*60 + "\n")
        
        greeting = "Complete mode active! I can detect when you finish speaking and you can interrupt me anytime."
        print(f"Jarvis: {greeting}")
        self.speak_with_bargein(greeting)
        
        while True:
            try:
                print("\n" + "-"*60)
                user_input = input("\nENTER=speak | type | quit: ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'bye', 'q']:
                    print("\nJarvis: Goodbye!")
                    self.speak_with_bargein("Goodbye!")
                    break
                
                total_start = time.time()
                
                if not user_input:
                    # VOICE INPUT
                    audio_file = self.record_with_vad(duration=10)
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
                        self.speak_with_bargein(response)
                        
                        total_time = int((time.time() - total_start) * 1000)
                        print(f"\n  [TOTAL] {total_time}ms", end="")
                        
                        if total_time < 3000:
                            print(" [Excellent!]")
                        elif total_time < 5000:
                            print(" [Good]")
                        elif total_time < 8000:
                            print(" [Acceptable]")
                        else:
                            print(" [Slow]")
                
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
    jarvis = CompleteJarvis()
    jarvis.run()

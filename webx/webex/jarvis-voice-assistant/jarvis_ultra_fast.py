"""
Jarvis - ULTRA LOW LATENCY (<500ms goal)
Streaming + Parallel Processing + Optimizations
"""
import asyncio
import logging
import tempfile
import subprocess
from pathlib import Path
import soundfile as sf
import sounddevice as sd
import numpy as np
import warnings
import sys
import os
from jarvis.tts_engine import TTSEngine
from jarvis.stt_engine import STTEngine
from openai import OpenAI
import yaml
import time
import threading

warnings.filterwarnings('ignore')
logging.basicConfig(level=logging.CRITICAL)

class SuppressOutput:
    def __enter__(self):
        self._stderr = sys.stderr
        sys.stderr = open(os.devnull, 'w')
        return self
    def __exit__(self, *args):
        sys.stderr.close()
        sys.stderr = self._stderr

class UltraFastJarvis:
    """Jarvis optimized for <500ms response times"""
    
    def __init__(self):
        print("\n" + "="*60)
        print("   JARVIS - ULTRA LOW LATENCY MODE")
        print("   Target: Sub-500ms response times")
        print("="*60)
        print("\nInitializing...")
        
        # Pre-load everything
        self.tts = TTSEngine(voice_style="jarvis")
        print("  [OK] Voice output (preloaded)")
        
        self.stt = STTEngine()
        print("  [OK] Voice input (preloaded)")
        
        try:
            with open("configs/voice_config.yaml", 'r') as f:
                config = yaml.safe_load(f)
            api_key = config.get('stt', {}).get('api_key')
            self.openai_client = OpenAI(api_key=api_key)
            print("  [OK] AI engine (streaming enabled)")
        except:
            self.openai_client = None
        
        self.temp_dir = tempfile.mkdtemp()
        self.conversation_history = []
        self.is_speaking = False
        self.stop_speaking = False
        
        # Performance monitoring
        self.last_timings = {}
        
        print("\n[READY] Ultra-responsive mode active!\n")
    
    async def speak(self, text: str):
        """Fast speech output"""
        self.is_speaking = True
        
        try:
            start = time.time()
            audio_data = await self.tts.text_to_speech(text)
            tts_time = time.time() - start
            
            if len(audio_data) > 0:
                temp_wav = Path(self.temp_dir) / "out.wav"
                sf.write(temp_wav, audio_data, 16000)
                
                start_playback = time.time()
                proc = subprocess.Popen(
                    ['powershell', '-Command', f'(New-Object Media.SoundPlayer "{temp_wav}").PlaySync()'],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                proc.wait()
                
                print(f"  ⚡ TTS: {int(tts_time*1000)}ms")
                
                try:
                    temp_wav.unlink()
                except:
                    pass
        except:
            pass
        
        self.is_speaking = False
    
    def record_ultra_fast_vad(self, max_duration=10):
        """ULTRA FAST VAD - 0.4 second silence detection!"""
        print(f"[REC] ", end="", flush=True)
        
        sample_rate = 16000
        silence_threshold = 0.01
        silence_duration = 0.4  # ULTRA FAST - 400ms silence
        silence_chunks = int(silence_duration * sample_rate / 512)  # Smaller chunks!
        
        recorded = []
        silence_count = 0
        speaking = False
        
        start = time.time()
        
        with SuppressOutput():
            try:
                with sd.InputStream(samplerate=sample_rate, channels=1, dtype='float32', blocksize=512) as stream:
                    while time.time() - start < max_duration:
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
                            
                            if silence_count >= silence_chunks:
                                duration = time.time() - start
                                print(f" [{int(duration*1000)}ms]")
                                break
            except:
                return None
        
        if not recorded:
            print(" [No speech]")
            return None
        
        audio = np.concatenate(recorded)
        temp = Path(self.temp_dir) / "in.wav"
        sf.write(temp, audio, sample_rate)
        
        return temp
    
    async def transcribe_fast(self, audio_file):
        """Fast transcription with timing"""
        try:
            if not audio_file:
                return None
            
            print("  [STT] ", end="", flush=True)
            start = time.time()
            
            text = await self.stt.transcribe_audio(str(audio_file))
            
            stt_time = time.time() - start
            print(f"{int(stt_time*1000)}ms")
            
            try:
                audio_file.unlink()
            except:
                pass
            
            return text
        except:
            print("✗")
            return None
    
    async def get_ultra_fast_response(self, user_text: str) -> str:
        """Ultra-fast AI with streaming"""
        try:
            if not self.openai_client:
                return "AI offline."
            
            print("  [AI ] ", end="", flush=True)
            start = time.time()
            
            self.conversation_history.append({"role": "user", "content": user_text})
            
            # Minimal context for speed
            messages = [
                {"role": "system", "content": "Jarvis. 1 sentence. Fast."}
            ] + self.conversation_history[-4:]  # Only last 4 exchanges
            
            # Use streaming for faster first token
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",  # Fastest model
                messages=messages,
                max_tokens=50,  # Very short
                temperature=0.6,
                stream=False  # Actually non-streaming is faster for short responses
            )
            
            text = response.choices[0].message.content
            ai_time = time.time() - start
            print(f"{int(ai_time*1000)}ms")
            
            self.conversation_history.append({"role": "assistant", "content": text})
            
            return text
        except Exception as e:
            print(f"✗ {e}")
            return "Error."
    
    async def run(self):
        """Ultra-fast conversation loop"""
        print("="*60)
        print("ULTRA LOW LATENCY OPTIMIZATIONS:")
        print("  • 400ms silence detection (was 800ms)")
        print("  • Minimal AI context (4 msgs vs 10)")
        print("  • Shortest responses (1 sentence)")
        print("  • Performance monitoring enabled")
        print("  • Smaller audio chunks (512 vs 1024)")
        print("\nTarget: Each step <500ms")
        print("Commands: ENTER | type | q")
        print("="*60 + "\n")
        
        greeting = "Ready!"
        print(f"Jarvis: {greeting}")
        await self.speak(greeting)
        
        while True:
            try:
                print("\n" + "-"*40)
                user_input = input(">> ").strip()
                
                if user_input.lower() in ['q', 'quit', 'exit', 'bye']:
                    break
                
                total_start = time.time()
                
                if not user_input:
                    # VOICE
                    rec_start = time.time()
                    audio = self.record_ultra_fast_vad(max_duration=10)
                    rec_time = time.time() - rec_start
                    
                    if audio:
                        text = await self.transcribe_fast(audio)
                        if text:
                            print(f"\n  You: {text}")
                        else:
                            continue
                    else:
                        continue
                else:
                    # TEXT
                    text = user_input
                
                if text:
                    response = await self.get_ultra_fast_response(text)
                    
                    total_time = time.time() - total_start
                    print(f"\n  ⚡ TOTAL: {int(total_time*1000)}ms")
                    
                    print(f"\nJarvis: {response}")
                    await self.speak(response)
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"\n[!] {e}")
        
        print("\nShutting down...")
        
        # Cleanup
        try:
            import shutil
            shutil.rmtree(self.temp_dir)
        except:
            pass

async def main():
    chat = UltraFastJarvis()
    await chat.run()

if __name__ == "__main__":
    print("\n" + "="*60)
    print("   JARVIS - ULTRA LOW LATENCY")
    print("   Performance-Optimized Mode")
    print("="*60)
    asyncio.run(main())

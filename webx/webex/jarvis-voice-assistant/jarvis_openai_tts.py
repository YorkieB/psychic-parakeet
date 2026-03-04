"""
Jarvis - OpenAI TTS Version (MUCH FASTER!)
Using OpenAI TTS instead of ElevenLabs
Target: 300-500ms TTS latency
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
from jarvis.stt_engine import STTEngine
from openai import OpenAI
import yaml
import time
import io

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

class FastOpenAITTS:
    """Fast TTS using OpenAI"""
    
    def __init__(self, api_key):
        self.client = OpenAI(api_key=api_key)
    
    async def text_to_speech(self, text: str) -> np.ndarray:
        """Generate speech using OpenAI TTS (FAST!)"""
        try:
            # Use OpenAI TTS API
            response = await asyncio.to_thread(
                self.client.audio.speech.create,
                model="tts-1",  # Fastest model
                voice="onyx",   # Male voice (like Jarvis)
                input=text,
                speed=1.1       # Slightly faster for snappier feel
            )
            
            # Get audio data
            audio_bytes = response.content
            
            # Convert to numpy array
            import librosa
            audio_data, _ = librosa.load(io.BytesIO(audio_bytes), sr=16000, mono=True)
            
            return audio_data.astype(np.float32)
            
        except Exception as e:
            print(f"\n[TTS Error: {e}]")
            return np.array([], dtype=np.float32)

class FastJarvis:
    """Jarvis with OpenAI TTS - 3x faster!"""
    
    def __init__(self):
        print("\n" + "="*60)
        print("   JARVIS - OpenAI TTS Mode")
        print("   Expected TTS: 300-500ms (vs 1200ms)")
        print("="*60)
        print("\nInitializing...")
        
        try:
            with open("configs/voice_config.yaml", 'r') as f:
                config = yaml.safe_load(f)
            api_key = config.get('stt', {}).get('api_key')
            self.openai_client = OpenAI(api_key=api_key)
            print("  [OK] OpenAI client")
        except:
            self.openai_client = None
            print("  [ERROR] No API key!")
            return
        
        # Use OpenAI TTS instead of ElevenLabs!
        self.tts = FastOpenAITTS(api_key)
        print("  [OK] OpenAI TTS (FAST!)")
        
        self.stt = STTEngine()
        print("  [OK] Voice input")
        
        self.temp_dir = tempfile.mkdtemp()
        self.conversation_history = []
        self.is_speaking = False
        
        print("\n[READY] Fast TTS active!\n")
    
    async def speak(self, text: str):
        """Fast speech with timing"""
        self.is_speaking = True
        
        try:
            print(f"  [TTS] ", end="", flush=True)
            start = time.time()
            
            audio_data = await self.tts.text_to_speech(text)
            
            tts_time = time.time() - start
            print(f"{int(tts_time*1000)}ms", end="")
            
            if len(audio_data) > 0:
                if tts_time < 0.5:
                    print(" ✓ FAST!")
                elif tts_time < 0.8:
                    print(" ✓ Good")
                else:
                    print(" (slow)")
                
                temp_wav = Path(self.temp_dir) / "out.wav"
                sf.write(temp_wav, audio_data, 16000)
                
                proc = subprocess.Popen(
                    ['powershell', '-Command', f'(New-Object Media.SoundPlayer "{temp_wav}").PlaySync()'],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                proc.wait()
                
                try:
                    temp_wav.unlink()
                except:
                    pass
        except Exception as e:
            print(f"\n[Error: {e}]")
        
        self.is_speaking = False
    
    def record_fast_vad(self, max_duration=10):
        """Fast VAD - 400ms silence"""
        print(f"[REC] ", end="", flush=True)
        
        sample_rate = 16000
        silence_threshold = 0.01
        silence_duration = 0.4
        silence_chunks = int(silence_duration * sample_rate / 512)
        
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
                                print(f" {int(duration*1000)}ms")
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
    
    async def transcribe(self, audio_file):
        """Transcribe with timing"""
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
    
    async def get_response(self, user_text: str) -> str:
        """Fast AI response"""
        try:
            if not self.openai_client:
                return "AI offline."
            
            print("  [AI ] ", end="", flush=True)
            start = time.time()
            
            self.conversation_history.append({"role": "user", "content": user_text})
            
            messages = [
                {"role": "system", "content": "Jarvis. 1-2 sentences. Concise."}
            ] + self.conversation_history[-4:]
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=60,
                temperature=0.7
            )
            
            text = response.choices[0].message.content
            ai_time = time.time() - start
            print(f"{int(ai_time*1000)}ms")
            
            self.conversation_history.append({"role": "assistant", "content": text})
            
            return text
        except Exception as e:
            print(f"✗")
            return "Error."
    
    async def run(self):
        """Main loop"""
        print("="*60)
        print("OPTIMIZATIONS:")
        print("  • OpenAI TTS (300-500ms vs 1200ms+)")
        print("  • 400ms silence detection")
        print("  • Minimal AI context")
        print("  • Performance monitoring")
        print("\nCommands: ENTER | type | q")
        print("="*60 + "\n")
        
        greeting = "Hello! OpenAI TTS is much faster!"
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
                    audio = self.record_fast_vad(max_duration=10)
                    
                    if audio:
                        text = await self.transcribe(audio)
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
                    response = await self.get_response(text)
                    
                    total_time = time.time() - total_start
                    print(f"\n  ⚡ Pipeline: {int(total_time*1000)}ms")
                    
                    print(f"\nJarvis: {response}")
                    await self.speak(response)
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"\n[!] {e}")
        
        print("\nGoodbye!")
        
        # Cleanup
        try:
            import shutil
            shutil.rmtree(self.temp_dir)
        except:
            pass

async def main():
    chat = FastJarvis()
    await chat.run()

if __name__ == "__main__":
    print("\n" + "="*60)
    print("   JARVIS - OpenAI TTS")
    print("   3x Faster Voice Generation")
    print("="*60)
    asyncio.run(main())

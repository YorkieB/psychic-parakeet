"""
Jarvis - LOW LATENCY VERSION
Optimized for fast, natural conversation
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

# Suppress errors
warnings.filterwarnings('ignore')
logging.basicConfig(level=logging.CRITICAL)

class SuppressOutput:
    def __enter__(self):
        self._original_stderr = sys.stderr
        sys.stderr = open(os.devnull, 'w')
        return self
    def __exit__(self, *args):
        sys.stderr.close()
        sys.stderr = self._original_stderr

class FastJarvis:
    """Jarvis optimized for low latency"""
    
    def __init__(self):
        print("\n" + "="*60)
        print("   JARVIS - LOW LATENCY MODE")
        print("="*60)
        print("\nInitializing...")
        
        self.tts = TTSEngine(voice_style="jarvis")
        print("  [OK] Voice output")
        
        self.stt = STTEngine()
        print("  [OK] Voice input")
        
        try:
            with open("configs/voice_config.yaml", 'r') as f:
                config = yaml.safe_load(f)
            api_key = config.get('stt', {}).get('api_key')
            self.openai_client = OpenAI(api_key=api_key)
            print("  [OK] AI (fast mode)")
        except:
            self.openai_client = None
        
        self.temp_dir = tempfile.mkdtemp()
        self.conversation_history = []
        self.is_speaking = False
        self.stop_speaking = False
        
        print("\n[READY] Fast & responsive!\n")
    
    async def speak(self, text: str, can_interrupt=True):
        """Speak with interruption"""
        self.is_speaking = True
        self.stop_speaking = False
        
        try:
            audio_data = await self.tts.text_to_speech(text)
            
            if len(audio_data) > 0:
                temp_wav = Path(self.temp_dir) / "output.wav"
                sf.write(temp_wav, audio_data, 16000)
                
                self.playback = subprocess.Popen(
                    ['powershell', '-Command', f'(New-Object Media.SoundPlayer "{temp_wav}").PlaySync()'],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                
                while self.playback.poll() is None:
                    if self.stop_speaking:
                        self.playback.terminate()
                        print("  [Cut!]")
                        break
                    await asyncio.sleep(0.03)  # Faster interrupt check
                
                try:
                    temp_wav.unlink()
                except:
                    pass
        except:
            pass
        
        self.is_speaking = False
    
    def record_fast_vad(self, max_duration=15):
        """Fast Voice Activity Detection - 0.8 sec silence"""
        print(f"\n[LISTENING] ", end="", flush=True)
        
        sample_rate = 16000
        silence_threshold = 0.012  # Slightly lower for faster detection
        silence_duration = 0.8  # FASTER - only 0.8 seconds of silence
        silence_chunks_needed = int(silence_duration * sample_rate / 1024)
        
        recorded_chunks = []
        silence_counter = 0
        started_speaking = False
        
        start_time = time.time()
        
        with SuppressOutput():
            try:
                with sd.InputStream(samplerate=sample_rate, channels=1, dtype='float32', blocksize=1024) as stream:
                    while time.time() - start_time < max_duration:
                        chunk, _ = stream.read(1024)
                        volume = np.max(np.abs(chunk))
                        
                        if volume > silence_threshold:
                            started_speaking = True
                            silence_counter = 0
                            recorded_chunks.append(chunk)
                            print("█", end="", flush=True)
                        elif started_speaking:
                            silence_counter += 1
                            recorded_chunks.append(chunk)
                            
                            if silence_counter >= silence_chunks_needed:
                                print(" [Stop]")
                                break
            except:
                return None
        
        if not recorded_chunks:
            print("\n  No speech")
            return None
        
        audio = np.concatenate(recorded_chunks, axis=0)
        temp_audio = Path(self.temp_dir) / "rec.wav"
        sf.write(temp_audio, audio, sample_rate)
        
        return temp_audio
    
    async def transcribe(self, audio_file):
        """Fast transcription"""
        try:
            if not audio_file:
                return None
            
            print("  Transcribing...", end="", flush=True)
            text = await self.stt.transcribe_audio(str(audio_file))
            print(" ✓")
            
            try:
                audio_file.unlink()
            except:
                pass
            
            return text
        except:
            print(" ✗")
            return None
    
    async def get_fast_response(self, user_text: str) -> str:
        """Fast AI response - optimized settings"""
        try:
            if not self.openai_client:
                return "AI not available."
            
            self.conversation_history.append({"role": "user", "content": user_text})
            
            messages = [
                {"role": "system", "content": "You are Jarvis. Be VERY concise - 1-2 short sentences max. Respond quickly."}
            ] + self.conversation_history[-6:]  # Shorter history = faster
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",  # FASTER model than gpt-4
                messages=messages,
                max_tokens=80,  # SHORTER responses = faster
                temperature=0.7
            )
            
            assistant_text = response.choices[0].message.content
            self.conversation_history.append({"role": "assistant", "content": assistant_text})
            
            return assistant_text
        except:
            return "Error."
    
    async def run(self):
        """Fast conversation loop"""
        print("="*60)
        print("OPTIMIZED FOR SPEED:")
        print("  • 0.8 sec silence detection (vs 1.5)")
        print("  • Faster AI model (gpt-4o-mini)")
        print("  • Shorter responses (quicker)")
        print("  • Minimal delays")
        print("\nCommands: ENTER=speak | type | 'quit'=exit")
        print("="*60 + "\n")
        
        greeting = "Hi! I'm Jarvis in fast mode. Let's chat!"
        print(f"Jarvis: {greeting}")
        await self.speak(greeting, can_interrupt=False)
        
        while True:
            try:
                print("\n" + "-"*60)
                
                if self.is_speaking:
                    user_input = input("\n[ENTER=interrupt]: ").strip()
                    if not user_input:
                        self.stop_speaking = True
                        await asyncio.sleep(0.1)
                        continue
                else:
                    user_input = input("\nENTER=speak | type | quit: ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'bye', 'q']:
                    print("\nJarvis: Bye!")
                    await self.speak("Goodbye!", can_interrupt=False)
                    break
                
                if not user_input:
                    # VOICE INPUT
                    audio = self.record_fast_vad(max_duration=15)
                    if audio:
                        text = await self.transcribe(audio)
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
                    print("\n  Thinking...", end="", flush=True)
                    response = await self.get_fast_response(text)
                    print(" ✓")
                    print(f"\nJarvis: {response}")
                    await self.speak(response, can_interrupt=True)
                
            except KeyboardInterrupt:
                print("\n\nBye!")
                break
            except:
                pass
        
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
    print("   JARVIS - LOW LATENCY MODE")
    print("   Optimized for fast, natural conversation")
    print("="*60)
    asyncio.run(main())

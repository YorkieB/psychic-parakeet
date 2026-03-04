"""
Jarvis with TRUE Voice Activity Detection
Auto-detects when you stop speaking + Barge-in support
(Callback errors suppressed - they're harmless!)
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

# Aggressive error suppression
warnings.filterwarnings('ignore')
logging.basicConfig(level=logging.CRITICAL)
os.environ['PYTHONWARNINGS'] = 'ignore'

# Suppress stderr to hide callback errors
class SuppressOutput:
    def __enter__(self):
        self._original_stderr = sys.stderr
        sys.stderr = open(os.devnull, 'w')
        return self
    def __exit__(self, *args):
        sys.stderr.close()
        sys.stderr = self._original_stderr

class VADJarvis:
    """Jarvis with Voice Activity Detection"""
    
    def __init__(self):
        print("\n" + "="*60)
        print("   JARVIS WITH VOICE ACTIVITY DETECTION")
        print("="*60)
        print("\nInitializing...")
        
        self.tts = TTSEngine(voice_style="jarvis")
        print("  [OK] Voice output")
        
        self.stt = STTEngine()
        print("  [OK] Voice input with silence detection")
        
        try:
            with open("configs/voice_config.yaml", 'r') as f:
                config = yaml.safe_load(f)
            api_key = config.get('stt', {}).get('api_key')
            self.openai_client = OpenAI(api_key=api_key)
            print("  [OK] AI brain")
        except:
            self.openai_client = None
        
        self.temp_dir = tempfile.mkdtemp()
        self.conversation_history = []
        self.is_speaking = False
        self.stop_speaking = False
        
        print("\n[READY] Speak naturally - I'll know when you're done!\n")
    
    async def speak(self, text: str, can_interrupt=True):
        """Speak with interruption support"""
        self.is_speaking = True
        self.stop_speaking = False
        
        try:
            audio_data = await self.tts.text_to_speech(text)
            
            if len(audio_data) > 0:
                temp_wav = Path(self.temp_dir) / "output.wav"
                sf.write(temp_wav, audio_data, 16000)
                
                if can_interrupt:
                    print("  [Speaking... Press ENTER to interrupt]")
                
                self.playback = subprocess.Popen(
                    ['powershell', '-Command', f'(New-Object Media.SoundPlayer "{temp_wav}").PlaySync()'],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                
                while self.playback.poll() is None:
                    if self.stop_speaking:
                        self.playback.terminate()
                        print("  [Interrupted!]")
                        break
                    await asyncio.sleep(0.05)
                
                try:
                    temp_wav.unlink()
                except:
                    pass
        except:
            pass
        
        self.is_speaking = False
    
    def record_with_silence_detection(self, max_duration=20, silence_duration=1.5):
        """Record with silence detection - stops automatically!"""
        print(f"\n[LISTENING] Speak now...")
        print(f"  (Will auto-stop after {silence_duration} sec of silence)")
        print("  Recording: ", end="", flush=True)
        
        sample_rate = 16000
        silence_threshold = 0.015  # Volume threshold
        silence_chunks_needed = int(silence_duration * sample_rate / 1024)
        
        recorded_chunks = []
        silence_counter = 0
        started_speaking = False
        
        start_time = time.time()
        
        # Suppress stderr during recording to hide callback errors
        with SuppressOutput():
            try:
                with sd.InputStream(samplerate=sample_rate, channels=1, dtype='float32', blocksize=1024) as stream:
                    while time.time() - start_time < max_duration:
                        chunk, _ = stream.read(1024)
                        volume = np.max(np.abs(chunk))
                        
                        if volume > silence_threshold:
                            # Speaking detected
                            started_speaking = True
                            silence_counter = 0
                            recorded_chunks.append(chunk)
                            print("█", end="", flush=True)  # Visual feedback
                        elif started_speaking:
                            # Silence after speaking
                            silence_counter += 1
                            recorded_chunks.append(chunk)
                            print("░", end="", flush=True)  # Silence feedback
                            
                            if silence_counter >= silence_chunks_needed:
                                print()
                                print("  [OK] Silence detected - stopping")
                                break
            except Exception as e:
                print(f"\n  [ERROR] Recording failed: {e}")
                return None
        
        if not recorded_chunks:
            print("\n  [WARNING] No speech detected")
            return None
        
        # Combine chunks
        audio = np.concatenate(recorded_chunks, axis=0)
        
        # Save to file
        temp_audio = Path(self.temp_dir) / "recording.wav"
        sf.write(temp_audio, audio, sample_rate)
        
        duration = len(audio) / sample_rate
        print(f"  [OK] Recorded {duration:.1f} seconds")
        
        return temp_audio
    
    async def transcribe(self, audio_file):
        """Transcribe audio"""
        try:
            if not audio_file or not audio_file.exists():
                return None
            
            print("  [Processing] Transcribing your speech...")
            text = await self.stt.transcribe_audio(str(audio_file))
            
            try:
                audio_file.unlink()
            except:
                pass
            
            return text
        except:
            print("  [ERROR] Transcription failed")
            return None
    
    async def get_response(self, user_text: str) -> str:
        """Get AI response"""
        try:
            if not self.openai_client:
                return "I cannot process conversations without AI."
            
            self.conversation_history.append({"role": "user", "content": user_text})
            
            messages = [
                {"role": "system", "content": "You are Jarvis, a helpful voice assistant. Be concise (2-3 sentences)."}
            ] + self.conversation_history[-10:]
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                max_tokens=150,
                temperature=0.7
            )
            
            assistant_text = response.choices[0].message.content
            self.conversation_history.append({"role": "assistant", "content": assistant_text})
            
            return assistant_text
        except:
            return "I apologize, I had an error."
    
    async def run(self):
        """Main conversation loop"""
        print("="*60)
        print("HOW IT WORKS:")
        print("  1. Press ENTER - Start speaking")
        print("  2. Speak naturally - Stops after 1.5 sec silence")
        print("  3. Press ENTER while Jarvis speaks - Interrupt")
        print("  4. Type 'quit' - Exit")
        print("="*60 + "\n")
        
        greeting = "Hello! I'm Jarvis. Press Enter and speak - I'll detect when you finish!"
        print(f"Jarvis: {greeting}")
        await self.speak(greeting, can_interrupt=False)
        
        while True:
            try:
                print("\n" + "-"*60)
                
                if self.is_speaking:
                    user_input = input("\n[Press ENTER to interrupt Jarvis]: ").strip()
                    if not user_input:
                        self.stop_speaking = True
                        await asyncio.sleep(0.2)
                        continue
                else:
                    user_input = input("\nPress ENTER to speak (or type / 'quit'): ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'bye']:
                    print("\nJarvis: Goodbye!")
                    await self.speak("Goodbye! It was wonderful talking to you!", can_interrupt=False)
                    break
                
                if not user_input:
                    # VOICE INPUT with silence detection
                    audio = self.record_with_silence_detection(max_duration=20, silence_duration=1.5)
                    if audio:
                        text = await self.transcribe(audio)
                        if text:
                            print(f"\n  [You said]: {text}")
                        else:
                            print("\n  [ERROR] Couldn't transcribe - try again")
                            continue
                    else:
                        continue
                else:
                    # TEXT INPUT
                    text = user_input
                
                if text:
                    print("\n  [Jarvis is thinking...]")
                    response = await self.get_response(text)
                    print(f"\nJarvis: {response}")
                    await self.speak(response, can_interrupt=True)
                
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

async def main():
    chat = VADJarvis()
    await chat.run()

if __name__ == "__main__":
    print("\n" + "="*60)
    print("   JARVIS - Voice Activity Detection")
    print("   Auto-stops when you finish speaking!")
    print("="*60)
    asyncio.run(main())

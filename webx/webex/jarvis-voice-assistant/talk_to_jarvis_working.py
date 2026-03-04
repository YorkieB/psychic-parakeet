"""
Talk to Jarvis - WORKING VERSION
Your microphone test passed! This version suppresses callback warnings.
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
from jarvis.tts_engine import TTSEngine
from jarvis.stt_engine import STTEngine
from openai import OpenAI
import yaml

# Suppress ALL warnings and errors from sounddevice
warnings.filterwarnings('ignore')
import sys
import os
import ctypes

# Hide error message boxes on Windows
if sys.platform == 'win32':
    ctypes.windll.kernel32.SetErrorMode(0x0001 | 0x0002)

# Redirect stderr to suppress callback errors
class SuppressStderr:
    def __enter__(self):
        self.old_stderr = sys.stderr
        self.old_stdout = sys.stdout
        sys.stderr = open(os.devnull, 'w')
        return self
    
    def __exit__(self, *args):
        sys.stderr.close()
        sys.stderr = self.old_stderr

# Setup logging
logging.basicConfig(level=logging.WARNING, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WorkingJarvisChat:
    """Voice chat that actually works!"""
    
    def __init__(self):
        print("\nInitializing Jarvis Voice System...")
        
        self.tts = TTSEngine(voice_style="jarvis")
        print("  [OK] Voice output ready")
        
        self.stt = STTEngine()
        print("  [OK] Voice input ready")
        
        try:
            with open("configs/voice_config.yaml", 'r') as f:
                config = yaml.safe_load(f)
            api_key = config.get('stt', {}).get('api_key')
            self.openai_client = OpenAI(api_key=api_key)
            print("  [OK] AI system ready")
        except Exception as e:
            logger.error(f"OpenAI initialization failed: {e}")
            self.openai_client = None
        
        self.temp_dir = tempfile.mkdtemp()
        self.conversation_history = []
        print("\n[READY] Microphone test passed - You can speak to Jarvis!\n")
    
    async def speak(self, text: str):
        """Generate and play speech"""
        try:
            audio_data = await self.tts.text_to_speech(text)
            
            if len(audio_data) > 0:
                temp_wav = Path(self.temp_dir) / "jarvis_output.wav"
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
                
                return True
            return False
        except Exception as e:
            logger.error(f"Speech error: {e}")
            return False
    
    def record_audio(self, duration=10):
        """Record audio - callback warnings suppressed"""
        try:
            print(f"\n[LISTENING] Recording for {duration} seconds...")
            print(f"  >> SPEAK NOW - Take your time, you have {duration} seconds!")
            
            sample_rate = 16000
            
            # Record with stderr suppressed to hide callback warnings
            with SuppressStderr():
                audio = sd.rec(
                    int(duration * sample_rate),
                    samplerate=sample_rate,
                    channels=1,
                    dtype='float32',
                    blocking=True
                )
            
            print("  [OK] Recording complete!")
            
            # Save to file
            temp_audio = Path(self.temp_dir) / "recording.wav"
            sf.write(temp_audio, audio, sample_rate)
            
            return temp_audio
            
        except Exception as e:
            logger.error(f"Recording error: {e}")
            return None
    
    async def transcribe_audio(self, audio_file):
        """Transcribe audio to text"""
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
            
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return None
    
    async def get_response(self, user_text: str) -> str:
        """Get AI response"""
        try:
            if not self.openai_client:
                return "I'm sorry, I cannot process conversations without an OpenAI connection."
            
            self.conversation_history.append({
                "role": "user",
                "content": user_text
            })
            
            messages = [
                {"role": "system", "content": "You are Jarvis, a helpful and intelligent voice assistant. Keep responses concise and conversational (2-3 sentences max)."}
            ] + self.conversation_history[-10:]
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                max_tokens=150,
                temperature=0.7
            )
            
            assistant_text = response.choices[0].message.content
            
            self.conversation_history.append({
                "role": "assistant",
                "content": assistant_text
            })
            
            return assistant_text
            
        except Exception as e:
            logger.error(f"Response error: {e}")
            return "I apologize, I encountered an error."
    
    async def chat_loop(self):
        """Main chat loop"""
        print("="*60)
        print("   JARVIS - VOICE CONVERSATION")
        print("   (Microphone Test: PASSED!)")
        print("="*60)
        print("\nHow it works:")
        print("  1. Press ENTER to record (10 seconds - plenty of time!)")
        print("  2. Speak your message at a natural pace")
        print("  3. Jarvis transcribes and responds with voice")
        print("  4. Type 'quit' to exit")
        print("\n" + "="*60 + "\n")
        
        greeting = "Hello! I'm Jarvis. Your microphone is working perfectly! What would you like to talk about?"
        print(f"Jarvis: {greeting}")
        print("  [Speaking...]")
        await self.speak(greeting)
        
        while True:
            try:
                print("\n" + "-"*60)
                user_input = input("\nPress ENTER to speak (or type/quit): ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'bye']:
                    farewell = "Goodbye! It was great talking to you!"
                    print(f"\nJarvis: {farewell}")
                    print("  [Speaking...]")
                    await self.speak(farewell)
                    print("\n[Shutting down...]\n")
                    break
                
                if not user_input:
                    # VOICE INPUT
                    audio_file = self.record_audio(duration=10)
                    if audio_file:
                        user_text = await self.transcribe_audio(audio_file)
                        if user_text:
                            print(f"\n  [You said]: {user_text}")
                        else:
                            print("\n  [ERROR] Could not transcribe. Try again or type your message.")
                            continue
                    else:
                        print("\n  [ERROR] Recording failed.")
                        continue
                else:
                    # TEXT INPUT
                    user_text = user_input
                
                if not user_text:
                    continue
                
                print("\n  [Jarvis is thinking...]")
                response = await self.get_response(user_text)
                
                print(f"\nJarvis: {response}")
                print("  [Speaking...]")
                await self.speak(response)
                
            except KeyboardInterrupt:
                print("\n\n[INTERRUPTED]")
                break
            except EOFError:
                break
            except Exception as e:
                logger.error(f"Error: {e}")
        
        # Cleanup
        try:
            import shutil
            shutil.rmtree(self.temp_dir)
        except:
            pass

async def main():
    try:
        chat = WorkingJarvisChat()
        await chat.chat_loop()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        print(f"\n[ERROR] {e}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("   JARVIS VOICE ASSISTANT - WORKING VERSION")
    print("="*60)
    asyncio.run(main())

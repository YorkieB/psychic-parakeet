"""
Talk to Jarvis - COMPLETE VERSION
✅ Voice Activity Detection (VAD) - Auto-detects when you finish
✅ Barge-in Support - Interrupt Jarvis while speaking
✅ No error popups - Clean experience
"""
import asyncio
import logging
import tempfile
import subprocess
import threading
from pathlib import Path
import soundfile as sf
import numpy as np
import warnings
from jarvis.tts_engine import TTSEngine
from jarvis.stt_engine import STTEngine
from openai import OpenAI
import yaml
import time

# Suppress warnings
warnings.filterwarnings('ignore')
logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger(__name__)

class CompleteJarvisChat:
    """Complete voice assistant with VAD and barge-in"""
    
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
            self.openai_client = None
        
        self.temp_dir = tempfile.mkdtemp()
        self.conversation_history = []
        self.is_speaking = False
        self.stop_speaking = False
        self.playback_process = None
        
        print("  [OK] Voice Activity Detection enabled")
        print("  [OK] Barge-in support enabled")
        print("\n[READY] Natural conversation ready!\n")
    
    async def speak(self, text: str, allow_interrupt=True):
        """Generate and play speech with barge-in support"""
        try:
            self.is_speaking = True
            self.stop_speaking = False
            
            # Generate audio
            audio_data = await self.tts.text_to_speech(text)
            
            if len(audio_data) > 0:
                temp_wav = Path(self.temp_dir) / "jarvis_output.wav"
                sf.write(temp_wav, audio_data, 16000)
                
                # Start playback in background thread if barge-in enabled
                if allow_interrupt:
                    print("  [Speaking... Press ENTER to interrupt]")
                    self.playback_process = subprocess.Popen(
                        ['powershell', '-Command', f'(New-Object Media.SoundPlayer "{temp_wav}").PlaySync()'],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL
                    )
                    
                    # Monitor for interruption
                    while self.playback_process.poll() is None:
                        if self.stop_speaking:
                            self.playback_process.terminate()
                            print("\n  [Interrupted!]")
                            break
                        await asyncio.sleep(0.1)
                else:
                    # No interruption allowed
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
                
                self.is_speaking = False
                return True
            
            self.is_speaking = False
            return False
        except Exception as e:
            self.is_speaking = False
            return False
    
    def record_with_vad(self, max_duration=20, silence_duration=1.5):
        """Record with Voice Activity Detection"""
        try:
            import sounddevice as sd
            
            print(f"\n[LISTENING] Speak now...")
            print("  >> Jarvis will detect when you finish (1.5 sec silence)")
            
            sample_rate = 16000
            silence_threshold = 0.015
            silence_chunks_needed = int(silence_duration * sample_rate / 1024)
            
            recorded_chunks = []
            silence_counter = 0
            started_speaking = False
            
            start_time = time.time()
            
            while time.time() - start_time < max_duration:
                chunk = sd.rec(1024, samplerate=sample_rate, channels=1, dtype='float32', blocking=True)
                volume = np.max(np.abs(chunk))
                
                if volume > silence_threshold:
                    started_speaking = True
                    silence_counter = 0
                    recorded_chunks.append(chunk)
                    print(".", end="", flush=True)
                elif started_speaking:
                    silence_counter += 1
                    recorded_chunks.append(chunk)
                    
                    if silence_counter >= silence_chunks_needed:
                        print("\n  [OK] End of speech detected")
                        break
            
            if not recorded_chunks:
                print("\n  [WARNING] No speech detected")
                return None
            
            audio = np.concatenate(recorded_chunks, axis=0)
            temp_audio = Path(self.temp_dir) / "recording.wav"
            sf.write(temp_audio, audio, sample_rate)
            
            duration = len(audio) / sample_rate
            print(f"  [OK] Recorded {duration:.1f} seconds")
            
            return temp_audio
            
        except Exception as e:
            print(f"\n  [ERROR] Recording failed")
            return None
    
    async def transcribe_audio(self, audio_file):
        """Transcribe audio"""
        try:
            if not audio_file or not audio_file.exists():
                return None
            
            print("  [Processing] Transcribing...")
            text = await self.stt.transcribe_audio(str(audio_file))
            
            try:
                audio_file.unlink()
            except:
                pass
            
            return text
            
        except Exception as e:
            return None
    
    async def get_response(self, user_text: str) -> str:
        """Get AI response"""
        try:
            if not self.openai_client:
                return "I'm sorry, I cannot process conversations."
            
            self.conversation_history.append({"role": "user", "content": user_text})
            
            messages = [
                {"role": "system", "content": "You are Jarvis, a helpful voice assistant. Keep responses concise (2-3 sentences)."}
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
            
        except Exception as e:
            return "I apologize, I encountered an error."
    
    async def chat_loop(self):
        """Main conversation loop"""
        print("="*60)
        print("   JARVIS - COMPLETE VOICE ASSISTANT")
        print("="*60)
        print("\n✅ Voice Activity Detection - Stops when you finish")
        print("✅ Barge-in Support - Press ENTER to interrupt Jarvis")
        print("✅ Natural Conversation - No time limits!")
        print("\n" + "="*60)
        print("\nCommands:")
        print("  • Press ENTER - Start speaking")
        print("  • Press ENTER while Jarvis speaks - Interrupt him")
        print("  • Type message - Text input")
        print("  • Type 'quit' - Exit")
        print("\n" + "="*60 + "\n")
        
        greeting = "Hello! I'm Jarvis. Press Enter to speak - you can even interrupt me if needed!"
        print(f"Jarvis: {greeting}")
        await self.speak(greeting, allow_interrupt=False)
        
        while True:
            try:
                print("\n" + "-"*60)
                
                # Check if Jarvis is speaking
                if self.is_speaking:
                    user_input = input("\n[Press ENTER to interrupt Jarvis]: ").strip()
                    if not user_input:
                        self.stop_speaking = True
                        await asyncio.sleep(0.3)  # Wait for interruption
                        continue
                else:
                    user_input = input("\nPress ENTER to speak (or type/quit): ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'bye']:
                    farewell = "Goodbye! Great talking to you!"
                    print(f"\nJarvis: {farewell}")
                    await self.speak(farewell, allow_interrupt=False)
                    print("\n[Shutting down...]\n")
                    break
                
                if not user_input:
                    # VOICE INPUT
                    audio_file = self.record_with_vad(max_duration=20, silence_duration=1.5)
                    if audio_file:
                        user_text = await self.transcribe_audio(audio_file)
                        if user_text:
                            print(f"\n  [You said]: {user_text}")
                        else:
                            print("\n  [ERROR] Could not transcribe")
                            continue
                    else:
                        print("\n  [ERROR] No speech detected")
                        continue
                else:
                    # TEXT INPUT
                    user_text = user_input
                
                if not user_text:
                    continue
                
                print("\n  [Jarvis is thinking...]")
                response = await self.get_response(user_text)
                
                print(f"\nJarvis: {response}")
                await self.speak(response, allow_interrupt=True)
                
            except KeyboardInterrupt:
                print("\n\n[INTERRUPTED]")
                break
            except EOFError:
                break
            except Exception as e:
                print(f"\n[ERROR]")
        
        # Cleanup
        try:
            import shutil
            shutil.rmtree(self.temp_dir)
        except:
            pass

async def main():
    try:
        chat = CompleteJarvisChat()
        await chat.chat_loop()
    except Exception as e:
        print(f"\n[ERROR] {e}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("   JARVIS - COMPLETE VOICE ASSISTANT")
    print("   VAD + Barge-in + Natural Conversation")
    print("="*60)
    asyncio.run(main())

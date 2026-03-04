"""
Talk to Jarvis - Voice Activity Detection (VAD)
Automatically detects when you stop speaking!
"""
import asyncio
import logging
import tempfile
import subprocess
from pathlib import Path
import soundfile as sf
import numpy as np
import warnings
from jarvis.tts_engine import TTSEngine
from jarvis.stt_engine import STTEngine
from openai import OpenAI
import yaml
import time
import collections

# Suppress warnings
warnings.filterwarnings('ignore')

# Setup logging (quieter)
logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger(__name__)

class VADJarvisChat:
    """Voice chat with utterance detection - stops when you stop speaking!"""
    
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
        print("  [OK] Utterance detection enabled")
        print("\n[READY] Speak naturally - Jarvis knows when you're done!\n")
    
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
            return False
    
    def record_with_vad(self, max_duration=20, silence_duration=2.0):
        """Record with Voice Activity Detection - stops when you stop speaking"""
        try:
            import sounddevice as sd
            
            print(f"\n[LISTENING] Speak now... (stops automatically when you're done)")
            print("  >> Start speaking - Jarvis will detect when you finish!")
            
            sample_rate = 16000
            silence_threshold = 0.01  # Amplitude threshold for silence
            silence_chunks_needed = int(silence_duration * sample_rate / 1024)
            
            recorded_chunks = []
            silence_counter = 0
            started_speaking = False
            
            # Record in chunks
            with sd.InputStream(samplerate=sample_rate, channels=1, dtype='float32', blocksize=1024):
                start_time = time.time()
                
                while time.time() - start_time < max_duration:
                    # Read a chunk
                    chunk = sd.rec(1024, samplerate=sample_rate, channels=1, dtype='float32', blocking=True)
                    
                    # Check volume
                    volume = np.max(np.abs(chunk))
                    
                    # Detect if speaking
                    if volume > silence_threshold:
                        started_speaking = True
                        silence_counter = 0
                        recorded_chunks.append(chunk)
                        print(".", end="", flush=True)  # Visual feedback
                    elif started_speaking:
                        # Silent chunk after we started
                        silence_counter += 1
                        recorded_chunks.append(chunk)
                        
                        # Stop if enough silence
                        if silence_counter >= silence_chunks_needed:
                            print("\n  [OK] Detected end of speech")
                            break
            
            if not recorded_chunks:
                print("\n  [WARNING] No speech detected")
                return None
            
            # Combine all chunks
            audio = np.concatenate(recorded_chunks, axis=0)
            
            # Save to file
            temp_audio = Path(self.temp_dir) / "recording.wav"
            sf.write(temp_audio, audio, sample_rate)
            
            duration = len(audio) / sample_rate
            print(f"  [OK] Recorded {duration:.1f} seconds")
            
            return temp_audio
            
        except Exception as e:
            print(f"\n  [ERROR] Recording failed: {e}")
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
            print(f"  [ERROR] Transcription failed")
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
            return "I apologize, I encountered an error."
    
    async def chat_loop(self):
        """Main chat loop with VAD"""
        print("="*60)
        print("   JARVIS - SMART VOICE CONVERSATION")
        print("   (Auto-detects when you finish speaking!)")
        print("="*60)
        print("\nHow it works:")
        print("  1. Press ENTER to start recording")
        print("  2. Speak naturally - no time limit!")
        print("  3. Jarvis detects when you stop (2 sec silence)")
        print("  4. Jarvis transcribes and responds")
        print("  5. Type 'quit' to exit")
        print("\n" + "="*60 + "\n")
        
        greeting = "Hello! I'm Jarvis. Just press Enter and start speaking - I'll know when you're done!"
        print(f"Jarvis: {greeting}")
        print("  [Speaking...]")
        await self.speak(greeting)
        
        while True:
            try:
                print("\n" + "-"*60)
                user_input = input("\nPress ENTER to speak (or type/quit): ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'bye']:
                    farewell = "Goodbye! It was wonderful talking to you!"
                    print(f"\nJarvis: {farewell}")
                    print("  [Speaking...]")
                    await self.speak(farewell)
                    print("\n[Shutting down...]\n")
                    break
                
                if not user_input:
                    # VOICE INPUT with VAD
                    audio_file = self.record_with_vad(max_duration=20, silence_duration=2.0)
                    if audio_file:
                        user_text = await self.transcribe_audio(audio_file)
                        if user_text:
                            print(f"\n  [You said]: {user_text}")
                        else:
                            print("\n  [ERROR] Could not transcribe. Try again.")
                            continue
                    else:
                        print("\n  [ERROR] Recording failed or no speech detected.")
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
                print(f"\n[ERROR] {e}")
        
        # Cleanup
        try:
            import shutil
            shutil.rmtree(self.temp_dir)
        except:
            pass

async def main():
    try:
        chat = VADJarvisChat()
        await chat.chat_loop()
    except Exception as e:
        print(f"\n[ERROR] {e}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("   JARVIS - Voice Activity Detection")
    print("   Automatically stops when you finish speaking!")
    print("="*60)
    asyncio.run(main())

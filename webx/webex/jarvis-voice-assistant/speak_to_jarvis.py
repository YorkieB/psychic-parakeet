"""
Speak to Jarvis - Full voice input conversation
SPEAK to Jarvis and hear him respond!
"""
import asyncio
import logging
import tempfile
import subprocess
from pathlib import Path
import soundfile as sf
import sounddevice as sd
import numpy as np
import wave
from jarvis.tts_engine import TTSEngine
from jarvis.stt_engine import STTEngine
from openai import OpenAI
import yaml

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class VoiceJarvisChat:
    """Full voice input chat with Jarvis"""
    
    def __init__(self):
        print("\nInitializing Jarvis Voice System...")
        
        # Initialize TTS
        self.tts = TTSEngine(voice_style="jarvis")
        print("  [OK] Voice output ready")
        
        # Initialize STT
        self.stt = STTEngine()
        print("  [OK] Voice input ready")
        
        # Initialize OpenAI
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
        
        # Test audio devices
        print("\n[AUDIO] Checking microphone...")
        try:
            devices = sd.query_devices()
            default_input = sd.query_devices(kind='input')
            print(f"  [OK] Using: {default_input['name']}")
        except Exception as e:
            print(f"  [WARNING] Microphone check: {e}")
        
        print("\n[READY] All systems operational!\n")
    
    async def speak(self, text: str):
        """Generate and play speech"""
        try:
            # Generate audio
            audio_data = await self.tts.text_to_speech(text)
            
            if len(audio_data) > 0:
                # Save to temporary WAV file
                temp_wav = Path(self.temp_dir) / f"jarvis_{hash(text)}.wav"
                sf.write(temp_wav, audio_data, 16000)
                
                # Play using Windows SoundPlayer (no callback errors)
                proc = subprocess.Popen(
                    ['powershell', '-Command', f'(New-Object Media.SoundPlayer "{temp_wav}").PlaySync()'],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                proc.wait()
                
                # Clean up
                try:
                    temp_wav.unlink()
                except:
                    pass
                
                return True
            return False
        except Exception as e:
            logger.error(f"Speech error: {e}")
            return False
    
    def record_audio(self, duration=5):
        """Record audio from microphone"""
        try:
            print(f"\n[LISTENING] Speak now for {duration} seconds...")
            print("  (Speak clearly into your microphone)")
            
            # Record audio using sounddevice
            sample_rate = 16000
            audio = sd.rec(
                int(duration * sample_rate), 
                samplerate=sample_rate, 
                channels=1, 
                dtype='int16',
                blocking=True  # Wait until recording is done
            )
            
            print("  [OK] Recording complete")
            
            # Save to WAV file
            temp_audio = Path(self.temp_dir) / "recording.wav"
            with wave.open(str(temp_audio), 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)  # 16-bit
                wf.setframerate(sample_rate)
                wf.writeframes(audio.tobytes())
            
            return temp_audio
            
        except Exception as e:
            logger.error(f"Recording error: {e}")
            print(f"  [ERROR] Recording failed: {e}")
            return None
    
    async def transcribe_audio(self, audio_file):
        """Transcribe audio to text"""
        try:
            if not audio_file or not audio_file.exists():
                return None
            
            print("  [Processing] Transcribing your speech...")
            text = await self.stt.transcribe_file(str(audio_file))
            
            # Clean up
            try:
                audio_file.unlink()
            except:
                pass
            
            return text
            
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            print(f"  [ERROR] Transcription failed: {e}")
            return None
    
    async def get_response(self, user_text: str) -> str:
        """Get AI response from OpenAI"""
        try:
            if not self.openai_client:
                return "I'm sorry, I cannot process conversations without an OpenAI connection."
            
            # Add to conversation history
            self.conversation_history.append({
                "role": "user",
                "content": user_text
            })
            
            # Get response from GPT
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
            
            # Add to history
            self.conversation_history.append({
                "role": "assistant",
                "content": assistant_text
            })
            
            return assistant_text
            
        except Exception as e:
            logger.error(f"Response error: {e}")
            return "I apologize, I encountered an error processing your request."
    
    async def chat_loop(self):
        """Main voice chat loop"""
        print("="*60)
        print("   JARVIS - VOICE INPUT CONVERSATION")
        print("="*60)
        print("\nHow it works:")
        print("  1. Press ENTER when ready to speak")
        print("  2. Speak your message (5 seconds)")
        print("  3. Jarvis transcribes and responds with voice")
        print("  4. Type 'quit' to exit or 'help' for options")
        print("\n" + "="*60 + "\n")
        
        # Greeting
        greeting = "Hello! I'm Jarvis. I'm ready to hear what you have to say!"
        print(f"Jarvis: {greeting}")
        print("  [Speaking...]")
        await self.speak(greeting)
        
        while True:
            try:
                print("\n" + "-"*60)
                user_input = input("\nPress ENTER to speak (or type message/quit): ").strip()
                
                # Check for quit
                if user_input.lower() in ['quit', 'exit', 'bye', 'goodbye']:
                    farewell = "Goodbye! It was wonderful speaking with you."
                    print(f"\nJarvis: {farewell}")
                    print("  [Speaking...]")
                    await self.speak(farewell)
                    print("\n[Jarvis shutting down...]\n")
                    break
                
                # Help command
                if user_input.lower() == 'help':
                    print("\nOptions:")
                    print("  - Press ENTER: Record voice for 5 seconds")
                    print("  - Type message: Text input (Jarvis still speaks)")
                    print("  - Type 'quit': Exit conversation")
                    continue
                
                # Voice or text input
                if not user_input:
                    # VOICE INPUT
                    audio_file = self.record_audio(duration=5)
                    if audio_file:
                        user_text = await self.transcribe_audio(audio_file)
                        if user_text:
                            print(f"\n  [You said]: {user_text}")
                        else:
                            print("\n  [ERROR] Could not understand audio. Please try again.")
                            continue
                    else:
                        print("\n  [ERROR] Recording failed")
                        continue
                else:
                    # TEXT INPUT
                    user_text = user_input
                
                if not user_text:
                    continue
                
                # Get AI response
                print("\n  [Jarvis is thinking...]")
                response = await self.get_response(user_text)
                
                # Display and speak response
                print(f"\nJarvis: {response}")
                print("  [Speaking...]")
                await self.speak(response)
                
            except KeyboardInterrupt:
                print("\n\n[INTERRUPTED]")
                await self.speak("Shutting down now.")
                break
            except EOFError:
                print("\n[END]")
                break
            except Exception as e:
                logger.error(f"Loop error: {e}")
                print(f"[ERROR] {e}")
        
        # Cleanup
        try:
            import shutil
            shutil.rmtree(self.temp_dir)
        except:
            pass

async def main():
    """Main entry point"""
    try:
        chat = VoiceJarvisChat()
        await chat.chat_loop()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        print(f"\n[ERROR] {e}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("   JARVIS VOICE ASSISTANT - Voice Input Mode")
    print("="*60)
    print("\n  Make sure your MICROPHONE is ready!")
    asyncio.run(main())

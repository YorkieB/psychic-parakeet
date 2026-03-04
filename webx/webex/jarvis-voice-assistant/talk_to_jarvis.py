"""
Talk to Jarvis - Full bidirectional voice conversation
Speak to Jarvis and get voice responses back!
"""
import asyncio
import logging
import tempfile
import os
import subprocess
from pathlib import Path
import numpy as np
import soundfile as sf
import wave
from jarvis.tts_engine import TTSEngine
from jarvis.stt_engine import STTEngine
from openai import OpenAI

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class VoiceConversation:
    """Full voice conversation system with Jarvis"""
    
    def __init__(self):
        logger.info("Initializing Jarvis Voice Conversation System...")
        
        # Initialize TTS (Text-to-Speech)
        self.tts = TTSEngine(voice_style="jarvis")
        logger.info("TTS Engine ready!")
        
        # Initialize STT (Speech-to-Text)
        self.stt = STTEngine()
        logger.info("STT Engine ready!")
        
        # Initialize OpenAI for conversation
        try:
            # Load API key from config
            import yaml
            with open("configs/voice_config.yaml", 'r') as f:
                config = yaml.safe_load(f)
            api_key = config.get('stt', {}).get('api_key')
            self.openai_client = OpenAI(api_key=api_key)
            logger.info("OpenAI client ready!")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI: {e}")
            self.openai_client = None
        
        self.temp_dir = tempfile.mkdtemp()
        self.conversation_history = []
        
        logger.info("All systems ready!")
    
    async def speak(self, text: str):
        """Generate and play speech"""
        try:
            # Generate audio
            audio_data = await self.tts.text_to_speech(text)
            
            if len(audio_data) > 0:
                # Save to temporary WAV file
                temp_wav = Path(self.temp_dir) / f"jarvis_{hash(text)}.wav"
                sf.write(temp_wav, audio_data, 16000)
                
                # Play using Windows SoundPlayer
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
        """Record audio from microphone using Windows"""
        try:
            print(f"\n[LISTENING] Speak now... (recording for {duration} seconds)")
            
            # Create temp file for recording
            temp_audio = Path(self.temp_dir) / "recording.wav"
            
            # Use PowerShell to record audio on Windows
            ps_script = f'''
            Add-Type -AssemblyName System.Speech
            $waveIn = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, 
                [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, 
                [System.Speech.AudioFormat.AudioChannel]::Mono)
            '''
            
            # Alternative: Use ffmpeg or sox if available
            # For now, let's use a simple approach with sounddevice
            try:
                import sounddevice as sd
                print("    [Recording with sounddevice...]")
                audio = sd.rec(int(duration * 16000), samplerate=16000, channels=1, dtype='int16')
                sd.wait()
                
                # Save to WAV file
                with wave.open(str(temp_audio), 'wb') as wf:
                    wf.setnchannels(1)
                    wf.setsampwidth(2)  # 16-bit
                    wf.setframerate(16000)
                    wf.writeframes(audio.tobytes())
                
                print("    [Recording complete]")
                return temp_audio
                
            except ImportError:
                print("    [ERROR] sounddevice not available for recording")
                print("    Please press Enter and type your message instead...")
                return None
                
        except Exception as e:
            logger.error(f"Recording error: {e}")
            return None
    
    async def transcribe_audio(self, audio_file):
        """Transcribe audio to text"""
        try:
            if not audio_file or not audio_file.exists():
                return None
            
            print("    [Transcribing...]")
            text = await self.stt.transcribe_file(str(audio_file))
            
            # Clean up
            try:
                audio_file.unlink()
            except:
                pass
            
            return text
            
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return None
    
    async def get_response(self, user_text: str) -> str:
        """Get AI response from OpenAI"""
        try:
            if not self.openai_client:
                return "I'm sorry, I cannot process conversations without an OpenAI API connection."
            
            # Add to conversation history
            self.conversation_history.append({
                "role": "user",
                "content": user_text
            })
            
            # Get response from GPT
            messages = [
                {"role": "system", "content": "You are Jarvis, a helpful and intelligent voice assistant. Keep responses concise and conversational (2-3 sentences max)."}
            ] + self.conversation_history[-10:]  # Keep last 10 exchanges
            
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
            logger.error(f"Response generation error: {e}")
            return "I apologize, I encountered an error processing your request."
    
    async def conversation_loop(self):
        """Main conversation loop"""
        print("\n" + "="*60)
        print("   JARVIS - INTERACTIVE VOICE CONVERSATION")
        print("="*60)
        print("\nWelcome! You can now talk to Jarvis.")
        print("\nOptions:")
        print("  - Press ENTER to record your voice (5 seconds)")
        print("  - Type 'quit' to exit")
        print("  - Or just type your message\n")
        
        # Greeting
        greeting = "Hello! I'm Jarvis. How can I assist you today?"
        print(f"\nJarvis: {greeting}")
        await self.speak(greeting)
        
        while True:
            try:
                print("\n" + "-"*60)
                user_input = input("\nYou (press ENTER to speak): ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'bye', 'goodbye']:
                    farewell = "Goodbye! It was nice talking to you."
                    print(f"\nJarvis: {farewell}")
                    await self.speak(farewell)
                    break
                
                # Determine if voice or text input
                if not user_input:
                    # Voice input
                    audio_file = self.record_audio(duration=5)
                    if audio_file:
                        user_text = await self.transcribe_audio(audio_file)
                        if user_text:
                            print(f"\n[You said]: {user_text}")
                        else:
                            print("\n[ERROR] Could not understand audio")
                            continue
                    else:
                        # Fallback to text
                        user_text = input("Please type your message: ").strip()
                        if not user_text:
                            continue
                else:
                    # Text input
                    user_text = user_input
                
                if not user_text:
                    continue
                
                # Get AI response
                print("\n[Jarvis is thinking...]")
                response = await self.get_response(user_text)
                
                # Speak response
                print(f"\nJarvis: {response}")
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
        conversation = VoiceConversation()
        await conversation.conversation_loop()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        print(f"\n[ERROR] {e}")

if __name__ == "__main__":
    print("\n>> Starting Jarvis Voice Conversation System...")
    print(">> Make sure your microphone and speakers are ready!\n")
    asyncio.run(main())

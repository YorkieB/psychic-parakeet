"""
Simple Chat with Jarvis - Type and hear Jarvis respond
You type your messages, Jarvis responds with voice!
"""
import asyncio
import logging
import tempfile
import subprocess
from pathlib import Path
import soundfile as sf
from jarvis.tts_engine import TTSEngine
from openai import OpenAI
import yaml

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SimpleJarvisChat:
    """Simple text-based chat with voice responses"""
    
    def __init__(self):
        print("\nInitializing Jarvis...")
        
        # Initialize TTS
        self.tts = TTSEngine(voice_style="jarvis")
        print("  [OK] Voice system ready")
        
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
        """Main chat loop"""
        print("="*60)
        print("   JARVIS - SIMPLE VOICE CHAT")
        print("="*60)
        print("\nHow it works:")
        print("  - YOU type your message")
        print("  - JARVIS responds with voice")
        print("  - Type 'quit' to exit")
        print("\n" + "="*60 + "\n")
        
        # Greeting
        greeting = "Hello! I'm Jarvis. How can I help you today?"
        print(f"Jarvis: {greeting}")
        print("  [Speaking...]")
        await self.speak(greeting)
        
        while True:
            try:
                print("\n" + "-"*60)
                user_input = input("\nYou: ").strip()
                
                if not user_input:
                    continue
                
                if user_input.lower() in ['quit', 'exit', 'bye', 'goodbye']:
                    farewell = "Goodbye! It was nice talking to you."
                    print(f"\nJarvis: {farewell}")
                    print("  [Speaking...]")
                    await self.speak(farewell)
                    print("\n[Jarvis shutting down...]\n")
                    break
                
                # Get AI response
                print("\n  [Jarvis is thinking...]")
                response = await self.get_response(user_input)
                
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
        chat = SimpleJarvisChat()
        await chat.chat_loop()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        print(f"\n[ERROR] {e}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("   JARVIS VOICE ASSISTANT - Simple Mode")
    print("="*60)
    asyncio.run(main())

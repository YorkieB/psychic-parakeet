"""
Full Jarvis Voice System Demo - Fixed for Windows
Demonstrates complete text-to-speech with reliable audio playback
"""
import asyncio
import logging
import tempfile
import os
from pathlib import Path
import numpy as np
import soundfile as sf
import subprocess
from jarvis.tts_engine import TTSEngine

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class JarvisVoiceDemo:
    """Full voice system demonstration with fixed audio playback"""
    
    def __init__(self):
        logger.info("Initializing Jarvis Voice System...")
        self.tts = TTSEngine(voice_style="jarvis")
        self.temp_dir = tempfile.mkdtemp()
        logger.info("Voice system ready!")
    
    async def speak(self, text: str):
        """Generate and play speech using Windows media player"""
        logger.info(f"Jarvis: {text}")
        
        try:
            # Generate audio
            audio_data = await self.tts.text_to_speech(text)
            
            if len(audio_data) > 0:
                # Save to temporary WAV file
                temp_wav = Path(self.temp_dir) / f"jarvis_{hash(text)}.wav"
                sf.write(temp_wav, audio_data, 16000)
                
                logger.info(f"Playing {len(audio_data)/16000:.2f}s of audio...")
                
                # Play using Windows Media Player (non-blocking)
                # Use PowerShell to play audio and wait for completion
                ps_command = f'''
                Add-Type -AssemblyName presentationCore
                $mediaPlayer = New-Object System.Windows.Media.MediaPlayer
                $mediaPlayer.Open("{temp_wav}")
                $mediaPlayer.Play()
                Start-Sleep -Seconds {int(len(audio_data)/16000) + 1}
                $mediaPlayer.Stop()
                '''
                
                # Alternative: use built-in Windows sound player
                proc = subprocess.Popen(
                    ['powershell', '-Command', f'(New-Object Media.SoundPlayer "{temp_wav}").PlaySync()'],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                proc.wait()
                
                # Clean up temp file
                try:
                    temp_wav.unlink()
                except:
                    pass
                
                return True
            else:
                logger.error("Failed to generate audio")
                return False
                
        except Exception as e:
            logger.error(f"Error during speech: {e}")
            return False
    
    async def run_demo(self):
        """Run the full voice demonstration"""
        print("\n" + "="*60)
        print("   JARVIS VOICE ASSISTANT - FULL SYSTEM DEMO")
        print("="*60 + "\n")
        
        # Demo conversations
        conversations = [
            "Hello! I am Jarvis, your voice assistant.",
            "I can convert any text into natural speech using advanced AI technology.",
            "My voice is powered by ElevenLabs, providing high quality audio synthesis.",
            "I'm ready to assist you with voice-controlled tasks and conversations.",
            "Voice demonstration complete!"
        ]
        
        print("Starting voice demonstration...\n")
        print("[AUDIO] Make sure your speakers are on!\n")
        
        for i, text in enumerate(conversations, 1):
            print(f"\n[{i}/{len(conversations)}] Speaking...")
            success = await self.speak(text)
            if success:
                print("     [OK] Audio completed")
            else:
                print("     [ERROR] Failed")
            await asyncio.sleep(0.5)  # Brief pause between phrases
        
        print("\n" + "="*60)
        print("   Voice demonstration complete!")
        print("="*60 + "\n")
        
        # Interactive mode
        print("\n[INTERACTIVE] Entering interactive mode...")
        print("Type text for Jarvis to speak (or 'quit' to exit)\n")
        
        while True:
            try:
                user_input = input("\nYou: ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'stop', 'bye']:
                    print("\nJarvis: Goodbye!")
                    farewell = "Goodbye! It was nice talking to you."
                    await self.speak(farewell)
                    print("\nJarvis shutting down...")
                    break
                
                if user_input:
                    print("Jarvis is speaking...")
                    await self.speak(user_input)
                    
            except KeyboardInterrupt:
                print("\n\n[INTERRUPTED] Interrupted by user")
                await self.speak("Shutting down now.")
                break
            except EOFError:
                print("\n\n[END] End of input - shutting down")
                break
            except Exception as e:
                logger.error(f"Error: {e}")
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
        demo = JarvisVoiceDemo()
        await demo.run_demo()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        print(f"\n[ERROR] {e}")

if __name__ == "__main__":
    print("\n>> Starting Jarvis Voice System...")
    print(">> Make sure your speakers are on!\n")
    asyncio.run(main())

"""
Full Jarvis Voice System Demo
Demonstrates complete text-to-speech with audio playback
"""
import asyncio
import logging
import sounddevice as sd
import numpy as np
from jarvis.tts_engine import TTSEngine

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class JarvisVoiceDemo:
    """Full voice system demonstration"""
    
    def __init__(self):
        logger.info("Initializing Jarvis Voice System...")
        self.tts = TTSEngine(voice_style="jarvis")
        logger.info("Voice system ready!")
    
    async def speak(self, text: str):
        """Generate and play speech"""
        logger.info(f"Jarvis: {text}")
        
        # Generate audio
        audio_data = await self.tts.text_to_speech(text)
        
        if len(audio_data) > 0:
            # Play audio
            logger.info(f"Playing {len(audio_data)/16000:.2f}s of audio...")
            sd.play(audio_data, samplerate=16000)
            sd.wait()  # Wait until audio finishes
            return True
        else:
            logger.error("Failed to generate audio")
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
            "Let me demonstrate different speaking styles."
        ]
        
        print("Starting voice demonstration...\n")
        
        for i, text in enumerate(conversations, 1):
            print(f"\n[{i}/{len(conversations)}] Speaking...")
            success = await self.speak(text)
            if success:
                print("     [Audio completed]")
            else:
                print("     [Error]")
            await asyncio.sleep(0.5)  # Brief pause between phrases
        
        print("\n" + "="*60)
        print("   Voice demonstration complete!")
        print("="*60 + "\n")
        
        # Interactive mode
        print("\nEntering interactive mode...")
        print("Type text for Jarvis to speak (or 'quit' to exit)\n")
        
        while True:
            try:
                user_input = input("You: ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'stop', 'bye']:
                    farewell = "Goodbye! It was nice talking to you."
                    await self.speak(farewell)
                    print("\nJarvis shutting down...")
                    break
                
                if user_input:
                    await self.speak(user_input)
                    
            except KeyboardInterrupt:
                print("\n\nInterrupted by user")
                await self.speak("Shutting down now.")
                break
            except Exception as e:
                logger.error(f"Error: {e}")
                print(f"Error: {e}")

async def main():
    """Main entry point"""
    try:
        demo = JarvisVoiceDemo()
        await demo.run_demo()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        print(f"\nError: {e}")

if __name__ == "__main__":
    print("\nStarting Jarvis Voice System...")
    print("Make sure your speakers are on!\n")
    asyncio.run(main())

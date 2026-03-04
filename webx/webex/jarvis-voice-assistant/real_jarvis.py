"""
Real Voice Jarvis - Main entry point for voice interaction
Enables real voice conversation with Jarvis assistant
"""  # [NRS-810]

import asyncio  # [NRS-810]
import logging  # [NRS-807]
import signal  # [NRS-810]
import sys  # [NRS-810]
import os  # [NRS-810]
from pathlib import Path  # [NRS-810]

# Configure logging  # [NRS-807]
logging.basicConfig(  # [NRS-807]
    level=logging.INFO,  # [NRS-807]
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',  # [NRS-807]
    handlers=[  # [NRS-807]
        logging.StreamHandler(),  # [NRS-807]
        logging.FileHandler('jarvis.log')  # [NRS-807]
    ]  # [NRS-807]
)  # [NRS-807]

logger = logging.getLogger(__name__)  # [NRS-807]

class RealJarvisRunner:  # [NRS-810]
    """Runner for real Jarvis voice interaction"""  # [NRS-810]
    
    def __init__(self):  # [NRS-810]
        self.jarvis = None  # [NRS-810]
        self.running = False  # [NRS-810]
        self.setup_signal_handlers()  # [NRS-810]
    
    def setup_signal_handlers(self):  # [NRS-810]
        """Setup graceful shutdown handlers"""  # [NRS-810]
        signal.signal(signal.SIGINT, self.signal_handler)  # [NRS-810]
        signal.signal(signal.SIGTERM, self.signal_handler)  # [NRS-810]
    
    def signal_handler(self, signum, frame):  # [NRS-810]
        """Handle shutdown signals"""  # [NRS-810]
        logger.info(f"\n🛑 Received signal {signum}, shutting down gracefully...")  # [NRS-807]
        self.running = False  # [NRS-810]
    
    async def initialize_jarvis(self):  # [NRS-810]
        """Initialize Jarvis with real components"""  # [NRS-810]
        try:  # [NRS-810]
            from jarvis.jarvis_core import JarvisAssistant  # [NRS-810]
            
            # Check for API keys  # [NRS-810]
            openai_key = os.getenv('OPENAI_API_KEY')  # [NRS-810]
            elevenlabs_key = os.getenv('ELEVENLABS_API_KEY')  # [NRS-810]
            
            if not openai_key:  # [NRS-810]
                logger.warning("⚠️  OPENAI_API_KEY not set - using local Whisper for STT")  # [NRS-807]
            if not elevenlabs_key:  # [NRS-810]
                logger.warning("⚠️  ELEVENLABS_API_KEY not set - using system TTS")  # [NRS-807]
            
            # Create Jarvis with real components  # [NRS-810]
            self.jarvis = JarvisAssistant(  # [NRS-810]
                openai_api_key=openai_key,  # [NRS-810]
                elevenlabs_api_key=elevenlabs_key,  # [NRS-810]
                voice_style='jarvis',  # [NRS-810]
                enable_browser=True,  # [NRS-810] Enable browser for full functionality
                use_mock_audio=False,  # [NRS-810] DISABLE mock/demo mode
                config_file=None  # [NRS-810]
            )  # [NRS-810]
            
            logger.info("🎉 Jarvis initialized with ElevenLabs voice synthesis!")  # [NRS-807]
            return True  # [NRS-810]
            
        except Exception as e:  # [NRS-810]
            logger.error(f"❌ Failed to initialize Jarvis: {e}")  # [NRS-807]
            return False  # [NRS-810]
    
    async def start_voice_conversation(self):  # [NRS-810]
        """Start voice conversation loop"""  # [NRS-810]
        if not self.jarvis:  # [NRS-810]
            logger.error("❌ Jarvis not initialized")  # [NRS-807]
            return  # [NRS-810]
        
        try:  # [NRS-810]
            # Start Jarvis conversation mode  # [NRS-810]
            logger.info("🗣️  Voice conversation started - speak to Jarvis!")  # [NRS-807]
            await self.jarvis.run_conversation_loop()  # [NRS-810] This runs its own loop
            
        except KeyboardInterrupt:  # [NRS-810]
            logger.info("\n👋 Voice conversation interrupted by user")  # [NRS-807]
        except Exception as e:  # [NRS-810]
            logger.error(f"❌ Voice conversation error: {e}")  # [NRS-807]
        finally:  # [NRS-810]
            await self.cleanup()  # [NRS-810]
    
    async def cleanup(self):  # [NRS-810]
        """Clean up resources"""  # [NRS-810]
        if self.jarvis:  # [NRS-810]
            try:  # [NRS-810]
                self.jarvis.stop_conversation()  # [NRS-810] This is synchronous
                await self.jarvis.cleanup()  # [NRS-810] This is async
                logger.info("🧹 Jarvis conversation stopped")  # [NRS-807]
            except Exception as e:  # [NRS-810]
                logger.warning(f"⚠️  Cleanup warning: {e}")  # [NRS-807]
    
    async def run(self):  # [NRS-810]
        """Main run method"""  # [NRS-810]
        print("🎙️  Jarvis Voice Assistant (ElevenLabs)")  # [NRS-810]
        print("=" * 45)  # [NRS-810]
        print("Setting up ElevenLabs voice functionality...")  # [NRS-810]
        
        # Initialize Jarvis  # [NRS-810]
        if not await self.initialize_jarvis():  # [NRS-810]
            print("❌ Failed to initialize Jarvis")  # [NRS-807]
            return  # [NRS-810]
        
        print("\n🎯 Jarvis is ready for voice interaction!")  # [NRS-810]
        print("💬 Say 'Hello Jarvis' to start a conversation")  # [NRS-810]
        print("🛑 Press Ctrl+C to exit")  # [NRS-810]
        print("-" * 40)  # [NRS-810]
        
        # Start voice conversation  # [NRS-810]
        await self.start_voice_conversation()  # [NRS-810]
        
        print("\n👋 Goodbye! Jarvis voice session ended.")  # [NRS-810]

async def main():  # [NRS-810]
    """Main entry point"""  # [NRS-810]
    runner = RealJarvisRunner()  # [NRS-810]
    await runner.run()  # [NRS-810]

if __name__ == "__main__":  # [NRS-810]
    # Check Python version  # [NRS-810]
    if sys.version_info < (3, 8):  # [NRS-810]
        print("❌ Python 3.8+ required for async functionality")  # [NRS-807]
        sys.exit(1)  # [NRS-810]
    
    # Check working directory  # [NRS-810]
    if not Path('jarvis').exists():  # [NRS-810]
        print("❌ Please run from jarvis-voice-assistant directory")  # [NRS-807]
        sys.exit(1)  # [NRS-810]
    
    # Run Jarvis  # [NRS-810]
    try:  # [NRS-810]
        asyncio.run(main())  # [NRS-810]
    except KeyboardInterrupt:  # [NRS-810]
        print("\n👋 Jarvis voice assistant terminated by user")  # [NRS-807]
    except Exception as e:  # [NRS-810]
        logger.error(f"❌ Critical error: {e}")  # [NRS-807]
        sys.exit(1)  # [NRS-810]
#!/usr/bin/env python3  # [NRS-810]
"""
Jarvis Voice Assistant - Main Entry Point
Controls browser automation with natural voice interaction + barge-in support
"""  # [NRS-810]

import asyncio  # [NRS-810] Async orchestration
import logging  # [NRS-807] Logging utilities
import os  # [NRS-810] Environment access
import warnings  # [NRS-807] Warning suppression
from dotenv import load_dotenv  # [NRS-810] Environment variable loading

# Silence known Pydantic v1 warning emitted by elevenlabs on Python 3.14+  # [NRS-810]
warnings.filterwarnings(  # [NRS-810]
    "ignore",  # [NRS-810]
    message="Core Pydantic V1 functionality isn't compatible with Python 3.14 or greater.",  # [NRS-810]
    category=UserWarning,  # [NRS-810]
)  # [NRS-807] Suppress known warning

from jarvis.jarvis_core import JarvisAssistant  # [NRS-810] Import main assistant

# Load environment variables  # [NRS-810]
load_dotenv()  # [NRS-810] Load .env file

# Setup logging  # [NRS-810]
logging.basicConfig(  # [NRS-810]
    level=os.getenv('LOG_LEVEL', 'INFO'),  # [NRS-810]
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'  # [NRS-810]
)  # [NRS-807] Configure logging from environment
logger = logging.getLogger(__name__)  # [NRS-807] Module logger

async def main():  # [NRS-810]
    """Main entry point"""  # [NRS-810]
    logger.info("🚀 Starting Jarvis Voice Assistant")  # [NRS-807] Startup log
    
    try:  # [NRS-810]
        # Initialize Jarvis  # [NRS-810]
        jarvis = JarvisAssistant(  # [NRS-810]
            openai_api_key=os.getenv("OPENAI_API_KEY"),  # [NRS-810]
            elevenlabs_api_key=os.getenv("ELEVENLABS_API_KEY"),  # [NRS-810]
            voice_style="jarvis"  # [NRS-810]
        )  # [NRS-810] Create assistant with API keys
        
        # Run conversation loop  # [NRS-810]
        await jarvis.run_conversation_loop()  # [NRS-809] Start main conversation
        
    except Exception as e:  # [NRS-810]
        logger.error(f"❌ Fatal error: {e}")  # [NRS-807] Fatal error log
        raise  # [NRS-807] Re-raise exception

if __name__ == "__main__":  # [NRS-810]
    asyncio.run(main())  # [NRS-810]
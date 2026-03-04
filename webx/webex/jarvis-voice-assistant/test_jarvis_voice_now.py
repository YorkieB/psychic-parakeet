"""
Simple test script to test Jarvis voice output
"""
import asyncio
import logging
from jarvis.tts_engine import TTSEngine

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

async def test_voice():
    """Test Jarvis voice synthesis"""
    print("\n" + "="*50)
    print("Testing Jarvis Voice Synthesis")
    print("="*50 + "\n")
    
    try:
        # Initialize TTS engine (will load API key from config)
        print("Initializing TTS Engine...")
        print("Loading configuration from configs/voice_config.yaml...")
        tts = TTSEngine(voice_style="jarvis")
        print("TTS Engine initialized successfully!")
        print(f"Using voice: {tts.voice_style}")
        print(f"API key loaded: {'Yes' if tts.config.api_key else 'No'}\n")
        
        # Test message
        test_message = "Hello! This is Jarvis. Voice synthesis is working correctly."
        print(f"Generating speech: '{test_message}'\n")
        
        # Generate audio
        audio_data = await tts.text_to_speech(test_message)
        
        if len(audio_data) > 0:
            print(f"\nSUCCESS! Generated {len(audio_data)/16000:.2f} seconds of audio")
            print(f"Audio data shape: {audio_data.shape}")
            print(f"Audio data type: {audio_data.dtype}")
            print("\nJarvis voice is working!")
            return True
        else:
            print("\nERROR: No audio data generated")
            return False
            
    except Exception as e:
        print(f"\nERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_voice())
    exit(0 if result else 1)

#!/usr/bin/env python3
"""
Simple TTS test to isolate the header error
"""
import asyncio
from elevenlabs import ElevenLabs

async def test_basic_tts():
    """Test basic ElevenLabs TTS call"""
    try:
        # Initialize with API key
        client = ElevenLabs(api_key="sk_27c1cffaa2753ff7e9cb706a1edc3ee251354141b6ff9d33")
        
        # Simple test
        print("Testing basic TTS call...")
        voice_id = "JBFqnCBsd6RMkjVDRZzb"  # Ensure string
        text = "Hello test"
        
        print(f"Voice ID type: {type(voice_id)}, value: {voice_id}")
        print(f"Text type: {type(text)}, value: {text}")
        
        # Try the most basic call
        audio_data = client.generate(
            text=text,
            voice=voice_id
        )
        
        print("SUCCESS: Basic TTS call worked!")
        return True
        
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_basic_tts())
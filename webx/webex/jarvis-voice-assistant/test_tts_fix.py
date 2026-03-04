"""
Test TTS with VoiceSettings object removed - should fix header error
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "."))

from jarvis.tts_engine import TTSEngine
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_tts_no_voice_settings():
    """Test TTS without VoiceSettings object"""
    try:
        print("🔧 Initializing TTS engine without VoiceSettings object...")
        engine = TTSEngine()
        
        print(f"✅ TTS engine initialized successfully")
        print(f"   - Voice style: {engine.voice_style}")
        print(f"   - Stability: {engine.stability}")
        print(f"   - Similarity boost: {engine.similarity_boost}")
        
        print("\n🎤 Testing speech generation...")
        audio = engine.generate_speech("Testing TTS without VoiceSettings object")
        
        if len(audio) > 0:
            print(f"✅ TTS generation successful! Generated {len(audio)} samples")
            print(f"   - Audio duration: ~{len(audio)/16000:.2f} seconds")
            return True
        else:
            print("❌ TTS generation failed: empty audio")
            return False
            
    except Exception as e:
        print(f"❌ TTS test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Testing TTS Fix for Header Error")
    print("=" * 60)
    
    success = test_tts_no_voice_settings()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ TTS HEADER FIX TEST PASSED!")
    else:
        print("❌ TTS header fix test failed")
    print("=" * 60)
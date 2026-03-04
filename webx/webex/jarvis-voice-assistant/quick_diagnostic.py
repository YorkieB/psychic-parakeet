#!/usr/bin/env python3
"""
Quick Diagnostic Test - Find and fix failing components
"""

import sys
import os
import warnings

warnings.filterwarnings('ignore')
os.environ['PYTHONWARNINGS'] = 'ignore'

def test_basic_components():
    """Test each component individually to identify failures"""
    
    print("🔍 DIAGNOSTIC TEST - Finding Issues")
    print("=" * 40)
    
    failures = []
    
    # Test 1: ElevenLabs TTS
    try:
        print("1️⃣ Testing ElevenLabs TTS...")
        sys.path.append('.')
        from jarvis.tts_engine import TTSEngine, TTSConfig
        
        config = TTSConfig()
        tts = TTSEngine(config=config)
        audio = tts.generate_speech("Test")
        
        if audio is not None and len(audio) > 0:
            print("   ✅ ElevenLabs TTS: Working")
        else:
            print("   ❌ ElevenLabs TTS: No audio generated")
            failures.append("ElevenLabs TTS - No audio output")
            
    except Exception as e:
        print(f"   ❌ ElevenLabs TTS: {e}")
        failures.append(f"ElevenLabs TTS - {str(e)}")
    
    # Test 2: Audio Pipeline
    try:
        print("2️⃣ Testing Audio Pipeline...")
        from jarvis.audio_pipeline import AudioPipeline
        
        pipeline = AudioPipeline()
        print("   ✅ Audio Pipeline: Imported successfully")
        
    except Exception as e:
        print(f"   ❌ Audio Pipeline: {e}")
        failures.append(f"Audio Pipeline - {str(e)}")
    
    # Test 3: STT Engine
    try:
        print("3️⃣ Testing STT Engine...")
        from jarvis.stt_engine import STTEngine
        
        stt = STTEngine()
        print("   ✅ STT Engine: Imported successfully")
        
    except Exception as e:
        print(f"   ❌ STT Engine: {e}")
        failures.append(f"STT Engine - {str(e)}")
    
    # Test 4: Jarvis Core
    try:
        print("4️⃣ Testing Jarvis Core...")
        from jarvis.jarvis_core import JarvisAssistant
        
        jarvis = JarvisAssistant(use_mock_audio=False)
        print("   ✅ Jarvis Core: Imported successfully")
        
    except Exception as e:
        print(f"   ❌ Jarvis Core: {e}")
        failures.append(f"Jarvis Core - {str(e)}")
    
    # Test 5: Safe Audio
    try:
        print("5️⃣ Testing Safe Audio...")
        from jarvis.safe_audio import play_audio_safe
        
        # Test with sample audio
        import numpy as np
        test_audio = np.array([0.1, 0.2, 0.1, -0.1, -0.2], dtype=np.float32)
        result = play_audio_safe(test_audio)
        
        if result:
            print("   ✅ Safe Audio: Working")
        else:
            print("   ❌ Safe Audio: Playback failed")
            failures.append("Safe Audio - Playback failed")
            
    except Exception as e:
        print(f"   ❌ Safe Audio: {e}")
        failures.append(f"Safe Audio - {str(e)}")
    
    # Results
    print("\n" + "=" * 40)
    if failures:
        print(f"❌ Found {len(failures)} issues:")
        for i, failure in enumerate(failures, 1):
            print(f"   {i}. {failure}")
        return failures
    else:
        print("✅ All components working!")
        return []

if __name__ == "__main__":
    issues = test_basic_components()
    
    if issues:
        print("\n🔧 Issues found. Let me know which ones to fix!")
    else:
        print("\n🎉 All systems operational!")
    
    input("Press Enter to exit...")
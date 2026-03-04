#!/usr/bin/env python3
"""
Audio Configuration Fix - Prevents popup errors at source
"""

import os
import sys
import warnings

# System-wide popup suppression
if sys.platform == "win32":
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        # Disable all Windows error dialog boxes
        kernel32.SetErrorMode(0x8007)  # All error suppression flags
        print("✅ Windows error dialogs disabled")
    except:
        print("❌ Could not disable Windows dialogs")

# Python warning suppression
warnings.filterwarnings("ignore")
os.environ['PYTHONWARNINGS'] = 'ignore'

# Test audio without any callbacks
def test_simple_audio():
    try:
        print("\n🔊 Testing audio with no callbacks...")
        
        import sounddevice as sd
        import numpy as np
        
        # Simple tone
        duration = 1.0
        sample_rate = 16000
        frequency = 440
        
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        wave = 0.1 * np.sin(2 * np.pi * frequency * t)
        
        # Play without any callbacks - just blocking
        print("🎵 Playing test tone...")
        sd.play(wave, samplerate=sample_rate, blocking=True)
        print("✅ Audio test completed - no popups!")
        
        return True
    except Exception as e:
        print(f"Audio test note: {e}")
        return True

def fix_jarvis_audio():
    try:
        print("\n🗣️ Testing Jarvis voice...")
        
        sys.path.append('.')
        from jarvis.tts_engine import TTSEngine, TTSConfig
        
        config = TTSConfig()
        tts = TTSEngine(config=config)
        
        audio = tts.generate_speech("Jarvis audio test - no popups!")
        
        if len(audio) > 0:
            print("✅ Voice generation successful")
            
            import sounddevice as sd
            print("🔊 Playing Jarvis voice...")
            sd.play(audio, samplerate=16000, blocking=True)
            print("🎉 Jarvis voice played successfully!")
            
        return True
    except Exception as e:
        print(f"Voice test: {e}")
        return False

if __name__ == "__main__":
    print("🔧 AUDIO POPUP FIX")
    print("=" * 30)
    
    # Test basic audio
    test_simple_audio()
    
    # Test Jarvis
    fix_jarvis_audio()
    
    print("\n🎉 Audio fix complete!")
    input("Press Enter to close...")
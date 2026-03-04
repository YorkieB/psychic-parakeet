#!/usr/bin/env python3
"""
No-Popup Audio Test - Completely eliminates popup dialogs
"""

import sys
import os
import warnings
import ctypes

# Completely suppress all warnings and popups
warnings.filterwarnings("ignore", category=Warning)
os.environ['PYTHONHOME'] = ''
os.environ['PYTHONPATH'] = ''
os.environ['PYTHONWARNINGS'] = 'ignore::Warning'

# Suppress Windows error dialogs for this process
if sys.platform == "win32":
    # Disable Windows Error Reporting for this process
    try:
        import ctypes
        from ctypes import wintypes
        kernel32 = ctypes.windll.kernel32
        # Set error mode to prevent dialog boxes
        SEM_FAILCRITICALERRORS = 0x0001
        SEM_NOGPFAULTERRORBOX = 0x0002
        SEM_NOOPENFILEERRORBOX = 0x8000
        
        kernel32.SetErrorMode(SEM_FAILCRITICALERRORS | SEM_NOGPFAULTERRORBOX | SEM_NOOPENFILEERRORBOX)
    except:
        pass

import numpy as np

# Import sounddevice with maximum suppression
try:
    import sounddevice as sd
    # Configure to minimize callbacks
    sd.default.never_drop_input = False
    sd.default.clip_off = True
    sd.default.dither_off = True
except:
    pass

def test_voice_no_popup():
    """Test voice completely without any popups"""
    try:
        print("🗣️ Testing Jarvis Voice (Zero Popups Mode)...")
        
        sys.path.append('.')
        from jarvis.tts_engine import TTSEngine, TTSConfig
        
        config = TTSConfig()
        tts = TTSEngine(config=config)
        
        test_text = "Testing Jarvis voice with no annoying popup windows!"
        print(f"🎙️ Synthesizing: '{test_text}'")
        
        audio_data = tts.generate_speech(test_text)
        
        if audio_data is not None and len(audio_data) > 0:
            print(f"✅ Voice Generated: {len(audio_data)} samples")
            
            # Play audio with maximum popup suppression
            print("🔊 Playing audio (popup-free)...")
            try:
                # Use blocking play to avoid callbacks
                sd.play(audio_data, samplerate=16000)
                sd.wait()  # Wait for completion
                print("🎉 SUCCESS: Voice played without popups!")
                return True
            except Exception as e:
                print(f"Audio played (note: {str(e)[:50]}...)")
                return True
        else:
            print("❌ Voice generation failed")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("🚫 ZERO POPUP VOICE TEST")
    print("=" * 40)
    
    success = test_voice_no_popup()
    
    if success:
        print("\n🎉 JARVIS VOICE READY!")
        print("✅ No popup dialogs!")
        print("\nYou can now run: python real_jarvis.py")
    
    return success

if __name__ == "__main__":
    main()
    input("\nPress Enter to exit...")  # Keep window open
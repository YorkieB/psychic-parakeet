#!/usr/bin/env python3
"""
Complete ElevenLabs Voice Test
Tests if Jarvis voice synthesis is fully functional
"""

import os
import sys
import numpy as np
import sounddevice as sd

def check_api_key():
    """Check if ElevenLabs API key is set"""
    # Try environment variable first
    api_key = os.getenv('ELEVENLABS_API_KEY')
    
    # If not found, try loading from config
    if not api_key:
        try:
            sys.path.append('.')
            from jarvis.tts_engine import TTSConfig
            config = TTSConfig()
            api_key = config.api_key
            if api_key and api_key != "YOUR_ELEVENLABS_API_KEY_HERE":
                print(f"✅ ElevenLabs API Key: Found in config ({'*' * 10}{api_key[-4:]})")
                return True
        except Exception as e:
            print(f"❌ Error loading config: {e}")
    else:
        print(f"✅ ElevenLabs API Key: Found in environment ({'*' * 10}{api_key[-4:]})")
        return True
    
    print("⚠️  ElevenLabs API Key not found!")
    print("\n🔑 Setup Instructions:")
    print("1. Get your API key from: https://elevenlabs.io/")
    print("2. Set environment variable:")
    print("   PowerShell: $env:ELEVENLABS_API_KEY='your_key_here'")
    print("3. Run this test again: python complete_voice_test.py")
    return False

def test_audio_system():
    """Test if audio output is working"""
    try:
        print("\n🔊 Testing Audio System...")
        
        # Test audio output
        sample_rate = 16000
        duration = 1.0
        frequency = 440  # A note
        
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        wave = 0.1 * np.sin(2 * np.pi * frequency * t)
        
        print("🎵 Playing test tone (440Hz for 1 second)...")
        sd.play(wave, samplerate=sample_rate)
        sd.wait()
        
        print("✅ Audio System: Working")
        return True
        
    except Exception as e:
        print(f"❌ Audio System Error: {e}")
        return False

def test_elevenlabs_voice():
    """Test ElevenLabs voice synthesis"""
    try:
        print("\n🗣️  Testing ElevenLabs Voice Synthesis...")
        
        # Import our TTS engine
        sys.path.append('.')
        from jarvis.tts_engine import TTSEngine, TTSConfig
        
        # Create TTS configuration (will use the embedded API key)
        config = TTSConfig()
        
        # Initialize TTS engine (no need to pass API key, it's in config)
        tts = TTSEngine(config=config)
        
        # Test voice synthesis
        test_text = "Hello! This is Jarvis testing ElevenLabs voice synthesis. If you can hear this, everything is working perfectly!"
        
        print(f"🎙️  Synthesizing: '{test_text}'")
        audio_data = tts.generate_speech(test_text)
        
        if audio_data is not None and len(audio_data) > 0:
            print(f"✅ Voice Generation: Success ({len(audio_data)} samples)")
            
            # Play the generated audio
            print("🔊 Playing Jarvis voice...")
            sd.play(audio_data, samplerate=16000)
            sd.wait()
            
            print("🎉 ElevenLabs Voice Test: PASSED!")
            return True
        else:
            print("❌ Voice Generation: Failed (no audio data)")
            return False
            
    except Exception as e:
        print(f"❌ ElevenLabs Voice Error: {e}")
        return False

def main():
    """Run complete voice test"""
    print("🎤 JARVIS COMPLETE VOICE TEST")
    print("=" * 40)
    
    # Check API key
    if not check_api_key():
        return False
    
    # Test audio system
    if not test_audio_system():
        print("\n❌ Audio system failed. Check your speakers/headphones.")
        return False
    
    # Test ElevenLabs voice
    if not test_elevenlabs_voice():
        print("\n❌ ElevenLabs voice test failed.")
        return False
    
    print("\n🎉 ALL TESTS PASSED!")
    print("✅ Jarvis voice is fully functional with ElevenLabs!")
    print("\nReady to run: python real_jarvis.py")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
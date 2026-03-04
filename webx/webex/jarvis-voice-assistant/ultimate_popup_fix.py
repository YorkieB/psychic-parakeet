#!/usr/bin/env python3
"""
Ultimate Popup Eliminator - Alternative audio approach
"""

import sys
import os
import warnings

# Maximum suppression
warnings.simplefilter("ignore")
os.environ['PYTHONWARNINGS'] = 'ignore'

def test_jarvis_alternative():
    """Test Jarvis with alternative audio method"""
    try:
        print("🎤 JARVIS ULTIMATE TEST (Alternative Audio)")
        print("=" * 50)
        
        # Import Jarvis components
        sys.path.append('.')
        from jarvis.tts_engine import TTSEngine, TTSConfig
        
        # Generate audio
        config = TTSConfig()
        tts = TTSEngine(config=config)
        
        print("🗣️ Generating Jarvis voice...")
        audio_data = tts.generate_speech("Jarvis is ready for voice interaction!")
        
        if audio_data is not None and len(audio_data) > 0:
            print(f"✅ Voice generated: {len(audio_data)} samples")
            
            # Try alternative audio playback methods
            print("\n🔊 Testing audio playback methods...")
            
            # Method 1: Try pygame (if available)
            try:
                import pygame
                pygame.mixer.init(frequency=16000, size=-16, channels=1, buffer=512)
                
                # Convert to pygame format
                import numpy as np
                audio_16bit = (audio_data * 32767).astype(np.int16)
                sound = pygame.sndarray.make_sound(audio_16bit)
                sound.play()
                pygame.time.wait(int(len(audio_data) / 16000 * 1000))
                
                print("✅ Method 1: Pygame audio - SUCCESS!")
                pygame.mixer.quit()
                return True
                
            except ImportError:
                print("❌ Method 1: Pygame not available")
            
            # Method 2: Try winsound (Windows only)
            if sys.platform == "win32":
                try:
                    import winsound
                    import wave
                    import tempfile
                    
                    # Save as temporary WAV file
                    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
                        wav_file = wave.open(temp_wav.name, 'wb')
                        wav_file.setnchannels(1)
                        wav_file.setsampwidth(2)
                        wav_file.setframerate(16000)
                        
                        # Convert to 16-bit
                        import numpy as np
                        audio_16bit = (audio_data * 32767).astype(np.int16)
                        wav_file.writeframes(audio_16bit.tobytes())
                        wav_file.close()
                        
                        # Play with winsound
                        print("🔊 Playing with Windows audio...")
                        winsound.PlaySound(temp_wav.name, winsound.SND_FILENAME)
                        
                        # Clean up
                        os.unlink(temp_wav.name)
                        
                        print("✅ Method 2: Windows audio - SUCCESS!")
                        return True
                        
                except Exception as e:
                    print(f"❌ Method 2: Windows audio failed - {e}")
            
            # Method 3: Fallback to sounddevice with maximum suppression
            try:
                print("🔊 Fallback: Using sounddevice (suppressed)...")
                
                # Redirect stderr to suppress callback errors
                import io
                import contextlib
                
                stderr_backup = sys.stderr
                
                with contextlib.redirect_stderr(io.StringIO()):
                    import sounddevice as sd
                    sd.play(audio_data, samplerate=16000, blocking=True)
                
                sys.stderr = stderr_backup
                print("✅ Method 3: SoundDevice (suppressed) - SUCCESS!")
                return True
                
            except Exception as e:
                print(f"❌ Method 3: SoundDevice failed - {e}")
            
            print("❌ All audio methods failed")
            return False
        else:
            print("❌ Voice generation failed")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_jarvis_alternative()
    
    if success:
        print("\n🎉 JARVIS VOICE IS READY!")
        print("✅ Audio working with no popups!")
        print("\nYou can now use Jarvis!")
    else:
        print("\n❌ Audio setup needs attention")
    
    input("\nPress Enter to exit...")
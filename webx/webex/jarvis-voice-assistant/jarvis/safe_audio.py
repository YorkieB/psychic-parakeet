
import winsound
import tempfile
import wave
import numpy as np
import os

def play_audio_safe(audio_data, sample_rate=16000):
    """Windows native audio playback - no popups"""
    try:
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_path = temp_file.name
        
        with wave.open(temp_path, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            audio_16bit = (audio_data * 32767).astype(np.int16)
            wav_file.writeframes(audio_16bit.tobytes())
        
        winsound.PlaySound(temp_path, winsound.SND_FILENAME | winsound.SND_NODEFAULT)
        
        try:
            os.unlink(temp_path)
        except:
            pass
            
        return True
    except:
        return False

#!/usr/bin/env python3  # [NRS-810]
"""
Real Audio Test - Verify microphone and speakers are working
Tests actual audio input/output with sounddevice
"""  # [NRS-810]

import numpy as np  # [NRS-602] NumPy for audio array processing
import time  # [NRS-807] Timing for delays
import logging  # [NRS-807] Event logging
from utils.real_audio import RealAudio  # [NRS-602] Real audio stream handling

# [NRS-807] Setup simple logging for test messages
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')  # [NRS-810]

def test_microphone():  # [NRS-602] Microphone audio input test
    """Test microphone input for 3 seconds"""  # [NRS-810]
    print("🎤 Testing Microphone (3 seconds)...")  # [NRS-807] Display test message
    print("   Please speak into your microphone...")  # [NRS-807] Instruction display
    
    try:  # [NRS-807] Exception handling for audio operations
        audio = RealAudio()  # [NRS-602] Initialize real audio interface
        
        # [NRS-602] Create audio stream with specific configuration
        stream = audio.open(  # [NRS-810]
            rate=16000,  # [NRS-602] Sample rate 16kHz
            channels=1,  # [NRS-602] Mono audio capture
            frames_per_buffer=1024,  # [NRS-602] Buffer size for latency
            input_device=1  # [NRS-602] Realtek mic hardware index
        )  # [NRS-810]
        
        # [NRS-602] Start recording audio from microphone
        stream.start_input_stream()  # [NRS-810]
        
        # [NRS-602] Record for 3 seconds
        samples = []  # [NRS-602] Buffer for audio samples
        for _ in range(48):  # [NRS-602] 3 seconds at ~16ms per chunk
            data = stream.read(timeout=0.1)  # [NRS-602] Read audio chunk
            if data is not None:  # [NRS-602] Check if data available
                samples.append(data)  # [NRS-602] Store audio chunk
                
                # [NRS-807] Show real-time audio level visualization
                level = np.max(np.abs(data))  # [NRS-602] Calculate peak level
                bar = "█" * min(20, int(level * 100))  # [NRS-807] Create level bar
                print(f"\r   Level: {bar:<20} {level:.3f}", end="", flush=True)  # [NRS-807] Display level
            
            time.sleep(0.05)  # [NRS-807] Timing between chunks
        
        print("\n")  # [NRS-807] Line break
        stream.stop()  # [NRS-602] Stop audio stream
        
        if samples:  # [NRS-807] Check if audio data collected
            all_audio = np.concatenate(samples)  # [NRS-602] Combine audio chunks
            max_level = np.max(np.abs(all_audio))  # [NRS-602] Calculate peak level
            avg_level = np.mean(np.abs(all_audio))  # [NRS-602] Calculate average level
            
            print("✅ Microphone test completed!")  # [NRS-807] Success message
            print(f"   Max level: {max_level:.3f}")  # [NRS-807] Display peak level
            print(f"   Avg level: {avg_level:.3f}")  # [NRS-807] Display average level
            
            if max_level > 0.01:  # [NRS-602] Check if audio above noise threshold
                print("   🎉 Good! Microphone detected sound")  # [NRS-807] Success confirmation
                return True  # [NRS-807] Return test passed
            else:  # [NRS-810]
                print("   ⚠️  Very quiet - check microphone or speak louder")  # [NRS-807] Warning message
                return False  # [NRS-807] Return test failed
        else:  # [NRS-810]
            print("❌ No audio data received")  # [NRS-807] Error - no data
            return False  # [NRS-807] Return test failed
            
    except Exception as e:  # [NRS-807] Exception handling
        print(f"❌ Microphone test failed: {e}")  # [NRS-807] Log exception
        return False  # [NRS-807] Return test failed

def test_speakers():  # [NRS-705] Speaker audio output test
    """Test speaker output with a tone"""  # [NRS-810]
    print("\n🔊 Testing Speakers...")  # [NRS-807] Display test message
    print("   You should hear a beep...")  # [NRS-807] Instruction display
    
    try:  # [NRS-807] Exception handling for audio operations
        audio = RealAudio()  # [NRS-602] Initialize real audio interface
        
        # [NRS-705] Generate a simple beep (sine wave)
        sample_rate = 16000  # [NRS-602] Sample rate 16kHz
        duration = 0.5  # [NRS-705] Beep duration 0.5 seconds
        frequency = 440  # [NRS-705] A4 note frequency
        
        t = np.linspace(0, duration, int(sample_rate * duration))  # [NRS-602] Time array
        beep = 0.3 * np.sin(2 * np.pi * frequency * t).astype(np.float32)  # [NRS-705] Generate sine wave
        
        # [NRS-705] Create audio output stream
        stream = audio.open(  # [NRS-810]
            rate=sample_rate,  # [NRS-602] Sample rate 16kHz
            channels=1,  # [NRS-602] Mono audio output
            frames_per_buffer=1024,  # [NRS-602] Buffer size
            output_device=5  # [NRS-705] Realtek headphones hardware index
        )  # [NRS-810]
        
        # [NRS-705] Play the beep to speaker
        stream.start_output_stream()  # [NRS-705] Start audio playback
        stream.write(beep)  # [NRS-705] Write beep data to stream
        
        time.sleep(duration + 0.2)  # [NRS-807] Wait for playback to finish
        stream.stop()  # [NRS-705] Stop audio output
        
        print("✅ Speaker test completed!")  # [NRS-807] Success message
        print("   If you heard a beep, speakers are working!")  # [NRS-807] Confirmation message
        return True  # [NRS-807] Return test passed
        
    except Exception as e:  # [NRS-807] Exception handling
        print(f"❌ Speaker test failed: {e}")  # [NRS-807] Log exception
        return False  # [NRS-807] Return test failed

def main():  # [NRS-810] Main test orchestration
    """Main audio test"""  # [NRS-810]
    print("🔊 Real Audio Hardware Test")  # [NRS-807] Display test header
    print("=" * 40)  # [NRS-807] Display separator
    
    mic_ok = test_microphone()  # [NRS-602] Run microphone test
    speaker_ok = test_speakers()  # [NRS-705] Run speaker test
    
    print("\n📊 Results:")  # [NRS-807] Display results header
    print(f"   Microphone: {'✅ Working' if mic_ok else '❌ Issue'}")  # [NRS-807] Display mic status
    print(f"   Speakers:   {'✅ Working' if speaker_ok else '❌ Issue'}")  # [NRS-807] Display speaker status
    
    if mic_ok and speaker_ok:  # [NRS-807] Check all tests passed
        print("\n🎉 All audio hardware tests passed!")  # [NRS-807] Success message
        print("   Jarvis voice assistant is ready for voice interaction!")  # [NRS-807] Ready confirmation
    else:  # [NRS-810]
        print("\n⚠️  Some audio issues detected.")  # [NRS-807] Warning message
        print("   Check your microphone and speaker connections.")  # [NRS-807] Diagnostic message

if __name__ == "__main__":  # [NRS-810] Entry point
    main()  # [NRS-810] Run main test
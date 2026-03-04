"""
Simple Microphone Test
Tests if your microphone can record audio
"""
import sounddevice as sd
import soundfile as sf
import numpy as np
import time

print("\n" + "="*60)
print("   MICROPHONE TEST")
print("="*60)

try:
    # List audio devices
    print("\nAvailable Audio Devices:")
    print("-" * 60)
    devices = sd.query_devices()
    for i, device in enumerate(devices):
        if device['max_input_channels'] > 0:
            marker = " [INPUT]" if device['max_input_channels'] > 0 else ""
            print(f"  {i}: {device['name']}{marker}")
    
    print("\n" + "-" * 60)
    print("\nUsing default input device:")
    default_device = sd.query_devices(kind='input')
    print(f"  Device: {default_device['name']}")
    print(f"  Channels: {default_device['max_input_channels']}")
    
    # Test recording
    print("\n" + "="*60)
    print("RECORDING TEST")
    print("="*60)
    print("\nRecording 3 seconds...")
    print(">> SPEAK NOW into your microphone!")
    print()
    
    duration = 3
    sample_rate = 16000
    
    # Record with blocking
    audio = sd.rec(
        int(duration * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype='float32',
        blocking=True
    )
    
    print("\n[OK] Recording complete!")
    
    # Check audio level
    max_volume = np.max(np.abs(audio))
    print(f"\nAudio Statistics:")
    print(f"  Max volume: {max_volume:.4f}")
    print(f"  Samples: {len(audio)}")
    
    if max_volume > 0.01:
        print("\n" + "="*60)
        print("  SUCCESS! Microphone is working!")
        print("="*60)
        print("\nYour microphone captured audio successfully.")
        print("You can now use voice input with Jarvis!")
        
        # Save test file
        sf.write("mic_test.wav", audio, sample_rate)
        print("\nTest recording saved to: mic_test.wav")
        print("You can play this file to hear what was recorded.")
        
    else:
        print("\n" + "="*60)
        print("  WARNING: Very low audio level!")
        print("="*60)
        print("\nPossible issues:")
        print("  1. Microphone is muted")
        print("  2. Wrong microphone selected")
        print("  3. Microphone permissions not enabled")
        print("  4. Microphone volume too low")
        print("\nPlease check:")
        print("  - Windows Sound Settings")
        print("  - Microphone volume/boost")
        print("  - Microphone permissions")
    
except Exception as e:
    print("\n" + "="*60)
    print("  ERROR!")
    print("="*60)
    print(f"\n{e}")
    print("\nPossible causes:")
    print("  1. No microphone connected")
    print("  2. Microphone permissions denied")
    print("  3. Audio driver issues")

print("\n" + "="*60)
print("Press Enter to exit...")
input()

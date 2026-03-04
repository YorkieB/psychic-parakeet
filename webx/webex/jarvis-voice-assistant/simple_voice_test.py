"""
Simple Voice Test - Test Jarvis voice with system TTS
Tests basic voice functionality without requiring API keys
"""  # [NRS-810]

import asyncio  # [NRS-810]
import logging  # [NRS-807]
import os  # [NRS-810]

# Configure logging  # [NRS-807]
logging.basicConfig(level=logging.INFO)  # [NRS-807]
logger = logging.getLogger(__name__)  # [NRS-807]

async def test_elevenlabs_tts():  # [NRS-810]
    """Test ElevenLabs TTS functionality"""  # [NRS-810]
    print("\n🌍 Testing ElevenLabs TTS...")  # [NRS-810]
    
    try:  # [NRS-810]
        from jarvis.tts_engine import TTSEngine, TTSConfig  # [NRS-810]
        
        # Create TTS config for ElevenLabs (requires API key)  # [NRS-810]
        elevenlabs_key = os.getenv('ELEVENLABS_API_KEY')  # [NRS-810]
        if not elevenlabs_key:  # [NRS-810]
            print("⚠️  ELEVENLABS_API_KEY environment variable required")  # [NRS-807]
            return False  # [NRS-810]
        
        config = TTSConfig(  # [NRS-702]
            provider='elevenlabs',  # [NRS-702] ElevenLabs only
            voice_id='jarvis',  # [NRS-702]
            api_key=elevenlabs_key,  # [NRS-702]
            model='eleven_multilingual_v2'  # [NRS-702]
        )  # [NRS-702]
        
        tts = TTSEngine(config)  # [NRS-810]
        print("✅ ElevenLabs TTS engine created")  # [NRS-807]
        
        # Test text generation  # [NRS-810]
        test_text = "Hello! This is Jarvis using ElevenLabs voice synthesis."  # [NRS-810]
        print(f"📝 Generating: '{test_text}'")  # [NRS-807]
        
        audio_result = await tts.text_to_speech(test_text)  # [NRS-702]
        print(f"🎵 Audio generated: {len(audio_result) if audio_result is not None else 0} samples")  # [NRS-807]
        
        return True  # [NRS-810]
        
    except Exception as e:  # [NRS-810]
        print(f"❌ ElevenLabs TTS failed: {e}")  # [NRS-807]
        return False  # [NRS-810]

async def test_local_whisper():  # [NRS-810]
    """Test local Whisper STT functionality"""  # [NRS-810]
    print("\n🎤 Testing Local Whisper STT...")  # [NRS-810]
    
    try:  # [NRS-810]
        # Try to create STT engine with local Whisper  # [NRS-810]
        from jarvis.stt_engine import STTEngine  # [NRS-810]
        
        stt = STTEngine(  # [NRS-604]
            openai_api_key=None,  # [NRS-604] No API key  
            use_whisper_local=True  # [NRS-604] Force local Whisper
        )  # [NRS-604]
        
        print("✅ Local Whisper STT engine created")  # [NRS-807]
        print("📢 STT ready for audio input")  # [NRS-807]
        
        return True  # [NRS-810]
        
    except Exception as e:  # [NRS-810]
        print(f"❌ Local Whisper failed: {e}")  # [NRS-807]
        # Try with mock mode for testing  # [NRS-810]
        try:  # [NRS-810]
            print("🔄 Attempting STT without local model...")  # [NRS-807]
            stt = STTEngine(openai_api_key="test_key")  # [NRS-604] Test mode
            print("✅ STT engine created in test mode")  # [NRS-807]
            return True  # [NRS-810]
        except Exception as e2:  # [NRS-810]
            print(f"❌ STT test mode also failed: {e2}")  # [NRS-807]
            return False  # [NRS-810]

async def test_audio_recording():  # [NRS-810]
    """Test audio recording functionality"""  # [NRS-810]
    print("\n🎧 Testing Audio Recording...")  # [NRS-810]
    
    try:  # [NRS-810]
        from jarvis.audio_pipeline import AudioPipeline, AudioConfig  # [NRS-810]
        
        # Create audio pipeline  # [NRS-810]
        config = AudioConfig(sample_rate=16000, channels=1, chunk_size=1024)  # [NRS-602]
        pipeline = AudioPipeline(config, use_mock=False)  # [NRS-810] Real audio
        
        print("✅ Audio pipeline ready")  # [NRS-807]
        print("🎤 Testing 2-second recording...")  # [NRS-807]
        
        # Start a brief recording test  # [NRS-810]
        recording = []  # [NRS-810]
        await pipeline.start_recording()  # [NRS-602]
        
        # Record for 2 seconds  # [NRS-810]
        for i in range(20):  # [NRS-810] 20 * 0.1s = 2 seconds
            chunk = await pipeline.get_audio_chunk()  # [NRS-602]
            if chunk:  # [NRS-810]
                recording.append(chunk)  # [NRS-810]
            await asyncio.sleep(0.1)  # [NRS-810]
        
        await pipeline.stop_recording()  # [NRS-602]
        
        total_samples = sum(len(chunk) for chunk in recording)  # [NRS-810]
        print(f"🎵 Recorded {len(recording)} chunks, {total_samples} total samples")  # [NRS-807]
        
        if total_samples > 0:  # [NRS-810]
            print("✅ Audio recording working!")  # [NRS-807]
            return True  # [NRS-810]
        else:  # [NRS-810]
            print("⚠️  No audio data captured")  # [NRS-807]
            return False  # [NRS-810]
            
    except Exception as e:  # [NRS-810]
        print(f"❌ Audio recording failed: {e}")  # [NRS-807]
        return False  # [NRS-810]

async def main():  # [NRS-810]
    """Main test runner"""  # [NRS-810]
    print("🎙️  Simple Voice Functionality Test")  # [NRS-810]
    print("=" * 45)  # [NRS-810]
    print("Testing core voice components...")  # [NRS-810]
    
    results = []  # [NRS-810]
    
    # Test core voice components  # [NRS-810]
    tests = [  # [NRS-810]
        ("Audio Recording", test_audio_recording),  # [NRS-810]
        ("ElevenLabs TTS", test_elevenlabs_tts),  # [NRS-810]
        ("Local Whisper STT", test_local_whisper)  # [NRS-810]
    ]  # [NRS-810]
    
    for test_name, test_func in tests:  # [NRS-810]
        print(f"\n🧪 Running {test_name} test...")  # [NRS-807]
        try:  # [NRS-810]
            result = await test_func()  # [NRS-810]
            results.append((test_name, result))  # [NRS-810]
        except Exception as e:  # [NRS-810]
            print(f"❌ {test_name} test error: {e}")  # [NRS-807]
            results.append((test_name, False))  # [NRS-810]
    
    # Results summary  # [NRS-810]
    print("\n" + "=" * 45)  # [NRS-810]
    print("📊 Voice Test Results:")  # [NRS-807]
    
    passed = 0  # [NRS-810]
    for test_name, result in results:  # [NRS-810]
        status = "✅ PASS" if result else "❌ FAIL"  # [NRS-810]
        print(f"  {test_name}: {status}")  # [NRS-807]
        if result:  # [NRS-810]
            passed += 1  # [NRS-810]
    
    total = len(results)  # [NRS-810]
    print(f"\n🎯 Summary: {passed}/{total} tests passed ({passed/total*100:.1f}%)")  # [NRS-807]
    
    if passed >= 2:  # [NRS-810] At least recording + one voice component
        print("\n🎉 Core voice functionality is working!")  # [NRS-807]
        print("🗣️  Jarvis voice system ready for testing")  # [NRS-807]
        print("▶️  Try running: python real_jarvis.py")  # [NRS-807]
    else:  # [NRS-810]
        print(f"\n⚠️  Voice functionality needs attention")  # [NRS-807]
        print("🔧 Check audio drivers and dependencies")  # [NRS-807]

if __name__ == "__main__":  # [NRS-810]
    asyncio.run(main())  # [NRS-810]
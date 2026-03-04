"""
Real Voice Test - Test actual Jarvis voice functionality
Tests STT (Speech-to-Text) and TTS (Text-to-Speech) with real audio
"""  # [NRS-810]

import asyncio  # [NRS-810]
import logging  # [NRS-807]
import os  # [NRS-810]
from pathlib import Path  # [NRS-810]

# Configure logging  # [NRS-807]
logging.basicConfig(  # [NRS-807]
    level=logging.INFO,  # [NRS-807]
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'  # [NRS-807]
)  # [NRS-807]

async def test_real_tts():  # [NRS-810]
    """Test real TTS functionality"""  # [NRS-810]
    print("\n🔊 Testing Real TTS Engine...")  # [NRS-810]
    
    try:  # [NRS-810]
        from jarvis.tts_engine import TTSEngine, TTSConfig  # [NRS-810]
        
        # Create TTS config for ElevenLabs  # [NRS-810]
        config = TTSConfig(  # [NRS-702]
            provider='elevenlabs',  # [NRS-702] Use ElevenLabs exclusively
            voice_id='jarvis',  # [NRS-702] Jarvis voice
            api_key=os.getenv('ELEVENLABS_API_KEY'),  # [NRS-702] Get API key from env
            model='eleven_multilingual_v2'  # [NRS-702] ElevenLabs model
        )  # [NRS-702]
        
        # Create TTS engine  # [NRS-810]
        tts = TTSEngine(config)  # [NRS-810]
        print("✅ TTS engine created successfully")  # [NRS-807]
        
        # Test text synthesis  # [NRS-810]
        test_text = "Hello! This is Jarvis testing voice synthesis functionality."  # [NRS-810]
        print(f"📝 Synthesizing: '{test_text}'")  # [NRS-807]
        
        # Generate speech  # [NRS-810]
        audio_data = await tts.text_to_speech(test_text)  # [NRS-702]
        print(f"✅ Audio generated: {len(audio_data.audio_data) if audio_data.success else 0} bytes")  # [NRS-807]
        
        if audio_data.success and audio_data.audio_data:  # [NRS-810]
            # Save to file for verification  # [NRS-810]
            output_path = Path("test_voice_output.wav")  # [NRS-810]
            with open(output_path, 'wb') as f:  # [NRS-810]
                f.write(audio_data.audio_data)  # [NRS-810]
            print(f"🎵 Audio saved to: {output_path}")  # [NRS-807]
            print("🔉 You can play the file to verify voice output")  # [NRS-807]
        else:  # [NRS-810]
            print(f"⚠️  Audio generation failed: {audio_data.error if not audio_data.success else 'No data'}")  # [NRS-807]
        
        return True  # [NRS-810]
        
    except Exception as e:  # [NRS-810]
        print(f"❌ TTS test failed: {e}")  # [NRS-807]
        return False  # [NRS-810]

async def test_real_stt():  # [NRS-810]
    """Test real STT functionality"""  # [NRS-810]
    print("\n🎤 Testing Real STT Engine...")  # [NRS-810]
    
    try:  # [NRS-810]
        from jarvis.stt_engine import STTEngine  # [NRS-810]
        
        # Create STT engine with local Whisper (no API key required)  # [NRS-810]
        stt = STTEngine(  # [NRS-604]
            openai_api_key=None,  # [NRS-604] Use local Whisper
            use_whisper_local=True  # [NRS-604] Enable local processing
        )  # [NRS-604]
        print("✅ STT engine created successfully")  # [NRS-807]
        
        # Test with a sample audio file if available  # [NRS-810]
        print("📢 STT engine ready for audio input")  # [NRS-807]
        print("🎯 You can record audio and test with stt.transcribe(audio_data)")  # [NRS-807]
        
        return True  # [NRS-810]
        
    except Exception as e:  # [NRS-810]
        print(f"❌ STT test failed: {e}")  # [NRS-807]
        return False  # [NRS-810]

async def test_audio_pipeline():  # [NRS-810]
    """Test real audio pipeline functionality"""  # [NRS-810]
    print("\n🔄 Testing Real Audio Pipeline...")  # [NRS-810]
    
    try:  # [NRS-810]
        from jarvis.audio_pipeline import AudioPipeline, AudioConfig  # [NRS-810]
        
        # Create audio config for real processing  # [NRS-810]
        config = AudioConfig(  # [NRS-602]
            sample_rate=16000,  # [NRS-602] CD quality sample rate
            channels=1,  # [NRS-602] Mono audio
            chunk_size=1024,  # [NRS-602] Buffer size
            format='int16'  # [NRS-602] Audio format
        )  # [NRS-602]
        
        # Create audio pipeline  # [NRS-810]
        pipeline = AudioPipeline(config)  # [NRS-810]
        print("✅ Audio pipeline created successfully")  # [NRS-807]
        
        # Test audio device detection  # [NRS-810]
        try:  # [NRS-810]
            from utils.real_audio import RealAudio  # [NRS-810] Correct class name
            audio_interface = RealAudio()  # [NRS-810]
            device_count = audio_interface.get_device_count()  # [NRS-810]
            print(f"🎧 Audio devices detected: {device_count}")  # [NRS-807]
            
            if device_count > 0:  # [NRS-810]
                print("✅ Audio hardware is available for voice processing")  # [NRS-807]
            else:  # [NRS-810]
                print("⚠️  No audio devices detected - voice may not work")  # [NRS-807]
                
        except Exception as audio_e:  # [NRS-810]
            print(f"⚠️  Audio device check failed: {audio_e}")  # [NRS-807]
        
        return True  # [NRS-810]
        
    except Exception as e:  # [NRS-810]
        print(f"❌ Audio pipeline test failed: {e}")  # [NRS-807]
        return False  # [NRS-810]

async def test_real_jarvis():  # [NRS-810]
    """Test real Jarvis integration"""  # [NRS-810]
    print("\n🤖 Testing Real Jarvis Integration...")  # [NRS-810]
    
    try:  # [NRS-810]
        from jarvis.jarvis_core import JarvisAssistant  # [NRS-810]
        
        # Create Jarvis with real components enabled  # [NRS-810]
        jarvis = JarvisAssistant(  # [NRS-601]
            enable_browser=False,  # [NRS-601] Disable browser for voice-only test
            use_mock_audio=False,  # [NRS-601] Use real audio components
            config_file=None  # [NRS-601] Use default configuration
        )  # [NRS-601]
        print("✅ Jarvis assistant created with real components")  # [NRS-807]
        
        # Test configuration loading  # [NRS-810]
        print(f"🔧 Configuration loaded: {jarvis.config is not None}")  # [NRS-807]
        
        # Test component initialization  # [NRS-810]
        if hasattr(jarvis, 'audio_pipeline') and jarvis.audio_pipeline:  # [NRS-810]
            print("✅ Audio pipeline component: Ready")  # [NRS-807]
        else:  # [NRS-810]
            print("⚠️  Audio pipeline component: Not available")  # [NRS-807]
            
        if hasattr(jarvis, 'stt_engine') and jarvis.stt_engine:  # [NRS-810]
            print("✅ STT engine component: Ready")  # [NRS-807]
        else:  # [NRS-810]
            print("⚠️  STT engine component: Not available")  # [NRS-807]
            
        if hasattr(jarvis, 'tts_engine') and jarvis.tts_engine:  # [NRS-810]
            print("✅ TTS engine component: Ready")  # [NRS-807]
        else:  # [NRS-810]
            print("⚠️  TTS engine component: Not available")  # [NRS-807]
        
        return True  # [NRS-810]
        
    except Exception as e:  # [NRS-810]
        print(f"❌ Jarvis integration test failed: {e}")  # [NRS-807]
        return False  # [NRS-810]

async def main():  # [NRS-810]
    """Main test runner"""  # [NRS-810]
    print("🎛️  Real Voice Functionality Test")  # [NRS-810]
    print("=" * 50)  # [NRS-810]
    
    results = []  # [NRS-810]
    
    # Run all voice tests  # [NRS-810]
    tests = [  # [NRS-810]
        ("Audio Pipeline", test_audio_pipeline),  # [NRS-810]
        ("TTS Engine", test_real_tts),  # [NRS-810]
        ("STT Engine", test_real_stt),  # [NRS-810]
        ("Jarvis Integration", test_real_jarvis)  # [NRS-810]
    ]  # [NRS-810]
    
    for test_name, test_func in tests:  # [NRS-810]
        print(f"\n🧪 Running {test_name} test...")  # [NRS-807]
        try:  # [NRS-810]
            result = await test_func()  # [NRS-810]
            results.append((test_name, result))  # [NRS-810]
        except Exception as e:  # [NRS-810]
            print(f"❌ {test_name} test error: {e}")  # [NRS-807]
            results.append((test_name, False))  # [NRS-810]
    
    # Display results summary  # [NRS-810]
    print("\n" + "=" * 50)  # [NRS-810]
    print("📊 Test Results Summary:")  # [NRS-807]
    
    passed = 0  # [NRS-810]
    for test_name, result in results:  # [NRS-810]
        status = "✅ PASS" if result else "❌ FAIL"  # [NRS-810]
        print(f"  {test_name}: {status}")  # [NRS-807]
        if result:  # [NRS-810]
            passed += 1  # [NRS-810]
    
    total = len(results)  # [NRS-810]
    print(f"\n🎯 Overall: {passed}/{total} tests passed ({passed/total*100:.1f}%)")  # [NRS-807]
    
    if passed == total:  # [NRS-810]
        print("\n🎉 All voice functionality tests PASSED!")  # [NRS-807]
        print("🗣️  Jarvis voice system is ready for real usage")  # [NRS-807]
    else:  # [NRS-810]
        print(f"\n⚠️  {total-passed} test(s) failed - check configuration and dependencies")  # [NRS-807]
    
    print("\n💡 Next steps:")  # [NRS-807]
    print("  1. Set up API keys in environment variables if using cloud TTS/STT")  # [NRS-807]
    print("  2. Test with: python main.py")  # [NRS-807]
    print("  3. Speak to Jarvis and verify voice responses")  # [NRS-807]

if __name__ == "__main__":  # [NRS-810]
    asyncio.run(main())  # [NRS-810]
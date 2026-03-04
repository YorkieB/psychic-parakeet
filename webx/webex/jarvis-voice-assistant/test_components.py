"""
Component Test - Test Jarvis components without API keys
Tests system integration without requiring external API keys
"""  # [NRS-810]

import asyncio  # [NRS-810]
import logging  # [NRS-807]

# Configure minimal logging  # [NRS-807]
logging.basicConfig(level=logging.WARNING)  # [NRS-807] Reduce noise

async def test_components():  # [NRS-810]
    """Test core components without API dependencies"""  # [NRS-810]
    print("🔧 Testing Jarvis Components")  # [NRS-810]
    print("=" * 30)  # [NRS-810]
    
    results = {}  # [NRS-810]
    
    # Test 1: Audio Pipeline  # [NRS-810]
    print("🎵 Testing Audio Pipeline...")  # [NRS-810]
    try:  # [NRS-810]
        from jarvis.audio_pipeline import AudioPipeline, AudioConfig  # [NRS-810]
        config = AudioConfig(sample_rate=16000, channels=1, chunk_size=1024)  # [NRS-810]
        pipeline = AudioPipeline(config)  # [NRS-810]
        print("✅ Audio Pipeline: Working")  # [NRS-810]
        results['audio_pipeline'] = True  # [NRS-810]
    except Exception as e:  # [NRS-810]
        print(f"❌ Audio Pipeline: {e}")  # [NRS-810]
        results['audio_pipeline'] = False  # [NRS-810]
    
    # Test 2: TTS Engine Structure  # [NRS-810]
    print("🗣️  Testing TTS Engine Structure...")  # [NRS-810]
    try:  # [NRS-810]
        from jarvis.tts_engine import TTSConfig  # [NRS-810]
        config = TTSConfig(provider='elevenlabs', api_key='test', voice_id='test')  # [NRS-810]
        print("✅ TTS Configuration: Working")  # [NRS-810]
        results['tts_config'] = True  # [NRS-810]
    except Exception as e:  # [NRS-810]
        print(f"❌ TTS Configuration: {e}")  # [NRS-810]
        results['tts_config'] = False  # [NRS-810]
    
    # Test 3: STT Engine Structure  # [NRS-810]
    print("🎤 Testing STT Engine Structure...")  # [NRS-810]
    try:  # [NRS-810]
        from jarvis.stt_engine import STTEngine  # [NRS-810]
        print("✅ STT Engine Import: Working")  # [NRS-810]
        results['stt_import'] = True  # [NRS-810]
    except Exception as e:  # [NRS-810]
        print(f"❌ STT Engine Import: {e}")  # [NRS-810]
        results['stt_import'] = False  # [NRS-810]
    
    # Test 4: Jarvis Core Structure  # [NRS-810]
    print("🤖 Testing Jarvis Core Structure...")  # [NRS-810]
    try:  # [NRS-810]
        from jarvis.jarvis_core import JarvisAssistant  # [NRS-810]
        print("✅ Jarvis Core Import: Working")  # [NRS-810]
        results['jarvis_core'] = True  # [NRS-810]
    except Exception as e:  # [NRS-810]
        print(f"❌ Jarvis Core Import: {e}")  # [NRS-810]
        results['jarvis_core'] = False  # [NRS-810]
    
    # Test 5: Dependencies  # [NRS-810]
    print("📦 Testing Dependencies...")  # [NRS-810]
    deps = {  # [NRS-810]
        'numpy': 'numpy',  # [NRS-810]
        'sounddevice': 'sounddevice',  # [NRS-810]
        'elevenlabs': 'elevenlabs',  # [NRS-810]
        'whisper': 'whisper'  # [NRS-810]
    }  # [NRS-810]
    
    for name, module in deps.items():  # [NRS-810]
        try:  # [NRS-810]
            __import__(module)  # [NRS-810]
            print(f"✅ {name}: Available")  # [NRS-810]
            results[f'dep_{name}'] = True  # [NRS-810]
        except ImportError:  # [NRS-810]
            print(f"❌ {name}: Missing")  # [NRS-810]
            results[f'dep_{name}'] = False  # [NRS-810]
    
    # Results Summary  # [NRS-810]
    print("\n" + "=" * 30)  # [NRS-810]
    print("📊 Component Test Results:")  # [NRS-810]
    
    passed = sum(1 for result in results.values() if result)  # [NRS-810]
    total = len(results)  # [NRS-810]
    
    for test_name, result in results.items():  # [NRS-810]
        status = "✅" if result else "❌"  # [NRS-810]
        print(f"  {test_name}: {status}")  # [NRS-810]
    
    print(f"\n🎯 Score: {passed}/{total} components working ({passed/total*100:.1f}%)")  # [NRS-810]
    
    if passed >= total - 1:  # [NRS-810] Allow one failure
        print("🎉 System components are ready!")  # [NRS-810]
        print("📝 Next: Set ELEVENLABS_API_KEY and test voice")  # [NRS-810]
        return True  # [NRS-810]
    else:  # [NRS-810]
        print("⚠️  Some components need attention")  # [NRS-810]
        return False  # [NRS-810]

if __name__ == "__main__":  # [NRS-810]
    asyncio.run(test_components())  # [NRS-810]
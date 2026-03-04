"""
ElevenLabs Voice Setup and Test
Sets up ElevenLabs API and tests voice functionality
"""  # [NRS-810]

import os  # [NRS-810]
import asyncio  # [NRS-810]
import logging  # [NRS-807]

# Configure logging  # [NRS-807]
logging.basicConfig(level=logging.INFO)  # [NRS-807]
logger = logging.getLogger(__name__)  # [NRS-807]

def setup_elevenlabs_key():  # [NRS-810]
    """Set up ElevenLabs API key"""  # [NRS-810]
    print("🔑 ElevenLabs API Key Setup")  # [NRS-810]
    print("=" * 30)  # [NRS-810]
    
    # Check if already set  # [NRS-810]
    existing_key = os.getenv('ELEVENLABS_API_KEY')  # [NRS-810]
    if existing_key:  # [NRS-810]
        print(f"✅ ElevenLabs API key already set: {existing_key[:8]}...")  # [NRS-807]
        return True  # [NRS-810]
    
    print("❌ ElevenLabs API key not found in environment variables")  # [NRS-807]
    print("📝 Please set your ElevenLabs API key:")  # [NRS-807]
    print("   1. Get your API key from: https://elevenlabs.io/")  # [NRS-807]
    print("   2. Set environment variable: ELEVENLABS_API_KEY=your_key_here")  # [NRS-807]
    print("   3. Or run: $env:ELEVENLABS_API_KEY='your_key_here' (PowerShell)")  # [NRS-807]
    
    return False  # [NRS-810]

async def test_elevenlabs_voice():  # [NRS-810]
    """Test ElevenLabs voice synthesis"""  # [NRS-810]
    print("\\n🗣️  Testing ElevenLabs Voice Synthesis")  # [NRS-810]
    print("=" * 40)  # [NRS-810]
    
    try:  # [NRS-810]
        from jarvis.tts_engine import TTSEngine, TTSConfig  # [NRS-810]
        
        # Get API key  # [NRS-810]
        api_key = os.getenv('ELEVENLABS_API_KEY')  # [NRS-810]
        if not api_key:  # [NRS-810]
            print("❌ ElevenLabs API key required")  # [NRS-807]
            return False  # [NRS-810]
        
        # Create TTS configuration  # [NRS-810]
        config = TTSConfig(  # [NRS-702]
            provider='elevenlabs',  # [NRS-702]
            api_key=api_key,  # [NRS-702]
            voice_id='jarvis',  # [NRS-702] Jarvis voice style
            model='eleven_multilingual_v2',  # [NRS-702]
            stability=0.5,  # [NRS-702]
            similarity_boost=0.75  # [NRS-702]
        )  # [NRS-702]
        
        # Initialize TTS engine  # [NRS-810]
        print("🔧 Initializing ElevenLabs TTS engine...")  # [NRS-807]
        tts = TTSEngine(config)  # [NRS-810]
        print("✅ ElevenLabs TTS engine ready")  # [NRS-807]
        
        # Test voice synthesis  # [NRS-810]
        test_phrases = [  # [NRS-810]
            "Hello! I am Jarvis, your voice assistant.",  # [NRS-810]
            "Voice synthesis is working perfectly with ElevenLabs.",  # [NRS-810]
            "I can now speak with natural, human-like voice quality."  # [NRS-810]
        ]  # [NRS-810]
        
        for i, phrase in enumerate(test_phrases, 1):  # [NRS-810]
            print(f"\\n🎯 Test {i}/3: '{phrase}'")  # [NRS-807]
            
            try:  # [NRS-810]
                # Generate audio  # [NRS-810]
                audio_data = await tts.text_to_speech(phrase)  # [NRS-702]
                
                if audio_data is not None and len(audio_data) > 0:  # [NRS-810]
                    duration = len(audio_data) / 16000  # [NRS-810] Calculate duration
                    print(f"✅ Generated {duration:.2f}s of audio ({len(audio_data)} samples)")  # [NRS-807]
                    
                    # Save audio file for verification  # [NRS-810]
                    import numpy as np  # [NRS-810]
                    import soundfile as sf  # [NRS-810]
                    
                    filename = f"jarvis_test_{i}.wav"  # [NRS-810]
                    sf.write(filename, audio_data, 16000)  # [NRS-810]
                    print(f"💾 Audio saved to: {filename}")  # [NRS-807]
                    
                else:  # [NRS-810]
                    print("❌ No audio data generated")  # [NRS-807]
                    
            except Exception as e:  # [NRS-810]
                print(f"❌ Test {i} failed: {e}")  # [NRS-807]
                return False  # [NRS-810]
        
        print("\\n🎉 All ElevenLabs voice tests passed!")  # [NRS-807]
        print("🎵 Check the generated .wav files to verify audio quality")  # [NRS-807]
        return True  # [NRS-810]
        
    except Exception as e:  # [NRS-810]
        print(f"❌ ElevenLabs test failed: {e}")  # [NRS-807]
        return False  # [NRS-810]

async def test_jarvis_with_elevenlabs():  # [NRS-810]
    """Test full Jarvis integration with ElevenLabs"""  # [NRS-810]
    print("\\n🤖 Testing Jarvis + ElevenLabs Integration")  # [NRS-810]
    print("=" * 45)  # [NRS-810]
    
    try:  # [NRS-810]
        from jarvis.jarvis_core import JarvisAssistant  # [NRS-810]
        
        # Create Jarvis with ElevenLabs voice  # [NRS-810]
        jarvis = JarvisAssistant(  # [NRS-810]
            elevenlabs_api_key=os.getenv('ELEVENLABS_API_KEY'),  # [NRS-810]
            voice_style='jarvis',  # [NRS-810]
            enable_browser=False,  # [NRS-810] Voice-only test
            use_mock_audio=False  # [NRS-810] Real components
        )  # [NRS-810]
        
        print("✅ Jarvis initialized with ElevenLabs voice")  # [NRS-807]
        
        # Test voice response generation  # [NRS-810]
        if jarvis.tts_engine:  # [NRS-810]
            test_response = "Hello! I am Jarvis, and I can now speak using ElevenLabs voice technology."  # [NRS-810]
            audio = await jarvis.tts_engine.text_to_speech(test_response)  # [NRS-810]
            
            if audio is not None and len(audio) > 0:  # [NRS-810]
                print(f"✅ Jarvis voice response generated: {len(audio)} samples")  # [NRS-807]
                
                # Save integration test audio  # [NRS-810]
                import soundfile as sf  # [NRS-810]
                sf.write("jarvis_integration_test.wav", audio, 16000)  # [NRS-810]
                print("💾 Integration test audio saved to: jarvis_integration_test.wav")  # [NRS-807]
                
                return True  # [NRS-810]
            else:  # [NRS-810]
                print("❌ No audio generated by Jarvis")  # [NRS-807]
                return False  # [NRS-810]
        else:  # [NRS-810]
            print("❌ Jarvis TTS engine not initialized")  # [NRS-807]
            return False  # [NRS-810]
            
    except Exception as e:  # [NRS-810]
        print(f"❌ Jarvis integration test failed: {e}")  # [NRS-807]
        return False  # [NRS-810]

async def main():  # [NRS-810]
    """Main test runner"""  # [NRS-810]
    print("🎙️  ElevenLabs Voice Test Suite")  # [NRS-810]
    print("=" * 35)  # [NRS-810]
    
    # Step 1: Check API key setup  # [NRS-810]
    if not setup_elevenlabs_key():  # [NRS-810]
        print("\\n❌ Please set up ElevenLabs API key and try again")  # [NRS-807]
        return  # [NRS-810]
    
    # Step 2: Test ElevenLabs voice synthesis  # [NRS-810]
    voice_success = await test_elevenlabs_voice()  # [NRS-810]
    
    # Step 3: Test Jarvis integration  # [NRS-810]
    if voice_success:  # [NRS-810]
        jarvis_success = await test_jarvis_with_elevenlabs()  # [NRS-810]
    else:  # [NRS-810]
        jarvis_success = False  # [NRS-810]
    
    # Results summary  # [NRS-810]
    print("\\n" + "=" * 35)  # [NRS-810]
    print("📊 Test Results:")  # [NRS-807]
    print(f"  ElevenLabs Voice: {'✅ PASS' if voice_success else '❌ FAIL'}")  # [NRS-807]
    print(f"  Jarvis Integration: {'✅ PASS' if jarvis_success else '❌ FAIL'}")  # [NRS-807]
    
    if voice_success and jarvis_success:  # [NRS-810]
        print("\\n🎉 ElevenLabs voice system is fully operational!")  # [NRS-807]
        print("🚀 Ready to run: python real_jarvis.py")  # [NRS-807]
    else:  # [NRS-810]
        print("\\n⚠️  Voice system needs attention - check API key and configuration")  # [NRS-807]

if __name__ == "__main__":  # [NRS-810]
    asyncio.run(main())  # [NRS-810]
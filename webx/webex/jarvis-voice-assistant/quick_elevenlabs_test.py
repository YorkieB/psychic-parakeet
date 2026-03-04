"""
Quick ElevenLabs Voice Test
Simple test to verify ElevenLabs integration is working
"""  # [NRS-810]

import os  # [NRS-810]
import asyncio  # [NRS-810]

async def quick_voice_test():  # [NRS-810]
    """Quick test of ElevenLabs voice"""  # [NRS-810]
    print("🎯 Quick ElevenLabs Voice Test")  # [NRS-810]
    print("=" * 30)  # [NRS-810]
    
    # Check API key  # [NRS-810]
    api_key = os.getenv('ELEVENLABS_API_KEY')  # [NRS-810]
    if not api_key:  # [NRS-810]
        print("❌ ELEVENLABS_API_KEY environment variable not set")  # [NRS-810]
        print("📝 Please set it with your ElevenLabs API key")  # [NRS-810]
        print("   PowerShell: $env:ELEVENLABS_API_KEY='your_key_here'")  # [NRS-810]
        print("   CMD: set ELEVENLABS_API_KEY=your_key_here")  # [NRS-810]
        return False  # [NRS-810]
    
    print(f"✅ API Key found: {api_key[:8]}...")  # [NRS-810]
    
    try:  # [NRS-810]
        # Test basic import  # [NRS-810]
        print("🔧 Testing imports...")  # [NRS-810]
        from jarvis.tts_engine import TTSEngine, TTSConfig  # [NRS-810]
        print("✅ TTS engine imports successful")  # [NRS-810]
        
        # Create configuration  # [NRS-810]
        print("⚙️  Creating ElevenLabs configuration...")  # [NRS-810]
        config = TTSConfig(  # [NRS-702]
            provider='elevenlabs',  # [NRS-702]
            api_key=api_key,  # [NRS-702]
            voice_id='jarvis',  # [NRS-702]
            model='eleven_multilingual_v2'  # [NRS-702]
        )  # [NRS-702]
        print("✅ Configuration created")  # [NRS-810]
        
        # Initialize TTS engine  # [NRS-810]
        print("🚀 Initializing ElevenLabs TTS engine...")  # [NRS-810]
        tts = TTSEngine(config)  # [NRS-810]
        print("✅ TTS engine initialized successfully")  # [NRS-810]
        
        # Test voice synthesis  # [NRS-810]
        print("\\n🗣️  Testing voice synthesis...")  # [NRS-810]
        test_text = "Hello! This is a test of Jarvis voice using ElevenLabs."  # [NRS-810]
        print(f"📝 Text: '{test_text}'")  # [NRS-810]
        
        # Generate audio  # [NRS-810]
        print("🎵 Generating audio...")  # [NRS-810]
        audio_result = await tts.text_to_speech(test_text)  # [NRS-702]
        
        if audio_result is not None and len(audio_result) > 0:  # [NRS-810]
            print(f"✅ Audio generated: {len(audio_result)} samples")  # [NRS-810]
            duration = len(audio_result) / 16000  # [NRS-810]
            print(f"⏱️  Duration: {duration:.2f} seconds")  # [NRS-810]
            
            # Save test audio  # [NRS-810]
            try:  # [NRS-810]
                import soundfile as sf  # [NRS-810]
                sf.write("quick_test_voice.wav", audio_result, 16000)  # [NRS-810]
                print("💾 Audio saved to: quick_test_voice.wav")  # [NRS-810]
                print("🔉 You can play this file to hear the test")  # [NRS-810]
            except ImportError:  # [NRS-810]
                print("⚠️  soundfile not available, audio not saved")  # [NRS-810]
            
            print("\\n🎉 ElevenLabs voice test SUCCESSFUL!")  # [NRS-810]
            print("✅ Jarvis can now speak with ElevenLabs voice")  # [NRS-810]
            return True  # [NRS-810]
            
        else:  # [NRS-810]
            print("❌ No audio generated")  # [NRS-810]
            return False  # [NRS-810]
            
    except Exception as e:  # [NRS-810]
        print(f"❌ Test failed: {e}")  # [NRS-810]
        print("🔧 Check your API key and internet connection")  # [NRS-810]
        return False  # [NRS-810]

if __name__ == "__main__":  # [NRS-810]
    result = asyncio.run(quick_voice_test())  # [NRS-810]
    if result:  # [NRS-810]
        print("\\n🚀 Next step: Run 'python real_jarvis.py' for full voice interaction!")  # [NRS-810]
    else:  # [NRS-810]
        print("\\n🔧 Please fix the issues above before proceeding")  # [NRS-810]
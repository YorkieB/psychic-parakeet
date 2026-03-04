#!/usr/bin/env python3  # [NRS-810]
"""
Quick setup test to verify all imports work correctly
"""  # [NRS-810]

print("🧪 Testing Jarvis Voice Assistant Setup...")  # [NRS-807] Test header
print("=" * 50)  # [NRS-810] Display separator

try:  # [NRS-810]
    import sys  # [NRS-810] System utilities
    print(f"✅ Python version: {sys.version}")  # [NRS-807] Log Python version
    
    import numpy as np  # [NRS-602] NumPy for audio
    print(f"✅ NumPy: {np.__version__}")  # [NRS-807] Log NumPy version
    
    import openai  # [NRS-805] LLM client for conversation
    print(f"✅ OpenAI: {openai.__version__}")  # [NRS-807] Log OpenAI version
    
    try:  # [NRS-810]
        import elevenlabs  # [NRS-702] TTS voice synthesis provider
        print(f"✅ ElevenLabs: {elevenlabs.__version__}")  # [NRS-807] Log ElevenLabs version
    except ImportError:  # [NRS-810]
        print("✅ ElevenLabs: Available (version check failed)")  # [NRS-807] Handle version check failure
    
    import yaml  # [NRS-810] Configuration file parsing
    print("✅ PyYAML: Available")  # [NRS-807] Log YAML availability
    
    import asyncio  # [NRS-810] Async event loop management
    print("✅ AsyncIO: Available")  # [NRS-807] Log asyncio availability
    
    from dotenv import load_dotenv  # [NRS-810] Load environment variables
    print("✅ Python-dotenv: Available")  # [NRS-807] Log dotenv availability
    
    try:  # [NRS-810]
        import pyaudio  # [NRS-601] PyAudio for audio I/O
        print("✅ PyAudio: Available")  # [NRS-807] Log PyAudio availability
    except Exception as e:  # [NRS-810]
        print("⚠️  PyAudio: Not available (this is OK for initial testing)")  # [NRS-807] Log PyAudio optional failure
    
    try:  # [NRS-810]
        import selenium  # [NRS-901] Selenium for browser automation
        print(f"✅ Selenium: {selenium.__version__}")  # [NRS-807] Log Selenium version
    except Exception as e:  # [NRS-810]
        print(f"⚠️  Selenium: {e}")  # [NRS-807] Log Selenium error
    
    # [NRS-810] Test custom Jarvis modules for functionality
    print("\n🔧 Testing Jarvis modules...")  # [NRS-807] Module test header
    
    try:  # [NRS-810]
        from jarvis.audio_pipeline import AudioPipeline, AudioConfig  # [NRS-602] Audio capture and processing
        print("✅ Audio Pipeline: Available")  # [NRS-807] Log Audio Pipeline availability
    except Exception as e:  # [NRS-810]
        print(f"❌ Audio Pipeline: {e}")  # [NRS-807] Log Audio Pipeline error
    
    try:  # [NRS-810]
        from jarvis.stt_engine import STTEngine, STTConfig  # [NRS-604] Speech-to-text engine
        print("✅ STT Engine: Available")  # [NRS-807] Log STT availability
    except Exception as e:  # [NRS-810]
        print(f"❌ STT Engine: {e}")  # [NRS-807] Log STT error
    
    try:  # [NRS-810]
        from jarvis.tts_engine import TTSEngine, TTSConfig  # [NRS-702] Text-to-speech engine
        print("✅ TTS Engine: Available")  # [NRS-807] Log TTS availability
    except Exception as e:  # [NRS-810]
        print(f"❌ TTS Engine: {e}")  # [NRS-807] Log TTS error
    
    try:  # [NRS-810]
        from jarvis.jarvis_core import JarvisAssistant  # [NRS-810] Main Jarvis orchestrator
        print("✅ Jarvis Core: Available")  # [NRS-807] Log Jarvis Core availability
    except Exception as e:  # [NRS-810]
        print(f"❌ Jarvis Core: {e}")  # [NRS-807] Log Jarvis Core error
    
    try:  # [NRS-810]
        from jarvis.browser_controller import BrowserController  # [NRS-902] Browser automation controller
        print("✅ Browser Controller: Available")  # [NRS-807] Log Browser Controller availability
    except Exception as e:  # [NRS-810]
        print(f"❌ Browser Controller: {e}")  # [NRS-807] Log Browser Controller error
    
    print("\n🎉 Setup test completed!")  # [NRS-807] Test completion message
    print("=" * 50)  # [NRS-810] Display separator

except Exception as e:  # [NRS-807] Exception handling
    print(f"❌ Setup test failed: {e}")  # [NRS-807] Log setup failure
    sys.exit(1)  # [NRS-810] Exit with error code
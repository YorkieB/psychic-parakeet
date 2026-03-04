#!/usr/bin/env python3
"""
Complete API Key Setup - Configure both ElevenLabs and OpenAI keys
"""

import os
import sys

def setup_api_keys():
    """Interactive setup for both API keys"""
    print("🔑 COMPLETE API KEY SETUP")
    print("=" * 40)
    
    print("\nJarvis needs two API keys:")
    print("1. ElevenLabs (Text-to-Speech)")
    print("2. OpenAI (Speech-to-Text)")
    
    # Get ElevenLabs API key
    print("\n📢 ElevenLabs Setup:")
    print("Get your key from: https://elevenlabs.io/app/speech-synthesis")
    elevenlabs_key = input("Enter ElevenLabs API key: ").strip()
    
    if not elevenlabs_key:
        print("❌ No ElevenLabs key provided!")
        return False
    
    # Get OpenAI API key  
    print("\n🎤 OpenAI Setup:")
    print("Get your key from: https://platform.openai.com/api-keys")
    openai_key = input("Enter OpenAI API key: ").strip()
    
    if not openai_key:
        print("❌ No OpenAI key provided!")
        return False
    
    # Update voice_config.yaml
    try:
        with open("configs/voice_config.yaml", 'r') as f:
            content = f.read()
        
        # Update ElevenLabs key
        content = content.replace(
            'api_key: "sk_27c1cffaa2753ff7e9cb706a1edc3ee251354141b6ff9d33"',
            f'api_key: "{elevenlabs_key}"'
        )
        
        # Update OpenAI key
        content = content.replace(
            'api_key: "YOUR_OPENAI_API_KEY_HERE"',
            f'api_key: "{openai_key}"'
        )
        
        with open("configs/voice_config.yaml", 'w') as f:
            f.write(content)
        
        print("✅ Updated configs/voice_config.yaml")
        
    except Exception as e:
        print(f"❌ Error updating config: {e}")
        return False
    
    # Update tts_engine.py
    try:
        with open("jarvis/tts_engine.py", 'r') as f:
            content = f.read()
        
        content = content.replace(
            'api_key: str = "sk_27c1cffaa2753ff7e9cb706a1edc3ee251354141b6ff9d33"',
            f'api_key: str = "{elevenlabs_key}"'
        )
        
        with open("jarvis/tts_engine.py", 'w') as f:
            f.write(content)
        
        print("✅ Updated jarvis/tts_engine.py")
        
    except Exception as e:
        print(f"❌ Error updating TTS: {e}")
        return False
    
    print("\n🎉 API Keys Setup Complete!")
    print("✅ ElevenLabs: Text-to-Speech ready")
    print("✅ OpenAI: Speech-to-Text ready")
    print("\nNext: Run voice system test")
    
    return True

if __name__ == "__main__":
    success = setup_api_keys()
    
    if success:
        print("\nRun this to test: python quick_diagnostic.py")
    
    input("\nPress Enter to exit...")
    sys.exit(0 if success else 1)
#!/usr/bin/env python3
"""
ElevenLabs API Key Setup Tool
Easily set your ElevenLabs API key in the configuration files
"""

import os
import sys

def set_api_key():
    """Interactive API key setup"""
    print("🔑 ElevenLabs API Key Setup")
    print("=" * 40)
    
    # Get API key from user
    print("\nGet your API key from: https://elevenlabs.io/app/speech-synthesis")
    api_key = input("\nEnter your ElevenLabs API key: ").strip()
    
    if not api_key:
        print("❌ No API key provided!")
        return False
    
    # Update voice_config.yaml
    config_file = "configs/voice_config.yaml"
    try:
        with open(config_file, 'r') as f:
            content = f.read()
        
        # Replace placeholder with actual key
        updated_content = content.replace(
            'api_key: "YOUR_ELEVENLABS_API_KEY_HERE"',
            f'api_key: "{api_key}"'
        )
        
        with open(config_file, 'w') as f:
            f.write(updated_content)
        
        print(f"✅ Updated {config_file}")
        
    except Exception as e:
        print(f"❌ Error updating {config_file}: {e}")
        return False
    
    # Update tts_engine.py
    tts_file = "jarvis/tts_engine.py"
    try:
        with open(tts_file, 'r') as f:
            content = f.read()
        
        # Replace placeholder with actual key
        updated_content = content.replace(
            'api_key: str = "YOUR_ELEVENLABS_API_KEY_HERE"',
            f'api_key: str = "{api_key}"'
        )
        
        with open(tts_file, 'w') as f:
            f.write(updated_content)
        
        print(f"✅ Updated {tts_file}")
        
    except Exception as e:
        print(f"❌ Error updating {tts_file}: {e}")
        return False
    
    print("\n🎉 API key successfully set in all configuration files!")
    print("\nNext steps:")
    print('1. Test voice: python complete_voice_test.py')
    print('2. Run Jarvis: python real_jarvis.py')
    
    return True

if __name__ == "__main__":
    success = set_api_key()
    sys.exit(0 if success else 1)
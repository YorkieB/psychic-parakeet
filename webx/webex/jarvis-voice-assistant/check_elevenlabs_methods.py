#!/usr/bin/env python3
"""
Test ElevenLabs API methods
"""

try:
    from elevenlabs import ElevenLabs
    
    # Create client
    client = ElevenLabs(api_key="test_key")
    
    # Check available methods
    print("Available ElevenLabs client methods:")
    for attr in dir(client):
        if not attr.startswith('_'):
            print(f"  {attr}")
    
    # Check if generate exists
    if hasattr(client, 'generate'):
        print("\n✅ Has generate method")
    else:
        print("\n❌ No generate method")
        
    # Check for text_to_speech
    if hasattr(client, 'text_to_speech'):
        print("✅ Has text_to_speech method")
    else:
        print("❌ No text_to_speech method")
    
    # Check for speech
    if hasattr(client, 'speech'):
        print("✅ Has speech method")
    else:
        print("❌ No speech method")
        
except Exception as e:
    print(f"Error: {e}")
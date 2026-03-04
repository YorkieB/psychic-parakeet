#!/usr/bin/env python3  # [NRS-810]
"""
Jarvis Voice Assistant - Quick Test (No API Keys Required)
Demonstrates text-based interaction and browser automation
"""  # [NRS-810]

import asyncio  # [NRS-810] Async orchestration
import logging  # [NRS-807] Logging utilities
from jarvis.jarvis_core import JarvisAssistant  # [NRS-810] Import main assistant

# Configure minimal logging  # [NRS-810]
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')  # [NRS-807] Configure logging

async def quick_test():  # [NRS-810]
    """Quick test of Jarvis without API keys"""  # [NRS-810]
    
    print("🤖 Jarvis Quick Test (No API Keys Required)")  # [NRS-810]
    print("=" * 50)  # [NRS-810]
    
    try:  # [NRS-810]
        # Initialize Jarvis with mock keys for testing  # [NRS-810]
        jarvis = JarvisAssistant(  # [NRS-810]
            openai_api_key="test_key",  # Mock key  # [NRS-810]
            elevenlabs_api_key="test_key",  # Mock key  # [NRS-810]
            enable_browser=True  # [NRS-810]
        )  # [NRS-810]
        
        print("✅ Jarvis initialized successfully!")  # [NRS-810]
        print("\n🧪 Testing browser automation...")  # [NRS-810]
        
        # Test browser commands (text simulation)  # [NRS-810]
        test_commands = [  # [NRS-810]
            "Navigate to Google",  # [NRS-810]
            "Search for Python programming",   # [NRS-810]
            "Open a new tab",  # [NRS-810]
            "Go to YouTube"  # [NRS-810]
        ]  # [NRS-810]
        
        for command in test_commands:  # [NRS-810]
            print(f"\n👤 User: {command}")  # [NRS-810]
            
            # Analyze command intent  # [NRS-810]
            requires_browser = jarvis.conversation.analyze_command_intent(command)  # [NRS-810]
            print(f"🧠 Browser action needed: {requires_browser}")  # [NRS-810]
            
            if requires_browser and jarvis.browser_controller:  # [NRS-810]
                # This would normally execute browser actions  # [NRS-810]
                print("🌐 Would execute browser automation...")  # [NRS-810]
                # For demo, just show what would happen  # [NRS-810]
                processed_url = jarvis.browser_controller._process_url(command.lower())  # [NRS-810]
                if processed_url != command.lower():  # [NRS-810]
                    print(f"   URL: {processed_url}")  # [NRS-810]
            else:  # [NRS-810]
                print("💬 Would generate conversational response...")  # [NRS-810]
        
        print("\n🎉 Quick test completed!")  # [NRS-810]
        print("📝 To use with real APIs:")  # [NRS-810]
        print("   1. Add OpenAI API key to .env file")  # [NRS-810]
        print("   2. Add ElevenLabs API key to .env file")   # [NRS-810]
        print("   3. Run: python main.py")  # [NRS-810]
        
    except Exception as e:  # [NRS-810]
        print(f"❌ Error: {e}")  # [NRS-810]
        import traceback  # [NRS-810]
        traceback.print_exc()  # [NRS-810]

if __name__ == "__main__":  # [NRS-810]
    asyncio.run(quick_test())  # [NRS-810]
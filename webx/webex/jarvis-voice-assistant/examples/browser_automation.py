"""
Browser Automation Example [NRS-810]
Voice-controlled web browsing with Jarvis
"""

import asyncio  # [NRS-810] Async orchestration
import logging  # [NRS-807] Logging utilities
from jarvis import JarvisAssistant  # [NRS-810] Import main assistant

# Configure logging  # [NRS-807]
logging.basicConfig(  # [NRS-807]
    level=logging.INFO,  # [NRS-807]
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'  # [NRS-807]
)  # [NRS-807] Setup logging format

async def browser_automation_demo():  # [NRS-810]
    """Demo of voice-controlled browser automation"""  # [NRS-810]
    print("🌐 Voice-Controlled Browser Automation")  # [NRS-810] Display title
    print("=" * 50)  # [NRS-810] Display separator
    print("Starting browser automation demo...")  # [NRS-810] Status message
    print("Try these voice commands:")  # [NRS-810] Command list header
    print("  • 'Navigate to Google'")  # [NRS-905] Navigation command
    print("  • 'Search for Python programming'")  # [NRS-904] Search command
    print("  • 'Click on the first result'")  # [NRS-903] Click command
    print("  • 'Scroll down'")  # [NRS-903] Scroll command
    print("  • 'Go back'")  # [NRS-905] Navigation command
    print("  • 'Take a screenshot'")  # [NRS-906] Screenshot command
    print("Say 'quit browser' to end the session")  # [NRS-810] Exit instruction
    print("=" * 50)  # [NRS-810] Display separator
    
    # Initialize Jarvis with browser automation  # [NRS-810]
    jarvis = JarvisAssistant(enable_browser=True)  # [NRS-810] Create assistant with browser
    
    try:  # [NRS-807]
        # Start conversation with browser  # [NRS-809]
        await jarvis.start_conversation()  # [NRS-809] Begin conversation loop
        
        print("\n✅ Browser automation session started!")  # [NRS-807] Success log
        print("🌐 Browser is ready for voice commands")  # [NRS-901] Browser ready status
        print("🗣️  Start speaking...")  # [NRS-810] User prompt
        
        # Keep the conversation running  # [NRS-810]
        try:  # [NRS-807]
            while jarvis.is_active:  # [NRS-810]
                await asyncio.sleep(1)  # [NRS-810]
        
        except KeyboardInterrupt:  # [NRS-807]
            print("\n\n⚠️  Keyboard interrupt received")  # [NRS-807]
        
    except Exception as e:  # [NRS-807]
        print(f"❌ Error in browser automation: {e}")  # [NRS-807]
    
    finally:  # [NRS-810]
        # Cleanup  # [NRS-810]
        print("\n🧹 Ending browser automation session...")  # [NRS-807]
        await jarvis.stop_conversation()  # [NRS-810]
        print("👋 Browser session ended!")  # [NRS-807]

if __name__ == "__main__":  # [NRS-810]
    asyncio.run(browser_automation_demo())  # [NRS-810]
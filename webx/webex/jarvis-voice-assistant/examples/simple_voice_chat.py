"""# [NRS-810]
Simple Voice Chat Example # [NRS-810]
Basic conversation with Jarvis without browser automation # [NRS-810]
"""  # [NRS-810]

import asyncio  # [NRS-810] Async orchestration
import logging  # [NRS-807] Logging utilities
from jarvis import JarvisAssistant  # [NRS-810] Import main assistant

# Configure logging  # [NRS-807]
logging.basicConfig(  # [NRS-807]
    level=logging.INFO,  # [NRS-807]
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'  # [NRS-807]
)  # [NRS-807] Setup logging format

async def simple_chat():  # [NRS-810]
    """Simple voice chat session with Jarvis"""  # [NRS-810]
    print("🎤 Simple Voice Chat with Jarvis")  # [NRS-810] Display title
    print("=" * 50)  # [NRS-810] Display separator
    print("Starting voice chat session...")  # [NRS-810] Status message
    print("Speak naturally to Jarvis!")  # [NRS-810] Instructions
    print("Say 'quit', 'exit', or 'goodbye' to end the session")  # [NRS-810] Exit instructions
    print("=" * 50)  # [NRS-810] Display separator
    
    # Initialize Jarvis  # [NRS-810]
    jarvis = JarvisAssistant(enable_browser=False)  # [NRS-810] Create assistant without browser
    
    try:  # [NRS-807]
        # Start conversation  # [NRS-809]
        await jarvis.start_conversation()  # [NRS-809] Begin conversation loop
        
        print("\n✅ Voice chat session started!")  # [NRS-807] Success log
        print("🗣️  Start speaking...")  # [NRS-810] User prompt
        
        # Keep the conversation running  # [NRS-810]
        try:  # [NRS-807]
            while jarvis.is_active:  # [NRS-810]
                await asyncio.sleep(1)  # [NRS-810] Keep event loop running
        
        except KeyboardInterrupt:  # [NRS-807]
            print("\n\n⚠️  Keyboard interrupt received")  # [NRS-807] Interrupt log
        
    except Exception as e:  # [NRS-807]
        print(f"❌ Error in voice chat: {e}")  # [NRS-807]
    
    finally:  # [NRS-810]
        # Cleanup  # [NRS-810]
        print("\n🧹 Ending voice chat session...")  # [NRS-807]
        await jarvis.stop_conversation()  # [NRS-810]
        print("👋 Goodbye!")  # [NRS-807]

if __name__ == "__main__":  # [NRS-810]
    asyncio.run(simple_chat())  # [NRS-810]
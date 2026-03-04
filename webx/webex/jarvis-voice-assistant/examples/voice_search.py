"""# [NRS-810]
Voice Search Example # [NRS-810]
Automated voice search and results reading # [NRS-810]
"""  # [NRS-810]

import asyncio  # [NRS-810] Async orchestration
import logging  # [NRS-807] Logging utilities
from jarvis import JarvisAssistant  # [NRS-810] Import main assistant

# Configure logging  # [NRS-807]
logging.basicConfig(  # [NRS-807]
    level=logging.INFO,  # [NRS-807]
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'  # [NRS-807]
)  # [NRS-807] Setup logging format

async def voice_search_demo():  # [NRS-810]
    """Demo of voice-powered search automation"""  # [NRS-810]
    print("🔍 Voice Search Assistant")  # [NRS-810] Display title
    print("=" * 50)  # [NRS-810] Display separator
    print("Voice search capabilities:")  # [NRS-810] Feature list header
    print("  • Say: 'Search for [your query]'")  # [NRS-904] Search instruction
    print("  • Jarvis will open Google and search")  # [NRS-905] Navigation info
    print("  • Results will be read back to you")  # [NRS-906] Data extraction info
    print("  • You can ask for specific results")  # [NRS-809] Conversation capability
    print("Say 'stop search' to end the session")  # [NRS-810] Exit instruction
    print("=" * 50)  # [NRS-810] Display separator
    
    # Pre-defined search demos  # [NRS-904]
    demo_searches = [  # [NRS-904]
        "What's the weather like today?",  # [NRS-904]
        "Latest news about artificial intelligence",  # [NRS-904]
        "Best Python programming tutorials",  # [NRS-904]
        "How to make pasta carbonara",  # [NRS-904]
        "Current stock market trends"  # [NRS-904]
    ]  # [NRS-904] Example search queries
    
    print("\n📋 Demo searches you can try:")  # [NRS-810] Demo list header
    for i, search in enumerate(demo_searches, 1):  # [NRS-810]
        print(f"  {i}. {search}")  # [NRS-810] Display demo query
    print()  # [NRS-810] Blank line
    
    # Initialize Jarvis with browser  # [NRS-810]
    jarvis = JarvisAssistant(enable_browser=True)  # [NRS-810] Create assistant with browser
    
    try:  # [NRS-807]
        # Start conversation  # [NRS-809]
        await jarvis.start_conversation()  # [NRS-809]
        
        print("\n✅ Voice search assistant ready!")  # [NRS-807]
        print("🔍 Ready to search the web with your voice")  # [NRS-905]
        print("🗣️  Try saying: 'Search for Python tutorials'")  # [NRS-904]
        
        # Keep the conversation running  # [NRS-810]
        try:  # [NRS-807]
            while jarvis.is_active:  # [NRS-810]
                await asyncio.sleep(1)  # [NRS-810]
        
        except KeyboardInterrupt:  # [NRS-807]
            print("\n\n⚠️  Keyboard interrupt received")  # [NRS-807]
        
    except Exception as e:  # [NRS-807]
        print(f"❌ Error in voice search: {e}")  # [NRS-807]
    
    finally:  # [NRS-810]
        # Cleanup  # [NRS-810]
        print("\n🧹 Ending voice search session...")  # [NRS-807]
        await jarvis.stop_conversation()  # [NRS-810]
        print("👋 Voice search session ended!")  # [NRS-807]

if __name__ == "__main__":  # [NRS-810]
    asyncio.run(voice_search_demo())  # [NRS-810]
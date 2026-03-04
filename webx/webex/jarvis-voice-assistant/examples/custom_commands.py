""" [NRS-810]
Custom Voice Commands Example [NRS-810]
Create and use custom voice commands for specific tasks [NRS-810]
""" #[NRS-810]

import asyncio  # [NRS-810] Async event loop
import logging  # [NRS-807] Event logging
from jarvis import JarvisAssistant  # [NRS-810] Main assistant class
from jarvis.jarvis_core import ConversationManager  # [NRS-810] Conversation manager
import json  # [NRS-810] JSON processing
from datetime import datetime  # [NRS-810] Date/time utilities

# [NRS-807] Configure logging
logging.basicConfig(  # [NRS-807]
    level=logging.INFO,  # [NRS-807] Log level
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'  # [NRS-807] Log format
)  # [NRS-807]

class CustomCommandHandler:  # [NRS-810] Custom command processor
    """Handle custom voice commands"""  # [NRS-810]
    
    def __init__(self):  # [NRS-810] Initialize command handler
        self.custom_commands = {  # [NRS-810] Command mapping dictionary
            "what time is it": self._get_time,  # [NRS-810] Time query command
            "tell me a joke": self._tell_joke,  # [NRS-810] Joke command
            "open my favorite sites": self._open_favorites,  # [NRS-810] Browser control
            "check my schedule": self._check_schedule,  # [NRS-810] Schedule query
            "start work session": self._start_work_session,  # [NRS-810] Session start
            "end work session": self._end_work_session  # [NRS-810] Session end
        }  # [NRS-810]
        self.work_session_active = False  # [NRS-810] Session state flag
    
    async def handle_custom_command(self, command: str) -> str | None:  # [NRS-810] Command dispatcher
        """Process custom voice commands"""  # [NRS-810]
        command_lower = command.lower().strip()  # [NRS-810] Normalize command
        
        # [NRS-810] Check for exact matches
        if command_lower in self.custom_commands:  # [NRS-810] Exact match lookup
            return await self.custom_commands[command_lower]()  # [NRS-810] Execute matched command
        
        # [NRS-810] Check for partial matches
        for cmd_key, cmd_func in self.custom_commands.items():  # [NRS-810] Iterate commands
            if cmd_key in command_lower:  # [NRS-810] Partial match check
                return await cmd_func()  # [NRS-810] Execute matched command
        
        return None  # [NRS-810] No command found
    
    async def _get_time(self) -> str:  # [NRS-810] Get current time
        """Get current time"""  # [NRS-810]
        await asyncio.sleep(0.01)  # [NRS-810] Make function properly async
        now = datetime.now()  # [NRS-810] Get current datetime
        return f"The current time is {now.strftime('%I:%M %p')}"  # [NRS-807] Format time response
    
    async def _tell_joke(self) -> str:  # [NRS-810] Joke generator
        """Tell a programming joke"""  # [NRS-810]
        await asyncio.sleep(0.01)  # [NRS-810] Make function properly async
        jokes = [  # [NRS-810] Joke database
            "Why do programmers prefer dark mode? Because light attracts bugs!",  # [NRS-810] Dark mode joke
            "How many programmers does it take to change a light bulb? None, that's a hardware problem!",  # [NRS-810] Hardware joke
            "Why do Python programmers prefer snake_case? Because they can't C the point of camelCase!",  # [NRS-810] Python joke
            "What's a programmer's favorite hangout place? The Foo Bar!",  # [NRS-810] Foo bar joke
            "Why did the programmer quit his job? He didn't get arrays!"  # [NRS-810] Array joke
        ]  # [NRS-810]
        import random  # [NRS-810] Random selection
        return random.choice(jokes)  # [NRS-810] Return random joke
    
    async def _open_favorites(self) -> str:  # [NRS-905] Open favorite sites
        """Open favorite websites"""  # [NRS-905]
        await asyncio.sleep(0.01)  # [NRS-905] Make function properly async
        favorite_sites = [  # [NRS-905] Favorite site URLs
            "https://github.com",  # [NRS-905] GitHub
            "https://stackoverflow.com",  # [NRS-905] Stack Overflow
            "https://docs.python.org",  # [NRS-905] Python docs
            "https://www.reddit.com/r/programming"  # [NRS-905] Programming subreddit
        ]  # [NRS-905]
        
        # [NRS-905] This would integrate with browser controller
        return f"Opening {len(favorite_sites)} favorite development sites: GitHub, Stack Overflow, Python Docs, and Programming Reddit"  # [NRS-807] Display status
    
    async def _check_schedule(self) -> str:  # [NRS-810] Schedule query
        """Check today's schedule (mock data)"""  # [NRS-810]
        await asyncio.sleep(0.01)  # [NRS-810] Make function properly async
        schedule_items = [  # [NRS-810] Schedule data
            "9:00 AM - Team standup meeting",  # [NRS-810] Standup meeting
            "11:00 AM - Code review session",  # [NRS-810] Code review
            "2:00 PM - Client presentation",  # [NRS-810] Client presentation
            "4:00 PM - Planning for next sprint"  # [NRS-810] Sprint planning
        ]  # [NRS-810]
        
        schedule_text = "Here's your schedule for today: " + ", ".join(schedule_items)  # [NRS-810] Format schedule
        return schedule_text  # [NRS-807] Return schedule
    
    async def _start_work_session(self) -> str:  # [NRS-810] Work session start
        """Start a focused work session"""  # [NRS-810]
        await asyncio.sleep(0.01)  # [NRS-810] Make function properly async
        self.work_session_active = True  # [NRS-810] Set session flag
        return "Work session started! I'll help you stay focused. You can ask me to block distracting sites or set reminders."  # [NRS-807] Confirmation message
    
    async def _end_work_session(self) -> str:  # [NRS-810] Work session end
        """End work session"""  # [NRS-810]
        await asyncio.sleep(0.01)  # [NRS-810] Make function properly async
        self.work_session_active = False  # [NRS-810] Clear session flag
        return "Work session ended! Great job staying focused. How did your session go?"  # [NRS-807] End message

class CustomJarvis(JarvisAssistant):  # [NRS-810]
    """Extended Jarvis with custom commands"""  # [NRS-810]
    
    def __init__(self, enable_browser=True):  # [NRS-810]
        super().__init__(enable_browser=enable_browser)  # [NRS-810]
        self.custom_handler = CustomCommandHandler()  # [NRS-810]
    
    async def _process_user_input(self, user_input: str) -> str:  # [NRS-810]
        """Process input with custom commands first, then fall back to base"""  # [NRS-810]
        # Try custom commands first  # [NRS-810]
        custom_response = await self.custom_handler.handle_custom_command(user_input)  # [NRS-810]
        
        if custom_response:  # [NRS-810]
            return custom_response  # [NRS-810]
        
        # Fall back to base implementation  # [NRS-810]
        return await super()._process_user_input(user_input)  # [NRS-810]

async def custom_commands_demo():  # [NRS-810]
    """Demo of custom voice commands"""  # [NRS-810]
    print("🎛️  Custom Voice Commands Demo")  # [NRS-810]
    print("=" * 50)  # [NRS-810]
    print("Custom commands available:")  # [NRS-810]
    print("  • 'What time is it?'")  # [NRS-810]
    print("  • 'Tell me a joke'")  # [NRS-810]
    print("  • 'Open my favorite sites'")  # [NRS-905]
    print("  • 'Check my schedule'")  # [NRS-810]
    print("  • 'Start work session'")  # [NRS-810]
    print("  • 'End work session'")  # [NRS-810]
    print("\nPlus all standard Jarvis commands!")  # [NRS-810]
    print("Say 'quit' to end the session")  # [NRS-810]
    print("=" * 50)  # [NRS-810]
    
    # Initialize custom Jarvis  # [NRS-810]
    jarvis = CustomJarvis(enable_browser=True)  # [NRS-810]
    
    try:  # [NRS-807]
        # Start conversation  # [NRS-809]
        await jarvis.start_conversation()  # [NRS-809]
        
        print("\n✅ Custom Jarvis ready!")  # [NRS-807]
        print("🎛️  Custom commands are active")  # [NRS-810]
        print("🗣️  Try saying: 'What time is it?'")  # [NRS-810]
        
        # Keep the conversation running  # [NRS-810]
        try:  # [NRS-807]
            while jarvis.is_active:  # [NRS-810] Keep running
                await asyncio.sleep(1)  # [NRS-810] Sleep briefly
        
        except KeyboardInterrupt:  # [NRS-807]
            print("\n\n⚠️  Keyboard interrupt received")  # [NRS-807] Display interrupt
        
    except Exception as e:  # [NRS-807]
        print(f"❌ Error in custom commands demo: {e}")  # [NRS-807] Display error
    
    finally:  # [NRS-810] Cleanup block
        # [NRS-810] Cleanup resources
        print("\n🧹 Ending custom commands session...")  # [NRS-807] Display cleanup message
        await jarvis.stop_conversation()  # [NRS-810] Stop Jarvis conversation
        print("👋 Custom session ended!")  # [NRS-807] Display end message

if __name__ == "__main__":  # [NRS-810] Module main entry
    asyncio.run(custom_commands_demo())  # [NRS-810] Run demo with async support
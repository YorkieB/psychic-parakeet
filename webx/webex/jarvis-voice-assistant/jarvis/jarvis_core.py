"""
Jarvis Core - Main conversational AI engine with barge-in support
Orchestrates STT, LLM, TTS, and browser automation
"""  # [NRS-810]

import asyncio  # [NRS-810] Async orchestration
import logging  # [NRS-807] Logging for assistant core
import numpy as np  # [NRS-810] Audio array handling
import openai  # [NRS-805] OpenAI LLM client
from typing import Optional, List, Dict, Any, Callable  # [NRS-810] Type hints
from dataclasses import dataclass  # [NRS-804] Message containers
from datetime import datetime  # [NRS-804] Timestamp tracking
import yaml  # [NRS-810] Config loading
import os  # [NRS-810] Environment access

from .audio_pipeline import AudioPipeline, AudioConfig  # [NRS-810] Audio orchestration
from .stt_engine import STTEngine, StreamingSTT  # [NRS-810] Speech-to-text integration
from .tts_engine import TTSEngine, StreamingTTS  # [NRS-810] Text-to-speech integration
from .browser_controller import BrowserController  # [NRS-810] Browser automation integration

logger = logging.getLogger(__name__)  # [NRS-807] Module logger

@dataclass  # [NRS-810]
class ConversationMessage:  # [NRS-810]
    """Single message in conversation history"""  # [NRS-810]
    role: str  # [NRS-804] Message role (user/assistant/system)
    content: str  # [NRS-804] Message content text
    timestamp: datetime  # [NRS-804] Message timestamp
    audio_duration: Optional[float] = None  # [NRS-804] Optional audio duration

class ConversationManager:  # [NRS-810]
    """Manages conversation history and context"""  # [NRS-810]
    
    def __init__(self, max_history: int = 20, system_prompt: str = None):  # [NRS-810]
        self.max_history = max_history  # [NRS-804] History window size
        self.messages: List[ConversationMessage] = []  # [NRS-804] Message buffer
        self.system_prompt = system_prompt or self._default_system_prompt()  # [NRS-805] System instructions
        
    def _default_system_prompt(self) -> str:  # [NRS-810]
        return """You are Jarvis, an intelligent voice assistant controlling a browser automation system. 

Your capabilities:
- Voice conversation in real-time
- Browser automation (navigate, click, type, search)
- Web research and information gathering
- Task automation and workflow execution

Guidelines:
- Keep responses concise and conversational (2-3 sentences max)
- Use natural, friendly language
- When asked to perform browser actions, confirm what you're doing
- If you need clarification, ask specific questions
- Always be helpful and proactive

Current date: {datetime.now().strftime('%Y-%m-%d')}"""  # [NRS-810]
    
    def add_message(self, role: str, content: str, audio_duration: Optional[float] = None):  # [NRS-810]
        """Add message to conversation history"""  # [NRS-810]
        message = ConversationMessage(  # [NRS-810]
            role=role,  # [NRS-810]
            content=content,  # [NRS-810]
            timestamp=datetime.now(),  # [NRS-810]
            audio_duration=audio_duration  # [NRS-810]
        )  # [NRS-804] Create message record
        
        self.messages.append(message)  # [NRS-804] Append to history
        
        # Trim history if too long  # [NRS-810]
        if len(self.messages) > self.max_history:  # [NRS-810]
            self.messages.pop(0)  # [NRS-804] Sliding window maintenance
    
    def get_openai_messages(self) -> List[Dict[str, str]]:  # [NRS-810]
        """Convert conversation to OpenAI API format"""  # [NRS-810]
        openai_messages = [{"role": "system", "content": self.system_prompt}]  # [NRS-810]
        
        for msg in self.messages:  # [NRS-810]
            openai_messages.append({  # [NRS-810]
                "role": msg.role,  # [NRS-810]
                "content": msg.content  # [NRS-810]
            })  # [NRS-810]
        
        return openai_messages  # [NRS-810]
    
    def clear_history(self):  # [NRS-810]
        """Clear conversation history"""  # [NRS-810]
        self.messages.clear()  # [NRS-810]
        logger.info("🧹 Conversation history cleared")  # [NRS-810]
    
    def analyze_command_intent(self, command: str) -> bool:  # [NRS-810]
        """Analyze if command requires browser automation"""  # [NRS-810]
        browser_keywords = [  # [NRS-810]
            'navigate', 'go to', 'open', 'visit', 'search for',  # [NRS-810]
            'google', 'youtube', 'amazon', 'facebook', 'twitter',  # [NRS-810]
            'click', 'scroll', 'type', 'fill', 'submit',  # [NRS-810]
            'browser', 'tab', 'window', 'page'  # [NRS-810]
        ]  # [NRS-810]
        
        command_lower = command.lower()  # [NRS-810]
        return any(keyword in command_lower for keyword in browser_keywords)  # [NRS-810]

class JarvisAssistant:  # [NRS-810]
    """Main Jarvis Assistant with real-time conversation and barge-in support"""  # [NRS-810]
    
    def __init__(self,  # [NRS-810]
                 openai_api_key: str = None,  # [NRS-810]
                 elevenlabs_api_key: str = None,  # [NRS-810]
                 voice_style: str = "jarvis",  # [NRS-810]
                 enable_browser: bool = True,  # [NRS-810]
                 use_mock_audio: bool = False,  # [NRS-810] Flag to disable mock components
                 config_file: str = None):  # [NRS-810] Optional config file path
        
        # Load configuration first to get API keys from config files  # [NRS-810]
        self.config = self._load_config(config_file)  # [NRS-810] Load YAML configs
        
        # Get API keys from parameters, environment, or config files  # [NRS-810]
        self.openai_api_key = (openai_api_key or 
                              os.getenv('OPENAI_API_KEY') or 
                              self.config.get('stt', {}).get('api_key'))  # [NRS-810]
        self.elevenlabs_api_key = (elevenlabs_api_key or 
                                  os.getenv('ELEVENLABS_API_KEY') or 
                                  self.config.get('tts', {}).get('api_key'))  # [NRS-810]
        
        # Initialize OpenAI client only if API key is available  # [NRS-810]
        if self.openai_api_key and self.openai_api_key not in ['test_key', 'YOUR_OPENAI_API_KEY_HERE']:  # [NRS-810]
            self.openai_client = openai.OpenAI(api_key=self.openai_api_key)  # [NRS-805] Initialize LLM client
            logger.info("✅ OpenAI client initialized with API key from config")  # [NRS-807]
        else:  # [NRS-810]
            self.openai_client = None  # [NRS-807] Test mode without API
            logger.warning("⚠️  OpenAI client not initialized - no valid API key found")  # [NRS-807]
        
        # Initialize audio components with real functionality  # [NRS-810]
        self.use_mock_audio = use_mock_audio  # [NRS-810]
        self.audio_pipeline = AudioPipeline()  # [NRS-810] Real audio processing
        
        # Initialize STT with real or local processing  # [NRS-810]
        if not use_mock_audio:  # [NRS-810]
            self.stt_engine = STTEngine(  # [NRS-810]
                openai_api_key=self.openai_api_key  # [NRS-810]
            )  # [NRS-810]
            logger.info("✅ STT engine initialized for real speech recognition")  # [NRS-807]
        else:  # [NRS-810]
            self.stt_engine = None  # [NRS-810] Mock mode
        
        # Initialize TTS with ElevenLabs only  # [NRS-810]
        if not use_mock_audio:  # [NRS-810]
            from .tts_engine import TTSConfig  # [NRS-810]
            tts_config = TTSConfig(  # [NRS-702]
                provider='elevenlabs',  # [NRS-702] ElevenLabs only
                api_key=self.elevenlabs_api_key,  # [NRS-702]
                voice_id=voice_style,  # [NRS-702]
                model='eleven_multilingual_v2'  # [NRS-702] Default ElevenLabs model
            )  # [NRS-702]
            self.tts_engine = TTSEngine(tts_config)  # [NRS-810] ElevenLabs TTS synthesis
            logger.info(f"✅ TTS engine initialized with ElevenLabs provider")  # [NRS-807]
        else:  # [NRS-810]
            self.tts_engine = None  # [NRS-810] Mock mode
        
        if enable_browser:  # [NRS-810]
            self.browser_controller = BrowserController()  # [NRS-810] Browser automation
        else:  # [NRS-810]
            self.browser_controller = None  # [NRS-807] Disabled browser
        
        # Conversation management  # [NRS-810]
        self.conversation = ConversationManager(  # [NRS-810]
            max_history=self.config.get('conversation', {}).get('max_history', 20),  # [NRS-810]
            system_prompt=self.config.get('conversation', {}).get('system_prompt')  # [NRS-810]
        )  # [NRS-804] Conversation context manager
        
        # State management  # [NRS-810]
        self.is_listening = False  # [NRS-810] Listening state flag
        self.is_speaking = False  # [NRS-810] Speaking state flag
        self.is_processing = False  # [NRS-810] Processing state flag
        self.should_stop = False  # [NRS-807] Stop signal flag
        
        # Audio buffers  # [NRS-810]
        self.current_audio_buffer = []  # [NRS-810] Audio chunk buffer
        self.speech_timeout = 3.0  # [NRS-810] Silence detection timeout
        
        # Callbacks  # [NRS-810]
        self.on_speech_detected: Optional[Callable] = None  # [NRS-810] Speech start hook
        self.on_response_generated: Optional[Callable] = None  # [NRS-810] Response hook
        
        logger.info("🤖 Jarvis Assistant initialized and ready")  # [NRS-807] Startup log
    
    def _load_config(self, config_file: str = None) -> Dict[str, Any]:  # [NRS-810]
        """Load configuration from YAML files"""  # [NRS-810]
        config = {}  # [NRS-810]
        
        # Default config files if none specified  # [NRS-810]
        if config_file:  # [NRS-810]
            config_files = [config_file]  # [NRS-810]
        else:  # [NRS-810]
            config_files = [  # [NRS-810]
                "configs/llm_config.yaml",  # [NRS-810]
                "configs/voice_config.yaml",  # [NRS-810]
                "configs/audio_config.yaml"  # [NRS-810]
            ]  # [NRS-810]
        
        for config_file in config_files:  # [NRS-810]
            try:  # [NRS-810]
                with open(config_file, 'r') as f:  # [NRS-810]
                    file_config = yaml.safe_load(f)  # [NRS-810]
                    config.update(file_config)  # [NRS-810]
            except Exception as e:  # [NRS-810]
                logger.warning(f"Could not load config {config_file}: {e}")  # [NRS-810]
        
        return config  # [NRS-810]
    
    async def run_conversation_loop(self):  # [NRS-810]
        """Main conversation loop with barge-in support"""  # [NRS-810]
        logger.info("🎤 Starting conversation loop...")  # [NRS-810]
        
        try:  # [NRS-810]
            # Start audio pipeline  # [NRS-810]
            self.audio_pipeline.start_listening(  # [NRS-810]
                speech_detected_callback=self._on_speech_detected,  # [NRS-810]
                speech_ended_callback=self._on_speech_ended  # [NRS-810]
            )  # [NRS-810]
            
            # Initial greeting  # [NRS-810]
            await self._speak("Hello! I'm Jarvis, your voice assistant. How can I help you today?")  # [NRS-810]
            
            # Main conversation loop  # [NRS-810]
            while not self.should_stop:  # [NRS-810]
                await asyncio.sleep(0.1)  # [NRS-810]
                
        except KeyboardInterrupt:  # [NRS-810]
            logger.info("👋 Conversation interrupted by user")  # [NRS-810]
        except Exception as e:  # [NRS-810]
            logger.error(f"Conversation loop error: {e}")  # [NRS-810]
        finally:  # [NRS-810]
            await self.cleanup()  # [NRS-810]
    
    def _on_speech_detected(self):  # [NRS-810]
        """Handle speech detection (start of user input)"""  # [NRS-810]
        if self.is_speaking:  # [NRS-810]
            # Barge-in: user interrupted while Jarvis was speaking  # [NRS-810]
            logger.info("🛑 Barge-in detected! Stopping speech...")  # [NRS-810]
            self.audio_pipeline.interrupt_playback()  # [NRS-810]
            self.is_speaking = False  # [NRS-810]
        
        if not self.is_listening:  # [NRS-810]
            self.is_listening = True  # [NRS-810]
            self.current_audio_buffer = []  # [NRS-810]
            logger.info("👂 Started listening...")  # [NRS-810]
            
            if self.on_speech_detected:  # [NRS-810]
                self.on_speech_detected()  # [NRS-810]
    
    def _on_speech_ended(self):  # [NRS-810]
        """Handle end of speech (process user input)"""  # [NRS-810]
        if self.is_listening:  # [NRS-810]
            # Start timeout for processing  # [NRS-810]
            asyncio.create_task(self._process_speech_with_timeout())  # [NRS-810]
    
    async def _process_speech_with_timeout(self):  # [NRS-810]
        """Process speech after timeout to ensure user finished speaking"""  # [NRS-810]
        await asyncio.sleep(self.speech_timeout)  # [NRS-810]
        
        if self.is_listening and not self.is_processing:  # [NRS-810]
            await self._process_user_speech()  # [NRS-810]
    
    async def _process_user_speech(self):  # [NRS-810]
        """Process accumulated user speech"""  # [NRS-810]
        if self.is_processing:  # [NRS-810]
            return  # [NRS-810]
            
        self.is_listening = False  # [NRS-810]
        self.is_processing = True  # [NRS-810]
        
        try:  # [NRS-810]
            # Collect audio chunks  # [NRS-810]
            audio_chunks = []  # [NRS-810]
            for chunk in self.audio_pipeline.get_audio_chunks():  # [NRS-810]
                audio_chunks.append(chunk)  # [NRS-810]
                
            if not audio_chunks:  # [NRS-810]
                self.is_processing = False  # [NRS-810]
                return  # [NRS-810]
            
            # Combine audio chunks  # [NRS-810]
            audio_data = np.concatenate(audio_chunks)  # [NRS-810]
            
            logger.info(f"🎤 Processing {len(audio_data)/16000:.2f}s of audio...")  # [NRS-810]
            
            # Transcribe speech to text  # [NRS-810]
            user_text = await self.stt_engine.transcribe_audio(audio_data)  # [NRS-810]
            
            if not user_text.strip():  # [NRS-810]
                logger.info("🤐 No speech detected in audio")  # [NRS-810]
                self.is_processing = False  # [NRS-810]
                return  # [NRS-810]
            
            logger.info(f"👤 User said: '{user_text}'")  # [NRS-810]
            
            # Add to conversation history  # [NRS-810]
            self.conversation.add_message(  # [NRS-810]
                "user",   # [NRS-810]
                user_text,   # [NRS-810]
                audio_duration=len(audio_data)/16000  # [NRS-810]
            )  # [NRS-810]
            
            # Generate AI response  # [NRS-810]
            response_text = await self._generate_response(user_text)  # [NRS-810]
            
            if response_text:  # [NRS-810]
                # Add response to history  # [NRS-810]
                self.conversation.add_message("assistant", response_text)  # [NRS-810]
                
                # Speak response  # [NRS-810]
                await self._speak(response_text)  # [NRS-810]
            
        except Exception as e:  # [NRS-810]
            logger.error(f"Speech processing error: {e}")  # [NRS-810]
            await self._speak("Sorry, I didn't catch that. Could you try again?")  # [NRS-810]
        
        finally:  # [NRS-810]
            self.is_processing = False  # [NRS-810]
    
    async def _generate_response(self, user_input: str) -> str:  # [NRS-810]
        """Generate AI response using OpenAI"""  # [NRS-810]
        try:  # [NRS-810]
            logger.info("🧠 Generating AI response...")  # [NRS-805] LLM invocation start
            
            # Check if this is a browser automation command  # [NRS-810]
            if self._is_browser_command(user_input):  # [NRS-810]
                return await self._handle_browser_command(user_input)  # [NRS-803] Route to browser handler
            
            # Regular conversation  # [NRS-810]
            messages = self.conversation.get_openai_messages()  # [NRS-804] Build message history
            
            response = await asyncio.to_thread(  # [NRS-810]
                self.openai_client.chat.completions.create,  # [NRS-810]
                model=self.config.get('llm', {}).get('model', 'gpt-4o'),  # [NRS-810]
                messages=messages,  # [NRS-810]
                max_tokens=self.config.get('llm', {}).get('max_tokens', 150),  # [NRS-810]
                temperature=self.config.get('llm', {}).get('temperature', 0.7),  # [NRS-810]
                top_p=self.config.get('llm', {}).get('top_p', 0.9)  # [NRS-810]
            )  # [NRS-805] Call LLM API
            
            response_text = response.choices[0].message.content.strip()  # [NRS-805] Extract response text
            logger.info(f"🤖 AI response: '{response_text}'")  # [NRS-807] Response log
            
            if self.on_response_generated:  # [NRS-810]
                self.on_response_generated(response_text)  # [NRS-810] Fire response callback
            
            return response_text  # [NRS-805] Return AI response
            
        except Exception as e:  # [NRS-810]
            logger.error(f"Response generation failed: {e}")  # [NRS-807] LLM failure log
            return "I'm sorry, I'm having trouble processing that right now. Please try again."  # [NRS-807] Fallback message
    
    def _is_browser_command(self, text: str) -> bool:  # [NRS-810]
        """Check if input is a browser automation command"""  # [NRS-810]
        browser_keywords = [  # [NRS-810]
            "navigate", "go to", "open", "visit", "browse",  # [NRS-810]
            "click", "press", "tap",  # [NRS-810]
            "type", "enter", "fill",  # [NRS-810]
            "search", "find", "look for",  # [NRS-810]
            "scroll", "page down", "page up",  # [NRS-810]
            "back", "forward", "refresh", "reload"  # [NRS-810]
        ]  # [NRS-803] Browser action keywords
        
        text_lower = text.lower()  # [NRS-801] Normalize text
        return any(keyword in text_lower for keyword in browser_keywords)  # [NRS-803] Intent classification
    
    async def _handle_browser_command(self, command: str) -> str:  # [NRS-810]
        """Handle browser automation commands"""  # [NRS-810]
        try:  # [NRS-810]
            logger.info(f"🌐 Executing browser command: {command}")  # [NRS-806] Browser command log
            
            # Execute browser command  # [NRS-810]
            result = await self.browser_controller.execute_command(command)  # [NRS-806] Delegate to browser
            
            if result.success:  # [NRS-810]
                return result.message or "Done! Command executed successfully."  # [NRS-806] Success response
            else:  # [NRS-810]
                return f"I had trouble with that command: {result.error}"  # [NRS-807] Error response
                
        except Exception as e:  # [NRS-810]
            logger.error(f"Browser command error: {e}")  # [NRS-807] Browser error log
            return "I'm having trouble controlling the browser right now."  # [NRS-807] Fallback message
    
    async def _speak(self, text: str):  # [NRS-810]
        """Convert text to speech and play"""  # [NRS-810]
        if not text.strip():  # [NRS-810]
            return  # [NRS-807] Skip empty text
            
        try:  # [NRS-810]
            self.is_speaking = True  # [NRS-810] Mark speaking active
            logger.info(f"🗣️ Speaking: '{text}'")  # [NRS-807] Speech start log
            
            # Generate audio  # [NRS-810]
            audio_data = await self.tts_engine.text_to_speech(text)  # [NRS-810] Synthesize speech
            
            if audio_data.size > 0:  # [NRS-810]
                # Play audio  # [NRS-810]
                self.audio_pipeline.play_audio(audio_data)  # [NRS-810] Play through speakers
                
                # Wait for playback to complete  # [NRS-810]
                playback_duration = len(audio_data) / 16000  # [NRS-810] Calculate duration
                await asyncio.sleep(playback_duration + 0.5)  # [NRS-810] Wait for completion
            
        except Exception as e:  # [NRS-810]
            logger.error(f"Speech synthesis error: {e}")  # [NRS-807] TTS error log
        finally:  # [NRS-810]
            self.is_speaking = False  # [NRS-810] Clear speaking flag
    
    # Public API methods  # [NRS-810]
    def set_voice_style(self, voice_style: str):  # [NRS-810]
        """Change voice style"""  # [NRS-810]
        self.tts_engine.change_voice(voice_style)  # [NRS-810]
        logger.info(f"🎭 Voice changed to: {voice_style}")  # [NRS-810]
    
    async def process_text_input(self, text: str) -> str:  # [NRS-810]
        """Process text input directly (for testing/debugging)"""  # [NRS-810]
        self.conversation.add_message("user", text)  # [NRS-810]
        response = await self._generate_response(text)  # [NRS-810]
        if response:  # [NRS-810]
            self.conversation.add_message("assistant", response)  # [NRS-810]
        return response  # [NRS-810]
    
    def get_conversation_history(self) -> List[ConversationMessage]:  # [NRS-810]
        """Get conversation history"""  # [NRS-810]
        return self.conversation.messages.copy()  # [NRS-810]
    
    def clear_conversation(self):  # [NRS-810]
        """Clear conversation history"""  # [NRS-810]
        self.conversation.clear_history()  # [NRS-810]
    
    async def test_components(self):  # [NRS-810]
        """Test all components"""  # [NRS-810]
        logger.info("🧪 Testing Jarvis components...")  # [NRS-810]
        
        # Test TTS  # [NRS-810]
        test_audio = await self.tts_engine.text_to_speech("Component test successful.")  # [NRS-810]
        logger.info(f"✅ TTS: Generated {len(test_audio)/16000:.2f}s audio")  # [NRS-810]
        
        # Test browser controller  # [NRS-810]
        await self.browser_controller.initialize()  # [NRS-810]
        logger.info("✅ Browser controller initialized")  # [NRS-810]
        
        # List audio devices  # [NRS-810]
        self.audio_pipeline.list_audio_devices()  # [NRS-810]
        
        logger.info("🎉 All components tested successfully!")  # [NRS-810]
    
    def stop_conversation(self):  # [NRS-810]
        """Stop the conversation loop"""  # [NRS-810]
        self.should_stop = True  # [NRS-810]
        logger.info("🛑 Stopping conversation...")  # [NRS-810]
    
    async def cleanup(self):  # [NRS-810]
        """Clean up all resources"""  # [NRS-810]
        logger.info("🧹 Cleaning up Jarvis...")  # [NRS-810]
        
        self.should_stop = True  # [NRS-810]
        self.audio_pipeline.cleanup()  # [NRS-810]
        await self.browser_controller.cleanup()  # [NRS-810]
        
        logger.info("✅ Cleanup completed")  # [NRS-810]

# Test/Example usage  # [NRS-810]
if __name__ == "__main__":  # [NRS-810]
    import asyncio  # [NRS-810]
    from dotenv import load_dotenv  # [NRS-810]
    
    load_dotenv()  # [NRS-810]
    
    async def test_jarvis():  # [NRS-810]
        # Initialize Jarvis  # [NRS-810]
        jarvis = JarvisAssistant(  # [NRS-810]
            openai_api_key=os.getenv("OPENAI_API_KEY"),  # [NRS-810]
            elevenlabs_api_key=os.getenv("ELEVENLABS_API_KEY"),  # [NRS-810]
            voice_style="jarvis"  # [NRS-810]
        )  # [NRS-810]
        
        # Test components  # [NRS-810]
        await jarvis.test_components()  # [NRS-810]
        
        # Test text conversation  # [NRS-810]
        print("\n💬 Testing text conversation:")  # [NRS-810]
        response = await jarvis.process_text_input("Hello Jarvis, how are you today?")  # [NRS-810]
        print(f"Jarvis: {response}")  # [NRS-810]
        
        response = await jarvis.process_text_input("Can you navigate to Google?")  # [NRS-810]
        print(f"Jarvis: {response}")  # [NRS-810]
        
        print("\n✅ Jarvis test completed")  # [NRS-810]
        print("💡 Run with 'await jarvis.run_conversation_loop()' for voice chat")  # [NRS-810]
    
    # Run test  # [NRS-810]
    asyncio.run(test_jarvis())  # [NRS-810]
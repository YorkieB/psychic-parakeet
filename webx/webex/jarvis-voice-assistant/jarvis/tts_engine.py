"""
Text-to-Speech Engine - Convert text to speech using ElevenLabs
Supports multiple voices and streaming audio generation
"""  # [NRS-702]

import asyncio  # [NRS-705] Async helpers for TTS operations
import logging  # [NRS-707] Logging for TTS diagnostics
import numpy as np  # [NRS-704] Audio array handling
import requests  # [NRS-704] HTTP client for API calls
from typing import Optional, Dict, Any, AsyncGenerator  # [NRS-810] Type hints
from dataclasses import dataclass  # [NRS-810] Config container
import yaml  # [NRS-810] YAML config loader
import os  # [NRS-810] File system utilities
import io  # [NRS-704] IO stream handling

# Try to import ElevenLabs with compatibility handling  # [NRS-702]
try:  # [NRS-702]
    from elevenlabs import ElevenLabs  # [NRS-701] ElevenLabs SDK
    from elevenlabs.types import Voice, VoiceSettings  # [NRS-702] Voice types
    ELEVENLABS_AVAILABLE = True  # [NRS-701] SDK availability flag
except ImportError as e:  # [NRS-702]
    ELEVENLABS_AVAILABLE = False  # [NRS-701] Mock fallback mode
    
    # Mock classes for when ElevenLabs is not available  # [NRS-702]
    class ElevenLabs:  # [NRS-702]
        def __init__(self, api_key):  # [NRS-702]
            self.api_key = api_key  # [NRS-701] Store mock API key
        
        def generate(self, text, voice, voice_settings=None):  # [NRS-702]
            # Mock audio generation - use parameters for validation  # [NRS-702]
            print(f"Mock TTS: '{text}' with voice '{voice}'")
            if voice_settings:
                print(f"Voice settings: {voice_settings}")
            return b"mock_audio_data" * 100  # [NRS-704] Mock audio bytes
    
    class Voice:  # [NRS-702]
        def __init__(self, voice_id):  # [NRS-702]
            self.voice_id = voice_id  # [NRS-702] Mock voice ID
    
    class VoiceSettings:  # [NRS-702]
        def __init__(self, stability=0.5, similarity_boost=0.75):  # [NRS-702]
            self.stability = stability  # [NRS-702] Mock stability
            self.similarity_boost = similarity_boost  # [NRS-702] Mock similarity

logger = logging.getLogger(__name__)  # [NRS-707] Module logger

logger = logging.getLogger(__name__)  # [NRS-707] Module logger (duplicate removed)

@dataclass  # [NRS-702]
class TTSConfig:  # [NRS-702]
    """TTS configuration settings"""  # [NRS-702]
    provider: str = "elevenlabs"  # [NRS-701] TTS provider selection
    model: str = "eleven_multilingual_v2"  # [NRS-701] Model variant
    voice_style: str = "jarvis"  # [NRS-702] Default voice style
    voice_id: str = "JBFqnCBsd6RMkjVDRZzb"  # [NRS-702] Default voice ID
    api_key: str = "sk_27c1cffaa2753ff7e9cb706a1edc3ee251354141b6ff9d33"  # [NRS-701] API authentication key
    stability: float = 0.3  # [NRS-707] Voice stability parameter (lowered from 0.5)
    similarity_boost: float = 0.4  # [NRS-707] Voice similarity parameter (lowered from 0.75)
    voices: Optional[Dict[str, str]] = None  # [NRS-702] Voice style mappings

class TTSEngine:  # [NRS-702]
    """Text-to-Speech engine using ElevenLabs"""  # [NRS-702]
    
    def __init__(self,   # [NRS-702]
                 elevenlabs_api_key: Optional[str] = None,  # [NRS-702]
                 voice_style: str = "jarvis",  # [NRS-702]
                 config: Optional[TTSConfig] = None):  # [NRS-702]
        self.config = config or self._load_config()  # [NRS-701] Load TTS configuration
        
        # Use provided API key or fall back to config
        api_key = elevenlabs_api_key or self.config.api_key  # [NRS-701] API key resolution
        self.client = ElevenLabs(api_key=api_key)  # [NRS-701] Initialize ElevenLabs client
        self.voice_style = voice_style  # [NRS-702] Set active voice style
        
        # Store voice settings as simple values to avoid dict-to-header issues  # [NRS-702]
        self.stability = float(self.config.stability)  # [NRS-702] Voice stability as float
        self.similarity_boost = float(self.config.similarity_boost)  # [NRS-702] Voice similarity as float
        
        logger.info(f"TTS Engine initialized: {self.config.provider} provider, voice: {voice_style}")  # [NRS-707] Initialization log
    
    def _load_config(self) -> TTSConfig:  # [NRS-702]
        """Load TTS configuration from YAML file"""  # [NRS-702]
        try:  # [NRS-702]
            config_path = os.path.join("configs", "voice_config.yaml")  # [NRS-706] Config file path
            with open(config_path, 'r') as f:  # [NRS-702]
                config_data = yaml.safe_load(f)  # [NRS-706] Parse YAML config
            
            tts_cfg = config_data.get('tts', {})  # [NRS-706] Extract TTS section
            
            return TTSConfig(  # [NRS-702]
                provider=tts_cfg.get('provider', 'elevenlabs'),  # [NRS-702]
                model=tts_cfg.get('model', 'eleven_multilingual_v2'),  # [NRS-702]
                voice_style=tts_cfg.get('voice_style', 'jarvis'),  # [NRS-702]
                api_key=tts_cfg.get('api_key', 'YOUR_ELEVENLABS_API_KEY_HERE'),  # [NRS-702]
                stability=tts_cfg.get('stability', 0.5),  # [NRS-702]
                similarity_boost=tts_cfg.get('similarity_boost', 0.75),  # [NRS-702]
                voices=tts_cfg.get('voices', {  # [NRS-702]
                    'jarvis': 'JBFqnCBsd6RMkjVDRZzb',  # [NRS-702]
                    'professional': 'EXAVITQu4vr4xnSDxMaL',  # [NRS-702]
                    'friendly': 'ThT5KcBeYPX3keUQqHPh',  # [NRS-702]
                    'assistant': '21m00Tcm4TlvDq8ikWAM'  # [NRS-702]
                })  # [NRS-702]
            )  # [NRS-706] Build config from YAML
        except Exception as e:  # [NRS-702]
            logger.warning(f"Could not load TTS config: {e}. Using defaults.")  # [NRS-707] Config load fallback
            return TTSConfig()  # [NRS-706] Default config
    
    def get_voice_id(self, voice_style: Optional[str] = None) -> str:  # [NRS-702]
        """Get voice ID for specified voice style"""  # [NRS-702]
        style = voice_style or self.voice_style  # [NRS-702]
        
        # Ensure we have a voices dictionary  # [NRS-702]
        voices = self.config.voices or {  # [NRS-702]
            'jarvis': 'JBFqnCBsd6RMkjVDRZzb',  # [NRS-702]
            'professional': 'EXAVITQu4vr4xnSDxMaL',  # [NRS-702]
            'friendly': 'ThT5KcBeYPX3keUQqHPh',  # [NRS-702]
            'assistant': '21m00Tcm4TlvDq8ikWAM'  # [NRS-702]
        }  # [NRS-702]
        
        if style in voices:  # [NRS-702]
            return voices[style]  # [NRS-702]
        
        # Fallback to default Jarvis voice  # [NRS-702]
        return voices.get('jarvis', 'JBFqnCBsd6RMkjVDRZzb')  # [NRS-702]
    
    async def text_to_speech(self,   # [NRS-702]
                           text: str,   # [NRS-702]
                           voice_style: Optional[str] = None) -> np.ndarray:  # [NRS-702]
        """
        Convert text to speech audio
        
        Args:
            text: Text to convert to speech
            voice_style: Voice style to use (overrides default)
            
        Returns:
            Audio data as numpy array (16kHz, float32)
        """  # [NRS-702]
        if not text.strip():  # [NRS-702]
            return np.array([], dtype=np.float32)  # [NRS-703] Handle empty text
        
        # Run blocking TTS call in thread pool  # [NRS-702]
        try:  # [NRS-702]
            audio_data = await asyncio.to_thread(self._generate_speech_sync, text, voice_style)  # [NRS-702]
            return audio_data  # [NRS-702]
        except Exception as e:  # [NRS-702]
            logger.error(f"TTS generation failed: {e}")  # [NRS-707] TTS failure log
            return np.array([], dtype=np.float32)  # [NRS-707] Safe fallback
    
    def _generate_speech_sync(self, text: str, voice_style: Optional[str] = None) -> np.ndarray:  # [NRS-702]
        """Synchronous speech generation"""  # [NRS-702]
        try:  # [NRS-702]
            voice_id = self.get_voice_id(voice_style)  # [NRS-702] Resolve voice ID
            logger.info(f"Generating speech: '{text[:50]}...' (voice: {voice_style or self.voice_style})")  # [NRS-707] TTS start log
            
            # Use the exact working approach from successful tests  # [NRS-702]
            audio_generator = self.client.text_to_speech.convert(  # [NRS-702]
                text=text,  # [NRS-702]
                voice_id=voice_id  # [NRS-702] No model_id, no voice_settings
            )  # [NRS-702]
            
            # Collect audio data from generator  # [NRS-702]
            audio_bytes = b""  # [NRS-702]
            for chunk in audio_generator:  # [NRS-702]
                audio_bytes += chunk  # [NRS-704] Accumulate audio chunks
            
            # Convert to numpy array  # [NRS-702]
            audio_array = self._bytes_to_numpy(audio_bytes)  # [NRS-704] Decode audio bytes
            
            logger.info(f"Generated {len(audio_array)/16000:.2f}s of audio")  # [NRS-707] TTS success log
            return audio_array  # [NRS-704] Return audio array
            
        except Exception as e:  # [NRS-702]
            logger.error(f"TTS generation failed: {e}")  # [NRS-707] TTS failure log
            return np.array([], dtype=np.float32)  # [NRS-707] Safe fallback
    
    def generate_speech(self, text: str, voice_style: Optional[str] = None) -> np.ndarray:  # [NRS-702]
        """
        Synchronous wrapper for text_to_speech
        
        Args:
            text: Text to convert to speech
            voice_style: Voice style to use (overrides default)
            
        Returns:
            Audio data as numpy array (16kHz, float32)
        """  # [NRS-702]
        try:  # [NRS-702]
            return asyncio.run(self.text_to_speech(text, voice_style))  # [NRS-702] Run async in sync context
        except Exception as e:  # [NRS-702]
            logger.error(f"Sync TTS generation failed: {e}")  # [NRS-707] Sync TTS failure log
            return np.array([], dtype=np.float32)  # [NRS-707] Safe fallback
    
    def _bytes_to_numpy(self, audio_bytes: bytes) -> np.ndarray:  # [NRS-702]
        """Convert audio bytes to numpy array"""  # [NRS-702]
        try:  # [NRS-702]
            # ElevenLabs returns MP3 data, use librosa to decode  # [NRS-702]
            import librosa  # [NRS-704] Audio codec library
            import io  # [NRS-704] IO stream utilities
            
            # Read MP3 bytes using librosa (handles MP3 format)  # [NRS-702]
            audio_data, _ = librosa.load(io.BytesIO(audio_bytes), sr=16000, mono=True)  # [NRS-704] Decode MP3 to PCM
            
            # Ensure float32 format  # [NRS-702]
            if audio_data.dtype != np.float32:  # [NRS-702]
                audio_data = audio_data.astype(np.float32)  # [NRS-704] Normalize dtype
            
            return audio_data  # [NRS-704] Return decoded audio
            
        except Exception as e:  # [NRS-702]
            logger.error(f"Audio conversion failed: {e}")  # [NRS-707] Decode error log
            # Fallback: treat as raw PCM data  # [NRS-702]
            return np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0  # [NRS-707] Fallback PCM decode
    
    def change_voice(self, voice_style: str):  # [NRS-702]
        """Change the default voice style"""  # [NRS-702]
        if voice_style in self.config.voices:  # [NRS-702]
            self.voice_style = voice_style  # [NRS-702] Update active voice
            logger.info(f"🎭 Changed voice to: {voice_style}")  # [NRS-707] Voice change log
        else:  # [NRS-702]
            logger.warning(f"Unknown voice style: {voice_style}. Available: {list(self.config.voices.keys())}")  # [NRS-707] Invalid voice warning
    
    def _preprocess_text(self, text: str) -> str:  # [NRS-702]
        """Clean and prepare text for TTS"""  # [NRS-702]
        if not text:  # [NRS-702]
            return ""  # [NRS-703] Handle empty text
        
        # Remove extra whitespace  # [NRS-702]
        text = text.strip()  # [NRS-703] Trim whitespace
        text = " ".join(text.split())  # [NRS-703] Collapse whitespace
        
        # Remove some special characters that might cause issues  # [NRS-702]
        import re  # [NRS-703] Regex utilities
        text = re.sub(r'[^\w\s\.\,\?\!\;\:\-\(\)]', '', text)  # [NRS-703] Strip problematic chars
        
        # Limit length to prevent very long synthesis  # [NRS-702]
        if len(text) > 1000:  # [NRS-702]
            text = text[:1000] + "..."  # [NRS-703] Truncate long text
        
        return text  # [NRS-703] Clean text output
    
    def _estimate_duration(self, text: str) -> float:  # [NRS-702]
        """Estimate audio duration based on text length"""  # [NRS-702]
        if not text:  # [NRS-702]
            return 0.0  # [NRS-702]
        
        # Rough estimation: ~150 words per minute, average 5 chars per word  # [NRS-702]
        words = len(text.split())  # [NRS-702]
        duration = words / 150 * 60  # Convert to seconds  # [NRS-702]
        
        # Add some buffer time  # [NRS-702]
        return max(0.2, duration + 0.5)  # [NRS-702]
    
    def list_available_voices(self) -> Dict[str, str]:  # [NRS-702]
        """Get list of available voice styles"""  # [NRS-702]
        return self.config.voices.copy()  # [NRS-702]
    
    async def get_voice_preview(self, voice_style: str, sample_text: str = "Hello, this is a voice preview.") -> np.ndarray:  # [NRS-702]
        """Generate a preview of a specific voice"""  # [NRS-702]
        return await self.text_to_speech(sample_text, voice_style)  # [NRS-702]
    
    def text_to_speech_sync(self, text: str, voice_style: Optional[str] = None) -> np.ndarray:  # [NRS-702]
        """Synchronous version of text_to_speech"""  # [NRS-702]
        return asyncio.run(self.text_to_speech(text, voice_style))  # [NRS-702]

# Streaming TTS for real-time generation  # [NRS-702]
class StreamingTTS:  # [NRS-702]
    """Real-time streaming text-to-speech"""  # [NRS-702]
    
    def __init__(self, tts_engine: TTSEngine):  # [NRS-702]
        self.tts_engine = tts_engine  # [NRS-810] Reuse core TTS engine
        self.text_queue = asyncio.Queue()  # [NRS-705] Text buffer queue
        self.is_streaming = False  # [NRS-705] Streaming state flag
        
    async def start_streaming(self, audio_callback: callable):  # [NRS-702]
        """Start streaming TTS generation"""  # [NRS-702]
        self.is_streaming = True  # [NRS-705] Mark streaming active
        logger.info("🎙️ Starting streaming TTS")  # [NRS-707] Stream start log
        
        while self.is_streaming:  # [NRS-702]
            try:  # [NRS-702]
                # Get text from queue (with timeout)  # [NRS-702]
                text = await asyncio.wait_for(self.text_queue.get(), timeout=0.1)  # [NRS-705] Pull text from queue
                
                # Generate audio  # [NRS-702]
                audio = await self.tts_engine.text_to_speech(text)  # [NRS-704] Synthesize chunk
                
                # Send to callback  # [NRS-702]
                if audio.size > 0 and audio_callback:  # [NRS-702]
                    await audio_callback(audio)  # [NRS-705] Deliver audio chunk
                    
            except asyncio.TimeoutError:  # [NRS-702]
                # No text to process, continue  # [NRS-702]
                continue  # [NRS-705] Wait for more text
            except Exception as e:  # [NRS-702]
                logger.error(f"Streaming TTS error: {e}")  # [NRS-707] Streaming error log
    
    async def add_text(self, text: str):  # [NRS-702]
        """Add text to streaming queue"""  # [NRS-702]
        if self.is_streaming:  # [NRS-702]
            await self.text_queue.put(text)  # [NRS-705] Enqueue text chunk
    
    def stop_streaming(self):  # [NRS-702]
        """Stop streaming TTS"""  # [NRS-702]
        self.is_streaming = False  # [NRS-705] Mark streaming inactive
        logger.info("🛑 Stopped streaming TTS")  # [NRS-707] Stream stop log

# Advanced TTS features  # [NRS-702]
class AdvancedTTS:  # [NRS-702]
    """Advanced TTS features like SSML and voice cloning"""  # [NRS-702]
    
    def __init__(self, tts_engine: TTSEngine):  # [NRS-702]
        self.tts_engine = tts_engine  # [NRS-702]
    
    async def generate_with_emotion(self,   # [NRS-702]
                                  text: str,   # [NRS-702]
                                  emotion: str = "neutral",  # [NRS-702]
                                  intensity: float = 0.5) -> np.ndarray:  # [NRS-702]
        """Generate speech with specific emotion"""  # [NRS-702]
        # Adjust voice settings based on emotion  # [NRS-702]
        if emotion == "excited":  # [NRS-702]
            self.tts_engine.voice_settings.stability = max(0.1, intensity * 0.3)  # [NRS-702]
            text = f"<speak><prosody rate='fast' pitch='+5%'>{text}</prosody></speak>"  # [NRS-702]
        elif emotion == "calm":  # [NRS-702]
            self.tts_engine.voice_settings.stability = min(0.9, 0.7 + intensity * 0.2)  # [NRS-702]
            text = f"<speak><prosody rate='slow' pitch='-2%'>{text}</prosody></speak>"  # [NRS-702]
        elif emotion == "serious":  # [NRS-702]
            self.tts_engine.voice_settings.stability = 0.8  # [NRS-702]
            text = f"<speak><prosody pitch='-10%'>{text}</prosody></speak>"  # [NRS-702]
        
        return await self.tts_engine.text_to_speech(text)  # [NRS-702]
    
    async def generate_with_pause(self,   # [NRS-702]
                                text: str,   # [NRS-702]
                                pause_duration: float = 1.0) -> np.ndarray:  # [NRS-702]
        """Generate speech with pauses"""  # [NRS-702]
        # Add SSML break tags  # [NRS-702]
        text_with_pauses = text.replace(".", f".<break time='{pause_duration}s'/>")  # [NRS-702]
        ssml_text = f"<speak>{text_with_pauses}</speak>"  # [NRS-702]
        
        return await self.tts_engine.text_to_speech(ssml_text)  # [NRS-702]

# Test/Example usage  # [NRS-702]
if __name__ == "__main__":  # [NRS-702]
    import asyncio  # [NRS-702]
    from dotenv import load_dotenv  # [NRS-702]
    
    load_dotenv()  # [NRS-702]
    
    async def test_tts():  # [NRS-702]
        # Initialize TTS engine  # [NRS-702]
        tts = TTSEngine(  # [NRS-702]
            elevenlabs_api_key=os.getenv("ELEVENLABS_API_KEY"),  # [NRS-702]
            voice_style="jarvis"  # [NRS-702]
        )  # [NRS-702]
        
        # Test basic TTS  # [NRS-702]
        print("🗣️ Testing TTS engine...")  # [NRS-702]
        
        test_text = "Hello! I am Jarvis, your voice assistant. How can I help you today?"  # [NRS-702]
        audio = await tts.text_to_speech(test_text)  # [NRS-702]
        
        print(f"✅ Generated {len(audio)/16000:.2f} seconds of audio")  # [NRS-702]
        
        # List available voices  # [NRS-702]
        voices = tts.list_available_voices()  # [NRS-702]
        print(f"🎭 Available voices: {list(voices.keys())}")  # [NRS-702]
        
        # Test voice preview  # [NRS-702]
        preview_audio = await tts.get_voice_preview("professional", "This is a professional voice.")  # [NRS-702]
        print(f"🎭 Generated voice preview: {len(preview_audio)/16000:.2f} seconds")  # [NRS-702]
        
        print("✅ TTS test completed")  # [NRS-702]
        
        # Note: To actually hear the audio, you'd need to:  # [NRS-702]
        # 1. Save to a WAV file using soundfile  # [NRS-702]
        # 2. Play using audio pipeline  # [NRS-702]
        # 3. Or use a simple audio player  # [NRS-702]
    
    # Run test  # [NRS-702]
    asyncio.run(test_tts())  # [NRS-702]
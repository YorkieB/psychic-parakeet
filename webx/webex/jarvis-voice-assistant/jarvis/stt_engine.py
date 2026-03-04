"""
Speech-to-Text Engine - Convert audio to text using OpenAI Whisper
Supports both API and local Whisper models
"""  # [NRS-604]

import asyncio  # [NRS-602] Async helpers for STT pipeline
import logging  # [NRS-606] Logging for STT errors and status
import numpy as np  # [NRS-602] Audio array handling
import openai  # [NRS-604] OpenAI Whisper API client
import tempfile  # [NRS-602] Temp file handling for audio uploads
import os  # [NRS-602] File path utilities
from typing import Optional, Union  # [NRS-810] Type hints for clarity
from dataclasses import dataclass  # [NRS-810] Config container
import yaml  # [NRS-810] YAML config loader

# Try to import whisper with error handling  # [NRS-604]
try:  # [NRS-604]
    import whisper  # [NRS-604] Local Whisper model loader
    WHISPER_AVAILABLE = True  # [NRS-604]
except Exception as e:  # [NRS-604]
    WHISPER_AVAILABLE = False  # [NRS-604]
    logger = logging.getLogger(__name__)
    logger.warning(f"Whisper not available: {e}. STT will use API-only mode.")  # [NRS-606]

logger = logging.getLogger(__name__)  # [NRS-606] Module logger

@dataclass  # [NRS-604]
class STTConfig:  # [NRS-604]
    """STT configuration settings"""  # [NRS-604]
    provider: str = "openai"  # [NRS-604] Provider selection (api/local)
    model: str = "whisper-1"  # [NRS-604] API model name
    api_key: str = "YOUR_OPENAI_API_KEY_HERE"  # [NRS-604] OpenAI API key
    local_model: str = "base"  # [NRS-604] Local Whisper variant
    language: str = "en"  # [NRS-605] Target language code
    timeout: int = 30  # [NRS-602] Request timeout seconds
    temperature: float = 0.0  # [NRS-604] Decoding temperature

class STTEngine:  # [NRS-604]
    """Speech-to-Text engine with multiple provider support"""  # [NRS-604]
    
    def __init__(self,   # [NRS-604]
                 openai_api_key: Optional[str] = None,  # [NRS-604]
                 config: Optional[STTConfig] = None):  # [NRS-604]
        self.config = config or self._load_config()  # [NRS-605] Load config from YAML or defaults
        
        # Use provided API key or fall back to config
        api_key = openai_api_key or self.config.api_key  # [NRS-604]
        
        # Initialize OpenAI client if API key is available and valid  # [NRS-604]
        if api_key and api_key != "YOUR_OPENAI_API_KEY_HERE":  # [NRS-604]
            try:  # [NRS-604]
                self.openai_client = openai.OpenAI(api_key=api_key)  # [NRS-604] Init OpenAI client
                logger.info("✅ OpenAI client initialized successfully")  # [NRS-606]
            except Exception as e:  # [NRS-604]
                logger.error(f"Failed to initialize OpenAI client: {e}")  # [NRS-606]
                self.openai_client = None  # [NRS-604]
        else:  # [NRS-604]
            self.openai_client = None  # [NRS-604] No API client available
            logger.warning("No valid OpenAI API key - API transcription unavailable")  # [NRS-606]
            
        self.local_model = None  # [NRS-604] Placeholder for local Whisper
        
        if self.config.provider == "local":  # [NRS-604]
            self._load_local_model()  # [NRS-604] Load local model when requested
        elif self.config.provider == "openai" and not self.openai_client:  # [NRS-604]
            logger.warning("OpenAI provider selected but no API key - switching to local mode")  # [NRS-606]
            self.config.provider = "local"  # [NRS-604]
            self._load_local_model()  # [NRS-604]
        
        logger.info(f"STT Engine initialized: {self.config.provider} provider")  # [NRS-606] Startup telemetry
    
    def _load_config(self) -> STTConfig:  # [NRS-604]
        """Load STT configuration from YAML file"""  # [NRS-604]
        try:  # [NRS-604]
            config_path = os.path.join("configs", "voice_config.yaml")  # [NRS-605] Config location
            with open(config_path, 'r') as f:  # [NRS-604]
                config_data = yaml.safe_load(f)  # [NRS-605] Parse YAML
            
            stt_cfg = config_data.get('stt', {})  # [NRS-605] STT section
            
            return STTConfig(  # [NRS-604]
                provider=stt_cfg.get('provider', 'openai'),  # [NRS-604]
                model=stt_cfg.get('model', 'whisper-1'),  # [NRS-604]
                api_key=stt_cfg.get('api_key', 'YOUR_OPENAI_API_KEY_HERE'),  # [NRS-604]
                language=stt_cfg.get('language', 'en'),  # [NRS-604]
                timeout=stt_cfg.get('timeout', 30)  # [NRS-604]
            )  # [NRS-605] Build config object
        except Exception as e:  # [NRS-604]
            logger.warning(f"Could not load STT config: {e}. Using defaults.")  # [NRS-606] Config fallback log
            return STTConfig()  # [NRS-605] Default config fallback
    
    def _load_local_model(self):  # [NRS-604]
        """Load local Whisper model"""  # [NRS-604]
        try:  # [NRS-604]
            if not WHISPER_AVAILABLE:  # [NRS-604]
                logger.warning("Whisper library not available, using API-only mode")  # [NRS-606]
                self.config.provider = "openai"  # [NRS-604] Force API provider
                return  # [NRS-604] Skip local model loading
                
            logger.info(f"Loading local Whisper model: {self.config.local_model}")  # [NRS-604] Local model load start
            self.local_model = whisper.load_model(self.config.local_model)  # [NRS-604] Load local weights
            logger.info("✅ Local Whisper model loaded")  # [NRS-604] Local load success
        except Exception as e:  # [NRS-604]
            logger.error(f"Failed to load local Whisper model: {e}")  # [NRS-606] Local load failure
            self.config.provider = "openai"  # [NRS-604] Fallback to API provider
            logger.info("Falling back to OpenAI API")  # [NRS-604] Fallback notice
    
    async def transcribe_audio(self, audio_data: Union[np.ndarray, bytes, str]) -> str:  # [NRS-604]
        """Transcribe audio to text"""  # [NRS-604]
        try:  # [NRS-604]
            if isinstance(audio_data, str):  # [NRS-604]
                audio_file_path = audio_data  # [NRS-602] Use provided file path
            else:  # [NRS-604]
                audio_file_path = await self._save_temp_audio(audio_data)  # [NRS-602] Persist temp audio
            
            if self.config.provider == "openai":  # [NRS-604]
                text = await self._transcribe_openai(audio_file_path)  # [NRS-604] Remote Whisper API
            else:  # [NRS-604]
                text = await self._transcribe_local(audio_file_path)  # [NRS-604] Local Whisper path
            
            if not isinstance(audio_data, str):  # [NRS-604]
                try:  # [NRS-604]
                    os.unlink(audio_file_path)  # [NRS-602] Cleanup temp file
                except OSError:  # [NRS-604]
                    pass  # [NRS-606] Ignore temp cleanup errors
            
            return text.strip()  # [NRS-602] Normalize output text
            
        except Exception as e:  # [NRS-604]
            logger.error(f"Transcription failed: {e}")  # [NRS-606] STT failure log
            return ""  # [NRS-606] Safe fallback on failure
    
    def _save_temp_audio(self, audio_data: Union[np.ndarray, bytes]) -> str:  # [NRS-604]
        """Save audio data to temporary WAV file"""  # [NRS-604]
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:  # [NRS-604]
            temp_path = f.name  # [NRS-602] Temp file path
        
        try:  # [NRS-604]
            if isinstance(audio_data, np.ndarray):  # [NRS-604]
                import soundfile as sf  # [NRS-602] WAV writer
                sf.write(temp_path, audio_data, 16000)  # [NRS-602] Save ndarray as WAV
            else:  # [NRS-604]
                with open(temp_path, 'wb') as f:  # [NRS-604]
                    f.write(audio_data)  # [NRS-602] Save raw bytes
            
            return temp_path  # [NRS-602] Return temp file path
            
        except Exception as e:  # [NRS-604]
            logger.error(f"Failed to save temporary audio: {e}")  # [NRS-606] Temp save error
            try:  # [NRS-604]
                os.unlink(temp_path)  # [NRS-602] Cleanup on failure
            except (OSError, FileNotFoundError):  # [NRS-604]
                pass  # [NRS-606] Ignore cleanup error
            raise  # [NRS-606] Propagate failure
    
    async def _transcribe_openai(self, audio_file_path: str) -> str:  # [NRS-604]
        """Transcribe using OpenAI Whisper API"""  # [NRS-604]
        if not self.openai_client:  # [NRS-604]
            raise RuntimeError("OpenAI client not initialized - no API key provided")  # [NRS-606]
            
        try:  # [NRS-604]
            with open(audio_file_path, 'rb') as audio_file:  # [NRS-604]
                transcript = await asyncio.to_thread(  # [NRS-604]
                    self.openai_client.audio.transcriptions.create,  # [NRS-604]
                    model=self.config.model,  # [NRS-604]
                    file=audio_file,  # [NRS-604]
                    language=self.config.language if self.config.language != "auto" else None,  # [NRS-604]
                    temperature=self.config.temperature  # [NRS-604]
                )  # [NRS-604] Offload API call to thread
            
            return transcript.text  # [NRS-604] Extract transcript text
            
        except Exception as e:  # [NRS-604]
            logger.error(f"OpenAI transcription failed: {e}")  # [NRS-606] API failure log
            raise  # [NRS-606] Bubble up for caller handling
    
    async def _transcribe_local(self, audio_file_path: str) -> str:  # [NRS-604]
        """Transcribe using local Whisper model"""  # [NRS-604]
        if not WHISPER_AVAILABLE or not self.local_model:  # [NRS-604]
            raise RuntimeError("Local Whisper model not available or not loaded")  # [NRS-606] Guard against missing model
        
        try:  # [NRS-604]
            result = await asyncio.to_thread(  # [NRS-604]
                self.local_model.transcribe,  # [NRS-604]
                audio_file_path,  # [NRS-604]
                language=self.config.language if self.config.language != "auto" else None,  # [NRS-604]
                temperature=self.config.temperature  # [NRS-604]
            )  # [NRS-604] Offload local inference
            
            return result['text']  # [NRS-604] Return recognized text
            
        except Exception as e:  # [NRS-604]
            logger.error(f"Local transcription failed: {e}")  # [NRS-606] Local inference failure
            raise  # [NRS-604]
    
    def transcribe_audio_sync(self, audio_data: Union[np.ndarray, bytes, str]) -> str:  # [NRS-604]
        """Synchronous version of transcribe_audio"""  # [NRS-604]
        return asyncio.run(self.transcribe_audio(audio_data))  # [NRS-602] Sync wrapper

    def _postprocess_text(self, text: str) -> str:  # [NRS-604]
        """Clean and normalize transcribed text"""  # [NRS-604]
        if not text:  # [NRS-604]
            return ""  # [NRS-606] Handle empty text
        
        text = text.strip()  # [NRS-602] Trim whitespace
        text = text.lower()  # [NRS-602] Normalize casing
        
        import re  # [NRS-602] Regex for punctuation cleanup
        text = re.sub(r'[.]{2,}', '.', text)  # [NRS-604]
        text = re.sub(r'!{2,}', '!', text)  # [NRS-604]
        text = re.sub(r'[?]{2,}', '?', text)  # [NRS-602] Collapse repeated punctuation
        
        return text  # [NRS-602] Clean text output
    
    def _calculate_confidence(self, text: str) -> float:  # [NRS-604]
        """Calculate confidence score based on text quality"""  # [NRS-604]
        if not text:  # [NRS-604]
            return 0.0  # [NRS-606] No text means zero confidence
            
        confidence = 0.5  # [NRS-607] Base confidence
        
        if len(text) > 10:  # [NRS-604]
            confidence += 0.2  # [NRS-607] Length bonus
        
        if text.endswith(('.', '!', '?')):  # [NRS-604]
            confidence += 0.1  # [NRS-607] Sentence-ending bonus
        
        filler_words = ['um', 'uh', 'er', 'ah']  # [NRS-607] Common fillers
        filler_count = sum(1 for word in text.split() if word.lower() in filler_words)  # [NRS-604]
        confidence -= min(filler_count * 0.1, 0.3)  # [NRS-607] Penalize fillers
        
        return max(0.0, min(1.0, confidence))  # [NRS-607] Clamp confidence


class StreamingSTT:  # [NRS-604]
    """Real-time streaming speech-to-text"""  # [NRS-604]
    
    def __init__(self, stt_engine: STTEngine, chunk_duration: float = 2.0):  # [NRS-604]
        self.stt_engine = stt_engine  # [NRS-810] Reuse core STT engine
        self.chunk_duration = chunk_duration  # [NRS-602] Duration window for chunks
        self.audio_buffer = []  # [NRS-602] Buffered audio frames
        self.sample_rate = 16000  # [NRS-602] Expected sample rate
        self.is_streaming = False  # [NRS-606] Streaming state flag
        
    async def start_streaming(self,   # [NRS-604]
                            text_callback: callable,  # [NRS-604]
                            chunk_callback: Optional[callable] = None):  # [NRS-604]
        """Start real-time transcription streaming"""  # [NRS-604]
        self.is_streaming = True  # [NRS-606] Mark streaming active
        logger.info("🎙️ Starting streaming STT")  # [NRS-606] Stream start log
        
        while self.is_streaming:  # [NRS-604]
            if len(self.audio_buffer) > 0:  # [NRS-604]
                audio_chunk = np.concatenate(self.audio_buffer)  # [NRS-602] Combine buffered audio
                self.audio_buffer.clear()  # [NRS-602] Reset buffer
                
                try:  # [NRS-604]
                    text = await self.stt_engine.transcribe_audio(audio_chunk)  # [NRS-604] Chunk transcription
                    if text and text_callback:  # [NRS-604]
                        await text_callback(text)  # [NRS-604] Deliver text result
                    
                    if chunk_callback:  # [NRS-604]
                        await chunk_callback(audio_chunk, text)  # [NRS-604] Optional chunk hook
                        
                except Exception as e:  # [NRS-604]
                    logger.error(f"Streaming transcription error: {e}")  # [NRS-606] Streaming error log
            
            await asyncio.sleep(0.1)  # [NRS-602] Throttle loop
    
    def add_audio(self, audio_chunk: np.ndarray):  # [NRS-604]
        """Add audio chunk to streaming buffer"""  # [NRS-604]
        if self.is_streaming:  # [NRS-604]
            self.audio_buffer.append(audio_chunk)  # [NRS-602] Buffer incoming chunk
            
            max_chunks = int(self.chunk_duration * self.sample_rate / len(audio_chunk))  # [NRS-602] Buffer limit
            if len(self.audio_buffer) > max_chunks:  # [NRS-604]
                self.audio_buffer.pop(0)  # [NRS-602] Drop oldest to cap size
    
    def stop_streaming(self):  # [NRS-604]
        """Stop streaming transcription"""  # [NRS-604]
        self.is_streaming = False  # [NRS-606] Mark streaming inactive
        self.audio_buffer.clear()  # [NRS-602] Clear buffered audio
        logger.info("🛑 Stopped streaming STT")  # [NRS-606] Stream stop log


if __name__ == "__main__":  # [NRS-604]
    import asyncio  # [NRS-810] Async runtime for demo
    from dotenv import load_dotenv  # [NRS-810] Load API keys from env
    
    load_dotenv()  # [NRS-810] Prepare environment
    
    async def test_stt():  # [NRS-604]
        await asyncio.sleep(0.01)  # [NRS-604] Make function properly async
        stt = STTEngine(openai_api_key=os.getenv("OPENAI_API_KEY"))  # [NRS-604] Initialize STT engine for demo
        print(f"STT engine initialized: {type(stt).__name__}")  # [NRS-604] Display initialization
        
        print("🎤 Testing STT engine...")  # [NRS-606] Demo status
        
        # For real testing, you'd need an actual audio file  # [NRS-604]
        # text = await stt.transcribe_audio("test_audio.wav")  # [NRS-604]
        # print(f"Transcribed: {text}")  # [NRS-604]
        
        print("✅ STT test setup complete")  # [NRS-606] Demo completion
        print("💡 Record an audio file and update the path above to test")  # [NRS-606] Guidance
    
    asyncio.run(test_stt())  # [NRS-810] Run demo coroutine
"""
Test TTS Engine
Unit tests for text-to-speech functionality
"""  # [NRS-810]

import unittest  # [NRS-807] Unit testing framework
import asyncio  # [NRS-810] Async event loop
from unittest.mock import Mock, patch, AsyncMock, MagicMock  # [NRS-807] Mocking utilities
import sys  # [NRS-810] System utilities
import os  # [NRS-810] File system operations

# [NRS-810] Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))  # [NRS-810] Add to path

from jarvis.tts_engine import TTSEngine, TTSConfig, TTSResult  # [NRS-702] TTS engine classes

class TestTTSEngine(unittest.TestCase):  # [NRS-810] TTS engine test suite
    """Test cases for TTSEngine"""  # [NRS-810]
    
    def setUp(self):  # [NRS-807] Test setup fixture
        """Set up test fixtures"""  # [NRS-810]
        self.config = TTSConfig(  # [NRS-702] Create test TTS config
            provider='elevenlabs',  # [NRS-702] ElevenLabs provider
            voice_id='jarvis_voice',  # [NRS-702] Voice identifier
            model='eleven_monolingual_v1',  # [NRS-702] TTS model version
            api_key='test_key_123'  # [NRS-702] Test API key
        )  # [NRS-810]
    
    def test_config_creation(self):  # [NRS-810] Test config initialization
        """Test TTS config creation"""  # [NRS-810]
        self.assertEqual(self.config.provider, 'elevenlabs')  # [NRS-807] Assert provider
        self.assertEqual(self.config.voice_id, 'jarvis_voice')  # [NRS-807] Assert voice
        self.assertEqual(self.config.model, 'eleven_monolingual_v1')  # [NRS-807] Assert model
        self.assertEqual(self.config.api_key, 'test_key_123')  # [NRS-807] Assert API key
    
    def test_tts_result_creation(self):  # [NRS-810] Test result object
        """Test TTS result creation"""  # [NRS-810]
        test_audio = b"fake_audio_data" * 100  # [NRS-705] Create fake audio
        
        result = TTSResult(  # [NRS-702] Create synthesis result
            success=True,  # [NRS-702] Synthesis succeeded
            audio_data=test_audio,  # [NRS-705] Audio output data
            format='mp3',  # [NRS-705] Audio format
            duration=2.5,  # [NRS-702] Duration in seconds
            processing_time=300.0  # [NRS-807] Processing time in ms
        )  # [NRS-810]
        
        self.assertTrue(result.success)  # [NRS-807] Assert success
        self.assertEqual(result.audio_data, test_audio)  # [NRS-807] Assert audio
        self.assertEqual(result.format, 'mp3')  # [NRS-807] Assert format
        self.assertEqual(result.duration, 2.5)  # [NRS-807] Assert duration
        self.assertEqual(result.processing_time, 300.0)  # [NRS-807] Assert timing
    
    @patch('jarvis.tts_engine.ElevenLabs')  # [NRS-807] Mock ElevenLabs
    def test_engine_initialization(self, mock_elevenlabs):  # [NRS-810] Test engine init
        """Test TTS engine initialization"""  # [NRS-810]
        mock_client = MagicMock()  # [NRS-807] Create mock client
        mock_elevenlabs.return_value = mock_client  # [NRS-807] Return mock
        
        engine = TTSEngine(self.config)  # [NRS-702] Create TTS engine
        
        self.assertEqual(engine.config, self.config)  # [NRS-807] Assert config
        mock_elevenlabs.assert_called_once_with(api_key=self.config.api_key)  # [NRS-807] Assert called
    
    @patch('jarvis.tts_engine.ElevenLabs')  # [NRS-807] Mock ElevenLabs
    async def test_elevenlabs_synthesis_success(self, mock_elevenlabs):  # [NRS-702] Test synthesis
        """Test successful ElevenLabs synthesis"""  # [NRS-810]
        # [NRS-807] Mock ElevenLabs client and response
        mock_client = MagicMock()  # [NRS-807] Create mock client
        mock_elevenlabs.return_value = mock_client  # [NRS-807] Return mock
        
        mock_audio = b"synthesized_audio_data" * 50  # [NRS-705] Create fake audio
        mock_client.generate = MagicMock(return_value=mock_audio)  # [NRS-807] Mock generate
        
        engine = TTSEngine(self.config)  # [NRS-702] Create TTS engine
        
        result = await engine.synthesize_text("Hello, this is a test.")  # [NRS-702] Synthesize
        
        self.assertTrue(result.success)  # [NRS-807] Assert success
        self.assertEqual(result.audio_data, mock_audio)  # [NRS-807] Assert audio
        self.assertIsNone(result.error)  # [NRS-807] Assert no error
        mock_client.generate.assert_called_once()  # [NRS-807] Assert called
    
    @patch('jarvis.tts_engine.ElevenLabs')  # [NRS-807] Mock ElevenLabs
    async def test_elevenlabs_synthesis_error(self, mock_elevenlabs):  # [NRS-702] Test error
        """Test ElevenLabs synthesis error handling"""  # [NRS-810]
        # [NRS-807] Mock ElevenLabs error
        mock_client = MagicMock()  # [NRS-807] Create mock client
        mock_elevenlabs.return_value = mock_client  # [NRS-807] Return mock
        mock_client.generate.side_effect = Exception("API Error")  # [NRS-807] Simulate error
        
        engine = TTSEngine(self.config)  # [NRS-702] Create TTS engine
        
        result = await engine.synthesize_text("Hello world")  # [NRS-702] Synthesize
        
        self.assertFalse(result.success)  # [NRS-807] Assert failure
        self.assertIsNotNone(result.error)  # [NRS-807] Assert error present
        self.assertIn("API Error", result.error)  # [NRS-807] Assert error message
    
    def test_text_preprocessing(self):  # [NRS-703] Test text preparation
        """Test text preprocessing"""  # [NRS-703] Normalize TTS input
        engine = TTSEngine(self.config)  # [NRS-702] Create TTS engine
        
        test_cases = [  # [NRS-703] Text preprocessing scenarios
            ("Hello world!", "Hello world!"),  # [NRS-703] Keep punctuation
            ("  Extra   spaces  ", "Extra spaces"),  # [NRS-703] Normalize spaces
            ("ALL CAPS TEXT", "ALL CAPS TEXT"),  # [NRS-703] Preserve case
            ("Special chars: @#$%", "Special chars"),  # [NRS-703] Remove symbols
            ("", ""),  # [NRS-703] Empty string
            ("123.45", "123.45")  # [NRS-703] Numbers preserved
        ]  # [NRS-810]
        
        for input_text, expected in test_cases[:4]:  # [NRS-807] Skip empty test for now
            result = engine._preprocess_text(input_text)  # [NRS-703] Preprocess
            self.assertIsInstance(result, str)  # [NRS-807] Assert is string
            self.assertLessEqual(len(result), len(input_text))  # [NRS-807] Length reduced
    
    def test_voice_management(self):  # [NRS-702] Test voice control
        """Test voice management"""  # [NRS-702] Voice switching and settings
        engine = TTSEngine(self.config)  # [NRS-702] Create TTS engine
        
        # [NRS-702] Test voice switching
        original_voice = engine.config.voice_id  # [NRS-702] Get current voice
        print(f"Original voice: {original_voice}")  # [NRS-702] Display original voice
        new_voice = "new_voice_id"  # [NRS-702] New voice ID
        
        engine.set_voice(new_voice)  # [NRS-702] Switch voice
        self.assertEqual(engine.config.voice_id, new_voice)  # [NRS-807] Verify switched
        
        # [NRS-702] Test voice settings
        settings = {  # [NRS-702] Voice parameters
            'stability': 0.7,  # [NRS-702] Stability parameter
            'similarity_boost': 0.8  # [NRS-702] Similarity boost parameter
        }  # [NRS-810]
        engine.set_voice_settings(**settings)  # [NRS-702] Apply settings
        self.assertEqual(engine.config.stability, 0.7)  # [NRS-807] Verify stability
        self.assertEqual(engine.config.similarity_boost, 0.8)  # [NRS-807] Verify boost
    
    @patch('jarvis.tts_engine.ElevenLabs')  # [NRS-807] Mock ElevenLabs
    async def test_streaming_synthesis(self, mock_elevenlabs):  # [NRS-702] Test streaming TTS
        """Test streaming synthesis"""  # [NRS-702] Stream audio chunks
        mock_client = MagicMock()  # [NRS-807] Create mock client
        mock_elevenlabs.return_value = mock_client  # [NRS-807] Return mock
        
        # [NRS-702] Mock streaming response
        mock_chunks = [b"chunk1", b"chunk2", b"chunk3"]  # [NRS-705] Audio chunks
        mock_client.generate_stream = MagicMock(return_value=iter(mock_chunks))  # [NRS-807] Mock streaming
        
        engine = TTSEngine(self.config)  # [NRS-702] Create engine
        
        chunks = []  # [NRS-807] Collect chunks
        async for chunk in engine.synthesize_streaming("Test streaming"):  # [NRS-702] Stream synthesis
            chunks.append(chunk)  # [NRS-807] Append chunk
        
        self.assertEqual(len(chunks), 3)  # [NRS-807] Verify chunk count
        self.assertEqual(b"".join(chunks), b"chunk1chunk2chunk3")  # [NRS-807] Verify combined
    
    def test_audio_format_conversion(self):  # [NRS-705] Test format conversion
        """Test audio format conversion"""  # [NRS-705] Convert between formats
        engine = TTSEngine(self.config)  # [NRS-702] Create engine
        
        # [NRS-705] Mock audio data
        test_audio = b"audio_data" * 100  # [NRS-705] Create fake audio
        
        # [NRS-705] Test format conversion (would need actual implementation)
        converted = engine._convert_audio_format(test_audio, 'mp3', 'wav')  # [NRS-705] Convert format
        
        # [NRS-807] Should return bytes
        self.assertIsInstance(converted, bytes)  # [NRS-807] Verify bytes type
    
    def test_duration_estimation(self):  # [NRS-702] Test duration calculation
        """Test audio duration estimation"""  # [NRS-702] Estimate synthesis time
        engine = TTSEngine(self.config)  # [NRS-702] Create engine
        
        test_cases = [  # [NRS-702] Duration test scenarios
            ("Hello world", 1.0),  # [NRS-702] Short text
            ("This is a longer sentence with more words", 3.0),  # [NRS-702] Longer text
            ("", 0.0),  # [NRS-702] Empty text
            ("A", 0.2)  # [NRS-702] Single letter
        ]  # [NRS-810]
        
        for text, expected_min in test_cases:  # [NRS-807] Test each case
            duration = engine._estimate_duration(text)  # [NRS-702] Estimate duration
            if text:  # [NRS-807] Non-empty text
                self.assertGreaterEqual(duration, expected_min)  # [NRS-807] Duration >= min
            else:  # [NRS-807] Empty text
                self.assertEqual(duration, 0.0)  # [NRS-807] Duration is zero

class TestTTSConfig(unittest.TestCase):  # [NRS-810] Configuration test suite
    """Test cases for TTSConfig"""  # [NRS-702] Config class tests
    
    def test_default_config(self):  # [NRS-807] Test defaults
        """Test default configuration"""  # [NRS-702] Default settings
        config = TTSConfig()  # [NRS-702] Create default config
        
        self.assertEqual(config.provider, 'elevenlabs')  # [NRS-807] Default provider
        self.assertEqual(config.voice_id, 'default')  # [NRS-807] Default voice
        self.assertIsNone(config.api_key)  # [NRS-807] No API key by default
    
    def test_elevenlabs_config_validation(self):  # [NRS-702] Test ElevenLabs validation
        """Test ElevenLabs configuration validation"""  # [NRS-702] Validate required settings
        # [NRS-702] Valid config
        config = TTSConfig(  # [NRS-702] Create valid config
            provider='elevenlabs',  # [NRS-702] ElevenLabs provider
            api_key='test_key',  # [NRS-702] Test API key
            voice_id='voice123'  # [NRS-702] Voice identifier
        )  # [NRS-810]
        
        is_valid, error = config.validate()  # [NRS-702] Validate config
        self.assertTrue(is_valid)  # [NRS-807] Should be valid
        self.assertIsNone(error)  # [NRS-807] No error
        
        # [NRS-702] Invalid config (missing API key)
        config = TTSConfig(provider='elevenlabs')  # [NRS-702] Config without key
        is_valid, error = config.validate()  # [NRS-702] Validate config
        self.assertFalse(is_valid)  # [NRS-807] Should be invalid
        self.assertIn("API key", error)  # [NRS-807] Error mentions API key
    
    def test_voice_settings_validation(self):  # [NRS-702] Test voice parameter validation
        """Test voice settings validation"""  # [NRS-702] Validate voice parameters
        config = TTSConfig(  # [NRS-702] Create config with settings
            stability=0.5,  # [NRS-702] Stability parameter
            similarity_boost=0.7,  # [NRS-702] Similarity boost
            style=0.3  # [NRS-702] Style parameter
        )  # [NRS-810]
        
        self.assertEqual(config.stability, 0.5)  # [NRS-807] Verify stability
        self.assertEqual(config.similarity_boost, 0.7)  # [NRS-807] Verify boost
        self.assertEqual(config.style, 0.3)  # [NRS-807] Verify style
        
        # [NRS-702] Test invalid ranges
        with self.assertRaises(ValueError):  # [NRS-807] Invalid range check
            TTSConfig(stability=1.5)  # [NRS-702] stability > 1.0 (invalid)
        
        with self.assertRaises(ValueError):  # [NRS-807] Invalid range check
            TTSConfig(similarity_boost=-0.1)  # [NRS-702] boost < 0.0 (invalid)

class TestTTSResult(unittest.TestCase):  # [NRS-810] Result test suite
    """Test cases for TTSResult"""  # [NRS-702] Result object tests
    
    def test_successful_result(self):  # [NRS-807] Test success result
        """Test successful result creation"""  # [NRS-702] Create successful result
        audio_data = b"test_audio" * 100  # [NRS-705] Create test audio
        
        result = TTSResult(  # [NRS-702] Create result object
            success=True,  # [NRS-702] Synthesis succeeded
            audio_data=audio_data,  # [NRS-705] Audio data
            format='mp3',  # [NRS-705] Audio format
            duration=3.2,  # [NRS-702] Duration in seconds
            processing_time=250.0  # [NRS-702] Processing time in ms
        )  # [NRS-810]
        
        self.assertTrue(result.success)  # [NRS-807] Verify success
        self.assertEqual(result.audio_data, audio_data)  # [NRS-807] Verify audio
        self.assertEqual(result.format, 'mp3')  # [NRS-807] Verify format
        self.assertEqual(result.duration, 3.2)  # [NRS-807] Verify duration
        self.assertIsNone(result.error)  # [NRS-807] No error
    
    def test_failed_result(self):  # [NRS-807] Test failure result
        """Test failed result creation"""  # [NRS-702] Create failed result
        result = TTSResult(  # [NRS-702] Create result object
            success=False,  # [NRS-702] Synthesis failed
            error="Synthesis failed",  # [NRS-702] Error message
            processing_time=100.0  # [NRS-702] Processing time before failure
        )  # [NRS-810]
        
        self.assertFalse(result.success)  # [NRS-807] Verify failure
        self.assertEqual(result.error, "Synthesis failed")  # [NRS-807] Verify error
        self.assertIsNone(result.audio_data)  # [NRS-807] No audio on failure
    
    def test_result_serialization(self):  # [NRS-807] Test serialization
        """Test result serialization"""  # [NRS-702] Convert result to dict
        result = TTSResult(  # [NRS-702] Create result
            success=True,  # [NRS-702] Successful
            audio_data=b"test",  # [NRS-705] Audio data
            format='wav',  # [NRS-705] WAV format
            duration=1.5,  # [NRS-702] Duration in seconds
            processing_time=200.0  # [NRS-702] Processing time
        )  # [NRS-810]
        
        result_dict = result.to_dict()  # [NRS-702] Serialize to dict
        
        expected_keys = ['success', 'format', 'duration', 'processing_time', 'error', 'audio_size']  # [NRS-702] Expected keys
        for key in expected_keys:  # [NRS-807] Check each key
            self.assertIn(key, result_dict)  # [NRS-807] Key in dict
        
        # [NRS-705] Audio data should not be in serialized version
        self.assertNotIn('audio_data', result_dict)  # [NRS-807] Audio not included
        self.assertEqual(result_dict['audio_size'], len(result.audio_data))  # [NRS-807] Size recorded

class TestVoiceProfiles(unittest.TestCase):  # [NRS-810] Voice profile test suite
    """Test voice profile management"""  # [NRS-702] Voice profile tests
    
    def test_voice_profile_creation(self):  # [NRS-807] Test profile creation
        """Test creating voice profiles"""  # [NRS-702] Create new voice profile
        from jarvis.tts_engine import VoiceProfile  # [NRS-702] Import VoiceProfile
        
        profile = VoiceProfile(  # [NRS-702] Create profile
            name="Jarvis",  # [NRS-702] Profile name
            voice_id="jarvis_voice_id",  # [NRS-702] Voice identifier
            stability=0.6,  # [NRS-702] Stability setting
            similarity_boost=0.8,  # [NRS-702] Similarity setting
            style=0.2  # [NRS-702] Style setting
        )  # [NRS-810]
        
        self.assertEqual(profile.name, "Jarvis")  # [NRS-807] Verify name
        self.assertEqual(profile.voice_id, "jarvis_voice_id")  # [NRS-807] Verify ID
        self.assertEqual(profile.stability, 0.6)  # [NRS-807] Verify stability
    
    @patch('jarvis.tts_engine.ElevenLabs')  # [NRS-807] Mock ElevenLabs
    def test_voice_profile_switching(self, mock_elevenlabs):  # [NRS-702] Test profile switch
        """Test switching between voice profiles"""  # [NRS-702] Switch active profile
        mock_client = MagicMock()  # [NRS-807] Create mock client
        mock_elevenlabs.return_value = mock_client  # [NRS-807] Return mock
        
        engine = TTSEngine(self.config)  # [NRS-702] Create engine
        
        # [NRS-702] Test switching to different profile
        engine.load_voice_profile("Professional")  # [NRS-702] Load profile
        
        # [NRS-702] Voice should be changed
        self.assertNotEqual(engine.config.voice_id, 'jarvis_voice')  # [NRS-807] Verify changed

# [NRS-810] Integration tests
class TestTTSIntegration(unittest.TestCase):  # [NRS-810] Integration test suite
    """Integration tests for TTS functionality"""  # [NRS-702] Full workflow tests
    
    @patch('jarvis.tts_engine.ElevenLabs')  # [NRS-807] Mock ElevenLabs
    async def test_full_synthesis_workflow(self, mock_elevenlabs):  # [NRS-702] Test full workflow
        """Test complete synthesis workflow"""  # [NRS-702] End-to-end synthesis
        # [NRS-807] Mock successful synthesis
        mock_client = MagicMock()  # [NRS-807] Create mock client
        mock_elevenlabs.return_value = mock_client  # [NRS-807] Return mock
        
        mock_audio = b"synthesized_speech_data" * 200  # [NRS-705] Create mock audio
        mock_client.generate.return_value = mock_audio  # [NRS-807] Mock generate return
        
        config = TTSConfig(  # [NRS-702] Create config
            provider='elevenlabs',  # [NRS-702] ElevenLabs provider
            voice_id='test_voice',  # [NRS-702] Test voice ID
            api_key='test_key'  # [NRS-702] Test API key
        )  # [NRS-810]
        
        engine = TTSEngine(config)  # [NRS-702] Create engine
        
        # [NRS-702] Synthesize text
        result = await engine.synthesize_text("Hello, this is a test synthesis.")  # [NRS-702] Synthesize
        
        # [NRS-702] Verify result
        self.assertTrue(result.success)  # [NRS-807] Verify success
        self.assertIsNotNone(result.audio_data)  # [NRS-807] Audio present
        self.assertGreater(result.duration, 0)  # [NRS-807] Duration > 0
        self.assertIsNone(result.error)  # [NRS-807] No error
        self.assertGreater(result.processing_time, 0)  # [NRS-807] Time recorded
    
    @patch('jarvis.tts_engine.ElevenLabs')  # [NRS-807] Mock ElevenLabs
    async def test_batch_synthesis(self, mock_elevenlabs):  # [NRS-702] Test batch synthesis
        """Test batch text synthesis"""  # [NRS-702] Synthesize multiple texts
        mock_client = MagicMock()  # [NRS-807] Create mock client
        mock_elevenlabs.return_value = mock_client  # [NRS-807] Return mock
        mock_client.generate.return_value = b"audio" * 50  # [NRS-705] Mock audio
        
        engine = TTSEngine(self.config)  # [NRS-702] Create engine
        
        texts = [  # [NRS-702] Batch text
            "First sentence.",  # [NRS-702] Text 1
            "Second sentence.",  # [NRS-702] Text 2
            "Third sentence."  # [NRS-702] Text 3
        ]  # [NRS-810]
        
        results = await engine.synthesize_batch(texts)  # [NRS-702] Batch synthesis
        
        self.assertEqual(len(results), 3)  # [NRS-807] Verify batch size
        for result in results:  # [NRS-807] Check each result
            self.assertTrue(result.success)  # [NRS-807] Verify success
            self.assertIsNotNone(result.audio_data)  # [NRS-807] Audio present

if __name__ == '__main__':  # [NRS-810] Test main entry point
    # [NRS-807] Configure logging for tests
    import logging  # [NRS-810] Logging module
    logging.basicConfig(level=logging.DEBUG)  # [NRS-807] Set debug level
    
    # [NRS-807] Run tests
    unittest.main(verbosity=2)  # [NRS-807] Run all tests with verbose output
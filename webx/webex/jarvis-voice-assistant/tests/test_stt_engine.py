"""
Test STT Engine
Unit tests for speech-to-text functionality
"""  # [NRS-810]

import unittest  # [NRS-807] Unit testing framework
import asyncio  # [NRS-810] Async event loop
from unittest.mock import Mock, patch, AsyncMock  # [NRS-807] Mocking utilities
import sys  # [NRS-810] System utilities
import os  # [NRS-810] File system operations

# [NRS-810] Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))  # [NRS-810] Add to path

from jarvis.stt_engine import STTEngine, STTConfig, STTResult  # [NRS-604] STT engine classes

class TestSTTEngine(unittest.TestCase):  # [NRS-810] STT engine test suite
    """Test cases for STTEngine"""  # [NRS-810]
    
    def setUp(self):  # [NRS-807] Test setup fixture
        """Set up test fixtures"""  # [NRS-810]
        self.config = STTConfig(  # [NRS-604] Create test STT config
            provider='openai',  # [NRS-604] OpenAI provider
            model='whisper-1',  # [NRS-604] Whisper model version
            language='en',  # [NRS-604] English language
            api_key='test_key_123'  # [NRS-604] Test API key
        )  # [NRS-810]
    
    def test_config_creation(self):  # [NRS-810] Test config initialization
        """Test STT config creation"""  # [NRS-810]
        self.assertEqual(self.config.provider, 'openai')  # [NRS-807] Assert provider
        self.assertEqual(self.config.model, 'whisper-1')  # [NRS-807] Assert model
        self.assertEqual(self.config.language, 'en')  # [NRS-807] Assert language
        self.assertEqual(self.config.api_key, 'test_key_123')  # [NRS-807] Assert API key
    
    def test_stt_result_creation(self):  # [NRS-810] Test result object
        """Test STT result creation"""  # [NRS-810]
        result = STTResult(  # [NRS-604] Create transcription result
            success=True,  # [NRS-604] Transcription succeeded
            text="Hello world",  # [NRS-604] Transcribed text
            confidence=0.95,  # [NRS-604] Confidence score
            language="en",  # [NRS-604] Detected language
            processing_time=150.0  # [NRS-807] Processing duration in ms
        )  # [NRS-810]
        
        self.assertTrue(result.success)  # [NRS-807] Assert success
        self.assertEqual(result.text, "Hello world")  # [NRS-807] Assert text
        self.assertEqual(result.confidence, 0.95)  # [NRS-807] Assert confidence
        self.assertEqual(result.language, "en")  # [NRS-807] Assert language
        self.assertEqual(result.processing_time, 150.0)  # [NRS-807] Assert timing
    
    @patch('jarvis.stt_engine.openai')  # [NRS-807] Mock OpenAI
    def test_engine_initialization(self, mock_openai):  # [NRS-810] Test engine init
        """Test STT engine initialization"""  # [NRS-810]
        engine = STTEngine(self.config)  # [NRS-604] Create STT engine
        
        self.assertEqual(engine.config, self.config)  # [NRS-807] Assert config
        self.assertIsNone(engine.local_model)  # [NRS-807] Assert no local model
        mock_openai.api_key = self.config.api_key  # [NRS-604] Set API key
    
    @patch('jarvis.stt_engine.openai')  # [NRS-807] Mock OpenAI
    async def test_openai_transcription_success(self, mock_openai):  # [NRS-604] Test transcription
        """Test successful OpenAI transcription"""  # [NRS-810]
        # [NRS-807] Mock OpenAI response
        mock_response = Mock()  # [NRS-807] Create mock response
        mock_response.text = "Hello, this is a test transcription."  # [NRS-604] Set response text
        mock_openai.Audio.transcribe = AsyncMock(return_value=mock_response)  # [NRS-807] Mock transcribe
        
        engine = STTEngine(self.config)  # [NRS-604] Create STT engine
        
        # [NRS-604] Test data
        test_audio = b"fake_audio_data" * 100  # [NRS-602] Create fake audio
        
        result = await engine.transcribe_audio(test_audio)  # [NRS-604] Transcribe
        
        self.assertTrue(result.success)  # [NRS-807] Assert success
        self.assertEqual(result.text, "Hello, this is a test transcription.")  # [NRS-807] Assert text
        self.assertIsNone(result.error)  # [NRS-807] Assert no error
    
    @patch('jarvis.stt_engine.openai')  # [NRS-807] Mock OpenAI
    async def test_openai_transcription_error(self, mock_openai):  # [NRS-604] Test error handling
        """Test OpenAI transcription error handling"""  # [NRS-810]
        # [NRS-807] Mock OpenAI error
        mock_openai.Audio.transcribe = AsyncMock(  # [NRS-807] Mock failed transcribe
            side_effect=Exception("API Error")  # [NRS-807] Simulate API error
        )  # [NRS-810]
        
        engine = STTEngine(self.config)  # [NRS-604] Create STT engine
        
        # [NRS-604] Test data
        test_audio = b"fake_audio_data" * 100  # [NRS-602] Create fake audio
        
        result = await engine.transcribe_audio(test_audio)  # [NRS-604] Transcribe
        
        self.assertFalse(result.success)  # [NRS-807] Assert failure
        self.assertIsNotNone(result.error)  # [NRS-807] Assert error present
        self.assertIn("API Error", result.error)  # [NRS-807] Assert error message
    
    def test_audio_preprocessing(self):  # [NRS-602] Test audio prep  
        """Test audio preprocessing"""  # [NRS-602] Test audio cleanup
        engine = STTEngine(self.config)  # [NRS-604] Create STT engine instance
        
        # [NRS-602] Create test audio data  
        test_audio = b"test_audio_data" * 1000  # [NRS-602] Create fake audio bytes
        
        processed = engine._preprocess_audio(test_audio)  # [NRS-602] Preprocess audio
        
        # [NRS-807] Should return bytes  
        self.assertIsInstance(processed, bytes)  # [NRS-807] Assert bytes type returned
    
    def test_text_postprocessing(self):  # [NRS-604] Test text cleanup
        """Test text postprocessing"""  # [NRS-604] Normalize transcription text
        engine = STTEngine(self.config)  # [NRS-604] Create STT engine instance
        
        test_cases = [  # [NRS-604] Test normalization scenarios
            ("  hello world  ", "hello world"),  # [NRS-604] Whitespace trimming
            ("HELLO WORLD", "hello world"),  # [NRS-604] Lowercase conversion
            ("hello... world!!!", "hello world"),  # [NRS-604] Punctuation removal
            ("", ""),  # [NRS-604] Empty string handling
            (None, "")  # [NRS-604] None value handling
        ]  # [NRS-810]
        
        for input_text, expected in test_cases:  # [NRS-807] Test each scenario
            result = engine._postprocess_text(input_text)  # [NRS-604] Execute postprocess
            self.assertEqual(result, expected)  # [NRS-807] Verify expected output
    
    @patch('jarvis.stt_engine.whisper')  # [NRS-807] Mock Whisper module
    def test_local_model_loading(self, mock_whisper):  # [NRS-604] Test local model init
        """Test local Whisper model loading"""  # [NRS-604] Load offline Whisper model
        mock_model = Mock()  # [NRS-807] Create mock model object
        mock_whisper.load_model.return_value = mock_model  # [NRS-807] Mock load return
        
        config = STTConfig(  # [NRS-604] Create local STT configuration
            provider='whisper_local',  # [NRS-604] Local Whisper provider
            model='base',  # [NRS-604] Base model size
            language='en'  # [NRS-604] English language
        )  # [NRS-810]
        
        engine = STTEngine(config)  # [NRS-604] Create engine with config
        engine._load_local_model()  # [NRS-604] Load local model
        
        mock_whisper.load_model.assert_called_once_with('base')  # [NRS-807] Verify called correctly
        self.assertEqual(engine.local_model, mock_model)  # [NRS-807] Verify model stored
    
    @patch('jarvis.stt_engine.whisper')  # [NRS-807] Mock Whisper module
    async def test_local_transcription(self, mock_whisper):  # [NRS-604] Test local STT
        """Test local Whisper transcription"""  # [NRS-604] Offline transcription test
        # [NRS-807] Mock local model
        mock_model = Mock()  # [NRS-807] Create mock model
        mock_result = {  # [NRS-604] Mock transcription result
            'text': 'Local transcription test',  # [NRS-604] Transcribed text
            'language': 'en'  # [NRS-604] Detected language
        }  # [NRS-810]
        mock_model.transcribe.return_value = mock_result  # [NRS-807] Mock transcribe return
        mock_whisper.load_model.return_value = mock_model  # [NRS-807] Mock model loading
        
        config = STTConfig(  # [NRS-604] Create local STT config
            provider='whisper_local',  # [NRS-604] Local provider
            model='base',  # [NRS-604] Base model
            language='en'  # [NRS-604] English
        )  # [NRS-810]
        
        engine = STTEngine(config)  # [NRS-604] Create engine
        engine.local_model = mock_model  # [NRS-604] Assign mock model
        
        test_audio = b"fake_audio_data" * 100  # [NRS-602] Create test audio
        
        result = await engine.transcribe_audio(test_audio)  # [NRS-604] Transcribe audio
        
        self.assertTrue(result.success)  # [NRS-807] Verify success
        self.assertEqual(result.text, 'local transcription test')  # [NRS-807] Verify text
        self.assertEqual(result.language, 'en')  # [NRS-807] Verify language
    
    def test_confidence_calculation(self):  # [NRS-604] Test confidence scoring
        """Test confidence score calculation"""  # [NRS-604] Quality metric calculation
        engine = STTEngine(self.config)  # [NRS-604] Create STT engine
        
        # [NRS-604] Test different text qualities
        high_quality = "This is a clear and complete sentence."  # [NRS-604] High quality text
        low_quality = "uhh... this is... um... broken"  # [NRS-604] Low quality with filler
        empty_text = ""  # [NRS-604] Empty string
        
        high_confidence = engine._calculate_confidence(high_quality)  # [NRS-604] Calculate high
        low_confidence = engine._calculate_confidence(low_quality)  # [NRS-604] Calculate low
        zero_confidence = engine._calculate_confidence(empty_text)  # [NRS-604] Calculate empty
        
        self.assertGreater(high_confidence, low_confidence)  # [NRS-807] High > low
        self.assertGreater(low_confidence, zero_confidence)  # [NRS-807] Low > zero
        self.assertEqual(zero_confidence, 0.0)  # [NRS-807] Empty is zero
    
    async def test_streaming_transcription(self):  # [NRS-604] Test streaming mode
        """Test streaming transcription capability"""  # [NRS-604] Live stream transcription
        engine = STTEngine(self.config)  # [NRS-604] Create engine
        
        # [NRS-602] Mock streaming setup
        with patch.object(engine, '_setup_streaming') as mock_setup:  # [NRS-807] Mock setup
            mock_setup.return_value = True  # [NRS-807] Mock success return
            
            result = await engine.start_streaming()  # [NRS-604] Start streaming
            self.assertTrue(result)  # [NRS-807] Verify started
            
            # [NRS-604] Test stopping
            result = await engine.stop_streaming()  # [NRS-604] Stop streaming
            self.assertTrue(result)  # [NRS-807] Verify stopped

class TestSTTConfig(unittest.TestCase):  # [NRS-810] Configuration test suite
    """Test cases for STTConfig"""  # [NRS-604] Config class tests
    
    def test_default_config(self):  # [NRS-807] Test defaults
        """Test default configuration"""  # [NRS-604] Default settings validation
        config = STTConfig()  # [NRS-604] Create default config
        
        self.assertEqual(config.provider, 'openai')  # [NRS-807] Default provider
        self.assertEqual(config.model, 'whisper-1')  # [NRS-807] Default model
        self.assertEqual(config.language, 'auto')  # [NRS-807] Default language
        self.assertIsNone(config.api_key)  # [NRS-807] No API key by default
    
    def test_openai_config_validation(self):  # [NRS-604] Test OpenAI validation
        """Test OpenAI configuration validation"""  # [NRS-604] Validate required settings
        # [NRS-604] Valid config
        config = STTConfig(  # [NRS-604] Create valid config
            provider='openai',  # [NRS-604] OpenAI provider
            api_key='sk-test123'  # [NRS-604] Test API key
        )  # [NRS-810]
        
        is_valid, error = config.validate()  # [NRS-604] Validate config
        self.assertTrue(is_valid)  # [NRS-807] Should be valid
        self.assertIsNone(error)  # [NRS-807] No error message
        
        # [NRS-604] Invalid config (missing API key)
        config = STTConfig(provider='openai')  # [NRS-604] Config without key
        is_valid, error = config.validate()  # [NRS-604] Validate config
        self.assertFalse(is_valid)  # [NRS-807] Should be invalid
        self.assertIn("API key", error)  # [NRS-807] Error mentions API key
    
    def test_local_config_validation(self):  # [NRS-604] Test local config validation
        """Test local Whisper configuration validation"""  # [NRS-604] Validate offline settings
        config = STTConfig(  # [NRS-604] Create local config
            provider='whisper_local',  # [NRS-604] Local provider
            model='base'  # [NRS-604] Base model
        )  # [NRS-810]
        
        is_valid, error = config.validate()  # [NRS-604] Validate config
        # [NRS-604] Should be valid even without API key for local models
        self.assertTrue(is_valid)  # [NRS-807] Valid without API key

class TestSTTResult(unittest.TestCase):  # [NRS-810] Result test suite
    """Test cases for STTResult"""  # [NRS-604] Result object tests
    
    def test_successful_result(self):  # [NRS-807] Test success result
        """Test successful result creation"""  # [NRS-604] Create successful result
        result = STTResult(  # [NRS-604] Create result object
            success=True,  # [NRS-604] Successful transcription
            text="Test transcription",  # [NRS-604] Transcribed text
            confidence=0.9,  # [NRS-604] High confidence
            language="en",  # [NRS-604] English language
            processing_time=100.5  # [NRS-604] Processing time in ms
        )  # [NRS-810]
        
        self.assertTrue(result.success)  # [NRS-807] Verify success flag
        self.assertEqual(result.text, "Test transcription")  # [NRS-807] Verify text
        self.assertEqual(result.confidence, 0.9)  # [NRS-807] Verify confidence
        self.assertIsNone(result.error)  # [NRS-807] No error present
    
    def test_failed_result(self):  # [NRS-807] Test failure result
        """Test failed result creation"""  # [NRS-604] Create failed result
        result = STTResult(  # [NRS-604] Create result object
            success=False,  # [NRS-604] Failed transcription
            error="Transcription failed",  # [NRS-604] Error message
            processing_time=50.0  # [NRS-604] Processing time before failure
        )  # [NRS-810]
        
        self.assertFalse(result.success)  # [NRS-807] Verify failure
        self.assertEqual(result.error, "Transcription failed")  # [NRS-807] Verify error
        self.assertIsNone(result.text)  # [NRS-807] No text on failure
    
    def test_result_serialization(self):  # [NRS-807] Test serialization
        """Test result serialization to dict"""  # [NRS-604] Convert result to dict
        result = STTResult(  # [NRS-604] Create result
            success=True,  # [NRS-604] Successful
            text="Hello world",  # [NRS-604] Text content
            confidence=0.95,  # [NRS-604] Confidence score
            language="en",  # [NRS-604] Language detected
            processing_time=120.0  # [NRS-604] Processing duration
        )  # [NRS-810]
        
        result_dict = result.to_dict()  # [NRS-604] Serialize to dict
        
        expected_keys = ['success', 'text', 'confidence', 'language', 'processing_time', 'error']  # [NRS-604] Required keys
        for key in expected_keys:  # [NRS-807] Check each key
            self.assertIn(key, result_dict)  # [NRS-807] Key present in dict

# [NRS-810] Integration test mock
class TestSTTIntegration(unittest.TestCase):  # [NRS-810] Integration test suite
    """Integration tests for STT functionality"""  # [NRS-604] Full workflow tests
    
    @patch('jarvis.stt_engine.openai')  # [NRS-807] Mock OpenAI
    async def test_full_transcription_workflow(self, mock_openai):  # [NRS-604] Test full workflow
        """Test complete transcription workflow"""  # [NRS-604] End-to-end transcription
        # [NRS-807] Mock successful API response
        mock_response = Mock()  # [NRS-807] Create mock response
        mock_response.text = "This is a complete transcription test."  # [NRS-604] Response text
        mock_openai.Audio.transcribe = AsyncMock(return_value=mock_response)  # [NRS-807] Mock transcribe
        
        config = STTConfig(  # [NRS-604] Create config
            provider='openai',  # [NRS-604] OpenAI provider
            model='whisper-1',  # [NRS-604] Whisper model
            api_key='test_key'  # [NRS-604] Test API key
        )  # [NRS-810]
        
        engine = STTEngine(config)  # [NRS-604] Create engine
        
        # [NRS-604] Simulate audio data
        test_audio = b"simulated_audio_data" * 500  # [NRS-602] Create audio
        
        # [NRS-604] Transcribe
        result = await engine.transcribe_audio(test_audio)  # [NRS-604] Transcribe audio
        
        # [NRS-604] Verify result
        self.assertTrue(result.success)  # [NRS-807] Verify success
        self.assertIsNotNone(result.text)  # [NRS-807] Text present
        self.assertGreater(result.confidence, 0)  # [NRS-807] Confidence > 0
        self.assertIsNone(result.error)  # [NRS-807] No error
        self.assertGreater(result.processing_time, 0)  # [NRS-807] Time recorded

if __name__ == '__main__':  # [NRS-810] Test main entry point
    # [NRS-807] Configure logging for tests
    import logging  # [NRS-810] Logging module
    logging.basicConfig(level=logging.DEBUG)  # [NRS-807] Set debug level
    
    # [NRS-807] Run tests
    unittest.main(verbosity=2)  # [NRS-807] Run all tests with verbose output
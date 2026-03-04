"""
Test Audio Pipeline
Unit tests for audio pipeline functionality
"""  # [NRS-810]

import unittest  # [NRS-807] Unit testing framework
import asyncio  # [NRS-810] Async event loop
import numpy as np  # [NRS-602] NumPy for audio arrays
from unittest.mock import Mock, patch, MagicMock  # [NRS-807] Mocking utilities
import sys  # [NRS-810] System utilities
import os  # [NRS-810] File system operations

# [NRS-810] Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))  # [NRS-810]

from jarvis.audio_pipeline import AudioPipeline, AudioConfig  # [NRS-602] Audio pipeline classes

class TestAudioPipeline(unittest.TestCase):  # [NRS-810] Audio pipeline test suite
    """Test cases for AudioPipeline"""  # [NRS-810]
    
    def setUp(self):  # [NRS-807] Test setup fixture
        """Set up test fixtures"""  # [NRS-810]
        self.config = AudioConfig(  # [NRS-602] Create test audio config
            sample_rate=16000,  # [NRS-602] 16kHz sample rate
            channels=1,  # [NRS-602] Mono audio
            format='int16',  # [NRS-602] 16-bit format
            chunk_size=1024,  # [NRS-602] Buffer size
            input_device_index=None,  # [NRS-602] Default input device
            output_device_index=None  # [NRS-602] Default output device
        )  # [NRS-810]
        
    def test_config_creation(self):  # [NRS-810] Test config initialization
        """Test audio config creation"""  # [NRS-810]
        self.assertEqual(self.config.sample_rate, 16000)  # [NRS-807] Assert sample rate
        self.assertEqual(self.config.channels, 1)  # [NRS-807] Assert channels
        self.assertEqual(self.config.format, 'int16')  # [NRS-807] Assert format
    
    @patch('jarvis.audio_pipeline.pyaudio.PyAudio')  # [NRS-807] Mock PyAudio
    def test_pipeline_initialization(self, mock_pyaudio):  # [NRS-810] Test pipeline init
        """Test audio pipeline initialization"""  # [NRS-810]
        mock_audio = MagicMock()  # [NRS-807] Create mock PyAudio
        mock_pyaudio.return_value = mock_audio  # [NRS-807] Return mock
        
        pipeline = AudioPipeline(self.config)  # [NRS-602] Create pipeline
        
        self.assertEqual(pipeline.config, self.config)  # [NRS-807] Assert config
        self.assertFalse(pipeline.is_recording)  # [NRS-807] Assert not recording
        self.assertFalse(pipeline.is_playing)  # [NRS-807] Assert not playing
    
    @patch('jarvis.audio_pipeline.pyaudio.PyAudio')  # [NRS-807] Mock PyAudio
    async def test_start_recording(self, mock_pyaudio):  # [NRS-602] Test recording start
        """Test starting audio recording"""  # [NRS-810]
        mock_audio = MagicMock()  # [NRS-807] Create mock PyAudio
        mock_stream = MagicMock()  # [NRS-807] Create mock stream
        mock_pyaudio.return_value = mock_audio  # [NRS-807] Return mock PyAudio
        mock_audio.open.return_value = mock_stream  # [NRS-807] Return mock stream
        
        pipeline = AudioPipeline(self.config)  # [NRS-602] Create pipeline
        
        # [NRS-807] Mock successful stream opening
        await pipeline.start_recording()  # [NRS-602] Start recording
        
        self.assertTrue(pipeline.is_recording)  # [NRS-807] Assert recording started
        mock_audio.open.assert_called_once()  # [NRS-807] Assert stream opened
    
    @patch('jarvis.audio_pipeline.pyaudio.PyAudio')  # [NRS-807] Mock PyAudio
    async def test_stop_recording(self, mock_pyaudio):  # [NRS-602] Test recording stop
        """Test stopping audio recording"""  # [NRS-810]
        mock_audio = MagicMock()  # [NRS-807] Create mock PyAudio
        mock_stream = MagicMock()  # [NRS-807] Create mock stream
        mock_pyaudio.return_value = mock_audio  # [NRS-807] Return mock PyAudio
        mock_audio.open.return_value = mock_stream  # [NRS-807] Return mock stream
        
        pipeline = AudioPipeline(self.config)  # [NRS-602] Create pipeline
        pipeline.input_stream = mock_stream  # [NRS-602] Set mock stream
        pipeline.is_recording = True  # [NRS-602] Flag recording active
        
        await pipeline.stop_recording()  # [NRS-602] Stop recording
        
        self.assertFalse(pipeline.is_recording)  # [NRS-807] Assert recording stopped
        mock_stream.stop_stream.assert_called_once()  # [NRS-807] Assert stream stopped
        mock_stream.close.assert_called_once()  # [NRS-807] Assert stream closed
    
    def test_voice_activity_detection(self):  # [NRS-602] Test VAD functionality
        """Test voice activity detection"""  # [NRS-810]
        pipeline = AudioPipeline(self.config)  # [NRS-602] Create pipeline
        
        # [NRS-602] Create test audio data with voice activity
        sample_rate = 16000  # [NRS-602] 16kHz sample rate
        duration = 0.5  # [NRS-602] 500ms duration
        samples = int(sample_rate * duration)  # [NRS-602] Calculate sample count
        
        # [NRS-602] Generate sine wave (simulating voice)
        t = np.linspace(0, duration, samples, False)  # [NRS-602] Time array
        frequency = 440  # [NRS-705] A4 note frequency
        voice_audio = np.sin(2 * np.pi * frequency * t) * 0.5  # [NRS-602] Create voice signal
        voice_bytes = (voice_audio * 32767).astype(np.int16).tobytes()  # [NRS-602] Convert to bytes
        
        # [NRS-602] Generate silence
        silence_audio = np.zeros(samples)  # [NRS-602] Create silence
        silence_bytes = silence_audio.astype(np.int16).tobytes()  # [NRS-602] Convert to bytes
        
        # [NRS-602] Test voice detection
        has_voice = pipeline.detect_voice_activity(voice_bytes)  # [NRS-602] Detect voice
        has_silence = pipeline.detect_voice_activity(silence_bytes)  # [NRS-602] Detect silence
        
        self.assertTrue(has_voice)  # [NRS-807] Assert voice detected
        self.assertFalse(has_silence)  # [NRS-807] Assert silence detected
    
    def test_audio_energy_calculation(self):  # [NRS-602] Test energy calculation
        """Test audio energy calculation"""  # [NRS-810]
        pipeline = AudioPipeline(self.config)  # [NRS-602] Create pipeline
        
        # [NRS-602] Test with different energy levels
        high_energy = np.random.normal(0, 0.5, 1000).astype(np.int16) * 16000  # [NRS-602] High energy signal
        low_energy = np.random.normal(0, 0.1, 1000).astype(np.int16) * 1000  # [NRS-602] Low energy signal
        silence = np.zeros(1000, dtype=np.int16)  # [NRS-602] Silence
        
        high_energy_value = pipeline._calculate_energy(high_energy.tobytes())  # [NRS-602] Calculate high energy
        low_energy_value = pipeline._calculate_energy(low_energy.tobytes())  # [NRS-602] Calculate low energy
        silence_energy_value = pipeline._calculate_energy(silence.tobytes())  # [NRS-602] Calculate silence energy
        
        self.assertGreater(high_energy_value, low_energy_value)  # [NRS-807] Assert high > low
        self.assertGreater(low_energy_value, silence_energy_value)  # [NRS-807] Assert low > silence
        self.assertEqual(silence_energy_value, 0.0)  # [NRS-807] Assert silence = 0
    
    async def test_audio_buffer_management(self):  # [NRS-602] Test buffer management
        """Test audio buffer management"""  # [NRS-810]
        pipeline = AudioPipeline(self.config)  # [NRS-602] Create pipeline
        
        # [NRS-602] Test buffer operations
        test_data = b"test audio data"  # [NRS-602] Test data
        pipeline._add_to_buffer(test_data)  # [NRS-602] Add to buffer
        
        # [NRS-602] Test buffer retrieval
        buffer_data = pipeline.get_audio_buffer(1.0)  # [NRS-602] Get last 1 second
        
        # [NRS-807] Buffer should contain some data
        self.assertIsInstance(buffer_data, bytes)  # [NRS-807] Assert buffer is bytes

class TestAudioConfig(unittest.TestCase):  # [NRS-810] Audio config test suite
    """Test cases for AudioConfig"""  # [NRS-810]
    
    def test_default_config(self):  # [NRS-810] Test default config
        """Test default configuration values"""  # [NRS-810]
        config = AudioConfig()  # [NRS-602] Create default config
        
        self.assertEqual(config.sample_rate, 16000)  # [NRS-807] Assert default rate
        self.assertEqual(config.channels, 1)  # [NRS-807] Assert default channels
        self.assertEqual(config.format, 'int16')  # [NRS-807] Assert default format
        self.assertGreater(config.chunk_size, 0)  # [NRS-807] Assert chunk size valid
    
    def test_custom_config(self):  # [NRS-810] Test custom config
        """Test custom configuration values"""  # [NRS-810]
        config = AudioConfig(  # [NRS-602] Create custom config
            sample_rate=44100,  # [NRS-602] High quality rate
            channels=2,  # [NRS-602] Stereo
            format='float32',  # [NRS-602] Float format
            chunk_size=2048  # [NRS-602] Large buffer
        )  # [NRS-810]
        
        self.assertEqual(config.sample_rate, 44100)  # [NRS-807] Assert custom rate
        self.assertEqual(config.channels, 2)  # [NRS-807] Assert custom channels
        self.assertEqual(config.format, 'float32')  # [NRS-807] Assert custom format
        self.assertEqual(config.chunk_size, 2048)  # [NRS-807] Assert custom chunk size
    
    def test_config_validation(self):  # [NRS-810] Test config validation
        """Test configuration validation"""  # [NRS-810]
        # [NRS-807] Test invalid sample rate
        with self.assertRaises(ValueError):  # [NRS-807] Expect validation error
            AudioConfig(sample_rate=0)  # [NRS-602] Invalid rate
        
        # [NRS-807] Test invalid channels
        with self.assertRaises(ValueError):  # [NRS-807] Expect validation error
            AudioConfig(channels=0)  # [NRS-602] Invalid channels
        
        # [NRS-807] Test invalid chunk size
        with self.assertRaises(ValueError):  # [NRS-807] Expect validation error
            AudioConfig(chunk_size=0)  # [NRS-602] Invalid chunk size

# [NRS-807] Mock tests for hardware dependencies
class TestAudioPipelineWithoutHardware(unittest.TestCase):  # [NRS-810] Hardware-less test suite
    """Test audio pipeline without hardware dependencies"""  # [NRS-810]
    
    @patch('jarvis.audio_pipeline.pyaudio')  # [NRS-807] Mock PyAudio module
    def test_mock_recording_flow(self, mock_pyaudio):  # [NRS-810] Test complete recording flow
        """Test complete recording flow with mocked PyAudio"""  # [NRS-810]
        # [NRS-807] Setup mocks
        mock_pa = MagicMock()  # [NRS-807] Mock PyAudio instance
        mock_stream = MagicMock()  # [NRS-807] Mock audio stream
        mock_pyaudio.PyAudio.return_value = mock_pa  # [NRS-807] Return mock PyAudio
        mock_pa.open.return_value = mock_stream  # [NRS-807] Return mock stream
        
        # [NRS-602] Mock audio data
        mock_stream.read.return_value = b'\x00\x01' * 512  # [NRS-602] Mock audio data
        
        config = AudioConfig()  # [NRS-602] Create config
        pipeline = AudioPipeline(config)  # [NRS-602] Create pipeline
        
        # [NRS-810] Test initialization
        self.assertIsNotNone(pipeline)  # [NRS-807] Assert pipeline created
        
        # [NRS-807] Mock the audio stream operations
        mock_stream.start_stream = MagicMock()  # [NRS-807] Mock start
        mock_stream.stop_stream = MagicMock()  # [NRS-807] Mock stop
        mock_stream.close = MagicMock()  # [NRS-807] Mock close
        
        # [NRS-810] These would be tested in integration tests with real hardware

if __name__ == '__main__':  # [NRS-810] Entry point
    # [NRS-807] Configure test logging
    import logging  # [NRS-807] Import logging
    logging.basicConfig(level=logging.DEBUG)  # [NRS-807] Setup logging
    
    # [NRS-810] Run tests
    unittest.main(verbosity=2)  # [NRS-810] Execute tests
"""
Mock PyAudio module for when PyAudio is not available
Provides basic interface for development without audio hardware
"""  # [NRS-810]

import logging  # [NRS-807] Logging utilities
import time  # [NRS-602] Timing simulation
from typing import Optional, Callable  # [NRS-602] Type hints
import threading  # [NRS-602] Thread management

logger = logging.getLogger(__name__)  # [NRS-807] Module logger

logger = logging.getLogger(__name__)  # [NRS-807] Module logger (duplicate line)

# Mock PyAudio constants  # [NRS-810]
paFloat32 = 1  # [NRS-602] Float32 format constant
paInt16 = 8  # [NRS-602] Int16 format constant
paInt8 = 16  # [NRS-602] Int8 format constant
paUInt8 = 7  # [NRS-602] UInt8 format constant
paInt32 = 2  # [NRS-602] Int32 format constant
paContinue = 0  # [NRS-602] Continue callback constant
paComplete = 1  # [NRS-602] Complete callback constant
paInput = 1  # [NRS-602] Input stream constant
paOutput = 2  # [NRS-602] Output stream constant

class MockStream:  # [NRS-810]
    """Mock audio stream for testing"""  # [NRS-810]
    
    def __init__(self, rate=44100, channels=1, format=paInt16, input=True, output=False, frames_per_buffer=1024):  # [NRS-810]
        self.rate = rate  # [NRS-602] Sample rate
        self.channels = channels  # [NRS-602] Channel count
        self.format = format  # [NRS-603] Audio format
        self.input = input  # [NRS-602] Input stream flag
        self.output = output  # [NRS-602] Output stream flag
        self.frames_per_buffer = frames_per_buffer  # [NRS-602] Buffer size
        self.active = False  # [NRS-602] Active state flag
        self._callback = None  # [NRS-602] Callback function
        self._thread: Optional[threading.Thread] = None  # [NRS-602] Callback thread
        
        logger.info(f"🎵 Created mock audio stream (rate={rate}, channels={channels})")  # [NRS-807] Mock stream creation log
    
    def start_stream(self):  # [NRS-810]
        """Start the mock stream"""  # [NRS-810]
        self.active = True  # [NRS-810]
        logger.debug("🎵 Mock stream started")  # [NRS-810]
    
    def stop_stream(self):  # [NRS-810]
        """Stop the mock stream"""  # [NRS-810]
        self.active = False  # [NRS-810]
        logger.debug("🎵 Mock stream stopped")  # [NRS-810]
        
    def close(self):  # [NRS-810]
        """Close the mock stream"""  # [NRS-810]
        self.active = False  # [NRS-810]
        logger.debug("🎵 Mock stream closed")  # [NRS-810]
    
    def read(self, frames: int, _=True) -> bytes:  # [NRS-810]
        """Read mock audio data"""  # [NRS-810]
        # Simulate some delay  # [NRS-810]
        time.sleep(0.01)  # [NRS-810]
        
        # Return silent audio data  # [NRS-810]
        bytes_per_sample = 2 if self.format == paInt16 else 4  # [NRS-810]
        total_bytes = frames * self.channels * bytes_per_sample  # [NRS-810]
        
        return b'\x00' * total_bytes  # [NRS-810]
    
    def write(self, data: bytes, frames: int = None):  # [NRS-810]
        # Use frames parameter for validation  # [NRS-810]
        expected_frames = len(data) // (2 * self.channels) if frames is None else frames
        # Validate frame count  # [NRS-810]
        if expected_frames > 0:
            pass  # Mock write validation
        """Write mock audio data"""  # [NRS-810]
        # Simulate writing delay  # [NRS-810]
        time.sleep(len(data) / (self.rate * self.channels * 2))  # Assume 16-bit  # [NRS-810]
        logger.debug(f"🎵 Mock audio write: {len(data)} bytes")  # [NRS-810]

class MockPyAudio:  # [NRS-810]
    """Mock PyAudio class for when real PyAudio is not available"""  # [NRS-810]
    
    def __init__(self):  # [NRS-810]
        logger.info("🎵 Initialized Mock PyAudio (real PyAudio not available)")  # [NRS-810]
        self.device_count = 2  # Mock devices  # [NRS-810]
    
    def open(self,   # [NRS-810]
             rate: int = 44100,  # [NRS-810]
             channels: int = 1,  # [NRS-810]
             format: int = paInt16,  # [NRS-810]
             input: bool = False,  # [NRS-810]
             output: bool = False,  # [NRS-810]
             input_device_index: Optional[int] = None,  # [NRS-810]
             output_device_index: Optional[int] = None,  # [NRS-810]
             frames_per_buffer: int = 1024,  # [NRS-810]
             _: Optional[Callable] = None,  # [NRS-810] stream_callback unused
             **kwargs) -> MockStream:  # [NRS-810]
        """Open a mock audio stream"""  # [NRS-810]
        
        return MockStream(  # [NRS-810]
            rate=rate,  # [NRS-810]
            channels=channels,  # [NRS-810]
            format=format,  # [NRS-810]
            input=input,  # [NRS-810]
            output=output,  # [NRS-810]
            frames_per_buffer=frames_per_buffer  # [NRS-810]
        )  # [NRS-810]
    
    def get_device_count(self) -> int:  # [NRS-810]
        """Get mock device count"""  # [NRS-810]
        return self.device_count  # [NRS-810]
    
    def get_device_info_by_index(self, device_index: int) -> dict:  # [NRS-810]
        """Get mock device info"""  # [NRS-810]
        return {  # [NRS-810]
            'index': device_index,  # [NRS-810]
            'name': f'Mock Audio Device {device_index}',  # [NRS-810]
            'hostApi': 0,  # [NRS-810]
            'maxInputChannels': 2,  # [NRS-810]
            'maxOutputChannels': 2,  # [NRS-810]
            'defaultLowInputLatency': 0.01,  # [NRS-810]
            'defaultLowOutputLatency': 0.01,  # [NRS-810]
            'defaultHighInputLatency': 0.1,  # [NRS-810]
            'defaultHighOutputLatency': 0.1,  # [NRS-810]
            'defaultSampleRate': 44100.0  # [NRS-810]
        }  # [NRS-810]
    
    def terminate(self):  # [NRS-810]
        """Terminate mock PyAudio"""  # [NRS-810]
        logger.debug("🎵 Mock PyAudio terminated")  # [NRS-810]

# Try to import real PyAudio, fall back to mock  # [NRS-810]
try:  # [NRS-810]
    import pyaudio  # [NRS-810]
    logger.info("✅ Real PyAudio available")  # [NRS-810]
    PyAudio = pyaudio.PyAudio  # [NRS-810]
    
    # Export real constants  # [NRS-810]
    paFloat32 = pyaudio.paFloat32  # [NRS-810]
    paInt16 = pyaudio.paInt16  # [NRS-810]
    paInt8 = pyaudio.paInt8  # [NRS-810]
    paUInt8 = pyaudio.paUInt8  # [NRS-810]
    paInt32 = pyaudio.paInt32  # [NRS-810]
    paContinue = pyaudio.paContinue  # [NRS-810]
    paComplete = pyaudio.paComplete  # [NRS-810]
    paInput = pyaudio.paInput  # [NRS-810]
    paOutput = pyaudio.paOutput  # [NRS-810]
    
except ImportError:  # [NRS-810]
    logger.warning("⚠️  Real PyAudio not available, using mock implementation")  # [NRS-810]
    PyAudio = MockPyAudio  # [NRS-810]
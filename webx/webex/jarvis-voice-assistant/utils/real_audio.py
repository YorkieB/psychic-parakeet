"""
Real Audio Implementation using sounddevice
Modern alternative to PyAudio with better Windows support
"""  # [NRS-810]

import numpy as np  # [NRS-602] Audio array operations
import sounddevice as sd  # [NRS-601] Sound device library
import soundfile as sf  # [NRS-603] Audio file I/O
import logging  # [NRS-807] Logging utilities
import queue  # [NRS-602] Thread-safe audio buffering
import threading  # [NRS-602] Audio thread management
from typing import Optional, Callable, Generator  # [NRS-602] Type hints

logger = logging.getLogger(__name__)  # [NRS-807] Module logger

class AudioStream:  # [NRS-810]
    """Real audio stream using sounddevice"""  # [NRS-810]
    
    def __init__(self,   # [NRS-810]
                 sample_rate: int = 16000,  # [NRS-810]
                 channels: int = 1,   # [NRS-810]
                 dtype: str = 'float32',  # [NRS-810]
                 blocksize: int = 1024,  # [NRS-810]
                 input_device: int | None = None,  # [NRS-810]
                 output_device: int | None = None):  # [NRS-810]
        self.sample_rate = sample_rate  # [NRS-602] Audio sample rate
        self.channels = channels  # [NRS-602] Audio channel count
        self.dtype = dtype  # [NRS-603] Audio data type
        self.blocksize = blocksize  # [NRS-602] Audio block size
        self.is_active = False  # [NRS-602] Stream active flag
        self.input_device = input_device  # [NRS-601] Input device ID
        self.output_device = output_device  # [NRS-601] Output device ID
        
        # Use thread-safe queues (NOT asyncio.Queue)  # [NRS-810]
        self.input_queue = queue.Queue(maxsize=100)  # [NRS-602] Input buffer with limit
        self.output_queue = queue.Queue(maxsize=100)  # [NRS-602] Output buffer with limit
        
        # Streams  # [NRS-810]
        self.input_stream = None  # [NRS-602] Input stream object
        self.output_stream = None  # [NRS-602] Output stream object
        
        # Callbacks  # [NRS-810]
        self.input_callback = None  # [NRS-602] Input callback function
        self.output_callback = None  # [NRS-602] Output callback function
        
    def start_input_stream(self, callback: Optional[Callable] = None):  # [NRS-810]
        """Start recording audio"""  # [NRS-810]
        self.input_callback = callback  # [NRS-810]
        
        def audio_callback(indata, frames, time, status):  # [NRS-810]
            """Thread-safe audio input callback"""  # [NRS-810]
            if status:  # [NRS-810]
                logger.warning(f"Audio input status: {status}")  # [NRS-810]
            
            # Convert to the format expected by the rest of the system  # [NRS-810]
            audio_data = indata[:, 0] if indata.ndim > 1 else indata  # [NRS-810]
            audio_data = audio_data.astype(np.float32)  # [NRS-810]
            
            # Add to thread-safe queue  # [NRS-810]
            try:  # [NRS-810]
                # Use put_nowait to avoid blocking the audio thread  # [NRS-810]
                self.input_queue.put_nowait(audio_data.copy())  # [NRS-810]
            except queue.Full:  # [NRS-810]
                # Drop old data if queue is full (prevents memory overflow)  # [NRS-810]
                try:  # [NRS-810]
                    self.input_queue.get_nowait()  # [NRS-810]
                    self.input_queue.put_nowait(audio_data.copy())  # [NRS-810]
                except queue.Empty:  # [NRS-810]
                    pass  # [NRS-810]
            
            # Call user callback if provided (should be fast/non-blocking)  # [NRS-810]
            if self.input_callback:  # [NRS-810]
                try:  # [NRS-810]
                    self.input_callback(audio_data, frames, time, status)  # [NRS-810]
                except Exception as e:  # [NRS-810]
                    logger.error(f"Input callback error: {e}")  # [NRS-810]
        
        try:  # [NRS-810]
            self.input_stream = sd.InputStream(  # [NRS-810]
                samplerate=self.sample_rate,  # [NRS-810]
                channels=self.channels,  # [NRS-810]
                dtype=self.dtype,  # [NRS-810]
                blocksize=self.blocksize,  # [NRS-810]
                device=self.input_device,  # [NRS-810]
                callback=audio_callback  # [NRS-810]
            )  # [NRS-810]
            self.input_stream.start()  # [NRS-810]
            self.is_active = True  # [NRS-810]
            logger.info(f"🎤 Started audio input stream: {self.sample_rate}Hz, {self.channels}ch")  # [NRS-810]
            
        except Exception as e:  # [NRS-810]
            logger.error(f"Failed to start input stream: {e}")  # [NRS-810]
            raise  # [NRS-810]
    
    def start_output_stream(self, callback: Optional[Callable] = None):  # [NRS-810]
        """Start playing audio"""  # [NRS-810]
        self.output_callback = callback  # [NRS-810]
        
        def audio_callback(outdata, frames, time, status):  # [NRS-810]
            if status:  # [NRS-810]
                logger.warning(f"Audio output status: {status}")  # [NRS-810]
            
            try:  # [NRS-810]
                # Get data from queue  # [NRS-810]
                audio_data = self.output_queue.get_nowait()  # [NRS-810]
                
                # Ensure correct shape  # [NRS-810]
                if audio_data.ndim == 1:  # [NRS-810]
                    audio_data = audio_data.reshape(-1, 1)  # [NRS-810]
                
                # Handle length mismatch  # [NRS-810]
                if len(audio_data) < frames:  # [NRS-810]
                    # Pad with zeros  # [NRS-810]
                    padding = np.zeros((frames - len(audio_data), self.channels))  # [NRS-810]
                    audio_data = np.vstack([audio_data, padding])  # [NRS-810]
                elif len(audio_data) > frames:  # [NRS-810]
                    # Truncate  # [NRS-810]
                    audio_data = audio_data[:frames]  # [NRS-810]
                
                outdata[:] = audio_data.astype(np.float32)  # [NRS-810]
                
                if self.output_callback:  # [NRS-810]
                    self.output_callback(outdata, frames, time, status)  # [NRS-810]
                    
            except queue.Empty:  # [NRS-810]
                # Output silence if no data  # [NRS-810]
                outdata.fill(0)  # [NRS-810]
        
        try:  # [NRS-810]
            self.output_stream = sd.OutputStream(  # [NRS-810]
                samplerate=self.sample_rate,  # [NRS-810]
                channels=self.channels,  # [NRS-810]
                dtype=self.dtype,  # [NRS-810]
                blocksize=self.blocksize,  # [NRS-810]
                device=self.output_device,  # [NRS-810]
                callback=audio_callback  # [NRS-810]
            )  # [NRS-810]
            self.output_stream.start()  # [NRS-810]
            logger.info(f"🔊 Started audio output stream: {self.sample_rate}Hz, {self.channels}ch")  # [NRS-810]
            
        except Exception as e:  # [NRS-810]
            logger.error(f"Failed to start output stream: {e}")  # [NRS-810]
            raise  # [NRS-810]
    
    def stop_input_stream(self):  # [NRS-810]
        """Stop recording"""  # [NRS-810]
        if self.input_stream:  # [NRS-810]
            self.input_stream.stop()  # [NRS-810]
            self.input_stream.close()  # [NRS-810]
            self.input_stream = None  # [NRS-810]
            logger.info("🛑 Stopped audio input stream")  # [NRS-810]
    
    def stop_output_stream(self):  # [NRS-810]
        """Stop playback"""  # [NRS-810]
        if self.output_stream:  # [NRS-810]
            self.output_stream.stop()  # [NRS-810]
            self.output_stream.close()  # [NRS-810]
            self.output_stream = None  # [NRS-810]
            logger.info("🛑 Stopped audio output stream")  # [NRS-810]
    
    def stop(self):  # [NRS-810]
        """Stop all streams"""  # [NRS-810]
        self.stop_input_stream()  # [NRS-810]
        self.stop_output_stream()  # [NRS-810]
        self.is_active = False  # [NRS-810]
    
    def read(self, timeout: float = 0.1) -> Optional[np.ndarray]:  # [NRS-810]
        """Read audio data from input stream"""  # [NRS-810]
        try:  # [NRS-810]
            return self.input_queue.get(timeout=timeout)  # [NRS-810]
        except queue.Empty:  # [NRS-810]
            return None  # [NRS-810]
    
    def write(self, data: np.ndarray):  # [NRS-810]
        """Write audio data to output stream"""  # [NRS-810]
        try:  # [NRS-810]
            self.output_queue.put_nowait(data)  # [NRS-810]
        except queue.Full:  # [NRS-810]
            logger.warning("Output queue full, dropping audio data")  # [NRS-810]

class RealAudio:  # [NRS-810]
    """Real audio interface compatible with PyAudio API"""  # [NRS-810]
    
    def __init__(self):  # [NRS-810]
        logger.info("🎵 Initialized Real Audio (sounddevice)")  # [NRS-810]
        
        # List available devices  # [NRS-810]
        try:  # [NRS-810]
            devices = sd.query_devices()  # [NRS-810]
            logger.info(f"Found {len(devices)} audio devices")  # [NRS-810]
            
            # Find default devices  # [NRS-810]
            default_input = sd.default.device[0] if sd.default.device[0] is not None else 0  # [NRS-810]
            default_output = sd.default.device[1] if sd.default.device[1] is not None else 0  # [NRS-810]
            logger.info(f"Default input device: {default_input}, Default output device: {default_output}")  # [NRS-810]
            
        except Exception as e:  # [NRS-810]
            logger.warning(f"Could not query audio devices: {e}")  # [NRS-810]
    
    def open(self, **kwargs) -> AudioStream:  # [NRS-810]
        """Open an audio stream"""  # [NRS-810]
        # Map PyAudio parameters to sounddevice  # [NRS-810]
        sample_rate = kwargs.get('rate', 16000)  # [NRS-810]
        channels = kwargs.get('channels', 1)  # [NRS-810]
        dtype = 'float32'  # sounddevice works best with float32  # [NRS-810]
        blocksize = kwargs.get('frames_per_buffer', 1024)  # [NRS-810]
        input_device = kwargs.get('input_device')  # [NRS-810]
        output_device = kwargs.get('output_device')  # [NRS-810]
        
        return AudioStream(  # [NRS-810]
            sample_rate=sample_rate,  # [NRS-810]
            channels=channels,  # [NRS-810]
            dtype=dtype,  # [NRS-810]
            blocksize=blocksize,  # [NRS-810]
            input_device=input_device,  # [NRS-810]
            output_device=output_device  # [NRS-810]
        )  # [NRS-810]
    
    def get_device_count(self) -> int:  # [NRS-810]
        """Get number of audio devices"""  # [NRS-810]
        try:  # [NRS-810]
            return len(sd.query_devices())  # [NRS-810]
        except Exception:  # [NRS-810]
            return 0  # [NRS-810]
    
    def get_device_info_by_index(self, index: int) -> dict:  # [NRS-810]
        """Get device info by index"""  # [NRS-810]
        try:  # [NRS-810]
            device = sd.query_devices(index)  # [NRS-810]
            return {  # [NRS-810]
                'name': device['name'],  # [NRS-810]
                'maxInputChannels': device['max_input_channels'],  # [NRS-810]
                'maxOutputChannels': device['max_output_channels'],  # [NRS-810]
                'defaultSampleRate': device['default_samplerate']  # [NRS-810]
            }  # [NRS-810]
        except Exception:  # [NRS-810]
            return {  # [NRS-810]
                'name': f'Device {index}',  # [NRS-810]
                'maxInputChannels': 0,  # [NRS-810]
                'maxOutputChannels': 0,  # [NRS-810]
                'defaultSampleRate': 44100  # [NRS-810]
            }  # [NRS-810]
    
    def terminate(self):  # [NRS-810]
        """Clean up audio resources"""  # [NRS-810]
        logger.info("🧹 Audio resources cleaned up")  # [NRS-810]


def test_real_audio():  # [NRS-810]
    """Test the real audio implementation"""  # [NRS-810]
    print("🧪 Testing Real Audio Implementation")  # [NRS-810]
    print("=" * 40)  # [NRS-810]
    
    try:  # [NRS-810]
        # Initialize audio  # [NRS-810]
        audio = RealAudio()  # [NRS-810]
        print("✅ Real audio initialized")  # [NRS-810]
        
        # List devices  # [NRS-810]
        device_count = audio.get_device_count()  # [NRS-810]
        print(f"✅ Found {device_count} audio devices")  # [NRS-810]
        
        for i in range(min(3, device_count)):  # Show first 3 devices  # [NRS-810]
            info = audio.get_device_info_by_index(i)  # [NRS-810]
            print(f"  {i}: {info['name']} (in: {info['maxInputChannels']}, out: {info['maxOutputChannels']})")  # [NRS-810]
        
        # Test stream creation  # [NRS-810]
        stream = audio.open(  # [NRS-810]
            rate=16000,  # [NRS-810]
            channels=1,  # [NRS-810]
            frames_per_buffer=1024  # [NRS-810]
        )  # [NRS-810]
        print("✅ Audio stream created")  # [NRS-810]
        
        # Test very brief recording (0.1 seconds)  # [NRS-810]
        stream.start_input_stream()  # [NRS-810]
        import time  # [NRS-810]
        time.sleep(0.1)  # [NRS-810]
        
        # Try to read some data  # [NRS-810]
        data = stream.read(timeout=0.1)  # [NRS-810]
        if data is not None:  # [NRS-810]
            print(f"✅ Recorded audio: {len(data)} samples, max: {np.max(np.abs(data)):.3f}")  # [NRS-810]
        else:  # [NRS-810]
            print("✅ No audio data (normal for very short test)")  # [NRS-810]
        
        stream.stop()  # [NRS-810]
        audio.terminate()  # [NRS-810]
        print("✅ Real audio test completed!")  # [NRS-810]
        return True  # [NRS-810]
        
    except Exception as e:  # [NRS-810]
        print(f"❌ Real audio test failed: {e}")  # [NRS-810]
        import traceback  # [NRS-810]
        traceback.print_exc()  # [NRS-810]
        return False  # [NRS-810]

if __name__ == "__main__":  # [NRS-810]
    test_real_audio()  # [NRS-810]
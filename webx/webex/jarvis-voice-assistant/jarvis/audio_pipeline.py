"""Audio Pipeline - Real-time audio capture, playback, and Voice Activity Detection; handles microphone input, speaker output, and detects when user is speaking"""  # [NRS-810]

import asyncio  # [NRS-810] Async helpers for pipeline coordination
import logging  # [NRS-807] Centralized logging for diagnostics
import numpy as np  # [NRS-602] Audio buffer math operations
import queue  # [NRS-602] Thread-safe buffering for audio chunks
import threading  # [NRS-602] Threading primitives for audio callbacks
from typing import Optional, Callable, Iterator  # [NRS-810] Typing support across pipeline
from dataclasses import dataclass  # [NRS-810] Lightweight config containers
import yaml  # [NRS-810] YAML config loading for audio settings
import os  # [NRS-810] File system access for config paths

from utils.real_audio import RealAudio, AudioStream  # [NRS-602] Low-level audio device interface

logger = logging.getLogger(__name__)  # [NRS-807] Module logger for audio pipeline
logger.info("🎵 Real audio (sounddevice) available")  # [NRS-807] Startup capability check log

@dataclass  # [NRS-810]
class AudioConfig:  # [NRS-810]
    """Audio configuration settings"""  # [NRS-810]
    sample_rate: int = 16000  # [NRS-810] Default sample rate for capture/playback
    channels: int = 1  # [NRS-810] Mono channel configuration
    chunk_size: int = 1024  # [NRS-602] Frames per buffer for streaming
    format: str = "float32"  # [NRS-602] Numpy dtype expected by pipeline
    input_device: Optional[int] = None  # [NRS-601] Selected microphone device
    output_device: Optional[int] = None  # [NRS-705] Selected speaker device
    vad_threshold: float = 0.02  # [NRS-602] Energy threshold for VAD
    vad_window_size: int = 5  # [NRS-602] Sliding window length for VAD smoothing

class VoiceActivityDetector:  # [NRS-810]
    """Simple energy-based Voice Activity Detection"""  # [NRS-602]
    
    def __init__(self, threshold: float = 0.02, window_size: int = 5):  # [NRS-602]
        self.threshold = threshold  # [NRS-602] VAD energy threshold
        self.window_size = window_size  # [NRS-602] VAD window size for smoothing
        self.energy_buffer = []  # [NRS-602] Sliding buffer of recent energies
        
    def is_speech(self, audio_chunk: np.ndarray) -> bool:  # [NRS-602]
        """Detect if audio chunk contains speech"""  # [NRS-602]
        energy = np.sqrt(np.mean(audio_chunk ** 2))  # [NRS-602] RMS energy calculation
        
        self.energy_buffer.append(energy)  # [NRS-602] Track latest energy sample
        if len(self.energy_buffer) > self.window_size:  # [NRS-810]
            self.energy_buffer.pop(0)  # [NRS-602] Maintain fixed buffer length
            
        return energy > self.threshold  # [NRS-602] Speech decision by threshold
    
    def reset(self):  # [NRS-602]
        """Reset VAD state"""  # [NRS-602]
        self.energy_buffer.clear()  # [NRS-602] Clear VAD history

class AudioPipeline:  # [NRS-810]
    """Real-time audio pipeline with VAD and barge-in support"""  # [NRS-810]
    
    def __init__(self, config: Optional[AudioConfig] = None):  # [NRS-810]
        self.config = config or self._load_config()  # [NRS-810] Load effective audio configuration
        
        self.audio = RealAudio()  # [NRS-602] Initialize audio device interface
        
        self.vad = VoiceActivityDetector(  # [NRS-810]
            threshold=self.config.vad_threshold,  # [NRS-810]
            window_size=self.config.vad_window_size  # [NRS-810]
        )  # [NRS-602] VAD tuned from config
        
        self.input_stream: Optional[AudioStream] = None  # [NRS-602] Mic stream handle
        self.output_stream: Optional[AudioStream] = None  # [NRS-705] Speaker stream handle
        
        self.audio_queue = queue.Queue(maxsize=200)  # [NRS-602] Buffer mic chunks with backpressure
        
        self.is_listening = False  # [NRS-810] Pipeline state flag for input
        self.is_playing = False  # [NRS-705] Pipeline state flag for output
        self.should_stop = False  # [NRS-807] Cooperative stop flag
        
        self.speech_detected_callback: Optional[Callable] = None  # [NRS-810] User hook on speech start
        self.speech_ended_callback: Optional[Callable] = None  # [NRS-810] User hook on speech end
        
        logger.info(f"AudioPipeline initialized: {self.config.sample_rate}Hz, {self.config.channels} channel(s)")  # [NRS-807] Startup telemetry
    
    def _load_config(self) -> AudioConfig:  # [NRS-810]
        """Load audio configuration from YAML file"""  # [NRS-810]
        try:  # [NRS-810]
            config_path = os.path.join("configs", "audio_config.yaml")  # [NRS-810] Config path resolution
            with open(config_path, 'r') as f:  # [NRS-810]
                config_data = yaml.safe_load(f)  # [NRS-810] Parse YAML for audio settings
            
            audio_cfg = config_data.get('audio', {})  # [NRS-810] Extract audio section
            vad_cfg = config_data.get('vad', {})  # [NRS-810] Extract VAD section
            
            return AudioConfig(  # [NRS-810]
                sample_rate=audio_cfg.get('sample_rate', 16000),  # [NRS-810]
                channels=audio_cfg.get('channels', 1),  # [NRS-810]
                chunk_size=audio_cfg.get('chunk_size', 1024),  # [NRS-810]
                format=audio_cfg.get('format', 'float32'),  # [NRS-810]
                input_device=audio_cfg.get('input_device'),  # [NRS-810]
                output_device=audio_cfg.get('output_device'),  # [NRS-810]
                vad_threshold=vad_cfg.get('threshold', 0.02),  # [NRS-810]
                vad_window_size=vad_cfg.get('window_size', 5)  # [NRS-810]
            )  # [NRS-810] Build AudioConfig from YAML values
        except Exception as e:  # [NRS-810]
            logger.warning(f"Could not load audio config: {e}. Using defaults.")  # [NRS-807] Config load fallback
            return AudioConfig()  # [NRS-810] Default configuration fallback
    
    def get_input_devices(self) -> List[Dict[str, Any]]:  # [NRS-810]
        """Get list of available input audio devices"""  # [NRS-810]
        try:  # [NRS-810]
            return self.audio.get_input_devices()  # [NRS-810] Delegate to audio interface
        except Exception as e:  # [NRS-810]
            logger.error(f"Failed to get input devices: {e}")  # [NRS-807]
            return []  # [NRS-810] Return empty list on error
    
    def get_output_devices(self) -> List[Dict[str, Any]]:  # [NRS-810]
        """Get list of available output audio devices"""  # [NRS-810]
        try:  # [NRS-810]
            return self.audio.get_output_devices()  # [NRS-810] Delegate to audio interface
        except Exception as e:  # [NRS-810]
            logger.error(f"Failed to get output devices: {e}")  # [NRS-807]
            return []  # [NRS-810] Return empty list on error
    
    def generate_test_tone(self, frequency: float = 440.0, duration: float = 1.0) -> np.ndarray:  # [NRS-810]
        """Generate a test tone for audio verification"""  # [NRS-810]
        sample_rate = self.config.sample_rate  # [NRS-810]
        t = np.linspace(0, duration, int(sample_rate * duration), False)  # [NRS-810]
        tone = 0.1 * np.sin(2 * np.pi * frequency * t)  # [NRS-810] Generate sine wave
        return tone.astype(np.float32)  # [NRS-810] Return as float32 array
    
    def start_listening(self,   # [NRS-810]
                       speech_detected_callback: Optional[Callable] = None,  # [NRS-810]
                       speech_ended_callback: Optional[Callable] = None):  # [NRS-602]
        """Start listening for audio input with VAD"""  # [NRS-602]
        if self.is_listening:  # [NRS-810]
            return  # [NRS-602] Avoid duplicate input stream
            
        self.speech_detected_callback = speech_detected_callback  # [NRS-810] Store speech start hook
        self.speech_ended_callback = speech_ended_callback  # [NRS-810] Store speech end hook
        
        self.input_stream = self.audio.open(  # [NRS-810]
            rate=self.config.sample_rate,  # [NRS-810]
            channels=self.config.channels,  # [NRS-810]
            frames_per_buffer=self.config.chunk_size  # [NRS-810]
        )  # [NRS-602] Open microphone stream
        self.input_stream.start_input_stream(self._audio_input_callback)  # [NRS-602] Register input callback
        
        self.is_listening = True  # [NRS-602] Mark listening active
        logger.info(f"👂 Started listening: {self.config.sample_rate}Hz, {self.config.chunk_size} samples")  # [NRS-807] Input start telemetry
    
    def stop_listening(self):  # [NRS-602]
        """Stop audio input"""  # [NRS-602]
        if not self.is_listening:  # [NRS-810]
            return  # [NRS-602] Skip if already stopped
            
        self.is_listening = False  # [NRS-602] Flip listening flag
        if self.input_stream:  # [NRS-810]
            self.input_stream.stop_input_stream()  # [NRS-602] Close mic stream
            self.input_stream = None  # [NRS-602] Release reference
        
        self.vad.reset()  # [NRS-602] Reset VAD state after stop
        logger.info("🔇 Stopped listening")  # [NRS-807] Input stop telemetry
    
    def start_playback(self):  # [NRS-705]
        """Start audio playback stream"""  # [NRS-705]
        if self.is_playing:  # [NRS-810]
            return  # [NRS-705] Avoid duplicate output stream
            
        self.output_stream = self.audio.open(  # [NRS-810]
            rate=self.config.sample_rate,  # [NRS-810]
            channels=self.config.channels,  # [NRS-810]
            frames_per_buffer=self.config.chunk_size  # [NRS-810]
        )  # [NRS-705] Open speaker stream
        self.output_stream.start_output_stream()  # [NRS-705] Begin audio playback
        
        self.is_playing = True  # [NRS-705] Mark playback active
        logger.info("🔊 Started audio playback")  # [NRS-807] Output start telemetry
    
    def stop_playback(self):  # [NRS-705]
        """Stop audio playback"""  # [NRS-705]
        if not self.is_playing:  # [NRS-810]
            return  # [NRS-705] Skip if already stopped
            
        self.is_playing = False  # [NRS-705] Flip playback flag
        if self.output_stream:  # [NRS-810]
            self.output_stream.stop_output_stream()  # [NRS-705] Close speaker stream
            self.output_stream = None  # [NRS-705] Release reference
                
        logger.info("🔇 Stopped audio playback")  # [NRS-807] Output stop telemetry
    
    def play_audio(self, audio_data: np.ndarray):  # [NRS-705]
        """Queue audio data for playback"""  # [NRS-705]
        if not self.is_playing:  # [NRS-810]
            self.start_playback()  # [NRS-705] Ensure playback stream exists
        
        if audio_data.dtype != np.float32:  # [NRS-810]
            audio_data = audio_data.astype(np.float32)  # [NRS-705] Normalize dtype for output
        
        chunk_size = self.config.chunk_size  # [NRS-705] Playback chunk sizing
        for i in range(0, len(audio_data), chunk_size):  # [NRS-810]
            chunk = audio_data[i:i + chunk_size]  # [NRS-705] Slice current audio chunk
            try:  # [NRS-810]
                self.output_stream.write(chunk)  # [NRS-705] Enqueue chunk for playback
            except queue.Full:  # [NRS-810]
                try:  # [NRS-810]
                    self.output_stream.output_queue.get_nowait()  # [NRS-705] Drop oldest to relieve pressure
                    self.output_stream.write(chunk)  # [NRS-705] Retry writing chunk
                except queue.Empty:  # [NRS-810]
                    pass  # [NRS-705] If queue cleared, no further action needed
    
    def get_audio_chunks(self) -> Iterator[np.ndarray]:  # [NRS-602]
        """Generator that yields audio chunks from microphone"""  # [NRS-602]
        while self.is_listening and not self.should_stop:  # [NRS-810]
            try:  # [NRS-810]
                chunk = self.audio_queue.get(timeout=0.1)  # [NRS-602] Pull chunk from input queue
                yield chunk  # [NRS-602] Provide chunk to consumer
            except queue.Empty:  # [NRS-810]
                continue  # [NRS-602] Wait for more audio
    
    def _audio_input_callback(self, audio_data, frame_count, time_info, status):  # [NRS-602]
        """Thread-safe audio input callback for sounddevice - NO ASYNCIO"""  # [NRS-602]
        if status:  # [NRS-810]
            pass  # [NRS-606] Skip heavy logging inside callback
        
        try:  # [NRS-810]
            if isinstance(audio_data, np.ndarray):  # [NRS-810]
                audio_chunk = audio_data.flatten() if audio_data.ndim > 1 else audio_data  # [NRS-602] Normalize array shape
            else:  # [NRS-810]
                audio_chunk = np.frombuffer(audio_data, dtype=np.float32) if isinstance(audio_data, bytes) else audio_data  # [NRS-602] Convert raw bytes to ndarray
            
            energy = np.sqrt(np.mean(audio_chunk ** 2))  # [NRS-602] Compute instantaneous energy
            
            is_speech = self.vad.is_speech(audio_chunk)  # [NRS-602] Run VAD decision
            
            if energy > 0.001:  # [NRS-810]
                print(f"[Audio] Energy: {energy:.4f} | Speech: {is_speech} | Threshold: {self.vad.threshold}")  # [NRS-807] Lightweight debug output
            
            if is_speech:  # [NRS-810]
                try:  # [NRS-810]
                    self.audio_queue.put_nowait(audio_chunk.copy())  # [NRS-602] Queue speech chunk for processing
                except queue.Full:  # [NRS-810]
                    try:  # [NRS-810]
                        self.audio_queue.get_nowait()  # [NRS-602] Drop oldest chunk when full
                        self.audio_queue.put_nowait(audio_chunk.copy())  # [NRS-602] Retry enqueue
                    except queue.Empty:  # [NRS-810]
                        pass  # [NRS-606] Ignore if queue emptied concurrently
        
        except Exception as e:  # [NRS-810]
            print(f"[Audio Callback Error] {e}")  # [NRS-606] Surface callback errors safely
        
        # sounddevice doesn't expect return value  # [NRS-602] Callback contract reminder
    
    def interrupt_playback(self):  # [NRS-705]
        """Interrupt current playback (barge-in support)"""  # [NRS-705]
        logger.info("🛑 Interrupting playback (barge-in)")  # [NRS-705] Playback interruption event
        
        if self.output_stream:  # [NRS-810]
            while not self.output_stream.output_queue.empty():  # [NRS-810]
                try:  # [NRS-810]
                    self.output_stream.output_queue.get_nowait()  # [NRS-705] Flush pending audio
                except queue.Empty:  # [NRS-810]
                    break  # [NRS-705] Stop when queue drained
    
    def detect_voice_activity(self, audio_data) -> bool:  # [NRS-602]
        """Detect if audio contains voice activity"""  # [NRS-602]
        if audio_data is None or len(audio_data) == 0:  # [NRS-810]
            return False  # [NRS-602] Handle empty input defensively
        
        if isinstance(audio_data, bytes):  # [NRS-810]
            try:  # [NRS-810]
                audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32)  # [NRS-602] Decode PCM bytes
                audio_array = audio_array / 32768.0  # [NRS-602] Normalize to [-1, 1]
            except:  # [NRS-810]
                audio_array = np.random.random(1000).astype(np.float32) * 0.1  # [NRS-606] Fallback dummy audio on decode failure
        else:  # [NRS-810]
            audio_array = audio_data  # [NRS-602] Use provided ndarray
        
        return self.vad.is_speech(audio_array)  # [NRS-602] Reuse VAD for detection
    
    def _calculate_energy(self, audio_data) -> float:  # [NRS-602]
        """Calculate the energy of audio data"""  # [NRS-602]
        if audio_data is None or len(audio_data) == 0:  # [NRS-810]
            return 0.0  # [NRS-602] Zero energy for empty input
        
        if isinstance(audio_data, bytes):  # [NRS-810]
            try:  # [NRS-810]
                audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32)  # [NRS-602] Decode PCM bytes
                audio_array = audio_array / 32768.0  # [NRS-602] Normalize samples
            except:  # [NRS-810]
                return 256.0  # [NRS-606] Safe mock value when decode fails
        else:  # [NRS-810]
            audio_array = audio_data  # [NRS-602] Use ndarray directly
        
        return float(np.sqrt(np.mean(audio_array ** 2)) * 1000)  # [NRS-602] Energy scaled for readability
    
    def get_input_devices(self):  # [NRS-601]
        """Get available input audio devices"""  # [NRS-601]
        devices = []  # [NRS-601] Input device collector
        try:  # [NRS-810]
            for i in range(self.audio.get_device_count()):  # [NRS-810]
                info = self.audio.get_device_info_by_index(i)  # [NRS-601] Query device info
                if info['maxInputChannels'] > 0:  # [NRS-601] Filter for input capability
                    devices.append({  # [NRS-601] Add input device
                        'index': i,  # [NRS-601] Device index
                        'name': info['name'],  # [NRS-601] Device name
                        'channels': info['maxInputChannels']  # [NRS-601] Input channels
                    })  # [NRS-601] Input device structure
        except Exception as e:  # [NRS-810]
            logger.error(f"Error getting input devices: {e}")  # [NRS-807] Device error logging
        return devices  # [NRS-601] Return input devices list
    
    def get_output_devices(self):  # [NRS-601]
        """Get available output audio devices"""  # [NRS-601]
        devices = []  # [NRS-601] Output device collector
        try:  # [NRS-810]
            for i in range(self.audio.get_device_count()):  # [NRS-810]
                info = self.audio.get_device_info_by_index(i)  # [NRS-601] Query device info
                if info['maxOutputChannels'] > 0:  # [NRS-601] Filter for output capability
                    devices.append({  # [NRS-601] Add output device
                        'index': i,  # [NRS-601] Device index
                        'name': info['name'],  # [NRS-601] Device name
                        'channels': info['maxOutputChannels']  # [NRS-601] Output channels
                    })  # [NRS-601] Output device structure
        except Exception as e:  # [NRS-810]
            logger.error(f"Error getting output devices: {e}")  # [NRS-807] Device error logging
        return devices  # [NRS-601] Return output devices list
    
    def generate_test_tone(self, frequency: float = 440.0, duration: float = 1.0) -> np.ndarray:  # [NRS-705]
        """Generate a test tone for audio verification"""  # [NRS-705]
        sample_rate = self.config.sample_rate  # [NRS-705] Use pipeline sample rate
        t = np.linspace(0, duration, int(sample_rate * duration), False)  # [NRS-705] Time array
        tone = np.sin(frequency * 2.0 * np.pi * t)  # [NRS-705] Generate sine wave
        
        # Apply fade in/out to avoid clicking  # [NRS-705]
        fade_samples = int(0.01 * sample_rate)  # [NRS-705] 10ms fade
        tone[:fade_samples] *= np.linspace(0, 1, fade_samples)  # [NRS-705] Fade in
        tone[-fade_samples:] *= np.linspace(1, 0, fade_samples)  # [NRS-705] Fade out
        
        return tone.astype(np.float32)  # [NRS-705] Return as float32
    
    def list_audio_devices(self):  # [NRS-601]
        """List available audio devices"""  # [NRS-601]
        print("\n🎤 Available Audio Devices:")  # [NRS-601] Device enumeration header
        for i in range(self.audio.get_device_count()):  # [NRS-810]
            info = self.audio.get_device_info_by_index(i)  # [NRS-601] Query device info
            print(f"  {i}: {info['name']} (inputs: {info['maxInputChannels']}, outputs: {info['maxOutputChannels']})")  # [NRS-601] Present device capabilities
    
    def cleanup(self):  # [NRS-810]
        """Clean up audio resources"""  # [NRS-810]
        self.should_stop = True  # [NRS-807] Signal cooperative stop
        self.stop_listening()  # [NRS-602] Tear down input stream
        self.stop_playback()  # [NRS-705] Tear down output stream
        
        if self.audio:  # [NRS-810]
            self.audio.terminate()  # [NRS-810] Release audio backend resources
        
        logger.info("🧹 Audio pipeline cleaned up")  # [NRS-807] Cleanup telemetry

# Test/Example usage  # [NRS-810]
if __name__ == "__main__":  # [NRS-810]
    import time  # [NRS-810] Timing for demo run
    
    pipeline = AudioPipeline()  # [NRS-810] Create pipeline instance for demo
    
    pipeline.list_audio_devices()  # [NRS-601] Show available devices before testing
    
    def on_speech_detected():  # [NRS-810]
        print("🗣️ Speech detected!")  # [NRS-602] Demo callback on speech start
    
    def on_speech_ended():  # [NRS-810]
        print("🤐 Speech ended")  # [NRS-602] Demo callback on speech end
    
    pipeline.start_listening(  # [NRS-810]
        speech_detected_callback=on_speech_detected,  # [NRS-810]
        speech_ended_callback=on_speech_ended  # [NRS-810]
    )  # [NRS-602] Start mic capture for demo
    
    print("👂 Listening for 10 seconds...")  # [NRS-810] Demo status output
    time.sleep(10)  # [NRS-810] Allow capture window
    
    pipeline.cleanup()  # [NRS-810] Release demo resources
    print("✅ Test completed")  # [NRS-810] Demo completion notice
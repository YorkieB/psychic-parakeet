"""
Audio Processing Utilities
Advanced audio processing functions for Jarvis
"""  # [NRS-810]

import warnings  # [NRS-810] Suppress audio warnings
warnings.filterwarnings('ignore')  # [NRS-810] Prevent popup errors

import numpy as np  # [NRS-602] Audio array operations
import logging  # [NRS-807] Logging utilities
from typing import Optional, Tuple, List  # [NRS-607] Type hints for optimization
import struct  # [NRS-603] Binary audio format conversion
import math  # [NRS-602] Audio calculations
import os  # [NRS-810] Environment configuration

# Suppress CFFI callback errors and other audio warnings  # [NRS-810]
os.environ['PYTHONWARNINGS'] = 'ignore'  # [NRS-810]

logger = logging.getLogger(__name__)  # [NRS-807] Module logger

class AudioProcessor:  # [NRS-810]
    """Advanced audio processing utilities"""  # [NRS-810]
    
    def __init__(self, sample_rate: int = 16000, channels: int = 1):  # [NRS-810]
        self.sample_rate = sample_rate  # [NRS-602] Audio sample rate
        self.channels = channels  # [NRS-602] Audio channel count
    
    def detect_voice_activity(self,   # [NRS-810]
                            audio_data: bytes,   # [NRS-810]
                            energy_threshold: float = 0.01,  # [NRS-810]
                            frame_length_ms: int = 30) -> bool:  # [NRS-810]
        """
        Detect voice activity in audio data
        
        Args:
            audio_data: Raw audio bytes
            energy_threshold: Energy threshold for voice detection
            frame_length_ms: Frame length in milliseconds
            
        Returns:
            True if voice activity detected
        """  # [NRS-810]
        try:  # [NRS-810]
            # Convert bytes to numpy array  # [NRS-810]
            audio_array = np.frombuffer(audio_data, dtype=np.int16)  # [NRS-810]
            
            # Calculate frame size  # [NRS-810]
            frame_size = int(self.sample_rate * frame_length_ms / 1000)  # [NRS-602] Frame size in samples
            
            # Process in frames  # [NRS-810]
            num_frames = len(audio_array) // frame_size  # [NRS-607] Calculate frame count
            
            voice_frames = 0  # [NRS-602] Voice frame counter
            for i in range(num_frames):  # [NRS-810]
                start_idx = i * frame_size  # [NRS-607] Frame start index
                end_idx = start_idx + frame_size  # [NRS-607] Frame end index
                frame = audio_array[start_idx:end_idx]  # [NRS-602] Extract audio frame
                
                # Calculate energy for this frame  # [NRS-810]
                energy = self._calculate_energy(frame)  # [NRS-602] Frame energy calculation
                
                if energy > energy_threshold:  # [NRS-810]
                    voice_frames += 1  # [NRS-602] Increment voice frame count
            
            # Voice detected if significant portion has energy  # [NRS-810]
            voice_ratio = voice_frames / max(num_frames, 1)  # [NRS-602] Calculate voice ratio
            return voice_ratio > 0.3  # [NRS-602] 30% threshold for voice detection
            
        except Exception as e:  # [NRS-810]
            logger.error(f"Voice activity detection failed: {e}")  # [NRS-810]
            return False  # [NRS-810]
    
    def _calculate_energy(self, audio_array: np.ndarray) -> float:  # [NRS-810]
        """Calculate RMS energy of audio array"""  # [NRS-810]
        if len(audio_array) == 0:  # [NRS-810]
            return 0.0  # [NRS-602] Handle empty array
        
        # Convert to float and normalize  # [NRS-810]
        audio_float = audio_array.astype(np.float32) / 32768.0  # [NRS-603] Normalize to -1.0 to 1.0 range
        
        # Calculate RMS  # [NRS-810]
        rms = np.sqrt(np.mean(audio_float ** 2))  # [NRS-602] Root mean square energy
        return float(rms)  # [NRS-602] Return energy value
    
    def remove_silence(self,   # [NRS-810]
                      audio_data: bytes,  # [NRS-810]
                      silence_threshold: float = 0.01,  # [NRS-810]
                      _: int = 200) -> bytes:  # [NRS-810]
        """
        Remove silence from audio data
        
        Args:
            audio_data: Raw audio bytes
            silence_threshold: Energy threshold for silence detection
            min_silence_duration_ms: Minimum silence duration to remove
            
        Returns:
            Audio data with silence removed
        """  # [NRS-810]
        try:  # [NRS-810]
            # Convert to numpy array  # [NRS-810]
            audio_array = np.frombuffer(audio_data, dtype=np.int16)  # [NRS-603] Bytes to array conversion
            
            # Frame processing  # [NRS-810]
            frame_length = int(self.sample_rate * 0.02)  # [NRS-602] 20ms frames
            hop_length = frame_length // 2  # [NRS-607] 50% overlap for smooth processing
            
            # Find non-silent frames  # [NRS-810]
            non_silent_frames = []  # [NRS-602] Voice frame buffer
            
            for i in range(0, len(audio_array) - frame_length, hop_length):  # [NRS-810]
                frame = audio_array[i:i + frame_length]  # [NRS-602] Extract frame
                energy = self._calculate_energy(frame)  # [NRS-602] Calculate frame energy
                
                if energy > silence_threshold:  # [NRS-810]
                    non_silent_frames.append(frame)  # [NRS-602] Keep non-silent frame
            
            if non_silent_frames:  # [NRS-810]
                # Concatenate non-silent frames  # [NRS-810]
                processed_audio = np.concatenate(non_silent_frames)  # [NRS-602] Merge frames
                return processed_audio.tobytes()  # [NRS-603] Convert back to bytes
            else:  # [NRS-810]
                return audio_data  # [NRS-602] No voice found, return original
                
        except Exception as e:  # [NRS-810]
            logger.error(f"Silence removal failed: {e}")  # [NRS-810]
            return audio_data  # [NRS-810]
    
    def normalize_volume(self,   # [NRS-810]
                        audio_data: bytes,  # [NRS-810]
                        target_level: float = 0.7) -> bytes:  # [NRS-810]
        """
        Normalize audio volume to target level
        
        Args:
            audio_data: Raw audio bytes
            target_level: Target volume level (0.0 to 1.0)
            
        Returns:
            Volume-normalized audio data
        """  # [NRS-810]
        try:  # [NRS-810]
            # Convert to numpy array  # [NRS-810]
            audio_array = np.frombuffer(audio_data, dtype=np.int16)  # [NRS-603] Bytes to array conversion
            
            # Find peak level  # [NRS-810]
            max_val = np.max(np.abs(audio_array))  # [NRS-603] Find peak amplitude
            if max_val == 0:  # [NRS-810]
                return audio_data  # [NRS-603] Avoid division by zero on silence
            
            # Calculate scaling factor  # [NRS-810]
            scale_factor = (target_level * 32767) / max_val  # [NRS-603] Normalization ratio
            
            # Apply scaling and clip to prevent overflow  # [NRS-810]
            normalized = np.clip(audio_array * scale_factor, -32768, 32767)  # [NRS-603] Scale and prevent clipping
            
            return normalized.astype(np.int16).tobytes()  # [NRS-603] Convert back to bytes
            
        except Exception as e:  # [NRS-810]
            logger.error(f"Volume normalization failed: {e}")  # [NRS-810]
            return audio_data  # [NRS-810]
    
    def apply_noise_gate(self,  # [NRS-810]
                        audio_data: bytes,  # [NRS-810]
                        threshold: float = 0.005,  # [NRS-810]
                        ratio: float = 10.0,  # [NRS-810]
                        attack_time_ms: float = 1.0,  # [NRS-810]
                        release_time_ms: float = 100.0) -> bytes:  # [NRS-810]
        """
        Apply noise gate to reduce background noise
        
        Args:
            audio_data: Raw audio bytes
            threshold: Gate threshold
            ratio: Compression ratio
            attack_time_ms: Attack time in milliseconds
            release_time_ms: Release time in milliseconds
            
        Returns:
            Noise-gated audio data
        """  # [NRS-810]
        try:  # [NRS-810]
            # Convert to numpy array  # [NRS-810]
            audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32)  # [NRS-810]
            audio_array /= 32768.0  # Normalize to [-1, 1]  # [NRS-810]
            
            # Calculate envelope  # [NRS-810]
            envelope = np.abs(audio_array)  # [NRS-810]
            
            # Smooth envelope  # [NRS-810]
            alpha_attack = 1.0 - np.exp(-1.0 / (self.sample_rate * attack_time_ms / 1000.0))  # [NRS-810]
            alpha_release = 1.0 - np.exp(-1.0 / (self.sample_rate * release_time_ms / 1000.0))  # [NRS-810]
            
            smoothed_envelope = np.zeros_like(envelope)  # [NRS-810]
            smoothed_envelope[0] = envelope[0]  # [NRS-810]
            
            for i in range(1, len(envelope)):  # [NRS-810]
                if envelope[i] > smoothed_envelope[i-1]:  # [NRS-810]
                    # Attack  # [NRS-810]
                    alpha = alpha_attack  # [NRS-810]
                else:  # [NRS-810]
                    # Release  # [NRS-810]
                    alpha = alpha_release  # [NRS-810]
                
                smoothed_envelope[i] = (1 - alpha) * smoothed_envelope[i-1] + alpha * envelope[i]  # [NRS-810]
            
            # Apply gate  # [NRS-810]
            gate_gain = np.where(smoothed_envelope > threshold, 1.0, smoothed_envelope / threshold / ratio)  # [NRS-810]
            gated_audio = audio_array * gate_gain  # [NRS-810]
            
            # Convert back to int16  # [NRS-810]
            gated_audio *= 32767  # [NRS-810]
            gated_audio = np.clip(gated_audio, -32768, 32767)  # [NRS-810]
            
            return gated_audio.astype(np.int16).tobytes()  # [NRS-810]
            
        except Exception as e:  # [NRS-810]
            logger.error(f"Noise gate application failed: {e}")  # [NRS-810]
            return audio_data  # [NRS-810]
    
    def detect_clipping(self, audio_data: bytes, threshold: float = 0.95) -> bool:  # [NRS-810]
        """
        Detect audio clipping
        
        Args:
            audio_data: Raw audio bytes
            threshold: Clipping detection threshold (0.0 to 1.0)
            
        Returns:
            True if clipping detected
        """  # [NRS-810]
        try:  # [NRS-810]
            # Convert to numpy array  # [NRS-810]
            audio_array = np.frombuffer(audio_data, dtype=np.int16)  # [NRS-810]
            
            # Normalize to [-1, 1]  # [NRS-810]
            normalized = audio_array.astype(np.float32) / 32768.0  # [NRS-810]
            
            # Check for clipping  # [NRS-810]
            clipped_samples = np.sum(np.abs(normalized) > threshold)  # [NRS-810]
            clipping_ratio = clipped_samples / len(normalized)  # [NRS-810]
            
            return clipping_ratio > 0.01  # 1% clipping threshold  # [NRS-810]
            
        except Exception as e:  # [NRS-810]
            logger.error(f"Clipping detection failed: {e}")  # [NRS-810]
            return False  # [NRS-810]
    
    def get_audio_stats(self, audio_data: bytes) -> dict:  # [NRS-810]
        """
        Get comprehensive audio statistics
        
        Args:
            audio_data: Raw audio bytes
            
        Returns:
            Dictionary with audio statistics
        """  # [NRS-810]
        try:  # [NRS-810]
            # Convert to numpy array  # [NRS-810]
            audio_array = np.frombuffer(audio_data, dtype=np.int16)  # [NRS-810]
            audio_float = audio_array.astype(np.float32) / 32768.0  # [NRS-810]
            
            # Calculate statistics  # [NRS-810]
            stats = {  # [NRS-810]
                'duration_seconds': len(audio_array) / self.sample_rate,  # [NRS-810]
                'sample_count': len(audio_array),  # [NRS-810]
                'rms_energy': float(np.sqrt(np.mean(audio_float ** 2))),  # [NRS-810]
                'peak_amplitude': float(np.max(np.abs(audio_float))),  # [NRS-810]
                'dynamic_range': float(np.max(audio_float) - np.min(audio_float)),  # [NRS-810]
                'zero_crossings': self._count_zero_crossings(audio_float),  # [NRS-810]
                'spectral_centroid': self._calculate_spectral_centroid(audio_float),  # [NRS-810]
                'has_clipping': self.detect_clipping(audio_data)  # [NRS-810]
            }  # [NRS-810]
            
            return stats  # [NRS-810]
            
        except Exception as e:  # [NRS-810]
            logger.error(f"Audio statistics calculation failed: {e}")  # [NRS-810]
            return {}  # [NRS-810]
    
    def _count_zero_crossings(self, audio_array: np.ndarray) -> int:  # [NRS-810]
        """Count zero crossings in audio signal"""  # [NRS-810]
        try:  # [NRS-810]
            zero_crossings = np.sum(np.diff(np.signbit(audio_array)))  # [NRS-810]
            return int(zero_crossings)  # [NRS-810]
        except:  # [NRS-810]
            return 0  # [NRS-810]
    
    def _calculate_spectral_centroid(self, audio_array: np.ndarray) -> float:  # [NRS-810]
        """Calculate spectral centroid (brightness measure)"""  # [NRS-810]
        try:  # [NRS-810]
            # Simple spectral centroid using FFT  # [NRS-810]
            fft = np.fft.fft(audio_array)  # [NRS-810]
            magnitude = np.abs(fft[:len(fft)//2])  # [NRS-810]
            
            freqs = np.fft.fftfreq(len(audio_array), 1/self.sample_rate)[:len(magnitude)]  # [NRS-810]
            
            # Calculate weighted average frequency  # [NRS-810]
            if np.sum(magnitude) > 0:  # [NRS-810]
                centroid = np.sum(freqs * magnitude) / np.sum(magnitude)  # [NRS-810]
                return float(centroid)  # [NRS-810]
            else:  # [NRS-810]
                return 0.0  # [NRS-810]
                
        except:  # [NRS-810]
            return 0.0  # [NRS-810]

class AudioBuffer:  # [NRS-810]
    """Circular buffer for audio data"""  # [NRS-810]
    
    def __init__(self, max_duration_seconds: float = 10.0, sample_rate: int = 16000):  # [NRS-810]
        self.sample_rate = sample_rate  # [NRS-810]
        self.max_samples = int(max_duration_seconds * sample_rate)  # [NRS-810]
        self.buffer = np.zeros(self.max_samples, dtype=np.int16)  # [NRS-810]
        self.write_pos = 0  # [NRS-810]
        self.samples_written = 0  # [NRS-810]
    
    def write(self, audio_data: bytes):  # [NRS-810]
        """Write audio data to buffer"""  # [NRS-810]
        try:  # [NRS-810]
            # Convert bytes to numpy array  # [NRS-810]
            audio_array = np.frombuffer(audio_data, dtype=np.int16)  # [NRS-810]
            
            for sample in audio_array:  # [NRS-810]
                self.buffer[self.write_pos] = sample  # [NRS-810]
                self.write_pos = (self.write_pos + 1) % self.max_samples  # [NRS-810]
                self.samples_written += 1  # [NRS-810]
        
        except Exception as e:  # [NRS-810]
            logger.error(f"Buffer write error: {e}")  # [NRS-810]
    
    def read_last_seconds(self, seconds: float) -> bytes:  # [NRS-810]
        """Read last N seconds from buffer"""  # [NRS-810]
        try:  # [NRS-810]
            samples_to_read = int(seconds * self.sample_rate)  # [NRS-810]
            samples_to_read = min(samples_to_read, self.samples_written, self.max_samples)  # [NRS-810]
            
            if samples_to_read == 0:  # [NRS-810]
                return b''  # [NRS-810]
            
            # Calculate read position  # [NRS-810]
            read_pos = (self.write_pos - samples_to_read) % self.max_samples  # [NRS-810]
            
            if read_pos + samples_to_read <= self.max_samples:  # [NRS-810]
                # Continuous read  # [NRS-810]
                data = self.buffer[read_pos:read_pos + samples_to_read]  # [NRS-810]
            else:  # [NRS-810]
                # Wrapped read  # [NRS-810]
                part1 = self.buffer[read_pos:]  # [NRS-810]
                part2 = self.buffer[:samples_to_read - len(part1)]  # [NRS-810]
                data = np.concatenate([part1, part2])  # [NRS-810]
            
            return data.tobytes()  # [NRS-810]
            
        except Exception as e:  # [NRS-810]
            logger.error(f"Buffer read error: {e}")  # [NRS-810]
            return b''  # [NRS-810]
    
    def clear(self):  # [NRS-810]
        """Clear the buffer"""  # [NRS-810]
        self.buffer.fill(0)  # [NRS-810]
        self.write_pos = 0  # [NRS-810]
        self.samples_written = 0  # [NRS-810]
    
    def get_fill_ratio(self) -> float:  # [NRS-810]
        """Get buffer fill ratio (0.0 to 1.0)"""  # [NRS-810]
        return min(self.samples_written / self.max_samples, 1.0)  # [NRS-810]

# Export classes  # [NRS-810]
__all__ = ['AudioProcessor', 'AudioBuffer']  # [NRS-810]
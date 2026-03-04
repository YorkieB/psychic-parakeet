"""
Utility Functions for Jarvis Voice Assistant
Common helper functions and utilities
"""  # [NRS-810]

import os  # [NRS-810] File system operations
import re  # [NRS-801] Text pattern matching
import json  # [NRS-810] JSON handling
import yaml  # [NRS-810] Config file loading
import logging  # [NRS-807] Logging utilities
import asyncio  # [NRS-810] Async operations
from typing import Dict, List, Optional, Any, Tuple  # [NRS-810] Type hints
from pathlib import Path  # [NRS-810] Path manipulation
import hashlib  # [NRS-810] File hashing
from datetime import datetime, timedelta  # [NRS-804] Timestamp handling

logger = logging.getLogger(__name__)  # [NRS-807] Module logger

class ConfigManager:  # [NRS-810]
    """Manage configuration files and settings"""  # [NRS-810]
    
    def __init__(self, config_dir: str = "configs"):  # [NRS-810]
        self.config_dir = Path(config_dir)  # [NRS-810] Config directory path
        self._configs: Dict[str, Any] = {}  # [NRS-810] Cached configs
    
    def load_config(self, config_name: str) -> Dict[str, Any]:  # [NRS-810]
        """Load configuration from YAML file"""  # [NRS-810]
        if config_name in self._configs:  # [NRS-810]
            return self._configs[config_name]  # [NRS-810] Return cached config
        
        config_file = self.config_dir / f"{config_name}.yaml"  # [NRS-810] Build config file path
        
        if not config_file.exists():  # [NRS-810]
            logger.warning(f"Config file not found: {config_file}")  # [NRS-807] Missing config warning
            return {}  # [NRS-810] Return empty config
        
        try:  # [NRS-810]
            with open(config_file, 'r', encoding='utf-8') as f:  # [NRS-810]
                config = yaml.safe_load(f) or {}  # [NRS-810] Parse YAML file
            
            self._configs[config_name] = config  # [NRS-810] Cache config
            logger.info(f"✅ Loaded config: {config_name}")  # [NRS-807] Load success log
            return config  # [NRS-810] Return config dict
            
        except Exception as e:  # [NRS-810]
            logger.error(f"Failed to load config {config_name}: {e}")  # [NRS-810]
            return {}  # [NRS-810]
    
    def save_config(self, config_name: str, config_data: Dict[str, Any]) -> bool:  # [NRS-810]
        """Save configuration to YAML file"""  # [NRS-810]
        config_file = self.config_dir / f"{config_name}.yaml"  # [NRS-810] Build config file path
        
        try:  # [NRS-810]
            # Ensure directory exists  # [NRS-810]
            config_file.parent.mkdir(parents=True, exist_ok=True)  # [NRS-810] Create directory if needed
            
            with open(config_file, 'w', encoding='utf-8') as f:  # [NRS-810]
                yaml.dump(config_data, f, default_flow_style=False, indent=2)  # [NRS-810] Write YAML
            
            self._configs[config_name] = config_data  # [NRS-810] Update cache
            logger.info(f"✅ Saved config: {config_name}")  # [NRS-807] Save success log
            return True  # [NRS-810] Success indicator
            
        except Exception as e:  # [NRS-810]
            logger.error(f"Failed to save config {config_name}: {e}")  # [NRS-810]
            return False  # [NRS-810]
    
    def get_setting(self, config_name: str, key_path: str, default: Any = None) -> Any:  # [NRS-810]
        """Get nested configuration setting using dot notation"""  # [NRS-810]
        config = self.load_config(config_name)  # [NRS-810] Load config file
        
        keys = key_path.split('.')  # [NRS-810] Parse dot notation
        value = config  # [NRS-810] Start with root config
        
        try:  # [NRS-810]
            for key in keys:  # [NRS-810]
                value = value[key]  # [NRS-810] Traverse nested structure
            return value  # [NRS-810] Return found value
        except (KeyError, TypeError):  # [NRS-810]
            return default  # [NRS-810] Return default on missing key

class AudioUtils:  # [NRS-810]
    """Audio processing utilities"""  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def calculate_audio_energy(audio_data) -> float:  # [NRS-810]
        """Calculate energy/volume of audio data"""  # [NRS-810]
        try:  # [NRS-810]
            import numpy as np  # [NRS-602] Import for audio operations
            
            if isinstance(audio_data, bytes):  # [NRS-810]
                # Convert bytes to numpy array  # [NRS-810]
                audio_array = np.frombuffer(audio_data, dtype=np.int16)  # [NRS-603] Bytes to array
            else:  # [NRS-810]
                audio_array = audio_data  # [NRS-602] Use existing array
            
            # Calculate RMS energy  # [NRS-810]
            energy = np.sqrt(np.mean(audio_array.astype(np.float64) ** 2))  # [NRS-602] RMS calculation
            return float(energy)  # [NRS-602] Return energy value
            
        except Exception as e:  # [NRS-810]
            logger.error(f"Error calculating audio energy: {e}")  # [NRS-810]
            return 0.0  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def normalize_audio(audio_data, target_level: float = 0.7) -> bytes:  # [NRS-810]
        """Normalize audio volume to target level"""  # [NRS-810]
        try:  # [NRS-810]
            import numpy as np  # [NRS-810]
            
            # Convert to numpy array  # [NRS-810]
            audio_array = np.frombuffer(audio_data, dtype=np.int16)  # [NRS-810]
            
            # Calculate current max level  # [NRS-810]
            max_val = np.max(np.abs(audio_array))  # [NRS-810]
            if max_val == 0:  # [NRS-810]
                return audio_data  # [NRS-810]
            
            # Normalize to target level  # [NRS-810]
            scale_factor = (target_level * 32767) / max_val  # [NRS-810]
            normalized = (audio_array * scale_factor).astype(np.int16)  # [NRS-810]
            
            return normalized.tobytes()  # [NRS-810]
            
        except Exception as e:  # [NRS-810]
            logger.error(f"Error normalizing audio: {e}")  # [NRS-810]
            return audio_data  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def detect_silence(audio_data, threshold: float = 0.01, duration_ms: int = 500) -> bool:  # [NRS-810]
        """Detect if audio contains silence"""  # [NRS-810]
        energy = AudioUtils.calculate_audio_energy(audio_data)  # [NRS-810]
        return energy < threshold  # [NRS-810]

class TextUtils:  # [NRS-810]
    """Text processing utilities"""  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def clean_text(text: str) -> str:  # [NRS-810]
        """Clean and normalize text"""  # [NRS-810]
        if not text:  # [NRS-810]
            return ""  # [NRS-810]
        
        # Remove excessive whitespace  # [NRS-810]
        text = re.sub(r'\s+', ' ', text.strip())  # [NRS-810]
        
        # Remove special characters but keep punctuation  # [NRS-810]
        text = re.sub(r'[^\w\s\.\,\?\!\;\:\-\(\)]', '', text)  # [NRS-810]
        
        return text  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def extract_commands(text: str) -> List[str]:  # [NRS-810]
        """Extract potential commands from text"""  # [NRS-810]
        text = text.lower().strip()  # [NRS-810]
        
        # Command patterns  # [NRS-810]
        command_patterns = [  # [NRS-810]
            r'(?:please )?(.+)',  # Optional politeness  # [NRS-810]
            r'(?:can you )?(.+)',  # Questions  # [NRS-810]
            r'(?:could you )?(.+)',  # Polite requests  # [NRS-810]
            r'(?:would you )?(.+)',  # Polite requests  # [NRS-810]
            r'(.+)'  # Direct commands  # [NRS-810]
        ]  # [NRS-810]
        
        for pattern in command_patterns:  # [NRS-810]
            match = re.match(pattern, text)  # [NRS-810]
            if match:  # [NRS-810]
                return [match.group(1).strip()]  # [NRS-810]
        
        return [text]  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def is_question(text: str) -> bool:  # [NRS-810]
        """Determine if text is a question"""  # [NRS-810]
        question_indicators = [  # [NRS-810]
            text.strip().endswith('?'),  # [NRS-810]
            any(text.lower().startswith(word) for word in [  # [NRS-810]
                'what', 'when', 'where', 'who', 'why', 'how',  # [NRS-810]
                'is', 'are', 'can', 'could', 'would', 'should'  # [NRS-810]
            ])  # [NRS-810]
        ]  # [NRS-810]
        return any(question_indicators)  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def extract_entities(text: str) -> Dict[str, List[str]]:  # [NRS-810]
        """Extract entities from text (basic implementation)"""  # [NRS-810]
        entities = {  # [NRS-810]
            'urls': [],  # [NRS-810]
            'emails': [],  # [NRS-810]
            'numbers': [],  # [NRS-810]
            'dates': []  # [NRS-810]
        }  # [NRS-810]
        
        # URL pattern (simplified to reduce complexity)  # [NRS-810]
        url_pattern = r'https?://[\w.-]+(?::[\d]+)?(?:/[\w/_]*(?:\?[\w&=%]*)?(?:#[\w]*)?)?'  # [NRS-810]
        entities['urls'] = re.findall(url_pattern, text)  # [NRS-810]
        
        # Email pattern  # [NRS-810]
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'  # [NRS-810]
        entities['emails'] = re.findall(email_pattern, text)  # [NRS-810]
        
        # Number pattern  # [NRS-810]
        number_pattern = r'\b\d+\b'  # [NRS-810]
        entities['numbers'] = re.findall(number_pattern, text)  # [NRS-810]
        
        # Basic date pattern  # [NRS-810]
        date_pattern = r'\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b'  # [NRS-810]
        entities['dates'] = re.findall(date_pattern, text)  # [NRS-810]
        
        return entities  # [NRS-810]

class FileUtils:  # [NRS-810]
    """File and directory utilities"""  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def ensure_dir(directory: str) -> bool:  # [NRS-810]
        """Ensure directory exists"""  # [NRS-810]
        try:  # [NRS-810]
            Path(directory).mkdir(parents=True, exist_ok=True)  # [NRS-810]
            return True  # [NRS-810]
        except Exception as e:  # [NRS-810]
            logger.error(f"Failed to create directory {directory}: {e}")  # [NRS-810]
            return False  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def get_file_hash(file_path: str) -> str:  # [NRS-810]
        """Get MD5 hash of file"""  # [NRS-810]
        try:  # [NRS-810]
            with open(file_path, 'rb') as f:  # [NRS-810]
                file_hash = hashlib.md5()  # [NRS-810]
                while chunk := f.read(8192):  # [NRS-810]
                    file_hash.update(chunk)  # [NRS-810]
            return file_hash.hexdigest()  # [NRS-810]
        except Exception as e:  # [NRS-810]
            logger.error(f"Failed to hash file {file_path}: {e}")  # [NRS-810]
            return ""  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def cleanup_temp_files(temp_dir: str, max_age_hours: int = 24):  # [NRS-810]
        """Clean up old temporary files"""  # [NRS-810]
        try:  # [NRS-810]
            temp_path = Path(temp_dir)  # [NRS-810]
            if not temp_path.exists():  # [NRS-810]
                return  # [NRS-810]
            
            cutoff_time = datetime.now() - timedelta(hours=max_age_hours)  # [NRS-810]
            
            for file_path in temp_path.iterdir():  # [NRS-810]
                if file_path.is_file():  # [NRS-810]
                    file_time = datetime.fromtimestamp(file_path.stat().st_mtime)  # [NRS-810]
                    if file_time < cutoff_time:  # [NRS-810]
                        file_path.unlink()  # [NRS-810]
                        logger.info(f"Cleaned up temp file: {file_path}")  # [NRS-810]
                        
        except Exception as e:  # [NRS-810]
            logger.error(f"Error cleaning temp files: {e}")  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def safe_filename(filename: str) -> str:  # [NRS-810]
        """Create safe filename by removing invalid characters"""  # [NRS-810]
        # Replace invalid characters  # [NRS-810]
        safe_name = re.sub(r'[<>:"/\\|?*]', '_', filename)  # [NRS-810]
        
        # Remove excessive underscores  # [NRS-810]
        safe_name = re.sub(r'_+', '_', safe_name)  # [NRS-810]
        
        # Limit length  # [NRS-810]
        if len(safe_name) > 200:  # [NRS-810]
            name, ext = os.path.splitext(safe_name)  # [NRS-810]
            safe_name = name[:200-len(ext)] + ext  # [NRS-810]
        
        return safe_name  # [NRS-810]

class VoiceUtils:  # [NRS-810]
    """Voice and speech utilities"""  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def detect_wake_word(text: str, wake_words: List[str] = None) -> bool:  # [NRS-810]
        """Detect wake words in text"""  # [NRS-810]
        if not wake_words:  # [NRS-810]
            wake_words = ["jarvis", "hey jarvis", "ok jarvis", "computer"]  # [NRS-810]
        
        text_lower = text.lower()  # [NRS-810]
        return any(wake_word in text_lower for wake_word in wake_words)  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def detect_stop_words(text: str, stop_words: List[str] = None) -> bool:  # [NRS-810]
        """Detect stop/exit words in text"""  # [NRS-810]
        if not stop_words:  # [NRS-810]
            stop_words = [  # [NRS-810]
                "stop", "quit", "exit", "goodbye", "bye", "stop listening",  # [NRS-810]
                "end session", "turn off", "sleep", "shutdown"  # [NRS-810]
            ]  # [NRS-810]
        
        text_lower = text.lower().strip()  # [NRS-810]
        return any(stop_word in text_lower for stop_word in stop_words)  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def extract_voice_command(text: str, wake_words: List[str] = None) -> str:  # [NRS-810]
        """Extract command after wake word"""  # [NRS-810]
        if not wake_words:  # [NRS-810]
            wake_words = ["jarvis", "hey jarvis", "ok jarvis"]  # [NRS-810]
        
        text_lower = text.lower()  # [NRS-810]
        
        for wake_word in wake_words:  # [NRS-810]
            if wake_word in text_lower:  # [NRS-810]
                # Find position after wake word  # [NRS-810]
                start_pos = text_lower.find(wake_word) + len(wake_word)  # [NRS-810]
                command = text[start_pos:].strip()  # [NRS-810]
                
                # Remove common filler words at the beginning  # [NRS-810]
                filler_words = ["please", "can you", "could you", "would you"]  # [NRS-810]
                for filler in filler_words:  # [NRS-810]
                    if command.lower().startswith(filler):  # [NRS-810]
                        command = command[len(filler):].strip()  # [NRS-810]
                
                return command  # [NRS-810]
        
        return text  # Return original if no wake word found  # [NRS-810]

class PerformanceUtils:  # [NRS-810]
    """Performance monitoring utilities"""  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def measure_time(func_name: str = ""):  # [NRS-810]
        """Decorator to measure function execution time"""  # [NRS-810]
        def decorator(func):  # [NRS-810]
            async def async_wrapper(*args, **kwargs):  # [NRS-810]
                start_time = asyncio.get_event_loop().time()  # [NRS-810]
                result = await func(*args, **kwargs)  # [NRS-810]
                end_time = asyncio.get_event_loop().time()  # [NRS-810]
                duration = (end_time - start_time) * 1000  # Convert to milliseconds  # [NRS-810]
                logger.debug(f"⏱️  {func_name or func.__name__}: {duration:.2f}ms")  # [NRS-810]
                return result  # [NRS-810]
            
            def sync_wrapper(*args, **kwargs):  # [NRS-810]
                import time  # [NRS-810]
                start_time = time.time()  # [NRS-810]
                result = func(*args, **kwargs)  # [NRS-810]
                end_time = time.time()  # [NRS-810]
                duration = (end_time - start_time) * 1000  # Convert to milliseconds  # [NRS-810]
                logger.debug(f"⏱️  {func_name or func.__name__}: {duration:.2f}ms")  # [NRS-810]
                return result  # [NRS-810]
            
            # Return appropriate wrapper based on function type  # [NRS-810]
            if asyncio.iscoroutinefunction(func):  # [NRS-810]
                return async_wrapper  # [NRS-810]
            else:  # [NRS-810]
                return sync_wrapper  # [NRS-810]
        
        return decorator  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def log_memory_usage(context: str = ""):  # [NRS-810]
        """Log current memory usage"""  # [NRS-810]
        try:  # [NRS-810]
            import psutil  # [NRS-810]
            process = psutil.Process()  # [NRS-810]
            memory_info = process.memory_info()  # [NRS-810]
            memory_mb = memory_info.rss / 1024 / 1024  # [NRS-810]
            logger.debug(f"💾 Memory usage {context}: {memory_mb:.1f} MB")  # [NRS-810]
        except ImportError:  # [NRS-810]
            logger.debug("psutil not available for memory monitoring")  # [NRS-810]

class ValidationUtils:  # [NRS-810]
    """Input validation utilities"""  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def validate_api_key(api_key: str, service: str = "API") -> bool:  # [NRS-810]
        """Validate API key format"""  # [NRS-810]
        if not api_key or not isinstance(api_key, str):  # [NRS-810]
            return False  # [NRS-810]
        
        # Remove whitespace  # [NRS-810]
        api_key = api_key.strip()  # [NRS-810]
        
        # Basic length and character checks  # [NRS-810]
        if len(api_key) < 20:  # [NRS-810]
            return False  # [NRS-810]
        
        if not re.match(r'^[A-Za-z0-9\-_\.]+$', api_key):  # [NRS-810]
            return False  # [NRS-810]
        
        return True  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def validate_voice_settings(voice_config: Dict[str, Any]) -> Tuple[bool, str]:  # [NRS-810]
        """Validate voice configuration"""  # [NRS-810]
        required_fields = ['provider', 'voice_id']  # [NRS-810]
        
        for field in required_fields:  # [NRS-810]
            if field not in voice_config:  # [NRS-810]
                return False, f"Missing required field: {field}"  # [NRS-810]
        
        # Validate provider  # [NRS-810]
        valid_providers = ['elevenlabs', 'openai', 'azure', 'google']  # [NRS-810]
        if voice_config['provider'] not in valid_providers:  # [NRS-810]
            return False, f"Invalid provider: {voice_config['provider']}"  # [NRS-810]
        
        return True, "Valid"  # [NRS-810]
    
    @staticmethod  # [NRS-810]
    def validate_audio_settings(audio_config: Dict[str, Any]) -> Tuple[bool, str]:  # [NRS-810]
        """Validate audio configuration"""  # [NRS-810]
        required_fields = ['sample_rate', 'channels', 'format']  # [NRS-810]
        
        for field in required_fields:  # [NRS-810]
            if field not in audio_config:  # [NRS-810]
                return False, f"Missing required field: {field}"  # [NRS-810]
        
        # Validate sample rate  # [NRS-810]
        valid_sample_rates = [16000, 22050, 44100, 48000]  # [NRS-810]
        if audio_config['sample_rate'] not in valid_sample_rates:  # [NRS-810]
            return False, f"Invalid sample rate: {audio_config['sample_rate']}"  # [NRS-810]
        
        return True, "Valid"  # [NRS-810]

# Export all utilities  # [NRS-810]
__all__ = [  # [NRS-810]
    'ConfigManager',  # [NRS-810]
    'AudioUtils',   # [NRS-810]
    'TextUtils',  # [NRS-810]
    'FileUtils',  # [NRS-810]
    'VoiceUtils',  # [NRS-810]
    'PerformanceUtils',  # [NRS-810]
    'ValidationUtils'  # [NRS-810]
]  # [NRS-810]
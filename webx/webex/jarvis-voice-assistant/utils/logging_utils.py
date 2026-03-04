"""
Logging utilities for Jarvis Voice Assistant
Centralized logging configuration and utilities
"""  # [NRS-810]

import logging  # [NRS-807] Logging framework
import sys  # [NRS-807] System output streams
import os  # [NRS-807] Environment access
from typing import Optional  # [NRS-807] Type hints
from datetime import datetime  # [NRS-807] Timestamp formatting
from pathlib import Path  # [NRS-807] Log file paths

class ColoredFormatter(logging.Formatter):  # [NRS-810]
    """Colored console formatter for better readability"""  # [NRS-810]
    
    # Color codes  # [NRS-810]
    COLORS = {  # [NRS-810]
        'DEBUG': '\033[36m',     # [NRS-807] Cyan for debug
        'INFO': '\033[32m',      # [NRS-807] Green for info
        'WARNING': '\033[33m',   # [NRS-807] Yellow for warning
        'ERROR': '\033[31m',     # [NRS-807] Red for error
        'CRITICAL': '\033[35m',  # [NRS-807] Magenta for critical
    }  # [NRS-810]
    RESET = '\033[0m'  # [NRS-807] Reset color code
    
    def format(self, record):  # [NRS-810]
        # Add color to level name  # [NRS-810]
        level_color = self.COLORS.get(record.levelname, '')  # [NRS-810]
        record.levelname = f"{level_color}{record.levelname}{self.RESET}"  # [NRS-810]
        
        # Format the message  # [NRS-810]
        formatted = super().format(record)  # [NRS-810]
        
        return formatted  # [NRS-810]

def setup_logging(  # [NRS-810]
    log_level: str = "INFO",  # [NRS-810]
    log_file: Optional[str] = None,  # [NRS-810]
    enable_console: bool = True,  # [NRS-810]
    enable_colors: bool = True  # [NRS-810]
) -> None:  # [NRS-810]
    """
    Setup centralized logging configuration
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional log file path
        enable_console: Enable console logging
        enable_colors: Enable colored console output
    """  # [NRS-810]
    
    # Convert string level to logging constant  # [NRS-810]
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)  # [NRS-807] Parse log level
    
    # Create formatters  # [NRS-810]
    if enable_colors:  # [NRS-810]
        console_formatter = ColoredFormatter(  # [NRS-810]
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',  # [NRS-810]
            datefmt='%H:%M:%S'  # [NRS-810]
        )  # [NRS-807] Colored formatter for console
    else:  # [NRS-810]
        console_formatter = logging.Formatter(  # [NRS-810]
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',  # [NRS-810]
            datefmt='%H:%M:%S'  # [NRS-810]
        )  # [NRS-807] Plain formatter for console
    
    file_formatter = logging.Formatter(  # [NRS-810]
        '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',  # [NRS-810]
        datefmt='%Y-%m-%d %H:%M:%S'  # [NRS-810]
    )  # [NRS-807] Detailed formatter for file
    
    # Configure root logger  # [NRS-810]
    root_logger = logging.getLogger()  # [NRS-807] Get root logger
    root_logger.setLevel(numeric_level)  # [NRS-807] Set logging level
    
    # Clear existing handlers  # [NRS-810]
    root_logger.handlers.clear()  # [NRS-807] Remove old handlers
    
    # Console handler  # [NRS-810]
    if enable_console:  # [NRS-810]
        console_handler = logging.StreamHandler(sys.stdout)  # [NRS-810]
        console_handler.setLevel(numeric_level)  # [NRS-810]
        console_handler.setFormatter(console_formatter)  # [NRS-810]
        root_logger.addHandler(console_handler)  # [NRS-810]
    
    # File handler  # [NRS-810]
    if log_file:  # [NRS-810]
        # Ensure log directory exists  # [NRS-810]
        log_path = Path(log_file)  # [NRS-810]
        log_path.parent.mkdir(parents=True, exist_ok=True)  # [NRS-810]
        
        file_handler = logging.FileHandler(log_file, encoding='utf-8')  # [NRS-810]
        file_handler.setLevel(numeric_level)  # [NRS-810]
        file_handler.setFormatter(file_formatter)  # [NRS-810]
        root_logger.addHandler(file_handler)  # [NRS-810]
    
    # Set specific loggers  # [NRS-810]
    # Reduce noise from external libraries  # [NRS-810]
    logging.getLogger('urllib3').setLevel(logging.WARNING)  # [NRS-810]
    logging.getLogger('requests').setLevel(logging.WARNING)  # [NRS-810]
    logging.getLogger('selenium').setLevel(logging.WARNING)  # [NRS-810]
    logging.getLogger('websockets').setLevel(logging.WARNING)  # [NRS-810]

def get_logger(name: str) -> logging.Logger:  # [NRS-810]
    """Get a logger instance with proper configuration"""  # [NRS-810]
    return logging.getLogger(name)  # [NRS-810]

class LogContext:  # [NRS-810]
    """Context manager for logging with additional context"""  # [NRS-810]
    
    def __init__(self, logger: logging.Logger, context: str, level: str = "INFO"):  # [NRS-810]
        self.logger = logger  # [NRS-810]
        self.context = context  # [NRS-810]
        self.level = getattr(logging, level.upper())  # [NRS-810]
        self.start_time = None  # [NRS-810]
    
    def __enter__(self):  # [NRS-810]
        self.start_time = datetime.now()  # [NRS-810]
        self.logger.log(self.level, f"🔄 Starting: {self.context}")  # [NRS-810]
        return self  # [NRS-810]
    
    def __exit__(self, exc_type, exc_val, exc_tb):  # [NRS-810]
        duration = datetime.now() - self.start_time  # [NRS-810]
        duration_ms = duration.total_seconds() * 1000  # [NRS-810]
        
        if exc_type is None:  # [NRS-810]
            self.logger.log(self.level, f"✅ Completed: {self.context} ({duration_ms:.1f}ms)")  # [NRS-810]
        else:  # [NRS-810]
            self.logger.error(f"❌ Failed: {self.context} - {exc_val}")  # [NRS-810]
        
        return False  # Don't suppress exceptions  # [NRS-810]

def log_function_call(logger: logging.Logger, level: str = "DEBUG"):  # [NRS-810]
    """Decorator to log function calls"""  # [NRS-810]
    def decorator(func):  # [NRS-810]
        def wrapper(*args, **kwargs):  # [NRS-810]
            func_name = func.__name__  # [NRS-810]
            
            # Log function entry  # [NRS-810]
            logger.log(getattr(logging, level.upper()), f"📞 Calling: {func_name}")  # [NRS-810]
            
            try:  # [NRS-810]
                result = func(*args, **kwargs)  # [NRS-810]
                logger.log(getattr(logging, level.upper()), f"✅ Completed: {func_name}")  # [NRS-810]
                return result  # [NRS-810]
            except Exception as e:  # [NRS-810]
                logger.error(f"❌ Error in {func_name}: {e}")  # [NRS-810]
                raise  # [NRS-810]
        
        return wrapper  # [NRS-810]
    return decorator  # [NRS-810]

# Logging configuration for different components  # [NRS-810]
def configure_jarvis_logging():  # [NRS-810]
    """Configure logging specifically for Jarvis components"""  # [NRS-810]
    
    # Create logs directory  # [NRS-810]
    log_dir = Path("data/logs")  # [NRS-810]
    log_dir.mkdir(parents=True, exist_ok=True)  # [NRS-810]
    
    # Generate log filename with timestamp  # [NRS-810]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")  # [NRS-810]
    log_file = log_dir / f"jarvis_{timestamp}.log"  # [NRS-810]
    
    # Setup main logging  # [NRS-810]
    setup_logging(  # [NRS-810]
        log_level=os.getenv("LOG_LEVEL", "INFO"),  # [NRS-810]
        log_file=str(log_file),  # [NRS-810]
        enable_console=True,  # [NRS-810]
        enable_colors=True  # [NRS-810]
    )  # [NRS-810]
    
    # Create component-specific loggers  # [NRS-810]
    loggers = {  # [NRS-810]
        'jarvis.audio': get_logger('jarvis.audio'),  # [NRS-810]
        'jarvis.stt': get_logger('jarvis.stt'),  # [NRS-810]
        'jarvis.tts': get_logger('jarvis.tts'),  # [NRS-810]
        'jarvis.core': get_logger('jarvis.core'),  # [NRS-810]
        'jarvis.browser': get_logger('jarvis.browser')  # [NRS-810]
    }  # [NRS-810]
    
    return loggers  # [NRS-810]

# Performance logging utilities  # [NRS-810]
class PerformanceLogger:  # [NRS-810]
    """Log performance metrics"""  # [NRS-810]
    
    def __init__(self, logger: logging.Logger):  # [NRS-810]
        self.logger = logger  # [NRS-810]
        self.metrics = {}  # [NRS-810]
    
    def start_timer(self, operation: str):  # [NRS-810]
        """Start timing an operation"""  # [NRS-810]
        self.metrics[operation] = datetime.now()  # [NRS-810]
    
    def end_timer(self, operation: str, log_level: str = "DEBUG"):  # [NRS-810]
        """End timing and log duration"""  # [NRS-810]
        if operation in self.metrics:  # [NRS-810]
            start_time = self.metrics[operation]  # [NRS-810]
            duration = datetime.now() - start_time  # [NRS-810]
            duration_ms = duration.total_seconds() * 1000  # [NRS-810]
            
            level = getattr(logging, log_level.upper())  # [NRS-810]
            self.logger.log(level, f"⏱️  {operation}: {duration_ms:.2f}ms")  # [NRS-810]
            
            del self.metrics[operation]  # [NRS-810]
            return duration_ms  # [NRS-810]
        return None  # [NRS-810]
    
    def log_memory_usage(self, context: str = "", log_level: str = "DEBUG"):  # [NRS-810]
        """Log current memory usage"""  # [NRS-810]
        try:  # [NRS-810]
            import psutil  # [NRS-810]
            process = psutil.Process()  # [NRS-810]
            memory_info = process.memory_info()  # [NRS-810]
            memory_mb = memory_info.rss / 1024 / 1024  # [NRS-810]
            
            level = getattr(logging, log_level.upper())  # [NRS-810]
            self.logger.log(level, f"💾 Memory {context}: {memory_mb:.1f} MB")  # [NRS-810]
            
            return memory_mb  # [NRS-810]
        except ImportError:  # [NRS-810]
            self.logger.debug("psutil not available for memory monitoring")  # [NRS-810]
            return None  # [NRS-810]

# Export utilities  # [NRS-810]
__all__ = [  # [NRS-810]
    'setup_logging',  # [NRS-810]
    'get_logger',  # [NRS-810]
    'LogContext',  # [NRS-810]
    'log_function_call',  # [NRS-810]
    'configure_jarvis_logging',  # [NRS-810]
    'PerformanceLogger',  # [NRS-810]
    'ColoredFormatter'  # [NRS-810]
]  # [NRS-810]
"""
Init file for utils package
Provides easy access to utility classes and functions
"""  # [NRS-810]

# [NRS-810] Import helper utilities for configuration and file management
from .helpers import (  # [NRS-810] Import helper module
    ConfigManager,  # [NRS-810] Configuration file loader
    AudioUtils,  # [NRS-810] Audio utility functions
    TextUtils,  # [NRS-810] Text processing utilities
    FileUtils,  # [NRS-810] File I/O utilities
    VoiceUtils,  # [NRS-810] Voice-specific utilities
    PerformanceUtils,  # [NRS-810] Performance monitoring
    ValidationUtils  # [NRS-810] Data validation utilities
)  # [NRS-810]

# [NRS-810] Import logging utilities for event tracking
from .logging_utils import (  # [NRS-810] Import logging module
    setup_logging,  # [NRS-807] Initialize logging configuration
    get_logger,  # [NRS-807] Get logger instance
    LogContext,  # [NRS-807] Context manager for logging
    log_function_call,  # [NRS-807] Decorator for function logging
    configure_jarvis_logging,  # [NRS-807] Jarvis-specific logging setup
    PerformanceLogger,  # [NRS-807] Performance monitoring logger
    ColoredFormatter  # [NRS-807] Colored console output formatter
)  # [NRS-810]

# [NRS-810] Import audio utilities for signal processing
from .audio_utils import (  # [NRS-810] Import audio module
    AudioProcessor,  # [NRS-602] Audio signal processor
    AudioBuffer  # [NRS-602] Audio data buffer manager
)  # [NRS-810]

__all__ = [  # [NRS-810]
    # Helper utilities  # [NRS-810]
    'ConfigManager',  # [NRS-810]
    'AudioUtils',  # [NRS-810]
    'TextUtils',   # [NRS-810]
    'FileUtils',  # [NRS-810]
    'VoiceUtils',  # [NRS-810]
    'PerformanceUtils',  # [NRS-810]
    'ValidationUtils',  # [NRS-810]
    
    # Logging utilities  # [NRS-810]
    'setup_logging',  # [NRS-810]
    'get_logger',  # [NRS-810]
    'LogContext',  # [NRS-810]
    'log_function_call',  # [NRS-810]
    'configure_jarvis_logging',  # [NRS-810]
    'PerformanceLogger',  # [NRS-810]
    'ColoredFormatter',  # [NRS-810]
    
    # Audio utilities  # [NRS-810]
    'AudioProcessor',  # [NRS-810]
    'AudioBuffer'  # [NRS-810]
]  # [NRS-810]
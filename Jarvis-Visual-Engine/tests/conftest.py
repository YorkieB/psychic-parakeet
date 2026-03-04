"""Pytest configuration and shared fixtures"""
import pytest
import numpy as np
import asyncio
from unittest.mock import Mock, MagicMock, AsyncMock, patch
from datetime import datetime
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Mock optional dependencies that may not be installed
try:
    import face_recognition
except ImportError:
    sys.modules['face_recognition'] = MagicMock()

try:
    import cv2
except ImportError:
    sys.modules['cv2'] = MagicMock()

try:
    from onvif import ONVIFCamera
except ImportError:
    sys.modules['onvif'] = MagicMock()
    sys.modules['onvif.ONVIFCamera'] = MagicMock()

from src.config import Settings
from src.core.event_bus import EventBus, EventType, Event
from src.database.connection import DatabaseConnection
from src.database.models import Base


@pytest.fixture
def sample_frame():
    """Create a sample test frame"""
    return np.random.randint(0, 255, (720, 1280, 3), dtype=np.uint8)


@pytest.fixture
def sample_frame_small():
    """Create a small sample test frame"""
    return np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)


@pytest.fixture
def mock_config():
    """Create mock configuration"""
    config = MagicMock(spec=Settings)
    config.openai_api_key = "test_openai_key"
    config.anthropic_api_key = "test_anthropic_key"
    config.api_key = "test_api_key"
    config.database_url = "postgresql://test:test@localhost/test"
    config.redis_url = "redis://localhost:6379/0"
    config.camera_type = "obsbot"
    config.camera_ip = "192.168.1.100"
    config.camera_port = 8080
    config.frame_rate = 30
    config.motion_threshold = 5.0
    config.face_confidence_threshold = 0.6
    config.smart_triggering_enabled = True
    config.vision_detail_level = "high"
    config.api_throttle_seconds = 5
    config.encryption_key = "test_encryption_key_32_chars_long!"
    return config


@pytest.fixture
def mock_db():
    """Mock database connection"""
    db = MagicMock(spec=DatabaseConnection)
    db.connect = Mock()
    db.disconnect = Mock()
    db.health_check = Mock(return_value=True)
    
    # Mock session context manager
    mock_session = MagicMock()
    db.get_session = MagicMock()
    db.get_session.__enter__ = Mock(return_value=mock_session)
    db.get_session.__exit__ = Mock(return_value=False)
    
    return db


@pytest.fixture
def mock_redis():
    """Mock Redis connection"""
    redis_mock = MagicMock()
    redis_mock.get = Mock(return_value=None)
    redis_mock.set = Mock(return_value=True)
    redis_mock.delete = Mock(return_value=True)
    redis_mock.exists = Mock(return_value=False)
    redis_mock.ping = Mock(return_value=True)
    return redis_mock


@pytest.fixture
def event_bus():
    """Create event bus instance"""
    return EventBus()


@pytest.fixture
def sample_event():
    """Create sample event"""
    return Event(
        event_type=EventType.FACE_DETECTED,
        timestamp=datetime.utcnow(),
        camera_id="test_camera",
        data={"faces": [{"name": "John", "confidence": 0.95}]}
    )


@pytest.fixture
def mock_camera():
    """Mock camera instance"""
    camera = MagicMock()
    camera.camera_id = "test_camera"
    camera.name = "Test Camera"
    camera.room_name = "Test Room"
    camera.is_connected = True
    camera.connect = Mock(return_value=True)
    camera.disconnect = Mock()
    camera.capture_frame = Mock(return_value=np.random.randint(0, 255, (720, 1280, 3), dtype=np.uint8))
    camera.last_frame = None
    camera.last_frame_time = None
    return camera


@pytest.fixture
def mock_gpt4o_vision():
    """Mock GPT-4o Vision API"""
    api = MagicMock()
    api.analyze_image = AsyncMock(return_value={
        "success": True,
        "analysis": "Test analysis",
        "api": "gpt4o",
        "timestamp": datetime.utcnow().isoformat(),
        "usage": {"input_tokens": 100, "output_tokens": 50}
    })
    api.detect_objects = AsyncMock(return_value={
        "success": True,
        "objects": [{"name": "person", "confidence": 0.9}],
        "api": "gpt4o"
    })
    return api


@pytest.fixture
def mock_claude_vision():
    """Mock Claude Vision API"""
    api = MagicMock()
    api.analyze_image = AsyncMock(return_value={
        "success": True,
        "analysis": "Test analysis",
        "api": "claude",
        "timestamp": datetime.utcnow().isoformat(),
        "usage": {"input_tokens": 100, "output_tokens": 50}
    })
    api.detect_objects = AsyncMock(return_value={
        "success": True,
        "objects": [{"name": "person", "confidence": 0.9}],
        "api": "claude"
    })
    return api


@pytest.fixture
def mock_face_engine():
    """Mock face recognition engine"""
    engine = MagicMock()
    engine.detect_faces = Mock(return_value=[
        {"name": "John", "confidence": 0.95, "location": {"top": 100, "bottom": 200, "left": 150, "right": 250}}
    ])
    engine.recognize_faces = Mock(return_value=[
        {"name": "John", "confidence": 0.95, "location": {"top": 100, "bottom": 200, "left": 150, "right": 250}}
    ])
    engine.get_face_encodings = Mock(return_value=[np.random.rand(128)])
    engine.known_face_names = ["John", "Jane"]
    engine.known_face_encodings = [np.random.rand(128), np.random.rand(128)]
    return engine


@pytest.fixture
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
def reset_logging():
    """Reset logging between tests"""
    import logging
    logging.getLogger().handlers = []


@pytest.fixture
def temp_dir(tmp_path):
    """Create temporary directory for test files"""
    return tmp_path


@pytest.fixture
def mock_settings_env(monkeypatch):
    """Set environment variables for testing"""
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setenv("OPENAI_API_KEY", "test_key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test_key")
    monkeypatch.setenv("API_KEY", "test_api_key")
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_NAME", "test_db")
    monkeypatch.setenv("REDIS_HOST", "localhost")
    monkeypatch.setenv("CAMERA_IP", "192.168.1.100")

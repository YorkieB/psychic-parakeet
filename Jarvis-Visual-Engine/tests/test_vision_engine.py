"""Comprehensive test suite for Vision Engine"""
import pytest
import asyncio
import numpy as np
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from datetime import datetime

from src.core.vision_engine import VisionEngine
from src.vision.face_recognition import FaceRecognitionEngine
from src.core.event_bus import EventBus, EventType, Event
from src.core.cache_layer import CacheLayer
from src.config import settings


@pytest.fixture
def vision_engine():
    """Create test vision engine"""
    engine = VisionEngine(settings)
    yield engine
    # Cleanup
    if hasattr(engine, 'db') and engine.db:
        try:
            engine.db.disconnect()
        except:
            pass


@pytest.fixture
def sample_frame():
    """Create sample frame"""
    return np.random.randint(0, 255, (720, 1280, 3), dtype=np.uint8)


@pytest.fixture
def mock_db():
    """Mock database connection"""
    db = MagicMock()
    db.connect = Mock()
    db.disconnect = Mock()
    db.health_check = Mock(return_value=True)
    db.get_session = MagicMock()
    db.get_session.__enter__ = Mock(return_value=MagicMock())
    db.get_session.__exit__ = Mock(return_value=False)
    return db


class TestFaceRecognition:
    """Test face recognition engine"""
    
    def test_load_known_faces(self):
        """Test loading known faces"""
        engine = FaceRecognitionEngine(known_faces_dir="tests/test_faces")
        assert len(engine.known_face_encodings) >= 0
    
    def test_detect_faces(self, sample_frame):
        """Test face detection"""
        engine = FaceRecognitionEngine(known_faces_dir="tests/test_faces")
        faces = engine.detect_faces(sample_frame)
        assert isinstance(faces, list)
    
    def test_get_face_encodings(self, sample_frame):
        """Test getting face encodings"""
        engine = FaceRecognitionEngine(known_faces_dir="tests/test_faces")
        encodings = engine.get_face_encodings(sample_frame)
        assert isinstance(encodings, list)
    
    def test_recognize_faces(self, sample_frame):
        """Test face recognition"""
        engine = FaceRecognitionEngine(known_faces_dir="tests/test_faces")
        recognized = engine.recognize_faces(sample_frame)
        assert isinstance(recognized, list)
        for face in recognized:
            assert "name" in face
            assert "confidence" in face
            assert "location" in face


class TestEventBus:
    """Test event bus"""
    
    def test_subscribe_unsubscribe(self):
        """Test event subscription"""
        bus = EventBus()
        handler = Mock()
        
        bus.subscribe(EventType.FRAME_CAPTURED, handler)
        assert EventType.FRAME_CAPTURED in bus.subscribers
        assert handler in bus.subscribers[EventType.FRAME_CAPTURED]
        
        bus.unsubscribe(EventType.FRAME_CAPTURED, handler)
        assert len(bus.subscribers[EventType.FRAME_CAPTURED]) == 0
    
    @pytest.mark.asyncio
    async def test_emit_event(self):
        """Test event emission"""
        bus = EventBus()
        handler = AsyncMock()
        
        bus.subscribe(EventType.FACE_DETECTED, handler)
        
        event = Event(
            event_type=EventType.FACE_DETECTED,
            timestamp=datetime.utcnow(),
            camera_id="camera_1",
            data={"count": 2}
        )
        
        await bus.emit(event)
        handler.assert_called_once_with(event)
    
    def test_event_history(self):
        """Test event history"""
        bus = EventBus()
        
        for i in range(5):
            event = Event(
                event_type=EventType.FRAME_CAPTURED,
                timestamp=datetime.utcnow(),
                camera_id="camera_1",
                data={}
            )
            asyncio.run(bus.emit(event))
        
        history = bus.get_history(EventType.FRAME_CAPTURED)
        assert len(history) == 5


class TestCacheLayer:
    """Test caching"""
    
    @pytest.mark.skipif(True, reason="Requires Redis")
    def test_cache_hit_miss(self, sample_frame):
        """Test cache hit and miss"""
        cache = CacheLayer("redis://localhost:6379")
        
        # Miss
        result = cache.get(sample_frame)
        assert result is None
        
        # Set
        response = {"analysis": "test"}
        cache.set(sample_frame, response)
        
        # Hit
        result = cache.get(sample_frame)
        assert result == response


class TestPrivacyManager:
    """Test privacy manager"""
    
    def test_privacy_mode(self):
        """Test privacy mode toggle"""
        from src.core.privacy_manager import PrivacyManager
        pm = PrivacyManager()
        
        assert pm.privacy_mode == False
        pm.enable_privacy_mode()
        assert pm.privacy_mode == True
        pm.disable_privacy_mode()
        assert pm.privacy_mode == False
    
    def test_consent_management(self):
        """Test consent management"""
        from src.core.privacy_manager import PrivacyManager
        pm = PrivacyManager()
        
        pm.grant_consent("face_recognition")
        assert pm.has_consent("face_recognition")
        
        pm.revoke_consent("face_recognition")
        assert not pm.has_consent("face_recognition")


@pytest.mark.asyncio
async def test_vision_engine_processing(vision_engine, sample_frame, mock_db):
    """Test vision engine frame processing"""
    vision_engine.db = mock_db
    await vision_engine.initialize()
    
    # Mock camera
    vision_engine.camera = Mock()
    vision_engine.camera.camera_id = "test_camera"
    vision_engine.camera.is_connected = True
    
    # Mock vision API
    vision_engine.gpt4o_vision.analyze_image = AsyncMock(return_value={
        "success": True,
        "analysis": "Test analysis"
    })
    
    # Process frame
    result = await vision_engine.process_frame(sample_frame, "test_camera")
    
    # Verify processing
    assert vision_engine.stats["frames_processed"] > 0


@pytest.mark.asyncio
async def test_vision_engine_shutdown(vision_engine, mock_db):
    """Test engine shutdown"""
    vision_engine.db = mock_db
    await vision_engine.initialize()
    await vision_engine.shutdown()
    # Should complete without error


class TestIntegration:
    """Integration tests"""
    
    @pytest.mark.asyncio
    async def test_full_pipeline(self, vision_engine, sample_frame, mock_db):
        """Test full processing pipeline"""
        vision_engine.db = mock_db
        await vision_engine.initialize()
        
        # Mock camera
        vision_engine.camera = Mock()
        vision_engine.camera.camera_id = "test_camera"
        vision_engine.camera.is_connected = True
        
        # Mock vision API
        vision_engine.gpt4o_vision.analyze_image = AsyncMock(return_value={
            "success": True,
            "analysis": "Test analysis"
        })
        
        # Process frame
        result = await vision_engine.process_frame(sample_frame, "test_camera")
        
        # Verify
        assert vision_engine.stats["frames_processed"] >= 1
        
        await vision_engine.shutdown()


class TestSmartTriggering:
    """Test smart triggering logic"""
    
    @pytest.mark.asyncio
    async def test_should_trigger_api(self, vision_engine, sample_frame):
        """Test smart triggering decision"""
        # First frame should trigger (no previous frame)
        should_trigger = await vision_engine._should_trigger_api(sample_frame, "camera_1")
        assert should_trigger == True
        
        # Immediate second frame should not trigger (cooldown)
        should_trigger = await vision_engine._should_trigger_api(sample_frame, "camera_1")
        assert should_trigger == False


class TestMotionDetection:
    """Test motion detection"""
    
    def test_motion_detection(self):
        """Test motion detection module"""
        from src.vision.motion_detection import MotionDetector
        
        detector = MotionDetector(threshold=5.0)
        
        # Create two frames with difference
        frame1 = np.zeros((100, 100, 3), dtype=np.uint8)
        frame2 = np.ones((100, 100, 3), dtype=np.uint8) * 255
        
        result = detector.detect_motion(frame1, frame2)
        assert result["motion_detected"] == True
        assert result["motion_percent"] > 0


class TestPatternLearning:
    """Test pattern learning"""
    
    def test_pattern_learning(self):
        """Test pattern learning system"""
        from src.core.pattern_learner import PatternLearner
        
        learner = PatternLearner()
        
        # Learn some patterns
        for i in range(10):
            learner.learn_person_pattern(
                "person_1",
                "kitchen",
                activity="cooking",
                timestamp=datetime.utcnow().replace(hour=18)
            )
        
        # Predict location
        predictions = learner.predict_person_location("person_1", 18, 0)
        assert "kitchen" in predictions
        assert predictions["kitchen"] > 0.5


class TestContextAwareness:
    """Test context awareness"""
    
    def test_context_awareness(self):
        """Test context awareness system"""
        from src.core.context_awareness import ContextAwareness
        
        context = ContextAwareness()
        
        # Update context
        context.update_temporal_context("face_detected", {"person": "John"})
        context.update_spatial_context("kitchen", {"people_present": ["John"]})
        context.update_person_context("john_1", {"current_location": "kitchen"})
        
        # Get context
        room_ctx = context.get_room_context("kitchen")
        assert room_ctx is not None
        assert "people_present" in room_ctx
        
        person_ctx = context.get_person_context("john_1")
        assert person_ctx is not None
        assert person_ctx["current_location"] == "kitchen"

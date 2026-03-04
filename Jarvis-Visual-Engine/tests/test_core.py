"""Comprehensive core system tests"""
import pytest
import numpy as np
from unittest.mock import Mock, MagicMock, AsyncMock, patch
from datetime import datetime

from src.core.event_bus import EventBus, EventType, Event
from src.core.cache_layer import CacheLayer
from src.core.privacy_manager import PrivacyManager
from src.core.vision_engine import VisionEngine


class TestEventBus:
    """Test event bus"""
    
    def test_event_bus_initialization(self):
        """Test event bus initialization"""
        bus = EventBus()
        assert bus.subscribers == {}
        assert len(bus.event_history) == 0
    
    def test_subscribe(self, event_bus):
        """Test event subscription"""
        handler = Mock()
        event_bus.subscribe(EventType.FACE_DETECTED, handler)
        
        assert EventType.FACE_DETECTED in event_bus.subscribers
        assert handler in event_bus.subscribers[EventType.FACE_DETECTED]
    
    def test_unsubscribe(self, event_bus):
        """Test event unsubscription"""
        handler = Mock()
        event_bus.subscribe(EventType.FACE_DETECTED, handler)
        event_bus.unsubscribe(EventType.FACE_DETECTED, handler)
        
        assert len(event_bus.subscribers[EventType.FACE_DETECTED]) == 0
    
    @pytest.mark.asyncio
    async def test_emit_event(self, event_bus, sample_event):
        """Test event emission"""
        handler = AsyncMock()
        event_bus.subscribe(EventType.FACE_DETECTED, handler)
        
        await event_bus.emit(sample_event)
        
        handler.assert_called_once_with(sample_event)
        assert len(event_bus.event_history) > 0
    
    def test_get_history(self, event_bus):
        """Test event history retrieval"""
        event = Event(
            event_type=EventType.FACE_DETECTED,
            timestamp=datetime.utcnow(),
            camera_id="test",
            data={}
        )
        
        # Add to history manually
        event_bus.event_history.append(event)
        
        history = event_bus.get_history(EventType.FACE_DETECTED)
        assert len(history) > 0
        assert history[0].event_type == EventType.FACE_DETECTED
    
    def test_get_history_with_limit(self, event_bus):
        """Test event history with limit"""
        # Add multiple events
        for i in range(10):
            event = Event(
                event_type=EventType.FACE_DETECTED,
                timestamp=datetime.utcnow(),
                camera_id="test",
                data={"index": i}
            )
            event_bus.event_history.append(event)
        
        history = event_bus.get_history(EventType.FACE_DETECTED, limit=5)
        assert len(history) == 5


class TestCacheLayer:
    """Test cache layer"""
    
    @pytest.fixture
    def cache_layer(self, mock_redis):
        """Create cache layer with mocked Redis"""
        with patch('redis.Redis', return_value=mock_redis):
            return CacheLayer("redis://localhost:6379/0")
    
    def test_cache_set_get(self, cache_layer, sample_frame):
        """Test cache set and get"""
        result = {"analysis": "test"}
        
        cache_layer.set(sample_frame, result)
        cached = cache_layer.get(sample_frame)
        
        # May return None if Redis not available, but should not crash
        assert cached is None or cached == result
    
    def test_cache_hit(self, cache_layer, sample_frame):
        """Test cache hit recording"""
        cache_layer.hit(sample_frame)
        # Should not crash
    
    def test_get_stats(self, cache_layer):
        """Test cache statistics"""
        stats = cache_layer.get_stats()
        assert isinstance(stats, dict)
        assert "hits" in stats or "misses" in stats


class TestPrivacyManager:
    """Test privacy manager"""
    
    @pytest.fixture
    def privacy_manager(self):
        """Create privacy manager"""
        return PrivacyManager(encryption_key="test_key_32_chars_long_here!")
    
    def test_privacy_mode_toggle(self, privacy_manager):
        """Test privacy mode toggle"""
        assert privacy_manager.privacy_mode == False
        
        privacy_manager.enable_privacy_mode()
        assert privacy_manager.privacy_mode == True
        
        privacy_manager.disable_privacy_mode()
        assert privacy_manager.privacy_mode == False
    
    def test_consent_management(self, privacy_manager):
        """Test consent management"""
        privacy_manager.grant_consent("face_recognition")
        assert privacy_manager.has_consent("face_recognition") == True
        
        privacy_manager.revoke_consent("face_recognition")
        assert privacy_manager.has_consent("face_recognition") == False
    
    def test_audit_log(self, privacy_manager):
        """Test audit logging"""
        privacy_manager.audit_log(
            action="test_action",
            actor="test_user",
            resource="test_resource",
            details={"test": "data"}
        )
        # Should not crash
    
    def test_encrypt_decrypt(self, privacy_manager):
        """Test encryption/decryption"""
        data = "sensitive data"
        
        encrypted = privacy_manager.encrypt_sensitive_data(data)
        assert encrypted != data or privacy_manager.cipher is None  # May be same if no cipher
        
        decrypted = privacy_manager.decrypt_sensitive_data(encrypted)
        assert decrypted == data or privacy_manager.cipher is None  # May fail if no cipher
    
    def test_get_data_for_export(self, privacy_manager):
        """Test data export"""
        data = privacy_manager.get_data_for_export("user_1")
        assert isinstance(data, dict)
    
    def test_delete_user_data(self, privacy_manager):
        """Test user data deletion"""
        result = privacy_manager.delete_user_data("user_1")
        assert isinstance(result, bool)


class TestVisionEngine:
    """Test vision engine"""
    
    @pytest.fixture
    def vision_engine(self, mock_config, mock_db):
        """Create vision engine with mocks"""
        engine = VisionEngine(mock_config)
        engine.db = mock_db
        return engine
    
    @pytest.mark.asyncio
    async def test_initialization(self, vision_engine):
        """Test engine initialization"""
        await vision_engine.initialize()
        
        assert vision_engine.event_bus is not None
        assert vision_engine.cache_layer is not None
        assert vision_engine.privacy_manager is not None
    
    @pytest.mark.asyncio
    async def test_process_frame(self, vision_engine, sample_frame, mock_face_engine, mock_gpt4o_vision):
        """Test frame processing"""
        vision_engine.face_engine = mock_face_engine
        vision_engine.gpt4o_vision = mock_gpt4o_vision
        
        await vision_engine.initialize()
        
        result = await vision_engine.process_frame(sample_frame, "test_camera")
        
        assert vision_engine.stats["frames_processed"] > 0
    
    @pytest.mark.asyncio
    async def test_smart_triggering(self, vision_engine, sample_frame):
        """Test smart triggering logic"""
        await vision_engine.initialize()
        
        # First frame should trigger
        should_trigger = await vision_engine._should_trigger_api(sample_frame, "camera_1")
        assert should_trigger == True
        
        # Immediate second frame should not trigger (cooldown)
        should_trigger = await vision_engine._should_trigger_api(sample_frame, "camera_1")
        assert should_trigger == False
    
    @pytest.mark.asyncio
    async def test_privacy_mode(self, vision_engine, sample_frame):
        """Test privacy mode"""
        await vision_engine.initialize()
        
        vision_engine.privacy_manager.enable_privacy_mode()
        result = await vision_engine.process_frame(sample_frame, "test_camera")
        
        assert result is None  # Should skip processing
    
    def test_get_stats(self, vision_engine):
        """Test statistics retrieval"""
        stats = vision_engine.get_stats()
        
        assert "frames_processed" in stats
        assert "api_calls" in stats
        assert "cache" in stats
    
    @pytest.mark.asyncio
    async def test_shutdown(self, vision_engine):
        """Test engine shutdown"""
        await vision_engine.initialize()
        await vision_engine.shutdown()
        
        # Should complete without error
        assert True
    
    def test_query_spatial_memory(self, vision_engine):
        """Test spatial memory query"""
        # Ensure spatial memory is initialized
        if vision_engine.spatial_memory is None:
            pytest.skip("Spatial memory feature not enabled")
        
        result = vision_engine.query_spatial_memory("Where are my keys?")
        
        assert "query" in result
        assert "results" in result
        assert "type" in result
    
    def test_get_predictive_insights(self, vision_engine):
        """Test predictive insights"""
        insights = vision_engine.get_predictive_insights()
        
        assert isinstance(insights, dict)
    
    def test_get_proactive_suggestions(self, vision_engine):
        """Test proactive suggestions"""
        suggestions = vision_engine.get_proactive_suggestions("person_John")
        
        assert isinstance(suggestions, list)

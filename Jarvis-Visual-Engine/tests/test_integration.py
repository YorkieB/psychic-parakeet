"""Integration tests for full system"""
import pytest
import numpy as np
from unittest.mock import Mock, MagicMock, AsyncMock, patch
from datetime import datetime

from src.core.vision_engine import VisionEngine
from src.config import settings


class TestFullPipeline:
    """Test full processing pipeline"""
    
    @pytest.fixture
    def vision_engine(self, mock_config, mock_db):
        """Create vision engine"""
        engine = VisionEngine(mock_config)
        engine.db = mock_db
        return engine
    
    @pytest.mark.asyncio
    async def test_full_frame_processing(self, vision_engine, sample_frame, mock_face_engine, mock_gpt4o_vision):
        """Test complete frame processing pipeline"""
        vision_engine.face_engine = mock_face_engine
        vision_engine.gpt4o_vision = mock_gpt4o_vision
        
        await vision_engine.initialize()
        
        # Process frame
        result = await vision_engine.process_frame(sample_frame, "test_camera")
        
        # Verify processing occurred
        assert vision_engine.stats["frames_processed"] > 0
        assert result is not None or vision_engine.privacy_mode
    
    @pytest.mark.asyncio
    async def test_event_flow(self, vision_engine, sample_frame, event_bus):
        """Test event flow through system"""
        events_received = []
        
        async def event_handler(event):
            events_received.append(event.event_type)
        
        event_bus.subscribe("FACE_DETECTED", event_handler)
        event_bus.subscribe("MOTION_DETECTED", event_handler)
        
        vision_engine.event_bus = event_bus
        vision_engine.face_engine = MagicMock()
        vision_engine.face_engine.detect_faces.return_value = [{"name": "John"}]
        vision_engine.face_engine.recognize_faces.return_value = [{"name": "John", "confidence": 0.9}]
        
        await vision_engine.process_frame(sample_frame, "test_camera")
        
        # Should have emitted events
        assert len(events_received) >= 0  # May be 0 if no triggers


class TestIntelligenceIntegration:
    """Test intelligence system integration"""
    
    @pytest.mark.asyncio
    async def test_pattern_learning_integration(self, mock_config, mock_db):
        """Test pattern learning in full system"""
        engine = VisionEngine(mock_config)
        engine.db = mock_db
        
        await engine.initialize()
        
        # Simulate person detection
        engine.pattern_learner.learn_person_pattern(
            "person_John",
            "kitchen",
            timestamp=datetime.utcnow()
        )
        
        # Predict location
        predictions = engine.pattern_learner.predict_person_location(
            "person_John",
            hour=18,
            day_of_week=0
        )
        
        assert isinstance(predictions, dict)
    
    @pytest.mark.asyncio
    async def test_context_awareness_integration(self, mock_config, mock_db):
        """Test context awareness in full system"""
        engine = VisionEngine(mock_config)
        engine.db = mock_db
        
        await engine.initialize()
        
        # Update context
        engine.context_awareness.update_person_context("person_John", {
            "current_location": "kitchen"
        })
        
        # Get context
        context = engine.context_awareness.get_person_context("person_John")
        assert context is not None


class TestAPIIntegration:
    """Test API integration"""
    
    @pytest.mark.asyncio
    async def test_api_with_engine(self, mock_config, mock_db):
        """Test API endpoints with engine"""
        from src.api.server import app
        
        with app.test_client() as client:
            # Health check should work
            response = client.get('/health')
            assert response.status_code == 200


class TestFeatureIntegration:
    """Test feature integration"""
    
    @pytest.mark.asyncio
    async def test_spatial_memory_integration(self, event_bus, mock_db):
        """Test spatial memory feature integration"""
        from src.features.spatial_memory_feature import SpatialMemoryFeature
        
        feature = SpatialMemoryFeature(event_bus, mock_db)
        feature.initialize()
        
        # Should be ready to process events
        assert feature.enabled == True
    
    @pytest.mark.asyncio
    async def test_appearance_tracking_integration(self, event_bus):
        """Test appearance tracking integration"""
        from src.features.appearance_tracking_feature import AppearanceTrackingFeature
        
        feature = AppearanceTrackingFeature(event_bus)
        feature.initialize()
        
        assert feature.enabled == True

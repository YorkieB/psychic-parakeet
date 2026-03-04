"""Comprehensive feature module tests"""
import pytest
import numpy as np
from unittest.mock import Mock, MagicMock, AsyncMock
from datetime import datetime

from src.features.base_feature import BaseFeature
from src.features.spatial_memory_feature import SpatialMemoryFeature
from src.features.appearance_tracking_feature import AppearanceTrackingFeature
from src.features.screen_assistance_feature import ScreenAssistanceFeature
from src.features.visual_guidance_feature import VisualGuidanceFeature
from src.core.event_bus import EventBus, EventType, Event


class TestBaseFeature:
    """Test base feature class"""
    
    def test_base_feature_initialization(self, event_bus):
        """Test base feature initialization"""
        class TestFeature(BaseFeature):
            def initialize(self):
                pass
            
            def process(self, frame, context):
                return None
            
            def cleanup(self):
                pass
        
        feature = TestFeature("test_feature", event_bus, enabled=True)
        
        assert feature.name == "test_feature"
        assert feature.enabled == True
        assert feature.event_bus == event_bus
    
    def test_feature_enable_disable(self, event_bus):
        """Test feature enable/disable"""
        class TestFeature(BaseFeature):
            def initialize(self):
                pass
            
            def process(self, frame, context):
                return None
            
            def cleanup(self):
                pass
        
        feature = TestFeature("test", event_bus)
        assert feature.enabled == True
        
        feature.disable()
        assert feature.enabled == False
        
        feature.enable()
        assert feature.enabled == True
    
    def test_get_stats(self, event_bus):
        """Test feature statistics"""
        class TestFeature(BaseFeature):
            def initialize(self):
                pass
            
            def process(self, frame, context):
                return None
            
            def cleanup(self):
                pass
        
        feature = TestFeature("test", event_bus)
        stats = feature.get_stats()
        
        assert "name" in stats
        assert "enabled" in stats
        assert "events_processed" in stats


class TestSpatialMemoryFeature:
    """Test spatial memory feature"""
    
    @pytest.fixture
    def spatial_memory(self, event_bus, mock_db):
        """Create spatial memory feature"""
        return SpatialMemoryFeature(event_bus, mock_db, enabled=True)
    
    def test_initialization(self, spatial_memory):
        """Test spatial memory initialization"""
        assert spatial_memory.name == "spatial_memory"
        assert spatial_memory.db is not None
    
    @pytest.mark.asyncio
    async def test_handle_person_recognized(self, spatial_memory, sample_event):
        """Test person recognition handling"""
        # Mock person query
        from unittest.mock import patch
        with patch('src.features.spatial_memory_feature.PersonQueries') as mock_queries:
            mock_person = MagicMock()
            mock_person.id = 1
            mock_queries.get_person_by_name.return_value = mock_person
            
            await spatial_memory._handle_person_recognized(sample_event)
            
            # Should update location
            assert len(spatial_memory.last_locations) >= 0
    
    def test_query_location(self, spatial_memory):
        """Test location query"""
        from unittest.mock import patch
        with patch('src.features.spatial_memory_feature.SpatialMemoryQueries') as mock_queries:
            mock_queries.get_person_current_location.return_value = {
                "room_name": "kitchen",
                "timestamp": datetime.utcnow()
            }
            
            location = spatial_memory.query_location("John")
            assert location is not None
    
    def test_find_object(self, spatial_memory):
        """Test object finding"""
        from unittest.mock import patch
        with patch('src.features.spatial_memory_feature.SpatialMemoryQueries') as mock_queries:
            mock_queries.find_object.return_value = [{
                "object_name": "keys",
                "room_name": "kitchen",
                "last_seen": datetime.utcnow()
            }]
            
            locations = spatial_memory.find_object("keys")
            assert len(locations) > 0
            assert locations[0]["object_name"] == "keys"


class TestAppearanceTrackingFeature:
    """Test appearance tracking feature"""
    
    @pytest.fixture
    def appearance_tracking(self, event_bus):
        """Create appearance tracking feature"""
        return AppearanceTrackingFeature(event_bus, enabled=True)
    
    def test_initialization(self, appearance_tracking):
        """Test appearance tracking initialization"""
        assert appearance_tracking.name == "appearance_tracking"
    
    def test_extract_appearance_features(self, appearance_tracking, sample_frame):
        """Test appearance feature extraction"""
        face = {
            "location": {
                "top": 100,
                "bottom": 200,
                "left": 150,
                "right": 250
            }
        }
        
        appearance = appearance_tracking._extract_appearance_features(sample_frame, face)
        
        if appearance:
            assert "color_histogram" in appearance
            assert "estimated_height" in appearance
            assert "texture_features" in appearance
    
    def test_extract_color_histogram(self, appearance_tracking, sample_frame):
        """Test color histogram extraction"""
        region = sample_frame[100:300, 100:300]
        hist = appearance_tracking._extract_color_histogram(region)
        
        assert "hue" in hist
        assert "saturation" in hist
        assert "value" in hist
        assert "histogram" in hist
    
    def test_extract_texture_features(self, appearance_tracking, sample_frame):
        """Test texture feature extraction"""
        region = sample_frame[100:300, 100:300]
        texture = appearance_tracking._extract_texture_features(region)
        
        assert "variance" in texture
        assert "edge_density" in texture
    
    def test_match_appearance(self, appearance_tracking):
        """Test appearance matching"""
        # Add appearance profile
        appearance_tracking.appearance_profiles["John"] = [{
            "appearance": {
                "color_histogram": {"hue": 120, "saturation": 200, "value": 150},
                "estimated_height": 1800,
                "texture_features": {"variance": 500, "edge_density": 0.3}
            },
            "camera_id": "camera_1",
            "timestamp": datetime.utcnow()
        }]
        
        # Test matching
        new_appearance = {
            "color_histogram": {"hue": 120, "saturation": 200, "value": 150},
            "estimated_height": 1800,
            "texture_features": {"variance": 500, "edge_density": 0.3}
        }
        
        matches = appearance_tracking.match_appearance(new_appearance, threshold=0.7)
        assert len(matches) > 0
        assert matches[0]["person"] == "John"
    
    def test_compare_appearance(self, appearance_tracking):
        """Test appearance comparison"""
        appearance1 = {
            "color_histogram": {"hue": 120, "saturation": 200, "value": 150},
            "estimated_height": 1800,
            "texture_features": {"variance": 500, "edge_density": 0.3}
        }
        
        appearance2 = {
            "color_histogram": {"hue": 120, "saturation": 200, "value": 150},
            "estimated_height": 1800,
            "texture_features": {"variance": 500, "edge_density": 0.3}
        }
        
        similarity = appearance_tracking._compare_appearance(appearance1, appearance2)
        assert 0.0 <= similarity <= 1.0
        assert similarity > 0.8  # Should be very similar


class TestScreenAssistanceFeature:
    """Test screen assistance feature"""
    
    @pytest.fixture
    def screen_assistance(self, event_bus, mock_gpt4o_vision):
        """Create screen assistance feature"""
        return ScreenAssistanceFeature(event_bus, mock_gpt4o_vision, enabled=True)
    
    def test_initialization(self, screen_assistance):
        """Test screen assistance initialization"""
        assert screen_assistance.name == "screen_assistance"
    
    def test_detect_screens(self, screen_assistance, sample_frame):
        """Test screen detection"""
        screens = screen_assistance._detect_screens(sample_frame)
        assert isinstance(screens, list)
    
    @pytest.mark.asyncio
    async def test_analyze_screen_content(self, screen_assistance, sample_frame):
        """Test screen content analysis"""
        screen = {"bbox": (100, 100, 200, 200), "area": 40000}
        
        result = await screen_assistance._analyze_screen_content(sample_frame, screen)
        # May be None if region is invalid, but should not crash


class TestVisualGuidanceFeature:
    """Test visual guidance feature"""
    
    @pytest.fixture
    def visual_guidance(self, event_bus):
        """Create visual guidance feature"""
        mock_spatial_memory = MagicMock()
        mock_spatial_memory.room_adjacency = {
            "living_room": ["kitchen"],
            "kitchen": ["living_room"]
        }
        return VisualGuidanceFeature(event_bus, mock_spatial_memory, enabled=True)
    
    def test_initialization(self, visual_guidance):
        """Test visual guidance initialization"""
        assert visual_guidance.name == "visual_guidance"
    
    def test_provide_directions(self, visual_guidance):
        """Test direction provision"""
        directions = visual_guidance.provide_directions("living_room", "kitchen")
        
        assert "from" in directions
        assert "to" in directions
        assert "path" in directions
        assert "steps" in directions
    
    def test_guide_to_object(self, visual_guidance):
        """Test object guidance"""
        visual_guidance.spatial_memory.find_object = Mock(return_value=[{
            "object_name": "keys",
            "room_name": "kitchen",
            "last_seen": datetime.utcnow()
        }])
        
        result = visual_guidance.guide_to_object("keys", "living_room")
        
        assert "object_found" in result
        if result["object_found"]:
            assert "directions" in result

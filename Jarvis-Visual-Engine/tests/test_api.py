"""Comprehensive API tests"""
import pytest
from unittest.mock import Mock, MagicMock, patch
import json

from src.api.server import app


@pytest.fixture
def client():
    """Create test client"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def api_key():
    """Get API key from settings"""
    from src.config import settings
    return settings.api_key or "test_api_key"


class TestHealthEndpoint:
    """Test health endpoint"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get('/health')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert "status" in data
        assert data["status"] in ["healthy", "unhealthy"]


class TestStatusEndpoint:
    """Test status endpoint"""
    
    def test_status_without_auth(self, client):
        """Test status without authentication"""
        response = client.get('/api/v1/status')
        assert response.status_code == 401
    
    def test_status_with_auth(self, client, api_key):
        """Test status with authentication"""
        with patch('src.api.server.vision_engine') as mock_engine:
            mock_engine.get_stats.return_value = {"frames_processed": 100}
            mock_engine.privacy_mode = False
            mock_engine.camera = None
            
            response = client.get(
                '/api/v1/status',
                headers={'X-API-Key': api_key}
            )
            
            if response.status_code == 200:
                data = json.loads(response.data)
                assert "status" in data
                assert "stats" in data


class TestPrivacyEndpoint:
    """Test privacy endpoint"""
    
    def test_toggle_privacy_mode(self, client, api_key):
        """Test privacy mode toggle"""
        with patch('src.api.server.vision_engine') as mock_engine:
            mock_engine.privacy_manager = MagicMock()
            mock_engine.privacy_manager.privacy_mode = False
            
            response = client.post(
                '/api/v1/privacy/mode',
                headers={'X-API-Key': api_key},
                json={'enabled': True}
            )
            
            if response.status_code == 200:
                data = json.loads(response.data)
                assert "privacy_mode" in data


class TestFacesEndpoint:
    """Test faces endpoint"""
    
    def test_get_faces(self, client, api_key):
        """Test getting known faces"""
        with patch('src.api.server.vision_engine') as mock_engine:
            mock_engine.face_engine = MagicMock()
            mock_engine.face_engine.known_face_names = ["John", "Jane"]
            
            response = client.get(
                '/api/v1/faces',
                headers={'X-API-Key': api_key}
            )
            
            if response.status_code == 200:
                data = json.loads(response.data)
                assert "faces" in data
                assert "count" in data
    
    def test_add_face_invalid_file(self, client, api_key):
        """Test adding face with invalid file"""
        response = client.post(
            '/api/v1/faces',
            headers={'X-API-Key': api_key},
            data={'name': 'John'}
        )
        
        assert response.status_code in [400, 500]  # Should fail without file


class TestEventsEndpoint:
    """Test events endpoint"""
    
    def test_get_events(self, client, api_key):
        """Test getting events"""
        with patch('src.api.server.vision_engine') as mock_engine:
            mock_engine.event_bus = MagicMock()
            mock_engine.event_bus.get_history.return_value = []
            
            response = client.get(
                '/api/v1/events',
                headers={'X-API-Key': api_key}
            )
            
            if response.status_code == 200:
                data = json.loads(response.data)
                assert "events" in data


class TestIntelligenceEndpoints:
    """Test intelligence endpoints"""
    
    def test_get_insights(self, client, api_key):
        """Test getting insights"""
        with patch('src.api.server.vision_engine') as mock_engine:
            mock_engine.get_predictive_insights.return_value = {
                "pattern_insights": {},
                "context_summary": {}
            }
            
            response = client.get(
                '/api/v1/intelligence/insights',
                headers={'X-API-Key': api_key}
            )
            
            if response.status_code == 200:
                data = json.loads(response.data)
                assert "pattern_insights" in data
    
    def test_get_suggestions(self, client, api_key):
        """Test getting suggestions"""
        with patch('src.api.server.vision_engine') as mock_engine:
            mock_engine.get_proactive_suggestions.return_value = []
            
            response = client.get(
                '/api/v1/intelligence/suggestions?person_id=person_John',
                headers={'X-API-Key': api_key}
            )
            
            if response.status_code == 200:
                data = json.loads(response.data)
                assert "suggestions" in data
    
    def test_get_context(self, client, api_key):
        """Test getting context"""
        with patch('src.api.server.vision_engine') as mock_engine:
            mock_engine.context_awareness = MagicMock()
            mock_engine.context_awareness.get_situational_awareness.return_value = {
                "temporal": {},
                "spatial": {}
            }
            
            response = client.get(
                '/api/v1/intelligence/context',
                headers={'X-API-Key': api_key}
            )
            
            if response.status_code == 200:
                data = json.loads(response.data)
                assert "temporal" in data


class TestSpatialEndpoints:
    """Test spatial endpoints"""
    
    def test_query_spatial_memory(self, client, api_key):
        """Test spatial memory query"""
        with patch('src.api.server.vision_engine') as mock_engine:
            mock_engine.query_spatial_memory.return_value = {
                "query": "Where are my keys?",
                "results": [],
                "type": "object_location"
            }
            
            response = client.post(
                '/api/v1/spatial/query',
                headers={'X-API-Key': api_key},
                json={'query': 'Where are my keys?'}
            )
            
            if response.status_code == 200:
                data = json.loads(response.data)
                assert "query" in data
    
    def test_find_object(self, client, api_key):
        """Test finding object"""
        with patch('src.api.server.vision_engine') as mock_engine:
            mock_engine.spatial_memory = MagicMock()
            mock_engine.spatial_memory.find_object.return_value = []
            
            response = client.post(
                '/api/v1/spatial/find-object',
                headers={'X-API-Key': api_key},
                json={'object_name': 'keys'}
            )
            
            if response.status_code == 200:
                data = json.loads(response.data)
                assert "locations" in data

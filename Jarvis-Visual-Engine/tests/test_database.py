"""Comprehensive database tests for Vision Engine"""
import pytest
from unittest.mock import Mock, MagicMock, patch, create_autospec
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from src.database.connection import Database, DatabaseConfig
from src.database.models import (
    User, Camera, Frame, Detection, Person, PersonLocation, Object,
    Event, Analysis, PatternLearning, SpatialMemory, ContextData,
    Consent, AuditLog
)
from src.database.queries import (
    UserQueries, CameraQueries, FrameQueries, DetectionQueries,
    PersonQueries, LocationQueries, ObjectQueries, EventQueries,
    AnalysisQueries, PatternQueries, SpatialMemoryQueries,
    ConsentQueries, AuditQueries
)


class TestDatabaseConnection:
    """Test database connection and pooling"""
    
    def test_database_config(self):
        """Test database configuration"""
        config = DatabaseConfig(
            database_url="postgresql://user:pass@localhost/db",
            pool_size=10,
            max_overflow=20
        )
        assert config.database_url == "postgresql://user:pass@localhost/db"
        assert config.pool_size == 10
        assert config.max_overflow == 20
    
    def test_database_config_async_url(self):
        """Test async URL conversion"""
        config = DatabaseConfig(database_url="postgresql://user:pass@localhost/db")
        async_url = config.get_async_url()
        assert async_url.startswith("postgresql+asyncpg://")
    
    @patch('src.database.connection.create_engine')
    def test_connect(self, mock_create_engine):
        """Test database connection"""
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine
        mock_engine.connect.return_value.__enter__.return_value.execute.return_value = None
        
        config = DatabaseConfig(database_url="postgresql://test:test@localhost/test")
        db = Database(config)
        result = db.connect()
        
        assert result is True
        assert db.engine is not None
        assert db.SessionLocal is not None
    
    def test_health_check(self):
        """Test health check"""
        config = DatabaseConfig(database_url="postgresql://test:test@localhost/test")
        db = Database(config)
        db.engine = MagicMock()
        db.engine.connect.return_value.__enter__.return_value.execute.return_value = None
        
        result = db.health_check()
        assert isinstance(result, bool)


class TestUserQueries:
    """Test user queries"""
    
    @pytest.fixture
    def mock_session(self):
        return create_autospec(Session, instance=True)
    
    def test_create_user(self, mock_session):
        """Test creating user"""
        user = UserQueries.create_user(mock_session, "testuser", "test@example.com")
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        mock_session.add.assert_called_once()
        mock_session.flush.assert_called_once()
    
    def test_get_user_by_id(self, mock_session):
        """Test getting user by ID"""
        mock_user = User(id=1, username="testuser", email="test@example.com")
        mock_session.query.return_value.filter.return_value.first.return_value = mock_user
        
        user = UserQueries.get_user_by_id(mock_session, 1)
        assert user.id == 1
        assert user.username == "testuser"


class TestCameraQueries:
    """Test camera queries"""
    
    @pytest.fixture
    def mock_session(self):
        return create_autospec(Session, instance=True)
    
    def test_create_camera(self, mock_session):
        """Test creating camera"""
        camera = CameraQueries.create_camera(
            mock_session,
            name="Test Camera",
            camera_type="obsbot",
            ip_address="192.168.1.100"
        )
        assert camera.name == "Test Camera"
        assert camera.camera_type == "obsbot"
        mock_session.add.assert_called_once()
    
    def test_get_active_cameras(self, mock_session):
        """Test getting active cameras"""
        mock_cameras = [Camera(id=1, name="Cam1", status="connected")]
        mock_session.query.return_value.filter.return_value.all.return_value = mock_cameras
        
        cameras = CameraQueries.get_active_cameras(mock_session)
        assert len(cameras) == 1
        assert cameras[0].status == "connected"


class TestFrameQueries:
    """Test frame queries"""
    
    @pytest.fixture
    def mock_session(self):
        return create_autospec(Session, instance=True)
    
    def test_save_frame(self, mock_session):
        """Test saving frame"""
        frame = FrameQueries.save_frame(
            mock_session,
            camera_id=1,
            width=1920,
            height=1080,
            motion_detected=True,
            motion_score=0.8
        )
        assert frame.width == 1920
        assert frame.height == 1080
        assert frame.motion_detected is True
        mock_session.add.assert_called_once()
    
    def test_get_latest_frame(self, mock_session):
        """Test getting latest frame"""
        mock_frame = Frame(id=1, camera_id=1, width=1920, height=1080)
        mock_session.query.return_value.filter.return_value.order_by.return_value.first.return_value = mock_frame
        
        frame = FrameQueries.get_latest_frame(mock_session, camera_id=1)
        assert frame.id == 1


class TestDetectionQueries:
    """Test detection queries"""
    
    @pytest.fixture
    def mock_session(self):
        return create_autospec(Session, instance=True)
    
    def test_save_detection(self, mock_session):
        """Test saving detection"""
        detection = DetectionQueries.save_detection(
            mock_session,
            frame_id=1,
            camera_id=1,
            object_type="person",
            label="John",
            confidence=0.95,
            x1=10, y1=20, x2=100, y2=200
        )
        assert detection.label == "John"
        assert detection.confidence == 0.95
        mock_session.add.assert_called_once()


class TestPersonQueries:
    """Test person queries"""
    
    @pytest.fixture
    def mock_session(self):
        return create_autospec(Session, instance=True)
    
    def test_create_person(self, mock_session):
        """Test creating person"""
        person = PersonQueries.create_person(
            mock_session,
            name="John",
            appearance_features={"height": 180}
        )
        assert person.name == "John"
        mock_session.add.assert_called_once()
    
    def test_update_person_location(self, mock_session):
        """Test updating person location"""
        mock_person = Person(id=1, name="John")
        mock_session.query.return_value.filter.return_value.first.return_value = mock_person
        
        location = PersonQueries.update_person_location(
            mock_session,
            person_id=1,
            camera_id=1,
            room="living_room",
            confidence=0.9
        )
        assert location.room == "living_room"
        mock_session.add.assert_called_once()


class TestObjectQueries:
    """Test object queries"""
    
    @pytest.fixture
    def mock_session(self):
        return create_autospec(Session, instance=True)
    
    def test_create_object(self, mock_session):
        """Test creating object"""
        obj = ObjectQueries.create_object(
            mock_session,
            name="keys",
            object_type="item",
            last_location={"room": "kitchen"}
        )
        assert obj.name == "keys"
        assert obj.object_type == "item"
        mock_session.add.assert_called_once()


class TestEventQueries:
    """Test event queries"""
    
    @pytest.fixture
    def mock_session(self):
        return create_autospec(Session, instance=True)
    
    def test_log_event(self, mock_session):
        """Test logging event"""
        event = EventQueries.log_event(
            mock_session,
            event_type="motion_detected",
            severity="low",
            camera_id=1,
            description="Motion detected"
        )
        assert event.event_type == "motion_detected"
        assert event.severity == "low"
        mock_session.add.assert_called_once()


class TestAnalysisQueries:
    """Test analysis queries"""
    
    @pytest.fixture
    def mock_session(self):
        return create_autospec(Session, instance=True)
    
    def test_save_analysis(self, mock_session):
        """Test saving analysis"""
        analysis = AnalysisQueries.save_analysis(
            mock_session,
            frame_id=1,
            api_provider="gpt4o",
            analysis_text="Test analysis",
            objects_detected=["person", "chair"],
            cost=0.01,
            processing_time_ms=500
        )
        assert analysis.api_provider == "gpt4o"
        assert analysis.cost == 0.01
        mock_session.add.assert_called_once()


class TestConsentQueries:
    """Test consent queries"""
    
    @pytest.fixture
    def mock_session(self):
        return create_autospec(Session, instance=True)
    
    def test_grant_consent(self, mock_session):
        """Test granting consent"""
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        consent = ConsentQueries.grant_consent(
            mock_session,
            user_id=1,
            feature="face_recognition"
        )
        assert consent.granted is True
        assert consent.feature == "face_recognition"
        mock_session.add.assert_called_once()
    
    def test_has_consent(self, mock_session):
        """Test checking consent"""
        mock_consent = Consent(user_id=1, feature="face_recognition", granted=True)
        mock_session.query.return_value.filter.return_value.first.return_value = mock_consent
        
        has_consent = ConsentQueries.has_consent(mock_session, 1, "face_recognition")
        assert has_consent is True


class TestAuditQueries:
    """Test audit queries"""
    
    @pytest.fixture
    def mock_session(self):
        return create_autospec(Session, instance=True)
    
    def test_log_audit(self, mock_session):
        """Test logging audit event"""
        audit = AuditQueries.log_audit(
            mock_session,
            action="user_login",
            user_id=1,
            entity_type="user",
            changes={"status": "logged_in"}
        )
        assert audit.action == "user_login"
        assert audit.user_id == 1
        mock_session.add.assert_called_once()


class TestSpatialMemoryQueries:
    """Test spatial memory queries"""
    
    @pytest.fixture
    def mock_session(self):
        return create_autospec(Session, instance=True)
    
    def test_save_spatial_data(self, mock_session):
        """Test saving spatial data"""
        spatial = SpatialMemoryQueries.save_spatial_data(
            mock_session,
            entity_id=1,
            entity_type="person",
            room="living_room",
            confidence=0.9,
            x_position=1.5,
            y_position=2.0
        )
        assert spatial.room == "living_room"
        assert spatial.entity_type == "person"
        mock_session.add.assert_called_once()


class TestPatternQueries:
    """Test pattern learning queries"""
    
    @pytest.fixture
    def mock_session(self):
        return create_autospec(Session, instance=True)
    
    def test_save_pattern(self, mock_session):
        """Test saving pattern"""
        pattern = PatternQueries.save_pattern(
            mock_session,
            pattern_type="routine",
            description="Morning routine",
            confidence=0.85,
            person_id=1
        )
        assert pattern.pattern_type == "routine"
        assert pattern.confidence == 0.85
        mock_session.add.assert_called_once()


class TestModelMethods:
    """Test model to_dict and __repr__ methods"""
    
    def test_user_to_dict(self):
        """Test User.to_dict()"""
        user = User(
            id=1,
            username="testuser",
            email="test@example.com",
            created_at=datetime.utcnow()
        )
        data = user.to_dict()
        assert data["id"] == 1
        assert data["username"] == "testuser"
        assert "created_at" in data
    
    def test_camera_to_dict(self):
        """Test Camera.to_dict()"""
        camera = Camera(
            id=1,
            name="Test Camera",
            camera_type="obsbot",
            status="connected"
        )
        data = camera.to_dict()
        assert data["id"] == 1
        assert data["name"] == "Test Camera"
        assert data["status"] == "connected"
    
    def test_frame_to_dict(self):
        """Test Frame.to_dict()"""
        frame = Frame(
            id=1,
            camera_id=1,
            width=1920,
            height=1080,
            motion_detected=True
        )
        data = frame.to_dict()
        assert data["width"] == 1920
        assert data["motion_detected"] is True

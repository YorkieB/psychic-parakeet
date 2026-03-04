"""Complete query layer for Vision Engine database operations"""
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, func, and_, or_, select, update, delete
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
import logging
import json

from src.database.models import (
    User, Camera, Frame, Detection, Person, PersonLocation, Object,
    Event, Analysis, PatternLearning, SpatialMemory, ContextData,
    Consent, AuditLog
)

logger = logging.getLogger(__name__)


class UserQueries:
    """User-related queries"""
    
    @staticmethod
    def get_user_by_id(session: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return session.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_user_by_username(session: Session, username: str) -> Optional[User]:
        """Get user by username"""
        return session.query(User).filter(User.username == username).first()
    
    @staticmethod
    def create_user(session: Session, username: str, email: str) -> User:
        """Create new user"""
        user = User(username=username, email=email)
        session.add(user)
        session.flush()
        return user
    
    @staticmethod
    def update_user(session: Session, user_id: int, **kwargs) -> Optional[User]:
        """Update user"""
        user = session.query(User).filter(User.id == user_id).first()
        if user:
            for key, value in kwargs.items():
                if hasattr(user, key):
                    setattr(user, key, value)
            session.flush()
        return user
    
    @staticmethod
    def delete_user(session: Session, user_id: int) -> bool:
        """Delete user"""
        user = session.query(User).filter(User.id == user_id).first()
        if user:
            session.delete(user)
            session.flush()
            return True
        return False


class CameraQueries:
    """Camera-related queries"""
    
    @staticmethod
    def get_all_cameras(session: Session) -> List[Camera]:
        """Get all cameras"""
        return session.query(Camera).all()
    
    @staticmethod
    def get_camera_by_id(session: Session, camera_id: int) -> Optional[Camera]:
        """Get camera by ID"""
        return session.query(Camera).filter(Camera.id == camera_id).first()
    
    @staticmethod
    def create_camera(session: Session, name: str, camera_type: str, 
                     ip_address: Optional[str] = None, port: int = 80,
                     username: Optional[str] = None, 
                     password_encrypted: Optional[bytes] = None) -> Camera:
        """Create new camera"""
        camera = Camera(
            name=name,
            camera_type=camera_type,
            ip_address=ip_address,
            port=port,
            username=username,
            password_encrypted=password_encrypted
        )
        session.add(camera)
        session.flush()
        return camera
    
    @staticmethod
    def update_camera_status(session: Session, camera_id: int, 
                           status: str, last_connected_at: Optional[datetime] = None) -> Optional[Camera]:
        """Update camera status"""
        camera = session.query(Camera).filter(Camera.id == camera_id).first()
        if camera:
            camera.status = status
            if last_connected_at:
                camera.last_connected_at = last_connected_at
            session.flush()
        return camera
    
    @staticmethod
    def get_active_cameras(session: Session) -> List[Camera]:
        """Get all active (connected) cameras"""
        return session.query(Camera).filter(Camera.status == 'connected').all()


class FrameQueries:
    """Frame-related queries"""
    
    @staticmethod
    def save_frame(session: Session, camera_id: int, width: int, height: int,
                  format: str = 'jpg', motion_detected: bool = False,
                  motion_score: float = 0.0, file_path: Optional[str] = None) -> Frame:
        """Save frame to database"""
        frame = Frame(
            camera_id=camera_id,
            width=width,
            height=height,
            format=format,
            motion_detected=motion_detected,
            motion_score=motion_score,
            file_path=file_path
        )
        session.add(frame)
        session.flush()
        return frame
    
    @staticmethod
    def get_latest_frame(session: Session, camera_id: Optional[int] = None) -> Optional[Frame]:
        """Get latest frame"""
        query = session.query(Frame)
        if camera_id:
            query = query.filter(Frame.camera_id == camera_id)
        return query.order_by(desc(Frame.timestamp)).first()
    
    @staticmethod
    def get_frames_for_camera(session: Session, camera_id: int, 
                              limit: int = 100, offset: int = 0) -> List[Frame]:
        """Get frames for specific camera"""
        return session.query(Frame).filter(
            Frame.camera_id == camera_id
        ).order_by(desc(Frame.timestamp)).limit(limit).offset(offset).all()
    
    @staticmethod
    def get_frames_by_date_range(session: Session, start: datetime, end: datetime,
                                 camera_id: Optional[int] = None) -> List[Frame]:
        """Get frames in date range"""
        query = session.query(Frame).filter(
            and_(Frame.timestamp >= start, Frame.timestamp <= end)
        )
        if camera_id:
            query = query.filter(Frame.camera_id == camera_id)
        return query.order_by(desc(Frame.timestamp)).all()
    
    @staticmethod
    def get_unprocessed_frames(session: Session, limit: int = 100) -> List[Frame]:
        """Get unprocessed frames"""
        return session.query(Frame).filter(
            Frame.processed == False
        ).order_by(Frame.timestamp).limit(limit).all()
    
    @staticmethod
    def mark_frame_processed(session: Session, frame_id: int) -> bool:
        """Mark frame as processed"""
        frame = session.query(Frame).filter(Frame.id == frame_id).first()
        if frame:
            frame.processed = True
            session.flush()
            return True
        return False


class DetectionQueries:
    """Detection-related queries"""
    
    @staticmethod
    def save_detection(session: Session, frame_id: int, camera_id: int,
                      object_type: str, label: str, confidence: float,
                      x1: int, y1: int, x2: int, y2: int,
                      metadata: Optional[Dict] = None) -> Detection:
        """Save detection"""
        detection = Detection(
            frame_id=frame_id,
            camera_id=camera_id,
            object_type=object_type,
            label=label,
            confidence=confidence,
            x1=x1, y1=y1, x2=x2, y2=y2,
            metadata=metadata
        )
        session.add(detection)
        session.flush()
        return detection
    
    @staticmethod
    def get_detections_for_frame(session: Session, frame_id: int) -> List[Detection]:
        """Get all detections for a frame"""
        return session.query(Detection).filter(
            Detection.frame_id == frame_id
        ).all()
    
    @staticmethod
    def get_detections_by_label(session: Session, label: str,
                                limit: int = 100) -> List[Detection]:
        """Get detections by label"""
        return session.query(Detection).filter(
            Detection.label == label
        ).order_by(desc(Detection.created_at)).limit(limit).all()
    
    @staticmethod
    def get_recent_detections(session: Session, hours: int = 24,
                             camera_id: Optional[int] = None) -> List[Detection]:
        """Get recent detections"""
        since = datetime.utcnow() - timedelta(hours=hours)
        query = session.query(Detection).filter(
            Detection.created_at >= since
        )
        if camera_id:
            query = query.filter(Detection.camera_id == camera_id)
        return query.order_by(desc(Detection.created_at)).all()


class PersonQueries:
    """Person-related queries"""
    
    @staticmethod
    def create_person(session: Session, name: Optional[str] = None,
                     appearance_features: Optional[Dict] = None,
                     face_encoding: Optional[bytes] = None,
                     metadata: Optional[Dict] = None) -> Person:
        """Create new person"""
        person = Person(
            name=name,
            appearance_features=appearance_features,
            face_encoding=face_encoding,
            metadata=metadata
        )
        session.add(person)
        session.flush()
        return person
    
    @staticmethod
    def get_person_by_id(session: Session, person_id: int) -> Optional[Person]:
        """Get person by ID"""
        return session.query(Person).filter(Person.id == person_id).first()
    
    @staticmethod
    def get_all_people(session: Session) -> List[Person]:
        """Get all people"""
        return session.query(Person).all()
    
    @staticmethod
    def update_person_location(session: Session, person_id: int, 
                               camera_id: int, room: Optional[str] = None,
                               confidence: float = 1.0,
                               frame_id: Optional[int] = None) -> PersonLocation:
        """Update person location"""
        # Update person's last_seen_at
        person = session.query(Person).filter(Person.id == person_id).first()
        if person:
            person.last_seen_at = datetime.utcnow()
        
        # Create location record
        location = PersonLocation(
            person_id=person_id,
            camera_id=camera_id,
            frame_id=frame_id,
            room=room,
            confidence=confidence
        )
        session.add(location)
        session.flush()
        return location
    
    @staticmethod
    def get_recent_people(session: Session, hours: int = 24) -> List[Person]:
        """Get people seen recently"""
        since = datetime.utcnow() - timedelta(hours=hours)
        return session.query(Person).filter(
            Person.last_seen_at >= since
        ).order_by(desc(Person.last_seen_at)).all()


class LocationQueries:
    """Location-related queries"""
    
    @staticmethod
    def save_location(session: Session, person_id: int, camera_id: int,
                     room: Optional[str] = None, confidence: float = 1.0,
                     frame_id: Optional[int] = None) -> PersonLocation:
        """Save person location"""
        location = PersonLocation(
            person_id=person_id,
            camera_id=camera_id,
            frame_id=frame_id,
            room=room,
            confidence=confidence
        )
        session.add(location)
        session.flush()
        return location
    
    @staticmethod
    def get_person_location_history(session: Session, person_id: int,
                                   hours: int = 24) -> List[PersonLocation]:
        """Get person location history"""
        since = datetime.utcnow() - timedelta(hours=hours)
        return session.query(PersonLocation).filter(
            and_(
                PersonLocation.person_id == person_id,
                PersonLocation.timestamp >= since
            )
        ).order_by(desc(PersonLocation.timestamp)).all()
    
    @staticmethod
    def get_last_seen_location(session: Session, person_id: int) -> Optional[PersonLocation]:
        """Get person's last seen location"""
        return session.query(PersonLocation).filter(
            PersonLocation.person_id == person_id
        ).order_by(desc(PersonLocation.timestamp)).first()
    
    @staticmethod
    def get_current_locations(session: Session, room: Optional[str] = None) -> List[PersonLocation]:
        """Get current locations (last 5 minutes)"""
        since = datetime.utcnow() - timedelta(minutes=5)
        query = session.query(PersonLocation).filter(
            PersonLocation.timestamp >= since
        )
        if room:
            query = query.filter(PersonLocation.room == room)
        
        # Get most recent location per person
        subquery = session.query(
            PersonLocation.person_id,
            func.max(PersonLocation.timestamp).label('max_timestamp')
        ).filter(PersonLocation.timestamp >= since).group_by(PersonLocation.person_id).subquery()
        
        return session.query(PersonLocation).join(
            subquery,
            and_(
                PersonLocation.person_id == subquery.c.person_id,
                PersonLocation.timestamp == subquery.c.max_timestamp
            )
        ).all()


class ObjectQueries:
    """Object-related queries"""
    
    @staticmethod
    def create_object(session: Session, name: str, object_type: str,
                     last_location: Optional[Dict] = None) -> Object:
        """Create new object"""
        obj = Object(
            name=name,
            object_type=object_type,
            last_location=last_location
        )
        session.add(obj)
        session.flush()
        return obj
    
    @staticmethod
    def get_object_by_name(session: Session, name: str) -> Optional[Object]:
        """Get object by name"""
        return session.query(Object).filter(Object.name == name).first()
    
    @staticmethod
    def update_object_location(session: Session, object_id: int,
                              last_location: Dict, frame_id: Optional[int] = None) -> Optional[Object]:
        """Update object location"""
        obj = session.query(Object).filter(Object.id == object_id).first()
        if obj:
            obj.last_location = last_location
            obj.last_seen_at = datetime.utcnow()
            if frame_id:
                obj.last_seen_frame_id = frame_id
            session.flush()
        return obj
    
    @staticmethod
    def get_all_objects(session: Session) -> List[Object]:
        """Get all objects"""
        return session.query(Object).all()
    
    @staticmethod
    def find_object(session: Session, name: str, object_type: Optional[str] = None) -> Optional[Object]:
        """Find object by name and optionally type"""
        query = session.query(Object).filter(Object.name == name)
        if object_type:
            query = query.filter(Object.object_type == object_type)
        return query.first()


class EventQueries:
    """Event-related queries"""
    
    @staticmethod
    def log_event(session: Session, event_type: str, severity: str = 'low',
                 camera_id: Optional[int] = None, description: Optional[str] = None,
                 metadata: Optional[Dict] = None) -> Event:
        """Log event"""
        event = Event(
            event_type=event_type,
            severity=severity,
            camera_id=camera_id,
            description=description,
            metadata=metadata
        )
        session.add(event)
        session.flush()
        return event
    
    @staticmethod
    def get_events(session: Session, limit: int = 100, offset: int = 0) -> List[Event]:
        """Get events"""
        return session.query(Event).order_by(
            desc(Event.created_at)
        ).limit(limit).offset(offset).all()
    
    @staticmethod
    def get_events_by_type(session: Session, event_type: str,
                          limit: int = 100) -> List[Event]:
        """Get events by type"""
        return session.query(Event).filter(
            Event.event_type == event_type
        ).order_by(desc(Event.created_at)).limit(limit).all()
    
    @staticmethod
    def get_unprocessed_events(session: Session, limit: int = 100) -> List[Event]:
        """Get unprocessed events"""
        return session.query(Event).filter(
            Event.processed == False
        ).order_by(Event.created_at).limit(limit).all()
    
    @staticmethod
    def mark_event_processed(session: Session, event_id: int) -> bool:
        """Mark event as processed"""
        event = session.query(Event).filter(Event.id == event_id).first()
        if event:
            event.processed = True
            session.flush()
            return True
        return False


class AnalysisQueries:
    """Analysis-related queries"""
    
    @staticmethod
    def save_analysis(session: Session, frame_id: int, api_provider: str,
                    analysis_text: Optional[str] = None,
                    objects_detected: Optional[List] = None,
                    scenes_detected: Optional[List] = None,
                    confidence: Optional[float] = None,
                    cost: float = 0.0,
                    processing_time_ms: Optional[int] = None) -> Analysis:
        """Save analysis result"""
        analysis = Analysis(
            frame_id=frame_id,
            api_provider=api_provider,
            analysis_text=analysis_text,
            objects_detected=objects_detected,
            scenes_detected=scenes_detected,
            confidence=confidence,
            cost=cost,
            processing_time_ms=processing_time_ms
        )
        session.add(analysis)
        session.flush()
        return analysis
    
    @staticmethod
    def get_analysis_for_frame(session: Session, frame_id: int) -> Optional[Analysis]:
        """Get analysis for frame"""
        return session.query(Analysis).filter(
            Analysis.frame_id == frame_id
        ).order_by(desc(Analysis.created_at)).first()
    
    @staticmethod
    def get_recent_analysis(session: Session, hours: int = 24,
                           limit: int = 100) -> List[Analysis]:
        """Get recent analysis"""
        since = datetime.utcnow() - timedelta(hours=hours)
        return session.query(Analysis).filter(
            Analysis.created_at >= since
        ).order_by(desc(Analysis.created_at)).limit(limit).all()
    
    @staticmethod
    def get_analysis_statistics(session: Session, hours: int = 24) -> Dict[str, Any]:
        """Get analysis statistics"""
        since = datetime.utcnow() - timedelta(hours=hours)
        
        total = session.query(func.count(Analysis.id)).filter(
            Analysis.created_at >= since
        ).scalar()
        
        total_cost = session.query(func.sum(Analysis.cost)).filter(
            Analysis.created_at >= since
        ).scalar() or 0.0
        
        avg_time = session.query(func.avg(Analysis.processing_time_ms)).filter(
            Analysis.created_at >= since
        ).scalar() or 0.0
        
        by_provider = session.query(
            Analysis.api_provider,
            func.count(Analysis.id).label('count')
        ).filter(
            Analysis.created_at >= since
        ).group_by(Analysis.api_provider).all()
        
        return {
            'total_analyses': total,
            'total_cost': float(total_cost),
            'avg_processing_time_ms': float(avg_time),
            'by_provider': {provider: count for provider, count in by_provider}
        }


class PatternQueries:
    """Pattern learning queries"""
    
    @staticmethod
    def save_pattern(session: Session, pattern_type: str, description: str,
                    confidence: float, person_id: Optional[int] = None,
                    frequency: int = 1, metadata: Optional[Dict] = None) -> PatternLearning:
        """Save pattern"""
        pattern = PatternLearning(
            pattern_type=pattern_type,
            person_id=person_id,
            description=description,
            frequency=frequency,
            metadata=metadata,
            confidence=confidence
        )
        session.add(pattern)
        session.flush()
        return pattern
    
    @staticmethod
    def get_patterns(session: Session, limit: int = 100) -> List[PatternLearning]:
        """Get patterns"""
        return session.query(PatternLearning).order_by(
            desc(PatternLearning.confidence)
        ).limit(limit).all()
    
    @staticmethod
    def get_patterns_for_person(session: Session, person_id: int) -> List[PatternLearning]:
        """Get patterns for person"""
        return session.query(PatternLearning).filter(
            PatternLearning.person_id == person_id
        ).order_by(desc(PatternLearning.confidence)).all()
    
    @staticmethod
    def get_recent_patterns(session: Session, hours: int = 24) -> List[PatternLearning]:
        """Get recent patterns"""
        since = datetime.utcnow() - timedelta(hours=hours)
        return session.query(PatternLearning).filter(
            PatternLearning.created_at >= since
        ).order_by(desc(PatternLearning.created_at)).all()


class SpatialMemoryQueries:
    """Spatial memory queries"""
    
    @staticmethod
    def save_spatial_data(session: Session, entity_id: int, entity_type: str,
                         room: str, confidence: float,
                         x_position: Optional[float] = None,
                         y_position: Optional[float] = None,
                         z_position: Optional[float] = None) -> SpatialMemory:
        """Save spatial data"""
        spatial = SpatialMemory(
            entity_id=entity_id,
            entity_type=entity_type,
            room=room,
            x_position=x_position,
            y_position=y_position,
            z_position=z_position,
            confidence=confidence
        )
        session.add(spatial)
        session.flush()
        return spatial
    
    @staticmethod
    def query_location(session: Session, entity_id: int, entity_type: str) -> Optional[SpatialMemory]:
        """Query entity location"""
        return session.query(SpatialMemory).filter(
            and_(
                SpatialMemory.entity_id == entity_id,
                SpatialMemory.entity_type == entity_type
            )
        ).order_by(desc(SpatialMemory.timestamp)).first()
    
    @staticmethod
    def get_entity_history(session: Session, entity_id: int, entity_type: str,
                          hours: int = 24) -> List[SpatialMemory]:
        """Get entity location history"""
        since = datetime.utcnow() - timedelta(hours=hours)
        return session.query(SpatialMemory).filter(
            and_(
                SpatialMemory.entity_id == entity_id,
                SpatialMemory.entity_type == entity_type,
                SpatialMemory.timestamp >= since
            )
        ).order_by(desc(SpatialMemory.timestamp)).all()
    
    @staticmethod
    def find_nearest_entities(session: Session, room: str, entity_type: str,
                             limit: int = 10) -> List[SpatialMemory]:
        """Find entities in room"""
        since = datetime.utcnow() - timedelta(minutes=5)
        return session.query(SpatialMemory).filter(
            and_(
                SpatialMemory.room == room,
                SpatialMemory.entity_type == entity_type,
                SpatialMemory.timestamp >= since
            )
        ).order_by(desc(SpatialMemory.timestamp)).limit(limit).all()


class ConsentQueries:
    """Consent-related queries"""
    
    @staticmethod
    def grant_consent(session: Session, user_id: int, feature: str) -> Consent:
        """Grant consent"""
        consent = session.query(Consent).filter(
            and_(
                Consent.user_id == user_id,
                Consent.feature == feature
            )
        ).first()
        
        if consent:
            consent.granted = True
            consent.granted_at = datetime.utcnow()
            consent.revoked_at = None
        else:
            consent = Consent(
                user_id=user_id,
                feature=feature,
                granted=True,
                granted_at=datetime.utcnow()
            )
            session.add(consent)
        
        session.flush()
        return consent
    
    @staticmethod
    def revoke_consent(session: Session, user_id: int, feature: str) -> Optional[Consent]:
        """Revoke consent"""
        consent = session.query(Consent).filter(
            and_(
                Consent.user_id == user_id,
                Consent.feature == feature
            )
        ).first()
        
        if consent:
            consent.granted = False
            consent.revoked_at = datetime.utcnow()
            session.flush()
        
        return consent
    
    @staticmethod
    def has_consent(session: Session, user_id: int, feature: str) -> bool:
        """Check if user has consent"""
        consent = session.query(Consent).filter(
            and_(
                Consent.user_id == user_id,
                Consent.feature == feature,
                Consent.granted == True
            )
        ).first()
        return consent is not None
    
    @staticmethod
    def get_consent_status(session: Session, user_id: int) -> Dict[str, bool]:
        """Get all consent statuses for user"""
        consents = session.query(Consent).filter(
            Consent.user_id == user_id
        ).all()
        return {c.feature: c.granted for c in consents}


class AuditQueries:
    """Audit log queries"""
    
    @staticmethod
    def log_audit(session: Session, action: str, user_id: Optional[int] = None,
                 entity_type: Optional[str] = None, entity_id: Optional[int] = None,
                 changes: Optional[Dict] = None, ip_address: Optional[str] = None) -> AuditLog:
        """Log audit event"""
        audit = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            changes=changes,
            ip_address=ip_address
        )
        session.add(audit)
        session.flush()
        return audit
    
    @staticmethod
    def get_audit_log(session: Session, limit: int = 100, offset: int = 0) -> List[AuditLog]:
        """Get audit log"""
        return session.query(AuditLog).order_by(
            desc(AuditLog.timestamp)
        ).limit(limit).offset(offset).all()
    
    @staticmethod
    def get_user_audit_history(session: Session, user_id: int,
                               hours: int = 24) -> List[AuditLog]:
        """Get user audit history"""
        since = datetime.utcnow() - timedelta(hours=hours)
        return session.query(AuditLog).filter(
            and_(
                AuditLog.user_id == user_id,
                AuditLog.timestamp >= since
            )
        ).order_by(desc(AuditLog.timestamp)).all()


# Backward compatibility
PersonQueries = PersonQueries
ObjectQueries = ObjectQueries
RoomStateQueries = None  # RoomState model removed, use ContextData instead
SpatialMemoryQueries = SpatialMemoryQueries

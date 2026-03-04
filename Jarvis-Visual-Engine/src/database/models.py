"""Complete SQLAlchemy models for Vision Engine"""
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, DateTime, Text, 
    LargeBinary, Boolean, ForeignKey, JSON, CheckConstraint, Index, 
    UniqueConstraint, Numeric
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import BYTEA, JSONB
from datetime import datetime
from typing import Dict, Any, Optional
import json

Base = declarative_base()


class User(Base):
    """System users"""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    consents = relationship('Consent', back_populates='user', cascade='all, delete-orphan')
    audit_logs = relationship('AuditLog', back_populates='user', cascade='all, delete-orphan')
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Camera(Base):
    """Camera configurations"""
    __tablename__ = 'cameras'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    camera_type = Column(String(50), nullable=False)  # obsbot, onvif, emeet, fixed
    ip_address = Column(String(50), nullable=True)
    port = Column(Integer, default=80)
    username = Column(String(255), nullable=True)
    password_encrypted = Column(LargeBinary, nullable=True)  # AES-256 encrypted
    status = Column(String(50), default='disconnected')  # connected, disconnected, error
    last_connected_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    frames = relationship('Frame', back_populates='camera', cascade='all, delete-orphan')
    detections = relationship('Detection', back_populates='camera', cascade='all, delete-orphan')
    events = relationship('Event', back_populates='camera', cascade='all, delete-orphan')
    person_locations = relationship('PersonLocation', back_populates='camera', cascade='all, delete-orphan')
    
    __table_args__ = (
        CheckConstraint("status IN ('connected', 'disconnected', 'error')", name='check_camera_status'),
        Index('idx_camera_status', 'status'),
        Index('idx_camera_type', 'camera_type'),
    )
    
    def __repr__(self) -> str:
        return f"<Camera(id={self.id}, name='{self.name}', type='{self.camera_type}', status='{self.status}')>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'camera_type': self.camera_type,
            'ip_address': self.ip_address,
            'port': self.port,
            'status': self.status,
            'last_connected_at': self.last_connected_at.isoformat() if self.last_connected_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Frame(Base):
    """Video frames"""
    __tablename__ = 'frames'
    
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey('cameras.id', ondelete='CASCADE'), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    format = Column(String(10), default='jpg')  # jpg, png, raw
    motion_detected = Column(Boolean, default=False, index=True)
    motion_score = Column(Float, default=0.0)  # 0-1
    file_path = Column(String(500), nullable=True)
    processed = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    camera = relationship('Camera', back_populates='frames')
    detections = relationship('Detection', back_populates='frame', cascade='all, delete-orphan')
    analyses = relationship('Analysis', back_populates='frame', cascade='all, delete-orphan')
    
    __table_args__ = (
        CheckConstraint("motion_score >= 0 AND motion_score <= 1", name='check_motion_score'),
        CheckConstraint("format IN ('jpg', 'png', 'raw')", name='check_frame_format'),
        Index('idx_frame_camera_timestamp', 'camera_id', 'timestamp'),
        Index('idx_frame_processed', 'processed', 'timestamp'),
    )
    
    def __repr__(self) -> str:
        return f"<Frame(id={self.id}, camera_id={self.camera_id}, {self.width}x{self.height}, motion={self.motion_detected})>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'camera_id': self.camera_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'width': self.width,
            'height': self.height,
            'format': self.format,
            'motion_detected': self.motion_detected,
            'motion_score': self.motion_score,
            'file_path': self.file_path,
            'processed': self.processed,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Detection(Base):
    """Object detections"""
    __tablename__ = 'detections'
    
    id = Column(Integer, primary_key=True, index=True)
    frame_id = Column(Integer, ForeignKey('frames.id', ondelete='CASCADE'), nullable=False, index=True)
    camera_id = Column(Integer, ForeignKey('cameras.id', ondelete='CASCADE'), nullable=False, index=True)
    object_type = Column(String(50), nullable=False)  # person, object, scene
    label = Column(String(255), nullable=False, index=True)
    confidence = Column(Float, nullable=False)  # 0-1
    x1 = Column(Integer, nullable=False)  # Bounding box
    y1 = Column(Integer, nullable=False)
    x2 = Column(Integer, nullable=False)
    y2 = Column(Integer, nullable=False)
    meta_data = Column(JSONB, nullable=True)  # Additional detection data
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    frame = relationship('Frame', back_populates='detections')
    camera = relationship('Camera', back_populates='detections')
    
    __table_args__ = (
        CheckConstraint("confidence >= 0 AND confidence <= 1", name='check_detection_confidence'),
        CheckConstraint("object_type IN ('person', 'object', 'scene')", name='check_object_type'),
        CheckConstraint("x2 > x1 AND y2 > y1", name='check_bbox_valid'),
        Index('idx_detection_frame', 'frame_id', 'object_type'),
        Index('idx_detection_label', 'label', 'confidence'),
        Index('idx_detection_timestamp', 'created_at'),
    )
    
    def __repr__(self) -> str:
        return f"<Detection(id={self.id}, frame_id={self.frame_id}, type='{self.object_type}', label='{self.label}', conf={self.confidence:.2f})>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'frame_id': self.frame_id,
            'camera_id': self.camera_id,
            'object_type': self.object_type,
            'label': self.label,
            'confidence': self.confidence,
            'bbox': {'x1': self.x1, 'y1': self.y1, 'x2': self.x2, 'y2': self.y2},
            'metadata': self.meta_data if self.meta_data else {},
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Person(Base):
    """Identified people"""
    __tablename__ = 'persons'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=True, index=True)
    first_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    appearance_features = Column(JSONB, nullable=True)  # color histogram, height, texture, etc
    face_encoding = Column(BYTEA, nullable=True)  # 128-dim face vector
    meta_data = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    locations = relationship('PersonLocation', back_populates='person', cascade='all, delete-orphan')
    patterns = relationship('PatternLearning', back_populates='person', cascade='all, delete-orphan')
    
    __table_args__ = (
        Index('idx_person_name', 'name'),
        Index('idx_person_last_seen', 'last_seen_at'),
    )
    
    def __repr__(self) -> str:
        return f"<Person(id={self.id}, name='{self.name}', last_seen={self.last_seen_at})>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'first_seen_at': self.first_seen_at.isoformat() if self.first_seen_at else None,
            'last_seen_at': self.last_seen_at.isoformat() if self.last_seen_at else None,
            'appearance_features': self.appearance_features if self.appearance_features else {},
            'has_face_encoding': self.face_encoding is not None,
            'metadata': self.meta_data if self.meta_data else {},
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class PersonLocation(Base):
    """Person tracking over time"""
    __tablename__ = 'person_locations'
    
    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey('persons.id', ondelete='CASCADE'), nullable=False, index=True)
    frame_id = Column(Integer, ForeignKey('frames.id', ondelete='CASCADE'), nullable=True, index=True)
    camera_id = Column(Integer, ForeignKey('cameras.id', ondelete='CASCADE'), nullable=False, index=True)
    room = Column(String(100), nullable=True, index=True)
    confidence = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    person = relationship('Person', back_populates='locations')
    frame = relationship('Frame')
    camera = relationship('Camera', back_populates='person_locations')
    
    __table_args__ = (
        CheckConstraint("confidence >= 0 AND confidence <= 1", name='check_location_confidence'),
        Index('idx_person_location_time', 'person_id', 'timestamp'),
        Index('idx_location_room', 'room', 'timestamp'),
    )
    
    def __repr__(self) -> str:
        return f"<PersonLocation(id={self.id}, person_id={self.person_id}, room='{self.room}', timestamp={self.timestamp})>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'person_id': self.person_id,
            'frame_id': self.frame_id,
            'camera_id': self.camera_id,
            'room': self.room,
            'confidence': self.confidence,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Object(Base):
    """Objects in the environment"""
    __tablename__ = 'objects'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    object_type = Column(String(100), nullable=False)  # furniture, device, item, etc
    last_seen_frame_id = Column(Integer, ForeignKey('frames.id', ondelete='SET NULL'), nullable=True)
    last_location = Column(JSONB, nullable=True)  # {room, x, y, z, camera_id}
    last_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    last_seen_frame = relationship('Frame')
    
    __table_args__ = (
        Index('idx_object_name_type', 'name', 'object_type'),
        Index('idx_object_last_seen', 'last_seen_at'),
    )
    
    def __repr__(self) -> str:
        return f"<Object(id={self.id}, name='{self.name}', type='{self.object_type}', last_seen={self.last_seen_at})>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'object_type': self.object_type,
            'last_seen_frame_id': self.last_seen_frame_id,
            'last_location': self.last_location if self.last_location else {},
            'last_seen_at': self.last_seen_at.isoformat() if self.last_seen_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Event(Base):
    """Vision Engine events"""
    __tablename__ = 'events'
    
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)  # motion_detected, person_entered, object_found, etc
    camera_id = Column(Integer, ForeignKey('cameras.id', ondelete='CASCADE'), nullable=True, index=True)
    severity = Column(String(20), default='low')  # low, medium, high
    description = Column(Text, nullable=True)
    meta_data = Column(JSONB, nullable=True)
    processed = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    camera = relationship('Camera', back_populates='events')
    
    __table_args__ = (
        CheckConstraint("severity IN ('low', 'medium', 'high')", name='check_event_severity'),
        Index('idx_event_type_time', 'event_type', 'created_at'),
        Index('idx_event_processed', 'processed', 'created_at'),
    )
    
    def __repr__(self) -> str:
        return f"<Event(id={self.id}, type='{self.event_type}', severity='{self.severity}', processed={self.processed})>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'event_type': self.event_type,
            'camera_id': self.camera_id,
            'severity': self.severity,
            'description': self.description,
            'metadata': self.meta_data if self.meta_data else {},
            'processed': self.processed,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Analysis(Base):
    """AI analysis results"""
    __tablename__ = 'analyses'
    
    id = Column(Integer, primary_key=True, index=True)
    frame_id = Column(Integer, ForeignKey('frames.id', ondelete='CASCADE'), nullable=False, index=True)
    api_provider = Column(String(50), nullable=False)  # gpt4o, claude
    analysis_text = Column(Text, nullable=True)
    objects_detected = Column(JSONB, nullable=True)  # Array of detected objects
    scenes_detected = Column(JSONB, nullable=True)  # Array of detected scenes
    confidence = Column(Float, nullable=True)  # 0-1
    cost = Column(Numeric(10, 4), default=0.0)  # Cost in dollars (cents stored as int)
    processing_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    frame = relationship('Frame', back_populates='analyses')
    
    __table_args__ = (
        CheckConstraint("confidence IS NULL OR (confidence >= 0 AND confidence <= 1)", name='check_analysis_confidence'),
        CheckConstraint("api_provider IN ('gpt4o', 'claude')", name='check_api_provider'),
        Index('idx_analysis_frame', 'frame_id', 'created_at'),
        Index('idx_analysis_provider', 'api_provider', 'created_at'),
    )
    
    def __repr__(self) -> str:
        return f"<Analysis(id={self.id}, frame_id={self.frame_id}, provider='{self.api_provider}', cost=${float(self.cost):.4f})>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'frame_id': self.frame_id,
            'api_provider': self.api_provider,
            'analysis_text': self.analysis_text,
            'objects_detected': self.objects_detected if self.objects_detected else [],
            'scenes_detected': self.scenes_detected if self.scenes_detected else [],
            'confidence': float(self.confidence) if self.confidence else None,
            'cost': float(self.cost) if self.cost else 0.0,
            'processing_time_ms': self.processing_time_ms,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class PatternLearning(Base):
    """Pattern learning data"""
    __tablename__ = 'pattern_learning'
    
    id = Column(Integer, primary_key=True, index=True)
    pattern_type = Column(String(50), nullable=False, index=True)  # activity, routine, anomaly
    person_id = Column(Integer, ForeignKey('persons.id', ondelete='CASCADE'), nullable=True, index=True)
    description = Column(Text, nullable=False)
    frequency = Column(Integer, default=1)  # How many times pattern observed
    meta_data = Column(JSONB, nullable=True)
    confidence = Column(Float, nullable=False)  # 0-1
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    person = relationship('Person', back_populates='patterns')
    
    __table_args__ = (
        CheckConstraint("pattern_type IN ('activity', 'routine', 'anomaly')", name='check_pattern_type'),
        CheckConstraint("confidence >= 0 AND confidence <= 1", name='check_pattern_confidence'),
        Index('idx_pattern_person_type', 'person_id', 'pattern_type'),
        Index('idx_pattern_confidence', 'confidence', 'created_at'),
    )
    
    def __repr__(self) -> str:
        return f"<PatternLearning(id={self.id}, type='{self.pattern_type}', person_id={self.person_id}, confidence={self.confidence:.2f})>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'pattern_type': self.pattern_type,
            'person_id': self.person_id,
            'description': self.description,
            'frequency': self.frequency,
            'metadata': self.meta_data if self.meta_data else {},
            'confidence': self.confidence,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class SpatialMemory(Base):
    """Spatial memory storage"""
    __tablename__ = 'spatial_memory'
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, nullable=False, index=True)  # Person or Object ID
    entity_type = Column(String(50), nullable=False, index=True)  # person, object
    room = Column(String(100), nullable=False, index=True)
    x_position = Column(Float, nullable=True)
    y_position = Column(Float, nullable=True)
    z_position = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    confidence = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        CheckConstraint("entity_type IN ('person', 'object')", name='check_entity_type'),
        CheckConstraint("confidence >= 0 AND confidence <= 1", name='check_spatial_confidence'),
        Index('idx_spatial_entity', 'entity_id', 'entity_type', 'timestamp'),
        Index('idx_spatial_room', 'room', 'timestamp'),
    )
    
    def __repr__(self) -> str:
        return f"<SpatialMemory(id={self.id}, entity_type='{self.entity_type}', entity_id={self.entity_id}, room='{self.room}')>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'entity_id': self.entity_id,
            'entity_type': self.entity_type,
            'room': self.room,
            'position': {
                'x': self.x_position,
                'y': self.y_position,
                'z': self.z_position
            },
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'confidence': self.confidence,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ContextData(Base):
    """Context information"""
    __tablename__ = 'context_data'
    
    id = Column(Integer, primary_key=True, index=True)
    context_type = Column(String(100), nullable=False, index=True)  # time_of_day, room_state, household_state
    value = Column(JSONB, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        Index('idx_context_type_time', 'context_type', 'timestamp'),
    )
    
    def __repr__(self) -> str:
        return f"<ContextData(id={self.id}, type='{self.context_type}', timestamp={self.timestamp})>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'context_type': self.context_type,
            'value': self.value if self.value else {},
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Consent(Base):
    """GDPR consent tracking"""
    __tablename__ = 'consents'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    feature = Column(String(255), nullable=False, index=True)  # face_recognition, activity_monitoring, data_sharing
    granted = Column(Boolean, default=False, nullable=False)
    granted_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship('User', back_populates='consents')
    
    __table_args__ = (
        UniqueConstraint('user_id', 'feature', name='uq_user_feature'),
        Index('idx_consent_user_feature', 'user_id', 'feature'),
    )
    
    def __repr__(self) -> str:
        return f"<Consent(id={self.id}, user_id={self.user_id}, feature='{self.feature}', granted={self.granted})>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'feature': self.feature,
            'granted': self.granted,
            'granted_at': self.granted_at.isoformat() if self.granted_at else None,
            'revoked_at': self.revoked_at.isoformat() if self.revoked_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class AuditLog(Base):
    """Compliance audit log"""
    __tablename__ = 'audit_logs'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    action = Column(String(255), nullable=False, index=True)
    entity_type = Column(String(100), nullable=True, index=True)
    entity_id = Column(Integer, nullable=True)
    changes = Column(JSONB, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 support
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship('User', back_populates='audit_logs')
    
    __table_args__ = (
        Index('idx_audit_user_time', 'user_id', 'timestamp'),
        Index('idx_audit_action_time', 'action', 'timestamp'),
        Index('idx_audit_entity', 'entity_type', 'entity_id'),
    )
    
    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, user_id={self.user_id}, action='{self.action}', timestamp={self.timestamp})>"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'changes': self.changes if self.changes else {},
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

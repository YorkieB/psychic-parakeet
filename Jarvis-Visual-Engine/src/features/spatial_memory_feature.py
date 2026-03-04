"""Spatial memory feature - track people and objects across rooms"""
import numpy as np
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta
import logging

from src.features.base_feature import BaseFeature
from src.core.event_bus import EventBus, EventType, Event
from src.database.connection import DatabaseConnection
from src.database.models import PersonLocation, Object, SpatialMemory, Person
from src.database.queries import SpatialMemoryQueries

logger = logging.getLogger(__name__)


class SpatialMemoryFeature(BaseFeature):
    """Track spatial memory of people and objects"""
    
    def __init__(self, event_bus: EventBus, db: DatabaseConnection, enabled: bool = True):
        super().__init__("spatial_memory", event_bus, enabled)
        self.db = db
        self.last_locations = {}  # person_id -> last location
        self.room_adjacency = {}  # room_name -> [adjacent_rooms]
        self._setup_room_adjacency()
    
    def _setup_room_adjacency(self):
        """Setup room adjacency map for tracking movement"""
        # Default room adjacencies - can be configured
        self.room_adjacency = {
            "living_room": ["kitchen", "hallway", "dining_room"],
            "kitchen": ["living_room", "dining_room"],
            "bedroom": ["hallway", "bathroom"],
            "office": ["hallway"],
            "hallway": ["living_room", "bedroom", "office", "kitchen"]
        }
    
    def initialize(self):
        """Initialize spatial memory feature"""
        logger.info("Spatial Memory Feature initialized")
        # Subscribe to person recognition events
        self.event_bus.subscribe(EventType.PERSON_RECOGNIZED, self._handle_event)
        self.event_bus.subscribe(EventType.FACE_DETECTED, self._handle_event)
        self.event_bus.subscribe(EventType.OBJECT_DETECTED, self._handle_event)
    
    def _setup_event_handlers(self):
        """Setup event handlers"""
        pass  # Handled in initialize()
    
    async def on_event(self, event: Event):
        """Handle events for spatial memory"""
        if event.event_type == EventType.PERSON_RECOGNIZED:
            await self._handle_person_recognized(event)
        elif event.event_type == EventType.FACE_DETECTED:
            await self._handle_face_detected(event)
        elif event.event_type == EventType.OBJECT_DETECTED:
            await self._handle_object_detected(event)
    
    async def _handle_person_recognized(self, event: Event):
        """Handle person recognition event"""
        faces = event.data.get("faces", [])
        camera_id = event.camera_id
        
        # Get room name from camera
        room_name = self._get_room_from_camera(camera_id)
        
        with self.db.get_session() as session:
            for face in faces:
                person_name = face.get("name")
                if person_name and person_name != "Unknown":
                    # Find or create person
                    from src.database.queries import PersonQueries
                    person = PersonQueries.get_person_by_name(session, person_name)
                    
                    if person:
                        # Update location
                        location = PersonLocation(
                            person_id=person.id,
                            camera_id=self._get_camera_id_int(camera_id),
                            room_name=room_name,
                            confidence=face.get("confidence", 0.0),
                            timestamp=datetime.utcnow()
                        )
                        session.add(location)
                        
                        # Update last location
                        self.last_locations[person.id] = {
                            "room": room_name,
                            "timestamp": datetime.utcnow()
                        }
                        
                        # Check for room transitions
                        await self._check_room_transition(person.id, room_name, session)
    
    async def _handle_face_detected(self, event: Event):
        """Handle face detection event"""
        # Similar to person recognized but for unknown faces
        pass
    
    async def _handle_object_detected(self, event: Event):
        """Handle object detection event"""
        objects = event.data.get("objects", [])
        camera_id = event.camera_id
        room_name = self._get_room_from_camera(camera_id)
        
        with self.db.get_session() as session:
            for obj in objects:
                object_name = obj.get("name")
                if object_name:
                    # Find or update object location
                    existing = session.query(ObjectLocation).filter(
                        ObjectLocation.object_name == object_name,
                        ObjectLocation.room_name == room_name
                    ).first()
                    
                    if existing:
                        existing.last_seen = datetime.utcnow()
                        existing.times_seen += 1
                    else:
                        new_obj = ObjectLocation(
                            object_name=object_name,
                            room_name=room_name,
                            last_seen=datetime.utcnow(),
                            times_seen=1,
                            confidence=obj.get("confidence", 0.0)
                        )
                        session.add(new_obj)
    
    async def _check_room_transition(self, person_id: int, new_room: str, session):
        """Check if person transitioned between rooms"""
        last_location = self.last_locations.get(person_id)
        
        if last_location and last_location["room"] != new_room:
            # Check if transition is plausible (adjacent rooms or recent)
            time_diff = (datetime.utcnow() - last_location["timestamp"]).total_seconds()
            
            if time_diff < 10:  # Within 10 seconds
                old_room = last_location["room"]
                adjacent_rooms = self.room_adjacency.get(old_room, [])
                
                if new_room in adjacent_rooms or time_diff < 5:
                    # Emit room transition event
                    await self.event_bus.emit(Event(
                        event_type=EventType.PERSON_ENTERED,
                        timestamp=datetime.utcnow(),
                        camera_id=str(self._get_camera_id_int(new_room)),
                        data={
                            "person_id": person_id,
                            "from_room": old_room,
                            "to_room": new_room
                        }
                    ))
    
    def process(self, frame: np.ndarray, context: Dict[str, Any]) -> Optional[Dict]:
        """Process frame for spatial memory"""
        if not self.enabled:
            return None
        
        # Spatial memory is primarily event-driven
        # This method can be used for periodic room state updates
        room_name = context.get("room_name")
        if room_name:
            self._update_room_state(room_name, context)
        
        return None
    
    def _update_room_state(self, room_name: str, context: Dict):
        """Update room state"""
        with self.db.get_session() as session:
            # Get current occupants
            occupants = SpatialMemoryQueries.get_room_occupants(session, room_name)
            
            # Update or create room state
            state = session.query(RoomState).filter(
                RoomState.room_name == room_name
            ).first()
            
            if state:
                state.people_count = len(occupants)
                state.timestamp = datetime.utcnow()
                state.activity = context.get("activity", state.activity)
            else:
                state = RoomState(
                    room_name=room_name,
                    people_count=len(occupants),
                    activity=context.get("activity"),
                    timestamp=datetime.utcnow()
                )
                session.add(state)
    
    def query_location(self, person_name: str) -> Optional[Dict]:
        """Query current location of a person"""
        with self.db.get_session() as session:
            from src.database.queries import PersonQueries
            person = PersonQueries.get_person_by_name(session, person_name)
            
            if person:
                return SpatialMemoryQueries.get_person_current_location(session, person.id)
        return None
    
    def find_object(self, object_name: str, room_name: Optional[str] = None) -> List[Dict]:
        """Find object locations"""
        with self.db.get_session() as session:
            return SpatialMemoryQueries.find_object(session, object_name, room_name)
    
    def cleanup(self):
        """Cleanup feature"""
        logger.info("Spatial Memory Feature cleaned up")
    
    def _get_room_from_camera(self, camera_id: str) -> str:
        """Get room name from camera ID"""
        # This should query camera table - simplified for now
        return "living_room"  # Default
    
    def _get_camera_id_int(self, camera_id: str) -> int:
        """Convert camera_id string to int"""
        try:
            return int(camera_id.split("_")[-1]) if "_" in camera_id else 1
        except:
            return 1

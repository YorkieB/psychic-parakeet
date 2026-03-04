from typing import Callable, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime
import asyncio
from enum import Enum

class EventType(Enum):
    """Vision Engine events"""
    FRAME_CAPTURED = "frame_captured"
    MOTION_DETECTED = "motion_detected"
    FACE_DETECTED = "face_detected"
    PERSON_RECOGNIZED = "person_recognized"
    OBJECT_DETECTED = "object_detected"
    PERSON_ENTERED = "person_entered"
    PERSON_LEFT = "person_left"
    UNUSUAL_ACTIVITY = "unusual_activity"
    PRIVACY_MODE_TOGGLED = "privacy_mode_toggled"

@dataclass
class Event:
    """Event object"""
    event_type: EventType
    timestamp: datetime
    camera_id: str
    data: Dict[str, Any]

class EventBus:
    """Central event bus for pub/sub communication"""
    
    def __init__(self):
        self.subscribers: Dict[EventType, List[Callable]] = {}
        self.event_history: List[Event] = []
        self.max_history = 10000
    
    def subscribe(self, event_type: EventType, handler: Callable):
        """Subscribe to event"""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        
        self.subscribers[event_type].append(handler)
    
    def unsubscribe(self, event_type: EventType, handler: Callable):
        """Unsubscribe from event"""
        if event_type in self.subscribers:
            try:
                self.subscribers[event_type].remove(handler)
            except ValueError:
                pass  # Handler not in list
    
    async def emit(self, event: Event):
        """Emit event to all subscribers"""
        # Store in history
        self.event_history.append(event)
        if len(self.event_history) > self.max_history:
            self.event_history.pop(0)
        
        # Notify subscribers
        if event.event_type in self.subscribers:
            tasks = []
            for handler in self.subscribers[event.event_type]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        tasks.append(handler(event))
                    else:
                        handler(event)
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"Error in event handler: {e}")
            
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
    
    def get_history(self, event_type: EventType = None, limit: int = 100) -> List[Event]:
        """Get event history"""
        if event_type:
            history = [e for e in self.event_history if e.event_type == event_type]
        else:
            history = self.event_history
        
        return history[-limit:]

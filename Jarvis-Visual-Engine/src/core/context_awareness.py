"""Context awareness system for super intelligence"""
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from collections import deque
import logging

logger = logging.getLogger(__name__)


class ContextAwareness:
    """Maintain context awareness across time and space"""
    
    def __init__(self, context_window_minutes: int = 30):
        """
        Initialize context awareness
        
        Args:
            context_window_minutes: Time window for context retention
        """
        self.context_window = timedelta(minutes=context_window_minutes)
        self.temporal_context = deque(maxlen=1000)  # Recent events
        self.spatial_context = {}  # room_name -> context
        self.person_context = {}  # person_id -> context
        self.global_context = {
            "time_of_day": None,
            "day_of_week": None,
            "weather": None,  # Would integrate with weather API
            "household_state": "normal"  # normal, guest_mode, privacy_mode, etc.
        }
    
    def update_temporal_context(self, event_type: str, data: Dict, timestamp: datetime = None):
        """Update temporal context with new event"""
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        context_entry = {
            "type": event_type,
            "data": data,
            "timestamp": timestamp
        }
        
        self.temporal_context.append(context_entry)
        
        # Clean old entries
        cutoff = datetime.utcnow() - self.context_window
        while self.temporal_context and self.temporal_context[0]["timestamp"] < cutoff:
            self.temporal_context.popleft()
    
    def update_spatial_context(self, room_name: str, context: Dict):
        """Update spatial context for a room"""
        if room_name not in self.spatial_context:
            self.spatial_context[room_name] = {
                "last_updated": datetime.utcnow(),
                "people_present": [],
                "activity": None,
                "objects": [],
                "lighting": None,
                "temperature": None
            }
        
        self.spatial_context[room_name].update(context)
        self.spatial_context[room_name]["last_updated"] = datetime.utcnow()
    
    def update_person_context(self, person_id: str, context: Dict):
        """Update context for a person"""
        if person_id not in self.person_context:
            self.person_context[person_id] = {
                "last_seen": None,
                "current_location": None,
                "recent_locations": [],
                "current_activity": None,
                "mood_indicators": []  # Could infer from behavior
            }
        
        self.person_context[person_id].update(context)
        if "current_location" in context:
            self.person_context[person_id]["last_seen"] = datetime.utcnow()
    
    def get_recent_events(self, event_type: Optional[str] = None, 
                         minutes: int = 10) -> List[Dict]:
        """Get recent events from temporal context"""
        cutoff = datetime.utcnow() - timedelta(minutes=minutes)
        
        events = [
            event for event in self.temporal_context
            if event["timestamp"] >= cutoff
        ]
        
        if event_type:
            events = [e for e in events if e["type"] == event_type]
        
        return sorted(events, key=lambda x: x["timestamp"], reverse=True)
    
    def get_room_context(self, room_name: str) -> Optional[Dict]:
        """Get current context for a room"""
        context = self.spatial_context.get(room_name)
        
        if context:
            # Check if context is stale
            last_updated = context.get("last_updated")
            if last_updated and (datetime.utcnow() - last_updated) > timedelta(minutes=5):
                context["stale"] = True
        
        return context
    
    def get_person_context(self, person_id: str) -> Optional[Dict]:
        """Get current context for a person"""
        return self.person_context.get(person_id)
    
    def infer_intent(self, person_id: str, current_action: str, 
                    location: str) -> Dict:
        """Infer user intent based on context"""
        person_ctx = self.get_person_context(person_id)
        room_ctx = self.get_room_context(location)
        recent_events = self.get_recent_events(minutes=5)
        
        intent = {
            "confidence": 0.0,
            "possible_intents": [],
            "context_factors": []
        }
        
        # Analyze context to infer intent
        if person_ctx:
            # Check if person is looking for something
            if current_action == "searching" or "looking" in current_action.lower():
                intent["possible_intents"].append({
                    "intent": "find_object",
                    "confidence": 0.7,
                    "reason": "Person appears to be searching"
                })
            
            # Check if person is moving between rooms
            recent_locations = person_ctx.get("recent_locations", [])
            if len(recent_locations) > 1:
                intent["possible_intents"].append({
                    "intent": "navigation",
                    "confidence": 0.6,
                    "reason": "Person is moving between rooms"
                })
        
        # Check room context
        if room_ctx:
            activity = room_ctx.get("activity")
            if activity:
                intent["context_factors"].append(f"Room activity: {activity}")
        
        # Calculate overall confidence
        if intent["possible_intents"]:
            intent["confidence"] = max([i["confidence"] for i in intent["possible_intents"]])
        
        return intent
    
    def get_situational_awareness(self) -> Dict:
        """Get overall situational awareness"""
        return {
            "temporal": {
                "recent_events_count": len(self.temporal_context),
                "time_window_minutes": self.context_window.total_seconds() / 60
            },
            "spatial": {
                "rooms_tracked": len(self.spatial_context),
                "rooms": list(self.spatial_context.keys())
            },
            "people": {
                "people_tracked": len(self.person_context),
                "people": list(self.person_context.keys())
            },
            "global": self.global_context.copy()
        }
    
    def update_global_context(self, **kwargs):
        """Update global context"""
        self.global_context.update(kwargs)
        
        # Update time-based context
        now = datetime.utcnow()
        self.global_context["time_of_day"] = now.hour
        self.global_context["day_of_week"] = now.weekday()
        
        # Determine time period
        hour = now.hour
        if 5 <= hour < 12:
            time_period = "morning"
        elif 12 <= hour < 17:
            time_period = "afternoon"
        elif 17 <= hour < 21:
            time_period = "evening"
        else:
            time_period = "night"
        
        self.global_context["time_period"] = time_period

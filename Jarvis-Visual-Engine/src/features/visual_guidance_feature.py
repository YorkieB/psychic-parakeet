"""Visual guidance feature - provide visual navigation and assistance"""
import numpy as np
from typing import Dict, Optional, Any, List
import logging
import cv2

from src.features.base_feature import BaseFeature
from src.core.event_bus import EventBus, EventType, Event

logger = logging.getLogger(__name__)


class VisualGuidanceFeature(BaseFeature):
    """Provide visual guidance and navigation assistance"""
    
    def __init__(self, event_bus: EventBus, spatial_memory, enabled: bool = True):
        super().__init__("visual_guidance", event_bus, enabled)
        self.spatial_memory = spatial_memory
        self.landmarks = {}  # room_name -> landmarks
        self.paths = {}  # path_id -> waypoints
    
    def initialize(self):
        """Initialize visual guidance"""
        logger.info("Visual Guidance Feature initialized")
        self._setup_landmarks()
    
    def _setup_landmarks(self):
        """Setup room landmarks for navigation"""
        # Default landmarks - can be configured
        self.landmarks = {
            "living_room": ["couch", "tv", "coffee_table"],
            "kitchen": ["refrigerator", "stove", "sink"],
            "bedroom": ["bed", "dresser", "window"],
            "office": ["desk", "computer", "bookshelf"]
        }
    
    def process(self, frame: np.ndarray, context: Dict[str, Any]) -> Optional[Dict]:
        """Process frame for visual guidance"""
        if not self.enabled:
            return None
        
        room_name = context.get("room_name")
        if room_name:
            # Detect landmarks in current room
            detected_landmarks = self._detect_landmarks(frame, room_name)
            
            return {
                "room": room_name,
                "landmarks_detected": detected_landmarks,
                "guidance_available": len(detected_landmarks) > 0
            }
        
        return None
    
    def _detect_landmarks(self, frame: np.ndarray, room_name: str) -> List[Dict]:
        """Detect landmarks in frame"""
        # This would use object detection to find landmarks
        # For now, returns empty list - would be populated by Vision API
        return []
    
    def provide_directions(self, from_room: str, to_room: str, 
                          target_object: Optional[str] = None) -> Dict:
        """Provide directions from one room to another"""
        # Simple pathfinding between rooms
        path = self._find_path(from_room, to_room)
        
        directions = {
            "from": from_room,
            "to": to_room,
            "path": path,
            "steps": self._generate_steps(path, target_object)
        }
        
        return directions
    
    def _find_path(self, from_room: str, to_room: str) -> List[str]:
        """Find path between rooms"""
        # Simple pathfinding - in production would use graph algorithm
        if from_room == to_room:
            return [from_room]
        
        # Check if rooms are adjacent
        if self.spatial_memory and hasattr(self.spatial_memory, 'room_adjacency'):
            adjacency = self.spatial_memory.room_adjacency
            if to_room in adjacency.get(from_room, []):
                return [from_room, to_room]
            
            # Try to find path through adjacent rooms
            for adjacent in adjacency.get(from_room, []):
                if to_room in adjacency.get(adjacent, []):
                    return [from_room, adjacent, to_room]
        
        # Default: go through hallway if available
        if "hallway" not in [from_room, to_room]:
            return [from_room, "hallway", to_room]
        
        return [from_room, to_room]
    
    def _generate_steps(self, path: List[str], target_object: Optional[str]) -> List[Dict]:
        """Generate step-by-step directions"""
        steps = []
        
        for i, room in enumerate(path):
            step = {
                "step": i + 1,
                "action": "go_to" if i < len(path) - 1 else "arrive_at",
                "location": room
            }
            
            if i == len(path) - 1 and target_object:
                step["action"] = "find"
                step["target"] = target_object
                # Query spatial memory for object location
                if self.spatial_memory:
                    locations = self.spatial_memory.find_object(target_object, room)
                    if locations:
                        step["object_location"] = locations[0]
            
            steps.append(step)
        
        return steps
    
    def guide_to_object(self, object_name: str, current_room: str) -> Dict:
        """Guide user to an object"""
        # Find object location
        if self.spatial_memory:
            locations = self.spatial_memory.find_object(object_name)
            
            if locations:
                object_room = locations[0]["room_name"]
                directions = self.provide_directions(current_room, object_room, object_name)
                return {
                    "object_found": True,
                    "object_location": locations[0],
                    "directions": directions
                }
        
        return {
            "object_found": False,
            "message": f"Object '{object_name}' not found in spatial memory"
        }
    
    def cleanup(self):
        """Cleanup feature"""
        logger.info("Visual Guidance Feature cleaned up")

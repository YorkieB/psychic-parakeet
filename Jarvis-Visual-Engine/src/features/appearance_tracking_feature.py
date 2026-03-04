"""Appearance tracking feature - track people by appearance across cameras"""
import numpy as np
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta
import logging
import cv2

from src.features.base_feature import BaseFeature
from src.core.event_bus import EventBus, EventType, Event

logger = logging.getLogger(__name__)


class AppearanceTrackingFeature(BaseFeature):
    """Track people by appearance (clothing, height, etc.) for re-identification"""
    
    def __init__(self, event_bus: EventBus, enabled: bool = True):
        super().__init__("appearance_tracking", event_bus, enabled)
        self.appearance_profiles = {}  # person_id -> appearance features
        self.recent_detections = []  # Recent detections for matching
    
    def initialize(self):
        """Initialize appearance tracking"""
        logger.info("Appearance Tracking Feature initialized")
        self.event_bus.subscribe(EventType.FACE_DETECTED, self._handle_event)
        self.event_bus.subscribe(EventType.PERSON_RECOGNIZED, self._handle_event)
    
    async def on_event(self, event: Event):
        """Handle events for appearance tracking"""
        if event.event_type in [EventType.FACE_DETECTED, EventType.PERSON_RECOGNIZED]:
            await self._process_appearance(event)
    
    async def _process_appearance(self, event: Event):
        """Process appearance from event"""
        faces = event.data.get("faces", [])
        camera_id = event.camera_id
        
        # Get frame from context if available
        frame = event.data.get("frame")
        
        if frame is not None:
            for face in faces:
                appearance = self._extract_appearance_features(frame, face)
                if appearance:
                    person_name = face.get("name", "Unknown")
                    self._update_appearance_profile(person_name, appearance, camera_id)
    
    def _extract_appearance_features(self, frame: np.ndarray, face: Dict) -> Optional[Dict]:
        """Extract appearance features from frame"""
        try:
            location = face.get("location", {})
            top = location.get("top", 0)
            bottom = location.get("bottom", 0)
            left = location.get("left", 0)
            right = location.get("right", 0)
            
            # Extract person region (expand below face for body)
            face_height = bottom - top
            body_top = bottom
            body_bottom = min(bottom + face_height * 3, frame.shape[0])
            body_left = max(0, left - face_height // 2)
            body_right = min(frame.shape[1], right + face_height // 2)
            
            if body_bottom > body_top and body_right > body_left:
                body_region = frame[body_top:body_bottom, body_left:body_right]
                
                # Extract color histogram (dominant colors)
                hist = self._extract_color_histogram(body_region)
                
                # Estimate height (pixels)
                estimated_height = body_bottom - top
                
                # Extract texture features (simplified)
                texture = self._extract_texture_features(body_region)
                
                return {
                    "color_histogram": hist,
                    "estimated_height": estimated_height,
                    "texture_features": texture,
                    "body_region_size": (body_right - body_left, body_bottom - body_top)
                }
        except Exception as e:
            logger.warning(f"Failed to extract appearance features: {e}")
        
        return None
    
    def _extract_color_histogram(self, region: np.ndarray) -> Dict:
        """Extract dominant colors from region"""
        # Convert to HSV for better color analysis
        hsv = cv2.cvtColor(region, cv2.COLOR_BGR2HSV)
        
        # Calculate histogram for each channel
        hist_h = cv2.calcHist([hsv], [0], None, [180], [0, 180])
        hist_s = cv2.calcHist([hsv], [1], None, [256], [0, 256])
        hist_v = cv2.calcHist([hsv], [2], None, [256], [0, 256])
        
        # Get dominant colors
        dominant_h = int(np.argmax(hist_h))
        dominant_s = int(np.argmax(hist_s))
        dominant_v = int(np.argmax(hist_v))
        
        return {
            "hue": dominant_h,
            "saturation": dominant_s,
            "value": dominant_v,
            "histogram": {
                "h": hist_h.tolist(),
                "s": hist_s.tolist(),
                "v": hist_v.tolist()
            }
        }
    
    def _extract_texture_features(self, region: np.ndarray) -> Dict:
        """Extract texture features using LBP (Local Binary Pattern)"""
        # Convert to grayscale
        gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
        
        # Calculate texture variance
        texture_variance = float(np.var(gray))
        
        # Calculate edge density
        edges = cv2.Canny(gray, 50, 150)
        edge_density = float(np.sum(edges > 0) / edges.size)
        
        return {
            "variance": texture_variance,
            "edge_density": edge_density
        }
    
    def _update_appearance_profile(self, person_name: str, appearance: Dict, camera_id: str):
        """Update appearance profile for person"""
        if person_name not in self.appearance_profiles:
            self.appearance_profiles[person_name] = []
        
        self.appearance_profiles[person_name].append({
            "appearance": appearance,
            "camera_id": camera_id,
            "timestamp": datetime.utcnow()
        })
        
        # Keep only recent appearances (last 24 hours)
        cutoff = datetime.utcnow() - timedelta(hours=24)
        self.appearance_profiles[person_name] = [
            a for a in self.appearance_profiles[person_name]
            if a["timestamp"] > cutoff
        ]
    
    def match_appearance(self, appearance: Dict, threshold: float = 0.7) -> List[Dict]:
        """Match appearance to known profiles"""
        matches = []
        
        for person_name, profiles in self.appearance_profiles.items():
            for profile in profiles:
                similarity = self._compare_appearance(appearance, profile["appearance"])
                if similarity >= threshold:
                    matches.append({
                        "person": person_name,
                        "similarity": similarity,
                        "timestamp": profile["timestamp"],
                        "camera_id": profile["camera_id"]
                    })
        
        # Sort by similarity
        matches.sort(key=lambda x: x["similarity"], reverse=True)
        return matches
    
    def _compare_appearance(self, appearance1: Dict, appearance2: Dict) -> float:
        """Compare two appearances and return similarity (0-1)"""
        # Compare color histograms
        hist1 = appearance1.get("color_histogram", {})
        hist2 = appearance2.get("color_histogram", {})
        
        color_sim = 0.0
        if hist1 and hist2:
            # Compare dominant colors
            h_diff = abs(hist1.get("hue", 0) - hist2.get("hue", 0))
            h_sim = 1.0 - (h_diff / 180.0)  # Normalize to 0-1
            
            s_diff = abs(hist1.get("saturation", 0) - hist2.get("saturation", 0))
            s_sim = 1.0 - (s_diff / 256.0)
            
            v_diff = abs(hist1.get("value", 0) - hist2.get("value", 0))
            v_sim = 1.0 - (v_diff / 256.0)
            
            color_sim = (h_sim + s_sim + v_sim) / 3.0
        
        # Compare heights (normalized)
        height1 = appearance1.get("estimated_height", 0)
        height2 = appearance2.get("estimated_height", 0)
        height_sim = 1.0 - abs(height1 - height2) / max(height1, height2, 1)
        
        # Compare texture
        texture1 = appearance1.get("texture_features", {})
        texture2 = appearance2.get("texture_features", {})
        texture_sim = 0.0
        if texture1 and texture2:
            var_diff = abs(texture1.get("variance", 0) - texture2.get("variance", 0))
            var_sim = 1.0 - (var_diff / max(texture1.get("variance", 1), texture2.get("variance", 1), 1))
            
            edge_diff = abs(texture1.get("edge_density", 0) - texture2.get("edge_density", 0))
            edge_sim = 1.0 - edge_diff
            
            texture_sim = (var_sim + edge_sim) / 2.0
        
        # Weighted average
        similarity = (color_sim * 0.5 + height_sim * 0.3 + texture_sim * 0.2)
        return max(0.0, min(1.0, similarity))
    
    def process(self, frame: np.ndarray, context: Dict[str, Any]) -> Optional[Dict]:
        """Process frame for appearance tracking"""
        if not self.enabled:
            return None
        
        # Appearance tracking is primarily event-driven
        return None
    
    def cleanup(self):
        """Cleanup feature"""
        logger.info("Appearance Tracking Feature cleaned up")

"""Face recognition feature wrapper"""
from typing import Dict, Optional, Any
import numpy as np
import logging

from src.features.base_feature import BaseFeature
from src.core.event_bus import EventBus, EventType, Event

logger = logging.getLogger(__name__)


class FaceRecognitionFeature(BaseFeature):
    """Face recognition feature wrapper"""
    
    def __init__(self, event_bus: EventBus, face_engine, enabled: bool = True):
        super().__init__("face_recognition", event_bus, enabled)
        self.face_engine = face_engine
    
    def initialize(self):
        """Initialize face recognition feature"""
        logger.info("Face Recognition Feature initialized")
        self.event_bus.subscribe(EventType.FRAME_CAPTURED, self._handle_event)
    
    async def on_event(self, event: Event):
        """Handle frame captured event"""
        if not self.enabled:
            return
        
        frame = event.data.get("frame")
        if frame is not None:
            # Detect and recognize faces
            recognized = self.face_engine.recognize_faces(frame)
            
            if recognized:
                # Emit person recognized events
                for face in recognized:
                    if face["name"] != "Unknown":
                        await self.event_bus.emit(Event(
                            event_type=EventType.PERSON_RECOGNIZED,
                            timestamp=event.timestamp,
                            camera_id=event.camera_id,
                            data={"face": face}
                        ))
    
    def process(self, frame: np.ndarray, context: Dict[str, Any]) -> Optional[Dict]:
        """Process frame for face recognition"""
        if not self.enabled:
            return None
        
        recognized = self.face_engine.recognize_faces(frame)
        
        return {
            "faces_recognized": len(recognized),
            "faces": recognized
        }
    
    def cleanup(self):
        """Cleanup feature"""
        logger.info("Face Recognition Feature cleaned up")

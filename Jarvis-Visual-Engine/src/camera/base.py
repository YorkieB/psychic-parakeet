from abc import ABC, abstractmethod
from typing import Tuple, Optional
import cv2
import numpy as np
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class BaseCamera(ABC):
    """Abstract base class for camera implementations"""
    
    def __init__(self, camera_id: str, name: str, room_name: str):
        self.camera_id = camera_id
        self.name = name
        self.room_name = room_name
        self.is_connected = False
        self.last_frame = None
        self.last_frame_time = None
    
    @abstractmethod
    def connect(self):
        """Establish connection to camera"""
        pass
    
    @abstractmethod
    def disconnect(self):
        """Close connection"""
        pass
    
    @abstractmethod
    def capture_frame(self) -> Optional[np.ndarray]:
        """Capture single frame"""
        pass
    
    @abstractmethod
    def set_ptz(self, pan: float, tilt: float, zoom: float):
        """Set pan/tilt/zoom (if supported)"""
        pass
    
    def get_frame_info(self) -> dict:
        """Get current frame metadata"""
        return {
            "camera_id": self.camera_id,
            "timestamp": self.last_frame_time,
            "is_connected": self.is_connected,
            "frame_shape": self.last_frame.shape if self.last_frame is not None else None
        }


class ObsbotTiny2Camera(BaseCamera):
    """Obsbot Tiny 2 implementation"""
    
    def __init__(self, camera_id: str, name: str, room_name: str, ip_address: str, port: int = 8080):
        super().__init__(camera_id, name, room_name)
        self.ip_address = ip_address
        self.port = port
        self.stream_url = f"rtsp://{ip_address}:{port}/stream1"
        self.cap = None
        self.ptz_url = f"http://{ip_address}:{port}/api"
    
    def connect(self):
        """Connect to camera"""
        try:
            self.cap = cv2.VideoCapture(self.stream_url)
            if self.cap.isOpened():
                self.is_connected = True
                logger.info(f"Connected to camera: {self.name}")
                return True
        except Exception as e:
            logger.error(f"Failed to connect to {self.name}: {e}")
            self.is_connected = False
            return False
    
    def disconnect(self):
        """Close connection"""
        if self.cap:
            self.cap.release()
            self.is_connected = False
            logger.info(f"Disconnected from camera: {self.name}")
    
    def capture_frame(self) -> Optional[np.ndarray]:
        """Capture frame from stream"""
        if not self.is_connected or self.cap is None:
            return None
        
        try:
            ret, frame = self.cap.read()
            if ret:
                self.last_frame = frame
                self.last_frame_time = datetime.utcnow()
                return frame
        except Exception as e:
            logger.error(f"Error capturing frame: {e}")
        
        return None
    
    def set_ptz(self, pan: float, tilt: float, zoom: float):
        """Control pan/tilt/zoom"""
        import requests
        try:
            payload = {
                "cmd": "ptz",
                "pan": pan,  # -220 to 220
                "tilt": tilt,  # -110 to 110
                "zoom": zoom  # 1 to 5
            }
            response = requests.post(f"{self.ptz_url}/ptz", json=payload, timeout=2)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"PTZ control failed: {e}")
            return False
    
    def reset_ptz(self):
        """Return to home position"""
        self.set_ptz(0, 0, 1)

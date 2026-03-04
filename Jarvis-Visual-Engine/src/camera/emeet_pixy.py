"""EMEET Pixy 4K camera implementation"""
import cv2
import numpy as np
from typing import Optional
from datetime import datetime
import logging
import requests

from src.camera.base import BaseCamera

logger = logging.getLogger(__name__)


def list_usb_cameras(max_index: int = 10) -> list:
    """
    List available USB cameras by testing device indices
    
    Args:
        max_index: Maximum device index to test (default: 10)
    
    Returns:
        List of available camera indices
    """
    available_cameras = []
    # Suppress OpenCV warnings for invalid device indices
    import warnings
    import os
    os.environ['OPENCV_LOG_LEVEL'] = 'ERROR'
    
    for i in range(max_index):
        try:
            cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)  # Use DirectShow on Windows
            if cap.isOpened():
                # Set a short timeout
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                ret, frame = cap.read()
                if ret and frame is not None and frame.size > 0:
                    available_cameras.append(i)
                    logger.info(f"Found USB camera at index {i}")
                cap.release()
        except Exception as e:
            # Silently skip invalid indices
            pass
    return available_cameras


class EmeetPixyCamera(BaseCamera):
    """EMEET Pixy 4K camera implementation - supports both USB and network"""
    
    def __init__(self, camera_id: str, name: str, room_name: str, 
                 ip_address: Optional[str] = None, 
                 usb_index: Optional[int] = None,
                 username: str = "admin", 
                 password: str = "admin",
                 connection_type: str = "auto"):
        """
        Initialize EMEET Pixy 4K camera
        
        Args:
            camera_id: Unique camera identifier
            name: Camera name
            room_name: Room where camera is located
            ip_address: Camera IP address (for network connection)
            usb_index: USB device index (0, 1, 2, etc.) - if None, will auto-detect
            username: Camera username (default: admin) - for network only
            password: Camera password (default: admin) - for network only
            connection_type: "usb", "network", or "auto" (default: auto)
        """
        super().__init__(camera_id, name, room_name)
        self.ip_address = ip_address
        self.usb_index = usb_index
        self.username = username
        self.password = password
        self.connection_type = connection_type.lower()
        
        # EMEET Pixy 4K common RTSP URLs (for network connection)
        self.rtsp_urls = []
        if ip_address:
            self.rtsp_urls = [
                f"rtsp://{username}:{password}@{ip_address}:554/stream1",  # Main stream
                f"rtsp://{username}:{password}@{ip_address}:554/stream2",  # Sub stream
                f"rtsp://{username}:{password}@{ip_address}:554/h264",     # H264 stream
                f"rtsp://{username}:{password}@{ip_address}:554/live",    # Live stream
                f"rtsp://{ip_address}:554/stream1",  # Without auth (if disabled)
            ]
        
        self.cap = None
        self.current_rtsp_url = None
        self.connection_mode = None  # Will be "usb" or "network"
    
    def connect(self):
        """Connect to EMEET Pixy 4K camera (USB or network)"""
        logger.info(f"Attempting to connect to EMEET Pixy 4K: {self.name}")
        
        # Determine connection mode
        if self.connection_type == "usb" or (self.connection_type == "auto" and self.usb_index is not None):
            return self._connect_usb()
        elif self.connection_type == "network" or (self.connection_type == "auto" and self.ip_address):
            return self._connect_network()
        elif self.connection_type == "auto":
            # Try USB first, then network
            if self._connect_usb():
                return True
            if self.ip_address and self._connect_network():
                return True
        else:
            logger.error(f"Invalid connection_type: {self.connection_type}")
        
        logger.error(f"✗ Failed to connect to EMEET Pixy 4K: {self.name}")
        self.is_connected = False
        return False
    
    def _connect_usb(self) -> bool:
        """Connect via USB"""
        logger.info("Attempting USB connection...")
        
        # Determine USB index
        usb_index = self.usb_index
        if usb_index is None:
            # Auto-detect: try common indices
            logger.info("Auto-detecting USB camera...")
            available = list_usb_cameras(max_index=5)
            if not available:
                logger.warning("No USB cameras found")
                return False
            usb_index = available[0]
            logger.info(f"Using USB camera at index {usb_index}")
        
        try:
            # Use DirectShow backend on Windows for better compatibility
            import os
            os.environ['OPENCV_LOG_LEVEL'] = 'ERROR'
            self.cap = cv2.VideoCapture(usb_index, cv2.CAP_DSHOW)
            
            if not self.cap.isOpened():
                logger.error(f"Failed to open USB camera at index {usb_index}")
                return False
            
            # Set camera properties for better quality
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 3840)  # Try 4K
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 2160)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce latency
            
            # Try to read a frame to verify connection (with retries)
            for attempt in range(3):
                ret, frame = self.cap.read()
                if ret and frame is not None and frame.size > 0:
                    self.is_connected = True
                    self.connection_mode = "usb"
                    self.last_frame = frame
                    self.last_frame_time = datetime.utcnow()
                    
                    # Log actual resolution
                    height, width = frame.shape[:2]
                    logger.info(f"[OK] Connected to EMEET Pixy 4K via USB (index {usb_index})")
                    logger.info(f"  Resolution: {width}x{height}")
                    return True
                elif attempt < 2:
                    # Wait a bit and retry
                    import time
                    time.sleep(0.1)
            
            # If we get here, frame read failed
            self.cap.release()
            self.cap = None
            logger.error("USB camera opened but failed to read frame after 3 attempts")
            return False
        except Exception as e:
            logger.error(f"USB connection failed: {e}")
            if self.cap:
                try:
                    self.cap.release()
                except:
                    pass
                self.cap = None
            return False
    
    def _connect_network(self) -> bool:
        """Connect via network (RTSP/ONVIF)"""
        if not self.ip_address:
            logger.warning("No IP address provided for network connection")
            return False
        
        logger.info(f"Attempting network connection to {self.ip_address}...")
        
        # First, try to verify camera is reachable
        try:
            response = requests.get(f"http://{self.ip_address}", timeout=5)
            logger.info(f"Camera HTTP response: {response.status_code}")
        except Exception as e:
            logger.warning(f"Camera HTTP check failed: {e}")
            # Continue anyway, RTSP might still work
        
        # Try each RTSP URL until one works
        for rtsp_url in self.rtsp_urls:
            try:
                logger.info(f"Trying RTSP URL: {rtsp_url.split('@')[-1]}")  # Don't log password
                self.cap = cv2.VideoCapture(rtsp_url)
                
                # Set timeout for connection
                self.cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)
                
                # Try to read a frame to verify connection
                ret, frame = self.cap.read()
                
                if ret and frame is not None:
                    self.is_connected = True
                    self.connection_mode = "network"
                    self.current_rtsp_url = rtsp_url
                    self.last_frame = frame
                    self.last_frame_time = datetime.utcnow()
                    logger.info(f"✓ Connected to EMEET Pixy 4K via network: {rtsp_url.split('@')[-1]}")
                    return True
                else:
                    self.cap.release()
                    self.cap = None
            except Exception as e:
                logger.debug(f"RTSP URL failed: {e}")
                if self.cap:
                    self.cap.release()
                    self.cap = None
                continue
        
        # If all RTSP URLs failed, try ONVIF as fallback
        logger.info("RTSP URLs failed, trying ONVIF...")
        try:
            from src.camera.onvif_camera import ONVIFCameraDevice
            onvif_camera = ONVIFCameraDevice(
                camera_id=self.camera_id,
                name=self.name,
                room_name=self.room_name,
                ip_address=self.ip_address,
                port=80,
                username=self.username,
                password=self.password
            )
            if onvif_camera.connect():
                # Replace our cap with ONVIF's
                self.cap = onvif_camera.cap
                self.is_connected = True
                self.connection_mode = "network"
                logger.info("✓ Connected via ONVIF")
                return True
        except Exception as e:
            logger.warning(f"ONVIF fallback failed: {e}")
        
        return False
    
    def disconnect(self):
        """Close connection"""
        if self.cap:
            self.cap.release()
            self.cap = None
        self.is_connected = False
        logger.info(f"Disconnected from EMEET Pixy 4K: {self.name}")
    
    def capture_frame(self) -> Optional[np.ndarray]:
        """Capture frame from stream"""
        if not self.is_connected or self.cap is None:
            return None
        
        try:
            ret, frame = self.cap.read()
            if ret and frame is not None:
                self.last_frame = frame
                self.last_frame_time = datetime.utcnow()
                return frame
            else:
                # Connection might have dropped, try to reconnect
                logger.warning("Frame capture failed, connection may have dropped")
                self.is_connected = False
        except Exception as e:
            logger.error(f"Error capturing frame from {self.name}: {e}")
            self.is_connected = False
        
        return None
    
    def set_ptz(self, pan: float, tilt: float, zoom: float):
        """Set pan/tilt/zoom (if supported)"""
        # EMEET Pixy 4K may support PTZ via HTTP API
        # This is a placeholder - would need camera-specific API documentation
        logger.info(f"PTZ control requested: pan={pan}, tilt={tilt}, zoom={zoom}")
        logger.warning("PTZ control not yet implemented for EMEET Pixy 4K")
        return False
    
    def get_camera_info(self) -> dict:
        """Get camera information"""
        info = {
            "camera_id": self.camera_id,
            "name": self.name,
            "type": "EMEET Pixy 4K",
            "connection_mode": self.connection_mode,
            "is_connected": self.is_connected,
            "last_frame_time": self.last_frame_time.isoformat() if self.last_frame_time else None
        }
        
        if self.connection_mode == "usb":
            info["usb_index"] = self.usb_index
            if self.last_frame is not None:
                height, width = self.last_frame.shape[:2]
                info["resolution"] = f"{width}x{height}"
        elif self.connection_mode == "network":
            info["ip_address"] = self.ip_address
            info["rtsp_url"] = self.current_rtsp_url.split('@')[-1] if self.current_rtsp_url else None
        
        return info

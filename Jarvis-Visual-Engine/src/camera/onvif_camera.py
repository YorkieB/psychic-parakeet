"""ONVIF camera support for generic IP cameras"""
import cv2
import numpy as np
from typing import Optional, Tuple
from datetime import datetime
import logging
from onvif import ONVIFCamera
import requests

from src.camera.base import BaseCamera

logger = logging.getLogger(__name__)


class ONVIFCameraDevice(BaseCamera):
    """Generic ONVIF camera implementation"""
    
    def __init__(self, camera_id: str, name: str, room_name: str, 
                 ip_address: str, port: int = 80, username: str = "", 
                 password: str = "", rtsp_url: Optional[str] = None):
        """
        Initialize ONVIF camera
        
        Args:
            camera_id: Unique camera identifier
            name: Camera name
            room_name: Room where camera is located
            ip_address: Camera IP address
            port: ONVIF port (usually 80 or 8080)
            username: Camera username
            password: Camera password
            rtsp_url: Optional direct RTSP URL (if known)
        """
        super().__init__(camera_id, name, room_name)
        self.ip_address = ip_address
        self.port = port
        self.username = username
        self.password = password
        self.rtsp_url = rtsp_url
        self.cap = None
        self.onvif_camera = None
        self.ptz_service = None
    
    def connect(self):
        """Connect to ONVIF camera"""
        try:
            # Initialize ONVIF camera
            self.onvif_camera = ONVIFCamera(
                self.ip_address,
                self.port,
                self.username,
                self.password
            )
            
            # Get media service for stream URL
            media_service = self.onvif_camera.create_media_service()
            profiles = media_service.GetProfiles()
            
            if not profiles:
                logger.error(f"No profiles found for camera {self.name}")
                return False
            
            # Get stream URI
            stream_setup = media_service.create_type('GetStreamUri')
            stream_setup.ProfileToken = profiles[0].token
            stream_setup.StreamSetup = {'Stream': 'RTP-Unicast', 'Transport': {'Protocol': 'RTSP'}}
            
            stream_uri = media_service.GetStreamUri(stream_setup)
            self.rtsp_url = stream_uri.Uri
            
            # Try to get PTZ service
            try:
                self.ptz_service = self.onvif_camera.create_ptz_service()
                logger.info(f"PTZ service available for {self.name}")
            except Exception as e:
                logger.warning(f"PTZ not available for {self.name}: {e}")
                self.ptz_service = None
            
            # Connect to RTSP stream
            if self.rtsp_url:
                # Add credentials to RTSP URL if needed
                if self.username and self.password:
                    # Parse and add credentials
                    if '@' not in self.rtsp_url:
                        url_parts = self.rtsp_url.split('://')
                        self.rtsp_url = f"{url_parts[0]}://{self.username}:{self.password}@{url_parts[1]}"
                
                self.cap = cv2.VideoCapture(self.rtsp_url)
                if self.cap.isOpened():
                    self.is_connected = True
                    logger.info(f"Connected to ONVIF camera: {self.name}")
                    return True
                else:
                    logger.error(f"Failed to open RTSP stream for {self.name}")
                    return False
            else:
                logger.error(f"No stream URI available for {self.name}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to connect to ONVIF camera {self.name}: {e}")
            self.is_connected = False
            return False
    
    def disconnect(self):
        """Close connection"""
        if self.cap:
            self.cap.release()
        self.is_connected = False
        logger.info(f"Disconnected from ONVIF camera: {self.name}")
    
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
            logger.error(f"Error capturing frame from {self.name}: {e}")
        
        return None
    
    def set_ptz(self, pan: float, tilt: float, zoom: float):
        """Set pan/tilt/zoom (if supported)"""
        if not self.ptz_service:
            logger.warning(f"PTZ not available for {self.name}")
            return False
        
        try:
            # Get PTZ configuration
            request = self.ptz_service.create_type('ContinuousMove')
            request.ProfileToken = self.onvif_camera.create_media_service().GetProfiles()[0].token
            
            # Set velocities (normalized -1.0 to 1.0)
            request.Velocity = {
                'PanTilt': {'x': pan / 100.0, 'y': tilt / 100.0},
                'Zoom': {'x': zoom / 100.0}
            }
            
            # Execute move
            self.ptz_service.ContinuousMove(request)
            
            # Stop after short duration (you might want to implement separate stop method)
            import time
            time.sleep(0.5)
            self.ptz_stop()
            
            return True
        except Exception as e:
            logger.error(f"PTZ control failed for {self.name}: {e}")
            return False
    
    def ptz_stop(self):
        """Stop PTZ movement"""
        if not self.ptz_service:
            return
        
        try:
            request = self.ptz_service.create_type('Stop')
            request.ProfileToken = self.onvif_camera.create_media_service().GetProfiles()[0].token
            self.ptz_service.Stop(request)
        except Exception as e:
            logger.error(f"PTZ stop failed: {e}")
    
    def get_capabilities(self) -> dict:
        """Get camera capabilities"""
        if not self.onvif_camera:
            return {}
        
        try:
            capabilities = self.onvif_camera.devicemgmt.GetCapabilities()
            return {
                "ptz": capabilities.PTZ is not None,
                "imaging": capabilities.Imaging is not None,
                "media": capabilities.Media is not None
            }
        except Exception as e:
            logger.error(f"Failed to get capabilities: {e}")
            return {}

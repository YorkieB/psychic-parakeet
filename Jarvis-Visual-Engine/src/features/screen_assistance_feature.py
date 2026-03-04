"""Screen assistance feature - help with screen content analysis"""
import numpy as np
from typing import Dict, Optional, Any
import logging
import cv2

from src.features.base_feature import BaseFeature
from src.core.event_bus import EventBus

logger = logging.getLogger(__name__)


class ScreenAssistanceFeature(BaseFeature):
    """Assist with screen content analysis and interaction"""
    
    def __init__(self, event_bus: EventBus, vision_api, enabled: bool = True):
        super().__init__("screen_assistance", event_bus, enabled)
        self.vision_api = vision_api
        self.screen_regions = []  # Detected screen regions
    
    def initialize(self):
        """Initialize screen assistance"""
        logger.info("Screen Assistance Feature initialized")
    
    def process(self, frame: np.ndarray, context: Dict[str, Any]) -> Optional[Dict]:
        """Process frame for screen assistance"""
        if not self.enabled:
            return None
        
        # Detect screens in frame
        screens = self._detect_screens(frame)
        
        if screens:
            # Analyze screen content
            results = []
            for screen in screens:
                screen_content = self._analyze_screen_content(frame, screen)
                if screen_content:
                    results.append(screen_content)
            
            return {
                "screens_detected": len(screens),
                "screen_content": results
            }
        
        return None
    
    def _detect_screens(self, frame: np.ndarray) -> list:
        """Detect screen regions in frame"""
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect rectangular regions (screens are usually rectangular)
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        screens = []
        for contour in contours:
            # Approximate contour to polygon
            epsilon = 0.02 * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)
            
            # Check if it's roughly rectangular (4 corners)
            if len(approx) == 4:
                x, y, w, h = cv2.boundingRect(contour)
                area = cv2.contourArea(contour)
                
                # Filter by size (screens should be reasonably large)
                if area > 10000:  # Minimum area threshold
                    aspect_ratio = w / h if h > 0 else 0
                    
                    # Typical screen aspect ratios
                    if 1.3 <= aspect_ratio <= 2.5:
                        screens.append({
                            "bbox": (x, y, w, h),
                            "area": area,
                            "aspect_ratio": aspect_ratio
                        })
        
        return screens
    
    async def _analyze_screen_content(self, frame: np.ndarray, screen: Dict) -> Optional[Dict]:
        """Analyze content of detected screen"""
        x, y, w, h = screen["bbox"]
        screen_region = frame[y:y+h, x:x+w]
        
        if screen_region.size == 0:
            return None
        
        try:
            # Use vision API to analyze screen content
            analysis = await self.vision_api.analyze_image(
                screen_region,
                detail="high"
            )
            
            if analysis.get("success"):
                return {
                    "screen_bbox": screen["bbox"],
                    "content": analysis.get("analysis", ""),
                    "timestamp": analysis.get("timestamp")
                }
        except Exception as e:
            logger.error(f"Failed to analyze screen content: {e}")
        
        return None
    
    def extract_text_from_screen(self, frame: np.ndarray, screen_bbox: tuple) -> str:
        """Extract text from screen region using OCR"""
        x, y, w, h = screen_bbox
        screen_region = frame[y:y+h, x:x+w]
        
        # Convert to grayscale
        gray = cv2.cvtColor(screen_region, cv2.COLOR_BGR2GRAY)
        
        # Enhance contrast
        enhanced = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
        
        # Note: Full OCR would require pytesseract or similar
        # This is a placeholder
        return ""  # Would return OCR text
    
    def cleanup(self):
        """Cleanup feature"""
        logger.info("Screen Assistance Feature cleaned up")

"""Advanced motion detection module"""
import cv2
import numpy as np
from typing import Tuple, Optional, List, Dict
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class MotionDetector:
    """Advanced motion detection with multiple algorithms"""
    
    def __init__(self, threshold: float = 5.0, history: int = 500, var_threshold: float = 16):
        """
        Initialize motion detector
        
        Args:
            threshold: Percentage of changed pixels to consider motion (default 5.0%)
            history: Number of frames for background subtraction history
            var_threshold: Variance threshold for background subtraction
        """
        self.threshold = threshold
        self.background_subtractor = cv2.createBackgroundSubtractorMOG2(
            history=history,
            varThreshold=var_threshold,
            detectShadows=True
        )
        self.previous_frame = None
        self.frame_count = 0
    
    def detect_motion(self, frame: np.ndarray, method: str = "frame_diff") -> Dict:
        """
        Detect motion in frame using specified method
        
        Args:
            frame: Input frame
            method: Detection method ('frame_diff', 'background_sub', 'hybrid')
        
        Returns:
            Dict with motion detection results
        """
        self.frame_count += 1
        
        if method == "frame_diff":
            return self._frame_difference(frame)
        elif method == "background_sub":
            return self._background_subtraction(frame)
        elif method == "hybrid":
            return self._hybrid_detection(frame)
        else:
            raise ValueError(f"Unknown method: {method}")
    
    def _frame_difference(self, frame: np.ndarray) -> Dict:
        """Frame difference method"""
        if self.previous_frame is None:
            self.previous_frame = frame.copy()
            return {
                "motion_detected": False,
                "motion_percent": 0.0,
                "method": "frame_diff"
            }
        
        # Convert to grayscale
        gray1 = cv2.cvtColor(self.previous_frame, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Compute frame difference
        diff = cv2.absdiff(gray1, gray2)
        
        # Apply threshold
        _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
        
        # Calculate percentage of changed pixels
        changed_pixels = np.sum(thresh > 0)
        total_pixels = thresh.size
        motion_percent = (changed_pixels / total_pixels) * 100
        
        # Update previous frame
        self.previous_frame = frame.copy()
        
        return {
            "motion_detected": motion_percent > self.threshold,
            "motion_percent": motion_percent,
            "method": "frame_diff",
            "changed_pixels": int(changed_pixels),
            "total_pixels": int(total_pixels)
        }
    
    def _background_subtraction(self, frame: np.ndarray) -> Dict:
        """Background subtraction method"""
        # Apply background subtractor
        fg_mask = self.background_subtractor.apply(frame)
        
        # Calculate motion percentage
        motion_pixels = np.sum(fg_mask > 0)
        total_pixels = fg_mask.size
        motion_percent = (motion_pixels / total_pixels) * 100
        
        # Find contours of moving objects
        contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter small contours
        min_area = 100
        significant_contours = [c for c in contours if cv2.contourArea(c) > min_area]
        
        return {
            "motion_detected": motion_percent > self.threshold,
            "motion_percent": motion_percent,
            "method": "background_sub",
            "moving_objects": len(significant_contours),
            "contours": significant_contours
        }
    
    def _hybrid_detection(self, frame: np.ndarray) -> Dict:
        """Hybrid method combining frame difference and background subtraction"""
        frame_diff_result = self._frame_difference(frame)
        bg_sub_result = self._background_subtraction(frame)
        
        # Combine results (motion if either method detects it)
        motion_detected = frame_diff_result["motion_detected"] or bg_sub_result["motion_detected"]
        avg_motion_percent = (frame_diff_result["motion_percent"] + bg_sub_result["motion_percent"]) / 2
        
        return {
            "motion_detected": motion_detected,
            "motion_percent": avg_motion_percent,
            "method": "hybrid",
            "frame_diff": frame_diff_result["motion_percent"],
            "background_sub": bg_sub_result["motion_percent"],
            "moving_objects": bg_sub_result.get("moving_objects", 0)
        }
    
    def get_motion_regions(self, frame: np.ndarray, min_area: int = 500) -> List[Dict]:
        """Get bounding boxes of motion regions"""
        result = self._background_subtraction(frame)
        
        if not result.get("motion_detected"):
            return []
        
        contours = result.get("contours", [])
        regions = []
        
        for contour in contours:
            if cv2.contourArea(contour) > min_area:
                x, y, w, h = cv2.boundingRect(contour)
                regions.append({
                    "bbox": (x, y, w, h),
                    "area": cv2.contourArea(contour),
                    "center": (x + w // 2, y + h // 2)
                })
        
        return regions
    
    def reset_background(self):
        """Reset background model"""
        self.background_subtractor = cv2.createBackgroundSubtractorMOG2(
            history=500,
            varThreshold=16,
            detectShadows=True
        )
        self.previous_frame = None
        logger.info("Background model reset")

import cv2
import numpy as np
from typing import Tuple, Optional
from datetime import datetime

class FrameProcessor:
    """Process camera frames for analysis"""
    
    def __init__(self, target_resolution: Tuple[int, int] = (1080, 1920)):
        self.target_resolution = target_resolution
        self.frame_count = 0
        self.previous_frame = None
    
    def resize_frame(self, frame: np.ndarray, resolution: str) -> np.ndarray:
        """Resize frame to target resolution"""
        resolution_map = {
            "1080p": (1080, 1920),
            "720p": (720, 1280),
            "480p": (480, 854),
            "360p": (360, 640)
        }
        
        target = resolution_map.get(resolution, self.target_resolution)
        if frame.shape[:2] != target:
            frame = cv2.resize(frame, (target[1], target[0]))
        
        return frame
    
    def detect_motion(self, frame1: np.ndarray, frame2: np.ndarray, threshold: float = 5.0) -> bool:
        """Detect motion between frames using background subtraction"""
        gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
        
        # Compute frame difference
        diff = cv2.absdiff(gray1, gray2)
        
        # Apply threshold
        _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
        
        # Calculate percentage of changed pixels
        changed_pixels = np.sum(thresh > 0)
        total_pixels = thresh.size
        change_percent = (changed_pixels / total_pixels) * 100
        
        return change_percent > threshold
    
    def extract_rois(self, frame: np.ndarray) -> list:
        """Extract regions of interest (faces, objects)"""
        rois = []
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Face cascade classifier
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        
        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        for (x, y, w, h) in faces:
            roi = frame[y:y+h, x:x+w]
            rois.append({
                'type': 'face',
                'bbox': (x, y, w, h),
                'roi': roi
            })
        
        return rois
    
    def normalize_frame(self, frame: np.ndarray) -> np.ndarray:
        """Normalize frame for AI processing"""
        # Convert BGR to RGB
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Normalize pixel values to 0-1
        frame = frame.astype(np.float32) / 255.0
        
        return frame
    
    def add_metadata(self, frame: np.ndarray, metadata: dict) -> np.ndarray:
        """Add text metadata to frame for visualization"""
        font = cv2.FONT_HERSHEY_SIMPLEX
        
        y_offset = 30
        for key, value in metadata.items():
            text = f"{key}: {value}"
            cv2.putText(frame, text, (10, y_offset), font, 0.7, (0, 255, 0), 2)
            y_offset += 30
        
        return frame
    
    def compute_frame_similarity(self, frame1: np.ndarray, frame2: np.ndarray) -> float:
        """Compute similarity between two frames (0-1, higher = more similar)"""
        # Resize to same size if needed
        if frame1.shape != frame2.shape:
            frame2 = cv2.resize(frame2, (frame1.shape[1], frame1.shape[0]))
        
        # Convert to grayscale
        gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
        
        # Compute similarity using histogram correlation
        # This is simpler and doesn't require scikit-image
        hist1 = cv2.calcHist([gray1], [0], None, [256], [0, 256])
        hist2 = cv2.calcHist([gray2], [0], None, [256], [0, 256])
        
        # Use correlation coefficient
        correlation = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
        
        return max(0.0, correlation)  # Ensure non-negative

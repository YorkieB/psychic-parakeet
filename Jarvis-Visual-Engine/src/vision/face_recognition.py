import face_recognition as fr
import numpy as np
from typing import List, Tuple, Optional, Dict
import cv2
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class FaceRecognitionEngine:
    """Local face recognition engine (99.38% accuracy)"""
    
    def __init__(self, known_faces_dir: str = "data/known_faces"):
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_faces_dir = Path(known_faces_dir)
        self.model = "hog"  # "hog" for speed, "cnn" for accuracy
        self.load_known_faces()
    
    def load_known_faces(self):
        """Load and encode known faces from directory"""
        self.known_face_encodings = []
        self.known_face_names = []
        
        if not self.known_faces_dir.exists():
            self.known_faces_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created known faces directory: {self.known_faces_dir}")
            return
        
        for person_name in self.known_faces_dir.iterdir():
            if not person_name.is_dir():
                continue
            
            for image_path in person_name.glob("*.jpg"):
                try:
                    # Load image
                    image = fr.load_image_file(str(image_path))
                    
                    # Get face encodings
                    face_encodings = fr.face_encodings(image, model=self.model)
                    
                    if face_encodings:
                        # Use first face in image
                        self.known_face_encodings.append(face_encodings[0])
                        self.known_face_names.append(person_name.name)
                except Exception as e:
                    logger.warning(f"Failed to load face from {image_path}: {e}")
        
        logger.info(f"Loaded {len(self.known_face_encodings)} known face encodings")
    
    def detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect faces in image"""
        face_locations = fr.face_locations(image, model=self.model)
        return face_locations
    
    def get_face_encodings(self, image: np.ndarray, 
                          face_locations: List[Tuple[int, int, int, int]] = None) -> List[np.ndarray]:
        """Get 128-dimensional face encodings"""
        if face_locations is None:
            face_locations = self.detect_faces(image)
        
        face_encodings = fr.face_encodings(image, face_locations, model="small")
        return face_encodings
    
    def recognize_faces(self, image: np.ndarray, 
                       tolerance: float = 0.6) -> List[Dict]:
        """Recognize faces in image"""
        face_locations = self.detect_faces(image)
        face_encodings = self.get_face_encodings(image, face_locations)
        
        results = []
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            # Compare with known faces
            matches = fr.compare_faces(
                self.known_face_encodings, 
                face_encoding, 
                tolerance=tolerance
            )
            name = "Unknown"
            confidence = 0.0
            
            # Get face distances
            if len(self.known_face_encodings) > 0:
                distances = fr.face_distance(self.known_face_encodings, face_encoding)
                best_match_index = np.argmin(distances)
                if matches[best_match_index]:
                    name = self.known_face_names[best_match_index]
                    confidence = 1 - distances[best_match_index]
            
            results.append({
                'name': name,
                'confidence': confidence,
                'location': {
                    'top': top,
                    'right': right,
                    'bottom': bottom,
                    'left': left
                },
                'encoding': face_encoding
            })
        
        return results
    
    def add_known_face(self, image_path: str, person_name: str):
        """Add new known face to database"""
        # Create person directory
        person_dir = self.known_faces_dir / person_name
        person_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            # Load and save image
            image = fr.load_image_file(image_path)
            face_encodings = fr.face_encodings(image)
            
            if face_encodings:
                # Save image copy
                existing_images = list(person_dir.glob("*.jpg"))
                new_image_path = person_dir / f"{person_name}_{len(existing_images)}.jpg"
                cv2.imwrite(str(new_image_path), cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
                
                # Reload known faces
                self.load_known_faces()
                logger.info(f"Added known face for {person_name}")
                return True
            else:
                logger.warning(f"No face detected in image: {image_path}")
                return False
        except Exception as e:
            logger.error(f"Failed to add known face: {e}")
            return False
    
    def get_face_landmarks(self, image: np.ndarray) -> List[Dict]:
        """Get facial landmarks (eyes, nose, mouth, etc)"""
        face_locations = self.detect_faces(image)
        landmarks_list = fr.face_landmarks(image, face_locations)
        
        return landmarks_list

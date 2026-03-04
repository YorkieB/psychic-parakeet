import asyncio
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
import logging
import numpy as np

from src.camera.base import BaseCamera
from src.camera.frame_processor import FrameProcessor
try:
    from src.vision.face_recognition import FaceRecognitionEngine
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FaceRecognitionEngine = None
    FACE_RECOGNITION_AVAILABLE = False
from src.vision.gpt4o_vision import GPT4oVisionAPI
from src.vision.claude_vision import ClaudeVisionAPI
from src.vision.motion_detection import MotionDetector
from src.vision.scene_analyzer import SceneAnalyzer
from src.core.event_bus import EventBus, EventType, Event
from src.core.cache_layer import CacheLayer
from src.core.privacy_manager import PrivacyManager
from src.database.connection import DatabaseConnection
from src.core.pattern_learner import PatternLearner
from src.core.context_awareness import ContextAwareness
from src.core.predictive_analyzer import PredictiveAnalyzer

# Feature modules
from src.features.spatial_memory_feature import SpatialMemoryFeature
from src.features.appearance_tracking_feature import AppearanceTrackingFeature
from src.features.screen_assistance_feature import ScreenAssistanceFeature
from src.features.visual_guidance_feature import VisualGuidanceFeature

logger = logging.getLogger(__name__)


class VisionEngine:
    """Main Vision Engine orchestrating all components with super intelligence"""
    
    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Initialize core components
        self.event_bus = EventBus()
        self.cache_layer = CacheLayer(config.redis_url)
        self.privacy_manager = PrivacyManager(db_session=None)  # Will set after DB connection
        # Database will be initialized in initialize() method
        self.db = None
        self.database_enabled = False
        
        # Vision components
        if FACE_RECOGNITION_AVAILABLE and FaceRecognitionEngine:
            try:
                self.face_engine = FaceRecognitionEngine()
            except Exception as e:
                self.logger.warning(f"Face recognition initialization failed: {e}. Continuing without face recognition.")
                self.face_engine = None
        else:
            self.logger.info("Face recognition not available (face_recognition module not installed). Continuing without face recognition.")
            self.face_engine = None
        self.gpt4o_vision = GPT4oVisionAPI(config.openai_api_key)
        # Claude is optional - only initialize if API key provided and no errors
        try:
            self.claude_vision = ClaudeVisionAPI(config.anthropic_api_key) if config.anthropic_api_key else None
        except Exception as e:
            self.logger.warning(f"Claude Vision API not available: {e}. Continuing with OpenAI only.")
            self.claude_vision = None
        self.frame_processor = FrameProcessor()
        self.motion_detector = MotionDetector(threshold=config.motion_threshold)
        self.scene_analyzer = SceneAnalyzer()
        
        # Intelligence components
        self.pattern_learner = PatternLearner()
        self.context_awareness = ContextAwareness()
        self.predictive_analyzer = PredictiveAnalyzer(self.pattern_learner, self.context_awareness)
        
        # Feature modules
        self.features = {}
        self.spatial_memory = None
        self.appearance_tracking = None
        self.screen_assistance = None
        self.visual_guidance = None
        
        # Camera
        self.camera: Optional[BaseCamera] = None
        
        # Smart triggering state
        self.last_analysis_time = {}  # camera_id -> timestamp
        self.previous_frames = {}  # camera_id -> frame
        
        # Statistics
        self.stats = {
            "frames_processed": 0,
            "api_calls": 0,
            "api_failures": 0,
            "cache_hits": 0,
            "faces_recognized": 0,
            "motion_detections": 0,
            "anomalies_detected": 0,
            "predictions_generated": 0
        }
    
    async def initialize(self):
        """Initialize engine with all features"""
        self.logger.info("Initializing Vision Engine with super intelligence...")
        
        # Connect to database (optional - system can work without it)
        self.database_enabled = False
        try:
            # Create database config
            from src.database.connection import DatabaseConfig
            db_config = DatabaseConfig(
                database_url=self.config.database_url,
                echo=self.config.db_echo,
                pool_size=self.config.db_pool_size,
                max_overflow=self.config.db_max_overflow,
                pool_timeout=self.config.db_pool_timeout,
                pool_recycle=self.config.db_pool_recycle
            )
            
            # Reinitialize database with config
            from src.database.connection import Database
            self.db = Database(db_config)
            db_connected = self.db.connect()  # Returns True if PostgreSQL, False if fallback
            
            if db_connected:
                # Create tables if they don't exist
                try:
                    self.db.create_tables()
                except Exception as e:
                    self.logger.warning(f"Could not create tables (may already exist): {e}")
                
                # Update privacy manager with DB session
                if self.db.is_connected:
                    with self.db.session() as session:
                        self.privacy_manager.db_session = session
                    self.database_enabled = True
                    self.logger.info("✅ Database connected - Full persistence available")
                else:
                    self.logger.warning("⚠️ Database connection not healthy")
            else:
                self.logger.warning("⚠️ Using in-memory database (data will not persist)")
        except Exception as e:
            self.logger.warning(f"⚠️ Database not available: {e}. Continuing without database (some features will be limited).")
            # System can continue without database for basic vision processing
        
        # Camera will be connected in main.py after initialization
        # Don't connect here to avoid duplicate connection attempts
        
        # Initialize feature modules
        await self._initialize_features()
        
        # Grant default consents
        self.privacy_manager.grant_consent("face_recognition")
        self.privacy_manager.grant_consent("spatial_memory")
        self.privacy_manager.grant_consent("appearance_tracking")
        
        # Update global context
        self.context_awareness.update_global_context()
        
        self.logger.info("Vision Engine initialized with all features")
    
    async def _initialize_features(self):
        """Initialize all feature modules"""
        # Get feature config from YAML or use defaults
        from src.config import get_config
        try:
            yaml_config = get_config()
            features_config = yaml_config.get('features', {})
        except:
            features_config = {}  # Use defaults if config not available
        
        # Spatial Memory Feature
        if features_config.get('spatial_memory', True):
            self.spatial_memory = SpatialMemoryFeature(self.event_bus, self.db, enabled=True)
            self.spatial_memory.initialize()
            self.features["spatial_memory"] = self.spatial_memory
            self.logger.info("Spatial Memory Feature initialized")
        
        # Appearance Tracking Feature
        if features_config.get('appearance_tracking', True):
            self.appearance_tracking = AppearanceTrackingFeature(self.event_bus, enabled=True)
            self.appearance_tracking.initialize()
            self.features["appearance_tracking"] = self.appearance_tracking
            self.logger.info("Appearance Tracking Feature initialized")
        
        # Screen Assistance Feature
        if features_config.get('screen_assistance', True):
            self.screen_assistance = ScreenAssistanceFeature(
                self.event_bus, 
                self.gpt4o_vision, 
                enabled=True
            )
            self.screen_assistance.initialize()
            self.features["screen_assistance"] = self.screen_assistance
            self.logger.info("Screen Assistance Feature initialized")
        
        # Visual Guidance Feature
        if features_config.get('visual_guidance', True):
            self.visual_guidance = VisualGuidanceFeature(
                self.event_bus,
                self.spatial_memory,
                enabled=True
            )
            self.visual_guidance.initialize()
            self.features["visual_guidance"] = self.visual_guidance
            self.logger.info("Visual Guidance Feature initialized")
    
    async def process_frame(self, frame, camera_id: str = "default", context: Dict = None):
        """Process single frame through the complete intelligent pipeline"""
        if self.privacy_manager.privacy_mode:
            return None
        
        self.stats["frames_processed"] += 1
        context = context or {}
        context["camera_id"] = camera_id
        context["timestamp"] = datetime.utcnow()
        
        # Update context awareness
        self.context_awareness.update_temporal_context("frame_captured", {
            "camera_id": camera_id,
            "frame_shape": frame.shape
        })
        
        # Stage 1: Check cache
        cached_result = self.cache_layer.get(frame)
        if cached_result:
            self.stats["cache_hits"] += 1
            self.cache_layer.hit(frame)
            return cached_result
        
        # Stage 2: Motion detection
        motion_result = self.motion_detector.detect_motion(frame, method="hybrid")
        if motion_result.get("motion_detected"):
            self.stats["motion_detections"] += 1
            await self.event_bus.emit(Event(
                event_type=EventType.MOTION_DETECTED,
                timestamp=datetime.utcnow(),
                camera_id=camera_id,
                data=motion_result
            ))
        
        # Stage 3: Local processing - Face recognition
        recognized = []
        if self.face_engine:
            try:
                faces = self.face_engine.detect_faces(frame)
                if faces:
                    # Recognize faces
                    recognized = self.face_engine.recognize_faces(frame)
            except Exception as e:
                self.logger.warning(f"Face recognition error: {e}")
                recognized = []
        
        if recognized:
            self.stats["faces_recognized"] += len(recognized)
            
            # Update context for each recognized person
            for face in recognized:
                if face["name"] != "Unknown":
                    person_id = f"person_{face['name']}"
                    self.context_awareness.update_person_context(person_id, {
                        "current_location": context.get("room_name", "unknown"),
                        "last_seen": datetime.utcnow(),
                        "current_activity": None
                    })
                    
                    # Learn pattern
                    pattern_config = {}
                    try:
                        from src.config import get_config
                        yaml_config = get_config()
                        pattern_config = yaml_config.get('intelligence', {})
                    except:
                        pass
                    
                    if pattern_config.get('pattern_learning_enabled', True):
                        self.pattern_learner.learn_person_pattern(
                            person_id,
                            context.get("room_name", "unknown"),
                            timestamp=datetime.utcnow()
                        )
            
            # Emit face detected event
            await self.event_bus.emit(Event(
                event_type=EventType.FACE_DETECTED,
                timestamp=datetime.utcnow(),
                camera_id=camera_id,
                data={"faces": recognized, "frame": frame}
            ))
            
            # Emit person recognized events
            for face in recognized:
                if face["name"] != "Unknown":
                    await self.event_bus.emit(Event(
                        event_type=EventType.PERSON_RECOGNIZED,
                        timestamp=datetime.utcnow(),
                        camera_id=camera_id,
                        data={"face": face}
                    ))
        
        # Stage 4: Scene analysis
        scene_analysis = self.scene_analyzer.analyze_scene(frame, context)
        context.update(scene_analysis)
        
        # Update spatial context
        room_name = context.get("room_name") or "unknown"
        self.context_awareness.update_spatial_context(room_name, {
            "people_present": [f["name"] for f in recognized if f["name"] != "Unknown"],
            "activity": scene_analysis.get("activity", {}).get("level"),
            "lighting": scene_analysis.get("lighting", {}).get("level")
        })
        
        # Stage 5: Save frame to database
        frame_id = None
        if self.db and self.db.is_connected:
            try:
                from src.database.queries import FrameQueries
                from src.database.models import Camera
                
                # Get or create camera record
                with self.db.session() as session:
                    camera_record = session.query(Camera).filter(
                        Camera.name == (self.camera.name if self.camera else "Unknown")
                    ).first()
                    
                    if not camera_record and self.camera:
                        from src.database.queries import CameraQueries
                        camera_record = CameraQueries.create_camera(
                            session,
                            name=self.camera.name,
                            camera_type=getattr(self.camera, 'camera_type', 'unknown'),
                            ip_address=getattr(self.camera, 'ip_address', None)
                        )
                    
                    if camera_record:
                        height, width = frame.shape[:2]
                        frame_record = FrameQueries.save_frame(
                            session,
                            camera_id=camera_record.id,
                            width=width,
                            height=height,
                            format='jpg',
                            motion_detected=motion_result.get("motion_detected", False),
                            motion_score=motion_result.get("motion_score", 0.0)
                        )
                        session.flush()  # Flush to get the ID without committing yet
                        frame_id = frame_record.id  # Store ID before session closes
                        session.commit()
            except Exception as e:
                self.logger.warning(f"Failed to save frame to database: {e}")
        
        # Stage 6: Cloud analysis if needed (with fallback)
        result = None
        analysis_record = None
        if self.config.smart_triggering_enabled:
            if not await self._should_trigger_api(frame, camera_id):
                return None
        
        # Try primary API, fallback to Claude
        start_time = datetime.utcnow()
        api_provider = "gpt4o"
        try:
            result = await self.gpt4o_vision.analyze_image(frame, detail=self.config.vision_detail_level)
            if result.get("success"):
                self.stats["api_calls"] += 1
                self.cache_layer.set(frame, result)
                # Log the full analysis result
                analysis_text = result.get("analysis", "")
                if analysis_text:
                    self.logger.info(f"OpenAI Analysis Result: {analysis_text}")
            elif result.get("retryable") and self.claude_vision:
                # Fallback to Claude
                self.logger.info("Falling back to Claude Vision API")
                api_provider = "claude"
                result = await self.claude_vision.analyze_image(frame, detail=self.config.vision_detail_level)
                if result.get("success"):
                    self.stats["api_calls"] += 1
                    self.cache_layer.set(frame, result)
                else:
                    self.stats["api_failures"] += 1
            else:
                self.stats["api_failures"] += 1
        except Exception as e:
            self.logger.error(f"Vision API error: {e}")
            self.stats["api_failures"] += 1
            
            # Try Claude fallback
            if self.claude_vision:
                try:
                    api_provider = "claude"
                    result = await self.claude_vision.analyze_image(frame, detail=self.config.vision_detail_level)
                    if result.get("success"):
                        self.stats["api_calls"] += 1
                        self.cache_layer.set(frame, result)
                        # Log the analysis result
                        analysis_text = result.get("analysis", result.get("description", ""))
                        if analysis_text:
                            self.logger.info(f"Claude Analysis Result: {analysis_text}")
                except Exception as e2:
                    self.logger.error(f"Claude fallback also failed: {e2}")
        
        # Save analysis to database
        if result and result.get("success") and frame_id and self.db and self.db.is_connected:
            try:
                from src.database.queries import AnalysisQueries
                processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                cost = result.get("cost", 0.0)
                
                # Extract analysis text - check multiple possible fields
                analysis_text = result.get("analysis") or result.get("description") or result.get("text") or ""
                
                # Debug logging
                if not analysis_text:
                    self.logger.warning(f"Analysis text is empty. Result keys: {list(result.keys())}")
                    self.logger.debug(f"Full result: {result}")
                else:
                    self.logger.debug(f"Saving analysis text (length: {len(analysis_text)})")
                
                with self.db.session() as session:
                    analysis_record = AnalysisQueries.save_analysis(
                        session,
                        frame_id=frame_id,  # Use frame_id instead of frame_record.id
                        api_provider=api_provider,
                        analysis_text=analysis_text,  # Use extracted text
                        objects_detected=result.get("objects", []),
                        scenes_detected=result.get("scenes", []),
                        confidence=result.get("confidence"),
                        cost=cost,
                        processing_time_ms=processing_time
                    )
                    session.commit()
                    if analysis_text:
                        self.logger.info(f"Analysis saved to database (ID: {analysis_record.id}, length: {len(analysis_text)})")
            except Exception as e:
                self.logger.warning(f"Failed to save analysis to database: {e}")
                import traceback
                self.logger.debug(traceback.format_exc())
        
        # Stage 7: Save detections to database
        if frame_id and self.db and self.db.is_connected:
            try:
                from src.database.queries import DetectionQueries
                from src.database.models import Camera
                
                with self.db.session() as session:
                    camera_record = session.query(Camera).filter(
                        Camera.name == (self.camera.name if self.camera else "Unknown")
                    ).first()
                    
                    if camera_record:
                        # Save face detections
                        for face in recognized:
                            DetectionQueries.save_detection(
                                session,
                                frame_id=frame_id,  # Use frame_id instead of frame_record.id
                                camera_id=camera_record.id,
                                object_type="person",
                                label=face.get("name", "Unknown"),
                                confidence=face.get("confidence", 0.0),
                                x1=face.get("bbox", {}).get("x1", 0),
                                y1=face.get("bbox", {}).get("y1", 0),
                                x2=face.get("bbox", {}).get("x2", 0),
                                y2=face.get("bbox", {}).get("y2", 0),
                                metadata={"face_encoding_available": face.get("encoding") is not None}
                            )
                        
                        # Save object detections from analysis
                        if result and result.get("success"):
                            objects = self._extract_objects_from_analysis(result)
                            for obj in objects:
                                DetectionQueries.save_detection(
                                    session,
                                    frame_id=frame_id,  # Use frame_id instead of frame_record.id
                                    camera_id=camera_record.id,
                                    object_type="object",
                                    label=obj.get("name", "unknown"),
                                    confidence=obj.get("confidence", 0.0),
                                    x1=obj.get("bbox", {}).get("x1", 0),
                                    y1=obj.get("bbox", {}).get("y1", 0),
                                    x2=obj.get("bbox", {}).get("x2", 0),
                                    y2=obj.get("bbox", {}).get("y2", 0),
                                    metadata=obj.get("metadata", {})
                                )
                        session.commit()
            except Exception as e:
                self.logger.warning(f"Failed to save detections to database: {e}")
        
        # Stage 8: Process features
        if result and result.get("success"):
            # Extract objects from analysis
            objects = self._extract_objects_from_analysis(result)
            if objects:
                await self.event_bus.emit(Event(
                    event_type=EventType.OBJECT_DETECTED,
                    timestamp=datetime.utcnow(),
                    camera_id=camera_id,
                    data={"objects": objects}
                ))
        
        # Stage 9: Save events to database
        if self.db and self.db.is_connected:
            try:
                from src.database.queries import EventQueries
                from src.database.models import Camera
                
                with self.db.session() as session:
                    camera_record = session.query(Camera).filter(
                        Camera.name == (self.camera.name if self.camera else "Unknown")
                    ).first()
                    
                    camera_id_db = camera_record.id if camera_record else None
                    
                    # Log motion detected event
                    if motion_result.get("motion_detected"):
                        EventQueries.log_event(
                            session,
                            event_type="motion_detected",
                            severity="low",
                            camera_id=camera_id_db,
                            description=f"Motion detected with score {motion_result.get('motion_score', 0.0):.2f}",
                            metadata=motion_result
                        )
                    
                    # Log person recognized events
                    for face in recognized:
                        if face.get("name") != "Unknown":
                            EventQueries.log_event(
                                session,
                                event_type="person_recognized",
                                severity="medium",
                                camera_id=camera_id_db,
                                description=f"Person recognized: {face.get('name')}",
                                metadata={"face": face}
                            )
                    
                    session.commit()
            except Exception as e:
                self.logger.warning(f"Failed to save events to database: {e}")
        
        # Stage 10: Process all features
        for feature_name, feature in self.features.items():
            if feature.enabled:
                try:
                    feature_result = feature.process(frame, context)
                    if feature_result:
                        context[f"{feature_name}_result"] = feature_result
                except Exception as e:
                    self.logger.warning(f"Feature {feature_name} processing error: {e}")
        
        # Stage 11: Save person locations to database
        if recognized and self.db and self.db.is_connected:
            try:
                from src.database.queries import PersonQueries, LocationQueries
                from src.database.models import Camera, Person
                
                with self.db.session() as session:
                    camera_record = session.query(Camera).filter(
                        Camera.name == (self.camera.name if self.camera else "Unknown")
                    ).first()
                    
                    if camera_record:
                        for face in recognized:
                            if face.get("name") != "Unknown":
                                # Get or create person
                                person = session.query(Person).filter(
                                    Person.name == face.get("name")
                                ).first()
                                
                                if not person:
                                    person = PersonQueries.create_person(
                                        session,
                                        name=face.get("name"),
                                        metadata={"face_encoding_available": face.get("encoding") is not None}
                                    )
                                else:
                                    # Update last seen
                                    person.last_seen_at = datetime.utcnow()
                                
                                # Save location
                                LocationQueries.save_location(
                                    session,
                                    person_id=person.id,
                                    camera_id=camera_record.id,
                                    room=context.get("room_name", "unknown"),
                                    confidence=face.get("confidence", 1.0),
                                    frame_id=frame_id  # Use frame_id instead of frame_record.id
                                )
                        
                        session.commit()
            except Exception as e:
                self.logger.warning(f"Failed to save person locations to database: {e}")
        
        # Stage 12: Anomaly detection and predictions
        intelligence_config = {}  # Initialize with defaults
        try:
            from src.config import get_config
            yaml_config = get_config()
            intelligence_config = yaml_config.get('intelligence', {})
        except:
            pass  # Use defaults
        
        if intelligence_config.get('anomaly_detection_enabled', True):
            for face in recognized:
                if face["name"] != "Unknown":
                    person_id = f"person_{face['name']}"
                    anomalies = self.pattern_learner.detect_anomalies(
                        person_id,
                        context.get("room_name", "unknown"),
                        datetime.utcnow()
                    )
                    if anomalies:
                        self.stats["anomalies_detected"] += len(anomalies)
                        for anomaly in anomalies:
                            await self.event_bus.emit(Event(
                                event_type=EventType.UNUSUAL_ACTIVITY,
                                timestamp=datetime.utcnow(),
                                camera_id=camera_id,
                                data=anomaly
                            ))
        
        # Generate proactive suggestions
        if intelligence_config.get('predictive_analysis_enabled', True):
            for face in recognized:
                if face["name"] != "Unknown":
                    person_id = f"person_{face['name']}"
                    suggestions = self.predictive_analyzer.generate_proactive_suggestions(person_id)
                    if suggestions:
                        self.stats["predictions_generated"] += len(suggestions)
                        # Could emit suggestions as events or store for API access
        
        return {
            "faces": recognized,
            "motion": motion_result,
            "scene": scene_analysis,
            "vision_api": result,
            "context": context
        }
    
    def _extract_objects_from_analysis(self, analysis_result: Dict) -> List[Dict]:
        """Extract objects from vision API analysis"""
        objects = []
        
        # Try to extract from structured response
        if "objects" in analysis_result:
            if isinstance(analysis_result["objects"], dict):
                objects_list = analysis_result["objects"].get("objects", [])
                objects.extend(objects_list)
            elif isinstance(analysis_result["objects"], list):
                objects.extend(analysis_result["objects"])
        
        # Parse from text analysis if needed
        analysis_text = analysis_result.get("analysis", "")
        if analysis_text and not objects:
            # Simple extraction - in production would use NLP
            # This is a placeholder
            pass
        
        return objects
    
    async def _should_trigger_api(self, frame: np.ndarray, camera_id: str) -> bool:
        """Smart triggering logic to reduce API calls"""
        current_time = datetime.utcnow()
        
        # 1. Time-based throttling (5 second cooldown)
        last_analysis = self.last_analysis_time.get(camera_id)
        if last_analysis:
            time_since_last = (current_time - last_analysis).total_seconds()
            cooldown = getattr(self.config, 'smart_triggering_cooldown', 5)
            if time_since_last < cooldown:
                return False
        
        # 2. Motion detection check
        previous_frame = self.previous_frames.get(camera_id)
        if previous_frame is not None:
            has_motion = self.frame_processor.detect_motion(
                previous_frame, 
                frame, 
                threshold=self.config.motion_threshold
            )
            if not has_motion:
                return False
        else:
            # First frame, allow analysis
            pass
        
        # 3. Face detection check
        faces = self.face_engine.detect_faces(frame)
        # Note: We still allow analysis even without faces for scene understanding
        
        # 4. Scene similarity check (avoid duplicate analysis)
        if previous_frame is not None:
            try:
                similarity = self.frame_processor.compute_frame_similarity(previous_frame, frame)
                if similarity > 0.95:  # Very similar frames
                    return False
            except Exception as e:
                self.logger.warning(f"Frame similarity check failed: {e}")
        
        # Update state
        self.last_analysis_time[camera_id] = current_time
        self.previous_frames[camera_id] = frame.copy()
        
        return True
    
    def query_spatial_memory(self, query: str, context: Dict = None) -> Dict:
        """Query spatial memory with natural language"""
        if not self.spatial_memory:
            return {"error": "Spatial memory feature not enabled"}
        
        # Simple query parsing (in production would use NLP)
        query_lower = query.lower()
        
        if "where" in query_lower and "keys" in query_lower:
            locations = self.spatial_memory.find_object("keys")
            return {
                "query": query,
                "results": locations,
                "type": "object_location"
            }
        elif "where" in query_lower and any(word in query_lower for word in ["person", "john", "jane"]):
            # Extract person name (simplified)
            for word in query_lower.split():
                if word not in ["where", "is", "are", "the", "a", "an"]:
                    location = self.spatial_memory.query_location(word.capitalize())
                    if location:
                        return {
                            "query": query,
                            "results": [location],
                            "type": "person_location"
                        }
        
        return {"query": query, "results": [], "type": "unknown"}
    
    def get_predictive_insights(self) -> Dict:
        """Get predictive insights and suggestions"""
        return self.predictive_analyzer.get_predictive_insights()
    
    def get_proactive_suggestions(self, person_id: str) -> List[Dict]:
        """Get proactive suggestions for a person"""
        return self.predictive_analyzer.generate_proactive_suggestions(person_id)
    
    async def shutdown(self):
        """Shutdown engine"""
        # Cleanup features
        for feature_name, feature in self.features.items():
            try:
                feature.cleanup()
            except Exception as e:
                self.logger.warning(f"Error cleaning up feature {feature_name}: {e}")
        
        if self.camera:
            self.camera.disconnect()
        
        if self.db:
            self.db.disconnect()
        
        self.logger.info("Vision Engine shutdown complete")
    
    @property
    def privacy_mode(self) -> bool:
        """Get privacy mode status"""
        return self.privacy_manager.privacy_mode
    
    def get_stats(self) -> dict:
        """Get engine statistics"""
        stats = {
            **self.stats,
            "cache": self.cache_layer.get_stats(),
            "features": {name: f.get_stats() for name, f in self.features.items()},
            "intelligence": {
                "patterns_learned": len(self.pattern_learner.person_patterns),
                "context_rooms": len(self.context_awareness.spatial_context),
                "context_people": len(self.context_awareness.person_context)
            }
        }
        return stats

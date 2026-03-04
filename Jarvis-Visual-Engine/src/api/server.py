from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
from sqlalchemy import desc
from src.core.vision_engine import VisionEngine
from src.config import settings
from src.database.connection import Database, DatabaseConfig
from src.database.queries import (
    UserQueries, CameraQueries, FrameQueries, DetectionQueries,
    PersonQueries, LocationQueries, ObjectQueries, EventQueries,
    AnalysisQueries, PatternQueries, SpatialMemoryQueries,
    ConsentQueries, AuditQueries
)
from src.database.models import Frame, Object, Event, SpatialMemory
from datetime import datetime
import logging
import asyncio
import threading
from functools import wraps
from pathlib import Path
import os
import secrets
from typing import Optional
import cv2
import numpy as np
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    face_recognition = None
    FACE_RECOGNITION_AVAILABLE = False

# Setup logging
logger = logging.getLogger(__name__)

app = Flask(__name__)

# CORS configuration - restrict to specific origins in production
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5000").split(",")
CORS(app, origins=allowed_origins)
socketio = SocketIO(app, cors_allowed_origins=allowed_origins)

# Initialize Vision Engine
vision_engine = None

def set_vision_engine(engine):
    """Set the Vision Engine instance for Flask to access"""
    global vision_engine
    vision_engine = engine
    logger.info("Vision Engine instance set for Flask API")

# File upload configuration
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal"""
    # Remove path components
    filename = os.path.basename(filename)
    # Remove dangerous characters
    filename = "".join(c for c in filename if c.isalnum() or c in "._-")
    # Add random prefix to prevent collisions
    random_prefix = secrets.token_hex(8)
    return f"{random_prefix}_{filename}"


def require_api_key(f):
    """Decorator to require API key authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not settings.api_key:
            # If no API key configured, allow access (development mode)
            return f(*args, **kwargs)
        
        api_key = request.headers.get('X-API-Key')
        if not api_key or api_key != settings.api_key:
            return jsonify({"error": "Unauthorized", "message": "Missing or invalid API key"}), 401
        return f(*args, **kwargs)
    return decorated_function


async def initialize_engine():
    """Initialize vision engine asynchronously"""
    global vision_engine
    if vision_engine is None:
        vision_engine = VisionEngine(settings)
        await vision_engine.initialize()
    return vision_engine


@app.before_request
def before_request():
    """Initialize engine on first request (skip for health check)"""
    # Skip initialization for health check to allow server to start even if DB/Redis unavailable
    if request.path == '/health':
        return
    
    global vision_engine
    if vision_engine is None:
        # Run async initialization in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            vision_engine = loop.run_until_complete(initialize_engine())
        except Exception as e:
            logger.warning(f"Engine initialization failed (will retry on next request): {e}")
        finally:
            loop.close()


@app.route('/health', methods=['GET'])
@app.route('/api/v1/health', methods=['GET'])
def health_check():
    """Health check endpoint (no auth required)"""
    try:
        db_healthy = False
        redis_healthy = False
        
        if vision_engine and vision_engine.db:
            try:
                db_healthy = vision_engine.db.health_check()
            except:
                pass  # Database not available is OK
        
        # Check Redis
        redis_healthy = False
        try:
            if vision_engine and hasattr(vision_engine, 'cache_layer') and vision_engine.cache_layer:
                redis_healthy = vision_engine.cache_layer.redis_client is not None
                if redis_healthy:
                    vision_engine.cache_layer.redis_client.ping()
        except:
            redis_healthy = False
        
        return jsonify({
            "status": "healthy" if db_healthy else "degraded",
            "version": settings.app_version,
            "message": "Vision Engine API is operational",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected" if db_healthy else "disconnected",
            "redis": "connected" if redis_healthy else "disconnected",
            "server": "running"
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            "status": "unhealthy",
            "version": settings.app_version,
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "server": "running"
        }), 500


@app.route('/api/v1/analyze', methods=['POST'])
@require_api_key
def trigger_analysis():
    """Manually trigger an AI vision analysis of current frame"""
    try:
        # Check if Vision Engine is available
        if vision_engine is None:
            return jsonify({
                "error": "Vision Engine not initialized"
            }), 503
        
        # Check if camera is connected
        if not vision_engine.camera or not vision_engine.camera.is_connected:
            return jsonify({
                "error": "Camera not connected",
                "camera_status": {
                    "connected": False,
                    "name": vision_engine.camera.name if vision_engine.camera else None
                }
            }), 503
        
        # Capture current frame
        try:
            frame = vision_engine.camera.capture_frame()
        except Exception as e:
            logger.error(f"Frame capture error: {e}")
            return jsonify({
                "error": f"Failed to capture frame: {str(e)}"
            }), 500
        
        if frame is None:
            return jsonify({
                "error": "Failed to capture frame (frame is None)"
            }), 500
        
        # Trigger async analysis
        # Use asyncio to run the analysis in background
        def run_analysis():
            """Run analysis in background thread"""
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    # Process frame through full pipeline
                    loop.run_until_complete(
                        vision_engine.process_frame(frame, camera_id="manual_trigger")
                    )
                    logger.info("Manual analysis completed successfully")
                finally:
                    loop.close()
            except Exception as e:
                logger.error(f"Background analysis error: {e}", exc_info=True)
        
        # Start analysis in background thread
        analysis_thread = threading.Thread(target=run_analysis, daemon=True)
        analysis_thread.start()
        
        return jsonify({
            "status": "triggered",
            "message": "AI vision analysis started",
            "frame_size": list(frame.shape) if hasattr(frame, 'shape') else "unknown",
            "camera": {
                "name": vision_engine.camera.name if vision_engine.camera else None,
                "connected": True
            }
        }), 202  # 202 Accepted (async processing)
        
    except Exception as e:
        logger.error(f"Analysis trigger error: {e}", exc_info=True)
        return jsonify({
            "error": f"Analysis failed: {str(e)}"
        }), 500


@app.route('/api/v1/status', methods=['GET'])
@require_api_key
def get_status():
    """Get engine status and statistics"""
    try:
        if vision_engine is None:
            return jsonify({"error": "Engine not initialized"}), 503
        
        # Get camera status from Vision Engine
        camera_status = {
            "connected": False,
            "name": None
        }
        
        if vision_engine and hasattr(vision_engine, 'camera') and vision_engine.camera:
            camera = vision_engine.camera
            try:
                camera_info = camera.get_camera_info() if hasattr(camera, 'get_camera_info') else {}
                camera_status = {
                    "connected": camera.is_connected if hasattr(camera, 'is_connected') else False,
                    "name": camera.name if hasattr(camera, 'name') else None,
                    "type": camera_info.get('type', getattr(camera, 'type', 'USB')),
                    "resolution": camera_info.get('resolution', getattr(camera, 'resolution', 'Unknown')),
                    "usb_index": camera_info.get('usb_index', getattr(camera, 'usb_index', None)),
                    "connection_mode": camera_info.get('connection_mode', getattr(camera, 'connection_mode', 'usb'))
                }
            except Exception as e:
                logger.warning(f"Error getting camera info: {e}")
                camera_status = {
                    "connected": camera.is_connected if hasattr(camera, 'is_connected') else False,
                    "name": camera.name if hasattr(camera, 'name') else None
                }
        
        return jsonify({
            "status": "running",
            "stats": vision_engine.get_stats(),
            "privacy_mode": vision_engine.privacy_manager.privacy_mode if vision_engine.privacy_manager else False,
            "camera": camera_status
        })
    except Exception as e:
        logger.error(f"Status endpoint error: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/system/info', methods=['GET'])
@require_api_key
def get_system_info():
    """Get system information"""
    try:
        db_stats = {}
        if vision_engine and vision_engine.db:
            try:
                db_stats = vision_engine.db.get_stats()
            except:
                pass
        
        return jsonify({
            "version": settings.app_version,
            "environment": settings.environment,
            "database": db_stats,
            "camera_type": settings.camera_type,
            "vision_api_primary": settings.vision_api_primary,
            "features": {
                "face_recognition": vision_engine.face_engine is not None if vision_engine else False,
                "spatial_memory": vision_engine.spatial_memory is not None if vision_engine else False,
                "pattern_learning": True,
                "context_awareness": True
            }
        })
    except Exception as e:
        logger.error(f"System info error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/privacy/mode', methods=['POST'])
@require_api_key
def toggle_privacy_mode():
    """Toggle privacy mode"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
        
        if data.get('enabled'):
            vision_engine.privacy_manager.enable_privacy_mode()
        else:
            vision_engine.privacy_manager.disable_privacy_mode()
        
        return jsonify({
            "privacy_mode": vision_engine.privacy_mode,
            "message": "Privacy mode " + ("enabled" if data.get('enabled') else "disabled")
        })
    except Exception as e:
        logger.error(f"Privacy mode toggle error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/faces/register', methods=['POST'])
@require_api_key
def register_face():
    """Register a new face for recognition with multi-method detection and image upload support"""
    
    if vision_engine is None:
        return jsonify({"error": "Vision Engine not initialized"}), 503
    
    # Check if face recognition is available
    if not vision_engine.face_engine:
        return jsonify({
            "error": "Face recognition not available"
        }), 503
    
    # Get name from request (support both form and JSON)
    name = request.form.get('name') or (request.json.get('name') if request.json else None)
    
    if not name:
        return jsonify({"error": "Name parameter required"}), 400
    
    # Validate name (sanitize)
    name = name.strip()
    if not name or len(name) < 1:
        return jsonify({"error": "Name cannot be empty"}), 400
    
    try:
        if not FACE_RECOGNITION_AVAILABLE:
            return jsonify({"error": "face_recognition library not available"}), 503
        
        # Check if image file was uploaded
        if 'image' in request.files:
            # Use uploaded image
            logger.info("Using uploaded image file for face registration")
            file = request.files['image']
            
            if file.filename == '':
                return jsonify({"error": "No file selected"}), 400
            
            # Validate file type
            if not allowed_file(file.filename):
                return jsonify({"error": "Invalid file type. Only JPG, JPEG, PNG allowed"}), 400
            
            # Read image bytes
            image_bytes = file.read()
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                return jsonify({"error": "Failed to decode uploaded image"}), 400
        else:
            # Capture from camera
            logger.info("Capturing from camera for face registration")
            if not vision_engine.camera or not vision_engine.camera.is_connected:
                return jsonify({
                    "error": "Camera not connected. Please provide an image file."
                }), 503
            
            frame = vision_engine.camera.capture_frame()
            if frame is None:
                return jsonify({"error": "Failed to capture frame from camera"}), 500
        
        logger.info(f"Frame shape for face registration: {frame.shape}")
        
        # Convert BGR to RGB (face_recognition requires RGB)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Try multiple detection methods (from fastest to most thorough)
        face_locations = []
        detection_method = None
        
        # Method 1: HOG (fast, good for frontal faces)
        logger.info("Trying HOG model...")
        face_locations = face_recognition.face_locations(rgb_frame, model="hog")
        if len(face_locations) > 0:
            detection_method = "hog"
        
        # Method 2: CNN (slower, more accurate)
        if len(face_locations) == 0:
            logger.info("HOG failed, trying CNN model...")
            face_locations = face_recognition.face_locations(rgb_frame, model="cnn")
            if len(face_locations) > 0:
                detection_method = "cnn"
        
        # Method 3: CNN with upsampling (most thorough, slowest)
        if len(face_locations) == 0:
            logger.info("CNN failed, trying upsampled CNN...")
            face_locations = face_recognition.face_locations(
                rgb_frame, 
                number_of_times_to_upsample=2, 
                model="cnn"
            )
            if len(face_locations) > 0:
                detection_method = "cnn_upsampled"
        
        logger.info(f"Detected {len(face_locations)} face(s) using {detection_method}")
        
        if len(face_locations) == 0:
            return jsonify({
                "error": "No face detected in image",
                "debug": {
                    "frame_shape": list(frame.shape),
                    "methods_tried": ["hog", "cnn", "cnn_upsampled"],
                    "suggestion": "Ensure face is visible, well-lit, and looking towards camera"
                }
            }), 400
        
        # Get face encodings
        encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        
        if len(encodings) == 0:
            return jsonify({"error": "Failed to encode detected face"}), 500
        
        # Use the first face (if multiple detected)
        encoding = encodings[0]
        
        # Save image to disk (for persistence)
        person_dir = vision_engine.face_engine.known_faces_dir / name
        person_dir.mkdir(parents=True, exist_ok=True)
        existing_images = list(person_dir.glob("*.jpg"))
        new_image_path = person_dir / f"{name}_{len(existing_images)}.jpg"
        cv2.imwrite(str(new_image_path), frame)
        
        # Add to face recognizer lists
        vision_engine.face_engine.known_face_encodings.append(encoding)
        vision_engine.face_engine.known_face_names.append(name)
        
        # Reload known faces to ensure consistency
        vision_engine.face_engine.load_known_faces()
        
        logger.info(f"✅ Successfully registered face for '{name}' using {detection_method}")
        
        return jsonify({
            "status": "success",
            "message": f"Face registered successfully for {name}",
            "total_known_faces": len(vision_engine.face_engine.known_face_encodings),
            "detection_method": detection_method,
            "faces_found": len(face_locations)
        }), 201
        
    except Exception as e:
        logger.error(f"Face registration error: {e}", exc_info=True)
        return jsonify({
            "error": f"Registration failed: {str(e)}"
        }), 500


@app.route('/api/v1/faces', methods=['GET'])
@require_api_key
def get_known_faces():
    """Get list of known faces"""
    try:
        faces = vision_engine.face_engine.known_face_names
        return jsonify({
            "faces": list(set(faces)),
            "count": len(set(faces))
        })
    except Exception as e:
        logger.error(f"Get faces error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/faces', methods=['POST'])
@require_api_key
def add_face():
    """Add new known face with validation"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Validate file type
        if not allowed_file(file.filename):
            return jsonify({"error": f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
        
        # Validate file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({"error": f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"}), 400
        
        person_name = request.form.get('name')
        if not person_name:
            return jsonify({"error": "Name required"}), 400
        
        # Sanitize filename
        safe_filename = sanitize_filename(file.filename)
        temp_dir = Path("temp")
        temp_dir.mkdir(exist_ok=True)
        temp_path = temp_dir / safe_filename
        
        # Save file
        file.save(str(temp_path))
        
        # Process face
        success = vision_engine.face_engine.add_known_face(str(temp_path), person_name)
        
        # Clean up temp file
        try:
            temp_path.unlink()
        except Exception as e:
            logger.warning(f"Failed to delete temp file: {e}")
        
        if success:
            return jsonify({"message": f"Face added for {person_name}"})
        else:
            return jsonify({"error": "Failed to add face - no face detected in image"}), 400
    
    except Exception as e:
        logger.error(f"Add face error: {e}")
        return jsonify({"error": "Internal server error"}), 500


# ==================== CAMERA ENDPOINTS ====================

@app.route('/api/v1/cameras', methods=['GET'])
@require_api_key
def get_cameras():
    """Get all cameras"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        with vision_engine.db.session() as session:
            cameras = CameraQueries.get_all_cameras(session)
            return jsonify({
                "cameras": [c.to_dict() for c in cameras],
                "count": len(cameras)
            })
    except Exception as e:
        logger.error(f"Get cameras error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/cameras', methods=['POST'])
@require_api_key
def create_camera():
    """Create new camera"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
        
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        required = ['name', 'camera_type']
        if not all(k in data for k in required):
            return jsonify({"error": f"Missing required fields: {required}"}), 400
        
        with vision_engine.db.session() as session:
            camera = CameraQueries.create_camera(
                session,
                name=data['name'],
                camera_type=data['camera_type'],
                ip_address=data.get('ip_address'),
                port=data.get('port', 80),
                username=data.get('username'),
                password_encrypted=data.get('password_encrypted')  # Should be encrypted before sending
            )
            return jsonify(camera.to_dict()), 201
    except Exception as e:
        logger.error(f"Create camera error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/cameras/<int:camera_id>', methods=['GET'])
@require_api_key
def get_camera(camera_id: int):
    """Get camera by ID"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        with vision_engine.db.session() as session:
            camera = CameraQueries.get_camera_by_id(session, camera_id)
            if not camera:
                return jsonify({"error": "Camera not found"}), 404
            return jsonify(camera.to_dict())
    except Exception as e:
        logger.error(f"Get camera error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/cameras/<int:camera_id>', methods=['PUT'])
@require_api_key
def update_camera(camera_id: int):
    """Update camera"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
        
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        with vision_engine.db.session() as session:
            camera = CameraQueries.get_camera_by_id(session, camera_id)
            if not camera:
                return jsonify({"error": "Camera not found"}), 404
            
            # Update fields
            if 'status' in data:
                CameraQueries.update_camera_status(
                    session, camera_id, data['status'],
                    datetime.utcnow() if data['status'] == 'connected' else None
                )
            
            # Update other fields
            for key in ['name', 'ip_address', 'port', 'username']:
                if key in data:
                    setattr(camera, key, data[key])
            
            session.commit()
            return jsonify(camera.to_dict())
    except Exception as e:
        logger.error(f"Update camera error: {e}")
        return jsonify({"error": "Internal server error"}), 500


# ==================== FRAME ENDPOINTS ====================

@app.route('/api/v1/frames', methods=['GET'])
@require_api_key
def get_frames():
    """Get frames with pagination"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        camera_id = request.args.get('camera_id', type=int)
        
        with vision_engine.db.session() as session:
            if camera_id:
                frames = FrameQueries.get_frames_for_camera(session, camera_id, limit, offset)
            else:
                # Get all frames (simplified - would need pagination query)
                frames = session.query(Frame).order_by(desc(Frame.timestamp)).limit(limit).offset(offset).all()
            
            return jsonify({
                "frames": [f.to_dict() for f in frames],
                "count": len(frames),
                "limit": limit,
                "offset": offset
            })
    except Exception as e:
        logger.error(f"Get frames error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/frames/<int:frame_id>', methods=['GET'])
@require_api_key
def get_frame(frame_id: int):
    """Get frame by ID"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        with vision_engine.db.session() as session:
            from src.database.models import Frame
            frame = session.query(Frame).filter(Frame.id == frame_id).first()
            if not frame:
                return jsonify({"error": "Frame not found"}), 404
            return jsonify(frame.to_dict())
    except Exception as e:
        logger.error(f"Get frame error: {e}")
        return jsonify({"error": "Internal server error"}), 500


# ==================== DETECTION ENDPOINTS ====================

@app.route('/api/v1/detections', methods=['GET'])
@require_api_key
def get_detections():
    """Get detections with filters"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        limit = request.args.get('limit', 100, type=int)
        label = request.args.get('label')
        camera_id = request.args.get('camera_id', type=int)
        
        with vision_engine.db.session() as session:
            if label:
                detections = DetectionQueries.get_detections_by_label(session, label, limit)
            elif camera_id:
                detections = DetectionQueries.get_recent_detections(session, hours=24, camera_id=camera_id)
            else:
                detections = DetectionQueries.get_recent_detections(session, hours=24)
            
            return jsonify({
                "detections": [d.to_dict() for d in detections[:limit]],
                "count": len(detections)
            })
    except Exception as e:
        logger.error(f"Get detections error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/detections/<int:frame_id>', methods=['GET'])
@require_api_key
def get_detections_for_frame(frame_id: int):
    """Get detections for specific frame"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        with vision_engine.db.session() as session:
            detections = DetectionQueries.get_detections_for_frame(session, frame_id)
            return jsonify({
                "frame_id": frame_id,
                "detections": [d.to_dict() for d in detections],
                "count": len(detections)
            })
    except Exception as e:
        logger.error(f"Get detections for frame error: {e}")
        return jsonify({"error": "Internal server error"}), 500


# ==================== PEOPLE ENDPOINTS ====================

@app.route('/api/v1/people', methods=['GET'])
@require_api_key
def get_people():
    """Get all people"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        hours = request.args.get('hours', 24, type=int)
        
        with vision_engine.db.session() as session:
            if hours < 24:
                people = PersonQueries.get_recent_people(session, hours=hours)
            else:
                people = PersonQueries.get_all_people(session)
            
            return jsonify({
                "people": [p.to_dict() for p in people],
                "count": len(people)
            })
    except Exception as e:
        logger.error(f"Get people error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/people/<int:person_id>', methods=['GET'])
@require_api_key
def get_person(person_id: int):
    """Get person by ID"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        with vision_engine.db.session() as session:
            person = PersonQueries.get_person_by_id(session, person_id)
            if not person:
                return jsonify({"error": "Person not found"}), 404
            return jsonify(person.to_dict())
    except Exception as e:
        logger.error(f"Get person error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/people/<int:person_id>/locations', methods=['GET'])
@require_api_key
def get_person_locations(person_id: int):
    """Get person location history"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        hours = request.args.get('hours', 24, type=int)
        
        with vision_engine.db.session() as session:
            locations = LocationQueries.get_person_location_history(session, person_id, hours=hours)
            return jsonify({
                "person_id": person_id,
                "locations": [l.to_dict() for l in locations],
                "count": len(locations)
            })
    except Exception as e:
        logger.error(f"Get person locations error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/locations', methods=['GET'])
@require_api_key
def get_locations():
    """Get current object and person locations"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        room = request.args.get('room')
        
        with vision_engine.db.session() as session:
            current_locations = LocationQueries.get_current_locations(session, room=room)
            
            # Get objects in rooms
            objects = ObjectQueries.get_all_objects(session)
            
            return jsonify({
                "people": [l.to_dict() for l in current_locations],
                "objects": [o.to_dict() for o in objects],
                "timestamp": datetime.utcnow().isoformat()
            })
    except Exception as e:
        logger.error(f"Get locations error: {e}")
        return jsonify({"error": "Internal server error"}), 500


# ==================== OBJECT ENDPOINTS ====================

@app.route('/api/v1/objects', methods=['GET'])
@require_api_key
def get_objects():
    """Get all objects"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        with vision_engine.db.session() as session:
            objects = ObjectQueries.get_all_objects(session)
            return jsonify({
                "objects": [o.to_dict() for o in objects],
                "count": len(objects)
            })
    except Exception as e:
        logger.error(f"Get objects error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/objects/<int:object_id>', methods=['GET'])
@require_api_key
def get_object(object_id: int):
    """Get object by ID"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        with vision_engine.db.session() as session:
            from src.database.models import Object
            obj = session.query(Object).filter(Object.id == object_id).first()
            if not obj:
                return jsonify({"error": "Object not found"}), 404
            return jsonify(obj.to_dict())
    except Exception as e:
        logger.error(f"Get object error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/objects/find', methods=['POST'])
@require_api_key
def find_object_endpoint():
    """Find object by name"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
        
        object_name = data.get('name')
        object_type = data.get('type')
        
        if not object_name:
            return jsonify({"error": "name required"}), 400
        
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        with vision_engine.db.session() as session:
            obj = ObjectQueries.find_object(session, object_name, object_type)
            if not obj:
                return jsonify({"error": "Object not found"}), 404
            return jsonify(obj.to_dict())
    except Exception as e:
        logger.error(f"Find object error: {e}")
        return jsonify({"error": "Internal server error"}), 500


# ==================== EVENT ENDPOINTS ====================

@app.route('/api/v1/events', methods=['GET'])
@require_api_key
def get_events():
    """Get event history"""
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        event_type = request.args.get('type', None)
        
        if not vision_engine or not vision_engine.db:
            # Fallback to event bus if database not available
            from src.core.event_bus import EventType
            event_type_enum = None
            if event_type:
                try:
                    event_type_enum = EventType(event_type)
                except ValueError:
                    return jsonify({"error": f"Invalid event type: {event_type}"}), 400
            
            history = vision_engine.event_bus.get_history(event_type=event_type_enum, limit=limit)
            
            return jsonify({
                "events": [{
                    "type": e.event_type.value,
                    "timestamp": e.timestamp.isoformat(),
                    "camera_id": e.camera_id,
                    "data": e.data
                } for e in history]
            })
        
        # Use database
        with vision_engine.db.session() as session:
            if event_type:
                events = EventQueries.get_events_by_type(session, event_type, limit=limit)
            else:
                events = EventQueries.get_events(session, limit=limit, offset=offset)
            
            return jsonify({
                "events": [e.to_dict() for e in events],
                "count": len(events),
                "limit": limit,
                "offset": offset
            })
    except Exception as e:
        logger.error(f"Get events error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/events/<int:event_id>', methods=['GET'])
@require_api_key
def get_event(event_id: int):
    """Get event by ID"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        with vision_engine.db.session() as session:
            from src.database.models import Event
            event = session.query(Event).filter(Event.id == event_id).first()
            if not event:
                return jsonify({"error": "Event not found"}), 404
            return jsonify(event.to_dict())
    except Exception as e:
        logger.error(f"Get event error: {e}")
        return jsonify({"error": "Internal server error"}), 500


# ==================== ANALYSIS ENDPOINTS ====================

@app.route('/api/v1/analysis', methods=['GET'])
@require_api_key
def get_analysis():
    """Get recent analysis results"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        hours = request.args.get('hours', 24, type=int)
        limit = request.args.get('limit', 100, type=int)
        
        with vision_engine.db.session() as session:
            analyses = AnalysisQueries.get_recent_analysis(session, hours=hours, limit=limit)
            return jsonify({
                "analyses": [a.to_dict() for a in analyses],
                "count": len(analyses)
            })
    except Exception as e:
        logger.error(f"Get analysis error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/analysis/<int:frame_id>', methods=['GET'])
@require_api_key
def get_analysis_for_frame(frame_id: int):
    """Get analysis for specific frame"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        with vision_engine.db.session() as session:
            analysis = AnalysisQueries.get_analysis_for_frame(session, frame_id)
            if not analysis:
                return jsonify({"error": "Analysis not found"}), 404
            return jsonify(analysis.to_dict())
    except Exception as e:
        logger.error(f"Get analysis for frame error: {e}")
        return jsonify({"error": "Internal server error"}), 500


# ==================== CONSENT & PRIVACY ENDPOINTS ====================

@app.route('/api/v1/consent/grant', methods=['POST'])
@require_api_key
def grant_consent():
    """Grant consent for feature"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
        
        user_id = data.get('user_id')
        feature = data.get('feature')
        
        if not user_id or not feature:
            return jsonify({"error": "user_id and feature required"}), 400
        
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        with vision_engine.db.session() as session:
            consent = ConsentQueries.grant_consent(session, user_id, feature)
            AuditQueries.log_audit(
                session,
                action="consent_granted",
                user_id=user_id,
                entity_type="consent",
                changes={"feature": feature, "granted": True}
            )
            return jsonify(consent.to_dict())
    except Exception as e:
        logger.error(f"Grant consent error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/consent/revoke', methods=['POST'])
@require_api_key
def revoke_consent():
    """Revoke consent for feature"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
        
        user_id = data.get('user_id')
        feature = data.get('feature')
        
        if not user_id or not feature:
            return jsonify({"error": "user_id and feature required"}), 400
        
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        with vision_engine.db.session() as session:
            consent = ConsentQueries.revoke_consent(session, user_id, feature)
            if consent:
                AuditQueries.log_audit(
                    session,
                    action="consent_revoked",
                    user_id=user_id,
                    entity_type="consent",
                    changes={"feature": feature, "granted": False}
                )
                return jsonify(consent.to_dict())
            else:
                return jsonify({"error": "Consent not found"}), 404
    except Exception as e:
        logger.error(f"Revoke consent error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/consent/status', methods=['GET'])
@require_api_key
def get_consent_status():
    """Get consent status for user"""
    try:
        user_id = request.args.get('user_id', type=int)
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        with vision_engine.db.session() as session:
            status = ConsentQueries.get_consent_status(session, user_id)
            return jsonify({
                "user_id": user_id,
                "consents": status
            })
    except Exception as e:
        logger.error(f"Get consent status error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/data/export', methods=['POST'])
@require_api_key
def export_user_data():
    """Export all user data (GDPR)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
        
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        
        if vision_engine and vision_engine.privacy_manager:
            export_data = vision_engine.privacy_manager.get_data_for_export(user_id)
        else:
            export_data = {"message": "Privacy manager not available"}
        
        return jsonify({
            "message": "Data export initiated",
            "data": export_data
        })
    except Exception as e:
        logger.error(f"Export data error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/data/delete', methods=['POST'])
@require_api_key
def delete_user_data():
    """Delete all user data (GDPR)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
        
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        
        success = vision_engine.privacy_manager.delete_user_data(user_id)
        
        return jsonify({
            "success": success,
            "message": "User data deleted" if success else "Failed to delete data"
        })
    except Exception as e:
        logger.error(f"Delete data error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/spatial/query', methods=['POST'])
@require_api_key
def query_spatial_memory():
    """Query spatial memory with natural language"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
        
        query = data.get('query')
        if not query:
            return jsonify({"error": "query required"}), 400
        
        context = data.get('context', {})
        result = vision_engine.query_spatial_memory(query, context)
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Spatial query error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/intelligence/insights', methods=['GET'])
@require_api_key
def get_predictive_insights():
    """Get predictive insights and pattern analysis"""
    try:
        insights = vision_engine.get_predictive_insights()
        return jsonify(insights)
    except Exception as e:
        logger.error(f"Insights error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/intelligence/suggestions', methods=['GET'])
@require_api_key
def get_proactive_suggestions():
    """Get proactive suggestions for a person"""
    try:
        person_id = request.args.get('person_id')
        if not person_id:
            return jsonify({"error": "person_id required"}), 400
        
        suggestions = vision_engine.get_proactive_suggestions(person_id)
        return jsonify({
            "person_id": person_id,
            "suggestions": suggestions
        })
    except Exception as e:
        logger.error(f"Suggestions error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/intelligence/context', methods=['GET'])
@require_api_key
def get_context_awareness():
    """Get current context awareness state"""
    try:
        if vision_engine is None:
            return jsonify({"error": "Engine not initialized"}), 503
        
        context = vision_engine.context_awareness.get_situational_awareness()
        return jsonify(context)
    except Exception as e:
        logger.error(f"Context awareness error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/intelligence/patterns', methods=['GET'])
@require_api_key
def get_patterns():
    """Get learned patterns"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        person_id = request.args.get('person_id', type=int)
        limit = request.args.get('limit', 100, type=int)
        
        with vision_engine.db.session() as session:
            if person_id:
                patterns = PatternQueries.get_patterns_for_person(session, person_id)
            else:
                patterns = PatternQueries.get_patterns(session, limit=limit)
            
            return jsonify({
                "patterns": [p.to_dict() for p in patterns],
                "count": len(patterns)
            })
    except Exception as e:
        logger.error(f"Get patterns error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/intelligence/spatial-query', methods=['POST'])
@require_api_key
def spatial_query():
    """Query spatial memory with natural language"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
        
        query = data.get('query')
        if not query:
            return jsonify({"error": "query required"}), 400
        
        if vision_engine is None:
            return jsonify({"error": "Engine not initialized"}), 503
        
        context = data.get('context', {})
        result = vision_engine.query_spatial_memory(query, context)
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Spatial query error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/spatial/locations', methods=['GET'])
@require_api_key
def get_spatial_locations():
    """Get all current spatial locations"""
    try:
        if not vision_engine.spatial_memory:
            return jsonify({"error": "Spatial memory feature not enabled"}), 503
        
        # Get room states
        locations = {
            "people": [],
            "objects": []
        }
        
        # This would query the database for current locations
        # Simplified for now
        return jsonify(locations)
    except Exception as e:
        logger.error(f"Get locations error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/spatial/find-object', methods=['POST'])
@require_api_key
def find_object_spatial():
    """Find object in spatial memory"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
        
        object_name = data.get('object_name')
        room_name = data.get('room_name')
        
        if not object_name:
            return jsonify({"error": "object_name required"}), 400
        
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        with vision_engine.db.session() as session:
            obj = ObjectQueries.find_object(session, object_name)
            if not obj:
                return jsonify({"error": "Object not found"}), 404
            
            # Get spatial memory entries for this object
            from src.database.models import SpatialMemory
            spatial_entries = session.query(SpatialMemory).filter(
                and_(
                    SpatialMemory.entity_id == obj.id,
                    SpatialMemory.entity_type == 'object'
                )
            ).order_by(desc(SpatialMemory.timestamp)).limit(10).all()
            
            return jsonify({
                "object": obj.to_dict(),
                "spatial_history": [s.to_dict() for s in spatial_entries]
            })
    except Exception as e:
        logger.error(f"Find object error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/spatial/memory', methods=['GET'])
@require_api_key
def get_spatial_memory():
    """Get all spatial memory data"""
    try:
        if not vision_engine or not vision_engine.db:
            return jsonify({"error": "Database not available"}), 503
        
        entity_type = request.args.get('entity_type')  # person or object
        room = request.args.get('room')
        limit = request.args.get('limit', 100, type=int)
        
        with vision_engine.db.session() as session:
            from src.database.models import SpatialMemory
            query = session.query(SpatialMemory)
            
            if entity_type:
                query = query.filter(SpatialMemory.entity_type == entity_type)
            if room:
                query = query.filter(SpatialMemory.room == room)
            
            entries = query.order_by(desc(SpatialMemory.timestamp)).limit(limit).all()
            
            return jsonify({
                "entries": [e.to_dict() for e in entries],
                "count": len(entries)
            })
    except Exception as e:
        logger.error(f"Get spatial memory error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/v1/guidance/directions', methods=['POST'])
@require_api_key
def get_directions():
    """Get directions between rooms or to object"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
        
        from_room = data.get('from_room')
        to_room = data.get('to_room')
        target_object = data.get('target_object')
        
        if not vision_engine.visual_guidance:
            return jsonify({"error": "Visual guidance feature not enabled"}), 503
        
        if target_object:
            result = vision_engine.visual_guidance.guide_to_object(target_object, from_room)
        elif from_room and to_room:
            result = vision_engine.visual_guidance.provide_directions(from_room, to_room)
        else:
            return jsonify({"error": "Either to_room or target_object required"}), 400
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Directions error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection"""
    logger.info(f"Client connected: {request.sid}")


@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection"""
    logger.info(f"Client disconnected: {request.sid}")


@socketio.on('subscribe_to_events')
def subscribe_to_events(data):
    """Subscribe to real-time events"""
    event_type = data.get('event_type')
    socketio.emit('subscription_confirmed', {'event_type': event_type})


if __name__ == '__main__':
    socketio.run(app, host=settings.server_host, port=settings.server_port, debug=settings.debug)

"""Main entry point for Vision Engine"""
import asyncio
import signal
import sys
import socket
import threading
import time
from pathlib import Path
import logging

from src.config import settings
from src.logger import setup_logging
from src.core.vision_engine import VisionEngine
from src.camera.base import ObsbotTiny2Camera
from src.api.server import app, set_vision_engine  # Import Flask app and setter

# Optional ONVIF support
try:
    from src.camera.onvif_camera import ONVIFCameraDevice
    ONVIF_AVAILABLE = True
except ImportError:
    ONVIFCameraDevice = None
    ONVIF_AVAILABLE = False

# Setup logging
setup_logging(log_level=settings.environment.upper() if settings.environment != "development" else "DEBUG")
logger = logging.getLogger(__name__)

# Global reference for graceful shutdown
vision_engine_instance = None


def is_port_available(port):
    """Check if port is available"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(('localhost', port))
        sock.close()
        return result != 0
    except:
        return False


def run_flask_server():
    """Run Flask server in separate thread"""
    logger.info(f"🚀 Starting Flask API server on {settings.server_host}:{settings.server_port}")
    try:
        # Use app.run() for threading compatibility
        # Flask-SocketIO will work with app.run() when threaded=True
        app.run(
            host=settings.server_host,
            port=settings.server_port,
            debug=False,
            use_reloader=False,
            threaded=True
        )
    except Exception as e:
        logger.error(f"❌ Flask server error: {e}", exc_info=True)


def signal_handler(sig, frame):
    """Handle shutdown signals"""
    logger.info("Shutdown signal received, cleaning up...")
    if vision_engine_instance:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(vision_engine_instance.shutdown())
    sys.exit(0)


async def main():
    """Main async function"""
    global vision_engine_instance
    
    logger.info("🚀 Starting Vision Engine...")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Version: {settings.app_version}")
    
    # Check if port is available
    if not is_port_available(settings.server_port):
        logger.error(f"❌ Port {settings.server_port} is already in use!")
        logger.info(f"Run: netstat -ano | findstr :{settings.server_port}")
        logger.info("Then kill the process using that port")
        raise RuntimeError(f"Port {settings.server_port} unavailable")
    
    # Start Flask API server in background thread
    flask_thread = threading.Thread(target=run_flask_server, daemon=True)
    flask_thread.start()
    logger.info("✅ Flask API server thread started")
    
    # Wait for Flask to start and verify it's responding
    time.sleep(2)
    try:
        import requests
        response = requests.get(f"http://localhost:{settings.server_port}/api/v1/health", timeout=5)
        if response.status_code == 200:
            logger.info("✅ API server verified - responding to requests")
        else:
            logger.warning(f"⚠️ API server returned status {response.status_code}")
    except ImportError:
        logger.warning("⚠️ requests module not available - skipping API verification")
        logger.info("✅ Flask API server should be running (verify manually)")
    except Exception as e:
        logger.warning(f"⚠️ API server verification failed (may still be starting): {e}")
        logger.info("✅ Flask API server thread is running (verify manually with curl)")
    
    # Initialize Vision Engine
    vision_engine_instance = VisionEngine(settings)
    
    try:
        # Initialize engine
        await vision_engine_instance.initialize()
        
        if vision_engine_instance.database_enabled:
            logger.info("✅ Vision Engine started with full database persistence")
        else:
            logger.info("⚠️ Vision Engine started in limited mode (no database persistence)")
        
        logger.info(f"📡 API available at http://{settings.server_host}:{settings.server_port}")
        logger.info(f"📋 Try: curl http://localhost:{settings.server_port}/api/v1/health")
        
        # Setup camera if configured (try to auto-detect if not specified)
        camera_configured = (
            settings.camera_type == "emeet" or 
            settings.camera_ip or 
            settings.camera_usb_index is not None or
            settings.camera_type == "auto"
        )
        
        if camera_configured:
            if settings.camera_type == "obsbot":
                if not settings.camera_ip:
                    logger.warning("Obsbot camera requires CAMERA_IP")
                    camera = None
                else:
                    camera = ObsbotTiny2Camera(
                        camera_id="camera_1",
                        name="Main Camera",
                        room_name="Living Room",
                        ip_address=settings.camera_ip,
                        port=settings.camera_port
                    )
            elif settings.camera_type == "onvif":
                if not ONVIF_AVAILABLE:
                    logger.error("ONVIF camera support not available (onvif module not installed)")
                    camera = None
                elif not settings.camera_ip:
                    logger.warning("ONVIF camera requires CAMERA_IP")
                    camera = None
                else:
                    camera = ONVIFCameraDevice(
                        camera_id="camera_1",
                        name="ONVIF Camera",
                        room_name="Living Room",
                        ip_address=settings.camera_ip,
                        port=settings.camera_port,
                        username=settings.camera_username or "",
                        password=settings.camera_password or ""
                    )
            elif settings.camera_type == "emeet" or settings.camera_type == "auto":
                from src.camera.emeet_pixy import EmeetPixyCamera
                camera = EmeetPixyCamera(
                    camera_id="camera_1",
                    name="EMEET Pixy 4K",
                    room_name="Living Room",
                    ip_address=settings.camera_ip,
                    usb_index=settings.camera_usb_index,
                    username=settings.camera_username or "admin",
                    password=settings.camera_password or "admin",
                    connection_type=settings.camera_connection_type
                )
            else:
                logger.warning(f"Unknown camera type: {settings.camera_type}")
                camera = None
            
            if camera:
                vision_engine_instance.camera = camera
                logger.info(f"Attempting to connect to camera: {camera.name}...")
                if camera.connect():
                    logger.info(f"[OK] Camera connected: {camera.name}")
                    try:
                        camera_info = camera.get_camera_info()
                        logger.info(f"Camera info: {camera_info}")
                    except:
                        pass
                else:
                    logger.warning("Failed to connect to camera, continuing without camera")
            else:
                # Try auto-detection for USB cameras
                logger.info("No camera configured, attempting USB auto-detection...")
                from src.camera.emeet_pixy import list_usb_cameras
                available = list_usb_cameras(max_index=5)
                if available:
                    logger.info(f"Found {len(available)} USB camera(s), connecting to first one...")
                    from src.camera.emeet_pixy import EmeetPixyCamera
                    camera = EmeetPixyCamera(
                        camera_id="camera_1",
                        name="Auto-detected Camera",
                        room_name="Living Room",
                        usb_index=available[0],
                        connection_type="usb"
                    )
                    vision_engine_instance.camera = camera
                    if camera.connect():
                        logger.info(f"[OK] Auto-detected camera connected")
                    else:
                        logger.warning("Failed to connect to auto-detected camera")
                else:
                    logger.info("No cameras found. Vision Engine will run without camera input.")
        
        # Make Vision Engine accessible to Flask API
        set_vision_engine(vision_engine_instance)
        logger.info("✅ Vision Engine instance set for Flask API")
        
        # Main processing loop
        logger.info("Vision Engine started, entering processing loop...")
        logger.info("Press Ctrl+C to stop")
        
        frame_count = 0
        while True:
            try:
                # Capture frame if camera is available
                if vision_engine_instance.camera and vision_engine_instance.camera.is_connected:
                    frame = vision_engine_instance.camera.capture_frame()
                    
                    if frame is not None:
                        # Process frame
                        camera_id = vision_engine_instance.camera.camera_id
                        result = await vision_engine_instance.process_frame(frame, camera_id)
                        
                        frame_count += 1
                        if frame_count % 100 == 0:
                            stats = vision_engine_instance.get_stats()
                            logger.info(f"Processed {frame_count} frames. Stats: {stats}")
                
                # Sleep to control frame rate
                await asyncio.sleep(1.0 / settings.frame_rate)
                
            except KeyboardInterrupt:
                raise
            except Exception as e:
                logger.error(f"Error in processing loop: {e}", exc_info=True)
                await asyncio.sleep(1)  # Brief pause before retry
    
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        raise
    finally:
        # Cleanup
        logger.info("Shutting down Vision Engine...")
        await vision_engine_instance.shutdown()
        logger.info("Vision Engine stopped")


if __name__ == "__main__":
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Run main async function
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutdown complete")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)

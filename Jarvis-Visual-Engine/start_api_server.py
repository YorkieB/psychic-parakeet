"""Start the API server with better error handling"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from src.api.server import app, socketio
from src.config import settings
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == '__main__':
    logger.info("="*60)
    logger.info("Starting Vision Engine API Server")
    logger.info("="*60)
    logger.info(f"Host: {settings.server_host}")
    logger.info(f"Port: {settings.server_port}")
    logger.info(f"Debug: {settings.debug}")
    logger.info("")
    logger.info("API Endpoints:")
    logger.info("  GET  http://localhost:5000/api/v1/status")
    logger.info("  GET  http://localhost:5000/api/v1/intelligence/insights")
    logger.info("  POST http://localhost:5000/api/v1/spatial/query")
    logger.info("")
    logger.info("WebSocket available at: ws://localhost:5000")
    logger.info("")
    logger.info("Press Ctrl+C to stop the server")
    logger.info("="*60)
    logger.info("")
    
    try:
        socketio.run(
            app, 
            host=settings.server_host, 
            port=settings.server_port, 
            debug=settings.debug,
            allow_unsafe_werkzeug=True
        )
    except KeyboardInterrupt:
        logger.info("\nServer stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        sys.exit(1)

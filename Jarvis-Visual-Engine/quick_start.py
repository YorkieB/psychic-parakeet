"""Quick start script that starts the API server without hanging"""
import asyncio
import sys
import logging
from src.api.server import app, socketio
from src.config import settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Start the API server"""
    logger.info("=" * 60)
    logger.info("Starting Vision Engine API Server")
    logger.info("=" * 60)
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Server: http://{settings.server_host}:{settings.server_port}")
    logger.info(f"OpenAI API Key: {'Set' if settings.openai_api_key else 'Missing'}")
    logger.info("=" * 60)
    logger.info("")
    logger.info("The server will start now.")
    logger.info("Database connection will be attempted on first request.")
    logger.info("If PostgreSQL is not available, the system will use in-memory mode.")
    logger.info("")
    logger.info("Press Ctrl+C to stop the server")
    logger.info("")
    
    try:
        # Create temp directory if it doesn't exist
        import os
        os.makedirs("temp", exist_ok=True)
        
        # Start the server
        socketio.run(
            app,
            host=settings.server_host,
            port=settings.server_port,
            debug=settings.debug,
            allow_unsafe_werkzeug=True,
            use_reloader=False  # Disable reloader to prevent hanging
        )
    except KeyboardInterrupt:
        logger.info("\nShutting down server...")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()

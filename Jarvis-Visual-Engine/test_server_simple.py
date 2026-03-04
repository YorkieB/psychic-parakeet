"""Simple test to start and verify the API server"""
import sys
import os
import time
import threading
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from src.api.server import app
from src.config import settings

def run_server():
    """Run the Flask app"""
    print("Starting Flask server...")
    print(f"Host: {settings.server_host}")
    print(f"Port: {settings.server_port}")
    print(f"\nServer will be available at: http://localhost:{settings.server_port}")
    print("\nEndpoints:")
    print(f"  GET  http://localhost:{settings.server_port}/api/v1/status")
    print(f"  GET  http://localhost:{settings.server_port}/health")
    print("\nPress Ctrl+C to stop")
    print("="*60)
    
    app.run(
        host=settings.server_host,
        port=settings.server_port,
        debug=True,
        use_reloader=False
    )

if __name__ == '__main__':
    try:
        run_server()
    except KeyboardInterrupt:
        print("\n\nServer stopped")
    except Exception as e:
        print(f"\n\nError starting server: {e}")
        import traceback
        traceback.print_exc()

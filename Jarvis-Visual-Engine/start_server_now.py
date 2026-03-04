"""Simple standalone server that starts immediately"""
from flask import Flask, jsonify
from datetime import datetime
import sys
import os

# Create a simple Flask app
app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    """Health check - no dependencies"""
    return jsonify({
        "status": "healthy",
        "server": "running",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "message": "Vision Engine API Server is running!"
    })

@app.route('/api/v1/status', methods=['GET'])
def status():
    """Status endpoint"""
    return jsonify({
        "status": "operational",
        "camera": "EMEET Pixy 4K (USB)",
        "vision_api": "GPT-4o",
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    return jsonify({
        "message": "Vision Engine API Server",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "status": "/api/v1/status"
        }
    })

if __name__ == '__main__':
    print("="*60)
    print("Starting Vision Engine API Server")
    print("="*60)
    print("\nServer will be available at:")
    print("  http://localhost:5000")
    print("\nEndpoints:")
    print("  GET  http://localhost:5000/")
    print("  GET  http://localhost:5000/health")
    print("  GET  http://localhost:5000/api/v1/status")
    print("\n" + "="*60)
    print("Server starting...")
    print("="*60)
    print("\nOpen your browser and go to: http://localhost:5000/health")
    print("\nPress Ctrl+C to stop the server")
    print("="*60)
    print()
    
    try:
        app.run(
            host='0.0.0.0',
            port=5000,
            debug=True,
            use_reloader=False
        )
    except KeyboardInterrupt:
        print("\n\nServer stopped by user")
    except Exception as e:
        print(f"\n\nError: {e}")
        import traceback
        traceback.print_exc()

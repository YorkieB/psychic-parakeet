"""
HTTP API Server for Jarvis Memory System.
Provides REST API endpoints for memory operations (STM, MTM, LTM).
"""

import os
import sys
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback
import logging
from typing import Optional, Dict, Any, List

# Add the current directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from jarvis_memory_system import JarvisMemorySystem
from memory import Memory, MemoryType

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global memory system instances (per user)
memory_systems: Dict[str, JarvisMemorySystem] = {}


def get_memory_system(user_id: str = "default") -> JarvisMemorySystem:
    """Get or create memory system for a user."""
    if user_id not in memory_systems:
        stm_max = int(os.getenv('MEMORY_STM_MAX_SIZE', '500'))
        mtm_max = int(os.getenv('MEMORY_MTM_MAX_SIZE', '5000'))
        ltm_max = int(os.getenv('MEMORY_LTM_MAX_SIZE', '100000'))
        
        memory_systems[user_id] = JarvisMemorySystem(
            stm_max_size=stm_max,
            mtm_max_size=mtm_max,
            ltm_max_size=ltm_max
        )
        logger.info(f"Memory system initialized for user: {user_id}")
    
    return memory_systems[user_id]


def memory_to_dict(memory: Memory) -> Dict[str, Any]:
    """Convert Memory object to dictionary."""
    return {
        'id': memory.id,
        'content': memory.content,
        'tier': memory.tier.value if hasattr(memory.tier, 'value') else str(memory.tier),
        'memory_type': memory.memory_type.value if hasattr(memory.memory_type, 'value') else str(memory.memory_type),
        'created_at': memory.created_at.isoformat() if hasattr(memory.created_at, 'isoformat') else str(memory.created_at),
        'last_accessed': memory.last_accessed.isoformat() if hasattr(memory.last_accessed, 'isoformat') else str(memory.last_accessed),
        'importance_score': float(memory.importance_score),
        'emotional_intensity': float(memory.emotional_intensity),
        'confidence': float(memory.confidence),
        'source_emotion': memory.source_emotion,
        'source_context': memory.source_context,
        'related_memories': memory.related_memories,
        'consolidated_from': memory.consolidated_from,
    }


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    try:
        return jsonify({
            'status': 'healthy',
            'active_users': len(memory_systems),
            'service': 'Jarvis Memory System API'
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500


@app.route('/api/ingest', methods=['POST'])
def ingest():
    """Ingest a new memory into the system."""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required parameter: text'
            }), 400
        
        text = data['text']
        user_id = data.get('user_id', 'default')
        emotion = data.get('emotion')
        context = data.get('context')
        importance_score = data.get('importance_score')
        embedding = data.get('embedding')
        
        # Get memory system for user
        memory_system = get_memory_system(user_id)
        
        # Ingest memory
        memory = memory_system.ingest(
            text=text,
            emotion=emotion,
            context=context,
            importance_score=importance_score,
            embedding=embedding
        )
        
        response = {
            'success': True,
            'memory': memory_to_dict(memory)
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error ingesting memory: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/query', methods=['POST'])
def query():
    """Query memories across all tiers."""
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required parameter: query'
            }), 400
        
        query_text = data['query']
        user_id = data.get('user_id', 'default')
        top_k = data.get('top_k', 10)
        
        # Get memory system for user
        memory_system = get_memory_system(user_id)
        
        # Query memories
        results = memory_system.query(query_text, top_k=top_k)
        
        response = {
            'success': True,
            'results': [memory_to_dict(mem) for mem in results],
            'count': len(results)
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error querying memories: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/consolidate', methods=['POST'])
def consolidate():
    """Run consolidation pipeline (STM → MTM → LTM)."""
    try:
        data = request.get_json() or {}
        user_id = data.get('user_id', 'default')
        
        # Get memory system for user
        memory_system = get_memory_system(user_id)
        
        # Run consolidation
        stats = memory_system.consolidate()
        
        response = {
            'success': True,
            'stats': stats
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error consolidating memories: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get system statistics."""
    try:
        user_id = request.args.get('user_id', 'default')
        
        # Get memory system for user
        memory_system = get_memory_system(user_id)
        
        # Get statistics
        stats = memory_system.get_system_stats()
        
        response = {
            'success': True,
            'stats': stats
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/stm/recent', methods=['GET'])
def get_stm_recent():
    """Get recent STM memories."""
    try:
        user_id = request.args.get('user_id', 'default')
        num = int(request.args.get('num', '10'))
        
        # Get memory system for user
        memory_system = get_memory_system(user_id)
        
        # Get recent memories
        recent = memory_system.stm.retrieve_recent(num)
        
        response = {
            'success': True,
            'memories': [memory_to_dict(mem) for mem in recent],
            'count': len(recent)
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error getting recent STM memories: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/stm/search', methods=['POST'])
def search_stm():
    """Search STM memories."""
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required parameter: query'
            }), 400
        
        query_text = data['query']
        user_id = data.get('user_id', 'default')
        top_k = data.get('top_k', 5)
        
        # Get memory system for user
        memory_system = get_memory_system(user_id)
        
        # Search STM
        results = memory_system.stm.search(query_text, top_k=top_k)
        
        response = {
            'success': True,
            'results': [memory_to_dict(mem) for mem in results],
            'count': len(results)
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error searching STM: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api', methods=['GET'])
def api_info():
    """API information endpoint."""
    return jsonify({
        'service': 'Jarvis Memory System API',
        'version': '1.0.0',
        'endpoints': {
            'health': 'GET /health',
            'ingest': 'POST /api/ingest',
            'query': 'POST /api/query',
            'consolidate': 'POST /api/consolidate',
            'stats': 'GET /api/stats',
            'stm_recent': 'GET /api/stm/recent',
            'stm_search': 'POST /api/stm/search'
        }
    }), 200


def main():
    """Start the API server."""
    port = int(os.getenv('MEMORY_API_PORT', '3035'))
    host = os.getenv('MEMORY_API_HOST', '0.0.0.0')
    
    logger.info(f"Starting Jarvis Memory System API server on {host}:{port}")
    app.run(host=host, port=port, debug=False, threaded=True)


if __name__ == '__main__':
    main()

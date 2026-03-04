import redis
import json
import hashlib
from typing import Optional, Any
from datetime import timedelta
import numpy as np
import logging

logger = logging.getLogger(__name__)


class CacheLayer:
    """Redis-based caching for Vision API responses"""
    
    def __init__(self, redis_url: str):
        try:
            self.redis_client = redis.from_url(redis_url, socket_connect_timeout=2, socket_timeout=2)
            # Test connection
            self.redis_client.ping()
            self.ttl = 3600  # 1 hour default
            logger.info("Redis cache connected")
        except (redis.ConnectionError, redis.TimeoutError, Exception) as e:
            logger.warning(f"Redis not available: {e}. Continuing without cache (optional feature)")
            self.redis_client = None
            self.ttl = 3600
    
    def _hash_frame(self, frame: np.ndarray) -> str:
        """Create hash of frame"""
        frame_bytes = frame.tobytes()
        return hashlib.sha256(frame_bytes).hexdigest()
    
    def get(self, frame: np.ndarray) -> Optional[dict]:
        """Get cached analysis for frame"""
        if not self.redis_client:
            return None
        
        try:
            frame_hash = self._hash_frame(frame)
            cached = self.redis_client.get(frame_hash)
            
            if cached:
                self.redis_client.hincrby("cache_stats", "hits", 1)
                return json.loads(cached)
        except (redis.RedisError, json.JSONDecodeError) as e:
            logger.warning(f"Cache get error: {e}")
        
        return None
    
    def set(self, frame: np.ndarray, response: dict, ttl: int = None):
        """Cache analysis response"""
        if not self.redis_client:
            return
        
        try:
            frame_hash = self._hash_frame(frame)
            ttl = ttl or self.ttl
            
            self.redis_client.setex(
                frame_hash,
                ttl,
                json.dumps(response)
            )
            
            # Increment hit counter for statistics
            self.redis_client.hincrby("cache_stats", "writes", 1)
        except (redis.RedisError, json.JSONEncodeError) as e:
            logger.warning(f"Cache set error: {e}")
    
    def hit(self, frame: np.ndarray):
        """Record cache hit"""
        if not self.redis_client:
            return
        
        try:
            frame_hash = self._hash_frame(frame)
            self.redis_client.hincrby("cache_stats", "hits", 1)
        except redis.RedisError as e:
            logger.warning(f"Cache hit recording error: {e}")
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        if not self.redis_client:
            return {"hits": 0, "writes": 0}
        
        try:
            stats = self.redis_client.hgetall("cache_stats")
            return {k.decode(): int(v) for k, v in stats.items()}
        except redis.RedisError as e:
            logger.warning(f"Cache stats error: {e}")
            return {"hits": 0, "writes": 0}
    
    def clear_expired(self):
        """Clear expired cache entries"""
        # Redis handles TTL automatically
        pass
    
    def flush_all(self):
        """Clear all cache"""
        if self.redis_client:
            try:
                self.redis_client.flushdb()
            except redis.RedisError as e:
                logger.error(f"Cache flush error: {e}")

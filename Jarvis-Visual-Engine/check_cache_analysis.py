#!/usr/bin/env python3
"""Check Redis cache for OpenAI analysis results"""
import sys
from pathlib import Path
import json

project_path = Path(__file__).parent
sys.path.insert(0, str(project_path))

import redis
from src.config import settings

print("=" * 60)
print("CHECKING REDIS CACHE FOR ANALYSIS RESULTS")
print("=" * 60)
print()

try:
    r = redis.from_url(settings.redis_url, socket_connect_timeout=2, socket_timeout=2)
    r.ping()
    print("✓ Redis connected")
    print()
    
    # Get all keys
    keys = r.keys('*')
    print(f"Found {len(keys)} cache keys")
    print()
    
    if not keys:
        print("Cache is empty - no analysis results stored yet.")
        return
    
    # Check cache stats
    try:
        stats = r.hgetall("cache_stats")
        if stats:
            print("Cache Statistics:")
            for key, value in stats.items():
                print(f"  {key.decode() if isinstance(key, bytes) else key}: {value.decode() if isinstance(value, bytes) else value}")
            print()
    except:
        pass
    
    # Look for analysis data in cache entries
    print("Checking cache entries for analysis data...")
    print()
    
    analysis_found = False
    for i, key in enumerate(keys[:20]):  # Check first 20 keys
        try:
            key_str = key.decode() if isinstance(key, bytes) else str(key)
            # Skip stats keys
            if key_str in ['cache_stats']:
                continue
                
            data = r.get(key)
            if data:
                try:
                    cached = json.loads(data)
                    if isinstance(cached, dict):
                        # Check for analysis field
                        if 'analysis' in cached and cached['analysis']:
                            print(f"Found analysis in cache key: {key_str[:50]}...")
                            print(f"Analysis text:")
                            analysis_text = cached['analysis']
                            print(f"  {analysis_text[:500]}")
                            if len(analysis_text) > 500:
                                print(f"  ... (truncated, total: {len(analysis_text)} chars)")
                            print()
                            analysis_found = True
                            break  # Found one, that's enough
                        elif 'description' in cached and cached['description']:
                            print(f"Found description in cache key: {key_str[:50]}...")
                            print(f"Description:")
                            desc = cached['description']
                            print(f"  {desc[:500]}")
                            if len(desc) > 500:
                                print(f"  ... (truncated, total: {len(desc)} chars)")
                            print()
                            analysis_found = True
                            break
                except json.JSONDecodeError:
                    continue
        except Exception as e:
            continue
    
    if not analysis_found:
        print("No analysis text found in cache entries.")
        print("Cache entries may be frame hashes without analysis data.")
        print()
        print("To see new analysis:")
        print("  1. Clear cache: redis-cli FLUSHDB")
        print("  2. Trigger analysis: POST /api/v1/analyze")
        print("  3. Check logs for: INFO:src.core.vision_engine:OpenAI Analysis Result:")
    
except redis.ConnectionError:
    print("✗ Redis not connected")
    print("Analysis results are not being cached.")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

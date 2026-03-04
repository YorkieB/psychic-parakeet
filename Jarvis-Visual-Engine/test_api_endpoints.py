"""Test API endpoints to demonstrate system is working"""
import requests
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from src.config import settings

def test_endpoints():
    """Test API endpoints"""
    base_url = "http://localhost:5000"
    
    print("="*60)
    print("API Endpoint Tests")
    print("="*60)
    
    # Test 1: Health/Status
    print("\n1. Testing /api/v1/status")
    try:
        response = requests.get(f"{base_url}/api/v1/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"   [OK] Status: {data.get('status', 'unknown')}")
            print(f"   Response: {data}")
        else:
            print(f"   [WARNING] Status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("   [INFO] API server not running")
        print("   Start it with: python -m src.api.server")
        return False
    except Exception as e:
        print(f"   [ERROR] {e}")
        return False
    
    # Test 2: Intelligence Insights
    print("\n2. Testing /api/v1/intelligence/insights")
    try:
        headers = {}
        if settings.api_key:
            headers["X-API-Key"] = settings.api_key
        
        response = requests.get(
            f"{base_url}/api/v1/intelligence/insights",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   [OK] Insights retrieved")
            print(f"   Response keys: {list(data.keys())}")
        elif response.status_code == 401:
            print("   [INFO] Requires API key authentication")
            print(f"   Set API_KEY in .env file")
        else:
            print(f"   [WARNING] Status code: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   [ERROR] {e}")
    
    # Test 3: Spatial Memory Query
    print("\n3. Testing /api/v1/spatial/query")
    try:
        headers = {}
        if settings.api_key:
            headers["X-API-Key"] = settings.api_key
        
        response = requests.post(
            f"{base_url}/api/v1/spatial/query",
            json={"query": "Where are people?"},
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   [OK] Spatial query successful")
            print(f"   Response: {data}")
        elif response.status_code == 401:
            print("   [INFO] Requires API key authentication")
        else:
            print(f"   [WARNING] Status code: {response.status_code}")
    except Exception as e:
        print(f"   [ERROR] {e}")
    
    print("\n" + "="*60)
    print("[OK] API endpoint tests complete")
    print("="*60)
    return True

if __name__ == "__main__":
    test_endpoints()

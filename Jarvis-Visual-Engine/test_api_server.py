#!/usr/bin/env python3
"""Test script to verify Flask API server is running"""
import requests
import time
import sys

def test_api_server(base_url="http://localhost:5000", max_retries=10):
    """Test if API server is responding"""
    print("=" * 60)
    print("Testing Flask API Server")
    print("=" * 60)
    print(f"Base URL: {base_url}")
    print()
    
    endpoints = [
        "/api/v1/health",
        "/health",
        "/api/v1/status"
    ]
    
    for attempt in range(max_retries):
        print(f"Attempt {attempt + 1}/{max_retries}...")
        
        for endpoint in endpoints:
            try:
                url = f"{base_url}{endpoint}"
                print(f"  Testing: {url}")
                response = requests.get(url, timeout=2)
                
                if response.status_code == 200:
                    print(f"  ✅ {endpoint} - Status: {response.status_code}")
                    print(f"     Response: {response.json()}")
                    return True
                elif response.status_code == 401:
                    print(f"  ⚠️  {endpoint} - Status: {response.status_code} (Auth required)")
                    print(f"     Response: {response.json()}")
                else:
                    print(f"  ❌ {endpoint} - Status: {response.status_code}")
                    print(f"     Response: {response.text[:200]}")
            except requests.exceptions.ConnectionError:
                print(f"  [WAIT] {endpoint} - Connection refused (server may still be starting)")
            except requests.exceptions.Timeout:
                print(f"  ⏳ {endpoint} - Timeout")
            except Exception as e:
                print(f"  ❌ {endpoint} - Error: {e}")
        
        if attempt < max_retries - 1:
            print(f"  Waiting 2 seconds before retry...")
            time.sleep(2)
        print()
    
    print("❌ API server not responding after all retries")
    return False

if __name__ == "__main__":
    success = test_api_server()
    sys.exit(0 if success else 1)

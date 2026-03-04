"""
Test Suite Init
Initialize test suite and provide test utilities
"""  # [NRS-810]

import sys  # [NRS-810] System utilities
import os  # [NRS-810] File system operations
import unittest  # [NRS-807] Unit testing framework
from pathlib import Path  # [NRS-810] File path utilities

# [NRS-810] Add parent directory to Python path for imports
parent_dir = Path(__file__).parent.parent  # [NRS-810] Get parent directory
sys.path.insert(0, str(parent_dir))  # [NRS-810] Add to path

def run_all_tests():  # [NRS-810] Run all test discovery
    """Run all test suites"""  # [NRS-810]
    # [NRS-807] Discover and run all tests
    loader = unittest.TestLoader()  # [NRS-807] Create test loader
    
    # [NRS-810] Test directory
    test_dir = Path(__file__).parent  # [NRS-810] Get test directory
    
    # [NRS-807] Load all test modules
    test_suite = loader.discover(test_dir, pattern='test_*.py')  # [NRS-807] Discover tests
    
    # [NRS-810] Run tests
    runner = unittest.TextTestRunner(verbosity=2)  # [NRS-807] Create test runner
    result = runner.run(test_suite)  # [NRS-810] Execute tests
    
    return result  # [NRS-807] Return test results

def run_specific_test(test_module: str):  # [NRS-810] Run single test module
    """Run a specific test module"""  # [NRS-810]
    loader = unittest.TestLoader()  # [NRS-807] Create test loader
    
    # [NRS-807] Import the test module
    test_suite = loader.loadTestsFromName(test_module)  # [NRS-807] Load specific tests
    
    # [NRS-810] Run tests
    runner = unittest.TextTestRunner(verbosity=2)  # [NRS-807] Create test runner
    result = runner.run(test_suite)  # [NRS-810] Execute tests
    
    return result  # [NRS-807] Return test results

# [NRS-810] Test configuration
TEST_CONFIG = {  # [NRS-810] Test settings dictionary
    'MOCK_API_KEYS': True,  # [NRS-810] Use mock keys instead of real ones
    'SKIP_HARDWARE_TESTS': True,  # [NRS-810] Skip hardware-dependent tests
    'LOG_LEVEL': 'DEBUG'  # [NRS-807] Logging verbosity level
}  # [NRS-810]

# Mock data for testing  # [NRS-810]
MOCK_AUDIO_DATA = b'\x00\x01' * 1000  # Mock 16-bit audio  # [NRS-810]
MOCK_API_KEY = 'sk-test123456789'  # [NRS-810]
MOCK_VOICE_ID = 'test_voice_id_123'  # [NRS-810]

if __name__ == '__main__':  # [NRS-810]
    print("🧪 Running Jarvis Voice Assistant Test Suite")  # [NRS-810]
    print("=" * 50)  # [NRS-810]
    
    result = run_all_tests()  # [NRS-810]
    
    print("\n" + "=" * 50)  # [NRS-810]
    if result.wasSuccessful():  # [NRS-810]
        print("✅ All tests passed!")  # [NRS-810]
    else:  # [NRS-810]
        print(f"❌ {len(result.failures)} failures, {len(result.errors)} errors")  # [NRS-810]
        
    print(f"Tests run: {result.testsRun}")  # [NRS-810]
    print(f"Failures: {len(result.failures)}")  # [NRS-810]
    print(f"Errors: {len(result.errors)}")  # [NRS-810]
    print(f"Skipped: {len(getattr(result, 'skipped', []))}")  # [NRS-810]
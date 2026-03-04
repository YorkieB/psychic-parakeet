#!/usr/bin/env python
"""Test runner script"""
import sys
import subprocess
import os

def run_tests(test_type="all", verbose=True):
    """Run test suite"""
    
    # Base pytest command
    cmd = ["pytest"]
    
    if verbose:
        cmd.append("-v")
    
    # Add coverage
    cmd.extend(["--cov=src", "--cov-report=term-missing"])
    
    # Select test type
    if test_type == "unit":
        cmd.append("tests/test_*.py")
        cmd.append("-m")
        cmd.append("not integration and not slow")
    elif test_type == "integration":
        cmd.append("tests/test_integration.py")
        cmd.append("-m")
        cmd.append("integration")
    elif test_type == "camera":
        cmd.append("tests/test_camera.py")
    elif test_type == "vision":
        cmd.append("tests/test_vision.py")
    elif test_type == "intelligence":
        cmd.append("tests/test_intelligence.py")
    elif test_type == "features":
        cmd.append("tests/test_features.py")
    elif test_type == "api":
        cmd.append("tests/test_api.py")
    elif test_type == "core":
        cmd.append("tests/test_core.py")
    elif test_type == "database":
        cmd.append("tests/test_database.py")
    elif test_type == "quick":
        cmd.append("-m")
        cmd.append("not slow")
    else:
        # All tests
        cmd.append("tests/")
    
    print(f"Running tests: {test_type}")
    print(f"Command: {' '.join(cmd)}")
    print("-" * 60)
    
    result = subprocess.run(cmd)
    return result.returncode


if __name__ == "__main__":
    test_type = sys.argv[1] if len(sys.argv) > 1 else "all"
    exit_code = run_tests(test_type)
    sys.exit(exit_code)

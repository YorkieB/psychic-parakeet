# Test Suite Documentation

## Overview

Comprehensive test suite for Vision Engine covering all components, features, and intelligence systems.

## Test Structure

```
tests/
├── conftest.py              # Shared fixtures and configuration
├── test_camera.py          # Camera integration tests
├── test_vision.py          # Vision processing tests
├── test_intelligence.py    # Intelligence system tests
├── test_features.py        # Feature module tests
├── test_core.py            # Core system tests
├── test_api.py             # API endpoint tests
├── test_database.py        # Database tests
├── test_integration.py     # Integration tests
├── test_vision_engine.py   # Main vision engine tests
├── test_camera_connection.py  # Camera connection test
└── run_tests.py            # Test runner script
```

## Running Tests

### Run All Tests
```bash
pytest
# or
python tests/run_tests.py
```

### Run Specific Test Categories
```bash
# Unit tests only
pytest tests/test_core.py tests/test_vision.py

# Integration tests
pytest tests/test_integration.py -m integration

# Camera tests
pytest tests/test_camera.py

# Vision tests
pytest tests/test_vision.py

# Intelligence tests
pytest tests/test_intelligence.py

# Feature tests
pytest tests/test_features.py

# API tests
pytest tests/test_api.py

# Database tests
pytest tests/test_database.py
```

### Run with Coverage
```bash
pytest --cov=src --cov-report=html
# View coverage report: open htmlcov/index.html
```

### Run Specific Test File
```bash
pytest tests/test_camera.py -v
```

### Run Specific Test Function
```bash
pytest tests/test_camera.py::TestObsbotCamera::test_obsbot_connect_success -v
```

## Test Categories

### Unit Tests
- Individual component testing
- Mocked dependencies
- Fast execution
- No external services required

### Integration Tests
- Full pipeline testing
- Component interaction
- May require mocked services
- Moderate execution time

### Camera Tests
- Camera connection
- Frame capture
- PTZ control
- Requires camera or mocks

### Vision Tests
- Face recognition
- Vision API integration
- Motion detection
- Scene analysis

### Intelligence Tests
- Pattern learning
- Context awareness
- Predictive analysis
- Anomaly detection

### Feature Tests
- Spatial memory
- Appearance tracking
- Screen assistance
- Visual guidance

### API Tests
- Endpoint functionality
- Authentication
- Request/response validation
- Error handling

### Database Tests
- Connection management
- Query execution
- Data persistence
- Migration testing

## Test Markers

Tests are marked for selective execution:

```bash
# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Skip slow tests
pytest -m "not slow"

# Run camera tests
pytest -m camera
```

## Fixtures

Common fixtures available in `conftest.py`:

- `sample_frame` - Test frame (720x1280x3)
- `sample_frame_small` - Small test frame (480x640x3)
- `mock_config` - Mocked configuration
- `mock_db` - Mocked database connection
- `mock_redis` - Mocked Redis connection
- `event_bus` - Event bus instance
- `sample_event` - Sample event
- `mock_camera` - Mocked camera
- `mock_gpt4o_vision` - Mocked GPT-4o API
- `mock_claude_vision` - Mocked Claude API
- `mock_face_engine` - Mocked face recognition

## Writing New Tests

### Example Test Structure

```python
import pytest
from unittest.mock import Mock

class TestMyComponent:
    """Test my component"""
    
    def test_basic_functionality(self):
        """Test basic functionality"""
        # Arrange
        component = MyComponent()
        
        # Act
        result = component.do_something()
        
        # Assert
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_async_functionality(self):
        """Test async functionality"""
        component = MyComponent()
        result = await component.async_operation()
        assert result == expected
```

## Continuous Integration

Tests can be run in CI/CD:

```yaml
# Example GitHub Actions
- name: Run tests
  run: |
    pip install -r requirements.txt
    pytest --cov=src --cov-report=xml
    
- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Critical paths covered
- **API Tests**: All endpoints tested
- **Feature Tests**: All features tested

## Troubleshooting

### Tests Fail with Import Errors
```bash
# Ensure src is in Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

### Async Tests Fail
```bash
# Install pytest-asyncio
pip install pytest-asyncio
```

### Database Tests Fail
```bash
# Use test database or mocks
# Tests use mocks by default
```

### Camera Tests Fail
```bash
# Camera tests use mocks
# For real camera testing, use test_camera_connection.py
```

## Best Practices

1. **Use fixtures** - Reuse common test setup
2. **Mock external services** - Don't require real APIs/databases
3. **Test edge cases** - Include error conditions
4. **Keep tests fast** - Unit tests should be < 1s
5. **Clear test names** - Describe what is being tested
6. **One assertion per test** - When possible
7. **Test behavior, not implementation** - Focus on outcomes

## Test Data

Test data should be:
- Minimal and focused
- Representative of real scenarios
- Easy to understand
- Not dependent on external files (when possible)

## Performance Tests

For performance testing:
```bash
pytest tests/test_performance.py --benchmark
```

## Maintenance

- Update tests when code changes
- Remove obsolete tests
- Keep test code clean and readable
- Document complex test scenarios

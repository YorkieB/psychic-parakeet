"""Performance and load tests"""
import pytest
import time
import numpy as np
from unittest.mock import Mock, MagicMock

from src.camera.frame_processor import FrameProcessor
from src.vision.motion_detection import MotionDetector


@pytest.mark.slow
class TestPerformance:
    """Performance tests"""
    
    def test_frame_processing_speed(self, sample_frame):
        """Test frame processing performance"""
        processor = FrameProcessor()
        
        start = time.time()
        for _ in range(100):
            processor.resize_frame(sample_frame, (640, 480))
        elapsed = time.time() - start
        
        avg_time = elapsed / 100
        print(f"Average resize time: {avg_time*1000:.2f}ms")
        assert avg_time < 0.1  # Should be fast
    
    def test_motion_detection_speed(self, sample_frame):
        """Test motion detection performance"""
        detector = MotionDetector()
        
        frame2 = sample_frame.copy()
        frame2[100:200, 100:200] = 255
        
        start = time.time()
        for _ in range(50):
            detector.detect_motion(frame2, method="frame_diff")
        elapsed = time.time() - start
        
        avg_time = elapsed / 50
        print(f"Average motion detection time: {avg_time*1000:.2f}ms")
        assert avg_time < 0.1
    
    def test_memory_usage(self, sample_frame):
        """Test memory usage"""
        import sys
        
        frames = []
        initial_size = sys.getsizeof(frames)
        
        for _ in range(10):
            frames.append(sample_frame.copy())
        
        final_size = sys.getsizeof(frames)
        size_per_frame = (final_size - initial_size) / 10
        
        print(f"Memory per frame: {size_per_frame / 1024 / 1024:.2f}MB")
        # Should be reasonable for 720p frame

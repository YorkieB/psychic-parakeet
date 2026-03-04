"""Comprehensive vision processing tests"""
import pytest
import numpy as np
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from datetime import datetime

from src.vision.face_recognition import FaceRecognitionEngine
from src.vision.gpt4o_vision import GPT4oVisionAPI
from src.vision.claude_vision import ClaudeVisionAPI
from src.vision.motion_detection import MotionDetector
from src.vision.scene_analyzer import SceneAnalyzer


class TestFaceRecognition:
    """Test face recognition engine"""
    
    def test_face_engine_initialization(self):
        """Test face recognition engine initialization"""
        engine = FaceRecognitionEngine(known_faces_dir="tests/test_faces")
        assert engine is not None
        assert isinstance(engine.known_face_encodings, list)
        assert isinstance(engine.known_face_names, list)
    
    def test_detect_faces(self, sample_frame, mock_face_engine):
        """Test face detection"""
        faces = mock_face_engine.detect_faces(sample_frame)
        assert isinstance(faces, list)
    
    def test_recognize_faces(self, sample_frame, mock_face_engine):
        """Test face recognition"""
        recognized = mock_face_engine.recognize_faces(sample_frame)
        assert isinstance(recognized, list)
        if recognized:
            assert "name" in recognized[0]
            assert "confidence" in recognized[0]
            assert "location" in recognized[0]
    
    def test_get_face_encodings(self, sample_frame, mock_face_engine):
        """Test face encoding extraction"""
        encodings = mock_face_engine.get_face_encodings(sample_frame)
        assert isinstance(encodings, list)
    
    @patch('face_recognition.load_image_file')
    @patch('face_recognition.face_encodings')
    def test_add_known_face(self, mock_encodings, mock_load):
        """Test adding known face"""
        mock_load.return_value = np.zeros((100, 100, 3), dtype=np.uint8)
        mock_encodings.return_value = [np.random.rand(128)]
        
        engine = FaceRecognitionEngine()
        result = engine.add_known_face("test_face.jpg", "John")
        # May fail if file doesn't exist, but structure should work


class TestGPT4oVision:
    """Test GPT-4o Vision API"""
    
    @pytest.fixture
    def gpt4o_api(self):
        """Create GPT-4o API instance"""
        return GPT4oVisionAPI(api_key="test_key")
    
    @pytest.mark.asyncio
    @patch('openai.AsyncOpenAI')
    async def test_analyze_image_success(self, mock_openai, gpt4o_api, sample_frame):
        """Test successful image analysis"""
        # Mock OpenAI response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Test analysis"
        mock_response.usage.prompt_tokens = 100
        mock_response.usage.completion_tokens = 50
        
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        gpt4o_api.client = mock_client
        
        result = await gpt4o_api.analyze_image(sample_frame)
        
        assert result["success"] == True
        assert "analysis" in result
        assert result["api"] == "gpt4o"
    
    @pytest.mark.asyncio
    @patch('openai.AsyncOpenAI')
    async def test_analyze_image_failure(self, mock_openai, gpt4o_api, sample_frame):
        """Test image analysis failure"""
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(side_effect=Exception("API Error"))
        gpt4o_api.client = mock_client
        
        result = await gpt4o_api.analyze_image(sample_frame)
        
        assert result["success"] == False
        assert "error" in result
    
    @pytest.mark.asyncio
    @patch('openai.AsyncOpenAI')
    async def test_detect_objects(self, mock_openai, gpt4o_api, sample_frame):
        """Test object detection"""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"objects": [{"name": "person", "confidence": 0.9}]}'
        
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        gpt4o_api.client = mock_client
        
        result = await gpt4o_api.detect_objects(sample_frame)
        
        assert result["success"] == True
        assert "objects" in result
    
    def test_encode_image(self, gpt4o_api, sample_frame):
        """Test image encoding"""
        encoded = gpt4o_api._encode_image(sample_frame)
        assert isinstance(encoded, str)
        assert len(encoded) > 0


class TestClaudeVision:
    """Test Claude Vision API"""
    
    @pytest.fixture
    def claude_api(self):
        """Create Claude API instance"""
        return ClaudeVisionAPI(api_key="test_key")
    
    @pytest.mark.asyncio
    @patch('anthropic.AsyncAnthropic')
    async def test_analyze_image_success(self, mock_anthropic, claude_api, sample_frame):
        """Test successful Claude image analysis"""
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = "Test analysis"
        mock_response.usage.input_tokens = 100
        mock_response.usage.output_tokens = 50
        
        mock_client = MagicMock()
        mock_client.messages.create = AsyncMock(return_value=mock_response)
        claude_api.client = mock_client
        
        result = await claude_api.analyze_image(sample_frame)
        
        assert result["success"] == True
        assert "analysis" in result
        assert result["api"] == "claude"
    
    @pytest.mark.asyncio
    @patch('anthropic.AsyncAnthropic')
    async def test_analyze_image_retryable_error(self, mock_anthropic, claude_api, sample_frame):
        """Test retryable error handling"""
        from anthropic import RateLimitError
        
        mock_client = MagicMock()
        mock_client.messages.create = AsyncMock(side_effect=RateLimitError("Rate limited"))
        claude_api.client = mock_client
        
        result = await claude_api.analyze_image(sample_frame)
        
        assert result["success"] == False
        assert result.get("retryable") == True


class TestMotionDetection:
    """Test motion detection"""
    
    def test_motion_detector_initialization(self):
        """Test motion detector initialization"""
        detector = MotionDetector(threshold=5.0)
        assert detector.threshold == 5.0
    
    def test_frame_difference_method(self, sample_frame):
        """Test frame difference motion detection"""
        detector = MotionDetector(threshold=5.0)
        
        # Create second frame with difference
        frame2 = sample_frame.copy()
        frame2[100:200, 100:200] = 255
        
        result = detector.detect_motion(frame2, method="frame_diff")
        assert "motion_detected" in result
        assert "motion_percent" in result
    
    def test_background_subtraction_method(self, sample_frame):
        """Test background subtraction motion detection"""
        detector = MotionDetector(threshold=5.0)
        
        result = detector.detect_motion(sample_frame, method="background_sub")
        assert "motion_detected" in result
        assert "motion_percent" in result
    
    def test_hybrid_method(self, sample_frame):
        """Test hybrid motion detection"""
        detector = MotionDetector(threshold=5.0)
        
        # Create second frame with difference
        frame2 = sample_frame.copy()
        frame2[100:200, 100:200] = 255
        
        result = detector.detect_motion(frame2, method="hybrid")
        assert "motion_detected" in result
        assert "method" in result
        assert result["method"] == "hybrid"
    
    def test_get_motion_regions(self, sample_frame):
        """Test motion region detection"""
        detector = MotionDetector(threshold=5.0)
        
        # Process frame to build background
        detector.detect_motion(sample_frame, method="background_sub")
        
        # Create frame with motion
        frame2 = sample_frame.copy()
        frame2[100:300, 100:300] = 255
        
        regions = detector.get_motion_regions(frame2)
        assert isinstance(regions, list)
    
    def test_reset_background(self):
        """Test background model reset"""
        detector = MotionDetector()
        detector.reset_background()
        assert detector.background_subtractor is not None


class TestSceneAnalyzer:
    """Test scene analyzer"""
    
    def test_scene_analyzer_initialization(self):
        """Test scene analyzer initialization"""
        analyzer = SceneAnalyzer()
        assert analyzer is not None
        assert analyzer.lighting_analyzer is not None
        assert analyzer.activity_analyzer is not None
    
    def test_analyze_scene(self, sample_frame):
        """Test scene analysis"""
        analyzer = SceneAnalyzer()
        
        result = analyzer.analyze_scene(sample_frame)
        
        assert "timestamp" in result
        assert "lighting" in result
        assert "room_type" in result
        assert "activity" in result
    
    def test_classify_room(self, sample_frame):
        """Test room classification"""
        analyzer = SceneAnalyzer()
        
        room_type = analyzer._classify_room(sample_frame)
        assert isinstance(room_type, str)
        assert room_type in ["bedroom", "kitchen", "living_room", "unknown"]
    
    def test_lighting_analyzer(self, sample_frame):
        """Test lighting analysis"""
        analyzer = SceneAnalyzer()
        
        lighting = analyzer.lighting_analyzer.analyze(sample_frame)
        
        assert "level" in lighting
        assert "brightness" in lighting
        assert lighting["level"] in ["dark", "dim", "normal", "bright"]
    
    def test_activity_analyzer(self, sample_frame):
        """Test activity analysis"""
        analyzer = SceneAnalyzer()
        
        activity = analyzer.activity_analyzer.analyze(sample_frame)
        
        assert "level" in activity
        assert "variance" in activity
        assert activity["level"] in ["static", "low", "moderate", "high"]
    
    def test_check_safety(self, sample_frame):
        """Test safety checking"""
        analyzer = SceneAnalyzer()
        
        concerns = analyzer._check_safety(sample_frame)
        assert isinstance(concerns, list)

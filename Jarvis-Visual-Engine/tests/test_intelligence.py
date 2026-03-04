"""Comprehensive intelligence system tests"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, MagicMock

from src.core.pattern_learner import PatternLearner
from src.core.context_awareness import ContextAwareness
from src.core.predictive_analyzer import PredictiveAnalyzer


class TestPatternLearner:
    """Test pattern learning system"""
    
    @pytest.fixture
    def pattern_learner(self):
        """Create pattern learner instance"""
        return PatternLearner(history_days=30)
    
    def test_learn_person_pattern(self, pattern_learner):
        """Test learning person patterns"""
        pattern_learner.learn_person_pattern(
            "person_John",
            "kitchen",
            activity="cooking",
            timestamp=datetime.utcnow().replace(hour=18)
        )
        
        assert "person_John" in pattern_learner.person_patterns
        patterns = pattern_learner.person_patterns["person_John"]
        assert len(patterns["location_patterns"]) > 0
    
    def test_predict_person_location(self, pattern_learner):
        """Test person location prediction"""
        # Learn some patterns first
        for i in range(10):
            pattern_learner.learn_person_pattern(
                "person_John",
                "kitchen",
                timestamp=datetime.utcnow().replace(hour=18)
            )
        
        predictions = pattern_learner.predict_person_location(
            "person_John",
            hour=18,
            day_of_week=0
        )
        
        assert isinstance(predictions, dict)
        if predictions:
            assert "kitchen" in predictions
            assert 0.0 <= predictions["kitchen"] <= 1.0
    
    def test_learn_object_pattern(self, pattern_learner):
        """Test learning object movement patterns"""
        pattern_learner.learn_object_pattern(
            "keys",
            "bedroom",
            "kitchen",
            timestamp=datetime.utcnow()
        )
        
        assert "keys" in pattern_learner.object_patterns
        assert pattern_learner.object_patterns["keys"]["movement_frequency"] == 1
    
    def test_predict_object_location(self, pattern_learner):
        """Test object location prediction"""
        # Learn some movements
        for i in range(5):
            pattern_learner.learn_object_pattern(
                "keys",
                "bedroom",
                "kitchen",
                timestamp=datetime.utcnow()
            )
        
        location = pattern_learner.predict_object_location("keys")
        assert location == "kitchen"  # Most common destination
    
    def test_learn_room_pattern(self, pattern_learner):
        """Test learning room usage patterns"""
        pattern_learner.learn_room_pattern(
            "kitchen",
            people_count=2,
            activity_level="high",
            timestamp=datetime.utcnow()
        )
        
        assert "kitchen" in pattern_learner.room_patterns
        assert len(pattern_learner.room_patterns["kitchen"]["occupancy_times"]) > 0
    
    def test_predict_room_occupancy(self, pattern_learner):
        """Test room occupancy prediction"""
        # Learn some patterns
        for i in range(10):
            pattern_learner.learn_room_pattern(
                "kitchen",
                people_count=2,
                activity_level="high",
                timestamp=datetime.utcnow().replace(hour=18)
            )
        
        prediction = pattern_learner.predict_room_occupancy("kitchen", hour=18)
        
        assert "predicted_occupancy" in prediction
        assert "confidence" in prediction
        assert prediction["predicted_occupancy"] > 0
    
    def test_detect_anomalies(self, pattern_learner):
        """Test anomaly detection"""
        # Learn normal pattern
        for i in range(10):
            pattern_learner.learn_person_pattern(
                "person_John",
                "kitchen",
                timestamp=datetime.utcnow().replace(hour=18)
            )
        
        # Detect anomaly (person in unexpected location)
        anomalies = pattern_learner.detect_anomalies(
            "person_John",
            "bedroom",  # Unexpected at 6 PM
            datetime.utcnow().replace(hour=18)
        )
        
        assert isinstance(anomalies, list)
        if anomalies:
            assert anomalies[0]["type"] == "unexpected_location"
    
    def test_get_insights(self, pattern_learner):
        """Test getting learned insights"""
        # Learn some patterns
        pattern_learner.learn_person_pattern("person_John", "kitchen")
        pattern_learner.learn_object_pattern("keys", "bedroom", "kitchen")
        pattern_learner.learn_room_pattern("kitchen", 2, "high")
        
        insights = pattern_learner.get_insights()
        
        assert "person_patterns" in insights
        assert "object_patterns" in insights
        assert "room_patterns" in insights
    
    def test_export_import_patterns(self, pattern_learner):
        """Test pattern export and import"""
        # Learn some patterns
        pattern_learner.learn_person_pattern("person_John", "kitchen")
        
        # Export
        exported = pattern_learner.export_patterns()
        assert "person_patterns" in exported
        assert "exported_at" in exported
        
        # Import
        new_learner = PatternLearner()
        new_learner.import_patterns(exported)
        assert "person_John" in new_learner.person_patterns


class TestContextAwareness:
    """Test context awareness system"""
    
    @pytest.fixture
    def context(self):
        """Create context awareness instance"""
        return ContextAwareness(context_window_minutes=30)
    
    def test_update_temporal_context(self, context):
        """Test temporal context update"""
        context.update_temporal_context(
            "face_detected",
            {"person": "John"},
            timestamp=datetime.utcnow()
        )
        
        assert len(context.temporal_context) > 0
        assert context.temporal_context[-1]["type"] == "face_detected"
    
    def test_update_spatial_context(self, context):
        """Test spatial context update"""
        context.update_spatial_context("kitchen", {
            "people_present": ["John"],
            "activity": "cooking"
        })
        
        assert "kitchen" in context.spatial_context
        assert context.spatial_context["kitchen"]["people_present"] == ["John"]
    
    def test_update_person_context(self, context):
        """Test person context update"""
        context.update_person_context("person_John", {
            "current_location": "kitchen",
            "current_activity": "cooking"
        })
        
        assert "person_John" in context.person_context
        assert context.person_context["person_John"]["current_location"] == "kitchen"
    
    def test_get_recent_events(self, context):
        """Test getting recent events"""
        # Add some events
        for i in range(5):
            context.update_temporal_context(
                "face_detected",
                {"person": f"Person{i}"},
                timestamp=datetime.utcnow() - timedelta(minutes=i)
            )
        
        events = context.get_recent_events(minutes=10)
        assert len(events) > 0
    
    def test_get_room_context(self, context):
        """Test getting room context"""
        context.update_spatial_context("kitchen", {"people_present": ["John"]})
        
        room_ctx = context.get_room_context("kitchen")
        assert room_ctx is not None
        assert "people_present" in room_ctx
    
    def test_get_person_context(self, context):
        """Test getting person context"""
        context.update_person_context("person_John", {"current_location": "kitchen"})
        
        person_ctx = context.get_person_context("person_John")
        assert person_ctx is not None
        assert person_ctx["current_location"] == "kitchen"
    
    def test_infer_intent(self, context):
        """Test intent inference"""
        context.update_person_context("person_John", {
            "current_location": "kitchen",
            "recent_locations": ["bedroom", "hallway", "kitchen"]
        })
        
        intent = context.infer_intent("person_John", "searching", "kitchen")
        
        assert "confidence" in intent
        assert "possible_intents" in intent
        assert isinstance(intent["possible_intents"], list)
    
    def test_get_situational_awareness(self, context):
        """Test situational awareness"""
        context.update_spatial_context("kitchen", {})
        context.update_person_context("person_John", {})
        
        awareness = context.get_situational_awareness()
        
        assert "temporal" in awareness
        assert "spatial" in awareness
        assert "people" in awareness
        assert "global" in awareness
    
    def test_update_global_context(self, context):
        """Test global context update"""
        context.update_global_context(household_state="normal")
        
        assert context.global_context["household_state"] == "normal"
        assert "time_of_day" in context.global_context
        assert "time_period" in context.global_context


class TestPredictiveAnalyzer:
    """Test predictive analyzer"""
    
    @pytest.fixture
    def predictive_analyzer(self):
        """Create predictive analyzer instance"""
        pattern_learner = PatternLearner()
        context = ContextAwareness()
        return PredictiveAnalyzer(pattern_learner, context)
    
    def test_predict_next_actions(self, predictive_analyzer):
        """Test next action prediction"""
        # Learn some patterns
        predictive_analyzer.pattern_learner.learn_person_pattern(
            "person_John",
            "kitchen",
            timestamp=datetime.utcnow().replace(hour=18)
        )
        
        predictions = predictive_analyzer.predict_next_actions(
            "person_John",
            time_horizon_minutes=60
        )
        
        assert "person_id" in predictions
        assert "predictions" in predictions
        assert "generated_at" in predictions
    
    def test_predict_activity(self, predictive_analyzer):
        """Test activity prediction"""
        activity = predictive_analyzer._predict_activity(
            "kitchen",
            datetime.utcnow().replace(hour=18)  # 6 PM
        )
        
        assert activity == "dinner"  # Kitchen at 6 PM = dinner
    
    def test_generate_proactive_suggestions(self, predictive_analyzer):
        """Test proactive suggestion generation"""
        # Setup context
        predictive_analyzer.pattern_learner.learn_person_pattern(
            "person_John",
            "kitchen",
            timestamp=datetime.utcnow().replace(hour=18)
        )
        predictive_analyzer.context.update_person_context("person_John", {
            "current_location": "kitchen"
        })
        
        suggestions = predictive_analyzer.generate_proactive_suggestions("person_John")
        
        assert isinstance(suggestions, list)
    
    def test_predict_object_need(self, predictive_analyzer):
        """Test object need prediction"""
        predictive_analyzer.context.update_person_context("person_John", {
            "current_location": "kitchen",
            "current_activity": "cooking"
        })
        
        needs = predictive_analyzer.predict_object_need("person_John", {})
        
        assert isinstance(needs, list)
        if needs:
            assert "object" in needs[0]
            assert "confidence" in needs[0]
    
    def test_get_predictive_insights(self, predictive_analyzer):
        """Test getting predictive insights"""
        insights = predictive_analyzer.get_predictive_insights()
        
        assert "pattern_insights" in insights
        assert "context_summary" in insights
        assert "active_predictions" in insights

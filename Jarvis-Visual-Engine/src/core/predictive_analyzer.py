"""Predictive analysis for proactive assistance"""
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import logging

from src.core.pattern_learner import PatternLearner
from src.core.context_awareness import ContextAwareness

logger = logging.getLogger(__name__)


class PredictiveAnalyzer:
    """Predict future events and provide proactive assistance"""
    
    def __init__(self, pattern_learner: PatternLearner, 
                 context_awareness: ContextAwareness):
        """
        Initialize predictive analyzer
        
        Args:
            pattern_learner: Pattern learning system
            context_awareness: Context awareness system
        """
        self.pattern_learner = pattern_learner
        self.context = context_awareness
        self.predictions = {}
        self.proactive_suggestions = []
    
    def predict_next_actions(self, person_id: str, time_horizon_minutes: int = 60) -> Dict:
        """Predict person's next actions"""
        now = datetime.utcnow()
        predictions = []
        
        # Predict location
        location_pred = self.pattern_learner.predict_person_location(
            person_id,
            (now + timedelta(minutes=time_horizon_minutes)).hour,
            (now + timedelta(minutes=time_horizon_minutes)).weekday()
        )
        
        if location_pred:
            most_likely_location = max(location_pred.items(), key=lambda x: x[1])
            predictions.append({
                "type": "location_change",
                "predicted_location": most_likely_location[0],
                "confidence": most_likely_location[1],
                "time_horizon_minutes": time_horizon_minutes
            })
        
        # Predict activity based on time and location
        person_ctx = self.context.get_person_context(person_id)
        if person_ctx:
            current_location = person_ctx.get("current_location")
            if current_location:
                # Predict activity based on location and time
                predicted_activity = self._predict_activity(current_location, now)
                if predicted_activity:
                    predictions.append({
                        "type": "activity",
                        "predicted_activity": predicted_activity,
                        "confidence": 0.6,
                        "time_horizon_minutes": time_horizon_minutes
                    })
        
        return {
            "person_id": person_id,
            "predictions": predictions,
            "generated_at": now.isoformat()
        }
    
    def _predict_activity(self, location: str, time: datetime) -> Optional[str]:
        """Predict activity based on location and time"""
        hour = time.hour
        
        # Activity patterns by location and time
        activity_patterns = {
            "kitchen": {
                (6, 9): "breakfast",
                (12, 14): "lunch",
                (17, 20): "dinner",
                (20, 23): "snack"
            },
            "bedroom": {
                (22, 7): "sleeping",
                (7, 9): "getting_ready",
                (20, 22): "relaxing"
            },
            "office": {
                (9, 17): "working",
                (17, 20): "personal_tasks"
            },
            "living_room": {
                (18, 22): "entertainment",
                (20, 23): "relaxing"
            }
        }
        
        patterns = activity_patterns.get(location, {})
        for (start_hour, end_hour), activity in patterns.items():
            if start_hour <= hour < end_hour or (start_hour > end_hour and (hour >= start_hour or hour < end_hour)):
                return activity
        
        return None
    
    def generate_proactive_suggestions(self, person_id: str) -> List[Dict]:
        """Generate proactive suggestions based on predictions"""
        suggestions = []
        now = datetime.utcnow()
        
        # Predict next actions
        predictions = self.predict_next_actions(person_id, time_horizon_minutes=30)
        
        # Generate suggestions based on predictions
        for pred in predictions.get("predictions", []):
            if pred["type"] == "location_change":
                # Suggest preparing for location change
                suggestions.append({
                    "type": "location_preparation",
                    "message": f"You might be heading to {pred['predicted_location']} soon",
                    "confidence": pred["confidence"],
                    "action": "prepare_for_location_change",
                    "target_location": pred["predicted_location"]
                })
            
            elif pred["type"] == "activity":
                # Suggest items needed for activity
                activity = pred["predicted_activity"]
                needed_items = self._get_items_for_activity(activity, pred.get("predicted_location"))
                if needed_items:
                    suggestions.append({
                        "type": "item_reminder",
                        "message": f"For {activity}, you might need: {', '.join(needed_items)}",
                        "confidence": pred["confidence"],
                        "items": needed_items
                    })
        
        # Check for anomalies
        person_ctx = self.context.get_person_context(person_id)
        if person_ctx:
            current_location = person_ctx.get("current_location")
            if current_location:
                anomalies = self.pattern_learner.detect_anomalies(
                    person_id,
                    current_location,
                    now
                )
                
                for anomaly in anomalies:
                    if anomaly["severity"] == "high":
                        suggestions.append({
                            "type": "anomaly_alert",
                            "message": f"Unusual activity detected: {anomaly['type']}",
                            "severity": anomaly["severity"],
                            "details": anomaly
                        })
        
        return suggestions
    
    def _get_items_for_activity(self, activity: str, location: Optional[str]) -> List[str]:
        """Get items typically needed for an activity"""
        activity_items = {
            "breakfast": ["coffee", "cereal", "milk"],
            "lunch": ["sandwich", "drink"],
            "dinner": ["utensils", "plates"],
            "working": ["laptop", "notebook"],
            "entertainment": ["remote", "snacks"],
            "getting_ready": ["clothes", "keys", "wallet"]
        }
        
        return activity_items.get(activity, [])
    
    def predict_object_need(self, person_id: str, context: Dict) -> List[Dict]:
        """Predict what objects person might need"""
        needs = []
        
        # Get person context
        person_ctx = self.context.get_person_context(person_id)
        if not person_ctx:
            return needs
        
        current_location = person_ctx.get("current_location")
        current_activity = person_ctx.get("current_activity")
        
        # Predict based on location and activity
        if current_location == "kitchen" and current_activity == "cooking":
            needs.append({
                "object": "utensils",
                "confidence": 0.8,
                "reason": "Cooking activity in kitchen"
            })
        
        # Predict based on time
        now = datetime.utcnow()
        hour = now.hour
        
        if 7 <= hour <= 9 and current_location == "bedroom":
            needs.append({
                "object": "keys",
                "confidence": 0.7,
                "reason": "Morning routine"
            })
        
        return needs
    
    def get_predictive_insights(self) -> Dict:
        """Get overall predictive insights"""
        return {
            "pattern_insights": self.pattern_learner.get_insights(),
            "context_summary": self.context.get_situational_awareness(),
            "active_predictions": len(self.predictions),
            "proactive_suggestions_count": len(self.proactive_suggestions)
        }

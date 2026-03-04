"""Pattern learning and predictive analysis for super intelligence"""
import numpy as np
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from collections import defaultdict, deque
import logging
import json

logger = logging.getLogger(__name__)


class PatternLearner:
    """Learn patterns from behavior and predict future actions"""
    
    def __init__(self, history_days: int = 30):
        """
        Initialize pattern learner
        
        Args:
            history_days: Number of days of history to analyze
        """
        self.history_days = history_days
        self.person_patterns = defaultdict(lambda: {
            "location_patterns": defaultdict(list),
            "time_patterns": defaultdict(list),
            "activity_patterns": defaultdict(list),
            "object_interactions": defaultdict(list)
        })
        self.object_patterns = defaultdict(lambda: {
            "location_changes": [],
            "usage_times": [],
            "movement_frequency": 0
        })
        self.room_patterns = defaultdict(lambda: {
            "occupancy_times": [],
            "activity_levels": [],
            "peak_hours": []
        })
    
    def learn_person_pattern(self, person_id: str, location: str, 
                           activity: Optional[str] = None, timestamp: datetime = None):
        """Learn pattern from person behavior"""
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        hour = timestamp.hour
        day_of_week = timestamp.weekday()
        
        # Location patterns
        self.person_patterns[person_id]["location_patterns"][hour].append(location)
        self.person_patterns[person_id]["location_patterns"][f"day_{day_of_week}"].append(location)
        
        # Time patterns
        self.person_patterns[person_id]["time_patterns"][location].append({
            "hour": hour,
            "day": day_of_week,
            "timestamp": timestamp.isoformat()
        })
        
        # Activity patterns
        if activity:
            self.person_patterns[person_id]["activity_patterns"][location].append(activity)
    
    def predict_person_location(self, person_id: str, hour: int, 
                               day_of_week: int) -> Dict[str, float]:
        """Predict where person will be based on learned patterns"""
        patterns = self.person_patterns.get(person_id, {})
        location_patterns = patterns.get("location_patterns", {})
        
        predictions = {}
        
        # Predict based on hour
        hour_locations = location_patterns.get(hour, [])
        if hour_locations:
            from collections import Counter
            location_counts = Counter(hour_locations)
            total = len(hour_locations)
            for location, count in location_counts.items():
                predictions[location] = count / total
        
        # Predict based on day of week
        day_key = f"day_{day_of_week}"
        day_locations = location_patterns.get(day_key, [])
        if day_locations:
            from collections import Counter
            location_counts = Counter(day_locations)
            total = len(day_locations)
            for location, count in location_counts.items():
                if location in predictions:
                    predictions[location] = (predictions[location] + count / total) / 2
                else:
                    predictions[location] = count / total
        
        # Sort by probability
        sorted_predictions = dict(sorted(predictions.items(), key=lambda x: x[1], reverse=True))
        
        return sorted_predictions
    
    def learn_object_pattern(self, object_name: str, old_location: str, 
                           new_location: str, timestamp: datetime = None):
        """Learn pattern from object movement"""
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        self.object_patterns[object_name]["location_changes"].append({
            "from": old_location,
            "to": new_location,
            "timestamp": timestamp.isoformat()
        })
        self.object_patterns[object_name]["movement_frequency"] += 1
    
    def predict_object_location(self, object_name: str) -> Optional[str]:
        """Predict where object might be based on patterns"""
        patterns = self.object_patterns.get(object_name, {})
        location_changes = patterns.get("location_changes", [])
        
        if not location_changes:
            return None
        
        # Get most recent location
        recent_changes = sorted(
            location_changes,
            key=lambda x: x["timestamp"],
            reverse=True
        )[:10]  # Last 10 movements
        
        if recent_changes:
            # Most common destination
            destinations = [change["to"] for change in recent_changes]
            from collections import Counter
            most_common = Counter(destinations).most_common(1)
            if most_common:
                return most_common[0][0]
        
        return None
    
    def learn_room_pattern(self, room_name: str, people_count: int, 
                         activity_level: str, timestamp: datetime = None):
        """Learn patterns from room usage"""
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        hour = timestamp.hour
        
        self.room_patterns[room_name]["occupancy_times"].append({
            "hour": hour,
            "people_count": people_count,
            "timestamp": timestamp.isoformat()
        })
        
        self.room_patterns[room_name]["activity_levels"].append({
            "hour": hour,
            "level": activity_level,
            "timestamp": timestamp.isoformat()
        })
    
    def predict_room_occupancy(self, room_name: str, hour: int) -> Dict:
        """Predict room occupancy for given hour"""
        patterns = self.room_patterns.get(room_name, {})
        occupancy_times = patterns.get("occupancy_times", [])
        
        # Filter by hour
        hour_occupancies = [
            occ for occ in occupancy_times
            if occ["hour"] == hour
        ]
        
        if hour_occupancies:
            avg_people = np.mean([occ["people_count"] for occ in hour_occupancies])
            max_people = max([occ["people_count"] for occ in hour_occupancies])
            
            return {
                "predicted_occupancy": float(avg_people),
                "max_occupancy": int(max_people),
                "confidence": min(1.0, len(hour_occupancies) / 30.0)  # More data = higher confidence
            }
        
        return {
            "predicted_occupancy": 0.0,
            "max_occupancy": 0,
            "confidence": 0.0
        }
    
    def detect_anomalies(self, person_id: str, current_location: str, 
                        current_time: datetime) -> List[Dict]:
        """Detect anomalies in behavior"""
        anomalies = []
        
        # Predict expected location
        predictions = self.predict_person_location(
            person_id,
            current_time.hour,
            current_time.weekday()
        )
        
        if predictions:
            most_likely = max(predictions.items(), key=lambda x: x[1])
            if most_likely[0] != current_location and most_likely[1] > 0.7:
                anomalies.append({
                    "type": "unexpected_location",
                    "person_id": person_id,
                    "expected": most_likely[0],
                    "actual": current_location,
                    "confidence": most_likely[1],
                    "severity": "low"
                })
        
        return anomalies
    
    def get_insights(self) -> Dict:
        """Get learned insights"""
        insights = {
            "person_patterns": {},
            "object_patterns": {},
            "room_patterns": {}
        }
        
        # Person insights
        for person_id, patterns in self.person_patterns.items():
            location_patterns = patterns.get("location_patterns", {})
            most_common_locations = {}
            
            for key, locations in location_patterns.items():
                if locations:
                    from collections import Counter
                    most_common = Counter(locations).most_common(1)
                    if most_common:
                        most_common_locations[key] = most_common[0][0]
            
            insights["person_patterns"][person_id] = {
                "frequent_locations": most_common_locations,
                "pattern_strength": len(location_patterns)
            }
        
        # Object insights
        for object_name, patterns in self.object_patterns.items():
            movement_freq = patterns.get("movement_frequency", 0)
            insights["object_patterns"][object_name] = {
                "movement_frequency": movement_freq,
                "is_mobile": movement_freq > 5
            }
        
        # Room insights
        for room_name, patterns in self.room_patterns.items():
            occupancy_times = patterns.get("occupancy_times", [])
            if occupancy_times:
                avg_occupancy = np.mean([occ["people_count"] for occ in occupancy_times])
                insights["room_patterns"][room_name] = {
                    "average_occupancy": float(avg_occupancy),
                    "data_points": len(occupancy_times)
                }
        
        return insights
    
    def export_patterns(self) -> Dict:
        """Export learned patterns"""
        return {
            "person_patterns": dict(self.person_patterns),
            "object_patterns": dict(self.object_patterns),
            "room_patterns": dict(self.room_patterns),
            "exported_at": datetime.utcnow().isoformat()
        }
    
    def import_patterns(self, patterns: Dict):
        """Import learned patterns"""
        self.person_patterns = defaultdict(lambda: {
            "location_patterns": defaultdict(list),
            "time_patterns": defaultdict(list),
            "activity_patterns": defaultdict(list),
            "object_interactions": defaultdict(list)
        }, patterns.get("person_patterns", {}))
        
        self.object_patterns = defaultdict(lambda: {
            "location_changes": [],
            "usage_times": [],
            "movement_frequency": 0
        }, patterns.get("object_patterns", {}))
        
        self.room_patterns = defaultdict(lambda: {
            "occupancy_times": [],
            "activity_levels": [],
            "peak_hours": []
        }, patterns.get("room_patterns", {}))

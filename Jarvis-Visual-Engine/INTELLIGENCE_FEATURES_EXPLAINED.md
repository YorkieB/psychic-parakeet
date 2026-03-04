# Intelligence Features - Complete Explanation

## Overview

The Vision Engine now includes **super intelligence features** that go beyond basic vision processing. These features enable the system to learn patterns, maintain context awareness, predict future actions, and provide proactive assistance.

---

## 1. Pattern Learning System

**File:** `src/core/pattern_learner.py`

### What It Does

The Pattern Learning System learns behavioral patterns from people's movements, object locations, and room usage over time. It uses this knowledge to predict future behavior.

### How It Works

#### Learning Person Patterns

```python
# When a person is detected in a location
pattern_learner.learn_person_pattern(
    person_id="person_John",
    location="kitchen",
    activity="cooking",
    timestamp=datetime.utcnow()
)
```

**What it stores:**
- **Location patterns by hour**: "John is usually in kitchen at 6 PM"
- **Location patterns by day**: "John is usually in office on Mondays"
- **Activity patterns**: "John usually cooks in kitchen"
- **Time patterns**: Tracks when person visits each location

#### Predicting Person Location

```python
# Predict where John will be at 6 PM on Monday
predictions = pattern_learner.predict_person_location(
    person_id="person_John",
    hour=18,  # 6 PM
    day_of_week=0  # Monday
)
# Returns: {"kitchen": 0.85, "living_room": 0.15}
```

**How it calculates:**
1. Looks at all times John was seen at 6 PM → finds most common location
2. Looks at all Mondays → finds most common location
3. Combines both predictions with weighted average
4. Returns probabilities for each location

#### Learning Object Patterns

```python
# When object moves
pattern_learner.learn_object_pattern(
    object_name="keys",
    old_location="bedroom",
    new_location="kitchen",
    timestamp=datetime.utcnow()
)
```

**What it tracks:**
- Movement frequency (how often object moves)
- Location change history
- Most common destinations

#### Predicting Object Location

```python
# Predict where keys might be
location = pattern_learner.predict_object_location("keys")
# Returns: "kitchen" (most recent common destination)
```

#### Room Usage Patterns

```python
# Learn room occupancy patterns
pattern_learner.learn_room_pattern(
    room_name="kitchen",
    people_count=2,
    activity_level="high",
    timestamp=datetime.utcnow()
)
```

**Predicts:**
- Average occupancy at specific hours
- Peak usage times
- Activity levels

#### Anomaly Detection

```python
# Detect unusual behavior
anomalies = pattern_learner.detect_anomalies(
    person_id="person_John",
    current_location="bedroom",  # But it's 6 PM
    current_time=datetime.utcnow()
)
# Returns: [{
#     "type": "unexpected_location",
#     "expected": "kitchen",  # Usually in kitchen at 6 PM
#     "actual": "bedroom",
#     "confidence": 0.85,
#     "severity": "low"
# }]
```

**How it works:**
1. Predicts expected location based on learned patterns
2. Compares with actual location
3. If mismatch and confidence > 70%, flags as anomaly

---

## 2. Context Awareness System

**File:** `src/core/context_awareness.py`

### What It Does

Maintains a comprehensive understanding of the current situation across time and space. It tracks what's happening, where, when, and with whom.

### How It Works

#### Temporal Context (Time-based)

```python
# Every event is recorded with timestamp
context_awareness.update_temporal_context(
    event_type="face_detected",
    data={"person": "John", "location": "kitchen"},
    timestamp=datetime.utcnow()
)
```

**What it stores:**
- Last 30 minutes of events (configurable window)
- Event type, data, and timestamp
- Automatically removes old events outside window

**Use cases:**
- "What happened in the last 10 minutes?"
- "Did John enter the kitchen recently?"
- Track event sequences

#### Spatial Context (Room-based)

```python
# Update what's happening in a room
context_awareness.update_spatial_context("kitchen", {
    "people_present": ["John", "Jane"],
    "activity": "cooking",
    "lighting": "bright",
    "objects": ["keys", "phone"]
})
```

**What it tracks per room:**
- Who is currently present
- Current activity level
- Lighting conditions
- Objects in room
- Last update time (detects stale data)

#### Person Context (Individual)

```python
# Track individual person's context
context_awareness.update_person_context("person_John", {
    "current_location": "kitchen",
    "last_seen": datetime.utcnow(),
    "recent_locations": ["bedroom", "hallway", "kitchen"],
    "current_activity": "cooking"
})
```

**What it tracks per person:**
- Current location
- Recent location history
- Current activity
- Last seen timestamp
- Mood indicators (future enhancement)

#### Global Context

```python
# System-wide context
context_awareness.update_global_context(
    time_of_day=18,  # 6 PM
    day_of_week=0,   # Monday
    time_period="evening",
    household_state="normal"
)
```

**Tracks:**
- Time of day, day of week
- Time period (morning/afternoon/evening/night)
- Household state (normal/guest_mode/privacy_mode)
- Weather (future: API integration)

#### Intent Inference

```python
# Infer what person is trying to do
intent = context_awareness.infer_intent(
    person_id="person_John",
    current_action="searching",
    location="kitchen"
)
# Returns: {
#     "confidence": 0.7,
#     "possible_intents": [{
#         "intent": "find_object",
#         "confidence": 0.7,
#         "reason": "Person appears to be searching"
#     }],
#     "context_factors": ["Room activity: cooking"]
# }
```

**How it works:**
1. Analyzes person's recent actions
2. Checks room context
3. Looks at recent events
4. Infers most likely intent with confidence score

---

## 3. Predictive Analyzer

**File:** `src/core/predictive_analyzer.py`

### What It Does

Uses pattern learning and context awareness to predict future actions and generate proactive suggestions.

### How It Works

#### Predicting Next Actions

```python
# Predict what person will do in next 60 minutes
predictions = predictive_analyzer.predict_next_actions(
    person_id="person_John",
    time_horizon_minutes=60
)
# Returns: {
#     "person_id": "person_John",
#     "predictions": [
#         {
#             "type": "location_change",
#             "predicted_location": "living_room",
#             "confidence": 0.85,
#             "time_horizon_minutes": 60
#         },
#         {
#             "type": "activity",
#             "predicted_activity": "entertainment",
#             "confidence": 0.6
#         }
#     ]
# }
```

**How it predicts:**
1. Uses pattern learner to predict location based on time
2. Uses context to predict activity based on location + time
3. Combines multiple predictions with confidence scores

#### Activity Prediction

The system has built-in activity patterns:

```python
activity_patterns = {
    "kitchen": {
        (6, 9): "breakfast",      # 6-9 AM
        (12, 14): "lunch",        # 12-2 PM
        (17, 20): "dinner",       # 5-8 PM
        (20, 23): "snack"         # 8-11 PM
    },
    "bedroom": {
        (22, 7): "sleeping",      # 10 PM - 7 AM
        (7, 9): "getting_ready",  # 7-9 AM
        (20, 22): "relaxing"      # 8-10 PM
    },
    "office": {
        (9, 17): "working",       # 9 AM - 5 PM
        (17, 20): "personal_tasks" # 5-8 PM
    }
}
```

#### Generating Proactive Suggestions

```python
# Generate helpful suggestions
suggestions = predictive_analyzer.generate_proactive_suggestions("person_John")
# Returns: [
#     {
#         "type": "location_preparation",
#         "message": "You might be heading to living_room soon",
#         "confidence": 0.85,
#         "action": "prepare_for_location_change",
#         "target_location": "living_room"
#     },
#     {
#         "type": "item_reminder",
#         "message": "For entertainment, you might need: remote, snacks",
#         "confidence": 0.6,
#         "items": ["remote", "snacks"]
#     }
# ]
```

**Types of suggestions:**
1. **Location preparation**: "You might be heading to kitchen soon"
2. **Item reminders**: "For dinner, you might need: utensils, plates"
3. **Anomaly alerts**: "Unusual activity detected: unexpected location"

**How it generates:**
1. Predicts next location/activity
2. Checks for anomalies
3. Suggests items needed for predicted activity
4. Provides helpful reminders

#### Object Need Prediction

```python
# Predict what objects person might need
needs = predictive_analyzer.predict_object_need(
    person_id="person_John",
    context={"location": "kitchen", "activity": "cooking"}
)
# Returns: [{
#     "object": "utensils",
#     "confidence": 0.8,
#     "reason": "Cooking activity in kitchen"
# }]
```

---

## 4. Appearance Tracking Feature

**File:** `src/features/appearance_tracking_feature.py`

### What It Does

Tracks people by their appearance (clothing, height, body features) to enable re-identification across different cameras or when face recognition fails.

### How It Works

#### Extracting Appearance Features

When a person is detected, the system extracts:

1. **Color Histogram** (dominant clothing colors)
   ```python
   # Converts body region to HSV color space
   # Calculates histograms for Hue, Saturation, Value
   # Finds dominant colors
   ```

2. **Height Estimation** (pixel-based)
   ```python
   # Estimates person height from face to body bottom
   # Useful for distinguishing people of different heights
   ```

3. **Texture Features** (clothing texture)
   ```python
   # Calculates texture variance (smooth vs textured)
   # Calculates edge density (patterns, stripes, etc.)
   ```

#### Building Appearance Profiles

```python
# Each time person is seen, appearance is recorded
appearance_profiles = {
    "John": [
        {
            "appearance": {
                "color_histogram": {"hue": 120, "saturation": 200, "value": 150},
                "estimated_height": 1800,  # pixels
                "texture_features": {"variance": 500, "edge_density": 0.3}
            },
            "camera_id": "camera_1",
            "timestamp": "2024-01-15T18:00:00"
        }
    ]
}
```

#### Matching Appearances

```python
# When unknown person is detected, match to known profiles
matches = appearance_tracker.match_appearance(
    appearance=new_appearance,
    threshold=0.7  # 70% similarity
)
# Returns: [{
#     "person": "John",
#     "similarity": 0.85,
#     "timestamp": "2024-01-15T18:00:00",
#     "camera_id": "camera_1"
# }]
```

**Similarity calculation:**
- **Color similarity** (50% weight): Compares dominant colors
- **Height similarity** (30% weight): Compares estimated heights
- **Texture similarity** (20% weight): Compares texture features
- **Final score**: Weighted average (0-1)

**Use cases:**
- Re-identify person when face is not visible
- Track person across multiple cameras
- Handle face recognition failures

---

## 5. Enhanced Spatial Memory

**File:** `src/features/spatial_memory_feature.py`

### What It Does

Tracks where people and objects are located across rooms, with natural language query support.

### How It Works

#### Tracking People Locations

```python
# When person is recognized, location is recorded
spatial_memory._handle_person_recognized(event)
# Stores in database:
# - Person ID
# - Room name
# - Timestamp
# - Confidence
```

#### Tracking Object Locations

```python
# When object is detected, location is recorded
spatial_memory._handle_object_detected(event)
# Stores in database:
# - Object name
# - Room name
# - Last seen timestamp
# - Times seen (frequency)
```

#### Room Transitions

```python
# Detects when person moves between rooms
# Checks if transition is plausible:
# - Adjacent rooms (kitchen ↔ living_room)
# - Time proximity (< 10 seconds)
# Emits PERSON_ENTERED event
```

#### Natural Language Queries

```python
# Query spatial memory with natural language
result = engine.query_spatial_memory("Where are my keys?")
# Returns: {
#     "query": "Where are my keys?",
#     "results": [{
#         "object_name": "keys",
#         "room_name": "living_room",
#         "last_seen": "2024-01-15T18:00:00",
#         "times_seen": 5,
#         "confidence": 0.9
#     }],
#     "type": "object_location"
# }
```

**Supported queries:**
- "Where are my keys?"
- "Where is John?"
- "Find my phone"
- "Where did I last see my wallet?"

#### Finding Objects

```python
# Find object in spatial memory
locations = spatial_memory.find_object("keys", room_name="living_room")
# Returns: [{
#     "object_name": "keys",
#     "room_name": "living_room",
#     "last_seen": "2024-01-15T18:00:00",
#     "times_seen": 5,
#     "confidence": 0.9
# }]
```

---

## 6. How Everything Works Together

### Data Flow

```
Frame Captured
    ↓
Face Recognition → Person Identified
    ↓
Context Awareness → Update Person Context
    ↓
Pattern Learner → Learn Behavior Pattern
    ↓
Spatial Memory → Record Location
    ↓
Appearance Tracking → Extract Appearance Features
    ↓
Predictive Analyzer → Generate Predictions
    ↓
Proactive Suggestions → API Endpoints
```

### Integration in Vision Engine

**File:** `src/core/vision_engine.py`

The main `process_frame()` method orchestrates everything:

1. **Frame Processing**: Detects faces, motion, scene
2. **Context Update**: Updates temporal, spatial, person contexts
3. **Pattern Learning**: Learns from each detection
4. **Feature Processing**: All features process the frame
5. **Anomaly Detection**: Checks for unusual behavior
6. **Predictions**: Generates proactive suggestions

### Example: Complete Flow

```python
# 1. Frame captured with John in kitchen at 6 PM
frame = camera.capture_frame()

# 2. Face recognition identifies John
faces = face_engine.recognize_faces(frame)
# Returns: [{"name": "John", "confidence": 0.95}]

# 3. Context awareness updates
context_awareness.update_person_context("person_John", {
    "current_location": "kitchen",
    "last_seen": datetime.utcnow()
})

# 4. Pattern learner learns
pattern_learner.learn_person_pattern(
    "person_John",
    "kitchen",
    timestamp=datetime.utcnow()  # 6 PM
)

# 5. Spatial memory records
spatial_memory._handle_person_recognized(event)
# Stores: John in kitchen at 6 PM

# 6. Predictive analyzer predicts
predictions = predictive_analyzer.predict_next_actions("person_John")
# Predicts: John will move to living_room in 30 minutes

# 7. Generates suggestions
suggestions = predictive_analyzer.generate_proactive_suggestions("person_John")
# Suggests: "You might be heading to living_room soon"
```

---

## 7. API Endpoints

### Intelligence Endpoints

**GET `/api/v1/intelligence/insights`**
- Returns pattern insights, context summary, predictions count

**GET `/api/v1/intelligence/suggestions?person_id=person_John`**
- Returns proactive suggestions for a person

**GET `/api/v1/intelligence/context`**
- Returns current situational awareness state

**POST `/api/v1/spatial/query`**
```json
{
    "query": "Where are my keys?",
    "context": {}
}
```

**POST `/api/v1/guidance/directions`**
```json
{
    "from_room": "bedroom",
    "to_room": "kitchen",
    "target_object": "keys"
}
```

---

## 8. Configuration

All intelligence features can be enabled/disabled in `config/*.yaml`:

```yaml
intelligence:
  pattern_learning_enabled: true
  context_awareness_enabled: true
  predictive_analysis_enabled: true
  anomaly_detection_enabled: true

features:
  spatial_memory: true
  appearance_tracking: true
  visual_guidance: true
```

---

## 9. Benefits

### For Users

1. **Proactive Assistance**: System anticipates needs
2. **Object Finding**: "Where are my keys?" queries
3. **Navigation Help**: Directions between rooms
4. **Anomaly Alerts**: Unusual behavior detection
5. **Context Awareness**: System understands situation

### For System

1. **Cost Optimization**: Predicts when API calls needed
2. **Better Accuracy**: Context improves predictions
3. **Multi-camera Tracking**: Appearance tracking across cameras
4. **Learning**: System gets smarter over time
5. **Proactive**: Anticipates needs before asked

---

## 10. Future Enhancements

Potential improvements:
- Machine learning models for better predictions
- Weather API integration for context
- Voice integration for natural language queries
- Mobile app for proactive notifications
- Advanced anomaly detection with ML
- Multi-person activity recognition

---

## Summary

The intelligence features transform the Vision Engine from a reactive system into a **proactive, learning, context-aware assistant** that:

- **Learns** from behavior patterns
- **Understands** current context
- **Predicts** future actions
- **Suggests** helpful actions
- **Tracks** people and objects
- **Assists** with navigation and finding

All features work together seamlessly to provide a truly intelligent home vision system.

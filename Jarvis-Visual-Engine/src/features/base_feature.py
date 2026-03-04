"""Base feature class for modular features"""
from abc import ABC, abstractmethod
from typing import Dict, Optional, Any
import numpy as np
import logging

from src.core.event_bus import EventBus, EventType, Event

logger = logging.getLogger(__name__)


class BaseFeature(ABC):
    """Abstract base class for all Vision Engine features"""
    
    def __init__(self, name: str, event_bus: EventBus, enabled: bool = True):
        """
        Initialize feature
        
        Args:
            name: Feature name
            event_bus: Event bus for pub/sub
            enabled: Whether feature is enabled
        """
        self.name = name
        self.event_bus = event_bus
        self.enabled = enabled
        self.stats = {
            "events_processed": 0,
            "errors": 0,
            "last_processed": None
        }
        self._setup_event_handlers()
    
    def _setup_event_handlers(self):
        """Setup event handlers - override in subclasses"""
        pass
    
    @abstractmethod
    def initialize(self):
        """Initialize feature - called once at startup"""
        pass
    
    @abstractmethod
    def process(self, frame: np.ndarray, context: Dict[str, Any]) -> Optional[Dict]:
        """
        Process frame
        
        Args:
            frame: Input frame
            context: Context information (camera_id, room_name, etc.)
        
        Returns:
            Processing result or None
        """
        pass
    
    @abstractmethod
    def cleanup(self):
        """Cleanup feature - called on shutdown"""
        pass
    
    def get_stats(self) -> Dict:
        """Get feature statistics"""
        return {
            "name": self.name,
            "enabled": self.enabled,
            **self.stats
        }
    
    def enable(self):
        """Enable feature"""
        self.enabled = True
        logger.info(f"Feature {self.name} enabled")
    
    def disable(self):
        """Disable feature"""
        self.enabled = False
        logger.info(f"Feature {self.name} disabled")
    
    async def _handle_event(self, event: Event):
        """Handle event from event bus"""
        if not self.enabled:
            return
        
        try:
            self.stats["events_processed"] += 1
            self.stats["last_processed"] = event.timestamp.isoformat()
            await self.on_event(event)
        except Exception as e:
            self.stats["errors"] += 1
            logger.error(f"Error in feature {self.name} handling event: {e}")
    
    async def on_event(self, event: Event):
        """Handle specific event - override in subclasses"""
        pass
    
    def emit_event(self, event_type: EventType, camera_id: str, data: Dict):
        """Emit event to event bus"""
        from datetime import datetime
        event = Event(
            event_type=event_type,
            timestamp=datetime.utcnow(),
            camera_id=camera_id,
            data=data
        )
        # Note: This should be awaited in async context
        import asyncio
        if asyncio.iscoroutinefunction(self.event_bus.emit):
            asyncio.create_task(self.event_bus.emit(event))
        else:
            asyncio.run(self.event_bus.emit(event))

"""
Wearable device integration for health memory system.

This module provides integration with wearable devices for automatic
health data collection and synchronization.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional

from smart_health_alerts import SmartHealthMemory


class WearableDevice:
    """
    Represents a wearable health device.

    Attributes:
        device_id: Unique identifier for the device
        device_type: Type of device (fitness_tracker, smartwatch, etc.)
        device_name: Human-readable device name
        last_sync: Last synchronization timestamp
    """

    def __init__(
        self, device_id: str, device_type: str, device_name: str
    ) -> None:
        """
        Initialize wearable device.

        Args:
            device_id: Unique identifier for the device
            device_type: Type of device
            device_name: Human-readable device name
        """
        self.device_id: str = device_id
        self.device_type: str = device_type
        self.device_name: str = device_name
        self.last_sync: Optional[datetime] = None


class WearableHealthMemory(SmartHealthMemory):
    """
    Health memory with wearable device integration.

    Features:
    - Automatic data sync from wearable devices
    - Heart rate monitoring
    - Step count tracking
    - Sleep pattern analysis
    - Activity level tracking
    - Device management

    Attributes:
        devices: Dictionary mapping device_id to WearableDevice
        sync_enabled: Whether automatic sync is enabled
    """

    def __init__(self, user_id: str, is_primary_caregiver: bool = False) -> None:
        """
        Initialize with wearable device support.

        Args:
            user_id: Unique identifier for this person
            is_primary_caregiver: Whether this user is a primary caregiver
        """
        super().__init__(user_id, is_primary_caregiver)
        self.devices: Dict[str, WearableDevice] = {}
        self.sync_enabled: bool = True

    def register_device(
        self, device_id: str, device_type: str, device_name: str
    ) -> bool:
        """
        Register a wearable device.

        Args:
            device_id: Unique identifier for the device
            device_type: Type of device
            device_name: Human-readable device name

        Returns:
            True if registered successfully, False otherwise
        """
        device: WearableDevice = WearableDevice(device_id, device_type, device_name)
        self.devices[device_id] = device
        return True

    def sync_device_data(
        self,
        device_id: str,
        heart_rate: Optional[int] = None,
        steps: Optional[int] = None,
        sleep_hours: Optional[float] = None,
        calories_burned: Optional[int] = None,
        activity_level: Optional[str] = None,
    ) -> bool:
        """
        Sync data from wearable device.

        Args:
            device_id: Device identifier
            heart_rate: Current heart rate (bpm)
            steps: Steps taken today
            sleep_hours: Hours of sleep last night
            calories_burned: Calories burned today
            activity_level: Activity level (low, moderate, high)

        Returns:
            True if synced successfully, False otherwise
        """
        if device_id not in self.devices:
            return False

        device: WearableDevice = self.devices[device_id]
        device.last_sync = datetime.now()

        # Log heart rate if provided
        if heart_rate is not None:
            self.log_symptom(
                f"Heart rate: {heart_rate} bpm",
                severity=self._heart_rate_severity(heart_rate),
                notes=f"From {device.device_name}",
            )

        # Log steps as exercise
        if steps is not None and steps > 0:
            intensity = self._steps_to_intensity(steps)
            self.log_exercise(
                f"Walking ({device.device_name})", steps // 20, intensity
            )

        # Log sleep
        if sleep_hours is not None:
            sleep_quality = self._sleep_quality(sleep_hours)
            self.ingest(
                text=f"Sleep: {sleep_hours:.1f} hours (quality: {sleep_quality})",
                emotion="neutral",
                context="health:sleep",
                save_immediately=True,
            )

        # Log calories
        if calories_burned is not None:
            self.ingest(
                text=f"Calories burned: {calories_burned} kcal",
                emotion="good",
                context="health:activity",
                save_immediately=True,
            )

        return True

    def _heart_rate_severity(self, heart_rate: int) -> int:
        """
        Convert heart rate to severity score.

        Args:
            heart_rate: Heart rate in bpm

        Returns:
            Severity score (1-10)
        """
        if heart_rate < 60:
            return 5  # Low heart rate
        elif heart_rate > 100:
            return 6  # Elevated heart rate
        elif heart_rate > 120:
            return 7  # High heart rate
        else:
            return 2  # Normal

    def _steps_to_intensity(self, steps: int) -> str:
        """
        Convert step count to intensity level.

        Args:
            steps: Number of steps

        Returns:
            Intensity level (low, moderate, high)
        """
        if steps < 5000:
            return "low"
        elif steps < 10000:
            return "moderate"
        else:
            return "high"

    def _sleep_quality(self, hours: float) -> str:
        """
        Assess sleep quality based on hours.

        Args:
            hours: Hours of sleep

        Returns:
            Sleep quality assessment
        """
        if hours < 5:
            return "poor"
        elif hours < 7:
            return "fair"
        elif hours <= 9:
            return "good"
        else:
            return "excessive"

    def get_device_stats(self, device_id: str) -> Optional[Dict]:
        """
        Get statistics for a device.

        Args:
            device_id: Device identifier

        Returns:
            Dictionary with device statistics, None if device not found
        """
        if device_id not in self.devices:
            return None

        device: WearableDevice = self.devices[device_id]

        return {
            "device_id": device_id,
            "device_type": device.device_type,
            "device_name": device.device_name,
            "last_sync": device.last_sync.isoformat() if device.last_sync else None,
            "registered": True,
        }

    def list_devices(self) -> List[Dict]:
        """
        List all registered devices.

        Returns:
            List of device information dictionaries
        """
        return [
            self.get_device_stats(device_id) for device_id in self.devices.keys()
        ]

    def remove_device(self, device_id: str) -> bool:
        """
        Remove a registered device.

        Args:
            device_id: Device identifier

        Returns:
            True if removed successfully, False otherwise
        """
        if device_id in self.devices:
            del self.devices[device_id]
            return True
        return False

    def auto_sync_enabled(self) -> bool:
        """
        Check if automatic sync is enabled.

        Returns:
            True if auto-sync is enabled
        """
        return self.sync_enabled

    def enable_auto_sync(self) -> None:
        """Enable automatic device synchronization."""
        self.sync_enabled = True

    def disable_auto_sync(self) -> None:
        """Disable automatic device synchronization."""
        self.sync_enabled = False

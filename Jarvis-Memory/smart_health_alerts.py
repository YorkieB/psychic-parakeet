"""
Smart health alerts and reminders.

This module provides SmartHealthMemory class with intelligent
alerting and reminder capabilities.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional

from family_health_memory import FamilyHealthMemory


class AlertType(Enum):
    """Types of health alerts."""

    MEDICATION_REMINDER = "medication_reminder"
    APPOINTMENT_UPCOMING = "appointment_upcoming"
    REFILL_PRESCRIPTION = "refill_prescription"
    PATTERN_DETECTED = "pattern_detected"
    ANNUAL_CHECKUP_DUE = "annual_checkup_due"
    VACCINATION_NEEDED = "vaccination_needed"
    SYMPTOM_ALERT = "symptom_alert"


@dataclass
class Alert:
    """
    Health alert with priority and acknowledgment.

    Attributes:
        alert_type: Type of alert
        message: Alert message text
        priority: Priority level (low, normal, high, critical)
        created_at: When alert was created
        acknowledged: Whether alert has been acknowledged
    """

    alert_type: AlertType
    message: str
    priority: str = "normal"
    created_at: datetime = field(default_factory=datetime.now)
    acknowledged: bool = False

    def __repr__(self) -> str:
        """String representation of alert."""
        emoji_map: Dict[str, str] = {
            "low": "[INFO]",
            "normal": "[INFO]",
            "high": "[WARN]",
            "critical": "[CRITICAL]",
        }
        emoji: str = emoji_map.get(self.priority, "[INFO]")
        return f"{emoji} [{self.priority.upper()}] {self.message}"


class SmartHealthMemory(FamilyHealthMemory):
    """
    Health memory with smart alerts and reminders.

    Features:
    - Medication reminders (daily, scheduled)
    - Prescription refill alerts
    - Appointment reminders
    - Annual checkup tracking
    - Symptom pattern detection
    - Vaccination booster scheduling
    - Critical symptom alerts

    Attributes:
        alerts: List of active alerts
        medication_schedule: Dictionary mapping medication to schedule info
        appointments: Dictionary mapping doctor to appointment info
    """

    def __init__(self, user_id: str, is_primary_caregiver: bool = False) -> None:
        """
        Initialize with alert system.

        Args:
            user_id: Unique identifier for this person
            is_primary_caregiver: Whether this user is a primary caregiver
        """
        super().__init__(user_id, is_primary_caregiver)
        self.alerts: List[Alert] = []
        self.medication_schedule: Dict[str, Dict] = {}
        self.appointments: Dict[str, Dict] = {}

    # ========== MEDICATION ALERTS ==========

    def schedule_medication(
        self,
        medication_name: str,
        dosage: str,
        frequency: str,
        start_date: Optional[datetime] = None,
    ) -> None:
        """
        Schedule medication with automatic reminders.

        Args:
            medication_name: Name of medication
            dosage: Dosage amount
            frequency: How often to take
            start_date: When to start (default: now)
        """
        start: datetime = start_date or datetime.now()

        self.medication_schedule[medication_name] = {
            "dosage": dosage,
            "frequency": frequency,
            "start_date": start,
        }

        alert: Alert = Alert(
            AlertType.MEDICATION_REMINDER,
            f"[MED] Take {medication_name} {dosage} - {frequency}",
            priority="high",
        )
        self.alerts.append(alert)

    def set_refill_reminder(
        self, medication_name: str, days_supply: int, refill_days_before: int = 7
    ) -> None:
        """
        Remind to refill prescription before it runs out.

        Args:
            medication_name: Name of medication
            days_supply: Days of supply remaining
            refill_days_before: Days before running out to remind (default: 7)
        """
        alert: Alert = Alert(
            AlertType.REFILL_PRESCRIPTION,
            f"[MED] Refill {medication_name} (runs out in {refill_days_before} days)",
            priority="normal",
        )
        self.alerts.append(alert)

    # ========== APPOINTMENT ALERTS ==========

    def schedule_appointment(
        self,
        doctor_name: str,
        reason: str,
        appointment_date: datetime,
        reminder_days_before: int = 3,
    ) -> None:
        """
        Schedule appointment with reminder.

        Args:
            doctor_name: Name of doctor or specialty
            reason: Reason for appointment
            appointment_date: When appointment is scheduled
            reminder_days_before: Days before to remind (default: 3)
        """
        self.appointments[doctor_name] = {
            "reason": reason,
            "date": appointment_date,
            "reminder_days": reminder_days_before,
        }

        alert: Alert = Alert(
            AlertType.APPOINTMENT_UPCOMING,
            f"[APPT] {doctor_name} appointment in {reminder_days_before} days ({reason})",
            priority="high",
        )
        self.alerts.append(alert)

    def get_upcoming_appointments(self) -> List[Dict]:
        """
        Get all upcoming appointments.

        Returns:
            List of dictionaries with appointment information
        """
        upcoming: List[Dict] = []
        now: datetime = datetime.now()

        for doctor, appt_info in self.appointments.items():
            days_until: int = (appt_info["date"] - now).days
            if days_until >= 0:
                upcoming.append(
                    {
                        "doctor": doctor,
                        "reason": appt_info["reason"],
                        "date": appt_info["date"],
                        "days_until": days_until,
                    }
                )

        return sorted(upcoming, key=lambda x: x["days_until"])

    # ========== PATTERN DETECTION ==========

    def analyze_symptom_patterns(self) -> List[Alert]:
        """
        Detect recurring symptoms and create alerts.

        Returns:
            List of pattern detection alerts
        """
        pattern_alerts: List[Alert] = []
        recurring: Dict[str, int] = self.detect_recurring_symptoms()

        for symptom, count in recurring.items():
            if count >= 3:
                alert: Alert = Alert(
                    AlertType.PATTERN_DETECTED,
                    f"[WARN] PATTERN: {symptom} recurring ({count} times)",
                    priority="high",
                )
                pattern_alerts.append(alert)
                self.alerts.append(alert)

        return pattern_alerts

    # ========== ALERT MANAGEMENT ==========

    def get_all_alerts(self, priority_filter: Optional[str] = None) -> List[Alert]:
        """
        Get all active alerts, optionally filtered by priority.

        Args:
            priority_filter: Optional priority level to filter by

        Returns:
            List of active alerts
        """
        alerts: List[Alert] = [a for a in self.alerts if not a.acknowledged]

        if priority_filter:
            alerts = [a for a in alerts if a.priority == priority_filter]

        return alerts

    def get_priority_alerts(self) -> List[Alert]:
        """
        Get high priority and critical alerts.

        Returns:
            List of high/critical priority alerts
        """
        return [
            a
            for a in self.alerts
            if a.priority in ["high", "critical"] and not a.acknowledged
        ]

    def acknowledge_alert(self, alert_index: int) -> bool:
        """
        Mark alert as acknowledged.

        Args:
            alert_index: Index of alert in alerts list

        Returns:
            True if acknowledged successfully, False otherwise
        """
        if 0 <= alert_index < len(self.alerts):
            self.alerts[alert_index].acknowledged = True
            return True
        return False

    # ========== DASHBOARD ==========

    def get_today_summary(self) -> Dict:
        """
        Get today's health summary.

        Returns:
            Dictionary containing today's health information
        """
        meds_today: List[Dict] = [
            {
                "medication": name,
                "dosage": info["dosage"],
                "frequency": info["frequency"],
            }
            for name, info in self.medication_schedule.items()
        ]

        return {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "medications_today": meds_today,
            "alerts": [str(a) for a in self.get_all_alerts()],
            "upcoming_appointments": self.get_upcoming_appointments(),
        }

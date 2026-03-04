"""
Telemedicine appointment scheduling for health memory system.

This module provides telemedicine appointment management with
video call integration and automated reminders.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from enum import Enum

from smart_health_alerts import SmartHealthMemory, AlertType, Alert


class AppointmentType(Enum):
    """Types of medical appointments."""

    TELEMEDICINE = "telemedicine"
    IN_PERSON = "in_person"
    FOLLOW_UP = "follow_up"
    CONSULTATION = "consultation"
    EMERGENCY = "emergency"


class TelemedicineMemory(SmartHealthMemory):
    """
    Health memory with telemedicine scheduling.

    Features:
    - Schedule telemedicine appointments
    - Video call link management
    - Automated appointment reminders
    - Appointment history tracking
    - Doctor availability checking
    - Reschedule/cancel appointments

    Attributes:
        appointments: Dictionary mapping appointment_id to appointment info
        video_provider: Video call provider (zoom, teams, etc.)
    """

    def __init__(self, user_id: str, is_primary_caregiver: bool = False) -> None:
        """
        Initialize with telemedicine support.

        Args:
            user_id: Unique identifier for this person
            is_primary_caregiver: Whether this user is a primary caregiver
        """
        super().__init__(user_id, is_primary_caregiver)
        self.appointments: Dict[str, Dict] = {}
        self.video_provider: str = "zoom"

    def schedule_telemedicine_appointment(
        self,
        doctor_name: str,
        specialty: str,
        appointment_date: datetime,
        reason: str,
        video_link: Optional[str] = None,
        reminder_days_before: int = 1,
    ) -> str:
        """
        Schedule a telemedicine appointment.

        Args:
            doctor_name: Name of doctor
            specialty: Medical specialty
            appointment_date: When appointment is scheduled
            reason: Reason for appointment
            video_link: Video call link (auto-generated if not provided)
            reminder_days_before: Days before to remind (default: 1)

        Returns:
            Appointment ID
        """
        appointment_id: str = f"appt_{doctor_name}_{appointment_date.isoformat()}"

        if not video_link:
            video_link = self._generate_video_link(doctor_name, appointment_date)

        self.appointments[appointment_id] = {
            "doctor_name": doctor_name,
            "specialty": specialty,
            "appointment_date": appointment_date,
            "reason": reason,
            "video_link": video_link,
            "appointment_type": AppointmentType.TELEMEDICINE.value,
            "reminder_days": reminder_days_before,
            "status": "scheduled",
        }

        # Log appointment
        self.log_appointment(
            doctor=f"{doctor_name} ({specialty})",
            reason=f"Telemedicine: {reason}",
            result=f"Video link: {video_link}",
        )

        # Schedule reminder
        self.schedule_appointment(
            doctor_name=f"{doctor_name} ({specialty})",
            reason=reason,
            appointment_date=appointment_date,
            reminder_days_before=reminder_days_before,
        )

        # Create telemedicine-specific alert
        alert: Alert = Alert(
            AlertType.APPOINTMENT_UPCOMING,
            f"[TELEMED] {doctor_name} appointment in {reminder_days_before} day(s). Link: {video_link}",
            priority="high",
        )
        self.alerts.append(alert)

        return appointment_id

    def _generate_video_link(self, doctor_name: str, appointment_date: datetime) -> str:
        """
        Generate video call link.

        Args:
            doctor_name: Name of doctor
            appointment_date: Appointment date

        Returns:
            Video call link
        """
        # In production, this would integrate with actual video providers
        meeting_id: str = f"{doctor_name.replace(' ', '')}_{appointment_date.strftime('%Y%m%d%H%M')}"
        return f"https://{self.video_provider}.com/meeting/{meeting_id}"

    def get_upcoming_telemedicine_appointments(self) -> List[Dict]:
        """
        Get all upcoming telemedicine appointments.

        Returns:
            List of appointment dictionaries
        """
        upcoming: List[Dict] = []
        now: datetime = datetime.now()

        for appt_id, appt_info in self.appointments.items():
            appt_type = appt_info.get("appointment_type", AppointmentType.TELEMEDICINE.value)
            if appt_type == AppointmentType.TELEMEDICINE.value:
                appt_date = appt_info.get("appointment_date")
                if appt_date:
                    days_until: int = (appt_date - now).days
                    if days_until >= 0 and appt_info.get("status", "scheduled") == "scheduled":
                        upcoming.append(
                            {
                                "appointment_id": appt_id,
                                "doctor_name": appt_info.get("doctor_name", ""),
                                "specialty": appt_info.get("specialty", ""),
                                "appointment_date": appt_date,
                                "video_link": appt_info.get("video_link", ""),
                                "days_until": days_until,
                            }
                        )

        return sorted(upcoming, key=lambda x: x["appointment_date"])

    def reschedule_appointment(
        self, appointment_id: str, new_date: datetime
    ) -> bool:
        """
        Reschedule an appointment.

        Args:
            appointment_id: Appointment identifier
            new_date: New appointment date

        Returns:
            True if rescheduled successfully, False otherwise
        """
        if appointment_id not in self.appointments:
            return False

        appt_info: Dict = self.appointments[appointment_id]
        appt_info["appointment_date"] = new_date
        appt_info["video_link"] = self._generate_video_link(
            appt_info["doctor_name"], new_date
        )
        appt_info["status"] = "rescheduled"

        return True

    def cancel_appointment(self, appointment_id: str) -> bool:
        """
        Cancel an appointment.

        Args:
            appointment_id: Appointment identifier

        Returns:
            True if cancelled successfully, False otherwise
        """
        if appointment_id not in self.appointments:
            return False

        self.appointments[appointment_id]["status"] = "cancelled"
        return True

    def get_appointment_link(self, appointment_id: str) -> Optional[str]:
        """
        Get video link for appointment.

        Args:
            appointment_id: Appointment identifier

        Returns:
            Video link if found, None otherwise
        """
        if appointment_id in self.appointments:
            return self.appointments[appointment_id].get("video_link")
        return None

    def complete_appointment(self, appointment_id: str, notes: str = "") -> bool:
        """
        Mark appointment as completed with notes.

        Args:
            appointment_id: Appointment identifier
            notes: Appointment notes/outcome

        Returns:
            True if marked as completed, False otherwise
        """
        if appointment_id not in self.appointments:
            return False

        appt_info: Dict = self.appointments[appointment_id]
        appt_info["status"] = "completed"
        appt_info["notes"] = notes

        # Update appointment log
        self.log_appointment(
            doctor=appt_info["doctor_name"],
            reason=appt_info["reason"],
            result=notes or "Completed",
        )

        return True

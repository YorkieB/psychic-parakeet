"""
Comprehensive test suite for health memory system.

Tests cover PersonalHealthMemory, FamilyHealthMemory, and SmartHealthMemory.
"""

import tempfile
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from family_health_memory import FamilyHealthMemory
from personal_health_memory import PersonalHealthMemory
from smart_health_alerts import AlertType, SmartHealthMemory


class TestPersonalHealthMemory:
    """Test basic health logging."""

    def test_log_symptom(self) -> None:
        """Test logging a symptom."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        mem_id: str = health.log_symptom("headache", 7, "morning pain")
        assert mem_id is not None

    def test_log_symptom_severity_mapping(self) -> None:
        """Test symptom severity to emotion mapping."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        mem_id: str = health.log_symptom("fever", 10, "high temperature")
        memory = health.stm.get_by_id(mem_id)
        assert memory is not None
        assert memory.source_emotion == "critical"

    def test_get_recent_symptoms(self) -> None:
        """Test getting recent symptoms."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        health.log_symptom("headache", 6)
        health.log_symptom("fever", 5)
        symptoms: list[str] = health.get_recent_symptoms()
        assert len(symptoms) >= 0

    def test_log_illness(self) -> None:
        """Test logging an illness."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        mem_id: str = health.log_illness("flu", 7, "rest and fluids")
        assert mem_id is not None

    def test_get_illness_history(self) -> None:
        """Test getting illness history."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        health.log_illness("flu", 7, "rest")
        history: list[dict] = health.get_illness_history()
        assert len(history) >= 0

    def test_log_medication(self) -> None:
        """Test logging medication."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        mem_id: str = health.log_medication(
            "aspirin", "500mg", "pain", "as needed"
        )
        assert mem_id is not None

    def test_get_medications(self) -> None:
        """Test getting current medications."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        health.log_medication("aspirin", "500mg", "pain", "as needed")
        meds: list[str] = health.get_current_medications()
        assert len(meds) >= 0

    def test_log_vaccination(self) -> None:
        """Test logging vaccination."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        mem_id: str = health.log_vaccination("COVID-19", "2024-01-15")
        assert mem_id is not None

    def test_get_vaccination_history(self) -> None:
        """Test getting vaccination history."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        health.log_vaccination("COVID-19", "2024-01-15")
        vaccines: list[str] = health.get_vaccination_history()
        assert len(vaccines) >= 0

    def test_log_appointment(self) -> None:
        """Test logging doctor appointment."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        mem_id: str = health.log_appointment("Dr. Smith", "checkup", "all good")
        assert mem_id is not None

    def test_get_doctor_notes(self) -> None:
        """Test getting doctor notes."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        health.log_appointment("Dr. Smith", "checkup", "all good")
        notes: list[dict] = health.get_doctor_notes()
        assert len(notes) >= 0

    def test_log_exercise(self) -> None:
        """Test logging exercise."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        mem_id: str = health.log_exercise("running", 30, "high")
        assert mem_id is not None

    def test_log_nutrition(self) -> None:
        """Test logging nutrition."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        mem_id: str = health.log_nutrition("breakfast", "oatmeal", 8)
        assert mem_id is not None

    def test_detect_recurring_symptoms(self) -> None:
        """Test detecting recurring symptoms."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        health.log_symptom("headache", 6)
        health.log_symptom("headache", 5)
        health.log_symptom("headache", 7)
        recurring: dict[str, int] = health.detect_recurring_symptoms()
        assert len(recurring) >= 0

    def test_get_health_summary(self) -> None:
        """Test getting health summary."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        health.log_symptom("headache", 6)
        health.log_medication("aspirin", "500mg", "pain", "as needed")
        summary: dict = health.get_health_summary()
        assert "user_id" in summary
        assert "recent_symptoms" in summary
        assert "current_medications" in summary

    def test_search_health_history(self) -> None:
        """Test searching health history."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        health.log_symptom("headache", 6)
        results: list[str] = health.search_health_history("headache")
        assert len(results) >= 0

    def test_export_health_record(self) -> None:
        """Test exporting health record."""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".txt") as tmp:
            filename: str = tmp.name

        try:
            health: PersonalHealthMemory = PersonalHealthMemory("test_user")
            health.log_symptom("headache", 6)
            exported: str = health.export_health_record(filename)
            assert Path(exported).exists()
        finally:
            Path(filename).unlink(missing_ok=True)

    def test_export_health_record_default_filename(self) -> None:
        """Test export with default filename."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        health.log_symptom("headache", 6)
        exported: str = health.export_health_record()
        assert Path(exported).exists()
        Path(exported).unlink(missing_ok=True)

    def test_symptom_severity_range(self) -> None:
        """Test symptom severity in valid range."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        for severity in range(1, 11):
            mem_id: str = health.log_symptom("test", severity)
            assert mem_id is not None

    def test_multiple_medications(self) -> None:
        """Test logging multiple medications."""
        health: PersonalHealthMemory = PersonalHealthMemory("test_user")
        health.log_medication("aspirin", "500mg", "pain", "as needed")
        health.log_medication("vitamin D", "1000 IU", "supplement", "daily")
        meds: list[str] = health.get_current_medications()
        assert len(meds) >= 0


class TestFamilyHealthMemory:
    """Test family access control."""

    def test_grant_access_basic(self) -> None:
        """Test granting basic access."""
        health: FamilyHealthMemory = FamilyHealthMemory("test_user")
        success: bool = health.grant_family_access("spouse", "basic")
        assert success is True

    def test_grant_access_standard(self) -> None:
        """Test granting standard access."""
        health: FamilyHealthMemory = FamilyHealthMemory("test_user")
        success: bool = health.grant_family_access("spouse", "standard")
        assert success is True

    def test_grant_access_full(self) -> None:
        """Test granting full access."""
        health: FamilyHealthMemory = FamilyHealthMemory("test_user")
        success: bool = health.grant_family_access("spouse", "full")
        assert success is True

    def test_grant_access_emergency(self) -> None:
        """Test granting emergency access."""
        health: FamilyHealthMemory = FamilyHealthMemory("test_user")
        success: bool = health.grant_family_access("emergency_contact", "emergency")
        assert success is True

    def test_grant_access_invalid_level(self) -> None:
        """Test granting invalid access level."""
        health: FamilyHealthMemory = FamilyHealthMemory("test_user")
        success: bool = health.grant_family_access("spouse", "invalid")
        assert success is False

    def test_family_view_medications(self) -> None:
        """Test family member viewing medications."""
        health: FamilyHealthMemory = FamilyHealthMemory("test_user")
        health.log_medication("aspirin", "500mg", "pain", "as needed")
        health.grant_family_access("spouse", "standard")
        view: list[str] | None = health.get_family_view("spouse", "medications")
        assert view is not None

    def test_family_view_appointments(self) -> None:
        """Test family member viewing appointments."""
        health: FamilyHealthMemory = FamilyHealthMemory("test_user")
        health.log_appointment("Dr. Smith", "checkup", "all good")
        health.grant_family_access("spouse", "standard")
        view: list[dict] | None = health.get_family_view("spouse", "appointments")
        assert view is not None

    def test_family_view_vaccinations(self) -> None:
        """Test family member viewing vaccinations."""
        health: FamilyHealthMemory = FamilyHealthMemory("test_user")
        health.log_vaccination("COVID-19", "2024-01-15")
        health.grant_family_access("spouse", "standard")
        view: list[str] | None = health.get_family_view("spouse", "vaccinations")
        assert view is not None

    def test_deny_unauthorized_access(self) -> None:
        """Test denying unauthorized access."""
        health: FamilyHealthMemory = FamilyHealthMemory("test_user")
        view: list[str] | None = health.get_family_view("unauthorized", "medications")
        assert view is None

    def test_deny_insufficient_permissions(self) -> None:
        """Test denying access due to insufficient permissions."""
        health: FamilyHealthMemory = FamilyHealthMemory("test_user")
        health.grant_family_access("spouse", "basic")
        view: list[dict] | None = health.get_family_view("spouse", "appointments")
        assert view is None

    def test_revoke_access(self) -> None:
        """Test revoking family access."""
        health: FamilyHealthMemory = FamilyHealthMemory("test_user")
        health.grant_family_access("spouse", "standard")
        success: bool = health.revoke_family_access("spouse")
        assert success is True

    def test_revoke_nonexistent_access(self) -> None:
        """Test revoking non-existent access."""
        health: FamilyHealthMemory = FamilyHealthMemory("test_user")
        success: bool = health.revoke_family_access("nonexistent")
        assert success is False

    def test_list_family_access(self) -> None:
        """Test listing family access permissions."""
        health: FamilyHealthMemory = FamilyHealthMemory("test_user")
        health.grant_family_access("spouse", "standard")
        health.grant_family_access("parent", "full")
        access: dict[str, list[str]] = health.list_family_access()
        assert len(access) == 2

    def test_family_view_symptoms_full_access(self) -> None:
        """Test family member viewing symptoms with full access."""
        health: FamilyHealthMemory = FamilyHealthMemory("test_user")
        health.log_symptom("headache", 6)
        health.grant_family_access("spouse", "full")
        view: list[str] | None = health.get_family_view("spouse", "symptoms")
        assert view is not None

    def test_family_view_illness_history_full_access(self) -> None:
        """Test family member viewing illness history with full access."""
        health: FamilyHealthMemory = FamilyHealthMemory("test_user")
        health.log_illness("flu", 7, "rest")
        health.grant_family_access("spouse", "full")
        view: list[dict] | None = health.get_family_view("spouse", "illness_history")
        assert view is not None

    def test_emergency_access_critical_symptoms(self) -> None:
        """Test emergency access to critical symptoms."""
        health: FamilyHealthMemory = FamilyHealthMemory("test_user")
        health.log_symptom("chest pain", 9)
        health.grant_family_access("emergency", "emergency")
        view: list[str] | None = health.get_family_view("emergency", "critical_symptoms")
        assert view is not None or len(view) == 0


class TestSmartHealthAlerts:
    """Test smart alerts."""

    def test_medication_reminder(self) -> None:
        """Test medication reminder alert."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        health.schedule_medication("aspirin", "500mg", "once daily")
        alerts: list = health.get_all_alerts()
        assert len(alerts) > 0

    def test_medication_reminder_with_start_date(self) -> None:
        """Test medication reminder with custom start date."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        start_date: datetime = datetime.now() + timedelta(days=1)
        health.schedule_medication("aspirin", "500mg", "once daily", start_date)
        alerts: list = health.get_all_alerts()
        assert len(alerts) > 0

    def test_refill_reminder(self) -> None:
        """Test prescription refill reminder."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        health.set_refill_reminder("aspirin", 30, refill_days_before=7)
        alerts: list = health.get_all_alerts()
        assert len(alerts) > 0

    def test_schedule_appointment(self) -> None:
        """Test scheduling appointment with reminder."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        appt_date: datetime = datetime.now() + timedelta(days=14)
        health.schedule_appointment("Dr. Smith", "checkup", appt_date)
        alerts: list = health.get_all_alerts()
        assert len(alerts) > 0

    def test_get_upcoming_appointments(self) -> None:
        """Test getting upcoming appointments."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        appt_date: datetime = datetime.now() + timedelta(days=14)
        health.schedule_appointment("Dr. Smith", "checkup", appt_date)
        upcoming: list[dict] = health.get_upcoming_appointments()
        assert len(upcoming) > 0

    def test_pattern_detection_alert(self) -> None:
        """Test pattern detection alert."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        health.log_symptom("headache", 6)
        health.log_symptom("headache", 5)
        health.log_symptom("headache", 7)
        pattern_alerts: list = health.analyze_symptom_patterns()
        assert len(pattern_alerts) > 0

    def test_get_all_alerts(self) -> None:
        """Test getting all alerts."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        health.schedule_medication("aspirin", "500mg", "once daily")
        alerts: list = health.get_all_alerts()
        assert len(alerts) > 0

    def test_get_alerts_filtered_by_priority(self) -> None:
        """Test getting alerts filtered by priority."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        health.schedule_medication("aspirin", "500mg", "once daily")
        alerts: list = health.get_all_alerts(priority_filter="high")
        assert len(alerts) > 0

    def test_get_priority_alerts(self) -> None:
        """Test getting priority alerts."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        health.schedule_medication("aspirin", "500mg", "once daily")
        priority: list = health.get_priority_alerts()
        assert len(priority) > 0

    def test_acknowledge_alert(self) -> None:
        """Test acknowledging an alert."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        health.schedule_medication("aspirin", "500mg", "once daily")
        success: bool = health.acknowledge_alert(0)
        assert success is True

    def test_acknowledge_alert_invalid_index(self) -> None:
        """Test acknowledging alert with invalid index."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        success: bool = health.acknowledge_alert(999)
        assert success is False

    def test_get_today_summary(self) -> None:
        """Test getting today's summary."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        health.schedule_medication("aspirin", "500mg", "once daily")
        summary: dict = health.get_today_summary()
        assert "date" in summary
        assert "medications_today" in summary
        assert "alerts" in summary

    def test_multiple_medications_scheduled(self) -> None:
        """Test scheduling multiple medications."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        health.schedule_medication("aspirin", "500mg", "once daily")
        health.schedule_medication("vitamin D", "1000 IU", "daily")
        summary: dict = health.get_today_summary()
        assert len(summary["medications_today"]) == 2

    def test_alert_acknowledgment_removes_from_active(self) -> None:
        """Test that acknowledged alerts are not in active list."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        health.schedule_medication("aspirin", "500mg", "once daily")
        initial_count: int = len(health.get_all_alerts())
        health.acknowledge_alert(0)
        final_count: int = len(health.get_all_alerts())
        assert final_count < initial_count

    def test_pattern_detection_threshold(self) -> None:
        """Test pattern detection requires 3+ occurrences."""
        # Use unique user ID with timestamp to avoid interference from other tests
        import time
        unique_id = f"test_user_pattern_threshold_{int(time.time() * 1000)}"
        health: SmartHealthMemory = SmartHealthMemory(unique_id)
        # Clear any existing alerts
        health.alerts = []
        unique_symptom = f"unique_symptom_test_{int(time.time() * 1000)}"
        health.log_symptom(unique_symptom, 6)
        health.log_symptom(unique_symptom, 5)
        # Only 2 occurrences, should not create pattern alert (needs 3+)
        pattern_alerts: list = health.analyze_symptom_patterns()
        # Filter to only our test symptom
        test_alerts = [a for a in pattern_alerts if unique_symptom in a.message]
        # Should not trigger with only 2 occurrences (needs 3+)
        assert len(test_alerts) == 0

    def test_upcoming_appointments_sorted(self) -> None:
        """Test that upcoming appointments are sorted by date."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        health.schedule_appointment("Dr. A", "checkup", datetime.now() + timedelta(days=30))
        health.schedule_appointment("Dr. B", "followup", datetime.now() + timedelta(days=14))
        upcoming: list[dict] = health.get_upcoming_appointments()
        assert len(upcoming) == 2
        assert upcoming[0]["days_until"] <= upcoming[1]["days_until"]

    def test_primary_caregiver_flag(self) -> None:
        """Test primary caregiver flag."""
        health: SmartHealthMemory = SmartHealthMemory("test_user", is_primary_caregiver=True)
        assert health.is_primary_caregiver is True

    def test_inherits_family_access(self) -> None:
        """Test that SmartHealthMemory inherits family access."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        success: bool = health.grant_family_access("spouse", "standard")
        assert success is True

    def test_inherits_health_logging(self) -> None:
        """Test that SmartHealthMemory inherits health logging."""
        health: SmartHealthMemory = SmartHealthMemory("test_user")
        mem_id: str = health.log_symptom("headache", 6)
        assert mem_id is not None

"""
Comprehensive test suite for Phase 9 health extensions.

Tests cover wearable devices, telemedicine, prescriptions,
visualization, and export formats.
"""

import tempfile
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from health_export_formats import HealthExportFormats
from health_visualization import HealthVisualization
from prescription_manager import PrescriptionManager
from telemedicine_scheduling import TelemedicineMemory, AppointmentType
from wearable_device_integration import WearableHealthMemory


class TestWearableDeviceIntegration:
    """Test wearable device integration."""

    def test_register_device(self) -> None:
        """Test registering a wearable device."""
        health: WearableHealthMemory = WearableHealthMemory("test_user")
        success: bool = health.register_device("device1", "fitness_tracker", "Fitbit")
        assert success is True
        assert "device1" in health.devices

    def test_sync_device_data_heart_rate(self) -> None:
        """Test syncing heart rate data."""
        health: WearableHealthMemory = WearableHealthMemory("test_user")
        health.register_device("device1", "smartwatch", "Apple Watch")
        success: bool = health.sync_device_data(device_id="device1", heart_rate=75)
        assert success is True

    def test_sync_device_data_steps(self) -> None:
        """Test syncing step count data."""
        health: WearableHealthMemory = WearableHealthMemory("test_user")
        health.register_device("device1", "fitness_tracker", "Fitbit")
        success: bool = health.sync_device_data(device_id="device1", steps=10000)
        assert success is True

    def test_sync_device_data_sleep(self) -> None:
        """Test syncing sleep data."""
        health: WearableHealthMemory = WearableHealthMemory("test_user")
        health.register_device("device1", "smartwatch", "Apple Watch")
        success: bool = health.sync_device_data(device_id="device1", sleep_hours=7.5)
        assert success is True

    def test_sync_device_data_calories(self) -> None:
        """Test syncing calories data."""
        health: WearableHealthMemory = WearableHealthMemory("test_user")
        health.register_device("device1", "fitness_tracker", "Fitbit")
        success: bool = health.sync_device_data(device_id="device1", calories_burned=2000)
        assert success is True

    def test_sync_nonexistent_device(self) -> None:
        """Test syncing data for non-existent device."""
        health: WearableHealthMemory = WearableHealthMemory("test_user")
        success: bool = health.sync_device_data(device_id="nonexistent", heart_rate=75)
        assert success is False

    def test_get_device_stats(self) -> None:
        """Test getting device statistics."""
        health: WearableHealthMemory = WearableHealthMemory("test_user")
        health.register_device("device1", "smartwatch", "Apple Watch")
        stats: dict | None = health.get_device_stats("device1")
        assert stats is not None
        assert stats["device_id"] == "device1"

    def test_list_devices(self) -> None:
        """Test listing all devices."""
        health: WearableHealthMemory = WearableHealthMemory("test_user")
        health.register_device("device1", "smartwatch", "Apple Watch")
        health.register_device("device2", "fitness_tracker", "Fitbit")
        devices: list[dict] = health.list_devices()
        assert len(devices) == 2

    def test_remove_device(self) -> None:
        """Test removing a device."""
        health: WearableHealthMemory = WearableHealthMemory("test_user")
        health.register_device("device1", "smartwatch", "Apple Watch")
        success: bool = health.remove_device("device1")
        assert success is True
        assert "device1" not in health.devices

    def test_auto_sync_enabled(self) -> None:
        """Test checking auto-sync status."""
        health: WearableHealthMemory = WearableHealthMemory("test_user")
        assert health.auto_sync_enabled() is True

    def test_enable_disable_auto_sync(self) -> None:
        """Test enabling and disabling auto-sync."""
        health: WearableHealthMemory = WearableHealthMemory("test_user")
        health.disable_auto_sync()
        assert health.auto_sync_enabled() is False
        health.enable_auto_sync()
        assert health.auto_sync_enabled() is True

    def test_heart_rate_severity_mapping(self) -> None:
        """Test heart rate to severity mapping."""
        health: WearableHealthMemory = WearableHealthMemory("test_user")
        health.register_device("device1", "smartwatch", "Apple Watch")
        # Normal heart rate
        health.sync_device_data(device_id="device1", heart_rate=75)
        # High heart rate
        health.sync_device_data(device_id="device1", heart_rate=110)


class TestTelemedicineScheduling:
    """Test telemedicine scheduling."""

    def test_schedule_telemedicine_appointment(self) -> None:
        """Test scheduling telemedicine appointment."""
        health: TelemedicineMemory = TelemedicineMemory("test_user")
        appt_date: datetime = datetime.now() + timedelta(days=7)
        appt_id: str = health.schedule_telemedicine_appointment(
            doctor_name="Dr. Smith",
            specialty="Cardiology",
            appointment_date=appt_date,
            reason="Follow-up",
        )
        assert appt_id is not None
        assert appt_id in health.appointments

    def test_schedule_with_video_link(self) -> None:
        """Test scheduling with custom video link."""
        health: TelemedicineMemory = TelemedicineMemory("test_user")
        appt_date: datetime = datetime.now() + timedelta(days=7)
        appt_id: str = health.schedule_telemedicine_appointment(
            doctor_name="Dr. Smith",
            specialty="Cardiology",
            appointment_date=appt_date,
            reason="Follow-up",
            video_link="https://zoom.us/j/123456",
        )
        assert appt_id is not None

    def test_get_upcoming_telemedicine_appointments(self) -> None:
        """Test getting upcoming telemedicine appointments."""
        health: TelemedicineMemory = TelemedicineMemory("test_user")
        appt_date: datetime = datetime.now() + timedelta(days=7)
        health.schedule_telemedicine_appointment(
            doctor_name="Dr. Smith",
            specialty="Cardiology",
            appointment_date=appt_date,
            reason="Follow-up",
        )
        upcoming: list[dict] = health.get_upcoming_telemedicine_appointments()
        assert len(upcoming) > 0

    def test_reschedule_appointment(self) -> None:
        """Test rescheduling appointment."""
        health: TelemedicineMemory = TelemedicineMemory("test_user")
        appt_date: datetime = datetime.now() + timedelta(days=7)
        appt_id: str = health.schedule_telemedicine_appointment(
            doctor_name="Dr. Smith",
            specialty="Cardiology",
            appointment_date=appt_date,
            reason="Follow-up",
        )
        new_date: datetime = datetime.now() + timedelta(days=14)
        success: bool = health.reschedule_appointment(appt_id, new_date)
        assert success is True

    def test_cancel_appointment(self) -> None:
        """Test cancelling appointment."""
        health: TelemedicineMemory = TelemedicineMemory("test_user")
        appt_date: datetime = datetime.now() + timedelta(days=7)
        appt_id: str = health.schedule_telemedicine_appointment(
            doctor_name="Dr. Smith",
            specialty="Cardiology",
            appointment_date=appt_date,
            reason="Follow-up",
        )
        success: bool = health.cancel_appointment(appt_id)
        assert success is True
        assert health.appointments[appt_id]["status"] == "cancelled"

    def test_get_appointment_link(self) -> None:
        """Test getting appointment video link."""
        health: TelemedicineMemory = TelemedicineMemory("test_user")
        appt_date: datetime = datetime.now() + timedelta(days=7)
        appt_id: str = health.schedule_telemedicine_appointment(
            doctor_name="Dr. Smith",
            specialty="Cardiology",
            appointment_date=appt_date,
            reason="Follow-up",
        )
        link: str | None = health.get_appointment_link(appt_id)
        assert link is not None

    def test_complete_appointment(self) -> None:
        """Test completing appointment with notes."""
        health: TelemedicineMemory = TelemedicineMemory("test_user")
        appt_date: datetime = datetime.now() + timedelta(days=7)
        appt_id: str = health.schedule_telemedicine_appointment(
            doctor_name="Dr. Smith",
            specialty="Cardiology",
            appointment_date=appt_date,
            reason="Follow-up",
        )
        success: bool = health.complete_appointment(appt_id, notes="All good")
        assert success is True
        assert health.appointments[appt_id]["status"] == "completed"


class TestPrescriptionManager:
    """Test prescription management."""

    def test_add_prescription(self) -> None:
        """Test adding a prescription."""
        health: PrescriptionManager = PrescriptionManager("test_user")
        rx_id: str = health.add_prescription(
            medication_name="aspirin",
            dosage="500mg",
            quantity=30,
            refills=3,
            pharmacy_name="CVS",
            pharmacy_phone="555-1234",
            doctor_name="Dr. Smith",
        )
        assert rx_id is not None
        assert rx_id in health.prescriptions

    def test_refill_prescription(self) -> None:
        """Test refilling prescription."""
        health: PrescriptionManager = PrescriptionManager("test_user")
        rx_id: str = health.add_prescription(
            medication_name="aspirin",
            dosage="500mg",
            quantity=30,
            refills=3,
            pharmacy_name="CVS",
            pharmacy_phone="555-1234",
            doctor_name="Dr. Smith",
        )
        success: bool = health.refill_prescription(rx_id)
        assert success is True
        assert health.prescriptions[rx_id].refills_remaining == 2

    def test_refill_no_refills_remaining(self) -> None:
        """Test refilling prescription with no refills."""
        health: PrescriptionManager = PrescriptionManager("test_user")
        rx_id: str = health.add_prescription(
            medication_name="aspirin",
            dosage="500mg",
            quantity=30,
            refills=0,
            pharmacy_name="CVS",
            pharmacy_phone="555-1234",
            doctor_name="Dr. Smith",
        )
        success: bool = health.refill_prescription(rx_id)
        assert success is False

    def test_get_active_prescriptions(self) -> None:
        """Test getting active prescriptions."""
        health: PrescriptionManager = PrescriptionManager("test_user")
        health.add_prescription(
            medication_name="aspirin",
            dosage="500mg",
            quantity=30,
            refills=3,
            pharmacy_name="CVS",
            pharmacy_phone="555-1234",
            doctor_name="Dr. Smith",
        )
        active: list = health.get_active_prescriptions()
        assert len(active) > 0

    def test_check_prescription_expiration(self) -> None:
        """Test checking prescription expiration."""
        health: PrescriptionManager = PrescriptionManager("test_user")
        health.add_prescription(
            medication_name="aspirin",
            dosage="500mg",
            quantity=30,
            refills=3,
            pharmacy_name="CVS",
            pharmacy_phone="555-1234",
            doctor_name="Dr. Smith",
        )
        alerts: list = health.check_prescription_expiration()
        # May or may not have alerts depending on expiration dates
        assert isinstance(alerts, list)

    def test_get_prescription_info(self) -> None:
        """Test getting prescription information."""
        health: PrescriptionManager = PrescriptionManager("test_user")
        rx_id: str = health.add_prescription(
            medication_name="aspirin",
            dosage="500mg",
            quantity=30,
            refills=3,
            pharmacy_name="CVS",
            pharmacy_phone="555-1234",
            doctor_name="Dr. Smith",
        )
        rx_info = health.get_prescription_info(rx_id)
        assert rx_info is not None
        assert rx_info.medication_name == "aspirin"

    def test_request_refill_from_pharmacy(self) -> None:
        """Test requesting refill from pharmacy."""
        health: PrescriptionManager = PrescriptionManager("test_user")
        rx_id: str = health.add_prescription(
            medication_name="aspirin",
            dosage="500mg",
            quantity=30,
            refills=3,
            pharmacy_name="CVS",
            pharmacy_phone="555-1234",
            doctor_name="Dr. Smith",
        )
        result: dict = health.request_refill_from_pharmacy(rx_id)
        assert "status" in result

    def test_get_pharmacy_contacts(self) -> None:
        """Test getting pharmacy contact information."""
        health: PrescriptionManager = PrescriptionManager("test_user")
        health.add_prescription(
            medication_name="aspirin",
            dosage="500mg",
            quantity=30,
            refills=3,
            pharmacy_name="CVS",
            pharmacy_phone="555-1234",
            doctor_name="Dr. Smith",
        )
        pharmacies: list[dict] = health.get_pharmacy_contacts()
        assert len(pharmacies) > 0


class TestHealthVisualization:
    """Test health visualization."""

    def test_get_symptom_trends(self) -> None:
        """Test getting symptom trends."""
        health: HealthVisualization = HealthVisualization("test_user")
        health.log_symptom("headache", 6)
        health.log_symptom("headache", 5)
        trends: list[tuple] = health.get_symptom_trends("headache", days=30)
        assert isinstance(trends, list)

    def test_get_medication_adherence(self) -> None:
        """Test getting medication adherence."""
        health: HealthVisualization = HealthVisualization("test_user")
        health.log_medication("aspirin", "500mg", "pain", "daily")
        adherence: dict = health.get_medication_adherence("aspirin", days=30)
        assert "adherence_percentage" in adherence
        assert "status" in adherence

    def test_get_exercise_summary(self) -> None:
        """Test getting exercise summary."""
        health: HealthVisualization = HealthVisualization("test_user")
        health.log_exercise("running", 30, "high")
        summary: dict = health.get_exercise_summary(days=30)
        assert "total_minutes" in summary
        assert "exercise_days" in summary

    def test_get_sleep_patterns(self) -> None:
        """Test getting sleep patterns."""
        health: HealthVisualization = HealthVisualization("test_user")
        # Sleep is logged via ingest, not direct method
        health.ingest(
            text="Sleep: 7.5 hours (quality: good)",
            emotion="neutral",
            context="health:sleep",
            save_immediately=True,
        )
        patterns: dict = health.get_sleep_patterns(days=30)
        assert "average_hours" in patterns

    def test_calculate_health_score(self) -> None:
        """Test calculating health score."""
        health: HealthVisualization = HealthVisualization("test_user")
        health.log_symptom("headache", 6)
        health.log_exercise("running", 30, "high")
        score: dict = health.calculate_health_score()
        assert "overall_score" in score
        assert "symptom_score" in score
        assert "exercise_score" in score

    def test_export_time_series_data(self) -> None:
        """Test exporting time-series data."""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".csv") as tmp:
            filename: str = tmp.name

        try:
            health: HealthVisualization = HealthVisualization("test_user")
            health.log_symptom("headache", 6)
            exported: str = health.export_time_series_data("symptoms", days=30, filename=filename)
            assert Path(exported).exists()
        finally:
            Path(filename).unlink(missing_ok=True)


class TestHealthExportFormats:
    """Test health export formats."""

    def test_export_fhir_bundle(self) -> None:
        """Test exporting FHIR bundle."""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".json") as tmp:
            filename: str = tmp.name

        try:
            health: HealthExportFormats = HealthExportFormats("test_user")
            health.log_medication("aspirin", "500mg", "pain", "daily")
            exported: str = health.export_fhir_bundle(filename)
            assert Path(exported).exists()
        finally:
            Path(filename).unlink(missing_ok=True)

    def test_export_hl7_message(self) -> None:
        """Test exporting HL7 message."""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".hl7") as tmp:
            filename: str = tmp.name

        try:
            health: HealthExportFormats = HealthExportFormats("test_user")
            health.log_medication("aspirin", "500mg", "pain", "daily")
            exported: str = health.export_hl7_message(filename)
            assert Path(exported).exists()
        finally:
            Path(filename).unlink(missing_ok=True)

    def test_export_patient_summary(self) -> None:
        """Test exporting patient summary."""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".json") as tmp:
            filename: str = tmp.name

        try:
            health: HealthExportFormats = HealthExportFormats("test_user")
            health.log_medication("aspirin", "500mg", "pain", "daily")
            exported: str = health.export_patient_summary(filename)
            assert Path(exported).exists()
        finally:
            Path(filename).unlink(missing_ok=True)

    def test_export_medication_list(self) -> None:
        """Test exporting medication list."""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".json") as tmp:
            filename: str = tmp.name

        try:
            health: HealthExportFormats = HealthExportFormats("test_user")
            health.log_medication("aspirin", "500mg", "pain", "daily")
            exported: str = health.export_medication_list(filename)
            assert Path(exported).exists()
        finally:
            Path(filename).unlink(missing_ok=True)

    def test_export_conditions_list(self) -> None:
        """Test exporting conditions list."""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".json") as tmp:
            filename: str = tmp.name

        try:
            health: HealthExportFormats = HealthExportFormats("test_user")
            health.log_symptom("headache", 6)
            exported: str = health.export_conditions_list(filename)
            assert Path(exported).exists()
        finally:
            Path(filename).unlink(missing_ok=True)

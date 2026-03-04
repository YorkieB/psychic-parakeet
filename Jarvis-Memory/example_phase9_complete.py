"""
Complete example of Phase 9 health extensions.

Demonstrates all advanced features: wearable devices, telemedicine,
prescriptions, visualization, and export formats.
"""

from datetime import datetime, timedelta

from health_export_formats import HealthExportFormats
from health_visualization import HealthVisualization
from prescription_manager import PrescriptionManager
from telemedicine_scheduling import TelemedicineMemory
from wearable_device_integration import WearableHealthMemory


def main() -> None:
    """Run complete Phase 9 demonstration."""
    print("=" * 70)
    print("Phase 9: Advanced Health Extensions - Complete Demo")
    print("=" * 70)

    print("\n=== Feature 1: Wearable Device Integration ===")
    wearable_health: WearableHealthMemory = WearableHealthMemory(user_id="john")
    wearable_health.register_device("fitbit1", "fitness_tracker", "Fitbit Charge 5")
    wearable_health.sync_device_data(
        device_id="fitbit1",
        heart_rate=72,
        steps=8500,
        sleep_hours=7.5,
        calories_burned=2100,
    )
    print(f"   Registered and synced device: {wearable_health.devices['fitbit1'].device_name}")
    print(f"   Devices registered: {len(wearable_health.list_devices())}")

    print("\n=== Feature 2: Telemedicine Scheduling ===")
    telemed_health: TelemedicineMemory = TelemedicineMemory(user_id="john")
    appt_date: datetime = datetime.now() + timedelta(days=7)
    appt_id: str = telemed_health.schedule_telemedicine_appointment(
        doctor_name="Dr. Smith",
        specialty="Cardiology",
        appointment_date=appt_date,
        reason="Follow-up consultation",
    )
    print(f"   Scheduled telemedicine appointment: {appt_id}")
    upcoming: list = telemed_health.get_upcoming_telemedicine_appointments()
    print(f"   Upcoming appointments: {len(upcoming)}")

    print("\n=== Feature 3: Prescription Management ===")
    rx_health: PrescriptionManager = PrescriptionManager(user_id="john")
    rx_id: str = rx_health.add_prescription(
        medication_name="lisinopril",
        dosage="10mg",
        quantity=30,
        refills=3,
        pharmacy_name="CVS Pharmacy",
        pharmacy_phone="555-1234",
        doctor_name="Dr. Smith",
    )
    print(f"   Added prescription: {rx_id}")
    active_rx: list = rx_health.get_active_prescriptions()
    print(f"   Active prescriptions: {len(active_rx)}")
    pharmacies: list = rx_health.get_pharmacy_contacts()
    print(f"   Pharmacy contacts: {len(pharmacies)}")

    print("\n=== Feature 4: Health Visualization ===")
    viz_health: HealthVisualization = HealthVisualization(user_id="john")
    viz_health.log_symptom("headache", 6)
    viz_health.log_symptom("headache", 5)
    viz_health.log_exercise("running", 30, "high")
    trends: list = viz_health.get_symptom_trends("headache", days=30)
    print(f"   Symptom trends: {len(trends)} data points")
    exercise_summary: dict = viz_health.get_exercise_summary(days=30)
    print(f"   Exercise summary: {exercise_summary['total_minutes']} minutes")
    health_score: dict = viz_health.calculate_health_score()
    print(f"   Overall health score: {health_score['overall_score']}")

    print("\n=== Feature 5: Export Formats (HL7/FHIR) ===")
    export_health: HealthExportFormats = HealthExportFormats(user_id="john")
    export_health.log_medication("aspirin", "500mg", "pain", "daily")
    export_health.log_symptom("headache", 6)
    fhir_file: str = export_health.export_fhir_bundle("demo_fhir.json")
    hl7_file: str = export_health.export_hl7_message("demo_hl7.hl7")
    summary_file: str = export_health.export_patient_summary("demo_summary.json")
    print(f"   Exported FHIR bundle: {fhir_file}")
    print(f"   Exported HL7 message: {hl7_file}")
    print(f"   Exported patient summary: {summary_file}")

    print("\n" + "=" * 70)
    print("Phase 9 Advanced Health Extensions demo complete!")
    print("All 5 extension features operational!")
    print("=" * 70)


if __name__ == "__main__":
    main()

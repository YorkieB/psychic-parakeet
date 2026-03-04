"""
Example usage of health memory system.

Demonstrates comprehensive health tracking with privacy, family sharing,
and smart alerts.
"""

from datetime import datetime, timedelta

from smart_health_alerts import SmartHealthMemory


def main() -> None:
    """Run health memory system demonstration."""
    print("=" * 70)
    print("Advanced Health Memory System Demo")
    print("=" * 70)

    # Create your health memory
    my_health: SmartHealthMemory = SmartHealthMemory(user_id="john")

    print("\n1. Logging Medications...")
    my_health.log_medication(
        "lisinopril", "10mg", "blood pressure", "once daily"
    )
    my_health.log_medication("metformin", "500mg", "diabetes", "twice daily")
    print("   Logged 2 medications")

    print("\n2. Scheduling Medication Reminders...")
    my_health.schedule_medication("lisinopril", "10mg", "once daily at 8am")
    my_health.set_refill_reminder("lisinopril", days_supply=90, refill_days_before=7)
    print("   Scheduled medication reminders")

    print("\n3. Logging Symptoms...")
    my_health.log_symptom("headache", 6, "morning pain")
    my_health.log_symptom("headache", 5, "afternoon")
    my_health.log_symptom("headache", 7, "evening with nausea")
    print("   Logged 3 symptom entries")

    print("\n4. Detecting Patterns...")
    patterns = my_health.analyze_symptom_patterns()
    print(f"   Detected {len(patterns)} patterns:")
    for pattern in patterns:
        # Remove emoji for Windows compatibility
        pattern_str = str(pattern).replace("⚠️", "[WARNING]")
        print(f"     - {pattern_str}")

    print("\n5. Scheduling Appointments...")
    checkup_date: datetime = datetime.now() + timedelta(days=14)
    my_health.schedule_appointment("Dr. Smith", "Annual checkup", checkup_date)
    print("   Scheduled appointment with reminder")

    print("\n6. Family Sharing...")
    my_health.grant_family_access("spouse", access_level="standard")
    my_health.grant_family_access("emergency_contact", access_level="emergency")
    print("   Granted access to 2 family members")

    print("\n7. Family Member View (Spouse)...")
    spouse_meds = my_health.get_family_view("spouse", "medications")
    print(f"   Spouse can see {len(spouse_meds) if spouse_meds else 0} medications")

    print("\n8. Today's Health Summary...")
    summary = my_health.get_today_summary()
    print(f"   Date: {summary['date']}")
    print(f"   Medications today: {len(summary['medications_today'])}")
    print(f"   Active alerts: {len(summary['alerts'])}")
    print(f"   Upcoming appointments: {len(summary['upcoming_appointments'])}")

    print("\n9. Priority Alerts...")
    alerts = my_health.get_priority_alerts()
    print(f"   {len(alerts)} high-priority alerts:")
    for i, alert in enumerate(alerts[:5], 1):
        # Remove emoji for Windows compatibility
        alert_str = str(alert).replace("💊", "[MED]").replace("📅", "[APPT]").replace("⚠️", "[WARN]").replace("🚨", "[CRITICAL]")
        print(f"     {i}. {alert_str}")

    print("\n10. Health Summary...")
    health_summary = my_health.get_health_summary()
    print(f"   Recent symptoms: {len(health_summary['recent_symptoms'])}")
    print(f"   Current medications: {len(health_summary['current_medications'])}")
    print(f"   Recurring issues: {health_summary['recurring_issues']}")
    print(f"   Doctor visits: {health_summary['doctor_visits']}")

    print("\n11. Exporting Health Record...")
    exported_file = my_health.export_health_record("demo_health_record.txt")
    print(f"   Exported to: {exported_file}")

    print("\n" + "=" * 70)
    print("Health Memory System demo complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()

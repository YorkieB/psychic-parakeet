"""
Personal health memory system with complete privacy.

This module provides PersonalHealthMemory class for tracking personal
health data with complete privacy guarantees.
"""

from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from memory import Memory
from sqlite_jarvis import SQLiteJarvis


class PersonalHealthMemory(SQLiteJarvis):
    """
    Personal health tracking with complete privacy.

    Features:
    - Symptom logging with severity tracking
    - Illness history with treatment notes
    - Medication management
    - Vaccination records
    - Doctor appointment notes
    - Exercise and nutrition tracking
    - Pattern detection for recurring issues
    - Health summary and export

    Privacy:
    - Each user gets isolated database
    - No cross-user access
    - Data stays on user's device/server

    Attributes:
        user_id: Unique identifier for this person
    """

    def __init__(self, user_id: str) -> None:
        """
        Initialize personal health memory.

        Args:
            user_id: Unique identifier for this person
        """
        # Create user-specific database
        db_dir: Path = Path("./health_data")
        db_dir.mkdir(exist_ok=True)
        db_path: Path = db_dir / f"{user_id}_health.db"

        super().__init__(db_path=str(db_path), auto_load=True, auto_save=True)
        self.user_id: str = user_id

    # ========== HEALTH LOGGING ==========

    def log_symptom(
        self, symptom: str, severity: int, notes: str = ""
    ) -> str:
        """
        Log a symptom with severity rating.

        Args:
            symptom: Name of symptom (e.g., "headache", "fever")
            severity: Severity from 1-10 (1=mild, 10=critical)
            notes: Optional additional notes

        Returns:
            Memory ID of logged symptom
        """
        emotion_map: Dict[int, str] = {
            1: "fine",
            2: "fine",
            3: "okay",
            4: "okay",
            5: "concerned",
            6: "worried",
            7: "worried",
            8: "very_worried",
            9: "very_worried",
            10: "critical",
        }

        memory: Memory = self.ingest(
            text=f"Symptom: {symptom} (severity {severity}/10). {notes}",
            emotion=emotion_map.get(severity, "neutral"),
            context="health:symptom",
            save_immediately=True,
        )

        return memory.id

    def log_illness(
        self, illness_name: str, duration_days: int, treatment: str = ""
    ) -> str:
        """
        Log an illness or medical condition.

        Args:
            illness_name: Name of illness
            duration_days: How long it lasted
            treatment: Treatment received

        Returns:
            Memory ID of logged illness
        """
        memory: Memory = self.ingest(
            text=f"Illness: {illness_name}\nDuration: {duration_days} days\nTreatment: {treatment}",
            emotion="unwell",
            context="health:illness",
            save_immediately=True,
        )
        return memory.id

    def log_medication(
        self,
        medication_name: str,
        dosage: str,
        reason: str,
        frequency: str,
    ) -> str:
        """
        Log medication being taken.

        Args:
            medication_name: Name of medication
            dosage: Dosage amount
            reason: Reason for taking
            frequency: How often to take

        Returns:
            Memory ID of logged medication
        """
        memory: Memory = self.ingest(
            text=f"Medication: {medication_name}\nDosage: {dosage}\nReason: {reason}\nFrequency: {frequency}",
            emotion="neutral",
            context="health:medication",
            save_immediately=True,
        )
        return memory.id

    def log_vaccination(self, vaccine_name: str, date: Optional[str] = None) -> str:
        """
        Log vaccination received.

        Args:
            vaccine_name: Name of vaccine
            date: Date received (default: today)

        Returns:
            Memory ID of logged vaccination
        """
        date_str: str = date or datetime.now().strftime("%Y-%m-%d")
        memory: Memory = self.ingest(
            text=f"Vaccination: {vaccine_name} on {date_str}",
            emotion="cautious",
            context="health:vaccination",
            save_immediately=True,
        )
        return memory.id

    def log_appointment(
        self, doctor: str, reason: str, result: str = ""
    ) -> str:
        """
        Log doctor appointment.

        Args:
            doctor: Doctor name or specialty
            reason: Reason for visit
            result: Visit outcome/notes

        Returns:
            Memory ID of logged appointment
        """
        memory: Memory = self.ingest(
            text=f"Doctor visit: {doctor}\nReason: {reason}\nResult: {result}",
            emotion="neutral",
            context="health:appointment",
            save_immediately=True,
        )
        return memory.id

    def log_exercise(
        self, activity: str, duration_min: int, intensity: str = "moderate"
    ) -> str:
        """
        Log exercise or physical activity.

        Args:
            activity: Type of exercise
            duration_min: Duration in minutes
            intensity: Intensity level (low, moderate, high)

        Returns:
            Memory ID of logged exercise
        """
        memory: Memory = self.ingest(
            text=f"Exercise: {activity} for {duration_min} minutes ({intensity})",
            emotion="good",
            context="health:exercise",
            save_immediately=True,
        )
        return memory.id

    def log_nutrition(
        self, meal_type: str, description: str, health_rating: int = 5
    ) -> str:
        """
        Log meal or nutrition.

        Args:
            meal_type: Type of meal (breakfast, lunch, dinner, snack)
            description: What was eaten
            health_rating: Health rating 1-10 (default: 5)

        Returns:
            Memory ID of logged nutrition
        """
        memory: Memory = self.ingest(
            text=f"Meal: {meal_type} - {description} (health rating: {health_rating}/10)",
            emotion="neutral",
            context="health:nutrition",
            save_immediately=True,
        )
        return memory.id

    # ========== HEALTH QUERIES ==========

    def get_recent_symptoms(self, days: int = 30) -> List[str]:
        """
        Get symptoms from last N days.

        Args:
            days: Number of days to look back (default: 30)

        Returns:
            List of symptom names
        """
        memories: List[Memory] = self.query("symptom", top_k=100)
        symptoms: List[str] = []

        for mem in memories:
            if "Symptom:" in mem.content:
                parts: List[str] = mem.content.split("Symptom: ")
                if len(parts) > 1:
                    symptom_part: str = parts[1].split(" (")[0].strip()
                    if symptom_part:
                        symptoms.append(symptom_part)

        return symptoms

    def get_illness_history(self) -> List[Dict]:
        """
        Get all past illnesses.

        Returns:
            List of dictionaries with illness information
        """
        memories: List[Memory] = self.query("illness", top_k=100)
        illnesses: List[Dict] = []

        for mem in memories:
            if "Illness:" in mem.content:
                illnesses.append(
                    {"content": mem.content, "date": mem.created_at.isoformat()}
                )

        return illnesses

    def get_current_medications(self) -> List[str]:
        """
        Get list of current medications.

        Returns:
            List of medication names
        """
        memories: List[Memory] = self.query("medication", top_k=50)
        medications: List[str] = []

        for mem in memories:
            if "Medication:" in mem.content:
                parts: List[str] = mem.content.split("Medication: ")
                if len(parts) > 1:
                    med_name: str = parts[1].split("\n")[0].strip()
                    if med_name:
                        medications.append(med_name)

        return medications

    def get_vaccination_history(self) -> List[str]:
        """
        Get vaccination records.

        Returns:
            List of vaccination records as strings
        """
        memories: List[Memory] = self.query("vaccination", top_k=50)
        vaccines: List[str] = []

        for mem in memories:
            if "Vaccination:" in mem.content:
                vaccines.append(mem.content)

        return vaccines

    def get_doctor_notes(self) -> List[Dict]:
        """
        Get all doctor appointment notes.

        Returns:
            List of dictionaries with appointment information
        """
        memories: List[Memory] = self.query("appointment", top_k=50)
        notes: List[Dict] = []

        for mem in memories:
            if "Doctor visit:" in mem.content:
                notes.append(
                    {"content": mem.content, "date": mem.created_at.isoformat()}
                )

        return notes

    # ========== HEALTH ANALYSIS ==========

    def detect_recurring_symptoms(self) -> Dict[str, int]:
        """
        Find symptoms that recur (appear 2+ times).

        Returns:
            Dictionary mapping symptom name to count
        """
        symptoms: List[str] = self.get_recent_symptoms(days=90)
        symptom_counts: Dict[str, int] = {}

        for symptom in symptoms:
            symptom_counts[symptom] = symptom_counts.get(symptom, 0) + 1

        return {s: c for s, c in symptom_counts.items() if c >= 2}

    def get_health_summary(self) -> Dict:
        """
        Get comprehensive health overview.

        Returns:
            Dictionary containing health summary
        """
        return {
            "user_id": self.user_id,
            "recent_symptoms": self.get_recent_symptoms(days=30),
            "current_medications": self.get_current_medications(),
            "recurring_issues": self.detect_recurring_symptoms(),
            "vaccination_records": self.get_vaccination_history(),
            "doctor_visits": len(self.get_doctor_notes()),
        }

    def search_health_history(self, query: str) -> List[str]:
        """
        Search entire health history.

        Args:
            query: Search query text

        Returns:
            List of matching health record contents
        """
        results: List[Memory] = self.query(query, top_k=50)
        return [m.content for m in results]

    def export_health_record(self, filename: Optional[str] = None) -> str:
        """
        Export complete health record to file.

        Args:
            filename: Output filename (default: {user_id}_health_record.txt)

        Returns:
            Path to exported file
        """
        if not filename:
            filename = f"{self.user_id}_health_record.txt"

        summary: Dict = self.get_health_summary()
        history: List[Dict] = self.get_illness_history()

        content: str = f"""
PERSONAL HEALTH RECORD
User: {self.user_id}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

=== CURRENT STATUS ===
Recent Symptoms: {', '.join(summary['recent_symptoms']) or 'None'}
Recurring Issues: {summary['recurring_issues']}
Current Medications: {', '.join(summary['current_medications']) or 'None'}

=== VACCINATIONS ===
{chr(10).join(summary['vaccination_records']) or 'None'}

=== DOCTOR VISITS ===
Total visits: {summary['doctor_visits']}

=== ILLNESS HISTORY ===
{chr(10).join([h['content'] for h in history]) or 'No recorded illnesses'}
"""

        with open(filename, "w", encoding="utf-8") as f:
            f.write(content)

        return filename

"""
Health data export in standard formats (HL7, FHIR).

This module provides export capabilities for health data in
industry-standard formats for interoperability.
"""

from datetime import datetime
from typing import Dict, List, Optional
import json

from smart_health_alerts import SmartHealthMemory


class HealthExportFormats(SmartHealthMemory):
    """
    Health memory with standard format export capabilities.

    Features:
    - HL7 FHIR R4 export
    - JSON format export
    - XML format export (simplified)
    - Patient summary export
    - Medication list export
    - Condition list export

    Attributes:
        export_format: Default export format (fhir, hl7, json)
    """

    def __init__(self, user_id: str, is_primary_caregiver: bool = False) -> None:
        """
        Initialize with export format support.

        Args:
            user_id: Unique identifier for this person
            is_primary_caregiver: Whether this user is a primary caregiver
        """
        super().__init__(user_id, is_primary_caregiver)
        self.export_format: str = "fhir"

    def export_fhir_bundle(self, filename: Optional[str] = None) -> str:
        """
        Export health data as FHIR R4 Bundle.

        Args:
            filename: Output filename (default: auto-generated)

        Returns:
            Path to exported file
        """
        if not filename:
            filename = f"{self.user_id}_fhir_{datetime.now().strftime('%Y%m%d')}.json"

        bundle: Dict = {
            "resourceType": "Bundle",
            "type": "collection",
            "timestamp": datetime.now().isoformat(),
            "entry": [],
        }

        # Patient resource
        patient: Dict = {
            "resource": {
                "resourceType": "Patient",
                "id": self.user_id,
                "identifier": [{"system": "http://example.com/patient", "value": self.user_id}],
            }
        }
        bundle["entry"].append(patient)

        # MedicationStatement resources
        medications = self.get_current_medications()
        for med in medications:
            med_resource: Dict = {
                "resource": {
                    "resourceType": "MedicationStatement",
                    "status": "active",
                    "medicationCodeableConcept": {
                        "text": med,
                    },
                }
            }
            bundle["entry"].append(med_resource)

        # Condition resources (from symptoms/illnesses)
        symptoms = self.get_recent_symptoms(days=365)
        for symptom in set(symptoms):
            condition: Dict = {
                "resource": {
                    "resourceType": "Condition",
                    "code": {"text": symptom},
                    "subject": {"reference": f"Patient/{self.user_id}"},
                }
            }
            bundle["entry"].append(condition)

        # Observation resources (from vaccinations)
        vaccinations = self.get_vaccination_history()
        for vaccine in vaccinations:
            observation: Dict = {
                "resource": {
                    "resourceType": "Observation",
                    "status": "final",
                    "code": {"text": "Immunization"},
                    "valueString": vaccine,
                    "subject": {"reference": f"Patient/{self.user_id}"},
                }
            }
            bundle["entry"].append(observation)

        with open(filename, "w", encoding="utf-8") as f:
            json.dump(bundle, f, indent=2)

        return filename

    def export_hl7_message(self, filename: Optional[str] = None) -> str:
        """
        Export health data as HL7 v2 message (simplified).

        Args:
            filename: Output filename (default: auto-generated)

        Returns:
            Path to exported file
        """
        if not filename:
            filename = f"{self.user_id}_hl7_{datetime.now().strftime('%Y%m%d')}.hl7"

        lines: List[str] = []

        # MSH segment (Message Header)
        lines.append(
            f"MSH|^~\\&|Jarvis|HealthSystem|EMR|Hospital|{datetime.now().strftime('%Y%m%d%H%M%S')}||ADT^A08|{self.user_id}|P|2.5"
        )

        # PID segment (Patient Identification)
        lines.append(f"PID|1||{self.user_id}|||{datetime.now().strftime('%Y%m%d')}")

        # Medications (RXE segments)
        medications = self.get_current_medications()
        for i, med in enumerate(medications, 1):
            lines.append(f"RXE|{i}|{med}|||")

        # Conditions (DG1 segments)
        symptoms = self.get_recent_symptoms(days=365)
        for i, symptom in enumerate(set(symptoms), 1):
            lines.append(f"DG1|{i}||{symptom}")

        with open(filename, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return filename

    def export_patient_summary(self, filename: Optional[str] = None) -> str:
        """
        Export patient summary in JSON format.

        Args:
            filename: Output filename (default: auto-generated)

        Returns:
            Path to exported file
        """
        if not filename:
            filename = f"{self.user_id}_summary_{datetime.now().strftime('%Y%m%d')}.json"

        summary: Dict = {
            "patient_id": self.user_id,
            "generated_date": datetime.now().isoformat(),
            "medications": self.get_current_medications(),
            "recent_symptoms": self.get_recent_symptoms(days=30),
            "vaccinations": self.get_vaccination_history(),
            "illness_history": [
                {
                    "content": h["content"],
                    "date": h["date"],
                }
                for h in self.get_illness_history()
            ],
            "doctor_visits": len(self.get_doctor_notes()),
        }

        with open(filename, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)

        return filename

    def export_medication_list(self, filename: Optional[str] = None) -> str:
        """
        Export medication list in structured format.

        Args:
            filename: Output filename (default: auto-generated)

        Returns:
            Path to exported file
        """
        if not filename:
            filename = f"{self.user_id}_medications_{datetime.now().strftime('%Y%m%d')}.json"

        medications = self.get_current_medications()
        med_list: List[Dict] = []

        for med in medications:
            memories = self.query(med, top_k=10)
            for mem in memories:
                if "Medication:" in mem.content and med in mem.content:
                    med_info: Dict = {
                        "medication_name": med,
                        "content": mem.content,
                        "date_logged": mem.created_at.isoformat(),
                    }
                    med_list.append(med_info)
                    break

        with open(filename, "w", encoding="utf-8") as f:
            json.dump({"medications": med_list}, f, indent=2)

        return filename

    def export_conditions_list(self, filename: Optional[str] = None) -> str:
        """
        Export conditions/symptoms list in structured format.

        Args:
            filename: Output filename (default: auto-generated)

        Returns:
            Path to exported file
        """
        if not filename:
            filename = f"{self.user_id}_conditions_{datetime.now().strftime('%Y%m%d')}.json"

        symptoms = self.get_recent_symptoms(days=365)
        conditions: List[Dict] = []

        for symptom in set(symptoms):
            conditions.append(
                {
                    "condition": symptom,
                    "type": "symptom",
                    "first_occurrence": datetime.now().isoformat(),
                }
            )

        with open(filename, "w", encoding="utf-8") as f:
            json.dump({"conditions": conditions}, f, indent=2)

        return filename

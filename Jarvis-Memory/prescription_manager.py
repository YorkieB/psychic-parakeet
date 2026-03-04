"""
Prescription management for health memory system.

This module provides prescription management with refill tracking,
pharmacy integration, and medication adherence monitoring.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass

from smart_health_alerts import SmartHealthMemory, AlertType, Alert


@dataclass
class Prescription:
    """
    Prescription information.

    Attributes:
        prescription_id: Unique prescription identifier
        medication_name: Name of medication
        dosage: Dosage information
        quantity: Quantity prescribed
        refills_remaining: Number of refills remaining
        pharmacy_name: Pharmacy name
        pharmacy_phone: Pharmacy phone number
        prescribed_date: When prescription was written
        expiration_date: When prescription expires
        doctor_name: Prescribing doctor
    """

    prescription_id: str
    medication_name: str
    dosage: str
    quantity: int
    refills_remaining: int
    pharmacy_name: str
    pharmacy_phone: str
    prescribed_date: datetime
    expiration_date: datetime
    doctor_name: str


class PrescriptionManager(SmartHealthMemory):
    """
    Health memory with prescription management.

    Features:
    - Prescription tracking
    - Refill management
    - Pharmacy integration
    - Adherence monitoring
    - Prescription expiration alerts
    - Medication interaction warnings

    Attributes:
        prescriptions: Dictionary mapping prescription_id to Prescription
        pharmacy_api_enabled: Whether pharmacy API integration is enabled
    """

    def __init__(self, user_id: str, is_primary_caregiver: bool = False) -> None:
        """
        Initialize with prescription management.

        Args:
            user_id: Unique identifier for this person
            is_primary_caregiver: Whether this user is a primary caregiver
        """
        super().__init__(user_id, is_primary_caregiver)
        self.prescriptions: Dict[str, Prescription] = {}
        self.pharmacy_api_enabled: bool = False

    def add_prescription(
        self,
        medication_name: str,
        dosage: str,
        quantity: int,
        refills: int,
        pharmacy_name: str,
        pharmacy_phone: str,
        doctor_name: str,
        days_supply: int = 30,
    ) -> str:
        """
        Add a new prescription.

        Args:
            medication_name: Name of medication
            dosage: Dosage information
            quantity: Quantity prescribed
            refills: Number of refills allowed
            pharmacy_name: Pharmacy name
            pharmacy_phone: Pharmacy phone number
            doctor_name: Prescribing doctor
            days_supply: Days of supply (default: 30)

        Returns:
            Prescription ID
        """
        prescription_id: str = f"rx_{medication_name}_{datetime.now().strftime('%Y%m%d')}"

        prescription: Prescription = Prescription(
            prescription_id=prescription_id,
            medication_name=medication_name,
            dosage=dosage,
            quantity=quantity,
            refills_remaining=refills,
            pharmacy_name=pharmacy_name,
            pharmacy_phone=pharmacy_phone,
            prescribed_date=datetime.now(),
            expiration_date=datetime.now() + timedelta(days=365),
            doctor_name=doctor_name,
        )

        self.prescriptions[prescription_id] = prescription

        # Log medication
        self.log_medication(
            medication_name=medication_name,
            dosage=dosage,
            reason=f"Prescribed by {doctor_name}",
            frequency="as prescribed",
        )

        # Set refill reminder
        self.set_refill_reminder(
            medication_name=medication_name,
            days_supply=days_supply,
            refill_days_before=7,
        )

        return prescription_id

    def refill_prescription(self, prescription_id: str) -> bool:
        """
        Process prescription refill.

        Args:
            prescription_id: Prescription identifier

        Returns:
            True if refilled successfully, False otherwise
        """
        if prescription_id not in self.prescriptions:
            return False

        prescription: Prescription = self.prescriptions[prescription_id]

        if prescription.refills_remaining <= 0:
            alert: Alert = Alert(
                AlertType.REFILL_PRESCRIPTION,
                f"[RX] No refills remaining for {prescription.medication_name}. Contact {prescription.doctor_name}",
                priority="high",
            )
            self.alerts.append(alert)
            return False

        prescription.refills_remaining -= 1

        # Log refill
        self.ingest(
            text=f"Prescription refilled: {prescription.medication_name} at {prescription.pharmacy_name}",
            emotion="neutral",
            context="health:prescription",
            save_immediately=True,
        )

        return True

    def get_active_prescriptions(self) -> List[Prescription]:
        """
        Get all active prescriptions.

        Returns:
            List of active Prescription objects
        """
        now: datetime = datetime.now()
        active: List[Prescription] = []

        for prescription in self.prescriptions.values():
            if prescription.expiration_date > now:
                active.append(prescription)

        return active

    def check_prescription_expiration(self) -> List[Alert]:
        """
        Check for expiring prescriptions and create alerts.

        Returns:
            List of expiration alerts
        """
        alerts: List[Alert] = []
        now: datetime = datetime.now()

        for prescription in self.prescriptions.values():
            days_until_expiry: int = (prescription.expiration_date - now).days

            if 0 < days_until_expiry <= 30:
                alert: Alert = Alert(
                    AlertType.REFILL_PRESCRIPTION,
                    f"[RX] Prescription for {prescription.medication_name} expires in {days_until_expiry} days",
                    priority="high" if days_until_expiry <= 7 else "normal",
                )
                alerts.append(alert)
                self.alerts.append(alert)

        return alerts

    def get_prescription_info(self, prescription_id: str) -> Optional[Prescription]:
        """
        Get prescription information.

        Args:
            prescription_id: Prescription identifier

        Returns:
            Prescription object if found, None otherwise
        """
        return self.prescriptions.get(prescription_id)

    def request_refill_from_pharmacy(
        self, prescription_id: str
    ) -> Dict[str, str]:
        """
        Request prescription refill from pharmacy.

        Args:
            prescription_id: Prescription identifier

        Returns:
            Dictionary with refill request status
        """
        if prescription_id not in self.prescriptions:
            return {"status": "error", "message": "Prescription not found"}

        prescription: Prescription = self.prescriptions[prescription_id]

        if self.pharmacy_api_enabled:
            # In production, this would call actual pharmacy API
            return {
                "status": "requested",
                "message": f"Refill requested at {prescription.pharmacy_name}",
                "pharmacy_phone": prescription.pharmacy_phone,
            }
        else:
            return {
                "status": "manual",
                "message": f"Call {prescription.pharmacy_name} at {prescription.pharmacy_phone}",
                "pharmacy_phone": prescription.pharmacy_phone,
            }

    def get_pharmacy_contacts(self) -> List[Dict]:
        """
        Get all pharmacy contact information.

        Returns:
            List of pharmacy contact dictionaries
        """
        pharmacies: Dict[str, Dict] = {}

        for prescription in self.prescriptions.values():
            if prescription.pharmacy_name not in pharmacies:
                pharmacies[prescription.pharmacy_name] = {
                    "name": prescription.pharmacy_name,
                    "phone": prescription.pharmacy_phone,
                    "prescriptions": [],
                }
            pharmacies[prescription.pharmacy_name]["prescriptions"].append(
                prescription.medication_name
            )

        return list(pharmacies.values())

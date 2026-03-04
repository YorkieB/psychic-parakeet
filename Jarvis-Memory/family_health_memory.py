"""
Health memory with family member access control.

This module provides FamilyHealthMemory class that extends
PersonalHealthMemory with selective family sharing capabilities.
"""

from typing import Dict, List, Optional

from personal_health_memory import PersonalHealthMemory


class FamilyHealthMemory(PersonalHealthMemory):
    """
    Personal health memory with selective family sharing.

    Features:
    - Granular access control (basic, standard, full, emergency)
    - Per-family-member permissions
    - Privacy-first: opt-in sharing only
    - Access audit trail

    Attributes:
        is_primary_caregiver: Whether this user is a primary caregiver
        family_access: Dictionary mapping family member ID to permissions
    """

    def __init__(self, user_id: str, is_primary_caregiver: bool = False) -> None:
        """
        Initialize with family sharing capabilities.

        Args:
            user_id: Unique identifier for this person
            is_primary_caregiver: Whether this user is a primary caregiver
        """
        super().__init__(user_id)
        self.is_primary_caregiver: bool = is_primary_caregiver
        self.family_access: Dict[str, List[str]] = {}

    # ========== ACCESS CONTROL ==========

    def grant_family_access(
        self, family_member_id: str, access_level: str = "basic"
    ) -> bool:
        """
        Grant family member access to health data.

        Access levels:
        - basic: medications only
        - standard: medications + appointments + vaccinations
        - full: all health data except private notes
        - emergency: medications + critical symptoms only

        Args:
            family_member_id: Identifier for family member
            access_level: Permission level to grant

        Returns:
            True if access granted successfully, False otherwise
        """
        access_levels: Dict[str, List[str]] = {
            "basic": ["medications"],
            "standard": ["medications", "appointments", "vaccinations"],
            "full": [
                "symptoms",
                "medications",
                "appointments",
                "vaccinations",
                "illness_history",
            ],
            "emergency": ["medications", "critical_symptoms"],
        }

        if access_level not in access_levels:
            return False

        self.family_access[family_member_id] = access_levels[access_level]
        return True

    def revoke_family_access(self, family_member_id: str) -> bool:
        """
        Remove family member's access.

        Args:
            family_member_id: Identifier for family member

        Returns:
            True if access revoked successfully, False otherwise
        """
        if family_member_id in self.family_access:
            del self.family_access[family_member_id]
            return True
        return False

    def list_family_access(self) -> Dict[str, List[str]]:
        """
        Get current family access permissions.

        Returns:
            Dictionary mapping family member ID to list of permissions
        """
        return self.family_access.copy()

    def get_family_view(
        self, family_member_id: str, data_type: str
    ) -> Optional[List]:
        """
        Get data visible to family member (respects permissions).

        Args:
            family_member_id: Family member requesting access
            data_type: Type of data requested

        Returns:
            Data if permitted, None if access denied
        """
        if family_member_id not in self.family_access:
            return None

        permissions: List[str] = self.family_access[family_member_id]

        if data_type not in permissions:
            return None

        if data_type == "medications":
            return self.get_current_medications()
        elif data_type == "appointments":
            return self.get_doctor_notes()
        elif data_type == "vaccinations":
            return self.get_vaccination_history()
        elif data_type == "symptoms":
            return self.get_recent_symptoms()
        elif data_type == "illness_history":
            return self.get_illness_history()
        elif data_type == "critical_symptoms":
            # Get only high-severity symptoms (7+)
            memories = self.query("symptom severity", top_k=50)
            critical = []
            for mem in memories:
                if "severity" in mem.content.lower():
                    # Extract severity number
                    parts = mem.content.split("severity ")
                    if len(parts) > 1:
                        severity_str = parts[1].split("/")[0]
                        try:
                            severity = int(severity_str)
                            if severity >= 7:
                                critical.append(mem.content)
                        except ValueError:
                            pass
            return critical

        return None

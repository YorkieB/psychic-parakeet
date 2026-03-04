"""
Health data visualization for health memory system.

This module provides data visualization capabilities for health metrics,
trends, and patterns.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from smart_health_alerts import SmartHealthMemory


class HealthVisualization(SmartHealthMemory):
    """
    Health memory with data visualization capabilities.

    Features:
    - Symptom trend analysis
    - Medication adherence tracking
    - Exercise activity charts
    - Sleep pattern visualization
    - Health score calculation
    - Time-series data export

    Attributes:
        visualization_enabled: Whether visualization features are enabled
    """

    def __init__(self, user_id: str, is_primary_caregiver: bool = False) -> None:
        """
        Initialize with visualization support.

        Args:
            user_id: Unique identifier for this person
            is_primary_caregiver: Whether this user is a primary caregiver
        """
        super().__init__(user_id, is_primary_caregiver)
        self.visualization_enabled: bool = True

    def get_symptom_trends(
        self, symptom_name: str, days: int = 30
    ) -> List[Tuple[datetime, int]]:
        """
        Get symptom severity trends over time.

        Args:
            symptom_name: Name of symptom to analyze
            days: Number of days to look back

        Returns:
            List of tuples (date, severity_score)
        """
        memories = self.query(symptom_name, top_k=100)
        trends: List[Tuple[datetime, int]] = []

        cutoff_date: datetime = datetime.now() - timedelta(days=days)

        for mem in memories:
            if "Symptom:" in mem.content and symptom_name.lower() in mem.content.lower():
                if mem.created_at >= cutoff_date:
                    # Extract severity from content
                    severity: int = self._extract_severity(mem.content)
                    if severity > 0:
                        trends.append((mem.created_at, severity))

        return sorted(trends, key=lambda x: x[0])

    def _extract_severity(self, content: str) -> int:
        """
        Extract severity score from content.

        Args:
            content: Memory content text

        Returns:
            Severity score (0 if not found)
        """
        try:
            if "severity" in content.lower():
                parts = content.split("severity")
                if len(parts) > 1:
                    severity_str = parts[1].split("/")[0].strip()
                    return int(severity_str)
        except (ValueError, IndexError):
            pass
        return 0

    def get_medication_adherence(
        self, medication_name: str, days: int = 30
    ) -> Dict:
        """
        Calculate medication adherence percentage.

        Args:
            medication_name: Name of medication
            days: Number of days to analyze

        Returns:
            Dictionary with adherence statistics
        """
        memories = self.query(medication_name, top_k=100)
        cutoff_date: datetime = datetime.now() - timedelta(days=days)

        medication_logs: int = 0
        total_days: int = days

        for mem in memories:
            if medication_name.lower() in mem.content.lower():
                if mem.created_at >= cutoff_date:
                    medication_logs += 1

        adherence_percentage: float = (
            (medication_logs / total_days) * 100 if total_days > 0 else 0.0
        )

        return {
            "medication_name": medication_name,
            "days_analyzed": days,
            "logs_found": medication_logs,
            "adherence_percentage": round(adherence_percentage, 2),
            "status": "good" if adherence_percentage >= 80 else "needs_improvement",
        }

    def get_exercise_summary(self, days: int = 30) -> Dict:
        """
        Get exercise activity summary.

        Args:
            days: Number of days to analyze

        Returns:
            Dictionary with exercise statistics
        """
        memories = self.query("exercise", top_k=100)
        cutoff_date: datetime = datetime.now() - timedelta(days=days)

        total_minutes: int = 0
        exercise_days: int = 0
        activities: Dict[str, int] = {}

        for mem in memories:
            if "Exercise:" in mem.content and mem.created_at >= cutoff_date:
                exercise_days += 1
                # Extract duration
                if "for" in mem.content and "minutes" in mem.content:
                    parts = mem.content.split("for")
                    if len(parts) > 1:
                        duration_str = parts[1].split("minutes")[0].strip()
                        try:
                            minutes = int(duration_str)
                            total_minutes += minutes
                        except ValueError:
                            pass

                # Extract activity type
                if "Exercise:" in mem.content:
                    activity = mem.content.split("Exercise:")[1].split("for")[0].strip()
                    activities[activity] = activities.get(activity, 0) + 1

        return {
            "days_analyzed": days,
            "exercise_days": exercise_days,
            "total_minutes": total_minutes,
            "average_minutes_per_day": round(total_minutes / days, 2) if days > 0 else 0,
            "activities": activities,
        }

    def get_sleep_patterns(self, days: int = 30) -> Dict:
        """
        Analyze sleep patterns.

        Args:
            days: Number of days to analyze

        Returns:
            Dictionary with sleep statistics
        """
        memories = self.query("sleep", top_k=100)
        cutoff_date: datetime = datetime.now() - timedelta(days=days)

        sleep_hours: List[float] = []
        sleep_qualities: List[str] = []

        for mem in memories:
            if "Sleep:" in mem.content and mem.created_at >= cutoff_date:
                # Extract hours
                if "hours" in mem.content:
                    parts = mem.content.split("hours")
                    if len(parts) > 0:
                        hours_str = parts[0].split(":")[-1].strip()
                        try:
                            hours = float(hours_str)
                            sleep_hours.append(hours)
                        except ValueError:
                            pass

                # Extract quality
                if "quality:" in mem.content.lower():
                    quality = mem.content.split("quality:")[-1].split(")")[0].strip()
                    sleep_qualities.append(quality)

        avg_hours: float = (
            sum(sleep_hours) / len(sleep_hours) if sleep_hours else 0.0
        )

        return {
            "days_analyzed": days,
            "sleep_records": len(sleep_hours),
            "average_hours": round(avg_hours, 2),
            "min_hours": round(min(sleep_hours), 2) if sleep_hours else 0,
            "max_hours": round(max(sleep_hours), 2) if sleep_hours else 0,
            "quality_distribution": {
                q: sleep_qualities.count(q) for q in set(sleep_qualities)
            },
        }

    def calculate_health_score(self) -> Dict:
        """
        Calculate overall health score based on various factors.

        Returns:
            Dictionary with health score and breakdown
        """
        # Get recent symptoms
        recent_symptoms = self.get_recent_symptoms(days=30)
        symptom_score: float = max(0, 100 - (len(recent_symptoms) * 5))

        # Get exercise
        exercise_summary = self.get_exercise_summary(days=30)
        exercise_score: float = min(100, (exercise_summary["exercise_days"] / 30) * 100)

        # Get sleep
        sleep_patterns = self.get_sleep_patterns(days=30)
        sleep_score: float = 100
        if sleep_patterns["average_hours"] > 0:
            if sleep_patterns["average_hours"] < 6 or sleep_patterns["average_hours"] > 9:
                sleep_score = 70
            elif sleep_patterns["average_hours"] < 7 or sleep_patterns["average_hours"] > 8:
                sleep_score = 85

        # Medication adherence
        medications = self.get_current_medications()
        adherence_scores: List[float] = []
        for med in medications:
            adherence = self.get_medication_adherence(med, days=30)
            adherence_scores.append(adherence["adherence_percentage"])

        medication_score: float = (
            sum(adherence_scores) / len(adherence_scores)
            if adherence_scores
            else 100
        )

        # Calculate overall score
        overall_score: float = (
            symptom_score * 0.3
            + exercise_score * 0.25
            + sleep_score * 0.25
            + medication_score * 0.2
        )

        return {
            "overall_score": round(overall_score, 2),
            "symptom_score": round(symptom_score, 2),
            "exercise_score": round(exercise_score, 2),
            "sleep_score": round(sleep_score, 2),
            "medication_score": round(medication_score, 2),
            "date": datetime.now().isoformat(),
        }

    def export_time_series_data(
        self, data_type: str, days: int = 30, filename: Optional[str] = None
    ) -> str:
        """
        Export time-series data for visualization.

        Args:
            data_type: Type of data (symptoms, exercise, sleep)
            days: Number of days to export
            filename: Output filename (default: auto-generated)

        Returns:
            Path to exported file
        """
        if not filename:
            filename = f"{self.user_id}_{data_type}_{datetime.now().strftime('%Y%m%d')}.csv"

        lines: List[str] = ["date,value"]

        if data_type == "symptoms":
            symptoms = self.get_recent_symptoms(days=days)
            for symptom in symptoms:
                trends = self.get_symptom_trends(symptom, days=days)
                for date, severity in trends:
                    lines.append(f"{date.isoformat()},{severity}")

        elif data_type == "exercise":
            summary = self.get_exercise_summary(days=days)
            # Simplified export
            lines.append(f"{datetime.now().isoformat()},{summary['total_minutes']}")

        elif data_type == "sleep":
            patterns = self.get_sleep_patterns(days=days)
            lines.append(f"{datetime.now().isoformat()},{patterns['average_hours']}")

        with open(filename, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return filename

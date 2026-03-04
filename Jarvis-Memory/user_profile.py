"""
User profile management for multi-user Jarvis system.

This module provides UserProfile class for managing user settings
and metadata in a multi-user environment.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Set


@dataclass
class UserProfile:
    """
    User profile with settings and metadata.

    Attributes:
        user_id: Unique identifier for the user
        created_at: Timestamp when profile was created
        settings: Dictionary of user settings
        shared_with: Set of user IDs this user has shared facts with
        shared_from: Set of user IDs this user has received facts from
    """

    user_id: str
    created_at: datetime = field(default_factory=datetime.now)
    settings: Dict[str, Any] = field(default_factory=dict)
    shared_with: Set[str] = field(default_factory=set)
    shared_from: Set[str] = field(default_factory=set)

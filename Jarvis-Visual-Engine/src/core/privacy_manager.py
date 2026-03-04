from datetime import datetime, timedelta
from typing import List, Dict
from cryptography.fernet import Fernet
import os
import logging
import json

logger = logging.getLogger(__name__)


class PrivacyManager:
    """Handle privacy, consent, and compliance"""
    
    def __init__(self, encryption_key: str = None, db_session=None):
        if encryption_key:
            try:
                self.cipher = Fernet(encryption_key.encode())
            except Exception as e:
                logger.warning(f"Failed to initialize encryption: {e}")
                self.cipher = None
        else:
            self.cipher = None
        
        self.privacy_mode = False
        self.consented_features = set()
        self.data_retention_days = 30
        self.db_session = db_session  # For audit logging
    
    def enable_privacy_mode(self):
        """Enable privacy mode - pause all analysis"""
        self.privacy_mode = True
        self.audit_log("privacy_mode_enabled", "system", "privacy", {})
    
    def disable_privacy_mode(self):
        """Disable privacy mode"""
        self.privacy_mode = False
        self.audit_log("privacy_mode_disabled", "system", "privacy", {})
    
    def grant_consent(self, feature: str):
        """Grant consent for feature"""
        self.consented_features.add(feature)
        self.audit_log("consent_granted", "system", feature, {"feature": feature})
    
    def revoke_consent(self, feature: str):
        """Revoke consent for feature"""
        self.consented_features.discard(feature)
        self.audit_log("consent_revoked", "system", feature, {"feature": feature})
    
    def has_consent(self, feature: str) -> bool:
        """Check if feature has consent"""
        return feature in self.consented_features
    
    def encrypt_sensitive_data(self, data: str) -> str:
        """Encrypt sensitive data"""
        if self.cipher:
            try:
                return self.cipher.encrypt(data.encode()).decode()
            except Exception as e:
                logger.error(f"Encryption error: {e}")
                return data
        return data
    
    def decrypt_sensitive_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        if self.cipher:
            try:
                return self.cipher.decrypt(encrypted_data.encode()).decode()
            except Exception as e:
                logger.error(f"Decryption error: {e}")
                return encrypted_data
        return encrypted_data
    
    def should_delete_data(self, created_date: datetime, data_type: str) -> bool:
        """Check if data should be deleted based on retention policy"""
        retention_map = {
            "face_images": 0,  # Never store
            "face_encodings": 99999,  # Keep until explicit deletion
            "activity_logs": self.data_retention_days,
            "spatial_memory": 90,
            "audit_logs": 365
        }
        
        retention_days = retention_map.get(data_type, self.data_retention_days)
        if retention_days == 0:
            return True  # Never store
        if retention_days >= 99999:
            return False  # Keep forever
        
        expiry_date = created_date + timedelta(days=retention_days)
        return datetime.utcnow() > expiry_date
    
    def get_data_for_export(self, user_id: str) -> dict:
        """Get all user data for GDPR export"""
        # Query database for all user data
        # This should be implemented with actual database queries
        return {
            "faces": [],
            "locations": [],
            "activities": [],
            "consent_log": []
        }
    
    def delete_user_data(self, user_id: str) -> bool:
        """Delete all user data"""
        # Query database and delete
        # This should be implemented with actual database deletion
        self.audit_log("user_data_deleted", "system", user_id, {"user_id": user_id})
        return True
    
    def audit_log(self, action: str, actor: str, resource: str, details: Dict):
        """Log action for audit trail"""
        try:
            from src.database.models import AuditLog
            
            if self.db_session:
                # Map to AuditLog model fields:
                # - action -> action
                # - resource -> entity_type
                # - actor and details -> changes (JSONB)
                changes = {
                    "actor": actor,
                    **details
                }
                
                audit_entry = AuditLog(
                    action=action,
                    entity_type=resource,
                    changes=changes,
                    timestamp=datetime.utcnow()
                )
                self.db_session.add(audit_entry)
                self.db_session.commit()
            else:
                # Log to file if no database session
                logger.info(f"AUDIT: {action} by {actor} on {resource}: {details}")
        except Exception as e:
            logger.error(f"Failed to save audit log: {e}")

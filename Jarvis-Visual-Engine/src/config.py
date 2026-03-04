import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import validator
from typing import Optional
import yaml
import logging

load_dotenv()

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings with validation"""
    
    # Application
    app_name: str = "Vision Engine"
    app_version: str = "1.0.0"
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = environment == "development"
    
    # API Keys
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    api_key: str = os.getenv("API_KEY", "")  # For API authentication
    
    # Database
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "5432"))
    db_name: str = os.getenv("DB_NAME", "vision_engine")
    db_user: str = os.getenv("DB_USER", "vision")
    db_password: str = os.getenv("DB_PASSWORD", "")
    db_echo: bool = os.getenv("DB_ECHO", "false").lower() == "true"
    db_pool_size: int = int(os.getenv("DB_POOL_SIZE", "10"))
    db_max_overflow: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    db_pool_timeout: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    db_pool_recycle: int = int(os.getenv("DB_POOL_RECYCLE", "3600"))
    
    @property
    def database_url(self) -> str:
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
    
    # Redis
    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    redis_db: int = int(os.getenv("REDIS_DB", "0"))
    
    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"
    
    # Camera
    camera_type: str = os.getenv("CAMERA_TYPE", "obsbot")  # obsbot, onvif, emeet
    camera_ip: Optional[str] = os.getenv("CAMERA_IP")
    camera_port: int = int(os.getenv("CAMERA_PORT", "8080"))
    camera_username: Optional[str] = os.getenv("CAMERA_USERNAME")
    camera_password: Optional[str] = os.getenv("CAMERA_PASSWORD")
    camera_usb_index: Optional[int] = int(os.getenv("CAMERA_USB_INDEX")) if os.getenv("CAMERA_USB_INDEX") else None
    camera_connection_type: str = os.getenv("CAMERA_CONNECTION_TYPE", "auto")  # usb, network, auto
    
    # Vision APIs
    vision_api_primary: str = os.getenv("VISION_API_PRIMARY", "gpt4o")
    vision_api_fallback: str = os.getenv("VISION_API_FALLBACK", "claude")
    vision_detail_level: str = os.getenv("VISION_DETAIL_LEVEL", "high")
    
    # Processing
    frame_rate: int = int(os.getenv("FRAME_RATE", "30"))
    motion_threshold: float = float(os.getenv("MOTION_THRESHOLD", "5.0"))
    face_confidence_threshold: float = float(os.getenv("FACE_CONFIDENCE", "0.6"))
    smart_triggering_enabled: bool = os.getenv("SMART_TRIGGERING", "true").lower() == "true"
    
    # Privacy
    data_retention_days: int = int(os.getenv("DATA_RETENTION_DAYS", "30"))
    audit_retention_days: int = int(os.getenv("AUDIT_RETENTION_DAYS", "365"))
    encryption_enabled: bool = os.getenv("ENCRYPTION_ENABLED", "true").lower() == "true"
    
    # Server
    server_host: str = os.getenv("SERVER_HOST", "0.0.0.0")
    server_port: int = int(os.getenv("SERVER_PORT", "5000"))
    
    @validator('openai_api_key')
    def validate_openai_key(cls, v, values):
        """Validate OpenAI API key is present"""
        if not v and values.get('vision_api_primary') == 'gpt4o':
            logger.warning("OPENAI_API_KEY not set but GPT-4o is primary API")
        return v
    
    @validator('anthropic_api_key')
    def validate_anthropic_key(cls, v, values):
        """Validate Anthropic API key is present"""
        if not v and values.get('vision_api_fallback') == 'claude':
            logger.warning("ANTHROPIC_API_KEY not set but Claude is fallback API")
        return v
    
    class Config:
        case_sensitive = False


settings = Settings()


def load_yaml_config(config_path: str) -> dict:
    """Load YAML configuration file with error handling"""
    try:
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        logger.warning(f"Config file not found: {config_path}")
        return {}
    except yaml.YAMLError as e:
        logger.error(f"Error parsing YAML config {config_path}: {e}")
        return {}


def get_config(environment: str = None) -> dict:
    """Get environment-specific config"""
    env = environment or settings.environment
    config_file = f"config/{env}.yaml"
    return load_yaml_config(config_file)

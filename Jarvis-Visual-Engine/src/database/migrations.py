"""Alembic-based migration system for Vision Engine"""
import sys
import os
from pathlib import Path
from typing import Optional
import logging
from datetime import datetime

from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

from src.database.models import Base
from src.config import settings

logger = logging.getLogger(__name__)

# Alembic configuration path
ALEMBIC_INI = Path(__file__).parent.parent.parent / "alembic.ini"
ALEMBIC_DIR = Path(__file__).parent.parent.parent / "alembic"


def get_alembic_config(database_url: Optional[str] = None) -> Config:
    """Get Alembic configuration"""
    database_url = database_url or settings.database_url
    
    # Create alembic.ini if it doesn't exist
    if not ALEMBIC_INI.exists():
        _create_alembic_ini(database_url)
    
    alembic_cfg = Config(str(ALEMBIC_INI))
    alembic_cfg.set_main_option("sqlalchemy.url", database_url)
    
    return alembic_cfg


def _create_alembic_ini(database_url: str):
    """Create alembic.ini file"""
    alembic_ini_content = f"""[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = {database_url}

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
"""
    ALEMBIC_INI.write_text(alembic_ini_content)
    logger.info("Created alembic.ini")


def init_migrations(database_url: Optional[str] = None) -> bool:
    """
    Initialize Alembic migration system
    
    Args:
        database_url: Database connection string
        
    Returns:
        True if initialization successful
    """
    try:
        alembic_cfg = get_alembic_config(database_url)
        
        # Create alembic directory if it doesn't exist
        ALEMBIC_DIR.mkdir(exist_ok=True)
        (ALEMBIC_DIR / "versions").mkdir(exist_ok=True)
        
        # Initialize if not already done
        if not (ALEMBIC_DIR / "env.py").exists():
            command.init(alembic_cfg, str(ALEMBIC_DIR))
            logger.info("Alembic initialized")
        
        # Create env.py if needed
        _create_alembic_env()
        
        logger.info("Migration system initialized")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize migrations: {e}")
        return False


def _create_alembic_env():
    """Create or update alembic/env.py"""
    env_py = ALEMBIC_DIR / "env.py"
    
    if env_py.exists():
        return  # Already exists
    
    env_content = '''"""Alembic environment configuration"""
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.database.models import Base
from src.config import settings

# this is the Alembic Config object
config = context.config

# Override sqlalchemy.url from settings
config.set_main_option("sqlalchemy.url", settings.database_url)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
'''
    env_py.write_text(env_content)
    logger.info("Created alembic/env.py")


def create_initial_migration(database_url: Optional[str] = None) -> bool:
    """
    Create initial migration from models
    
    Args:
        database_url: Database connection string
        
    Returns:
        True if migration created successfully
    """
    try:
        alembic_cfg = get_alembic_config(database_url)
        
        # Initialize if needed
        if not (ALEMBIC_DIR / "env.py").exists():
            init_migrations(database_url)
        
        # Create initial migration
        command.revision(
            alembic_cfg,
            autogenerate=True,
            message="Initial migration - all tables"
        )
        
        logger.info("Initial migration created")
        return True
        
    except Exception as e:
        logger.error(f"Failed to create initial migration: {e}")
        return False


def upgrade(database_url: Optional[str] = None, revision: str = "head") -> bool:
    """
    Run pending migrations (upgrade)
    
    Args:
        database_url: Database connection string
        revision: Target revision (default: "head")
        
    Returns:
        True if upgrade successful
    """
    try:
        alembic_cfg = get_alembic_config(database_url)
        
        # Test connection first
        engine = create_engine(database_url or settings.database_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        # Run upgrade
        command.upgrade(alembic_cfg, revision)
        
        logger.info(f"Database upgraded to revision: {revision}")
        return True
        
    except OperationalError as e:
        logger.error(f"Database connection failed: {e}")
        return False
    except Exception as e:
        logger.error(f"Migration upgrade failed: {e}")
        return False


def downgrade(database_url: Optional[str] = None, revision: str = "-1") -> bool:
    """
    Rollback migrations (downgrade)
    
    Args:
        database_url: Database connection string
        revision: Target revision (default: "-1" for one step back)
        
    Returns:
        True if downgrade successful
    """
    try:
        alembic_cfg = get_alembic_config(database_url)
        command.downgrade(alembic_cfg, revision)
        
        logger.info(f"Database downgraded to revision: {revision}")
        return True
        
    except Exception as e:
        logger.error(f"Migration downgrade failed: {e}")
        return False


def current_revision(database_url: Optional[str] = None) -> Optional[str]:
    """
    Get current database revision
    
    Args:
        database_url: Database connection string
        
    Returns:
        Current revision string or None
    """
    try:
        alembic_cfg = get_alembic_config(database_url)
        script = ScriptDirectory.from_config(alembic_cfg)
        
        engine = create_engine(database_url or settings.database_url)
        with engine.connect() as conn:
            context = MigrationContext.configure(conn)
            current = context.get_current_revision()
            
        return current
        
    except Exception as e:
        logger.error(f"Failed to get current revision: {e}")
        return None


def history(database_url: Optional[str] = None) -> list:
    """
    Get migration history
    
    Args:
        database_url: Database connection string
        
    Returns:
        List of migration revisions
    """
    try:
        alembic_cfg = get_alembic_config(database_url)
        script = ScriptDirectory.from_config(alembic_cfg)
        
        return [rev.revision for rev in script.walk_revisions()]
        
    except Exception as e:
        logger.error(f"Failed to get migration history: {e}")
        return []


def migrate(database_url: Optional[str] = None) -> bool:
    """
    Run database migrations (create tables if needed, then upgrade)
    
    Args:
        database_url: Database connection string
        
    Returns:
        True if migration successful
    """
    logger.info("Starting database migration...")
    
    try:
        # Test connection
        engine = create_engine(database_url or settings.database_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        logger.info("Database connection successful")
        
        # Initialize migrations if needed
        if not (ALEMBIC_DIR / "env.py").exists():
            init_migrations(database_url)
        
        # Check if alembic_version table exists
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alembic_version')"
            ))
            has_alembic = result.scalar()
        
        # If no alembic_version, create initial migration and tables
        if not has_alembic:
            logger.info("No migration history found, creating initial migration...")
            create_initial_migration(database_url)
            upgrade(database_url)
        else:
            # Run pending upgrades
            upgrade(database_url)
        
        logger.info("Database migration completed successfully")
        return True
        
    except OperationalError as e:
        logger.error(f"Database connection failed: {e}")
        logger.error("Please ensure PostgreSQL is running and database exists")
        return False
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "init":
            success = init_migrations()
        elif command == "create":
            success = create_initial_migration()
        elif command == "upgrade":
            revision = sys.argv[2] if len(sys.argv) > 2 else "head"
            success = upgrade(revision=revision)
        elif command == "downgrade":
            revision = sys.argv[2] if len(sys.argv) > 2 else "-1"
            success = downgrade(revision=revision)
        elif command == "current":
            rev = current_revision()
            print(f"Current revision: {rev}")
            success = True
        elif command == "history":
            hist = history()
            print("Migration history:")
            for rev in hist:
                print(f"  - {rev}")
            success = True
        else:
            print(f"Unknown command: {command}")
            print("Usage: python -m src.database.migrations [init|create|upgrade|downgrade|current|history]")
            success = False
    else:
        # Default: run full migration
        success = migrate()
    
    sys.exit(0 if success else 1)

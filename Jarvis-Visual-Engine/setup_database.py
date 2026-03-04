"""Setup PostgreSQL database for Vision Engine"""
from sqlalchemy import create_engine, text
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_database():
    """Create the visionengine database if it doesn't exist"""
    
    # Try different PostgreSQL connection strings
    test_urls = [
        "postgresql://postgres:postgres@localhost:5432/postgres",
        "postgresql://postgres:@localhost:5432/postgres",
        "postgresql://vision:vision@localhost:5432/postgres"
    ]
    
    admin_url = None
    for url in test_urls:
        try:
            engine = create_engine(url, connect_args={"connect_timeout": 3})
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            admin_url = url
            logger.info(f"✅ Connected to PostgreSQL with: {url.split('@')[1] if '@' in url else url}")
            break
        except Exception as e:
            continue
    
    if not admin_url:
        logger.error("❌ Could not connect to PostgreSQL")
        logger.error("\nPossible issues:")
        logger.error("1. PostgreSQL is not running")
        logger.error("2. Wrong username/password")
        logger.error("3. PostgreSQL not installed")
        logger.error("\n💡 The system will continue without database (in-memory mode)")
        return False
    
    try:
        logger.info("🔍 Checking if database exists...")
        engine = create_engine(admin_url)
        
        with engine.connect() as conn:
            # Check if database exists
            result = conn.execute(text(
                "SELECT 1 FROM pg_database WHERE datname='visionengine'"
            ))
            
            if result.fetchone():
                logger.info("✅ Database 'visionengine' already exists")
            else:
                logger.info("📝 Creating database 'visionengine'...")
                conn.execution_options(isolation_level="AUTOCOMMIT").execute(
                    text("CREATE DATABASE visionengine")
                )
                logger.info("✅ Database 'visionengine' created successfully")
        
        engine.dispose()
        
        # Now create tables
        logger.info("\n📝 Creating tables...")
        from src.database.models import Base
        from src.config import settings
        
        # Try to connect to the new database
        db_urls = [
            settings.database_url,
            "postgresql://postgres:postgres@localhost:5432/visionengine",
            "postgresql://postgres:@localhost:5432/visionengine",
            "postgresql://vision:vision@localhost:5432/visionengine"
        ]
        
        connected = False
        for url in db_urls:
            try:
                engine = create_engine(url, connect_args={"connect_timeout": 3})
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                Base.metadata.create_all(engine)
                logger.info("✅ All tables created successfully")
                engine.dispose()
                connected = True
                break
            except Exception as e:
                continue
        
        if not connected:
            logger.warning("⚠️ Could not create tables (database may need manual setup)")
            return False
        
        logger.info("\n🎉 Database setup complete!")
        logger.info("💡 You can now start the Vision Engine with full persistence")
        return True
        
    except Exception as e:
        logger.error(f"\n❌ Error setting up database: {e}")
        logger.error("\nThe system will continue without database (in-memory mode)")
        return False

if __name__ == "__main__":
    setup_database()

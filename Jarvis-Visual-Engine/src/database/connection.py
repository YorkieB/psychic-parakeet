"""Complete database connection management with async support"""
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import SQLAlchemyError, OperationalError, TimeoutError
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from typing import Generator, Optional, Dict, Any
import logging
from contextlib import asynccontextmanager, contextmanager
import asyncio
from datetime import datetime

from src.database.models import Base

logger = logging.getLogger(__name__)


class DatabaseConfig:
    """Database configuration from environment"""
    
    def __init__(self, database_url: str = None, **kwargs):
        """
        Initialize database configuration
        
        Args:
            database_url: Full PostgreSQL connection string
            **kwargs: Override individual settings
        """
        self.database_url = database_url or kwargs.get('database_url')
        self.echo = kwargs.get('echo', False)  # SQL logging
        self.pool_size = kwargs.get('pool_size', 10)
        self.max_overflow = kwargs.get('max_overflow', 20)
        self.pool_timeout = kwargs.get('pool_timeout', 30)
        self.pool_recycle = kwargs.get('pool_recycle', 3600)  # 1 hour
        self.pool_pre_ping = kwargs.get('pool_pre_ping', True)
        
        # Validate connection string
        if not self.database_url:
            raise ValueError("database_url is required")
        
        if not self.database_url.startswith(('postgresql://', 'postgresql+psycopg2://')):
            raise ValueError("database_url must be a PostgreSQL connection string")
    
    def get_async_url(self) -> str:
        """Convert to async connection URL"""
        if self.database_url.startswith('postgresql://'):
            return self.database_url.replace('postgresql://', 'postgresql+asyncpg://', 1)
        elif self.database_url.startswith('postgresql+psycopg2://'):
            return self.database_url.replace('postgresql+psycopg2://', 'postgresql+asyncpg://', 1)
        return self.database_url


class Database:
    """Database connection manager with sync and async support"""
    
    def __init__(self, config: DatabaseConfig):
        """
        Initialize database connection manager
        
        Args:
            config: DatabaseConfig instance
        """
        self.config = config
        self.engine = None
        self.async_engine = None
        self.SessionLocal = None
        self.AsyncSessionLocal = None
        self._connected = False
    
    def connect(self) -> bool:
        """
        Establish synchronous database connection
        
        Returns:
            True if connection successful
        """
        try:
            self.engine = create_engine(
                self.config.database_url,
                poolclass=QueuePool,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                pool_timeout=self.config.pool_timeout,
                pool_recycle=self.config.pool_recycle,
                pool_pre_ping=self.config.pool_pre_ping,
                echo=self.config.echo
            )
            
            # Create session factory
            self.SessionLocal = scoped_session(
                sessionmaker(
                    autocommit=False,
                    autoflush=False,
                    bind=self.engine
                )
            )
            
            # Test connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            self._connected = True
            logger.info(f"Database connected (pool_size={self.config.pool_size}, max_overflow={self.config.max_overflow})")
            return True
            
        except OperationalError as e:
            logger.error(f"Database connection failed (operational): {e}")
            self._connected = False
            raise
        except TimeoutError as e:
            logger.error(f"Database connection timeout: {e}")
            self._connected = False
            raise
        except SQLAlchemyError as e:
            logger.error(f"Database connection failed: {e}")
            self._connected = False
            raise
    
    async def initialize(self) -> bool:
        """
        Initialize async database connection
        
        Returns:
            True if initialization successful
        """
        try:
            async_url = self.config.get_async_url()
            
            self.async_engine = create_async_engine(
                async_url,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                pool_timeout=self.config.pool_timeout,
                pool_recycle=self.config.pool_recycle,
                pool_pre_ping=self.config.pool_pre_ping,
                echo=self.config.echo
            )
            
            # Create async session factory
            self.AsyncSessionLocal = async_sessionmaker(
                self.async_engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            # Test connection
            async with self.async_engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            
            self._connected = True
            logger.info("Async database connection initialized")
            return True
            
        except Exception as e:
            logger.error(f"Async database initialization failed: {e}")
            self._connected = False
            raise
    
    @contextmanager
    def session(self) -> Generator:
        """
        Get synchronous database session with automatic cleanup
        
        Yields:
            SQLAlchemy session
        """
        if not self._connected or not self.SessionLocal:
            raise RuntimeError("Database not connected. Call connect() first.")
        
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()
    
    @asynccontextmanager
    async def async_session(self):
        """
        Get async database session with automatic cleanup
        
        Yields:
            Async SQLAlchemy session
        """
        if not self._connected or not self.AsyncSessionLocal:
            raise RuntimeError("Database not initialized. Call initialize() first.")
        
        async with self.AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Async database session error: {e}")
                raise
    
    def create_tables(self):
        """Create all database tables"""
        if not self._connected or not self.engine:
            raise RuntimeError("Database not connected. Call connect() first.")
        
        try:
            Base.metadata.create_all(bind=self.engine)
            logger.info("Database tables created successfully")
        except SQLAlchemyError as e:
            logger.error(f"Failed to create tables: {e}")
            raise
    
    async def create_tables_async(self):
        """Create all database tables (async)"""
        if not self._connected or not self.async_engine:
            raise RuntimeError("Database not initialized. Call initialize() first.")
        
        try:
            async with self.async_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully (async)")
        except Exception as e:
            logger.error(f"Failed to create tables (async): {e}")
            raise
    
    def drop_tables(self):
        """Drop all database tables (use with caution!)"""
        if not self._connected or not self.engine:
            raise RuntimeError("Database not connected. Call connect() first.")
        
        try:
            Base.metadata.drop_all(bind=self.engine)
            logger.warning("All database tables dropped")
        except SQLAlchemyError as e:
            logger.error(f"Failed to drop tables: {e}")
            raise
    
    def reset_database(self):
        """Reset database (drop and recreate all tables) - for testing only"""
        if not self._connected or not self.engine:
            raise RuntimeError("Database not connected. Call connect() first.")
        
        logger.warning("Resetting database - all data will be lost!")
        self.drop_tables()
        self.create_tables()
        logger.info("Database reset complete")
    
    def health_check(self) -> bool:
        """
        Check if database connection is healthy
        
        Returns:
            True if connection is healthy
        """
        if not self._connected or not self.engine:
            return False
        
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except SQLAlchemyError:
            return False
    
    async def health_check_async(self) -> bool:
        """
        Check if async database connection is healthy
        
        Returns:
            True if connection is healthy
        """
        if not self._connected or not self.async_engine:
            return False
        
        try:
            async with self.async_engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False
    
    def close(self):
        """Close database connections"""
        if self.SessionLocal:
            self.SessionLocal.remove()
        
        if self.engine:
            self.engine.dispose()
        
        self._connected = False
        logger.info("Database connection closed")
    
    async def close_async(self):
        """Close async database connections"""
        if self.async_engine:
            await self.async_engine.dispose()
        
        self._connected = False
        logger.info("Async database connection closed")
    
    @property
    def is_connected(self) -> bool:
        """Check if database is connected"""
        return self._connected and self.health_check()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get database connection statistics"""
        if not self.engine:
            return {'connected': False}
        
        pool = self.engine.pool
        return {
            'connected': self._connected,
            'pool_size': pool.size(),
            'checked_in': pool.checkedin(),
            'checked_out': pool.checkedout(),
            'overflow': pool.overflow(),
            'invalid': pool.invalid()
        }
# Backward compatibility alias
DatabaseConnection = Database

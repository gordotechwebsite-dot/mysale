from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Use /data/app.db for persistent storage on Fly.io, fallback to local for development
# This provides 1GB of persistent storage that survives deployments and restarts
if os.path.exists("/data"):
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////data/app.db")
else:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mysale.db")

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # PostgreSQL configuration with connection pooling (for future migration)
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=300
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

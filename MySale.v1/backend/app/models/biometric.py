from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class BiometricEventType(str, enum.Enum):
    LOGIN = "login"
    CLOCK_IN = "clock_in"
    CLOCK_OUT = "clock_out"
    AUTHORIZATION = "authorization"
    VOID_SALE = "void_sale"
    DISCOUNT = "discount"


class Fingerprint(Base):
    __tablename__ = "fingerprints"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    finger_index = Column(Integer, nullable=False, default=1)  # 1-10 for each finger
    template = Column(Text, nullable=False)  # Base64 encoded fingerprint template
    quality_score = Column(Integer, nullable=True)
    is_primary = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="fingerprints")


class BiometricLog(Base):
    __tablename__ = "biometric_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    event_type = Column(SQLEnum(BiometricEventType), nullable=False)
    success = Column(Boolean, default=True)
    match_score = Column(Integer, nullable=True)
    ip_address = Column(String(50), nullable=True)
    device_info = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="biometric_logs")
    location = relationship("Location", backref="biometric_logs")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    clock_in = Column(DateTime, nullable=False)
    clock_out = Column(DateTime, nullable=True)
    clock_in_biometric_log_id = Column(Integer, ForeignKey("biometric_logs.id"), nullable=True)
    clock_out_biometric_log_id = Column(Integer, ForeignKey("biometric_logs.id"), nullable=True)
    total_hours = Column(Integer, nullable=True)  # Total minutes worked
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="attendance_records")
    location = relationship("Location", backref="attendance_records")
    clock_in_log = relationship("BiometricLog", foreign_keys=[clock_in_biometric_log_id])
    clock_out_log = relationship("BiometricLog", foreign_keys=[clock_out_biometric_log_id])

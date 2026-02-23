from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class ShiftStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"
    FORCE_CLOSED = "force_closed"


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)  # Sucursal
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)  # Made nullable for branch-only shifts
    start_at = Column(DateTime, default=datetime.utcnow)  # Renamed from start_time
    end_at = Column(DateTime, nullable=True)  # Renamed from end_time
    status = Column(SQLEnum(ShiftStatus), default=ShiftStatus.OPEN)
    opened_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Who opened the shift
    closed_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Renamed from closed_by_id
    # Cash-related fields (for cash register shifts)
    initial_cash = Column(Float, default=0.0)
    final_cash = Column(Float, nullable=True)
    total_sales = Column(Float, default=0.0)
    total_cash_sales = Column(Float, default=0.0)
    total_card_sales = Column(Float, default=0.0)
    total_transfer_sales = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    biometric_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="shifts")
    branch = relationship("Branch", backref="shifts")
    location = relationship("Location", back_populates="shifts")
    opener = relationship("User", foreign_keys=[opened_by], backref="shifts_opened")
    closer = relationship("User", foreign_keys=[closed_by], backref="shifts_closed")
    sales = relationship("Sale", back_populates="shift")
    cash_cuts = relationship("CashCut", back_populates="shift")


class AlertType(str, enum.Enum):
    SHIFT_CLOSE = "shift_close"
    LOW_STOCK = "low_stock"
    HIGH_STOCK = "high_stock"
    PERFORMANCE = "performance"


class ShiftAlert(Base):
    __tablename__ = "shift_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    alert_type = Column(SQLEnum(AlertType), nullable=False)
    message = Column(Text, nullable=False)
    points_affected = Column(Integer, default=0)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="alerts")

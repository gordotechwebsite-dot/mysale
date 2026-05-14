from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.timezone import now_colombia
import enum
from app.database import Base


class ShiftStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"
    CLOSED_BY_ADMIN = "closed_by_admin"


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    start_time = Column(DateTime, default=now_colombia)
    end_time = Column(DateTime, nullable=True)
    status = Column(SQLEnum(ShiftStatus), default=ShiftStatus.OPEN)
    initial_cash = Column(Float, default=0.0)
    final_cash = Column(Float, nullable=True)
    total_sales = Column(Float, default=0.0)
    total_cash_sales = Column(Float, default=0.0)
    total_card_sales = Column(Float, default=0.0)
    total_transfer_sales = Column(Float, default=0.0)
    closed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    biometric_verified = Column(Boolean, default=False)

    user = relationship("User", foreign_keys=[user_id], back_populates="shifts")
    location = relationship("Location", back_populates="shifts")
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
    created_at = Column(DateTime, default=now_colombia)

    user = relationship("User", back_populates="alerts")

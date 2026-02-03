from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class CostDistributionMethod(str, enum.Enum):
    PER_PRODUCT = "per_product"
    PER_UNIT_VALUE = "per_unit_value"
    PERCENTAGE = "percentage"


class CostEntryCategory(str, enum.Enum):
    RENT = "rent"
    UTILITIES = "utilities"
    SALARY = "salary"
    TRANSPORT = "transport"
    MAINTENANCE = "maintenance"
    INSURANCE = "insurance"
    TAXES = "taxes"
    OTHER = "other"


class CostEntry(Base):
    __tablename__ = "cost_entries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    category = Column(SQLEnum(CostEntryCategory), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    is_recurring = Column(Boolean, default=False)
    recurrence_period = Column(String(20), nullable=True)
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CostConfig(Base):
    __tablename__ = "cost_configs"

    id = Column(Integer, primary_key=True, index=True)
    distribution_method = Column(SQLEnum(CostDistributionMethod), default=CostDistributionMethod.PER_PRODUCT)
    percentage_value = Column(Float, default=0.0)
    is_auto_apply = Column(Boolean, default=False)
    last_applied_at = Column(DateTime, nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CostApplication(Base):
    __tablename__ = "cost_applications"

    id = Column(Integer, primary_key=True, index=True)
    total_cost = Column(Float, nullable=False)
    product_count = Column(Integer, nullable=False)
    cost_per_product = Column(Float, nullable=False)
    distribution_method = Column(SQLEnum(CostDistributionMethod), nullable=False)
    applied_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    applied_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

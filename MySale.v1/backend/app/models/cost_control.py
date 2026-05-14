from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.timezone import now_colombia
import enum
from app.database import Base


class CostEntryCategory(str, enum.Enum):
    RENT = "rent"
    UTILITIES = "utilities"
    SALARIES = "salaries"
    SUPPLIES = "supplies"
    MAINTENANCE = "maintenance"
    MARKETING = "marketing"
    INSURANCE = "insurance"
    TAXES = "taxes"
    OTHER = "other"


class CostDistributionMethod(str, enum.Enum):
    PER_PRODUCT = "per_product"
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class CostEntry(Base):
    __tablename__ = "cost_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    category = Column(Enum(CostEntryCategory), default=CostEntryCategory.OTHER)
    amount = Column(Float, nullable=False, default=0.0)
    is_recurring = Column(Boolean, default=False)
    recurrence_period = Column(String(50))
    start_date = Column(DateTime, default=now_colombia)
    end_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=now_colombia)
    updated_at = Column(DateTime, default=now_colombia, onupdate=now_colombia)


class CostConfig(Base):
    __tablename__ = "cost_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    distribution_method = Column(Enum(CostDistributionMethod), default=CostDistributionMethod.PER_PRODUCT)
    percentage_value = Column(Float, default=0.0)
    is_auto_apply = Column(Boolean, default=False)
    last_applied_at = Column(DateTime, nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=now_colombia)
    updated_at = Column(DateTime, default=now_colombia, onupdate=now_colombia)


class CostApplication(Base):
    __tablename__ = "cost_applications"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    total_cost = Column(Float, nullable=False)
    product_count = Column(Integer, nullable=False)
    cost_per_product = Column(Float, nullable=False)
    distribution_method = Column(Enum(CostDistributionMethod), default=CostDistributionMethod.PER_PRODUCT)
    applied_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    applied_at = Column(DateTime, default=now_colombia)
    notes = Column(Text)

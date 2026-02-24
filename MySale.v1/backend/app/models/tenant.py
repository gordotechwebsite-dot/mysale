from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


class PaymentStatus(enum.Enum):
    ACTIVE = "active"
    PENDING = "pending"
    OVERDUE = "overdue"
    SUSPENDED = "suspended"


class Module(Base):
    __tablename__ = "modules"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)
    route = Column(String(100), nullable=True)
    display_order = Column(Integer, default=0)
    is_core = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    subdomain = Column(String(100), unique=True, nullable=True)
    logo_url = Column(String(500), nullable=True)
    primary_color = Column(String(20), default="#10b981")
    contact_name = Column(String(200), nullable=True)
    contact_email = Column(String(200), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.ACTIVE)
    payment_due_date = Column(DateTime, nullable=True)
    monthly_fee = Column(Float, default=0)
    notes = Column(Text, nullable=True)
    pos_url = Column(String(500), nullable=True)
    pos_username = Column(String(100), nullable=True)
    pos_password = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    modules = relationship("TenantModule", back_populates="tenant")
    payments = relationship("TenantPayment", back_populates="tenant")


class TenantModule(Base):
    __tablename__ = "tenant_modules"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    is_enabled = Column(Boolean, default=True)
    enabled_at = Column(DateTime, default=datetime.utcnow)
    disabled_at = Column(DateTime, nullable=True)
    
    tenant = relationship("Tenant", back_populates="modules")
    module = relationship("Module")


class TenantPayment(Base):
    __tablename__ = "tenant_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_date = Column(DateTime, default=datetime.utcnow)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    payment_method = Column(String(50), nullable=True)
    reference = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    tenant = relationship("Tenant", back_populates="payments")

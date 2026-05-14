from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.timezone import now_colombia
import enum
from app.database import Base


class RoleType(str, enum.Enum):
    SUPERUSER = "superuser"
    ADMIN = "admin"
    CASHIER = "cashier"
    WAITER = "waiter"


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String(50), nullable=False)
    role_type = Column(SQLEnum(RoleType), nullable=False)
    can_void_sales = Column(Boolean, default=False)
    can_manage_inventory = Column(Boolean, default=False)
    can_manage_users = Column(Boolean, default=False)
    can_view_reports = Column(Boolean, default=False)
    can_manage_locations = Column(Boolean, default=False)
    can_set_stock_thresholds = Column(Boolean, default=False)
    can_close_shifts = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now_colombia)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    employee_code = Column(String(20), nullable=True, index=True)
    username = Column(String(50), nullable=False, index=True)
    email = Column(String(100), nullable=True)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    cedula = Column(String(20), nullable=True, index=True)
    photo_url = Column(String(500), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    pin_hash = Column(String(255), nullable=True)
    pin = Column(String(10), nullable=True)
    fingerprint_hash = Column(String(255), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    default_branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    points = Column(Integer, default=0)
    created_at = Column(DateTime, default=now_colombia)
    updated_at = Column(DateTime, default=now_colombia, onupdate=now_colombia)

    role = relationship("Role", back_populates="users")
    location = relationship("Location", back_populates="users")
    default_branch = relationship("Branch", back_populates="employees", foreign_keys=[default_branch_id])
    work_sessions = relationship("WorkSession", back_populates="user")
    shifts = relationship("Shift", foreign_keys="[Shift.user_id]", back_populates="user")
    sales = relationship("Sale", back_populates="cashier")
    losses_reported = relationship("Loss", back_populates="reported_by_user")
    alerts = relationship("ShiftAlert", back_populates="user")
    user_modules = relationship("UserModule", back_populates="user", cascade="all, delete-orphan")


class UserModule(Base):
    __tablename__ = "user_modules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_colombia)

    user = relationship("User", back_populates="user_modules")
    module = relationship("Module")

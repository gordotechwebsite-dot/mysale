from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.timezone import now_colombia
from app.database import Base


class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String(200), nullable=False)
    code = Column(String(50), nullable=False)
    city = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_colombia)
    updated_at = Column(DateTime, default=now_colombia, onupdate=now_colombia)

    tenant = relationship("Tenant", backref="branches")
    employees = relationship("User", back_populates="default_branch", foreign_keys="User.default_branch_id")
    work_sessions = relationship("WorkSession", back_populates="branch")


class WorkSession(Base):
    """Tracks employee work sessions (clock in/out) at branches"""
    __tablename__ = "work_sessions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    clock_in = Column(DateTime, nullable=False, default=now_colombia)
    clock_out = Column(DateTime, nullable=True)
    total_minutes = Column(Integer, nullable=True)  # Calculated on clock out
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now_colombia)
    updated_at = Column(DateTime, default=now_colombia, onupdate=now_colombia)

    user = relationship("User", back_populates="work_sessions")
    branch = relationship("Branch", back_populates="work_sessions")

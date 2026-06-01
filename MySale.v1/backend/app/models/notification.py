from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.timezone import now_colombia
import enum

from app.database import Base


class NotificationType(str, enum.Enum):
    SYSTEM = "system"
    CUSTOM = "custom"
    PAYMENT_REMINDER = "payment_reminder"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(SQLEnum(NotificationType), default=NotificationType.CUSTOM)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=now_colombia)

    tenant = relationship("Tenant")
    created_by = relationship("User")

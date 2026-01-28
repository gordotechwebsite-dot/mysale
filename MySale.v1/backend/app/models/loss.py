from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class LossType(str, enum.Enum):
    BREAKAGE = "breakage"
    EXPIRATION = "expiration"
    THEFT = "theft"
    DAMAGE = "damage"
    OTHER = "other"


class Loss(Base):
    __tablename__ = "losses"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    reported_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    loss_type = Column(SQLEnum(LossType), nullable=False)
    total_value = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    location = relationship("Location", back_populates="losses")
    reported_by_user = relationship("User", back_populates="losses_reported")
    items = relationship("LossItem", back_populates="loss")


class LossItem(Base):
    __tablename__ = "loss_items"

    id = Column(Integer, primary_key=True, index=True)
    loss_id = Column(Integer, ForeignKey("losses.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_cost = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)
    reason = Column(Text, nullable=True)

    loss = relationship("Loss", back_populates="items")
    product = relationship("Product", back_populates="loss_items")

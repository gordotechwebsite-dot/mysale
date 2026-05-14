from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.timezone import now_colombia
import enum
from app.database import Base


class TransferStatus(str, enum.Enum):
    PENDING = "pending"
    IN_TRANSIT = "in_transit"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, index=True)
    from_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    to_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    received_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(SQLEnum(TransferStatus), default=TransferStatus.PENDING)
    total_value_at_sale_price = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now_colombia)
    completed_at = Column(DateTime, nullable=True)

    from_location = relationship("Location", foreign_keys=[from_location_id], back_populates="transfers_out")
    to_location = relationship("Location", foreign_keys=[to_location_id], back_populates="transfers_in")
    items = relationship("TransferItem", back_populates="transfer")


class TransferItem(Base):
    __tablename__ = "transfer_items"

    id = Column(Integer, primary_key=True, index=True)
    transfer_id = Column(Integer, ForeignKey("transfers.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    sale_price = Column(Float, nullable=False)
    total_value = Column(Float, nullable=False)

    transfer = relationship("Transfer", back_populates="items")
    product = relationship("Product", back_populates="transfer_items")

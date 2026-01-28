from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class LocationType(str, enum.Enum):
    POS = "pos"
    WAREHOUSE = "warehouse"


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    location_type = Column(SQLEnum(LocationType), nullable=False)
    address = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    daily_base_cash = Column(Integer, default=100000)
    folio_prefix = Column(String(10), nullable=True)
    folio_counter = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="location")
    product_stocks = relationship("ProductStock", back_populates="location")
    shifts = relationship("Shift", back_populates="location")
    sales = relationship("Sale", back_populates="location")
    cash_registers = relationship("CashRegister", back_populates="location")
    losses = relationship("Loss", back_populates="location")
    transfers_out = relationship("Transfer", foreign_keys="Transfer.from_location_id", back_populates="from_location")
    transfers_in = relationship("Transfer", foreign_keys="Transfer.to_location_id", back_populates="to_location")

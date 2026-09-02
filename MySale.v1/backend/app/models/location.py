from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.timezone import now_colombia
import enum
from app.database import Base


class LocationType(str, enum.Enum):
    POS = "pos"
    WAREHOUSE = "warehouse"


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False)
    location_type = Column(SQLEnum(LocationType), nullable=False)
    address = Column(String(255), nullable=True)
    image_url = Column(String(500), nullable=True)
    receipt_logo_url = Column(String(500), nullable=True)
    receipt_business_name = Column(String(100), nullable=True)
    receipt_razon_social = Column(String(150), nullable=True)
    receipt_nit = Column(String(50), nullable=True)
    receipt_slogan = Column(String(200), nullable=True)
    receipt_address = Column(String(255), nullable=True)
    receipt_phone = Column(String(50), nullable=True)
    receipt_email = Column(String(120), nullable=True)
    is_active = Column(Boolean, default=True)
    daily_base_cash = Column(Integer, default=100000)
    has_own_menu = Column(Boolean, default=False, nullable=False)
    folio_prefix = Column(String(10), nullable=True)
    folio_counter = Column(Integer, default=0)
    created_at = Column(DateTime, default=now_colombia)

    users = relationship("User", back_populates="location")
    product_stocks = relationship("ProductStock", back_populates="location")
    shifts = relationship("Shift", back_populates="location")
    sales = relationship("Sale", back_populates="location")
    cash_registers = relationship("CashRegister", back_populates="location")
    losses = relationship("Loss", back_populates="location")
    transfers_out = relationship("Transfer", foreign_keys="Transfer.from_location_id", back_populates="from_location")
    transfers_in = relationship("Transfer", foreign_keys="Transfer.to_location_id", back_populates="to_location")

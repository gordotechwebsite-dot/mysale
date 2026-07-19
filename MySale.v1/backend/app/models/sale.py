from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.timezone import now_colombia
import enum
from app.database import Base


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    TRANSFER = "transfer"
    NEQUI = "nequi"
    BREB = "breb"


class SaleType(str, enum.Enum):
    REGULAR = "regular"
    DELIVERY = "delivery"
    TABLE = "table"


class DeliveryStatus(str, enum.Enum):
    PENDING = "pending"
    PREPARING = "preparing"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    folio = Column(String(50), unique=True, nullable=False, index=True)
    client_uuid = Column(String(64), unique=True, nullable=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=False)
    cashier_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subtotal = Column(Float, nullable=False)
    tax = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total = Column(Float, nullable=False)
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False)
    amount_received = Column(Float, nullable=True)
    change_given = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    sale_type = Column(SQLEnum(SaleType), default=SaleType.REGULAR)
    customer_name = Column(String(200), nullable=True)
    customer_phone = Column(String(50), nullable=True)
    customer_address = Column(Text, nullable=True)
    delivery_person = Column(String(200), nullable=True)
    delivery_fee = Column(Float, default=0.0)
    delivery_status = Column(SQLEnum(DeliveryStatus), nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=now_colombia)

    location = relationship("Location", back_populates="sales")
    shift = relationship("Shift", back_populates="sales")
    cashier = relationship("User", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    cost_at_sale = Column(Float, nullable=True)
    discount = Column(Float, default=0.0)
    subtotal = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")

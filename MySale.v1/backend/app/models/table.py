from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class TableStatus(str, enum.Enum):
    FREE = "free"
    OCCUPIED = "occupied"
    BILL_OPEN = "bill_open"
    TO_PAY = "to_pay"
    PAID = "paid"


class TableShape(str, enum.Enum):
    SQUARE = "square"
    ROUND = "round"
    RECTANGLE = "rectangle"


class TicketStatus(str, enum.Enum):
    OPEN = "open"
    TO_PAY = "to_pay"
    PAID = "paid"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class TicketItemStatus(str, enum.Enum):
    ORDERED = "ordered"
    IN_PREPARATION = "in_preparation"
    READY = "ready"
    SERVED = "served"
    CANCELLED = "cancelled"


class ComandaArea(str, enum.Enum):
    KITCHEN = "kitchen"
    BAR = "bar"
    BOTH = "both"


class ComandaStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PREPARATION = "in_preparation"
    READY = "ready"
    DELIVERED = "delivered"


class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(20), default="#4ade80")
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tables = relationship("Table", back_populates="zone")


class Table(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    capacity = Column(Integer, default=4)
    shape = Column(SQLEnum(TableShape), default=TableShape.SQUARE)
    status = Column(SQLEnum(TableStatus), default=TableStatus.FREE)
    position_x = Column(Float, default=0)
    position_y = Column(Float, default=0)
    width = Column(Float, default=100)
    height = Column(Float, default=100)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    zone = relationship("Zone", back_populates="tables")
    tickets = relationship("Ticket", back_populates="table")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    waiter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    customer_name = Column(String(100), nullable=True)
    num_people = Column(Integer, default=1)
    notes = Column(Text, nullable=True)
    status = Column(SQLEnum(TicketStatus), default=TicketStatus.OPEN)
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    tip = Column(Float, default=0.0)
    service_charge = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    opened_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    table = relationship("Table", back_populates="tickets")
    items = relationship("TicketItem", back_populates="ticket")
    comandas = relationship("Comanda", back_populates="ticket")
    payments = relationship("TicketPayment", back_populates="ticket")


class TicketItem(Base):
    __tablename__ = "ticket_items"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    comanda_id = Column(Integer, ForeignKey("comandas.id"), nullable=True)
    quantity = Column(Float, default=1)
    unit_price = Column(Float, nullable=False)
    discount = Column(Float, default=0.0)
    subtotal = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(SQLEnum(TicketItemStatus), default=TicketItemStatus.ORDERED)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("Ticket", back_populates="items")
    comanda = relationship("Comanda", back_populates="items")


class Comanda(Base):
    __tablename__ = "comandas"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    area = Column(SQLEnum(ComandaArea), default=ComandaArea.KITCHEN)
    status = Column(SQLEnum(ComandaStatus), default=ComandaStatus.PENDING)
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    ticket = relationship("Ticket", back_populates="comandas")
    items = relationship("TicketItem", back_populates="comanda")


class TicketPayment(Base):
    __tablename__ = "ticket_payments"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    payment_method = Column(String(20), nullable=False)
    amount = Column(Float, nullable=False)
    reference = Column(String(100), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("Ticket", back_populates="payments")

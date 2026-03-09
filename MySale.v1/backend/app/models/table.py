from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class TableStatus(str, enum.Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"
    CLEANING = "cleaning"
    BILL_OPEN = "bill_open"


class TableShape(str, enum.Enum):
    SQUARE = "square"
    ROUND = "round"
    RECTANGLE = "rectangle"


class TicketStatus(str, enum.Enum):
    OPEN = "open"
    TO_PAY = "to_pay"
    CLOSED = "closed"
    CANCELLED = "cancelled"
    PAID = "paid"


class TicketItemStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    PREPARING = "preparing"
    READY = "ready"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class ComandaArea(str, enum.Enum):
    KITCHEN = "kitchen"
    BAR = "bar"
    GRILL = "grill"
    DESSERTS = "desserts"


class ComandaStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PREPARATION = "in_preparation"
    READY = "ready"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class Zone(Base):
    __tablename__ = "zones"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    color = Column(String(20), default="#4ade80")
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    tables = relationship("Table", back_populates="zone")


class Table(Base):
    __tablename__ = "tables"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    name = Column(String(50), nullable=False)
    capacity = Column(Integer, default=4)
    shape = Column(Enum(TableShape), default=TableShape.SQUARE)
    status = Column(Enum(TableStatus), default=TableStatus.AVAILABLE)
    position_x = Column(Integer, default=0)
    position_y = Column(Integer, default=0)
    width = Column(Integer, default=100)
    height = Column(Integer, default=100)
    rotation = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    zone = relationship("Zone", back_populates="tables")
    tickets = relationship("Ticket", back_populates="table")


class Ticket(Base):
    __tablename__ = "tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    waiter_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    customer_name = Column(String(100))
    num_people = Column(Integer, default=1)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN)
    subtotal = Column(Float, default=0)
    tax = Column(Float, default=0)
    tip = Column(Float, default=0)
    service_charge = Column(Float, default=0)
    discount = Column(Float, default=0)
    total = Column(Float, default=0)
    notes = Column(Text)
    opened_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    table = relationship("Table", back_populates="tickets")
    items = relationship("TicketItem", back_populates="ticket")
    payments = relationship("TicketPayment", back_populates="ticket")
    comandas = relationship("Comanda", back_populates="ticket")


class TicketItem(Base):
    __tablename__ = "ticket_items"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    comanda_id = Column(Integer, ForeignKey("comandas.id"), nullable=True)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    discount = Column(Float, default=0)
    subtotal = Column(Float, nullable=False)
    notes = Column(Text)
    status = Column(Enum(TicketItemStatus), default=TicketItemStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    ticket = relationship("Ticket", back_populates="items")
    product = relationship("Product")


class Comanda(Base):
    __tablename__ = "comandas"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    area = Column(Enum(ComandaArea), default=ComandaArea.KITCHEN)
    status = Column(Enum(ComandaStatus), default=ComandaStatus.PENDING)
    notes = Column(Text)
    is_printed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    ticket = relationship("Ticket", back_populates="comandas")


class TicketPayment(Base):
    __tablename__ = "ticket_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    payment_method = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    reference = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    ticket = relationship("Ticket", back_populates="payments")

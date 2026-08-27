from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.timezone import now_colombia
import enum
from app.database import Base


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_colombia)

    families = relationship("Family", back_populates="group")


class Family(Base):
    __tablename__ = "families"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String(100), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    icon = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_colombia)

    group = relationship("Group", back_populates="families")
    subfamilies = relationship("SubFamily", back_populates="family")


class SubFamily(Base):
    __tablename__ = "subfamilies"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String(100), nullable=False)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_colombia)

    family = relationship("Family", back_populates="subfamilies")
    products = relationship("Product", back_populates="subfamily")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    barcode = Column(String(50), unique=True, nullable=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    subfamily_id = Column(Integer, ForeignKey("subfamilies.id"), nullable=False)
    unit = Column(String(20), default="unidad")
    sale_price = Column(Float, nullable=False)
    weighted_cost = Column(Float, default=0.0)
    min_stock = Column(Integer, default=0)
    max_stock = Column(Integer, default=1000)
    is_active = Column(Boolean, default=True)
    is_sold_out = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=now_colombia)
    updated_at = Column(DateTime, default=now_colombia, onupdate=now_colombia)

    subfamily = relationship("SubFamily", back_populates="products")
    stocks = relationship("ProductStock", back_populates="product")
    stock_movements = relationship("StockMovement", back_populates="product")
    sale_items = relationship("SaleItem", back_populates="product")
    loss_items = relationship("LossItem", back_populates="product")
    transfer_items = relationship("TransferItem", back_populates="product")
    modifiers = relationship("ProductModifier", back_populates="product", order_by="ProductModifier.display_order")


class ProductModifier(Base):
    __tablename__ = "product_modifiers"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String(200), nullable=False)
    price_adjustment = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=now_colombia)

    product = relationship("Product", back_populates="modifiers")


class ProductStock(Base):
    __tablename__ = "product_stocks"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    quantity = Column(Float, default=0.0)
    last_inventory_date = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=now_colombia, onupdate=now_colombia)

    product = relationship("Product", back_populates="stocks")
    location = relationship("Location", back_populates="product_stocks")


class MovementType(str, enum.Enum):
    PURCHASE = "purchase"
    SALE = "sale"
    TRANSFER_IN = "transfer_in"
    TRANSFER_OUT = "transfer_out"
    LOSS = "loss"
    ADJUSTMENT = "adjustment"
    INVENTORY = "inventory"


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    movement_type = Column(SQLEnum(MovementType), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_cost = Column(Float, nullable=True)
    reference_id = Column(Integer, nullable=True)
    reference_type = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=now_colombia)

    product = relationship("Product", back_populates="stock_movements")

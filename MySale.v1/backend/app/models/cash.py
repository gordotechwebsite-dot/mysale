from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.timezone import now_colombia
from app.database import Base


class CashRegister(Base):
    __tablename__ = "cash_registers"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    name = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_colombia)

    location = relationship("Location", back_populates="cash_registers")


class CashCut(Base):
    __tablename__ = "cash_cuts"

    id = Column(Integer, primary_key=True, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    expected_cash = Column(Float, nullable=False)
    declared_cash = Column(Float, nullable=False)
    difference = Column(Float, nullable=False)
    is_blind = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now_colombia)

    shift = relationship("Shift", back_populates="cash_cuts")
    denominations = relationship("CashDenomination", back_populates="cash_cut")


class CashClose(Base):
    __tablename__ = "cash_closes"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    close_date = Column(DateTime, nullable=False)
    total_sales = Column(Float, default=0.0)
    total_cash_sales = Column(Float, default=0.0)
    total_card_sales = Column(Float, default=0.0)
    total_transfer_sales = Column(Float, default=0.0)
    total_transactions = Column(Integer, default=0)
    base_amount = Column(Float, default=0.0)
    expected_cash = Column(Float, default=0.0)
    declared_cash = Column(Float, default=0.0)
    difference = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now_colombia)

    location = relationship("Location")
    user = relationship("User")


class CashDenomination(Base):
    __tablename__ = "cash_denominations"

    id = Column(Integer, primary_key=True, index=True)
    cash_cut_id = Column(Integer, ForeignKey("cash_cuts.id"), nullable=False)
    denomination = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    total = Column(Float, nullable=False)

    cash_cut = relationship("CashCut", back_populates="denominations")

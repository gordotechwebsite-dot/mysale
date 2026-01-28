from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class ExpenseCategory(str, enum.Enum):
    PURCHASE = "purchase"
    UTILITIES = "utilities"
    RENT = "rent"
    SALARY = "salary"
    MAINTENANCE = "maintenance"
    SUPPLIES = "supplies"
    OTHER = "other"


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    category = Column(SQLEnum(ExpenseCategory), nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Float, nullable=False)
    invoice_number = Column(String(100), nullable=True)
    supplier = Column(String(200), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    expense_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

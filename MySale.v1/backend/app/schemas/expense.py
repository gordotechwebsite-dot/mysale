from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.expense import ExpenseCategory


class ExpenseCreate(BaseModel):
    location_id: Optional[int] = None
    category: ExpenseCategory
    description: str
    amount: float
    invoice_number: Optional[str] = None
    supplier: Optional[str] = None
    expense_date: Optional[datetime] = None


class ExpenseResponse(BaseModel):
    id: int
    location_id: Optional[int]
    location_name: Optional[str] = None
    category: ExpenseCategory
    description: str
    amount: float
    invoice_number: Optional[str]
    supplier: Optional[str]
    created_by_id: int
    created_by_name: Optional[str] = None
    expense_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True

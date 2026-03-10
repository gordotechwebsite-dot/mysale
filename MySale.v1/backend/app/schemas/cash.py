from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CashDenominationCreate(BaseModel):
    denomination: float
    quantity: int


class CashCutCreate(BaseModel):
    shift_id: int
    denominations: List[CashDenominationCreate]
    notes: Optional[str] = None


class CashDenominationResponse(BaseModel):
    id: int
    denomination: float
    quantity: int
    total: float

    class Config:
        from_attributes = True


class CashCutResponse(BaseModel):
    id: int
    shift_id: int
    user_id: int
    expected_cash: float
    declared_cash: float
    difference: float
    is_blind: bool
    notes: Optional[str]
    created_at: datetime
    denominations: List[CashDenominationResponse] = []

    class Config:
        from_attributes = True


class CashCloseCreate(BaseModel):
    location_id: int
    close_date: str
    total_sales: float = 0.0
    total_cash_sales: float = 0.0
    total_card_sales: float = 0.0
    total_transfer_sales: float = 0.0
    total_transactions: int = 0
    base_amount: float = 0.0
    expected_cash: float = 0.0
    declared_cash: float = 0.0
    difference: float = 0.0
    notes: Optional[str] = None


class CashCloseResponse(BaseModel):
    id: int
    location_id: int
    user_id: int
    close_date: datetime
    total_sales: float
    total_cash_sales: float
    total_card_sales: float
    total_transfer_sales: float
    total_transactions: int
    base_amount: float
    expected_cash: float
    declared_cash: float
    difference: float
    notes: Optional[str]
    created_at: datetime
    location_name: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

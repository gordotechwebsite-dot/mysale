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

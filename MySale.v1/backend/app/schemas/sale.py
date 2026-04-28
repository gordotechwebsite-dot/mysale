from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.sale import PaymentMethod


class SaleItemCreate(BaseModel):
    product_id: int
    quantity: float
    discount: float = 0.0


class SaleCreate(BaseModel):
    payment_method: PaymentMethod
    items: List[SaleItemCreate]
    amount_received: Optional[float] = None
    notes: Optional[str] = None
    location_id: Optional[int] = None


class SaleItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    quantity: float
    unit_price: float
    discount: float
    subtotal: float

    class Config:
        from_attributes = True


class SaleResponse(BaseModel):
    id: int
    folio: str
    location_id: int
    location_name: Optional[str] = None
    shift_id: int
    cashier_id: int
    cashier_name: Optional[str] = None
    subtotal: float
    tax: float
    discount: float
    total: float
    payment_method: PaymentMethod
    amount_received: Optional[float]
    change_given: Optional[float]
    notes: Optional[str]
    created_at: datetime
    items: List[SaleItemResponse] = []

    class Config:
        from_attributes = True

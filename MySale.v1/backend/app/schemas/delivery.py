from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.sale import PaymentMethod, SaleType, DeliveryStatus


class DeliveryItemCreate(BaseModel):
    product_id: int
    quantity: float
    discount: float = 0.0


class DeliveryCreate(BaseModel):
    payment_method: PaymentMethod
    items: List[DeliveryItemCreate]
    customer_name: str
    customer_phone: str
    customer_address: str
    delivery_person: Optional[str] = None
    delivery_fee: float = 0.0
    amount_received: Optional[float] = None
    notes: Optional[str] = None


class DeliveryUpdateStatus(BaseModel):
    delivery_status: DeliveryStatus
    delivery_person: Optional[str] = None


class DeliveryItemResponse(BaseModel):
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


class DeliveryResponse(BaseModel):
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
    delivery_fee: float
    grand_total: float
    payment_method: PaymentMethod
    amount_received: Optional[float] = None
    change_given: Optional[float] = None
    notes: Optional[str] = None
    sale_type: SaleType
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    delivery_person: Optional[str] = None
    delivery_status: Optional[DeliveryStatus] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime
    items: List[DeliveryItemResponse] = []

    class Config:
        from_attributes = True

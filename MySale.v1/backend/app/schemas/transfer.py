from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.transfer import TransferStatus


class TransferItemCreate(BaseModel):
    product_id: int
    quantity: float


class TransferCreate(BaseModel):
    from_location_id: int
    to_location_id: int
    items: List[TransferItemCreate]
    notes: Optional[str] = None


class TransferReceive(BaseModel):
    notes: Optional[str] = None


class TransferItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    quantity: float
    sale_price: float
    total_value: float

    class Config:
        from_attributes = True


class TransferResponse(BaseModel):
    id: int
    from_location_id: int
    from_location_name: Optional[str] = None
    to_location_id: int
    to_location_name: Optional[str] = None
    created_by_id: int
    created_by_name: Optional[str] = None
    received_by_id: Optional[int]
    received_by_name: Optional[str] = None
    status: TransferStatus
    total_value_at_sale_price: float
    notes: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]
    items: List[TransferItemResponse] = []

    class Config:
        from_attributes = True

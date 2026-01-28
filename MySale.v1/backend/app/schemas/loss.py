from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.loss import LossType


class LossItemCreate(BaseModel):
    product_id: int
    quantity: float
    reason: Optional[str] = None


class LossCreate(BaseModel):
    location_id: int
    loss_type: LossType
    description: Optional[str] = None
    items: List[LossItemCreate]


class LossItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    quantity: float
    unit_cost: float
    total_cost: float
    reason: Optional[str]

    class Config:
        from_attributes = True


class LossResponse(BaseModel):
    id: int
    location_id: int
    location_name: Optional[str] = None
    reported_by: int
    reported_by_name: Optional[str] = None
    loss_type: LossType
    total_value: float
    description: Optional[str]
    created_at: datetime
    items: List[LossItemResponse] = []

    class Config:
        from_attributes = True

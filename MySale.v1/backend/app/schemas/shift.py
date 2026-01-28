from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.shift import ShiftStatus, AlertType


class ShiftCreate(BaseModel):
    location_id: int
    initial_cash: float = 0.0
    biometric_verified: bool = False


class ShiftClose(BaseModel):
    final_cash: Optional[float] = None
    notes: Optional[str] = None


class ShiftResponse(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    location_id: int
    location_name: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime]
    status: ShiftStatus
    initial_cash: float
    final_cash: Optional[float]
    total_sales: float
    total_cash_sales: float
    total_card_sales: float
    total_transfer_sales: float
    biometric_verified: bool

    class Config:
        from_attributes = True


class ShiftAlertCreate(BaseModel):
    user_id: int
    alert_type: AlertType
    message: str
    points_affected: int = 0


class ShiftAlertResponse(BaseModel):
    id: int
    user_id: int
    alert_type: AlertType
    message: str
    points_affected: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

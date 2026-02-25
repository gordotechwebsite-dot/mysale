from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.shift import ShiftStatus, AlertType


# Shift schemas for attendance (turnos de asistencia)
class ShiftStartRequest(BaseModel):
    branch_id: int
    pin: str = Field(..., min_length=4, max_length=6, description="PIN de 4-6 digitos")


class ShiftEndRequest(BaseModel):
    branch_id: int
    pin: str = Field(..., min_length=4, max_length=6, description="PIN de 4-6 digitos")


class ShiftForceCloseRequest(BaseModel):
    shift_id: int
    reason: str


# Legacy shift schemas for cash register (turnos de caja)
class ShiftCreate(BaseModel):
    location_id: Optional[int] = None
    branch_id: Optional[int] = None
    initial_cash: float = 0.0
    biometric_verified: bool = False


class ShiftClose(BaseModel):
    final_cash: Optional[float] = None
    notes: Optional[str] = None


class ShiftResponse(BaseModel):
    id: int
    tenant_id: Optional[int] = None
    branch_id: Optional[int] = None
    branch_name: Optional[str] = None
    user_id: int
    user_name: Optional[str] = None
    location_id: Optional[int] = None
    location_name: Optional[str] = None
    start_at: datetime
    end_at: Optional[datetime] = None
    status: ShiftStatus
    opened_by: Optional[int] = None
    opened_by_name: Optional[str] = None
    closed_by: Optional[int] = None
    closed_by_name: Optional[str] = None
    initial_cash: float = 0.0
    final_cash: Optional[float] = None
    total_sales: float = 0.0
    total_cash_sales: float = 0.0
    total_card_sales: float = 0.0
    total_transfer_sales: float = 0.0
    notes: Optional[str] = None
    biometric_verified: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ShiftListResponse(BaseModel):
    shifts: List[ShiftResponse]
    total: int


class MyShiftResponse(BaseModel):
    has_open_shift: bool
    shift: Optional[ShiftResponse] = None


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

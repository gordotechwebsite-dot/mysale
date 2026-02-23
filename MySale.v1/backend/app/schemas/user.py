from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import RoleType


class RoleCreate(BaseModel):
    name: str
    role_type: RoleType
    can_void_sales: bool = False
    can_manage_inventory: bool = False
    can_manage_users: bool = False
    can_view_reports: bool = False
    can_manage_locations: bool = False
    can_set_stock_thresholds: bool = False
    can_close_shifts: bool = False


class RoleResponse(BaseModel):
    id: int
    name: str
    role_type: RoleType
    can_void_sales: bool
    can_manage_inventory: bool
    can_manage_users: bool
    can_view_reports: bool
    can_manage_locations: bool
    can_set_stock_thresholds: bool
    can_close_shifts: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: str
    password: str
    pin: Optional[str] = None  # PIN de 4-6 digitos para turnos
    role_id: int
    location_id: Optional[int] = None
    employee_code: Optional[str] = None
    default_branch_id: Optional[int] = None


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role_id: Optional[int] = None
    location_id: Optional[int] = None
    is_active: Optional[bool] = None
    fingerprint_hash: Optional[str] = None
    pin: Optional[str] = None  # PIN de 4-6 digitos para turnos
    employee_code: Optional[str] = None
    default_branch_id: Optional[int] = None


class SetPinRequest(BaseModel):
    pin: str  # PIN de 4-6 digitos


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str]
    full_name: str
    role_id: int
    role: Optional[RoleResponse] = None
    location_id: Optional[int]
    tenant_id: Optional[int] = None
    employee_code: Optional[str] = None
    default_branch_id: Optional[int] = None
    is_active: bool
    points: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


class BiometricLogin(BaseModel):
    fingerprint_hash: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None

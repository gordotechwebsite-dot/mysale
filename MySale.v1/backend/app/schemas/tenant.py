from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ModuleBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    route: Optional[str] = None
    display_order: Optional[int] = 0
    is_core: Optional[bool] = False


class ModuleCreate(ModuleBase):
    pass


class ModuleUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    route: Optional[str] = None
    display_order: Optional[int] = None
    is_core: Optional[bool] = None
    is_active: Optional[bool] = None


class ModuleResponse(ModuleBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TenantBase(BaseModel):
    name: str
    code: str
    subdomain: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = "#10b981"
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    monthly_fee: Optional[float] = 0
    notes: Optional[str] = None
    pos_url: Optional[str] = None
    pos_username: Optional[str] = None
    pos_password: Optional[str] = None


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    subdomain: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    payment_status: Optional[str] = None
    payment_due_date: Optional[datetime] = None
    monthly_fee: Optional[float] = None
    notes: Optional[str] = None
    pos_url: Optional[str] = None
    pos_username: Optional[str] = None
    pos_password: Optional[str] = None
    is_active: Optional[bool] = None


class TenantModuleResponse(BaseModel):
    id: int
    module_id: int
    module_code: str
    module_name: str
    module_icon: Optional[str]
    module_route: Optional[str]
    is_enabled: bool
    enabled_at: Optional[datetime]

    class Config:
        from_attributes = True


class TenantResponse(TenantBase):
    id: int
    payment_status: str
    payment_due_date: Optional[datetime]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    modules: Optional[List[TenantModuleResponse]] = []

    class Config:
        from_attributes = True


class TenantListResponse(BaseModel):
    id: int
    name: str
    code: str
    subdomain: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    payment_status: str
    payment_due_date: Optional[datetime] = None
    monthly_fee: float
    pos_url: Optional[str] = None
    pos_username: Optional[str] = None
    pos_password: Optional[str] = None
    is_active: bool
    created_at: datetime
    enabled_modules_count: int

    class Config:
        from_attributes = True


class TenantModuleUpdate(BaseModel):
    module_id: int
    is_enabled: bool


class TenantPaymentCreate(BaseModel):
    tenant_id: int
    amount: float
    period_start: datetime
    period_end: datetime
    payment_method: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None


class TenantPaymentResponse(BaseModel):
    id: int
    tenant_id: int
    amount: float
    payment_date: datetime
    period_start: datetime
    period_end: datetime
    payment_method: Optional[str]
    reference: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class UpdatePaymentStatusRequest(BaseModel):
    payment_status: str
    payment_due_date: Optional[datetime] = None

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CostEntryCreate(BaseModel):
    name: str
    category: str
    amount: float
    description: Optional[str] = None
    is_recurring: bool = False
    recurrence_period: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class CostEntryUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_period: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None


class CostEntryResponse(BaseModel):
    id: int
    name: str
    category: str
    amount: float
    description: Optional[str]
    is_recurring: bool
    recurrence_period: Optional[str]
    start_date: datetime
    end_date: Optional[datetime]
    is_active: bool
    created_by_id: int
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CostConfigUpdate(BaseModel):
    distribution_method: Optional[str] = None
    percentage_value: Optional[float] = None
    is_auto_apply: Optional[bool] = None


class CostConfigResponse(BaseModel):
    id: int
    distribution_method: str
    percentage_value: float
    is_auto_apply: bool
    last_applied_at: Optional[datetime]
    updated_by_id: Optional[int]
    updated_at: datetime

    class Config:
        from_attributes = True


class CostCalculation(BaseModel):
    total_active_costs: float
    product_count: int
    cost_per_product: float
    distribution_method: str


class ApplyCostsRequest(BaseModel):
    notes: Optional[str] = None


class CostApplicationResponse(BaseModel):
    id: int
    total_cost: float
    product_count: int
    cost_per_product: float
    distribution_method: str
    applied_by_id: int
    applied_at: datetime
    notes: Optional[str]

    class Config:
        from_attributes = True

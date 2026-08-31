from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.location import LocationType


class LocationCreate(BaseModel):
    name: str
    code: str
    location_type: LocationType
    address: Optional[str] = None
    image_url: Optional[str] = None
    daily_base_cash: int = 100000
    has_own_menu: bool = False
    folio_prefix: Optional[str] = None


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    daily_base_cash: Optional[int] = None
    has_own_menu: Optional[bool] = None
    folio_prefix: Optional[str] = None


class LocationResponse(BaseModel):
    id: int
    name: str
    code: str
    location_type: LocationType
    address: Optional[str]
    image_url: Optional[str]
    is_active: bool
    daily_base_cash: int
    has_own_menu: bool
    folio_prefix: Optional[str]
    folio_counter: int
    created_at: datetime

    class Config:
        from_attributes = True


class LocationDashboardResponse(BaseModel):
    id: int
    name: str
    code: str
    location_type: LocationType
    address: Optional[str]
    image_url: Optional[str]
    is_active: bool
    has_own_menu: bool = False
    today_sales: float
    today_transactions: int
    active_workers: list
    stock_alerts: list
    recent_sales: list

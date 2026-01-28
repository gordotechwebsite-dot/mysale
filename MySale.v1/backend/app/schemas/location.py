from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.location import LocationType


class LocationCreate(BaseModel):
    name: str
    code: str
    location_type: LocationType
    address: Optional[str] = None
    daily_base_cash: int = 100000
    folio_prefix: Optional[str] = None


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None
    daily_base_cash: Optional[int] = None
    folio_prefix: Optional[str] = None


class LocationResponse(BaseModel):
    id: int
    name: str
    code: str
    location_type: LocationType
    address: Optional[str]
    is_active: bool
    daily_base_cash: int
    folio_prefix: Optional[str]
    folio_counter: int
    created_at: datetime

    class Config:
        from_attributes = True

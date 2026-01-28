from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None


class GroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FamilyCreate(BaseModel):
    name: str
    group_id: int
    description: Optional[str] = None


class FamilyResponse(BaseModel):
    id: int
    name: str
    group_id: int
    description: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SubFamilyCreate(BaseModel):
    name: str
    family_id: int
    description: Optional[str] = None


class SubFamilyResponse(BaseModel):
    id: int
    name: str
    family_id: int
    description: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    code: str
    barcode: Optional[str] = None
    name: str
    description: Optional[str] = None
    subfamily_id: int
    unit: str = "unidad"
    sale_price: float
    min_stock: int = 0
    max_stock: int = 1000


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    barcode: Optional[str] = None
    subfamily_id: Optional[int] = None
    unit: Optional[str] = None
    sale_price: Optional[float] = None
    min_stock: Optional[int] = None
    max_stock: Optional[int] = None
    is_active: Optional[bool] = None


class ProductStockResponse(BaseModel):
    location_id: int
    location_name: str
    quantity: float
    last_inventory_date: Optional[datetime]


class ProductResponse(BaseModel):
    id: int
    code: str
    barcode: Optional[str]
    name: str
    description: Optional[str]
    subfamily_id: int
    unit: str
    sale_price: float
    weighted_cost: float
    min_stock: int
    max_stock: int
    is_active: bool
    created_at: datetime
    stocks: Optional[List[ProductStockResponse]] = None

    class Config:
        from_attributes = True


class StockAdjustment(BaseModel):
    product_id: int
    location_id: int
    quantity: float
    notes: Optional[str] = None


class PurchaseCreate(BaseModel):
    product_id: int
    location_id: int
    quantity: float
    unit_cost: float
    notes: Optional[str] = None

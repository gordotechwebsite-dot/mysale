from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tenant_id: Optional[int] = None


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class GroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    tenant_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FamilyCreate(BaseModel):
    name: str
    group_id: int
    icon: Optional[str] = None
    description: Optional[str] = None
    tenant_id: Optional[int] = None


class FamilyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class FamilyResponse(BaseModel):
    id: int
    name: str
    group_id: int
    icon: Optional[str] = None
    description: Optional[str]
    tenant_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SubFamilyCreate(BaseModel):
    name: str
    family_id: int
    description: Optional[str] = None
    tenant_id: Optional[int] = None


class SubFamilyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class SubFamilyResponse(BaseModel):
    id: int
    name: str
    family_id: int
    description: Optional[str]
    tenant_id: Optional[int] = None
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
    location_id: Optional[int] = None
    unit: str = "unidad"
    sale_price: float
    min_stock: int = 0
    max_stock: int = 1000


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    barcode: Optional[str] = None
    subfamily_id: Optional[int] = None
    location_id: Optional[int] = None
    unit: Optional[str] = None
    sale_price: Optional[float] = None
    min_stock: Optional[int] = None
    max_stock: Optional[int] = None
    is_active: Optional[bool] = None
    is_sold_out: Optional[bool] = None


class ProductStockResponse(BaseModel):
    location_id: int
    location_name: str
    quantity: float
    last_inventory_date: Optional[datetime]


class ModifierResponse(BaseModel):
    id: int
    name: str
    price_adjustment: float
    is_active: bool
    display_order: int

    class Config:
        from_attributes = True


class ModifierCreate(BaseModel):
    name: str
    price_adjustment: float = 0.0
    display_order: int = 0


class ModifierUpdate(BaseModel):
    name: Optional[str] = None
    price_adjustment: Optional[float] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class ProductResponse(BaseModel):
    id: int
    code: str
    barcode: Optional[str]
    name: str
    description: Optional[str]
    subfamily_id: int
    location_id: Optional[int] = None
    location_name: Optional[str] = None
    unit: str
    sale_price: float
    weighted_cost: float
    min_stock: int
    max_stock: int
    is_active: bool
    is_sold_out: bool = False
    created_at: datetime
    stocks: Optional[List[ProductStockResponse]] = None
    modifiers: Optional[List[ModifierResponse]] = None

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


class BulkProductImport(BaseModel):
    tenant_id: int
    group_name: str = "Menu"
    products: List[dict]  # [{"category": str, "name": str, "price": float, "icon": Optional[str]}]

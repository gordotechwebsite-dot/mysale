from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ZoneCreate(BaseModel):
    name: str
    location_id: int
    description: Optional[str] = None
    color: Optional[str] = "#4ade80"
    display_order: Optional[int] = 0


class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class ZoneResponse(BaseModel):
    id: int
    name: str
    location_id: int
    description: Optional[str]
    color: str
    display_order: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TableCreate(BaseModel):
    name: str
    zone_id: int
    capacity: Optional[int] = 4
    shape: Optional[str] = "square"
    position_x: Optional[float] = 0
    position_y: Optional[float] = 0
    width: Optional[float] = 100
    height: Optional[float] = 100


class TableUpdate(BaseModel):
    name: Optional[str] = None
    zone_id: Optional[int] = None
    capacity: Optional[int] = None
    shape: Optional[str] = None
    status: Optional[str] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    is_active: Optional[bool] = None


class TableResponse(BaseModel):
    id: int
    name: str
    zone_id: int
    zone_name: Optional[str] = None
    capacity: int
    shape: str
    status: str
    position_x: float
    position_y: float
    width: float
    height: float
    is_active: bool
    created_at: datetime
    current_ticket_id: Optional[int] = None
    pending_comandas: Optional[int] = 0
    ticket_total: Optional[float] = 0
    ticket_time: Optional[str] = None
    waiter_name: Optional[str] = None

    class Config:
        from_attributes = True


class TicketItemCreate(BaseModel):
    product_id: int
    quantity: float = 1
    unit_price: float
    discount: Optional[float] = 0
    notes: Optional[str] = None


class TicketItemResponse(BaseModel):
    id: int
    ticket_id: int
    product_id: int
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    comanda_id: Optional[int]
    quantity: float
    unit_price: float
    discount: float
    subtotal: float
    notes: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class TicketCreate(BaseModel):
    table_id: int
    location_id: int
    customer_name: Optional[str] = None
    num_people: Optional[int] = 1
    notes: Optional[str] = None


class TicketUpdate(BaseModel):
    customer_name: Optional[str] = None
    num_people: Optional[int] = None
    notes: Optional[str] = None
    tip: Optional[float] = None
    service_charge: Optional[float] = None
    discount: Optional[float] = None


class TicketResponse(BaseModel):
    id: int
    table_id: int
    table_name: Optional[str] = None
    location_id: int
    waiter_id: int
    waiter_name: Optional[str] = None
    customer_name: Optional[str]
    num_people: int
    notes: Optional[str]
    status: str
    subtotal: float
    tax: float
    tip: float
    service_charge: float
    discount: float
    total: float
    opened_at: datetime
    closed_at: Optional[datetime]
    items: List[TicketItemResponse] = []
    pending_comandas: int = 0

    class Config:
        from_attributes = True


class ComandaCreate(BaseModel):
    ticket_id: int
    area: str = "kitchen"
    item_ids: List[int]
    notes: Optional[str] = None


class ComandaResponse(BaseModel):
    id: int
    ticket_id: int
    area: str
    status: str
    notes: Optional[str]
    created_by_id: int
    created_by_name: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime]
    items: List[TicketItemResponse] = []

    class Config:
        from_attributes = True


class TicketPaymentCreate(BaseModel):
    payment_method: str
    amount: float
    reference: Optional[str] = None


class TicketPaymentResponse(BaseModel):
    id: int
    ticket_id: int
    payment_method: str
    amount: float
    reference: Optional[str]
    created_by_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PayTicketRequest(BaseModel):
    payments: List[TicketPaymentCreate]
    tip: Optional[float] = 0
    notes: Optional[str] = None


class MoveTicketRequest(BaseModel):
    new_table_id: int


class MergeTicketsRequest(BaseModel):
    source_ticket_ids: List[int]
    target_table_id: int


class SplitTicketRequest(BaseModel):
    item_ids: List[int]
    new_table_id: int


class AddItemsRequest(BaseModel):
    items: List[TicketItemCreate]


class ZoneWithTablesResponse(BaseModel):
    id: int
    name: str
    location_id: int
    description: Optional[str]
    color: str
    display_order: int
    is_active: bool
    tables: List[TableResponse] = []

    class Config:
        from_attributes = True

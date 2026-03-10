from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ZoneCreate(BaseModel):
    name: str
    location_id: Optional[int] = None
    description: Optional[str] = None
    color: Optional[str] = None
    display_order: Optional[int] = None


class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class ZoneResponse(BaseModel):
    id: int
    name: str
    location_id: Optional[int] = None
    description: Optional[str] = None
    color: Optional[str] = None
    display_order: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TableCreate(BaseModel):
    name: str
    zone_id: int
    capacity: Optional[int] = None
    shape: Optional[str] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    rotation: Optional[int] = None


class TableUpdate(BaseModel):
    name: Optional[str] = None
    zone_id: Optional[int] = None
    capacity: Optional[int] = None
    shape: Optional[str] = None
    status: Optional[str] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    rotation: Optional[int] = None
    reserved_by: Optional[str] = None
    reserved_time: Optional[str] = None
    is_active: Optional[bool] = None


class TableResponse(BaseModel):
    id: int
    name: str
    zone_id: int
    zone_name: Optional[str] = None
    capacity: int
    shape: str
    status: str
    position_x: int
    position_y: int
    width: int
    height: int
    rotation: int = 0
    reserved_by: Optional[str] = None
    reserved_time: Optional[str] = None
    is_active: bool
    created_at: datetime
    current_ticket_id: Optional[int] = None
    pending_comandas: int = 0
    ticket_total: Optional[float] = None
    ticket_time: Optional[str] = None
    ticket_opened_at: Optional[datetime] = None
    waiter_name: Optional[str] = None

    class Config:
        from_attributes = True


class ZoneWithTablesResponse(BaseModel):
    id: int
    name: str
    location_id: Optional[int] = None
    description: Optional[str] = None
    color: Optional[str] = None
    display_order: int
    is_active: bool
    tables: List[TableResponse]

    class Config:
        from_attributes = True


class TicketItemCreate(BaseModel):
    product_id: int
    quantity: float
    unit_price: float
    discount: Optional[float] = None
    notes: Optional[str] = None


class TicketItemResponse(BaseModel):
    id: int
    ticket_id: int
    product_id: int
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    comanda_id: Optional[int] = None
    quantity: float
    unit_price: float
    discount: float
    subtotal: float
    notes: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class TicketCreate(BaseModel):
    table_id: int
    location_id: Optional[int] = None
    customer_name: Optional[str] = None
    num_people: Optional[int] = None
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
    location_id: Optional[int] = None
    waiter_id: Optional[int] = None
    waiter_name: Optional[str] = None
    customer_name: Optional[str] = None
    num_people: int
    notes: Optional[str] = None
    status: str
    subtotal: float
    tax: float
    tip: float
    service_charge: float
    discount: float
    total: float
    opened_at: datetime
    closed_at: Optional[datetime] = None
    items: List[TicketItemResponse] = []
    pending_comandas: int = 0

    class Config:
        from_attributes = True


class ComandaCreate(BaseModel):
    ticket_id: int
    area: Optional[str] = None
    item_ids: List[int] = []
    notes: Optional[str] = None


class ComandaResponse(BaseModel):
    id: int
    ticket_id: int
    area: str
    status: str
    notes: Optional[str] = None
    is_printed: bool
    created_at: datetime
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
    reference: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PayTicketRequest(BaseModel):
    payments: List[TicketPaymentCreate]
    tip: Optional[float] = None


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

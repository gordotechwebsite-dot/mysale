from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class NotificationCreate(BaseModel):
    title: str
    message: str


class NotificationBroadcast(BaseModel):
    title: str
    message: str


class NotificationResponse(BaseModel):
    id: int
    tenant_id: Optional[int] = None
    title: str
    message: str
    type: str
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCountResponse(BaseModel):
    unread_count: int

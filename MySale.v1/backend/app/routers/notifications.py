from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.notification import Notification, NotificationType
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.notification import (
    NotificationCreate, NotificationBroadcast,
    NotificationResponse, NotificationCountResponse
)
from app.utils.auth import get_current_user, require_role
from app.timezone import now_colombia

router = APIRouter(prefix="/api", tags=["notifications"])


# ---- Client-facing endpoints ----

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notification)
    if current_user.tenant_id:
        query = query.filter(
            (Notification.tenant_id == current_user.tenant_id) |
            (Notification.tenant_id == None)
        )
    else:
        query = query.filter(Notification.tenant_id == None)
    return query.order_by(Notification.created_at.desc()).limit(50).all()


@router.get("/notifications/unread-count", response_model=NotificationCountResponse)
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notification).filter(Notification.is_read == False)
    if current_user.tenant_id:
        query = query.filter(
            (Notification.tenant_id == current_user.tenant_id) |
            (Notification.tenant_id == None)
        )
    else:
        query = query.filter(Notification.tenant_id == None)
    return {"unread_count": query.count()}


@router.put("/notifications/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notificacion no encontrada")
    notification.is_read = True
    notification.read_at = now_colombia()
    db.commit()
    return {"message": "Marcada como leida"}


@router.put("/notifications/read-all")
async def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notification).filter(Notification.is_read == False)
    if current_user.tenant_id:
        query = query.filter(
            (Notification.tenant_id == current_user.tenant_id) |
            (Notification.tenant_id == None)
        )
    else:
        query = query.filter(Notification.tenant_id == None)
    now = now_colombia()
    query.update({"is_read": True, "read_at": now}, synchronize_session="fetch")
    db.commit()
    return {"message": "Todas marcadas como leidas"}


# ---- Admin endpoints ----

@router.post("/admin/tenants/{tenant_id}/notifications", response_model=NotificationResponse)
async def send_notification_to_tenant(
    tenant_id: int,
    data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    notification = Notification(
        tenant_id=tenant_id,
        title=data.title,
        message=data.message,
        type=NotificationType.CUSTOM,
        created_by_id=current_user.id
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.post("/admin/notifications/broadcast", response_model=List[NotificationResponse])
async def broadcast_notification(
    data: NotificationBroadcast,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
    notifications = []
    for tenant in tenants:
        notification = Notification(
            tenant_id=tenant.id,
            title=data.title,
            message=data.message,
            type=NotificationType.CUSTOM,
            created_by_id=current_user.id
        )
        db.add(notification)
        notifications.append(notification)
    db.commit()
    for n in notifications:
        db.refresh(n)
    return notifications


@router.get("/admin/notifications", response_model=List[NotificationResponse])
async def get_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    return db.query(Notification).order_by(Notification.created_at.desc()).limit(100).all()

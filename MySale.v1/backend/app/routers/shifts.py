from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.user import User, RoleType
from app.models.shift import Shift, ShiftStatus, ShiftAlert, AlertType
from app.models.location import Location
from app.schemas.shift import ShiftCreate, ShiftClose, ShiftResponse, ShiftAlertResponse
from app.utils.auth import get_current_user, require_role

router = APIRouter(prefix="/api/shifts", tags=["Turnos"])


def filter_by_tenant(query, model, tenant_id):
    """Helper function to filter queries by tenant_id if present."""
    if tenant_id:
        return query.filter(model.tenant_id == tenant_id)
    return query


@router.get("/", response_model=List[ShiftResponse])
async def get_shifts(
    location_id: Optional[int] = None,
    user_id: Optional[int] = None,
    status: Optional[ShiftStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Shift)
    query = filter_by_tenant(query, Shift, current_user.tenant_id)
    
    if location_id:
        query = query.filter(Shift.location_id == location_id)
    if user_id:
        query = query.filter(Shift.user_id == user_id)
    if status:
        query = query.filter(Shift.status == status)
    
    shifts = query.order_by(Shift.start_time.desc()).offset(skip).limit(limit).all()
    
    result = []
    for shift in shifts:
        user = db.query(User).filter(User.id == shift.user_id).first()
        location = db.query(Location).filter(Location.id == shift.location_id).first()
        result.append(ShiftResponse(
            id=shift.id,
            user_id=shift.user_id,
            user_name=user.full_name if user else None,
            location_id=shift.location_id,
            location_name=location.name if location else None,
            start_time=shift.start_time,
            end_time=shift.end_time,
            status=shift.status,
            initial_cash=shift.initial_cash,
            final_cash=shift.final_cash,
            total_sales=shift.total_sales,
            total_cash_sales=shift.total_cash_sales,
            total_card_sales=shift.total_card_sales,
            total_transfer_sales=shift.total_transfer_sales,
            biometric_verified=shift.biometric_verified
        ))
    
    return result


@router.get("/current", response_model=Optional[ShiftResponse])
async def get_current_shift(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    shift = db.query(Shift).filter(
        Shift.user_id == current_user.id,
        Shift.status == ShiftStatus.OPEN
    ).first()
    
    if not shift:
        return None
    
    location = db.query(Location).filter(Location.id == shift.location_id).first()
    return ShiftResponse(
        id=shift.id,
        user_id=shift.user_id,
        user_name=current_user.full_name,
        location_id=shift.location_id,
        location_name=location.name if location else None,
        start_time=shift.start_time,
        end_time=shift.end_time,
        status=shift.status,
        initial_cash=shift.initial_cash,
        final_cash=shift.final_cash,
        total_sales=shift.total_sales,
        total_cash_sales=shift.total_cash_sales,
        total_card_sales=shift.total_card_sales,
        total_transfer_sales=shift.total_transfer_sales,
        biometric_verified=shift.biometric_verified
    )


@router.post("/open", response_model=ShiftResponse)
async def open_shift(
    shift_data: ShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_shift = db.query(Shift).filter(
        Shift.user_id == current_user.id,
        Shift.status == ShiftStatus.OPEN
    ).first()
    
    if existing_shift:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya tiene un turno abierto"
        )
    
    location = db.query(Location).filter(Location.id == shift_data.location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ubicacion no encontrada"
        )
    
    shift = Shift(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        location_id=shift_data.location_id,
        initial_cash=shift_data.initial_cash or location.daily_base_cash,
        biometric_verified=shift_data.biometric_verified
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)
    
    return ShiftResponse(
        id=shift.id,
        user_id=shift.user_id,
        user_name=current_user.full_name,
        location_id=shift.location_id,
        location_name=location.name,
        start_time=shift.start_time,
        end_time=shift.end_time,
        status=shift.status,
        initial_cash=shift.initial_cash,
        final_cash=shift.final_cash,
        total_sales=shift.total_sales,
        total_cash_sales=shift.total_cash_sales,
        total_card_sales=shift.total_card_sales,
        total_transfer_sales=shift.total_transfer_sales,
        biometric_verified=shift.biometric_verified
    )


@router.post("/close", response_model=ShiftResponse)
async def close_shift(
    shift_close: ShiftClose,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    shift = db.query(Shift).filter(
        Shift.user_id == current_user.id,
        Shift.status == ShiftStatus.OPEN
    ).first()
    
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tiene un turno abierto"
        )
    
    shift.end_time = datetime.utcnow()
    shift.status = ShiftStatus.CLOSED
    shift.final_cash = shift_close.final_cash
    shift.notes = shift_close.notes
    
    db.commit()
    db.refresh(shift)
    
    location = db.query(Location).filter(Location.id == shift.location_id).first()
    return ShiftResponse(
        id=shift.id,
        user_id=shift.user_id,
        user_name=current_user.full_name,
        location_id=shift.location_id,
        location_name=location.name if location else None,
        start_time=shift.start_time,
        end_time=shift.end_time,
        status=shift.status,
        initial_cash=shift.initial_cash,
        final_cash=shift.final_cash,
        total_sales=shift.total_sales,
        total_cash_sales=shift.total_cash_sales,
        total_card_sales=shift.total_card_sales,
        total_transfer_sales=shift.total_transfer_sales,
        biometric_verified=shift.biometric_verified
    )


@router.post("/{shift_id}/close-by-admin", response_model=ShiftResponse)
async def close_shift_by_admin(
    shift_id: int,
    shift_close: ShiftClose,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER))
):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turno no encontrado"
        )
    
    if shift.status != ShiftStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El turno ya esta cerrado"
        )
    
    shift.end_time = datetime.utcnow()
    shift.status = ShiftStatus.CLOSED_BY_ADMIN
    shift.final_cash = shift_close.final_cash
    shift.notes = shift_close.notes
    shift.closed_by_id = current_user.id
    
    alert = ShiftAlert(
        user_id=shift.user_id,
        alert_type=AlertType.SHIFT_CLOSE,
        message=f"Su turno fue cerrado por el administrador: {current_user.full_name}",
        points_affected=-5
    )
    db.add(alert)
    
    user = db.query(User).filter(User.id == shift.user_id).first()
    if user:
        user.points = max(0, user.points - 5)
    
    db.commit()
    db.refresh(shift)
    
    location = db.query(Location).filter(Location.id == shift.location_id).first()
    return ShiftResponse(
        id=shift.id,
        user_id=shift.user_id,
        user_name=user.full_name if user else None,
        location_id=shift.location_id,
        location_name=location.name if location else None,
        start_time=shift.start_time,
        end_time=shift.end_time,
        status=shift.status,
        initial_cash=shift.initial_cash,
        final_cash=shift.final_cash,
        total_sales=shift.total_sales,
        total_cash_sales=shift.total_cash_sales,
        total_card_sales=shift.total_card_sales,
        total_transfer_sales=shift.total_transfer_sales,
        biometric_verified=shift.biometric_verified
    )


@router.get("/alerts", response_model=List[ShiftAlertResponse])
async def get_my_alerts(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ShiftAlert).filter(ShiftAlert.user_id == current_user.id)
    
    if unread_only:
        query = query.filter(ShiftAlert.is_read == False)
    
    return query.order_by(ShiftAlert.created_at.desc()).all()


@router.post("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(ShiftAlert).filter(
        ShiftAlert.id == alert_id,
        ShiftAlert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alerta no encontrada"
        )
    
    alert.is_read = True
    db.commit()
    
    return {"message": "Alerta marcada como leida"}

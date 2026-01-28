from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta
from app.database import get_db
from app.models.user import User, RoleType
from app.models.location import Location, LocationType
from app.models.shift import Shift, ShiftStatus
from app.models.sale import Sale
from app.models import ProductStock
from app.schemas.location import LocationCreate, LocationUpdate, LocationResponse, LocationDashboardResponse
from app.utils.auth import get_current_user, require_role

router = APIRouter(prefix="/api/locations", tags=["Ubicaciones"])


@router.get("/", response_model=List[LocationResponse])
async def get_locations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    locations = db.query(Location).all()
    return locations


@router.get("/dashboard", response_model=List[LocationDashboardResponse])
async def get_locations_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    locations = db.query(Location).filter(
        Location.location_type == LocationType.POS,
        Location.is_active == True
    ).all()
    
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    
    result = []
    for location in locations:
        today_sales_data = db.query(
            func.coalesce(func.sum(Sale.total), 0),
            func.count(Sale.id)
        ).filter(
            Sale.location_id == location.id,
            Sale.created_at >= today_start
        ).first()
        
        active_shifts = db.query(Shift).filter(
            Shift.location_id == location.id,
            Shift.status == ShiftStatus.OPEN
        ).all()
        
        active_workers = []
        for shift in active_shifts:
            user = db.query(User).filter(User.id == shift.user_id).first()
            if user:
                active_workers.append({
                    "id": user.id,
                    "name": user.full_name,
                    "shift_start": shift.start_time.isoformat() if shift.start_time else None,
                    "total_sales": shift.total_sales
                })
        
        stock_alerts = db.query(ProductStock).filter(
            ProductStock.location_id == location.id,
            ProductStock.quantity <= ProductStock.min_stock,
            ProductStock.min_stock > 0
        ).limit(5).all()
        
        alerts_list = []
        for stock in stock_alerts:
            alerts_list.append({
                "product_id": stock.product_id,
                "product_name": stock.product.name if stock.product else "Unknown",
                "current_stock": stock.quantity,
                "min_stock": stock.min_stock
            })
        
        recent_sales = db.query(Sale).filter(
            Sale.location_id == location.id,
            Sale.created_at >= today_start
        ).order_by(Sale.created_at.desc()).limit(5).all()
        
        sales_list = []
        for sale in recent_sales:
            sales_list.append({
                "id": sale.id,
                "folio": sale.folio,
                "total": sale.total,
                "payment_method": sale.payment_method.value if sale.payment_method else None,
                "created_at": sale.created_at.isoformat() if sale.created_at else None
            })
        
        result.append(LocationDashboardResponse(
            id=location.id,
            name=location.name,
            code=location.code,
            location_type=location.location_type,
            address=location.address,
            image_url=location.image_url,
            is_active=location.is_active,
            today_sales=today_sales_data[0] or 0,
            today_transactions=today_sales_data[1] or 0,
            active_workers=active_workers,
            stock_alerts=alerts_list,
            recent_sales=sales_list
        ))
    
    return result


@router.post("/", response_model=LocationResponse)
async def create_location(
    location: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER))
):
    existing = db.query(Location).filter(Location.code == location.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una ubicacion con ese codigo"
        )
    
    db_location = Location(**location.model_dump())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ubicacion no encontrada"
        )
    return location


@router.put("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: int,
    location_update: LocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ubicacion no encontrada"
        )
    
    update_data = location_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(location, field, value)
    
    db.commit()
    db.refresh(location)
    return location


@router.delete("/{location_id}")
async def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER))
):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ubicacion no encontrada"
        )
    
    location.is_active = False
    db.commit()
    
    return {"message": "Ubicacion desactivada exitosamente"}

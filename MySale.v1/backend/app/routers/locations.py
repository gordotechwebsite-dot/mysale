from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta
from app.timezone import now_colombia
from app.database import get_db
from app.models.user import User, RoleType
from app.models.location import Location, LocationType
from app.models.shift import Shift, ShiftStatus
from app.models.sale import Sale, SaleItem, PaymentMethod
from app.models import ProductStock
from app.models.inventory import Product
from app.models.cash import CashRegister
from app.schemas.location import LocationCreate, LocationUpdate, LocationResponse, LocationDashboardResponse
from app.utils.auth import get_current_user, require_role

router = APIRouter(prefix="/api/locations", tags=["Ubicaciones"])


def filter_by_tenant(query, model, tenant_id, user_role=None):
    """Helper function to filter queries by tenant_id if present.
    Superusers with no tenant see all locations."""
    if user_role and user_role == RoleType.SUPERUSER and not tenant_id:
        return query
    if tenant_id:
        return query.filter(model.tenant_id == tenant_id)
    return query.filter(model.tenant_id.is_(None))


@router.get("/", response_model=List[LocationResponse])
async def get_locations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Location)
    role_type = current_user.role.role_type if current_user.role else None
    query = filter_by_tenant(query, Location, current_user.tenant_id, user_role=role_type)
    return query.all()


@router.get("/dashboard", response_model=List[LocationDashboardResponse])
async def get_locations_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    query = db.query(Location).filter(
        Location.location_type == LocationType.POS,
        Location.is_active == True
    )
    role_type = current_user.role.role_type if current_user.role else None
    query = filter_by_tenant(query, Location, current_user.tenant_id, user_role=role_type)
    locations = query.all()
    
    today = now_colombia().date()
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
        
        stock_alerts = db.query(ProductStock).join(
            ProductStock.product
        ).filter(
            ProductStock.location_id == location.id,
            ProductStock.quantity <= Product.min_stock,
            Product.min_stock > 0
        ).limit(5).all()
        
        alerts_list = []
        for stock in stock_alerts:
            alerts_list.append({
                "product_id": stock.product_id,
                "product_name": stock.product.name if stock.product else "Unknown",
                "current_stock": stock.quantity,
                "min_stock": stock.product.min_stock if stock.product else 0
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


@router.get("/{location_id}/detail")
async def get_location_detail(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    """Detailed stats for a single location (sucursal)"""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Ubicacion no encontrada")

    today = now_colombia().date()
    today_start = datetime.combine(today, datetime.min.time())

    # Today's sales
    today_sales_data = db.query(
        func.coalesce(func.sum(Sale.total), 0),
        func.count(Sale.id)
    ).filter(
        Sale.location_id == location_id,
        Sale.created_at >= today_start
    ).first()

    # Sales by payment method
    sales_by_method = db.query(
        Sale.payment_method,
        func.sum(Sale.total),
        func.count(Sale.id)
    ).filter(
        Sale.location_id == location_id,
        Sale.created_at >= today_start
    ).group_by(Sale.payment_method).all()

    payment_breakdown = []
    for method, total, count in sales_by_method:
        payment_breakdown.append({
            "method": method.value if method else "unknown",
            "total": total or 0,
            "count": count or 0
        })

    # Sales by hour
    all_today_sales = db.query(Sale).filter(
        Sale.location_id == location_id,
        Sale.created_at >= today_start
    ).order_by(Sale.created_at.desc()).all()

    hourly_sales: dict = {}
    for sale in all_today_sales:
        if sale.created_at:
            hour = sale.created_at.hour
            key = f"{hour:02d}:00"
            if key not in hourly_sales:
                hourly_sales[key] = {"hour": key, "total": 0, "count": 0}
            hourly_sales[key]["total"] += sale.total or 0
            hourly_sales[key]["count"] += 1

    hourly_list = sorted(hourly_sales.values(), key=lambda x: x["hour"])

    # Active workers
    active_shifts = db.query(Shift).filter(
        Shift.location_id == location_id,
        Shift.status == ShiftStatus.OPEN
    ).all()

    active_workers = []
    for shift in active_shifts:
        user = db.query(User).filter(User.id == shift.user_id).first()
        if user:
            shift_sales = db.query(func.count(Sale.id), func.coalesce(func.sum(Sale.total), 0)).filter(
                Sale.shift_id == shift.id
            ).first()
            active_workers.append({
                "id": user.id,
                "name": user.full_name,
                "role": user.role.name if user.role else "Sin rol",
                "shift_start": shift.start_time.isoformat() if shift.start_time else None,
                "total_sales": shift_sales[1] if shift_sales else 0,
                "transaction_count": shift_sales[0] if shift_sales else 0
            })

    # Top selling products today
    top_products = db.query(
        Product.name,
        func.sum(SaleItem.quantity).label("qty"),
        func.sum(SaleItem.subtotal).label("revenue")
    ).join(SaleItem.sale).join(SaleItem.product).filter(
        Sale.location_id == location_id,
        Sale.created_at >= today_start
    ).group_by(Product.id, Product.name).order_by(func.sum(SaleItem.subtotal).desc()).limit(10).all()

    top_products_list = [
        {"name": name, "quantity": float(qty or 0), "revenue": float(rev or 0)}
        for name, qty, rev in top_products
    ]

    # Stock alerts
    stock_alerts = db.query(ProductStock).join(
        ProductStock.product
    ).filter(
        ProductStock.location_id == location_id,
        ProductStock.quantity <= Product.min_stock,
        Product.min_stock > 0
    ).all()

    alerts_list = [{
        "product_id": s.product_id,
        "product_name": s.product.name if s.product else "Unknown",
        "current_stock": s.quantity,
        "min_stock": s.product.min_stock if s.product else 0
    } for s in stock_alerts]

    # Recent sales (all today)
    sales_list = [{
        "id": sale.id,
        "folio": sale.folio,
        "total": sale.total,
        "payment_method": sale.payment_method.value if sale.payment_method else None,
        "sale_type": sale.sale_type.value if sale.sale_type else None,
        "cashier_name": sale.cashier.full_name if sale.cashier else "N/A",
        "items_count": len(sale.items),
        "created_at": sale.created_at.isoformat() if sale.created_at else None
    } for sale in all_today_sales]

    # Average ticket
    avg_ticket = (today_sales_data[0] / today_sales_data[1]) if today_sales_data[1] > 0 else 0

    return {
        "id": location.id,
        "name": location.name,
        "code": location.code,
        "address": location.address,
        "image_url": location.image_url,
        "is_active": location.is_active,
        "today_sales": today_sales_data[0] or 0,
        "today_transactions": today_sales_data[1] or 0,
        "average_ticket": avg_ticket,
        "payment_breakdown": payment_breakdown,
        "hourly_sales": hourly_list,
        "active_workers": active_workers,
        "top_products": top_products_list,
        "stock_alerts": alerts_list,
        "recent_sales": sales_list,
    }


@router.post("/", response_model=LocationResponse)
async def create_location(
    location: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER))
):
    query = db.query(Location).filter(Location.code == location.code)
    role_type = current_user.role.role_type if current_user.role else None
    query = filter_by_tenant(query, Location, current_user.tenant_id, user_role=role_type)
    existing = query.first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una ubicacion con ese codigo"
        )
    
    db_location = Location(**location.model_dump(), tenant_id=current_user.tenant_id)
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
    query = db.query(Location).filter(Location.id == location_id)
    role_type = current_user.role.role_type if current_user.role else None
    query = filter_by_tenant(query, Location, current_user.tenant_id, user_role=role_type)
    location = query.first()
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
    query = db.query(Location).filter(Location.id == location_id)
    role_type = current_user.role.role_type if current_user.role else None
    query = filter_by_tenant(query, Location, current_user.tenant_id, user_role=role_type)
    location = query.first()
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
    query = db.query(Location).filter(Location.id == location_id)
    role_type = current_user.role.role_type if current_user.role else None
    query = filter_by_tenant(query, Location, current_user.tenant_id, user_role=role_type)
    location = query.first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ubicacion no encontrada"
        )
    
    location.is_active = False
    db.commit()
    
    return {"message": "Ubicacion desactivada exitosamente"}

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from app.database import get_db
from app.models.user import User
from app.models.shift import Shift, ShiftStatus
from app.models.sale import Sale, SaleItem, PaymentMethod, SaleType, DeliveryStatus
from app.models.inventory import Product
from app.models.location import Location
from app.schemas.delivery import DeliveryCreate, DeliveryResponse, DeliveryItemResponse, DeliveryUpdateStatus
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/deliveries", tags=["Domicilios"])


def generate_folio(db: Session, location: Location) -> str:
    location.folio_counter += 1
    prefix = location.folio_prefix or location.code
    folio = f"DOM-{prefix}-{location.folio_counter:06d}"
    return folio


def build_delivery_response(sale: Sale, location: Location, cashier: User, db: Session) -> DeliveryResponse:
    items = []
    for item in sale.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        items.append(DeliveryItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=product.name if product else None,
            product_code=product.code if product else None,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount=item.discount,
            subtotal=item.subtotal
        ))
    
    delivery_fee = sale.delivery_fee or 0.0
    return DeliveryResponse(
        id=sale.id,
        folio=sale.folio,
        location_id=sale.location_id,
        location_name=location.name if location else None,
        shift_id=sale.shift_id,
        cashier_id=sale.cashier_id,
        cashier_name=cashier.full_name if cashier else None,
        subtotal=sale.subtotal,
        tax=sale.tax or 0.0,
        discount=sale.discount or 0.0,
        total=sale.total,
        delivery_fee=delivery_fee,
        grand_total=sale.total + delivery_fee,
        payment_method=sale.payment_method,
        amount_received=sale.amount_received,
        change_given=sale.change_given,
        notes=sale.notes,
        sale_type=sale.sale_type or SaleType.DELIVERY,
        customer_name=sale.customer_name,
        customer_phone=sale.customer_phone,
        customer_address=sale.customer_address,
        delivery_person=sale.delivery_person,
        delivery_status=sale.delivery_status,
        delivered_at=sale.delivered_at,
        created_at=sale.created_at,
        items=items
    )


@router.get("/", response_model=List[DeliveryResponse])
async def get_deliveries(
    delivery_status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Sale).filter(Sale.sale_type == SaleType.DELIVERY)
    
    if delivery_status:
        query = query.filter(Sale.delivery_status == delivery_status)
    if start_date:
        query = query.filter(Sale.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(Sale.created_at <= datetime.combine(end_date, datetime.max.time()))
    
    sales = query.order_by(Sale.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for sale in sales:
        location = db.query(Location).filter(Location.id == sale.location_id).first()
        cashier = db.query(User).filter(User.id == sale.cashier_id).first()
        result.append(build_delivery_response(sale, location, cashier, db))
    
    return result


@router.get("/{delivery_id}", response_model=DeliveryResponse)
async def get_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sale = db.query(Sale).filter(
        Sale.id == delivery_id,
        Sale.sale_type == SaleType.DELIVERY
    ).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Domicilio no encontrado")
    
    location = db.query(Location).filter(Location.id == sale.location_id).first()
    cashier = db.query(User).filter(User.id == sale.cashier_id).first()
    return build_delivery_response(sale, location, cashier, db)


@router.post("/", response_model=DeliveryResponse)
async def create_delivery(
    data: DeliveryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    shift = db.query(Shift).filter(
        Shift.user_id == current_user.id,
        Shift.status == ShiftStatus.OPEN
    ).first()
    
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe abrir un turno antes de registrar domicilios"
        )
    
    location = db.query(Location).filter(Location.id == shift.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Ubicacion no encontrada")
    
    subtotal = 0.0
    total_discount = 0.0
    sale_items = []
    
    for item_data in data.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Producto {item_data.product_id} no encontrado"
            )
        
        item_subtotal = product.sale_price * item_data.quantity
        item_discount = item_data.discount
        
        sale_items.append({
            "product": product,
            "quantity": item_data.quantity,
            "unit_price": product.sale_price,
            "cost_at_sale": product.weighted_cost,
            "discount": item_discount,
            "subtotal": item_subtotal - item_discount
        })
        
        subtotal += item_subtotal
        total_discount += item_discount
    
    total = subtotal - total_discount
    
    folio = generate_folio(db, location)
    
    delivery_fee = data.delivery_fee or 0.0
    grand_total = total + delivery_fee
    
    change_given = None
    if data.payment_method == PaymentMethod.CASH and data.amount_received:
        change_given = data.amount_received - grand_total
    
    sale = Sale(
        folio=folio,
        location_id=shift.location_id,
        shift_id=shift.id,
        cashier_id=current_user.id,
        subtotal=subtotal,
        discount=total_discount,
        total=total,
        payment_method=data.payment_method,
        amount_received=data.amount_received,
        change_given=change_given,
        notes=data.notes,
        sale_type=SaleType.DELIVERY,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        customer_address=data.customer_address,
        delivery_person=data.delivery_person,
        delivery_fee=delivery_fee,
        delivery_status=DeliveryStatus.PENDING
    )
    db.add(sale)
    db.flush()
    
    for item_info in sale_items:
        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=item_info["product"].id,
            quantity=item_info["quantity"],
            unit_price=item_info["unit_price"],
            cost_at_sale=item_info["cost_at_sale"],
            discount=item_info["discount"],
            subtotal=item_info["subtotal"]
        )
        db.add(sale_item)
        
    shift.total_sales += grand_total
    if data.payment_method == PaymentMethod.CASH:
        shift.total_cash_sales += grand_total
    elif data.payment_method == PaymentMethod.CARD:
        shift.total_card_sales += grand_total
    elif data.payment_method == PaymentMethod.TRANSFER:
        shift.total_transfer_sales += grand_total
    
    db.commit()
    db.refresh(sale)
    
    return build_delivery_response(sale, location, current_user, db)


@router.put("/{delivery_id}/status", response_model=DeliveryResponse)
async def update_delivery_status(
    delivery_id: int,
    data: DeliveryUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sale = db.query(Sale).filter(
        Sale.id == delivery_id,
        Sale.sale_type == SaleType.DELIVERY
    ).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Domicilio no encontrado")
    
    sale.delivery_status = data.delivery_status
    if data.delivery_person:
        sale.delivery_person = data.delivery_person
    
    if data.delivery_status == DeliveryStatus.DELIVERED:
        sale.delivered_at = datetime.utcnow()
    
    db.commit()
    db.refresh(sale)
    
    location = db.query(Location).filter(Location.id == sale.location_id).first()
    cashier = db.query(User).filter(User.id == sale.cashier_id).first()
    return build_delivery_response(sale, location, cashier, db)

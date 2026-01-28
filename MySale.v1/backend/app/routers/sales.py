from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from app.database import get_db
from app.models.user import User, RoleType
from app.models.shift import Shift, ShiftStatus
from app.models.sale import Sale, SaleItem, PaymentMethod
from app.models.inventory import Product, ProductStock, StockMovement, MovementType
from app.models.location import Location
from app.schemas.sale import SaleCreate, SaleResponse, SaleItemResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/sales", tags=["Ventas"])


def generate_folio(db: Session, location: Location) -> str:
    location.folio_counter += 1
    prefix = location.folio_prefix or location.code
    folio = f"{prefix}-{location.folio_counter:06d}"
    return folio


@router.get("/", response_model=List[SaleResponse])
async def get_sales(
    location_id: Optional[int] = None,
    cashier_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Sale)
    
    if location_id:
        query = query.filter(Sale.location_id == location_id)
    if cashier_id:
        query = query.filter(Sale.cashier_id == cashier_id)
    if start_date:
        query = query.filter(Sale.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(Sale.created_at <= datetime.combine(end_date, datetime.max.time()))
    
    sales = query.order_by(Sale.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for sale in sales:
        location = db.query(Location).filter(Location.id == sale.location_id).first()
        cashier = db.query(User).filter(User.id == sale.cashier_id).first()
        
        items = []
        for item in sale.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            items.append(SaleItemResponse(
                id=item.id,
                product_id=item.product_id,
                product_name=product.name if product else None,
                product_code=product.code if product else None,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount=item.discount,
                subtotal=item.subtotal
            ))
        
        result.append(SaleResponse(
            id=sale.id,
            folio=sale.folio,
            location_id=sale.location_id,
            location_name=location.name if location else None,
            shift_id=sale.shift_id,
            cashier_id=sale.cashier_id,
            cashier_name=cashier.full_name if cashier else None,
            subtotal=sale.subtotal,
            tax=sale.tax,
            discount=sale.discount,
            total=sale.total,
            payment_method=sale.payment_method,
            amount_received=sale.amount_received,
            change_given=sale.change_given,
            notes=sale.notes,
            created_at=sale.created_at,
            items=items
        ))
    
    return result


@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    location = db.query(Location).filter(Location.id == sale.location_id).first()
    cashier = db.query(User).filter(User.id == sale.cashier_id).first()
    
    items = []
    for item in sale.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        items.append(SaleItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=product.name if product else None,
            product_code=product.code if product else None,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount=item.discount,
            subtotal=item.subtotal
        ))
    
    return SaleResponse(
        id=sale.id,
        folio=sale.folio,
        location_id=sale.location_id,
        location_name=location.name if location else None,
        shift_id=sale.shift_id,
        cashier_id=sale.cashier_id,
        cashier_name=cashier.full_name if cashier else None,
        subtotal=sale.subtotal,
        tax=sale.tax,
        discount=sale.discount,
        total=sale.total,
        payment_method=sale.payment_method,
        amount_received=sale.amount_received,
        change_given=sale.change_given,
        notes=sale.notes,
        created_at=sale.created_at,
        items=items
    )


@router.post("/", response_model=SaleResponse)
async def create_sale(
    sale_data: SaleCreate,
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
            detail="Debe abrir un turno antes de realizar ventas"
        )
    
    location = db.query(Location).filter(Location.id == shift.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Ubicacion no encontrada")
    
    subtotal = 0.0
    total_discount = 0.0
    sale_items = []
    
    for item_data in sale_data.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Producto {item_data.product_id} no encontrado"
            )
        
        stock = db.query(ProductStock).filter(
            ProductStock.product_id == item_data.product_id,
            ProductStock.location_id == shift.location_id
        ).first()
        
        if not stock or stock.quantity < item_data.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para {product.name}"
            )
        
        item_subtotal = product.sale_price * item_data.quantity
        item_discount = item_data.discount
        
        sale_items.append({
            "product": product,
            "stock": stock,
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
    
    change_given = None
    if sale_data.payment_method == PaymentMethod.CASH and sale_data.amount_received:
        change_given = sale_data.amount_received - total
    
    sale = Sale(
        folio=folio,
        location_id=shift.location_id,
        shift_id=shift.id,
        cashier_id=current_user.id,
        subtotal=subtotal,
        discount=total_discount,
        total=total,
        payment_method=sale_data.payment_method,
        amount_received=sale_data.amount_received,
        change_given=change_given,
        notes=sale_data.notes
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
        
        item_info["stock"].quantity -= item_info["quantity"]
        
        movement = StockMovement(
            product_id=item_info["product"].id,
            location_id=shift.location_id,
            movement_type=MovementType.SALE,
            quantity=-item_info["quantity"],
            reference_id=sale.id,
            reference_type="sale",
            created_by_id=current_user.id
        )
        db.add(movement)
    
    shift.total_sales += total
    if sale_data.payment_method == PaymentMethod.CASH:
        shift.total_cash_sales += total
    elif sale_data.payment_method == PaymentMethod.CARD:
        shift.total_card_sales += total
    elif sale_data.payment_method == PaymentMethod.TRANSFER:
        shift.total_transfer_sales += total
    
    db.commit()
    db.refresh(sale)
    
    items_response = []
    for item in sale.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        items_response.append(SaleItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=product.name if product else None,
            product_code=product.code if product else None,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount=item.discount,
            subtotal=item.subtotal
        ))
    
    return SaleResponse(
        id=sale.id,
        folio=sale.folio,
        location_id=sale.location_id,
        location_name=location.name,
        shift_id=sale.shift_id,
        cashier_id=sale.cashier_id,
        cashier_name=current_user.full_name,
        subtotal=sale.subtotal,
        tax=sale.tax,
        discount=sale.discount,
        total=sale.total,
        payment_method=sale.payment_method,
        amount_received=sale.amount_received,
        change_given=sale.change_given,
        notes=sale.notes,
        created_at=sale.created_at,
        items=items_response
    )


@router.get("/by-folio/{folio}", response_model=SaleResponse)
async def get_sale_by_folio(
    folio: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sale = db.query(Sale).filter(Sale.folio == folio).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    location = db.query(Location).filter(Location.id == sale.location_id).first()
    cashier = db.query(User).filter(User.id == sale.cashier_id).first()
    
    items = []
    for item in sale.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        items.append(SaleItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=product.name if product else None,
            product_code=product.code if product else None,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount=item.discount,
            subtotal=item.subtotal
        ))
    
    return SaleResponse(
        id=sale.id,
        folio=sale.folio,
        location_id=sale.location_id,
        location_name=location.name if location else None,
        shift_id=sale.shift_id,
        cashier_id=sale.cashier_id,
        cashier_name=cashier.full_name if cashier else None,
        subtotal=sale.subtotal,
        tax=sale.tax,
        discount=sale.discount,
        total=sale.total,
        payment_method=sale.payment_method,
        amount_received=sale.amount_received,
        change_given=sale.change_given,
        notes=sale.notes,
        created_at=sale.created_at,
        items=items
    )

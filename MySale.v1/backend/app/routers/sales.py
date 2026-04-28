from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User, RoleType
from app.models.shift import Shift, ShiftStatus
from app.models.sale import Sale, SaleItem, PaymentMethod
from app.models.inventory import Product
from app.models.location import Location
from app.schemas.sale import SaleCreate, SaleResponse, SaleItemResponse
from app.utils.auth import get_current_user, require_role

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
        if sale_data.location_id:
            location = db.query(Location).filter(Location.id == sale_data.location_id).first()
            if not location:
                raise HTTPException(status_code=404, detail="Ubicacion no encontrada")
            shift = Shift(
                user_id=current_user.id,
                location_id=location.id,
                initial_cash=0.0,
                notes="Turno auto-creado por Venta Rápida"
            )
            db.add(shift)
            db.flush()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe abrir un turno antes de realizar ventas"
            )
    else:
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


# --- Bulk Sales Import (historical data) ---

class BulkSaleItem(BaseModel):
    product_name: str
    quantity: float
    unit_price: float
    discount: float = 0.0

class BulkSale(BaseModel):
    folio: str
    date: str  # ISO format date
    time: str  # HH:MM:SS
    payment_method: str = "cash"
    items: List[BulkSaleItem]
    table_number: Optional[int] = None

class BulkSalesImport(BaseModel):
    location_id: int
    cashier_id: int
    sales: List[BulkSale]


@router.post("/bulk-import")
async def bulk_import_sales(
    data: BulkSalesImport,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER))
):
    """Import historical sales data bypassing stock checks and shift requirements."""
    location = db.query(Location).filter(Location.id == data.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Ubicacion no encontrada")

    cashier = db.query(User).filter(User.id == data.cashier_id).first()
    if not cashier:
        raise HTTPException(status_code=404, detail="Cajero no encontrado")

    # Build product name->id mapping
    products = db.query(Product).all()
    name_to_product: Dict[str, Product] = {}
    for p in products:
        name_to_product[p.name.strip().lower()] = p

    # Group sales by date to create one shift per day
    sales_by_date: Dict[str, List[BulkSale]] = {}
    for sale in data.sales:
        d = sale.date
        if d not in sales_by_date:
            sales_by_date[d] = []
        sales_by_date[d].append(sale)

    created_sales = 0
    created_shifts = 0
    skipped_items = 0
    errors: List[str] = []

    for sale_date_str, day_sales in sorted(sales_by_date.items()):
        sale_date = datetime.fromisoformat(sale_date_str).date()

        # Create a closed shift for this day
        shift_start = datetime.combine(sale_date, datetime.strptime("08:00:00", "%H:%M:%S").time())
        shift_end = datetime.combine(sale_date, datetime.strptime("22:00:00", "%H:%M:%S").time())

        day_total = 0.0
        day_cash_total = 0.0
        day_card_total = 0.0
        day_transfer_total = 0.0

        shift = Shift(
            user_id=data.cashier_id,
            location_id=data.location_id,
            start_time=shift_start,
            end_time=shift_end,
            status=ShiftStatus.CLOSED,
            initial_cash=100000,
            final_cash=0,
            total_sales=0,
            total_cash_sales=0,
            total_card_sales=0,
            total_transfer_sales=0,
        )
        db.add(shift)
        db.flush()
        created_shifts += 1

        for sale_data in day_sales:
            # Parse sale time
            try:
                sale_time = datetime.strptime(sale_data.time, "%H:%M:%S").time()
            except ValueError:
                sale_time = datetime.strptime("12:00:00", "%H:%M:%S").time()

            sale_datetime = datetime.combine(sale_date, sale_time)

            # Map payment method
            pm = PaymentMethod.CASH
            pm_str = sale_data.payment_method.upper()
            if "TAR" in pm_str or "CARD" in pm_str:
                pm = PaymentMethod.CARD
            elif "NEQUI" in pm_str:
                pm = PaymentMethod.NEQUI
            elif "BREB" in pm_str or "BRE-B" in pm_str or "BRE_B" in pm_str:
                pm = PaymentMethod.BREB
            elif "TRANS" in pm_str:
                pm = PaymentMethod.TRANSFER

            # Process items
            sale_subtotal = 0.0
            sale_items_list = []
            for item in sale_data.items:
                key = item.product_name.strip().lower()
                product = name_to_product.get(key)
                if not product:
                    skipped_items += 1
                    errors.append(f"Product not found: '{item.product_name}'")
                    continue

                item_subtotal = item.unit_price * item.quantity
                sale_items_list.append({
                    "product_id": product.id,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "cost_at_sale": product.weighted_cost,
                    "discount": item.discount,
                    "subtotal": item_subtotal - item.discount
                })
                sale_subtotal += item_subtotal

            if not sale_items_list:
                continue

            sale_total = sale_subtotal

            # Create sale record
            sale = Sale(
                folio=sale_data.folio,
                location_id=data.location_id,
                shift_id=shift.id,
                cashier_id=data.cashier_id,
                subtotal=sale_subtotal,
                tax=0.0,
                discount=0.0,
                total=sale_total,
                payment_method=pm,
                amount_received=sale_total if pm == PaymentMethod.CASH else None,
                change_given=0.0 if pm == PaymentMethod.CASH else None,
                created_at=sale_datetime,
                sale_type="regular"
            )
            db.add(sale)
            db.flush()

            # Create sale items
            for si in sale_items_list:
                sale_item = SaleItem(
                    sale_id=sale.id,
                    product_id=si["product_id"],
                    quantity=si["quantity"],
                    unit_price=si["unit_price"],
                    cost_at_sale=si["cost_at_sale"],
                    discount=si["discount"],
                    subtotal=si["subtotal"]
                )
                db.add(sale_item)

            day_total += sale_total
            if pm == PaymentMethod.CASH:
                day_cash_total += sale_total
            elif pm == PaymentMethod.CARD:
                day_card_total += sale_total
            else:
                day_transfer_total += sale_total

            created_sales += 1

        # Update shift totals
        shift.total_sales = day_total
        shift.total_cash_sales = day_cash_total
        shift.total_card_sales = day_card_total
        shift.total_transfer_sales = day_transfer_total
        shift.final_cash = 100000 + day_cash_total

    # Update location folio counter
    location.folio_counter = max(location.folio_counter, len(data.sales))

    db.commit()

    return {
        "status": "success",
        "created_sales": created_sales,
        "created_shifts": created_shifts,
        "skipped_items": skipped_items,
        "errors": errors[:20] if errors else []
    }


class BulkDeleteRequest(BaseModel):
    location_id: int


@router.post("/bulk-delete")
async def bulk_delete_sales(
    data: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER))
):
    """Delete all sales and shifts for a location (for reimport)."""
    location = db.query(Location).filter(Location.id == data.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Ubicacion no encontrada")

    # Delete sale items first
    sales = db.query(Sale).filter(Sale.location_id == data.location_id).all()
    sale_ids = [s.id for s in sales]
    if sale_ids:
        db.query(SaleItem).filter(SaleItem.sale_id.in_(sale_ids)).delete(synchronize_session=False)

    # Delete sales
    deleted_sales = db.query(Sale).filter(Sale.location_id == data.location_id).delete(synchronize_session=False)

    # Delete shifts for this location
    deleted_shifts = db.query(Shift).filter(Shift.location_id == data.location_id).delete(synchronize_session=False)

    # Reset folio counter
    location.folio_counter = 0

    db.commit()

    return {
        "status": "success",
        "deleted_sales": deleted_sales,
        "deleted_shifts": deleted_shifts
    }

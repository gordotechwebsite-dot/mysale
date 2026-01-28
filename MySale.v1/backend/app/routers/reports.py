from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime, timedelta
from io import BytesIO
from app.database import get_db
from app.models.user import User, RoleType
from app.models.sale import Sale, SaleItem, PaymentMethod
from app.models.shift import Shift
from app.models.inventory import Product, ProductStock, Group, Family, SubFamily
from app.models.location import Location
from app.models.loss import Loss
from app.models.expense import Expense
from app.schemas.reports import (
    SalesReportRequest, SalesReportResponse, SaleDetailReport,
    InventoryReportResponse, ProductStockReport,
    EmployeeReportResponse, EmployeeShiftReport
)
from app.utils.auth import get_current_user, require_role

router = APIRouter(prefix="/api/reports", tags=["Reportes"])


@router.post("/sales", response_model=SalesReportResponse)
async def get_sales_report(
    request: SalesReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    query = db.query(Sale).filter(
        Sale.created_at >= datetime.combine(request.start_date, datetime.min.time()),
        Sale.created_at <= datetime.combine(request.end_date, datetime.max.time())
    )
    
    if request.location_id:
        query = query.filter(Sale.location_id == request.location_id)
    if request.cashier_id:
        query = query.filter(Sale.cashier_id == request.cashier_id)
    
    sales = query.all()
    
    total_sales = sum(s.total for s in sales)
    total_cash = sum(s.total for s in sales if s.payment_method == PaymentMethod.CASH)
    total_card = sum(s.total for s in sales if s.payment_method == PaymentMethod.CARD)
    total_transfer = sum(s.total for s in sales if s.payment_method == PaymentMethod.TRANSFER)
    
    sales_by_day = {}
    for sale in sales:
        day = sale.created_at.date().isoformat()
        if day not in sales_by_day:
            sales_by_day[day] = {"date": day, "total": 0, "count": 0}
        sales_by_day[day]["total"] += sale.total
        sales_by_day[day]["count"] += 1
    
    details = []
    for sale in sales:
        location = db.query(Location).filter(Location.id == sale.location_id).first()
        cashier = db.query(User).filter(User.id == sale.cashier_id).first()
        
        for item in sale.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            details.append(SaleDetailReport(
                sale_id=sale.id,
                folio=sale.folio,
                date=sale.created_at,
                time=sale.created_at.strftime("%H:%M:%S"),
                product_name=product.name if product else "N/A",
                product_code=product.code if product else "N/A",
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.subtotal,
                payment_method=sale.payment_method,
                cashier_name=cashier.full_name if cashier else "N/A",
                location_name=location.name if location else "N/A"
            ))
    
    return SalesReportResponse(
        total_sales=total_sales,
        total_transactions=len(sales),
        total_cash=total_cash,
        total_card=total_card,
        total_transfer=total_transfer,
        sales_by_day=list(sales_by_day.values()),
        details=details
    )


@router.get("/inventory", response_model=InventoryReportResponse)
async def get_inventory_report(
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    location = None
    if location_id:
        location = db.query(Location).filter(Location.id == location_id).first()
        if not location:
            raise HTTPException(status_code=404, detail="Ubicacion no encontrada")
    
    query = db.query(ProductStock).join(Product)
    if location_id:
        query = query.filter(ProductStock.location_id == location_id)
    
    stocks = query.all()
    
    products = []
    total_value = 0.0
    low_stock_count = 0
    high_stock_count = 0
    
    for stock in stocks:
        product = stock.product
        subfamily = db.query(SubFamily).filter(SubFamily.id == product.subfamily_id).first()
        family = db.query(Family).filter(Family.id == subfamily.family_id).first() if subfamily else None
        group = db.query(Group).filter(Group.id == family.group_id).first() if family else None
        
        stock_value = stock.quantity * product.weighted_cost
        total_value += stock_value
        
        status = "normal"
        if stock.quantity <= product.min_stock:
            status = "low"
            low_stock_count += 1
        elif stock.quantity >= product.max_stock:
            status = "high"
            high_stock_count += 1
        
        products.append(ProductStockReport(
            product_id=product.id,
            product_code=product.code,
            product_name=product.name,
            group_name=group.name if group else "N/A",
            family_name=family.name if family else "N/A",
            subfamily_name=subfamily.name if subfamily else "N/A",
            unit=product.unit,
            sale_price=product.sale_price,
            weighted_cost=product.weighted_cost,
            quantity=stock.quantity,
            min_stock=product.min_stock,
            max_stock=product.max_stock,
            stock_value=stock_value,
            status=status
        ))
    
    return InventoryReportResponse(
        location_id=location_id,
        location_name=location.name if location else "Todas las ubicaciones",
        total_products=len(products),
        total_stock_value=total_value,
        low_stock_count=low_stock_count,
        high_stock_count=high_stock_count,
        products=products
    )


@router.get("/employees/{user_id}", response_model=EmployeeReportResponse)
async def get_employee_report(
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    
    shifts = db.query(Shift).filter(
        Shift.user_id == user_id,
        Shift.start_time >= datetime.combine(start_date, datetime.min.time()),
        Shift.start_time <= datetime.combine(end_date, datetime.max.time())
    ).all()
    
    total_hours = 0.0
    total_sales = 0.0
    total_transactions = 0
    shift_reports = []
    
    for shift in shifts:
        hours = 0.0
        if shift.end_time:
            delta = shift.end_time - shift.start_time
            hours = delta.total_seconds() / 3600
        
        total_hours += hours
        total_sales += shift.total_sales
        
        sales_count = db.query(Sale).filter(Sale.shift_id == shift.id).count()
        total_transactions += sales_count
        
        shift_reports.append(EmployeeShiftReport(
            shift_id=shift.id,
            date=shift.start_time.date(),
            start_time=shift.start_time,
            end_time=shift.end_time,
            hours_worked=hours if shift.end_time else None,
            total_sales=shift.total_sales,
            transactions_count=sales_count
        ))
    
    from app.models.shift import ShiftAlert
    alerts_count = db.query(ShiftAlert).filter(ShiftAlert.user_id == user_id).count()
    
    return EmployeeReportResponse(
        user_id=user.id,
        user_name=user.full_name,
        total_hours=total_hours,
        total_sales=total_sales,
        total_transactions=total_transactions,
        points=user.points,
        alerts_count=alerts_count,
        shifts=shift_reports
    )


@router.get("/export/sales/excel")
async def export_sales_excel(
    start_date: date,
    end_date: date,
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    from openpyxl import Workbook
    
    query = db.query(Sale).filter(
        Sale.created_at >= datetime.combine(start_date, datetime.min.time()),
        Sale.created_at <= datetime.combine(end_date, datetime.max.time())
    )
    
    if location_id:
        query = query.filter(Sale.location_id == location_id)
    
    sales = query.all()
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Ventas"
    
    headers = ["Folio", "Fecha", "Hora", "Producto", "Codigo", "Cantidad", 
               "Precio Unitario", "Subtotal", "Metodo de Pago", "Cajero", "Ubicacion"]
    ws.append(headers)
    
    for sale in sales:
        location = db.query(Location).filter(Location.id == sale.location_id).first()
        cashier = db.query(User).filter(User.id == sale.cashier_id).first()
        
        for item in sale.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            ws.append([
                sale.folio,
                sale.created_at.strftime("%Y-%m-%d"),
                sale.created_at.strftime("%H:%M:%S"),
                product.name if product else "N/A",
                product.code if product else "N/A",
                item.quantity,
                item.unit_price,
                item.subtotal,
                sale.payment_method.value,
                cashier.full_name if cashier else "N/A",
                location.name if location else "N/A"
            ])
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"ventas_{start_date}_{end_date}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/inventory/excel")
async def export_inventory_excel(
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    from openpyxl import Workbook
    
    query = db.query(ProductStock).join(Product)
    if location_id:
        query = query.filter(ProductStock.location_id == location_id)
    
    stocks = query.all()
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Inventario"
    
    headers = ["Codigo", "Producto", "Grupo", "Familia", "Subfamilia", "Unidad",
               "Precio Venta", "Costo Ponderado", "Cantidad", "Stock Min", "Stock Max",
               "Valor Stock", "Estado"]
    ws.append(headers)
    
    for stock in stocks:
        product = stock.product
        subfamily = db.query(SubFamily).filter(SubFamily.id == product.subfamily_id).first()
        family = db.query(Family).filter(Family.id == subfamily.family_id).first() if subfamily else None
        group = db.query(Group).filter(Group.id == family.group_id).first() if family else None
        
        stock_value = stock.quantity * product.weighted_cost
        
        status = "Normal"
        if stock.quantity <= product.min_stock:
            status = "Bajo"
        elif stock.quantity >= product.max_stock:
            status = "Alto"
        
        ws.append([
            product.code,
            product.name,
            group.name if group else "N/A",
            family.name if family else "N/A",
            subfamily.name if subfamily else "N/A",
            product.unit,
            product.sale_price,
            product.weighted_cost,
            stock.quantity,
            product.min_stock,
            product.max_stock,
            stock_value,
            status
        ])
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    location = db.query(Location).filter(Location.id == location_id).first() if location_id else None
    loc_name = location.code if location else "todas"
    filename = f"inventario_{loc_name}_{date.today()}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/dashboard")
async def get_dashboard_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    start_of_day = datetime.combine(today, datetime.min.time())
    end_of_day = datetime.combine(today, datetime.max.time())
    
    today_sales = db.query(func.sum(Sale.total)).filter(
        Sale.created_at >= start_of_day,
        Sale.created_at <= end_of_day
    ).scalar() or 0
    
    today_transactions = db.query(Sale).filter(
        Sale.created_at >= start_of_day,
        Sale.created_at <= end_of_day
    ).count()
    
    start_of_month = today.replace(day=1)
    month_sales = db.query(func.sum(Sale.total)).filter(
        Sale.created_at >= datetime.combine(start_of_month, datetime.min.time()),
        Sale.created_at <= end_of_day
    ).scalar() or 0
    
    low_stock_count = 0
    stocks = db.query(ProductStock).join(Product).all()
    for stock in stocks:
        if stock.quantity <= stock.product.min_stock:
            low_stock_count += 1
    
    open_shifts = db.query(Shift).filter(Shift.status == "open").count()
    
    today_losses = db.query(func.sum(Loss.total_value)).filter(
        Loss.created_at >= start_of_day,
        Loss.created_at <= end_of_day
    ).scalar() or 0
    
    today_expenses = db.query(func.sum(Expense.amount)).filter(
        Expense.expense_date >= start_of_day,
        Expense.expense_date <= end_of_day
    ).scalar() or 0
    
    return {
        "today_sales": today_sales,
        "today_transactions": today_transactions,
        "month_sales": month_sales,
        "low_stock_alerts": low_stock_count,
        "open_shifts": open_shifts,
        "today_losses": today_losses,
        "today_expenses": today_expenses
    }

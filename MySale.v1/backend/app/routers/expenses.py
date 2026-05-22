from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from app.database import get_db
from app.models.user import User, RoleType
from app.models.expense import Expense, ExpenseCategory
from app.models.location import Location
from app.schemas.expense import ExpenseCreate, ExpenseResponse
from app.utils.auth import get_current_user, require_role

router = APIRouter(prefix="/api/expenses", tags=["Gastos"])


def _get_tenant_location_ids(db: Session, current_user: User) -> list:
    if not current_user.tenant_id:
        return []
    locs = db.query(Location.id).filter(Location.tenant_id == current_user.tenant_id).all()
    return [l[0] for l in locs]


@router.get("/", response_model=List[ExpenseResponse])
async def get_expenses(
    location_id: Optional[int] = None,
    category: Optional[ExpenseCategory] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Expense)
    
    # Tenant isolation
    if current_user.tenant_id:
        tenant_loc_ids = _get_tenant_location_ids(db, current_user)
        if tenant_loc_ids:
            query = query.filter(Expense.location_id.in_(tenant_loc_ids))
    
    if location_id:
        query = query.filter(Expense.location_id == location_id)
    if category:
        query = query.filter(Expense.category == category)
    if start_date:
        query = query.filter(Expense.expense_date >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(Expense.expense_date <= datetime.combine(end_date, datetime.max.time()))
    
    expenses = query.order_by(Expense.expense_date.desc()).offset(skip).limit(limit).all()
    
    result = []
    for expense in expenses:
        location = db.query(Location).filter(Location.id == expense.location_id).first() if expense.location_id else None
        user = db.query(User).filter(User.id == expense.created_by_id).first()
        
        result.append(ExpenseResponse(
            id=expense.id,
            location_id=expense.location_id,
            location_name=location.name if location else None,
            category=expense.category,
            description=expense.description,
            amount=expense.amount,
            invoice_number=expense.invoice_number,
            supplier=expense.supplier,
            created_by_id=expense.created_by_id,
            created_by_name=user.full_name if user else None,
            expense_date=expense.expense_date,
            created_at=expense.created_at
        ))
    
    return result


@router.post("/", response_model=ExpenseResponse)
async def create_expense(
    expense_data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    location = None
    if expense_data.location_id:
        location = db.query(Location).filter(Location.id == expense_data.location_id).first()
        if not location:
            raise HTTPException(status_code=404, detail="Ubicacion no encontrada")
    
    expense = Expense(
        location_id=expense_data.location_id,
        category=expense_data.category,
        description=expense_data.description,
        amount=expense_data.amount,
        invoice_number=expense_data.invoice_number,
        supplier=expense_data.supplier,
        created_by_id=current_user.id,
        expense_date=expense_data.expense_date or now_colombia()
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    
    return ExpenseResponse(
        id=expense.id,
        location_id=expense.location_id,
        location_name=location.name if location else None,
        category=expense.category,
        description=expense.description,
        amount=expense.amount,
        invoice_number=expense.invoice_number,
        supplier=expense.supplier,
        created_by_id=expense.created_by_id,
        created_by_name=current_user.full_name,
        expense_date=expense.expense_date,
        created_at=expense.created_at
    )


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    # Tenant isolation
    if current_user.tenant_id and expense.location_id:
        tenant_loc_ids = _get_tenant_location_ids(db, current_user)
        if tenant_loc_ids and expense.location_id not in tenant_loc_ids:
            raise HTTPException(status_code=403, detail="No tienes acceso a este gasto")
    
    location = db.query(Location).filter(Location.id == expense.location_id).first() if expense.location_id else None
    user = db.query(User).filter(User.id == expense.created_by_id).first()
    
    return ExpenseResponse(
        id=expense.id,
        location_id=expense.location_id,
        location_name=location.name if location else None,
        category=expense.category,
        description=expense.description,
        amount=expense.amount,
        invoice_number=expense.invoice_number,
        supplier=expense.supplier,
        created_by_id=expense.created_by_id,
        created_by_name=user.full_name if user else None,
        expense_date=expense.expense_date,
        created_at=expense.created_at
    )


@router.get("/categories/list")
async def get_expense_categories():
    return [
        {"value": "purchase", "label": "Compra"},
        {"value": "utilities", "label": "Servicios"},
        {"value": "rent", "label": "Arriendo"},
        {"value": "salary", "label": "Salarios"},
        {"value": "maintenance", "label": "Mantenimiento"},
        {"value": "supplies", "label": "Suministros"},
        {"value": "other", "label": "Otros"}
    ]

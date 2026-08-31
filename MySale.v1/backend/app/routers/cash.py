from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User, RoleType
from app.models.shift import Shift, ShiftStatus
from app.models.cash import CashCut, CashDenomination, CashClose
from app.models.location import Location
from app.schemas.cash import CashCutCreate, CashCutResponse, CashDenominationResponse, CashCloseCreate, CashCloseResponse
from app.utils.auth import get_current_user
from app.utils.location_scope import require_own_location, scoped_location_id
from datetime import datetime, timedelta
from app.timezone import now_colombia

router = APIRouter(prefix="/api/cash", tags=["Caja"])


def _deny_superuser_cash_ops(current_user: User) -> None:
    if current_user.role.role_type == RoleType.SUPERUSER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El perfil de dueño no puede declarar ni cerrar caja"
        )


@router.get("/cuts", response_model=List[CashCutResponse])
async def get_cash_cuts(
    shift_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CashCut)

    # Tenant isolation: only show cuts from shifts in user's tenant locations
    if current_user.tenant_id:
        tenant_location_ids = [
            loc.id for loc in db.query(Location.id).filter(Location.tenant_id == current_user.tenant_id).all()
        ]
        tenant_shift_ids = [
            s.id for s in db.query(Shift.id).filter(Shift.location_id.in_(tenant_location_ids)).all()
        ]
        query = query.filter(CashCut.shift_id.in_(tenant_shift_ids))

    if current_user.location_id:
        own_shift_ids = [
            s.id for s in db.query(Shift.id).filter(Shift.location_id == current_user.location_id).all()
        ]
        query = query.filter(CashCut.shift_id.in_(own_shift_ids))
    
    if shift_id:
        query = query.filter(CashCut.shift_id == shift_id)
    
    cuts = query.order_by(CashCut.created_at.desc()).all()
    
    result = []
    for cut in cuts:
        denominations = [
            CashDenominationResponse(
                id=d.id,
                denomination=d.denomination,
                quantity=d.quantity,
                total=d.total
            ) for d in cut.denominations
        ]
        result.append(CashCutResponse(
            id=cut.id,
            shift_id=cut.shift_id,
            user_id=cut.user_id,
            expected_cash=cut.expected_cash,
            declared_cash=cut.declared_cash,
            difference=cut.difference,
            is_blind=cut.is_blind,
            notes=cut.notes,
            created_at=cut.created_at,
            denominations=denominations
        ))
    
    return result


@router.post("/blind-cut", response_model=CashCutResponse)
async def create_blind_cash_cut(
    cut_data: CashCutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _deny_superuser_cash_ops(current_user)

    shift = db.query(Shift).filter(Shift.id == cut_data.shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    require_own_location(current_user, shift.location_id)
    
    if shift.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Solo puede hacer corte de caja de su propio turno"
        )
    
    declared_cash = sum(d.denomination * d.quantity for d in cut_data.denominations)
    
    expected_cash = shift.initial_cash + shift.total_cash_sales
    
    difference = declared_cash - expected_cash
    
    cash_cut = CashCut(
        shift_id=shift.id,
        user_id=current_user.id,
        expected_cash=expected_cash,
        declared_cash=declared_cash,
        difference=difference,
        is_blind=True,
        notes=cut_data.notes
    )
    db.add(cash_cut)
    db.flush()
    
    for denom in cut_data.denominations:
        denomination = CashDenomination(
            cash_cut_id=cash_cut.id,
            denomination=denom.denomination,
            quantity=denom.quantity,
            total=denom.denomination * denom.quantity
        )
        db.add(denomination)
    
    db.commit()
    db.refresh(cash_cut)
    
    denominations = [
        CashDenominationResponse(
            id=d.id,
            denomination=d.denomination,
            quantity=d.quantity,
            total=d.total
        ) for d in cash_cut.denominations
    ]
    
    return CashCutResponse(
        id=cash_cut.id,
        shift_id=cash_cut.shift_id,
        user_id=cash_cut.user_id,
        expected_cash=cash_cut.expected_cash,
        declared_cash=cash_cut.declared_cash,
        difference=cash_cut.difference,
        is_blind=cash_cut.is_blind,
        notes=cash_cut.notes,
        created_at=cash_cut.created_at,
        denominations=denominations
    )


@router.get("/denominations")
async def get_denominations():
    return {
        "bills": [100000, 50000, 20000, 10000, 5000, 2000, 1000],
        "coins": [500, 200, 100, 50]
    }


@router.get("/closes", response_model=List[CashCloseResponse])
async def get_cash_closes(
    start_date: str = None,
    end_date: str = None,
    location_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    location_id = scoped_location_id(current_user, location_id)
    query = db.query(CashClose)

    # Tenant isolation: only show closes from user's tenant locations
    if current_user.tenant_id:
        tenant_location_ids = [
            loc.id for loc in db.query(Location.id).filter(Location.tenant_id == current_user.tenant_id).all()
        ]
        query = query.filter(CashClose.location_id.in_(tenant_location_ids))

    if not start_date or not end_date:
        one_year_ago = now_colombia() - timedelta(days=365)
        query = query.filter(CashClose.close_date >= one_year_ago)
    else:
        try:
            sd = datetime.strptime(start_date, "%Y-%m-%d")
            ed = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(CashClose.close_date >= sd, CashClose.close_date < ed)
        except ValueError:
            pass

    if location_id:
        query = query.filter(CashClose.location_id == location_id)

    closes = query.order_by(CashClose.close_date.desc()).all()

    result = []
    for c in closes:
        loc = db.query(Location).filter(Location.id == c.location_id).first()
        usr = db.query(User).filter(User.id == c.user_id).first()
        result.append(CashCloseResponse(
            id=c.id,
            location_id=c.location_id,
            user_id=c.user_id,
            close_date=c.close_date,
            total_sales=c.total_sales,
            total_cash_sales=c.total_cash_sales,
            total_card_sales=c.total_card_sales,
            total_transfer_sales=c.total_transfer_sales,
            total_transactions=c.total_transactions,
            base_amount=c.base_amount,
            expected_cash=c.expected_cash,
            declared_cash=c.declared_cash,
            difference=c.difference,
            notes=c.notes,
            created_at=c.created_at,
            location_name=loc.name if loc else None,
            user_name=usr.name if usr else None,
        ))

    return result


@router.post("/closes", response_model=CashCloseResponse)
async def create_cash_close(
    data: CashCloseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _deny_superuser_cash_ops(current_user)

    try:
        close_date = datetime.strptime(data.close_date, "%Y-%m-%d")
    except ValueError:
        close_date = now_colombia()

    cash_close = CashClose(
        location_id=scoped_location_id(current_user, data.location_id),
        user_id=current_user.id,
        close_date=close_date,
        total_sales=data.total_sales,
        total_cash_sales=data.total_cash_sales,
        total_card_sales=data.total_card_sales,
        total_transfer_sales=data.total_transfer_sales,
        total_transactions=data.total_transactions,
        base_amount=data.base_amount,
        expected_cash=data.expected_cash,
        declared_cash=data.declared_cash,
        difference=data.difference,
        notes=data.notes,
    )
    db.add(cash_close)
    db.commit()
    db.refresh(cash_close)

    loc = db.query(Location).filter(Location.id == cash_close.location_id).first()

    return CashCloseResponse(
        id=cash_close.id,
        location_id=cash_close.location_id,
        user_id=cash_close.user_id,
        close_date=cash_close.close_date,
        total_sales=cash_close.total_sales,
        total_cash_sales=cash_close.total_cash_sales,
        total_card_sales=cash_close.total_card_sales,
        total_transfer_sales=cash_close.total_transfer_sales,
        total_transactions=cash_close.total_transactions,
        base_amount=cash_close.base_amount,
        expected_cash=cash_close.expected_cash,
        declared_cash=cash_close.declared_cash,
        difference=cash_close.difference,
        notes=cash_close.notes,
        created_at=cash_close.created_at,
        location_name=loc.name if loc else None,
        user_name=current_user.name,
    )


@router.delete("/closes/{close_id}")
async def delete_cash_close(
    close_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _deny_superuser_cash_ops(current_user)

    cash_close = db.query(CashClose).filter(CashClose.id == close_id).first()
    if not cash_close:
        raise HTTPException(status_code=404, detail="Cierre de caja no encontrado")

    require_own_location(current_user, cash_close.location_id)

    db.delete(cash_close)
    db.commit()
    return {"detail": "Cierre de caja eliminado"}

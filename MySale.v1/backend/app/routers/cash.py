from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.shift import Shift, ShiftStatus
from app.models.cash import CashCut, CashDenomination
from app.schemas.cash import CashCutCreate, CashCutResponse, CashDenominationResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/cash", tags=["Caja"])


@router.get("/cuts", response_model=List[CashCutResponse])
async def get_cash_cuts(
    shift_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CashCut)
    
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
    shift = db.query(Shift).filter(Shift.id == cut_data.shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    
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

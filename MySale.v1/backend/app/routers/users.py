import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User, Role, RoleType, UserModule
from app.models.tenant import Module, TenantModule, TenantPayment
from app.models.branch import WorkSession
from app.models.shift import Shift, ShiftAlert
from app.models.sale import Sale, SaleItem
from app.models.cash import CashCut, CashClose, CashDenomination
from app.models.loss import Loss, LossItem
from app.models.transfer import Transfer, TransferItem
from app.models.expense import Expense
from app.models.cost_control import CostEntry, CostConfig, CostApplication
from app.models.table import Ticket, TicketItem, TicketPayment
from app.models.audit import AuditLog
from app.models.support import SupportConversation, SupportMessage
from app.models.biometric import Fingerprint, BiometricLog, AttendanceRecord
from app.models.inventory import StockMovement
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse,
    RoleCreate, RoleResponse, UserModuleResponse
)
from app.utils.auth import get_password_hash, get_current_user, require_role, get_pin_hash
from app.models.location import Location
from app.utils.branch_location import get_branch_for_location
from app.utils.location_scope import require_own_location

router = APIRouter(prefix="/api/users", tags=["Usuarios"])


def _build_user_response(user: User, db: Session) -> UserResponse:
    modules = None
    if user.user_modules:
        modules = [
            UserModuleResponse(
                module_id=um.module_id,
                code=um.module.code,
                name=um.module.name,
                is_enabled=um.is_enabled
            )
            for um in user.user_modules if um.module
        ]
    return UserResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        phone=user.phone,
        cedula=user.cedula,
        photo_url=user.photo_url,
        has_pin=bool(user.pin_hash),
        role_id=user.role_id,
        role=user.role,
        location_id=user.location_id,
        tenant_id=user.tenant_id,
        is_active=user.is_active,
        points=user.points,
        created_at=user.created_at,
        modules=modules
    )


def _sync_default_branch(db: Session, user: User):
    """Keep the clock in/out branch aligned with the location assigned to the user."""
    if not user.location_id or user.location_id <= 0:
        user.default_branch_id = None
        return

    location = db.query(Location).filter(
        Location.id == user.location_id,
        Location.tenant_id == user.tenant_id
    ).first()
    if not location:
        return

    user.default_branch_id = get_branch_for_location(db, user.tenant_id, location).id


def _validate_assigned_location(
    db: Session,
    current_user: User,
    location_id: Optional[int]
) -> None:
    """La sede que se asigna a un usuario debe ser del negocio y de la sede del creador."""
    if not location_id:
        return

    require_own_location(current_user, location_id)

    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ubicacion no encontrada"
        )
    if current_user.tenant_id and location.tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La sede no pertenece a este cliente"
        )


def _sync_user_modules(db: Session, user_id: int, module_ids: List[int]):
    db.query(UserModule).filter(UserModule.user_id == user_id).delete()
    for mid in module_ids:
        db.add(UserModule(user_id=user_id, module_id=mid, is_enabled=True))
    db.flush()


@router.get("/roles", response_model=List[RoleResponse])
async def get_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import or_
    # Filter roles: include global roles (tenant_id IS NULL) and tenant-specific roles
    if current_user.tenant_id:
        roles = db.query(Role).filter(
            or_(Role.tenant_id == None, Role.tenant_id == current_user.tenant_id)
        ).all()
    else:
        # System admin sees all roles
        roles = db.query(Role).all()
    return roles


@router.post("/roles", response_model=RoleResponse)
async def create_role(
    role: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER))
):
    existing = db.query(Role).filter(Role.name == role.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un rol con ese nombre"
        )
    
    db_role = Role(**role.model_dump())
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role


# IMPORTANT: /me/modules MUST be defined BEFORE /{user_id} routes
@router.get("/me/modules")
async def get_my_modules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get enabled modules for the current user.
    If the user has UserModule records, return only those (intersected with tenant modules).
    If not, return all tenant modules (backward compatible).
    """
    # Superuser without tenant sees all modules
    if current_user.role and current_user.role.role_type == RoleType.SUPERUSER and not current_user.tenant_id:
        modules = db.query(Module).filter(Module.is_active == True).order_by(Module.display_order).all()
        return [
            {
                "id": m.id,
                "code": m.code,
                "name": m.name,
                "icon": m.icon,
                "route": m.route,
                "display_order": m.display_order
            }
            for m in modules
        ]
    
    # Tenant users
    if not current_user.tenant_id:
        return []
    
    # Check if user has specific module assignments
    user_module_records = db.query(UserModule).filter(
        UserModule.user_id == current_user.id,
        UserModule.is_enabled == True
    ).all()
    
    if user_module_records:
        # User has specific modules assigned — intersect with tenant modules
        user_module_ids = {um.module_id for um in user_module_records}
        enabled_modules = db.query(Module).join(
            TenantModule, TenantModule.module_id == Module.id
        ).filter(
            TenantModule.tenant_id == current_user.tenant_id,
            TenantModule.is_enabled == True,
            Module.is_active == True,
            Module.id.in_(user_module_ids)
        ).order_by(Module.display_order).all()
    else:
        # No specific modules — return all tenant modules (backward compatible)
        enabled_modules = db.query(Module).join(
            TenantModule, TenantModule.module_id == Module.id
        ).filter(
            TenantModule.tenant_id == current_user.tenant_id,
            TenantModule.is_enabled == True,
            Module.is_active == True
        ).order_by(Module.display_order).all()
    
    return [
        {
            "id": m.id,
            "code": m.code,
            "name": m.name,
            "icon": m.icon,
            "route": m.route,
            "display_order": m.display_order
        }
        for m in enabled_modules
    ]


@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Filter users by tenant_id - each client only sees their own users
    query = db.query(User)
    if current_user.tenant_id:
        query = query.filter(User.tenant_id == current_user.tenant_id)

    # Un usuario con sede fija solo ve el personal de su sede
    if current_user.location_id:
        query = query.filter(User.location_id == current_user.location_id)
    
    users = query.offset(skip).limit(limit).all()
    return [_build_user_response(u, db) for u in users]


@router.post("/", response_model=UserResponse)
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    existing = db.query(User).filter(User.username == user.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un usuario con ese nombre"
        )
    
    role = db.query(Role).filter(Role.id == user.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol no encontrado"
        )
    
    if role.role_type == RoleType.SUPERUSER and current_user.role.role_type != RoleType.SUPERUSER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un superusuario puede crear otro superusuario"
        )
    
    _validate_assigned_location(db, current_user, user.location_id)

    hashed_password = get_password_hash(user.password)
    pin_hash = get_pin_hash(user.pin) if user.pin else None
    db_user = User(
        username=user.username,
        full_name=user.full_name,
        phone=user.phone,
        cedula=user.cedula,
        photo_url=user.photo_url,
        hashed_password=hashed_password,
        pin_hash=pin_hash,
        role_id=user.role_id,
        location_id=user.location_id or current_user.location_id,
        tenant_id=current_user.tenant_id  # Assign same tenant as creator
    )
    db.add(db_user)
    db.flush()
    
    _sync_default_branch(db, db_user)
    
    # Assign modules if specified; if not, leave empty (user sees all tenant modules)
    if user.module_ids:
        _sync_user_modules(db, db_user.id, user.module_ids)
    
    db.commit()
    db.refresh(db_user)
    
    return _build_user_response(db_user, db)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(User).filter(User.id == user_id)
    if current_user.tenant_id:
        query = query.filter(User.tenant_id == current_user.tenant_id)
    user = query.first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    require_own_location(current_user, user.location_id)
    return _build_user_response(user, db)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    query = db.query(User).filter(User.id == user_id)
    if current_user.tenant_id:
        query = query.filter(User.tenant_id == current_user.tenant_id)
    user = query.first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    require_own_location(current_user, user.location_id)

    update_data = user_update.model_dump(exclude_unset=True)
    
    # Handle module_ids separately
    module_ids = update_data.pop("module_ids", None)

    # Solo la plataforma (superusuario sin cliente) puede mover un usuario de cliente
    if "tenant_id" in update_data and current_user.tenant_id:
        update_data.pop("tenant_id")

    if "location_id" in update_data:
        _validate_assigned_location(db, current_user, update_data["location_id"])
    
    # Hash password if provided
    if "password" in update_data:
        user.hashed_password = get_password_hash(update_data.pop("password"))
    
    # Hash pin if provided (never stored in plain text)
    pin_val = update_data.pop("pin", None)
    if pin_val:
        user.pin_hash = get_pin_hash(pin_val)
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    if "location_id" in update_data:
        _sync_default_branch(db, user)
    
    # Sync modules if provided
    if module_ids is not None:
        _sync_user_modules(db, user.id, module_ids)
    
    db.commit()
    db.refresh(user)
    
    return _build_user_response(user, db)


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER))
):
    query = db.query(User).filter(User.id == user_id)
    if current_user.tenant_id:
        query = query.filter(User.tenant_id == current_user.tenant_id)
    user = query.first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    require_own_location(current_user, user.location_id)

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puede eliminar su propio usuario"
        )
    
    # Delete all related records to avoid foreign key constraint errors
    # Order matters: child records first, then parents

    # 1. Sale items → Sales (via shifts)
    shift_ids = [s.id for s in db.query(Shift.id).filter(Shift.user_id == user_id).all()]
    if shift_ids:
        sale_ids = [s.id for s in db.query(Sale.id).filter(Sale.shift_id.in_(shift_ids)).all()]
        if sale_ids:
            db.query(SaleItem).filter(SaleItem.sale_id.in_(sale_ids)).delete(synchronize_session=False)
            db.query(Sale).filter(Sale.id.in_(sale_ids)).delete(synchronize_session=False)
        # Cash denominations → Cash cuts (via shifts)
        cut_ids = [c.id for c in db.query(CashCut.id).filter(CashCut.shift_id.in_(shift_ids)).all()]
        if cut_ids:
            db.query(CashDenomination).filter(CashDenomination.cash_cut_id.in_(cut_ids)).delete(synchronize_session=False)
        db.query(CashCut).filter(CashCut.shift_id.in_(shift_ids)).delete(synchronize_session=False)

    # 2. Also delete cash cuts/sales directly linked to user
    user_cut_ids = [c.id for c in db.query(CashCut.id).filter(CashCut.user_id == user_id).all()]
    if user_cut_ids:
        db.query(CashDenomination).filter(CashDenomination.cash_cut_id.in_(user_cut_ids)).delete(synchronize_session=False)
    db.query(CashCut).filter(CashCut.user_id == user_id).delete(synchronize_session=False)
    remaining_sale_ids = [s.id for s in db.query(Sale.id).filter(Sale.cashier_id == user_id).all()]
    if remaining_sale_ids:
        db.query(SaleItem).filter(SaleItem.sale_id.in_(remaining_sale_ids)).delete(synchronize_session=False)
    db.query(Sale).filter(Sale.cashier_id == user_id).delete(synchronize_session=False)

    # 3. Shifts
    db.query(Shift).filter(Shift.user_id == user_id).delete(synchronize_session=False)
    db.query(Shift).filter(Shift.closed_by_id == user_id).update({Shift.closed_by_id: None}, synchronize_session=False)

    # 4. Cash closes
    db.query(CashClose).filter(CashClose.user_id == user_id).delete(synchronize_session=False)

    # 5. Loss items → Losses
    loss_ids = [l.id for l in db.query(Loss.id).filter(Loss.reported_by == user_id).all()]
    if loss_ids:
        db.query(LossItem).filter(LossItem.loss_id.in_(loss_ids)).delete(synchronize_session=False)
    db.query(Loss).filter(Loss.reported_by == user_id).delete(synchronize_session=False)

    # 6. Transfer items → Transfers
    transfer_ids = [t.id for t in db.query(Transfer.id).filter(Transfer.created_by_id == user_id).all()]
    if transfer_ids:
        db.query(TransferItem).filter(TransferItem.transfer_id.in_(transfer_ids)).delete(synchronize_session=False)
    db.query(Transfer).filter(Transfer.created_by_id == user_id).delete(synchronize_session=False)
    db.query(Transfer).filter(Transfer.received_by_id == user_id).update({Transfer.received_by_id: None}, synchronize_session=False)

    # 7. Expenses
    db.query(Expense).filter(Expense.created_by_id == user_id).delete(synchronize_session=False)

    # 8. Tickets (nullable waiter_id)
    db.query(Ticket).filter(Ticket.waiter_id == user_id).update({Ticket.waiter_id: None}, synchronize_session=False)

    # 9. Nullable references
    db.query(AuditLog).filter(AuditLog.user_id == user_id).update({AuditLog.user_id: None}, synchronize_session=False)
    db.query(SupportConversation).filter(SupportConversation.user_id == user_id).update({SupportConversation.user_id: None}, synchronize_session=False)
    db.query(SupportMessage).filter(SupportMessage.user_id == user_id).update({SupportMessage.user_id: None}, synchronize_session=False)
    db.query(CostEntry).filter(CostEntry.created_by_id == user_id).update({CostEntry.created_by_id: None}, synchronize_session=False)
    db.query(CostConfig).filter(CostConfig.updated_by_id == user_id).update({CostConfig.updated_by_id: None}, synchronize_session=False)
    db.query(CostApplication).filter(CostApplication.applied_by_id == user_id).update({CostApplication.applied_by_id: None}, synchronize_session=False)
    db.query(StockMovement).filter(StockMovement.created_by_id == user_id).update({StockMovement.created_by_id: None}, synchronize_session=False)
    db.query(TenantPayment).filter(TenantPayment.created_by_id == user_id).update({TenantPayment.created_by_id: None}, synchronize_session=False)

    # 10. User-specific records
    db.query(WorkSession).filter(WorkSession.user_id == user_id).delete(synchronize_session=False)
    db.query(ShiftAlert).filter(ShiftAlert.user_id == user_id).delete(synchronize_session=False)
    db.query(Fingerprint).filter(Fingerprint.user_id == user_id).delete(synchronize_session=False)
    db.query(BiometricLog).filter(BiometricLog.user_id == user_id).delete(synchronize_session=False)
    db.query(AttendanceRecord).filter(AttendanceRecord.user_id == user_id).delete(synchronize_session=False)
    db.query(UserModule).filter(UserModule.user_id == user_id).delete(synchronize_session=False)

    db.delete(user)
    db.commit()
    
    return {"message": "Usuario eliminado exitosamente"}


@router.put("/{user_id}/reset-pin")
async def reset_user_pin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    """Reset a user's PIN and return the new one. Only superuser/admin can do this."""
    query = db.query(User).filter(User.id == user_id)
    if current_user.tenant_id:
        query = query.filter(User.tenant_id == current_user.tenant_id)
    user = query.first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    require_own_location(current_user, user.location_id)

    new_pin = f"{secrets.randbelow(900000) + 100000}"
    user.pin_hash = get_pin_hash(new_pin)
    db.commit()
    
    return {"pin": new_pin, "message": "PIN actualizado exitosamente"}


@router.put("/{user_id}/modules", response_model=UserResponse)
async def update_user_modules(
    user_id: int,
    module_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    """Update the modules assigned to a specific user."""
    query = db.query(User).filter(User.id == user_id)
    if current_user.tenant_id:
        query = query.filter(User.tenant_id == current_user.tenant_id)
    user = query.first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    require_own_location(current_user, user.location_id)

    _sync_user_modules(db, user.id, module_ids)
    db.commit()
    db.refresh(user)
    
    return _build_user_response(user, db)


@router.get("/{user_id}/modules")
async def get_user_modules(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    """Get the modules assigned to a specific user."""
    query = db.query(User).filter(User.id == user_id)
    if current_user.tenant_id:
        query = query.filter(User.tenant_id == current_user.tenant_id)
    user = query.first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    require_own_location(current_user, user.location_id)

    user_mods = db.query(UserModule).filter(
        UserModule.user_id == user_id,
        UserModule.is_enabled == True
    ).all()
    
    return [
        {
            "module_id": um.module_id,
            "code": um.module.code if um.module else "",
            "name": um.module.name if um.module else "",
            "is_enabled": um.is_enabled
        }
        for um in user_mods
    ]

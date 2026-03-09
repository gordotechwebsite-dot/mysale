from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import secrets
import string
import unicodedata
import re

from app.database import get_db
from app.models.tenant import Module, Tenant, TenantModule, TenantPayment, PaymentStatus
from app.models.user import User, Role, RoleType
from app.utils.auth import get_password_hash
from app.schemas.tenant import (
    ModuleCreate, ModuleUpdate, ModuleResponse,
    TenantCreate, TenantUpdate, TenantResponse, TenantListResponse,
    TenantModuleUpdate, TenantModuleResponse,
    TenantPaymentCreate, TenantPaymentResponse,
    UpdatePaymentStatusRequest
)
from app.utils.auth import get_current_user, require_role

router = APIRouter(prefix="/api/admin", tags=["admin"])


def generate_pos_username(name: str) -> str:
    """Generate a POS username from the tenant name"""
    normalized = unicodedata.normalize('NFD', name.lower())
    ascii_name = normalized.encode('ascii', 'ignore').decode('ascii')
    clean_name = re.sub(r'[^a-z0-9]', '', ascii_name)
    if len(clean_name) < 3:
        clean_name = "user"
    return f"{clean_name[:10]}_admin"


def generate_pos_password(length: int = 8) -> str:
    """Generate a random password for POS access"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


@router.get("/modules", response_model=List[ModuleResponse])
async def get_modules(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    modules = db.query(Module).filter(Module.is_active == True).order_by(Module.display_order).all()
    return modules


@router.post("/modules", response_model=ModuleResponse)
async def create_module(
    data: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    existing = db.query(Module).filter(Module.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Module code already exists")
    
    module = Module(
        code=data.code,
        name=data.name,
        description=data.description,
        icon=data.icon,
        route=data.route,
        display_order=data.display_order or 0,
        is_core=data.is_core or False
    )
    db.add(module)
    db.commit()
    db.refresh(module)
    return module


@router.put("/modules/{module_id}", response_model=ModuleResponse)
async def update_module(
    module_id: int,
    data: ModuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    if data.code is not None:
        module.code = data.code
    if data.name is not None:
        module.name = data.name
    if data.description is not None:
        module.description = data.description
    if data.icon is not None:
        module.icon = data.icon
    if data.route is not None:
        module.route = data.route
    if data.display_order is not None:
        module.display_order = data.display_order
    if data.is_core is not None:
        module.is_core = data.is_core
    if data.is_active is not None:
        module.is_active = data.is_active
    
    db.commit()
    db.refresh(module)
    return module


@router.get("/tenants", response_model=List[TenantListResponse])
async def get_tenants(
    is_active: Optional[bool] = True,
    payment_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    query = db.query(Tenant)
    
    if is_active is not None:
        query = query.filter(Tenant.is_active == is_active)
    if payment_status:
        try:
            status = PaymentStatus(payment_status)
            query = query.filter(Tenant.payment_status == status)
        except ValueError:
            pass
    
    tenants = query.order_by(Tenant.created_at.desc()).all()
    
    result = []
    for tenant in tenants:
        enabled_count = db.query(TenantModule).filter(
            TenantModule.tenant_id == tenant.id,
            TenantModule.is_enabled == True
        ).count()
        
        result.append(TenantListResponse(
            id=tenant.id,
            name=tenant.name,
            code=tenant.code,
            subdomain=tenant.subdomain,
            contact_name=tenant.contact_name,
            contact_email=tenant.contact_email,
            payment_status=tenant.payment_status.value,
            payment_due_date=tenant.payment_due_date,
            monthly_fee=tenant.monthly_fee,
            pos_url=getattr(tenant, 'pos_url', None),
            pos_username=getattr(tenant, 'pos_username', None),
            pos_password=getattr(tenant, 'pos_password', None),
            is_active=tenant.is_active,
            created_at=tenant.created_at,
            enabled_modules_count=enabled_count
        ))
    
    return result


@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant_modules = db.query(TenantModule).filter(TenantModule.tenant_id == tenant_id).all()
    modules_response = []
    for tm in tenant_modules:
        module = db.query(Module).filter(Module.id == tm.module_id).first()
        if module:
            modules_response.append(TenantModuleResponse(
                id=tm.id,
                module_id=module.id,
                module_code=module.code,
                module_name=module.name,
                module_icon=module.icon,
                module_route=module.route,
                is_enabled=tm.is_enabled,
                enabled_at=tm.enabled_at
            ))
    
    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        code=tenant.code,
        subdomain=tenant.subdomain,
        logo_url=tenant.logo_url,
        primary_color=tenant.primary_color,
        contact_name=tenant.contact_name,
        contact_email=tenant.contact_email,
        contact_phone=tenant.contact_phone,
        address=tenant.address,
        payment_status=tenant.payment_status.value,
        payment_due_date=tenant.payment_due_date,
        monthly_fee=tenant.monthly_fee,
        notes=tenant.notes,
        is_active=tenant.is_active,
        created_at=tenant.created_at,
        updated_at=tenant.updated_at,
        modules=modules_response
    )


@router.post("/tenants", response_model=TenantResponse)
async def create_tenant(
    data: TenantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    existing = db.query(Tenant).filter(Tenant.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tenant code already exists")
    
    if data.subdomain:
        existing_subdomain = db.query(Tenant).filter(Tenant.subdomain == data.subdomain).first()
        if existing_subdomain:
            raise HTTPException(status_code=400, detail="Subdomain already in use")
    
    pos_username = data.pos_username if data.pos_username else generate_pos_username(data.name)
    pos_password = data.pos_password if data.pos_password else generate_pos_password()
    
    # Generate POS URL automatically if not provided
    pos_url = data.pos_url
    if not pos_url:
        pos_url = "https://www.pos-mysale.co"
    
    tenant = Tenant(
        name=data.name,
        code=data.code,
        subdomain=data.subdomain if data.subdomain else None,
        logo_url=data.logo_url,
        primary_color=data.primary_color or "#10b981",
        contact_name=data.contact_name,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        address=data.address,
        monthly_fee=data.monthly_fee or 0,
        notes=data.notes,
        pos_url=pos_url,
        pos_username=pos_username,
        pos_password=pos_password
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    
    # Create superuser role for this tenant
    admin_role = Role(
        tenant_id=tenant.id,
        name="Superusuario",
        role_type=RoleType.SUPERUSER,
        can_void_sales=True,
        can_manage_inventory=True,
        can_manage_users=True,
        can_view_reports=True,
        can_manage_locations=True,
        can_set_stock_thresholds=True,
        can_close_shifts=True
    )
    db.add(admin_role)
    db.commit()
    db.refresh(admin_role)
    
    # Create admin user for this tenant with the generated credentials
    admin_user = User(
        tenant_id=tenant.id,
        username=pos_username,
        full_name=data.contact_name or data.name,
        email=data.contact_email,
        hashed_password=get_password_hash(pos_password),
        role_id=admin_role.id,
        is_active=True
    )
    db.add(admin_user)
    db.commit()
    
    core_modules = db.query(Module).filter(Module.is_core == True, Module.is_active == True).all()
    for module in core_modules:
        tenant_module = TenantModule(
            tenant_id=tenant.id,
            module_id=module.id,
            is_enabled=True
        )
        db.add(tenant_module)
    db.commit()
    
    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        code=tenant.code,
        subdomain=tenant.subdomain,
        logo_url=tenant.logo_url,
        primary_color=tenant.primary_color,
        contact_name=tenant.contact_name,
        contact_email=tenant.contact_email,
        contact_phone=tenant.contact_phone,
        address=tenant.address,
        payment_status=tenant.payment_status.value,
        payment_due_date=tenant.payment_due_date,
        monthly_fee=tenant.monthly_fee,
        notes=tenant.notes,
        is_active=tenant.is_active,
        created_at=tenant.created_at,
        updated_at=tenant.updated_at,
        modules=[]
    )


@router.put("/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: int,
    data: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    if data.name is not None:
        tenant.name = data.name
    if data.code is not None:
        existing = db.query(Tenant).filter(Tenant.code == data.code, Tenant.id != tenant_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Tenant code already exists")
        tenant.code = data.code
    if data.subdomain is not None:
        if data.subdomain:
            existing = db.query(Tenant).filter(Tenant.subdomain == data.subdomain, Tenant.id != tenant_id).first()
            if existing:
                raise HTTPException(status_code=400, detail="Subdomain already in use")
        tenant.subdomain = data.subdomain
    if data.logo_url is not None:
        tenant.logo_url = data.logo_url
    if data.primary_color is not None:
        tenant.primary_color = data.primary_color
    if data.contact_name is not None:
        tenant.contact_name = data.contact_name
    if data.contact_email is not None:
        tenant.contact_email = data.contact_email
    if data.contact_phone is not None:
        tenant.contact_phone = data.contact_phone
    if data.address is not None:
        tenant.address = data.address
    if data.monthly_fee is not None:
        tenant.monthly_fee = data.monthly_fee
    if data.notes is not None:
        tenant.notes = data.notes
    if data.pos_url is not None:
        tenant.pos_url = data.pos_url
    if data.pos_username is not None:
        tenant.pos_username = data.pos_username
    if data.pos_password is not None:
        tenant.pos_password = data.pos_password
    if data.is_active is not None:
        tenant.is_active = data.is_active
    
    db.commit()
    db.refresh(tenant)
    
    return await get_tenant(tenant_id, db, current_user)


@router.put("/tenants/{tenant_id}/payment-status")
async def update_tenant_payment_status(
    tenant_id: int,
    data: UpdatePaymentStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    try:
        tenant.payment_status = PaymentStatus(data.payment_status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payment status")
    
    if data.payment_due_date:
        tenant.payment_due_date = data.payment_due_date
    
    db.commit()
    return {"message": "Payment status updated successfully"}


@router.put("/tenants/{tenant_id}/modules")
async def update_tenant_modules(
    tenant_id: int,
    modules: List[TenantModuleUpdate],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    for module_update in modules:
        module = db.query(Module).filter(Module.id == module_update.module_id).first()
        if not module:
            continue
        
        tenant_module = db.query(TenantModule).filter(
            TenantModule.tenant_id == tenant_id,
            TenantModule.module_id == module_update.module_id
        ).first()
        
        if tenant_module:
            tenant_module.is_enabled = module_update.is_enabled
            if module_update.is_enabled:
                tenant_module.enabled_at = datetime.utcnow()
                tenant_module.disabled_at = None
            else:
                tenant_module.disabled_at = datetime.utcnow()
        else:
            tenant_module = TenantModule(
                tenant_id=tenant_id,
                module_id=module_update.module_id,
                is_enabled=module_update.is_enabled
            )
            db.add(tenant_module)
    
    db.commit()
    return {"message": "Modules updated successfully"}


@router.delete("/tenants/{tenant_id}")
async def delete_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant.is_active = False
    db.commit()
    return {"message": "Tenant deactivated successfully"}


@router.get("/tenants/{tenant_id}/payments", response_model=List[TenantPaymentResponse])
async def get_tenant_payments(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    payments = db.query(TenantPayment).filter(
        TenantPayment.tenant_id == tenant_id
    ).order_by(TenantPayment.payment_date.desc()).all()
    
    return payments


@router.post("/tenants/{tenant_id}/payments", response_model=TenantPaymentResponse)
async def create_tenant_payment(
    tenant_id: int,
    data: TenantPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    payment = TenantPayment(
        tenant_id=tenant_id,
        amount=data.amount,
        period_start=data.period_start,
        period_end=data.period_end,
        payment_method=data.payment_method,
        reference=data.reference,
        notes=data.notes,
        created_by_id=current_user.id
    )
    db.add(payment)
    
    tenant.payment_status = PaymentStatus.ACTIVE
    tenant.payment_due_date = data.period_end
    
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/dashboard")
async def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    total_tenants = db.query(Tenant).count()
    active_tenants = db.query(Tenant).filter(Tenant.is_active == True).count()
    
    active_payments = db.query(Tenant).filter(
        Tenant.payment_status == PaymentStatus.ACTIVE,
        Tenant.is_active == True
    ).count()
    
    pending_payments = db.query(Tenant).filter(
        Tenant.payment_status == PaymentStatus.PENDING,
        Tenant.is_active == True
    ).count()
    
    overdue_payments = db.query(Tenant).filter(
        Tenant.payment_status == PaymentStatus.OVERDUE,
        Tenant.is_active == True
    ).count()
    
    suspended = db.query(Tenant).filter(
        Tenant.payment_status == PaymentStatus.SUSPENDED,
        Tenant.is_active == True
    ).count()
    
    total_modules = db.query(Module).filter(Module.is_active == True).count()
    
    from sqlalchemy import func
    monthly_revenue = db.query(func.sum(Tenant.monthly_fee)).filter(
        Tenant.is_active == True,
        Tenant.payment_status == PaymentStatus.ACTIVE
    ).scalar() or 0
    
    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "payment_stats": {
            "active": active_payments,
            "pending": pending_payments,
            "overdue": overdue_payments,
            "suspended": suspended
        },
        "total_modules": total_modules,
        "monthly_revenue": monthly_revenue
    }


@router.get("/tenants/{tenant_id}/modules/active", response_model=List[TenantModuleResponse])
async def get_tenant_active_modules(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all active/enabled modules for a specific tenant.
    This endpoint can be used by any authenticated user to check which modules
    are enabled for their tenant.
    """
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Users can only query their own tenant's modules (unless superuser)
    if current_user.tenant_id and current_user.tenant_id != tenant_id:
        if not current_user.role or current_user.role.role_type.value != "superuser":
            raise HTTPException(status_code=403, detail="Cannot access modules for other tenants")
    
    tenant_modules = db.query(TenantModule).filter(
        TenantModule.tenant_id == tenant_id,
        TenantModule.is_enabled == True
    ).all()
    
    modules_response = []
    for tm in tenant_modules:
        module = db.query(Module).filter(Module.id == tm.module_id, Module.is_active == True).first()
        if module:
            modules_response.append(TenantModuleResponse(
                id=tm.id,
                module_id=module.id,
                module_code=module.code,
                module_name=module.name,
                module_icon=module.icon,
                module_route=module.route,
                is_enabled=tm.is_enabled,
                enabled_at=tm.enabled_at
            ))
    
    return modules_response


# Public endpoint to get modules by tenant code (no auth required for POS frontend)
public_router = APIRouter(prefix="/api/public", tags=["public"])


@public_router.get("/tenants/{tenant_code}/modules")
async def get_public_tenant_modules(
    tenant_code: str,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to get enabled modules for a tenant by code.
    Used by POS frontend to load sidebar modules without requiring full auth.
    """
    tenant = db.query(Tenant).filter(Tenant.code == tenant_code, Tenant.is_active == True).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant_modules = db.query(TenantModule).filter(
        TenantModule.tenant_id == tenant.id,
        TenantModule.is_enabled == True
    ).all()
    
    modules = []
    for tm in tenant_modules:
        module = db.query(Module).filter(Module.id == tm.module_id, Module.is_active == True).first()
        if module:
            modules.append({
                "code": module.code,
                "name": module.name,
                "icon": module.icon,
                "route": module.route,
                "display_order": module.display_order
            })
    
    # Sort by display_order
    modules.sort(key=lambda x: x["display_order"])
    
    return {
        "tenant_id": tenant.id,
        "tenant_name": tenant.name,
        "tenant_code": tenant.code,
        "modules": modules
    }


@router.post("/migrate-tenant-users")
async def migrate_tenant_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    """
    Migration endpoint: creates User records for existing tenants that don't have one.
    This fixes tenants created before the user-creation logic was added.
    """
    tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
    created = []
    skipped = []
    
    for tenant in tenants:
        if not tenant.pos_username or not tenant.pos_password:
            skipped.append({"tenant": tenant.name, "reason": "no credentials"})
            continue
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.username == tenant.pos_username).first()
        if existing_user:
            skipped.append({"tenant": tenant.name, "reason": "user already exists"})
            continue
        
        # Check if role exists for this tenant, create if not
        admin_role = db.query(Role).filter(
            Role.tenant_id == tenant.id,
            Role.role_type == RoleType.SUPERUSER
        ).first()
        
        if not admin_role:
            admin_role = Role(
                tenant_id=tenant.id,
                name="Superusuario",
                role_type=RoleType.SUPERUSER,
                can_void_sales=True,
                can_manage_inventory=True,
                can_manage_users=True,
                can_view_reports=True,
                can_manage_locations=True,
                can_set_stock_thresholds=True,
                can_close_shifts=True
            )
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)
        
        # Create user with the tenant's stored credentials
        new_user = User(
            tenant_id=tenant.id,
            username=tenant.pos_username,
            full_name=tenant.contact_name or tenant.name,
            email=tenant.contact_email,
            hashed_password=get_password_hash(tenant.pos_password),
            role_id=admin_role.id,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        
        created.append({"tenant": tenant.name, "username": tenant.pos_username})
    
    return {
        "message": f"Migration complete: {len(created)} users created, {len(skipped)} skipped",
        "created": created,
        "skipped": skipped
    }

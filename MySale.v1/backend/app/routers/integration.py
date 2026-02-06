from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os

from app.database import get_db
from app.models.tenant import Tenant, Module, TenantModule, PaymentStatus
from app.models.user import User, Role, RoleType
from app.utils.auth import get_password_hash

router = APIRouter(prefix="/api/integration", tags=["integration"])

INTEGRATION_API_KEY = os.getenv("INTEGRATION_API_KEY", "posadmin-mysale-integration-key-2024")


class CreateTenantRequest(BaseModel):
    name: str
    code: str
    subdomain: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    monthly_fee: float = 0
    pos_username: str
    pos_password: str


class CreateTenantResponse(BaseModel):
    success: bool
    tenant_id: Optional[int] = None
    user_id: Optional[int] = None
    message: str


def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != INTEGRATION_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


@router.post("/create-tenant", response_model=CreateTenantResponse)
async def create_tenant_with_user(
    data: CreateTenantRequest,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Create a new tenant and admin user for POSAdmin integration.
    This endpoint is called by POSAdmin when a new client is created.
    """
    existing_tenant = db.query(Tenant).filter(Tenant.code == data.code).first()
    if existing_tenant:
        raise HTTPException(status_code=400, detail="Tenant code already exists")
    
    existing_user = db.query(User).filter(User.username == data.pos_username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    try:
        tenant = Tenant(
            name=data.name,
            code=data.code,
            subdomain=data.subdomain,
            contact_name=data.contact_name,
            contact_email=data.contact_email,
            contact_phone=data.contact_phone,
            address=data.address,
            monthly_fee=data.monthly_fee,
            payment_status=PaymentStatus.ACTIVE,
            is_active=True
        )
        db.add(tenant)
        db.flush()
        
        admin_role = db.query(Role).filter(
            Role.tenant_id == tenant.id,
            Role.role_type == RoleType.ADMIN
        ).first()
        
        if not admin_role:
            admin_role = Role(
                tenant_id=tenant.id,
                name="Administrador",
                role_type=RoleType.ADMIN,
                can_void_sales=True,
                can_manage_inventory=True,
                can_manage_users=True,
                can_view_reports=True,
                can_manage_locations=True,
                can_set_stock_thresholds=True,
                can_close_shifts=True
            )
            db.add(admin_role)
            db.flush()
        
        user = User(
            tenant_id=tenant.id,
            username=data.pos_username,
            email=data.contact_email,
            full_name=data.contact_name or data.name,
            hashed_password=get_password_hash(data.pos_password),
            role_id=admin_role.id,
            is_active=True
        )
        db.add(user)
        db.flush()
        
        core_modules = db.query(Module).filter(Module.is_core == True, Module.is_active == True).all()
        for module in core_modules:
            tenant_module = TenantModule(
                tenant_id=tenant.id,
                module_id=module.id,
                is_enabled=True
            )
            db.add(tenant_module)
        
        db.commit()
        
        return CreateTenantResponse(
            success=True,
            tenant_id=tenant.id,
            user_id=user.id,
            message="Tenant and user created successfully"
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating tenant: {str(e)}")


@router.delete("/delete-tenant/{tenant_code}")
async def delete_tenant(
    tenant_code: str,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Deactivate a tenant. Called by POSAdmin when a client is deleted.
    """
    tenant = db.query(Tenant).filter(Tenant.code == tenant_code).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant.is_active = False
    
    users = db.query(User).filter(User.tenant_id == tenant.id).all()
    for user in users:
        user.is_active = False
    
    db.commit()
    
    return {"success": True, "message": "Tenant deactivated successfully"}


@router.put("/update-tenant-status/{tenant_code}")
async def update_tenant_status(
    tenant_code: str,
    is_active: bool,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Update tenant active status. Called by POSAdmin when payment status changes.
    """
    tenant = db.query(Tenant).filter(Tenant.code == tenant_code).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant.is_active = is_active
    
    if not is_active:
        users = db.query(User).filter(User.tenant_id == tenant.id).all()
        for user in users:
            user.is_active = False
    
    db.commit()
    
    return {"success": True, "message": f"Tenant {'activated' if is_active else 'deactivated'} successfully"}


@router.get("/health")
async def health_check():
    """Health check endpoint for POSAdmin to verify MySale is available."""
    return {"status": "ok", "service": "MySale POS"}

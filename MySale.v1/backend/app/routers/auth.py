from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List
import json
from app.database import get_db
from app.models.user import User, Role, RoleType
from app.models.tenant import TenantModule, Module
from app.models.audit import AuditLog
from app.schemas.user import Token, UserResponse, UserLogin
from app.utils.auth import (
    verify_password, get_password_hash, create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Autenticacion"])


def log_audit(db: Session, action: str, user_id: int = None, tenant_id: int = None, 
              username: str = None, resource_type: str = None, resource_id: int = None,
              details: dict = None, ip_address: str = None, user_agent: str = None):
    """Helper function to create audit log entries."""
    audit_log = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        username=username,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=json.dumps(details) if details else None,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # Get client info for audit logging
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        # Log failed login attempt
        log_audit(
            db=db,
            action="login_failed",
            username=form_data.username,
            details={"reason": "invalid_credentials"},
            ip_address=client_ip,
            user_agent=user_agent
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contrasena incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        # Log failed login attempt for inactive user
        log_audit(
            db=db,
            action="login_failed",
            user_id=user.id,
            tenant_id=user.tenant_id,
            username=user.username,
            details={"reason": "user_inactive"},
            ip_address=client_ip,
            user_agent=user_agent
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    role_response = None
    if user.role:
        from app.schemas.user import RoleResponse
        role_response = RoleResponse(
            id=user.role.id,
            name=user.role.name,
            role_type=user.role.role_type,
            can_void_sales=user.role.can_void_sales,
            can_manage_inventory=user.role.can_manage_inventory,
            can_manage_users=user.role.can_manage_users,
            can_view_reports=user.role.can_view_reports,
            can_manage_locations=user.role.can_manage_locations,
            can_set_stock_thresholds=user.role.can_set_stock_thresholds,
            can_close_shifts=user.role.can_close_shifts,
            created_at=user.role.created_at
        )
    
    user_response = UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role_id=user.role_id,
        role=role_response,
        location_id=user.location_id,
        tenant_id=user.tenant_id,
        is_active=user.is_active,
        points=user.points,
        created_at=user.created_at
    )
    
    # Log successful login
    log_audit(
        db=db,
        action="login",
        user_id=user.id,
        tenant_id=user.tenant_id,
        username=user.username,
        resource_type="session",
        details={"method": "password"},
        ip_address=client_ip,
        user_agent=user_agent
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )


@router.post("/login-biometric", response_model=Token)
async def login_biometric(
    fingerprint_hash: str,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.fingerprint_hash == fingerprint_hash).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Huella no reconocida"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    role_response = None
    if user.role:
        from app.schemas.user import RoleResponse
        role_response = RoleResponse(
            id=user.role.id,
            name=user.role.name,
            role_type=user.role.role_type,
            can_void_sales=user.role.can_void_sales,
            can_manage_inventory=user.role.can_manage_inventory,
            can_manage_users=user.role.can_manage_users,
            can_view_reports=user.role.can_view_reports,
            can_manage_locations=user.role.can_manage_locations,
            can_set_stock_thresholds=user.role.can_set_stock_thresholds,
            can_close_shifts=user.role.can_close_shifts,
            created_at=user.role.created_at
        )
    
    user_response = UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role_id=user.role_id,
        role=role_response,
        location_id=user.location_id,
        tenant_id=user.tenant_id,
        is_active=user.is_active,
        points=user.points,
        created_at=user.created_at
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    role_response = None
    if current_user.role:
        from app.schemas.user import RoleResponse
        role_response = RoleResponse(
            id=current_user.role.id,
            name=current_user.role.name,
            role_type=current_user.role.role_type,
            can_void_sales=current_user.role.can_void_sales,
            can_manage_inventory=current_user.role.can_manage_inventory,
            can_manage_users=current_user.role.can_manage_users,
            can_view_reports=current_user.role.can_view_reports,
            can_manage_locations=current_user.role.can_manage_locations,
            can_set_stock_thresholds=current_user.role.can_set_stock_thresholds,
            can_close_shifts=current_user.role.can_close_shifts,
            created_at=current_user.role.created_at
        )
    
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role_id=current_user.role_id,
        role=role_response,
        location_id=current_user.location_id,
        tenant_id=current_user.tenant_id,
        is_active=current_user.is_active,
        points=current_user.points,
        created_at=current_user.created_at
    )


@router.get("/my-modules")
async def get_my_modules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get enabled modules for the current user's tenant."""
    if not current_user.tenant_id:
        all_modules = db.query(Module).filter(Module.is_active == True).order_by(Module.display_order).all()
        return [{"code": m.code, "name": m.name, "icon": m.icon, "route": m.route} for m in all_modules]
    
    enabled_modules = db.query(Module).join(
        TenantModule, TenantModule.module_id == Module.id
    ).filter(
        TenantModule.tenant_id == current_user.tenant_id,
        TenantModule.is_enabled == True,
        Module.is_active == True
    ).order_by(Module.display_order).all()
    
    return [{"code": m.code, "name": m.name, "icon": m.icon, "route": m.route} for m in enabled_modules]

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import json
import logging
from app.database import get_db

logger = logging.getLogger("mysale.auth")
from app.models.user import User, Role, RoleType
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
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        logger.warning(f"LOGIN_FAILED: username='{form_data.username}' reason='invalid_credentials'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contrasena incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        logger.warning(f"LOGIN_FAILED: username='{form_data.username}' reason='inactive_user' user_id={user.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    # Check tenant payment status — block ALL tenant users if suspended
    if user.tenant_id:
        from app.models.tenant import Tenant, PaymentStatus
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if tenant and tenant.payment_status == PaymentStatus.SUSPENDED:
            logger.warning(f"LOGIN_FAILED: username='{form_data.username}' reason='tenant_suspended' tenant_id={user.tenant_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu servicio está suspendido por pago vencido. Para restablecer el acceso, realiza el pago de tu mensualidad."
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
        is_active=user.is_active,
        points=user.points,
        created_at=user.created_at
    )
    
    logger.info(f"LOGIN_SUCCESS: username='{user.username}' user_id={user.id} tenant_id={user.tenant_id} role='{user.role.role_type if user.role else None}'")
    
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
        is_active=current_user.is_active,
        points=current_user.points,
        created_at=current_user.created_at
    )

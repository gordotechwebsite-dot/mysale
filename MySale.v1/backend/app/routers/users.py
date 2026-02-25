from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User, Role, RoleType
from app.models.tenant import Module, TenantModule
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse,
    RoleCreate, RoleResponse
)
from app.utils.auth import get_password_hash, get_current_user, require_role

router = APIRouter(prefix="/api/users", tags=["Usuarios"])


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
    
    users = query.offset(skip).limit(limit).all()
    return [
        UserResponse(
            id=u.id,
            username=u.username,
            full_name=u.full_name,
            phone=u.phone,
            cedula=u.cedula,
            photo_url=u.photo_url,
            role_id=u.role_id,
            role=u.role,
            location_id=u.location_id,
            is_active=u.is_active,
            points=u.points,
            created_at=u.created_at
        ) for u in users
    ]


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
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        full_name=user.full_name,
        phone=user.phone,
        cedula=user.cedula,
        photo_url=user.photo_url,
        hashed_password=hashed_password,
        role_id=user.role_id,
        location_id=user.location_id,
        tenant_id=current_user.tenant_id  # Assign same tenant as creator
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return UserResponse(
        id=db_user.id,
        username=db_user.username,
        full_name=db_user.full_name,
        phone=db_user.phone,
        cedula=db_user.cedula,
        photo_url=db_user.photo_url,
        role_id=db_user.role_id,
        location_id=db_user.location_id,
        is_active=db_user.is_active,
        points=db_user.points,
        created_at=db_user.created_at
    )


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
    return UserResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        phone=user.phone,
        cedula=user.cedula,
        photo_url=user.photo_url,
        role_id=user.role_id,
        role=user.role,
        location_id=user.location_id,
        is_active=user.is_active,
        points=user.points,
        created_at=user.created_at
    )


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
    
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    return UserResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        phone=user.phone,
        cedula=user.cedula,
        photo_url=user.photo_url,
        role_id=user.role_id,
        location_id=user.location_id,
        is_active=user.is_active,
        points=user.points,
        created_at=user.created_at
    )


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
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puede eliminar su propio usuario"
        )
    
    user.is_active = False
    db.commit()
    
    return {"message": "Usuario desactivado exitosamente"}


@router.get("/me/modules")
async def get_my_modules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get enabled modules for the current user's tenant.
    Returns all active modules if user is a superuser without tenant_id.
    """
    # Superuser without tenant sees all modules
    if current_user.role and current_user.role.role_type == RoleType.SUPERUSER and not current_user.tenant_id:
        modules = db.query(Module).filter(Module.is_active == True).order_by(Module.display_order).all()
        return [
            {
                "code": m.code,
                "name": m.name,
                "icon": m.icon,
                "route": m.route,
                "display_order": m.display_order
            }
            for m in modules
        ]
    
    # Tenant users only see their enabled modules
    if not current_user.tenant_id:
        return []
    
    enabled_modules = db.query(Module).join(
        TenantModule, TenantModule.module_id == Module.id
    ).filter(
        TenantModule.tenant_id == current_user.tenant_id,
        TenantModule.is_enabled == True,
        Module.is_active == True
    ).order_by(Module.display_order).all()
    
    return [
        {
            "code": m.code,
            "name": m.name,
            "icon": m.icon,
            "route": m.route,
            "display_order": m.display_order
        }
        for m in enabled_modules
    ]

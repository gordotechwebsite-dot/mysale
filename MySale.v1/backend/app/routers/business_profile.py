from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os
import uuid
import base64

from app.database import get_db
from app.models.user import User, RoleType
from app.models.tenant import Tenant
from app.utils.auth import get_current_user, require_role

router = APIRouter(prefix="/api/business-profile", tags=["Perfil de Negocio"])

UPLOAD_DIR = "/data/uploads/logos"


class BusinessProfileResponse(BaseModel):
    name: str
    logo_url: Optional[str] = None
    razon_social: Optional[str] = None
    nit: Optional[str] = None
    slogan: Optional[str] = None
    address: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    primary_color: Optional[str] = None


class BusinessProfileUpdate(BaseModel):
    name: Optional[str] = None
    razon_social: Optional[str] = None
    nit: Optional[str] = None
    slogan: Optional[str] = None
    address: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    primary_color: Optional[str] = None


@router.get("/", response_model=BusinessProfileResponse)
async def get_business_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    """Get the business profile for the current user's tenant."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Usuario no asociado a un negocio")

    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    return BusinessProfileResponse(
        name=tenant.name,
        logo_url=tenant.logo_url,
        razon_social=tenant.razon_social,
        nit=tenant.nit,
        slogan=tenant.slogan,
        address=tenant.address,
        contact_phone=tenant.contact_phone,
        contact_email=tenant.contact_email,
        primary_color=tenant.primary_color,
    )


@router.put("/", response_model=BusinessProfileResponse)
async def update_business_profile(
    data: BusinessProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    """Update the business profile. Only superuser/admin of the tenant can do this."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Usuario no asociado a un negocio")

    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    if data.name is not None:
        tenant.name = data.name
    if data.razon_social is not None:
        tenant.razon_social = data.razon_social
    if data.nit is not None:
        tenant.nit = data.nit
    if data.slogan is not None:
        tenant.slogan = data.slogan
    if data.address is not None:
        tenant.address = data.address
    if data.contact_phone is not None:
        tenant.contact_phone = data.contact_phone
    if data.contact_email is not None:
        tenant.contact_email = data.contact_email
    if data.primary_color is not None:
        tenant.primary_color = data.primary_color

    db.commit()
    db.refresh(tenant)

    return BusinessProfileResponse(
        name=tenant.name,
        logo_url=tenant.logo_url,
        razon_social=tenant.razon_social,
        nit=tenant.nit,
        slogan=tenant.slogan,
        address=tenant.address,
        contact_phone=tenant.contact_phone,
        contact_email=tenant.contact_email,
        primary_color=tenant.primary_color,
    )


@router.post("/logo")
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    """Upload a logo image for the tenant's business profile."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Usuario no asociado a un negocio")

    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Tipo de archivo no permitido. Use PNG, JPG, WEBP o SVG."
        )

    # Validate file size (max 2MB)
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo no debe superar 2MB")

    # Save file
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "png"
    filename = f"logo_{tenant.id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    # Store the URL path that the static files endpoint will serve
    logo_url = f"/uploads/logos/{filename}"
    tenant.logo_url = logo_url
    db.commit()

    return {"logo_url": logo_url, "message": "Logo actualizado exitosamente"}

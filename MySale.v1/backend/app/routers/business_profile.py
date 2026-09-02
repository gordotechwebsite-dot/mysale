from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os
import uuid
import base64

from app.database import get_db
from app.models.user import User, RoleType
from app.models.tenant import Tenant
from app.models.location import Location
from app.utils.auth import get_current_user, require_role
from app.utils.location_scope import fixed_location_id

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


class LocationReceiptProfile(BaseModel):
    location_id: int
    location_name: str
    name: Optional[str] = None
    razon_social: Optional[str] = None
    nit: Optional[str] = None
    slogan: Optional[str] = None
    address: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    logo_url: Optional[str] = None


class LocationReceiptProfileUpdate(BaseModel):
    name: Optional[str] = None
    razon_social: Optional[str] = None
    nit: Optional[str] = None
    slogan: Optional[str] = None
    address: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None


def _location_receipt_profile(location: Location) -> LocationReceiptProfile:
    return LocationReceiptProfile(
        location_id=location.id,
        location_name=location.name,
        name=location.receipt_business_name,
        razon_social=location.receipt_razon_social,
        nit=location.receipt_nit,
        slogan=location.receipt_slogan,
        address=location.receipt_address,
        contact_phone=location.receipt_phone,
        contact_email=location.receipt_email,
        logo_url=location.receipt_logo_url,
    )


def _get_tenant_location(db: Session, location_id: int, tenant_id: int) -> Location:
    location = db.query(Location).filter(
        Location.id == location_id,
        Location.tenant_id == tenant_id
    ).first()
    if not location:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
    return location


@router.get("/locations", response_model=list[LocationReceiptProfile])
async def get_location_receipt_profiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    """Receipt data of every location of the tenant. Empty fields fall back to the tenant's."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Usuario no asociado a un negocio")

    locations = db.query(Location).filter(
        Location.tenant_id == current_user.tenant_id,
        Location.is_active == True
    ).order_by(Location.name).all()

    return [_location_receipt_profile(location) for location in locations]


@router.put("/locations/{location_id}", response_model=LocationReceiptProfile)
async def update_location_receipt_profile(
    location_id: int,
    data: LocationReceiptProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    """Update the receipt data of one location. An empty value goes back to the tenant's data."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Usuario no asociado a un negocio")

    location = _get_tenant_location(db, location_id, current_user.tenant_id)

    fields = {
        "name": "receipt_business_name",
        "razon_social": "receipt_razon_social",
        "nit": "receipt_nit",
        "slogan": "receipt_slogan",
        "address": "receipt_address",
        "contact_phone": "receipt_phone",
        "contact_email": "receipt_email",
    }
    for field, column in fields.items():
        value = getattr(data, field)
        if value is not None:
            setattr(location, column, value.strip() or None)

    db.commit()
    db.refresh(location)

    return _location_receipt_profile(location)


@router.post("/locations/{location_id}/logo", response_model=LocationReceiptProfile)
async def upload_location_logo(
    location_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    """Upload the receipt logo of one location."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Usuario no asociado a un negocio")

    location = _get_tenant_location(db, location_id, current_user.tenant_id)

    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Tipo de archivo no permitido. Use PNG, JPG, WEBP o SVG."
        )

    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo no debe superar 2MB")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "png"
    filename = f"logo_sede_{location.id}_{uuid.uuid4().hex[:8]}.{ext}"
    with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
        f.write(contents)

    location.receipt_logo_url = f"/uploads/logos/{filename}"
    db.commit()
    db.refresh(location)

    return _location_receipt_profile(location)


@router.delete("/locations/{location_id}/logo", response_model=LocationReceiptProfile)
async def delete_location_logo(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    """Remove the receipt logo of one location so it prints the tenant's logo again."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Usuario no asociado a un negocio")

    location = _get_tenant_location(db, location_id, current_user.tenant_id)
    location.receipt_logo_url = None
    db.commit()
    db.refresh(location)

    return _location_receipt_profile(location)


@router.get("/receipt-info", response_model=BusinessProfileResponse)
async def get_receipt_info(
    location_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get business profile for receipt/ticket printing. Accessible by any authenticated user.

    Every receipt field a location fills in replaces the tenant's; the rest fall back to it.
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Usuario no asociado a un negocio")

    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    own_location_id = fixed_location_id(current_user)
    effective_location_id = own_location_id or location_id

    profile = BusinessProfileResponse(
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

    if not effective_location_id:
        return profile

    location = db.query(Location).filter(
        Location.id == effective_location_id,
        Location.tenant_id == current_user.tenant_id
    ).first()
    if not location:
        return profile

    overrides = {
        "name": location.receipt_business_name,
        "logo_url": location.receipt_logo_url,
        "razon_social": location.receipt_razon_social,
        "nit": location.receipt_nit,
        "slogan": location.receipt_slogan,
        "address": location.receipt_address,
        "contact_phone": location.receipt_phone,
        "contact_email": location.receipt_email,
    }
    for field, value in overrides.items():
        if value:
            setattr(profile, field, value)

    return profile

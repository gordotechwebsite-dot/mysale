from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User, RoleType
from app.models.location import Location
from app.schemas.location import LocationCreate, LocationUpdate, LocationResponse
from app.utils.auth import get_current_user, require_role

router = APIRouter(prefix="/api/locations", tags=["Ubicaciones"])


@router.get("/", response_model=List[LocationResponse])
async def get_locations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    locations = db.query(Location).all()
    return locations


@router.post("/", response_model=LocationResponse)
async def create_location(
    location: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER))
):
    existing = db.query(Location).filter(Location.code == location.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una ubicacion con ese codigo"
        )
    
    db_location = Location(**location.model_dump())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ubicacion no encontrada"
        )
    return location


@router.put("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: int,
    location_update: LocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ubicacion no encontrada"
        )
    
    update_data = location_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(location, field, value)
    
    db.commit()
    db.refresh(location)
    return location


@router.delete("/{location_id}")
async def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER))
):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ubicacion no encontrada"
        )
    
    location.is_active = False
    db.commit()
    
    return {"message": "Ubicacion desactivada exitosamente"}

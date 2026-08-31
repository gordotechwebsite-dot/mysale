"""Helpers for the per-sede menu (carta por sede)."""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.location import Location


def product_belongs_to_location(db: Session, product_location_id: Optional[int], location_id: Optional[int]) -> bool:
    """A product without sede is global, unless the sede has its own menu."""
    if not location_id:
        return True
    if product_location_id:
        return product_location_id == location_id

    location = db.query(Location).filter(Location.id == location_id).first()
    return not (location and location.has_own_menu)

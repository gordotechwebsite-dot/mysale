"""Aislamiento por sede fija del usuario."""
from typing import Optional

from fastapi import HTTPException, status

from app.models.user import User

FORBIDDEN_LOCATION_DETAIL = "Solo puedes operar en la sede que tienes asignada"

ROTATING_LOCATION_ID = -1


def fixed_location_id(current_user: User) -> Optional[int]:
    """Sede fija del usuario, o None si es rotativo o no tiene sede asignada."""
    location_id = current_user.location_id
    if not location_id or location_id == ROTATING_LOCATION_ID:
        return None
    return location_id


def scoped_location_id(current_user: User, requested_location_id: Optional[int]) -> Optional[int]:
    """Sede que se debe usar en la consulta.

    Un usuario con sede fija siempre queda amarrado a su sede: si pide otra se
    rechaza, y si no pide ninguna se le asigna la suya. Un usuario rotativo
    puede escoger cualquier sede de su negocio.
    """
    own_location_id = fixed_location_id(current_user)
    if not own_location_id:
        return requested_location_id

    if requested_location_id and requested_location_id != own_location_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=FORBIDDEN_LOCATION_DETAIL
        )
    return own_location_id


def require_own_location(current_user: User, location_id: Optional[int]) -> None:
    """Rechaza operar sobre datos de otra sede (tickets, mesas, cierres, ventas)."""
    own_location_id = fixed_location_id(current_user)
    if own_location_id and location_id and location_id != own_location_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=FORBIDDEN_LOCATION_DETAIL
        )

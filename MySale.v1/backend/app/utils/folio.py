from typing import Optional

from app.models.location import Location


def generate_folio(location: Location, kind_prefix: Optional[str] = None) -> str:
    """Consecutivo de venta de la sede (SSC001-000123, MESA-SSC001-000124)."""
    location.folio_counter += 1
    prefix = location.folio_prefix or location.code
    folio = f"{prefix}-{location.folio_counter:06d}"
    return f"{kind_prefix}-{folio}" if kind_prefix else folio

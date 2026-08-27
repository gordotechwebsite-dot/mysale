"""Helpers to keep branches (sedes de marcacion) in sync with POS locations.

Locations are the operational unit used by the POS (menu, stock, shifts) while
branches are used by the PIN clock in/out flow. Both represent the same physical
place, so a branch is mirrored from its location on demand.
"""
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.branch import Branch
from app.models.location import Location, LocationType
from app.models.user import User


def get_branch_for_location(db: Session, tenant_id: Optional[int], location: Location) -> Branch:
    """Return the branch that mirrors a location, creating it if it does not exist."""
    branch = db.query(Branch).filter(
        Branch.tenant_id == tenant_id,
        Branch.code == location.code
    ).first()

    if not branch:
        branch = db.query(Branch).filter(
            Branch.tenant_id == tenant_id,
            Branch.name == location.name
        ).first()

    if not branch:
        branch = Branch(
            tenant_id=tenant_id,
            name=location.name,
            code=location.code,
            address=location.address,
            is_active=True
        )
        db.add(branch)
        db.flush()
    elif not branch.is_active:
        branch.is_active = True
        db.flush()

    return branch


def get_fixed_branch_for_user(db: Session, user: User) -> Optional[Branch]:
    """Resolve the fixed branch of a user, either explicit or from its assigned location."""
    if user.default_branch_id and user.default_branch_id > 0:
        branch = db.query(Branch).filter(
            Branch.id == user.default_branch_id,
            Branch.is_active == True
        ).first()
        if branch:
            return branch

    if not user.location_id or user.location_id <= 0:
        return None

    location = db.query(Location).filter(
        Location.id == user.location_id,
        Location.tenant_id == user.tenant_id,
        Location.is_active == True
    ).first()
    if not location:
        return None

    branch = get_branch_for_location(db, user.tenant_id, location)
    user.default_branch_id = branch.id
    db.commit()
    return branch


def sync_branches_from_locations(db: Session, tenant_id: Optional[int]) -> List[Branch]:
    """Ensure every active POS location has a branch and return the active branches."""
    locations = db.query(Location).filter(
        Location.tenant_id == tenant_id,
        Location.location_type == LocationType.POS,
        Location.is_active == True
    ).all()

    for location in locations:
        get_branch_for_location(db, tenant_id, location)

    db.commit()

    return db.query(Branch).filter(
        Branch.tenant_id == tenant_id,
        Branch.is_active == True
    ).all()

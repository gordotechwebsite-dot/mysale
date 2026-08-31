export const ROTATING_LOCATION_ID = -1;

interface UserWithLocation {
  location_id?: number | null;
}

/** Sede fija del empleado, o null si es rotativo o no tiene sede asignada. */
export function getFixedLocationId(user?: UserWithLocation | null): number | null {
  const locationId = user?.location_id;
  if (!locationId || locationId === ROTATING_LOCATION_ID) return null;
  return locationId;
}

/** Solo los empleados rotativos pueden escoger la sede. */
export function canSelectLocation(user?: UserWithLocation | null): boolean {
  return getFixedLocationId(user) === null;
}

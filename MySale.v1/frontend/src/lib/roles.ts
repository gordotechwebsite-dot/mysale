interface UserWithRole {
  role?: { role_type?: string | null } | null;
}

export type RoleType = 'superuser' | 'admin' | 'cashier' | 'waiter';

export const ROLE_LABELS: Record<string, string> = {
  SUPERUSER: 'Propietario',
  ADMIN: 'Administrador',
  CASHIER: 'Cajero',
  WAITER: 'Mesero',
};

/** Modulos que el mesero puede abrir: solo vende en Gestion de Mesas. */
export const WAITER_MODULES = ['tables'];

export function roleType(user?: UserWithRole | null): string {
  return user?.role?.role_type?.toLowerCase() || '';
}

export function roleLabel(role?: string | null): string {
  if (!role) return '';
  return ROLE_LABELS[role.toUpperCase()] || role;
}

/** Propietario: acceso total al negocio. */
export function isOwner(user?: UserWithRole | null): boolean {
  return roleType(user) === 'superuser';
}

/** Administrador: acceso total pero solo en su sede. */
export function isAdministrator(user?: UserWithRole | null): boolean {
  return roleType(user) === 'admin';
}

export function isCashier(user?: UserWithRole | null): boolean {
  return roleType(user) === 'cashier';
}

export function isWaiter(user?: UserWithRole | null): boolean {
  return roleType(user) === 'waiter';
}

/** Propietario y administrador manejan la configuracion del negocio. */
export function canManageBusiness(user?: UserWithRole | null): boolean {
  return isOwner(user) || isAdministrator(user);
}

/** Cobrar y sacar precuenta: propietario, administrador y cajero. */
export function canCharge(user?: UserWithRole | null): boolean {
  return canManageBusiness(user) || isCashier(user);
}

/** Cambiar una cuenta de mesa: propietario, administrador y cajero. */
export function canMoveTable(user?: UserWithRole | null): boolean {
  return canCharge(user);
}

/** Anular ventas: propietario y administrador (el administrador solo en su sede). */
export function canVoidSales(user?: UserWithRole | null): boolean {
  return canManageBusiness(user);
}

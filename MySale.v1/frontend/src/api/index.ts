import api from './client';
import type {
  User, Role, Location, Group, Family, SubFamily, Product,
  Shift, Sale, CashCut, CashDenomination, Loss, Transfer, Expense,
  ShiftAlert, DashboardData, CostEntry, CostConfig, CostCalculation, CostApplication,
  Zone, Table, ZoneWithTables, Ticket, Comanda, TicketPayment,
  Module, Tenant, TenantListItem, TenantPayment, AdminDashboard,
  LoginResponse
} from '../types';

export * from './auth';

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/api/users/');
  return response.data;
};

export const createUser = async (data: {
  username: string;
  password: string;
  full_name: string;
  email?: string;
  role_id: number;
  location_id?: number;
  employee_code?: string;
  default_branch_id?: number;
}): Promise<User> => {
  const response = await api.post('/api/users/', data);
  return response.data;
};

export const deleteUser = async (userId: number): Promise<{ message: string }> => {
  const response = await api.delete(`/api/users/${userId}`);
  return response.data;
};

export const getRoles = async (): Promise<Role[]> => {
  const response = await api.get('/api/users/roles');
  return response.data;
};

export const getLocations = async (): Promise<Location[]> => {
  const response = await api.get('/api/locations/');
  return response.data;
};

export const createLocation = async (data: {
  name: string;
  code: string;
  location_type: 'pos' | 'warehouse';
  address?: string;
  daily_base_cash?: number;
  folio_prefix?: string;
}): Promise<Location> => {
  const response = await api.post('/api/locations/', data);
  return response.data;
};

export const getGroups = async (): Promise<Group[]> => {
  const response = await api.get('/api/inventory/groups');
  return response.data;
};

export const createGroup = async (data: { name: string; description?: string }): Promise<Group> => {
  const response = await api.post('/api/inventory/groups', data);
  return response.data;
};

export const getFamilies = async (groupId?: number): Promise<Family[]> => {
  const params = groupId ? { group_id: groupId } : {};
  const response = await api.get('/api/inventory/families', { params });
  return response.data;
};

export const createFamily = async (data: { name: string; group_id: number; description?: string }): Promise<Family> => {
  const response = await api.post('/api/inventory/families', data);
  return response.data;
};

export const getSubFamilies = async (familyId?: number): Promise<SubFamily[]> => {
  const params = familyId ? { family_id: familyId } : {};
  const response = await api.get('/api/inventory/subfamilies', { params });
  return response.data;
};

export const createSubFamily = async (data: { name: string; family_id: number; description?: string }): Promise<SubFamily> => {
  const response = await api.post('/api/inventory/subfamilies', data);
  return response.data;
};

export const getProducts = async (params?: {
  subfamily_id?: number;
  location_id?: number;
  search?: string;
}): Promise<Product[]> => {
  const response = await api.get('/api/inventory/products', { params });
  return response.data;
};

export const getNextProductCode = async (): Promise<{ code: string }> => {
  const response = await api.get('/api/inventory/products/next-code');
  return response.data;
};

export const decodeWeightedBarcode = async (barcode: string): Promise<{
  found: boolean;
  error?: string;
  product_id?: number;
  product_name?: string;
  product_code?: string;
  plu_code?: string;
  weight_kg?: number;
  price_per_kg?: number;
  total_price?: number;
  unit?: string;
}> => {
  const response = await api.post(`/api/inventory/products/decode-barcode?barcode=${barcode}`);
  return response.data;
};

export const createProduct = async (data: {
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  subfamily_id: number;
  unit?: string;
  sale_price: number;
  min_stock?: number;
  max_stock?: number;
}): Promise<Product> => {
  const response = await api.post('/api/inventory/products', data);
  return response.data;
};

export const updateProduct = async (id: number, data: Partial<Product>): Promise<Product> => {
  const response = await api.put(`/api/inventory/products/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id: number): Promise<{ message: string }> => {
  const response = await api.delete(`/api/inventory/products/${id}`);
  return response.data;
};

export const uploadProductImage = async (productId: number, file: File): Promise<{ image_url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/api/inventory/products/${productId}/upload-image`, formData);
  return response.data;
};

export const registerPurchase = async (data: {
  product_id: number;
  location_id: number;
  quantity: number;
  unit_cost: number;
  notes?: string;
}): Promise<{ message: string; new_stock: number; weighted_cost: number }> => {
  const response = await api.post('/api/inventory/purchase', data);
  return response.data;
};

export const getStockAlerts = async (locationId?: number): Promise<any[]> => {
  const params = locationId ? { location_id: locationId } : {};
  const response = await api.get('/api/inventory/stock-alerts', { params });
  return response.data;
};

export const getCurrentShift = async (): Promise<Shift | null> => {
  const response = await api.get('/api/shifts/current');
  return response.data;
};

export const openShift = async (data: {
  location_id: number;
  initial_cash?: number;
  biometric_verified?: boolean;
}): Promise<Shift> => {
  const response = await api.post('/api/shifts/open', data);
  return response.data;
};

export const closeShift = async (data: {
  final_cash?: number;
  notes?: string;
}): Promise<Shift> => {
  const response = await api.post('/api/shifts/close', data);
  return response.data;
};

export const getShifts = async (params?: {
  location_id?: number;
  user_id?: number;
  status?: string;
}): Promise<Shift[]> => {
  const response = await api.get('/api/shifts/', { params });
  return response.data;
};

export const getSales = async (params?: {
  location_id?: number;
  cashier_id?: number;
  start_date?: string;
  end_date?: string;
}): Promise<Sale[]> => {
  const response = await api.get('/api/sales/', { params });
  return response.data;
};

export const createSale = async (data: {
  payment_method: 'cash' | 'card' | 'transfer';
  items: { product_id: number; quantity: number; discount?: number }[];
  amount_received?: number;
  notes?: string;
}): Promise<Sale> => {
  const response = await api.post('/api/sales/', data);
  return response.data;
};

export const createBlindCashCut = async (data: {
  shift_id: number;
  denominations: CashDenomination[];
  notes?: string;
}): Promise<CashCut> => {
  const response = await api.post('/api/cash/blind-cut', data);
  return response.data;
};

export const getDenominations = async (): Promise<{ bills: number[]; coins: number[] }> => {
  const response = await api.get('/api/cash/denominations');
  return response.data;
};

export const getLosses = async (params?: {
  location_id?: number;
  loss_type?: string;
  start_date?: string;
  end_date?: string;
}): Promise<Loss[]> => {
  const response = await api.get('/api/losses/', { params });
  return response.data;
};

export const createLoss = async (data: {
  location_id: number;
  loss_type: string;
  description?: string;
  items: { product_id: number; quantity: number; reason?: string }[];
}): Promise<Loss> => {
  const response = await api.post('/api/losses/', data);
  return response.data;
};

export const getTransfers = async (params?: {
  from_location_id?: number;
  to_location_id?: number;
  status?: string;
}): Promise<Transfer[]> => {
  const response = await api.get('/api/transfers/', { params });
  return response.data;
};

export const createTransfer = async (data: {
  from_location_id: number;
  to_location_id: number;
  items: { product_id: number; quantity: number }[];
  notes?: string;
}): Promise<Transfer> => {
  const response = await api.post('/api/transfers/', data);
  return response.data;
};

export const receiveTransfer = async (id: number, notes?: string): Promise<Transfer> => {
  const response = await api.post(`/api/transfers/${id}/receive`, { notes });
  return response.data;
};

export const getExpenses = async (params?: {
  location_id?: number;
  category?: string;
  start_date?: string;
  end_date?: string;
}): Promise<Expense[]> => {
  const response = await api.get('/api/expenses/', { params });
  return response.data;
};

export const createExpense = async (data: {
  location_id?: number;
  category: string;
  description: string;
  amount: number;
  invoice_number?: string;
  supplier?: string;
  expense_date?: string;
}): Promise<Expense> => {
  const response = await api.post('/api/expenses/', data);
  return response.data;
};

export const getMyAlerts = async (unreadOnly?: boolean): Promise<ShiftAlert[]> => {
  const params = unreadOnly ? { unread_only: true } : {};
  const response = await api.get('/api/shifts/alerts', { params });
  return response.data;
};

export const markAlertRead = async (id: number): Promise<void> => {
  await api.post(`/api/shifts/alerts/${id}/read`);
};

export const getDashboard = async (): Promise<DashboardData> => {
  const response = await api.get('/api/reports/dashboard');
  return response.data;
};

export const getSalesReport = async (data: {
  start_date: string;
  end_date: string;
  location_id?: number;
  cashier_id?: number;
}): Promise<any> => {
  const response = await api.post('/api/reports/sales', data);
  return response.data;
};

export const getInventoryReport = async (locationId?: number): Promise<any> => {
  const params = locationId ? { location_id: locationId } : {};
  const response = await api.get('/api/reports/inventory', { params });
  return response.data;
};

export const exportSalesExcel = async (params: {
  start_date: string;
  end_date: string;
  location_id?: number;
}): Promise<Blob> => {
  const response = await api.get('/api/reports/export/sales/excel', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

export const exportInventoryExcel = async (locationId?: number): Promise<Blob> => {
  const params = locationId ? { location_id: locationId } : {};
  const response = await api.get('/api/reports/export/inventory/excel', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

export interface LocationDashboard {
  id: number;
  name: string;
  code: string;
  location_type: string;
  address: string | null;
  image_url: string | null;
  is_active: boolean;
  today_sales: number;
  today_transactions: number;
  active_workers: {
    id: number;
    name: string;
    shift_start: string | null;
    total_sales: number;
  }[];
  stock_alerts: {
    product_id: number;
    product_name: string;
    current_stock: number;
    min_stock: number;
  }[];
  recent_sales: {
    id: number;
    folio: string;
    total: number;
    payment_method: string | null;
    created_at: string | null;
  }[];
}

export const getLocationsDashboard = async (): Promise<LocationDashboard[]> => {
  const response = await api.get('/api/locations/dashboard');
  return response.data;
};

export const updateLocation = async (id: number, data: {
  name?: string;
  address?: string;
  image_url?: string;
  is_active?: boolean;
  daily_base_cash?: number;
  folio_prefix?: string;
}): Promise<Location> => {
  const response = await api.put(`/api/locations/${id}`, data);
  return response.data;
};

export const getCostEntries = async (activeOnly: boolean = true): Promise<CostEntry[]> => {
  const response = await api.get('/api/cost-control/entries', { params: { active_only: activeOnly } });
  return response.data;
};

export const createCostEntry = async (data: {
  name: string;
  category: string;
  amount: number;
  description?: string;
  is_recurring?: boolean;
  recurrence_period?: string;
  start_date?: string;
  end_date?: string;
}): Promise<CostEntry> => {
  const response = await api.post('/api/cost-control/entries', data);
  return response.data;
};

export const updateCostEntry = async (id: number, data: {
  name?: string;
  category?: string;
  amount?: number;
  description?: string;
  is_recurring?: boolean;
  recurrence_period?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}): Promise<CostEntry> => {
  const response = await api.put(`/api/cost-control/entries/${id}`, data);
  return response.data;
};

export const deleteCostEntry = async (id: number): Promise<{ message: string }> => {
  const response = await api.delete(`/api/cost-control/entries/${id}`);
  return response.data;
};

export const getCostConfig = async (): Promise<CostConfig> => {
  const response = await api.get('/api/cost-control/config');
  return response.data;
};

export const updateCostConfig = async (data: {
  distribution_method?: string;
  percentage_value?: number;
  is_auto_apply?: boolean;
}): Promise<CostConfig> => {
  const response = await api.put('/api/cost-control/config', data);
  return response.data;
};

export const calculateCosts = async (): Promise<CostCalculation> => {
  const response = await api.get('/api/cost-control/calculate');
  return response.data;
};

export const applyCostsToProducts = async (notes?: string): Promise<CostApplication> => {
  const response = await api.post('/api/cost-control/apply', { notes });
  return response.data;
};

export const getCostApplications = async (): Promise<CostApplication[]> => {
  const response = await api.get('/api/cost-control/applications');
  return response.data;
};

export const getZones = async (locationId?: number): Promise<Zone[]> => {
  const params = locationId ? { location_id: locationId } : {};
  const response = await api.get('/api/tables/zones', { params });
  return response.data;
};

export const getZonesWithTables = async (locationId?: number): Promise<ZoneWithTables[]> => {
  const params = locationId ? { location_id: locationId } : {};
  const response = await api.get('/api/tables/zones-with-tables', { params });
  return response.data;
};

export const createZone = async (data: {
  name: string;
  location_id: number;
  description?: string;
  color?: string;
  display_order?: number;
}): Promise<Zone> => {
  const response = await api.post('/api/tables/zones', data);
  return response.data;
};

export const updateZone = async (id: number, data: {
  name?: string;
  description?: string;
  color?: string;
  display_order?: number;
  is_active?: boolean;
}): Promise<Zone> => {
  const response = await api.put(`/api/tables/zones/${id}`, data);
  return response.data;
};

export const deleteZone = async (id: number): Promise<{ message: string }> => {
  const response = await api.delete(`/api/tables/zones/${id}`);
  return response.data;
};

export const getTables = async (params?: {
  zone_id?: number;
  location_id?: number;
}): Promise<Table[]> => {
  const response = await api.get('/api/tables/', { params });
  return response.data;
};

export const createTable = async (data: {
  name: string;
  zone_id: number;
  capacity?: number;
  shape?: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
}): Promise<Table> => {
  const response = await api.post('/api/tables/', data);
  return response.data;
};

export const updateTable = async (id: number, data: {
  name?: string;
  zone_id?: number;
  capacity?: number;
  shape?: string;
  status?: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  is_active?: boolean;
}): Promise<Table> => {
  const response = await api.put(`/api/tables/${id}`, data);
  return response.data;
};

export const deleteTable = async (id: number): Promise<{ message: string }> => {
  const response = await api.delete(`/api/tables/${id}`);
  return response.data;
};

export const createTicket = async (data: {
  table_id: number;
  location_id: number;
  customer_name?: string;
  num_people?: number;
  notes?: string;
}): Promise<Ticket> => {
  const response = await api.post('/api/tables/tickets', data);
  return response.data;
};

export const getTicket = async (ticketId: number): Promise<Ticket> => {
  const response = await api.get(`/api/tables/tickets/${ticketId}`);
  return response.data;
};

export const getTableTicket = async (tableId: number): Promise<Ticket> => {
  const response = await api.get(`/api/tables/${tableId}/ticket`);
  return response.data;
};

export const updateTicket = async (id: number, data: {
  customer_name?: string;
  num_people?: number;
  notes?: string;
  tip?: number;
  service_charge?: number;
  discount?: number;
}): Promise<Ticket> => {
  const response = await api.put(`/api/tables/tickets/${id}`, data);
  return response.data;
};

export const addItemsToTicket = async (ticketId: number, items: {
  product_id: number;
  quantity: number;
  unit_price: number;
  discount?: number;
  notes?: string;
}[]): Promise<Ticket> => {
  const response = await api.post(`/api/tables/tickets/${ticketId}/items`, { items });
  return response.data;
};

export const removeItemFromTicket = async (ticketId: number, itemId: number): Promise<{ message: string }> => {
  const response = await api.delete(`/api/tables/tickets/${ticketId}/items/${itemId}`);
  return response.data;
};

export const createComanda = async (ticketId: number, data: {
  area: string;
  item_ids: number[];
  notes?: string;
}): Promise<Comanda> => {
  const response = await api.post(`/api/tables/tickets/${ticketId}/comandas`, { ...data, ticket_id: ticketId });
  return response.data;
};

export const getTicketComandas = async (ticketId: number): Promise<Comanda[]> => {
  const response = await api.get(`/api/tables/tickets/${ticketId}/comandas`);
  return response.data;
};

export const updateComandaStatus = async (comandaId: number, status: string): Promise<{ message: string }> => {
  const response = await api.put(`/api/tables/comandas/${comandaId}/status`, null, { params: { status } });
  return response.data;
};

export const moveTicket = async (ticketId: number, newTableId: number): Promise<Ticket> => {
  const response = await api.post(`/api/tables/tickets/${ticketId}/move`, { new_table_id: newTableId });
  return response.data;
};

export const mergeTickets = async (sourceTicketIds: number[], targetTableId: number): Promise<Ticket> => {
  const response = await api.post('/api/tables/tickets/merge', {
    source_ticket_ids: sourceTicketIds,
    target_table_id: targetTableId
  });
  return response.data;
};

export const splitTicket = async (ticketId: number, itemIds: number[], newTableId: number): Promise<Ticket> => {
  const response = await api.post(`/api/tables/tickets/${ticketId}/split`, {
    item_ids: itemIds,
    new_table_id: newTableId
  });
  return response.data;
};

export const payTicket = async (ticketId: number, data: {
  payments: { payment_method: string; amount: number; reference?: string }[];
  tip?: number;
  notes?: string;
}): Promise<Ticket> => {
  const response = await api.post(`/api/tables/tickets/${ticketId}/pay`, data);
  return response.data;
};

export const getTicketPayments = async (ticketId: number): Promise<TicketPayment[]> => {
  const response = await api.get(`/api/tables/tickets/${ticketId}/payments`);
  return response.data;
};

export const generatePrecheck = async (ticketId: number): Promise<Ticket> => {
  const response = await api.post(`/api/tables/tickets/${ticketId}/precheck`);
  return response.data;
};

export const getAdminDashboard = async (): Promise<AdminDashboard> => {
  const response = await api.get('/api/admin/dashboard');
  return response.data;
};

export const getModules = async (): Promise<Module[]> => {
  const response = await api.get('/api/admin/modules');
  return response.data;
};

export const createModule = async (data: {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  route?: string;
  display_order?: number;
  is_core?: boolean;
}): Promise<Module> => {
  const response = await api.post('/api/admin/modules', data);
  return response.data;
};

export const updateModule = async (id: number, data: {
  code?: string;
  name?: string;
  description?: string;
  icon?: string;
  route?: string;
  display_order?: number;
  is_core?: boolean;
  is_active?: boolean;
}): Promise<Module> => {
  const response = await api.put(`/api/admin/modules/${id}`, data);
  return response.data;
};

export const getTenants = async (params?: {
  is_active?: boolean;
  payment_status?: string;
}): Promise<TenantListItem[]> => {
  const response = await api.get('/api/admin/tenants', { params });
  return response.data;
};

export const getTenant = async (id: number): Promise<Tenant> => {
  const response = await api.get(`/api/admin/tenants/${id}`);
  return response.data;
};

export const createTenant = async (data: {
  name: string;
  code: string;
  subdomain?: string;
  logo_url?: string;
  primary_color?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  monthly_fee?: number;
  notes?: string;
}): Promise<Tenant> => {
  const response = await api.post('/api/admin/tenants', data);
  return response.data;
};

export const updateTenant = async (id: number, data: {
  name?: string;
  code?: string;
  subdomain?: string;
  logo_url?: string;
  primary_color?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  monthly_fee?: number;
  notes?: string;
  is_active?: boolean;
}): Promise<Tenant> => {
  const response = await api.put(`/api/admin/tenants/${id}`, data);
  return response.data;
};

export const deleteTenant = async (id: number): Promise<{ message: string }> => {
  const response = await api.delete(`/api/admin/tenants/${id}`);
  return response.data;
};

export const updateTenantPaymentStatus = async (id: number, data: {
  payment_status: string;
  payment_due_date?: string;
}): Promise<{ message: string }> => {
  const response = await api.put(`/api/admin/tenants/${id}/payment-status`, data);
  return response.data;
};

export const updateTenantModules = async (id: number, modules: {
  module_id: number;
  is_enabled: boolean;
}[]): Promise<{ message: string }> => {
  const response = await api.put(`/api/admin/tenants/${id}/modules`, modules);
  return response.data;
};

export const getTenantPayments = async (tenantId: number): Promise<TenantPayment[]> => {
  const response = await api.get(`/api/admin/tenants/${tenantId}/payments`);
  return response.data;
};

export const createTenantPayment = async (tenantId: number, data: {
  amount: number;
  period_start: string;
  period_end: string;
  payment_method?: string;
  reference?: string;
  notes?: string;
}): Promise<TenantPayment> => {
  const response = await api.post(`/api/admin/tenants/${tenantId}/payments`, {
    ...data,
    tenant_id: tenantId
  });
  return response.data;
};

export interface BiometricFingerprint {
  id: number;
  user_id: number;
  finger_index: number;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

export interface BiometricAttendance {
  id: number;
  user_id: number;
  user_name: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
  location_name: string | null;
}

export interface BiometricLog {
  id: number;
  user_id: number;
  user_name: string;
  event_type: string;
  success: boolean;
  match_score: number | null;
  notes: string | null;
  created_at: string;
}

const BIOMETRIC_SERVICE_URL = 'http://localhost:8765';

export const checkBiometricServiceStatus = async (): Promise<{
  service_running: boolean;
  reader_connected: boolean;
  device_name: string | null;
  sdk_mode: string;
  last_error: string | null;
}> => {
  const response = await fetch(`${BIOMETRIC_SERVICE_URL}/status`);
  return response.json();
};

export const captureFingerprintFromService = async (): Promise<{
  success: boolean;
  template?: string;
  quality_score?: number;
  error?: string;
}> => {
  const response = await fetch(`${BIOMETRIC_SERVICE_URL}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
};

export const getBiometricStatus = async (): Promise<{
  enabled: boolean;
  service_url: string;
  message: string;
}> => {
  const response = await api.get('/api/biometric/status');
  return response.data;
};

export const enrollFingerprint = async (data: {
  template: string;
  finger_index?: number;
  quality_score?: number;
  is_primary?: boolean;
}): Promise<BiometricFingerprint> => {
  const response = await api.post('/api/biometric/enroll', data);
  return response.data;
};

export const enrollUserFingerprint = async (userId: number, data: {
  template: string;
  finger_index?: number;
  quality_score?: number;
  is_primary?: boolean;
}): Promise<BiometricFingerprint> => {
  const response = await api.post(`/api/biometric/enroll-user/${userId}`, data);
  return response.data;
};

export const verifyFingerprint = async (data: {
  template: string;
  user_id?: number;
}): Promise<{
  verified: boolean;
  user_id: number;
  match_score: number;
  finger_index?: number;
}> => {
  const response = await api.post('/api/biometric/verify', data);
  return response.data;
};

export const biometricLogin = async (data: {
  template: string;
  tenant_id?: number;
}): Promise<LoginResponse> => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const response = await fetch(`${API_URL}/api/biometric/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw { response: { status: response.status, data: errorData } };
  }
  return response.json();
};

export const biometricClockInOut = async (data: {
  template: string;
  location_id?: number;
}): Promise<{
  action: 'clock_in' | 'clock_out';
  user: {
    id: number;
    full_name: string;
  };
  clock_in: string;
  clock_out?: string;
  total_time?: string;
}> => {
  const response = await api.post('/api/biometric/clock-in-out', data);
  return response.data;
};

export const biometricAuthorize = async (data: {
  template: string;
  action_type: string;
  reference_id?: number;
  notes?: string;
}): Promise<{
  authorized: boolean;
  user: {
    id: number;
    full_name: string;
    role: string | null;
  };
  action_type: string;
  match_score: number;
}> => {
  const response = await api.post('/api/biometric/authorize', data);
  return response.data;
};

export const getUserFingerprints = async (userId?: number): Promise<BiometricFingerprint[]> => {
  const params = userId ? { user_id: userId } : {};
  const response = await api.get('/api/biometric/fingerprints', { params });
  return response.data;
};

export const deleteFingerprint = async (fingerprintId: number): Promise<{ message: string }> => {
  const response = await api.delete(`/api/biometric/fingerprints/${fingerprintId}`);
  return response.data;
};

export const getAttendanceRecords = async (params?: {
  user_id?: number;
  start_date?: string;
  end_date?: string;
}): Promise<BiometricAttendance[]> => {
  const response = await api.get('/api/biometric/attendance', { params });
  return response.data;
};

export const getBiometricLogs = async (params?: {
  user_id?: number;
  event_type?: string;
  limit?: number;
}): Promise<BiometricLog[]> => {
  const response = await api.get('/api/biometric/logs', { params });
  return response.data;
};

// ==================== BRANCHES (SEDES) ====================

export interface Branch {
  id: number;
  tenant_id: number;
  name: string;
  code: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface WorkSession {
  id: number;
  tenant_id: number;
  user_id: number;
  branch_id: number;
  branch_name: string | null;
  user_name: string | null;
  employee_code: string | null;
  clock_in: string;
  clock_out: string | null;
  total_minutes: number | null;
  notes: string | null;
  created_at: string;
}

export interface WorkSessionSummary {
  user_id: number;
  user_name: string;
  employee_code: string | null;
  total_sessions: number;
  total_minutes: number;
  total_hours: number;
  branches_worked: string[];
}

export const getBranches = async (): Promise<Branch[]> => {
  const response = await api.get('/api/branches/');
  return response.data;
};

export const createBranch = async (data: {
  name: string;
  code: string;
  city?: string;
  address?: string;
  phone?: string;
}): Promise<Branch> => {
  const response = await api.post('/api/branches/', data);
  return response.data;
};

export const updateBranch = async (id: number, data: {
  name?: string;
  code?: string;
  city?: string;
  address?: string;
  phone?: string;
  is_active?: boolean;
}): Promise<Branch> => {
  const response = await api.put(`/api/branches/${id}`, data);
  return response.data;
};

export const deleteBranch = async (id: number): Promise<{ message: string }> => {
  const response = await api.delete(`/api/branches/${id}`);
  return response.data;
};

export const clockIn = async (data: {
  branch_id: number;
  notes?: string;
}): Promise<WorkSession> => {
  const response = await api.post('/api/branches/clock-in', data);
  return response.data;
};

export const clockOut = async (data?: {
  notes?: string;
}): Promise<WorkSession> => {
  const response = await api.post('/api/branches/clock-out', data || {});
  return response.data;
};

export const getCurrentWorkSession = async (): Promise<WorkSession | null> => {
  const response = await api.get('/api/branches/current-session');
  return response.data;
};

export const getWorkSessions = async (params?: {
  branch_id?: number;
  user_id?: number;
  start_date?: string;
  end_date?: string;
}): Promise<WorkSession[]> => {
  const response = await api.get('/api/branches/work-sessions', { params });
  return response.data;
};

export const getWorkReport = async (params?: {
  branch_id?: number;
  start_date?: string;
  end_date?: string;
}): Promise<WorkSessionSummary[]> => {
  const response = await api.get('/api/branches/work-report', { params });
  return response.data;
};

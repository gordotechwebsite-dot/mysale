import api from './client';
import type {
  User, Role, Location, Group, Family, SubFamily, Product,
  Shift, Sale, CashCut, CashDenomination, Loss, Transfer, Expense,
  ShiftAlert, DashboardData
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
}): Promise<User> => {
  const response = await api.post('/api/users/', data);
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
  const response = await api.get('/api/locations/dashboard/all');
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

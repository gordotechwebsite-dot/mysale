export interface User {
  id: number;
  username: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  cedula: string | null;
  photo_url: string | null;
  pin: string | null;
  role_id: number;
  role?: Role;
  location_id: number | null;
  tenant_id: number | null;
  is_active: boolean;
  points: number;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  role_type: 'superuser' | 'admin' | 'cashier';
  can_void_sales: boolean;
  can_manage_inventory: boolean;
  can_manage_users: boolean;
  can_view_reports: boolean;
  can_manage_locations: boolean;
  can_set_stock_thresholds: boolean;
  can_close_shifts: boolean;
}

export interface Location {
  id: number;
  name: string;
  code: string;
  location_type: 'pos' | 'warehouse';
  address: string | null;
  is_active: boolean;
  daily_base_cash: number;
  folio_prefix: string | null;
  folio_counter: number;
}

export interface Group {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Family {
  id: number;
  name: string;
  group_id: number;
  description: string | null;
  is_active: boolean;
}

export interface SubFamily {
  id: number;
  name: string;
  family_id: number;
  description: string | null;
  is_active: boolean;
}

export interface ProductStock {
  location_id: number;
  location_name: string;
  quantity: number;
  last_inventory_date: string | null;
}

export interface Product {
  id: number;
  code: string;
  barcode: string | null;
  name: string;
  description: string | null;
  subfamily_id: number;
  unit: string;
  sale_price: number;
  weighted_cost: number;
  min_stock: number;
  max_stock: number;
  is_active: boolean;
  is_weighted: boolean;
  price_per_kg: number | null;
  plu_code: string | null;
  created_at: string;
  stocks?: ProductStock[];
}

export interface WeightedBarcodeResult {
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
}

export interface Shift {
  id: number;
  user_id: number;
  user_name?: string;
  location_id: number;
  location_name?: string;
  start_time: string;
  end_time: string | null;
  status: 'open' | 'closed' | 'closed_by_admin';
  initial_cash: number;
  final_cash: number | null;
  total_sales: number;
  total_cash_sales: number;
  total_card_sales: number;
  total_transfer_sales: number;
  biometric_verified: boolean;
}

// Work session (asistencia) registrada por PIN o por acciones en /api/branches
export interface WorkSession {
  id: number;
  tenant_id: number;
  user_id: number;
  user_name?: string | null;
  employee_code?: string | null;
  branch_id: number;
  branch_name?: string | null;
  clock_in: string;
  clock_out: string | null;
  total_minutes: number | null;
  notes?: string | null;
  created_at: string;
}

export interface SaleItem {
  id?: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  folio: string;
  location_id: number;
  location_name?: string;
  shift_id: number;
  cashier_id: number;
  cashier_name?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: 'cash' | 'card' | 'transfer';
  amount_received: number | null;
  change_given: number | null;
  notes: string | null;
  created_at: string;
  items: SaleItem[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export interface CashDenomination {
  denomination: number;
  quantity: number;
}

export interface CashCut {
  id: number;
  shift_id: number;
  user_id: number;
  expected_cash: number;
  declared_cash: number;
  difference: number;
  is_blind: boolean;
  notes: string | null;
  created_at: string;
}

export interface Loss {
  id: number;
  location_id: number;
  location_name?: string;
  reported_by: number;
  reported_by_name?: string;
  loss_type: 'breakage' | 'expiration' | 'theft' | 'damage' | 'other';
  total_value: number;
  description: string | null;
  created_at: string;
  items: LossItem[];
}

export interface LossItem {
  id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reason: string | null;
}

export interface Transfer {
  id: number;
  from_location_id: number;
  from_location_name?: string;
  to_location_id: number;
  to_location_name?: string;
  created_by_id: number;
  created_by_name?: string;
  received_by_id: number | null;
  received_by_name?: string;
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  total_value_at_sale_price: number;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  items: TransferItem[];
}

export interface TransferItem {
  id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  sale_price: number;
  total_value: number;
}

export interface Expense {
  id: number;
  location_id: number | null;
  location_name?: string;
  category: 'purchase' | 'utilities' | 'rent' | 'salary' | 'maintenance' | 'supplies' | 'other';
  description: string;
  amount: number;
  invoice_number: string | null;
  supplier: string | null;
  created_by_id: number;
  created_by_name?: string;
  expense_date: string;
  created_at: string;
}

export interface ShiftAlert {
  id: number;
  user_id: number;
  alert_type: 'shift_close' | 'low_stock' | 'high_stock' | 'performance';
  message: string;
  points_affected: number;
  is_read: boolean;
  created_at: string;
}

export interface DashboardData {
  today_sales: number;
  today_transactions: number;
  month_sales: number;
  low_stock_alerts: number;
  open_shifts: number;
  today_losses: number;
  today_expenses: number;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface CostEntry {
  id: number;
  name: string;
  category: 'rent' | 'utilities' | 'salary' | 'transport' | 'maintenance' | 'insurance' | 'taxes' | 'other';
  amount: number;
  description: string | null;
  is_recurring: boolean;
  recurrence_period: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_by_id: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CostConfig {
  id: number;
  distribution_method: 'per_product' | 'per_unit_value' | 'percentage';
  percentage_value: number;
  is_auto_apply: boolean;
  last_applied_at: string | null;
  updated_by_id: number | null;
  updated_at: string;
}

export interface CostCalculation {
  total_active_costs: number;
  product_count: number;
  cost_per_product: number;
  distribution_method: string;
}

export interface CostApplication {
  id: number;
  total_cost: number;
  product_count: number;
  cost_per_product: number;
  distribution_method: string;
  applied_by_id: number;
  applied_at: string;
  notes: string | null;
}

export interface Zone {
  id: number;
  name: string;
  location_id: number;
  description: string | null;
  color: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Table {
  id: number;
  name: string;
  zone_id: number;
  zone_name?: string;
  capacity: number;
  shape: 'square' | 'pair' | 'rectangle';
  status: 'free' | 'occupied' | 'bill_open' | 'to_pay' | 'paid';
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  is_active: boolean;
  created_at: string;
  current_ticket_id?: number | null;
  pending_comandas?: number;
  ticket_total?: number;
  ticket_time?: string | null;
  waiter_name?: string | null;
}

export interface ZoneWithTables extends Zone {
  tables: Table[];
}

export interface TicketItem {
  id: number;
  ticket_id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  comanda_id: number | null;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  notes: string | null;
  status: 'ordered' | 'in_preparation' | 'ready' | 'served' | 'cancelled';
  created_at: string;
}

export interface Ticket {
  id: number;
  table_id: number;
  table_name?: string;
  location_id: number;
  waiter_id: number;
  waiter_name?: string;
  customer_name: string | null;
  num_people: number;
  notes: string | null;
  status: 'open' | 'to_pay' | 'paid' | 'closed' | 'cancelled';
  subtotal: number;
  tax: number;
  tip: number;
  service_charge: number;
  discount: number;
  total: number;
  opened_at: string;
  closed_at: string | null;
  items: TicketItem[];
  pending_comandas: number;
}

export interface Comanda {
  id: number;
  ticket_id: number;
  area: 'kitchen' | 'bar' | 'both';
  status: 'pending' | 'in_preparation' | 'ready' | 'delivered';
  notes: string | null;
  created_by_id: number;
  created_by_name?: string;
  created_at: string;
  completed_at: string | null;
  items: TicketItem[];
}

export interface TicketPayment {
  id: number;
  ticket_id: number;
  payment_method: string;
  amount: number;
  reference: string | null;
  created_by_id: number;
  created_at: string;
}

export interface Module {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  route: string | null;
  display_order: number;
  is_core: boolean;
  is_active: boolean;
  created_at: string;
}

export interface TenantModule {
  id: number;
  module_id: number;
  module_code: string;
  module_name: string;
  module_icon: string | null;
  module_route: string | null;
  is_enabled: boolean;
  enabled_at: string | null;
}

export interface Tenant {
  id: number;
  name: string;
  code: string;
  subdomain: string | null;
  logo_url: string | null;
  primary_color: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  payment_status: 'active' | 'pending' | 'overdue' | 'suspended';
  payment_due_date: string | null;
  monthly_fee: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  modules?: TenantModule[];
  access_url?: string | null;
  login_username?: string | null;
  login_password?: string | null;
}

export interface TenantListItem {
  id: number;
  name: string;
  code: string;
  subdomain: string | null;
  contact_name: string | null;
  contact_email: string | null;
  payment_status: 'active' | 'pending' | 'overdue' | 'suspended';
  payment_due_date: string | null;
  monthly_fee: number;
  is_active: boolean;
  created_at: string;
  enabled_modules_count: number;
  access_url?: string | null;
  login_username?: string | null;
  login_password?: string | null;
}

export interface TenantPayment {
  id: number;
  tenant_id: number;
  amount: number;
  payment_date: string;
  period_start: string;
  period_end: string;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface AdminDashboard {
  total_tenants: number;
  active_tenants: number;
  payment_stats: {
    active: number;
    pending: number;
    overdue: number;
    suspended: number;
  };
  total_modules: number;
  monthly_revenue: number;
}

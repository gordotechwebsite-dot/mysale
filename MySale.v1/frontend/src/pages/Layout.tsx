import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShift } from '../context/ShiftContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  LogOut,
  Bell,
  Clock,
  Truck,
  AlertTriangle,
  DollarSign,
  Menu,
  X,
  Store,
  Calculator,
  UtensilsCrossed,
  Shield,
  Zap,
  Banknote,
  Building2,
  ClipboardList,
  LucideIcon
} from 'lucide-react';

// Map module codes to icons
const moduleIcons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  pos: ShoppingCart,
  quick_sale: Zap,
  locations: Store,
  tables: UtensilsCrossed,
  inventory: Package,
  cost_control: Calculator,
  transfers: Truck,
  losses: AlertTriangle,
  expenses: DollarSign,
  cash: Banknote,
  shifts: Clock,
  reports: FileText,
  users: Users,
  branches: Building2,
  work_report: ClipboardList,
  super_admin: Shield,
};

// Map module codes to routes
const moduleRoutes: Record<string, string> = {
  dashboard: '/',
  pos: '/pos',
  quick_sale: '/quick-sale',
  locations: '/locations-dashboard',
  tables: '/tables',
  inventory: '/inventory',
  cost_control: '/cost-control',
  transfers: '/transfers',
  losses: '/losses',
  expenses: '/expenses',
  cash: '/cash',
  shifts: '/shifts',
  reports: '/reports',
  users: '/users',
  branches: '/branches',
  work_report: '/work-report',
  super_admin: '/super-admin',
  locations_admin: '/locations',
};

// Modules that require admin role
const adminOnlyModules = ['inventory', 'cost_control', 'expenses', 'reports', 'users', 'branches', 'work_report', 'locations'];

// Modules that require superuser role
const superuserOnlyModules = ['super_admin', 'locations_admin'];

const Layout: React.FC = () => {
  const { user, logout, enabledModules } = useAuth();
  const { currentShift } = useShift();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role?.role_type === 'superuser' || user?.role?.role_type === 'admin';
  const isSuperuser = user?.role?.role_type === 'superuser';

  // Build menu items dynamically from enabled modules
  const menuItems = enabledModules.length > 0 
    ? enabledModules
        .filter(module => {
          // Check role-based access
          if (superuserOnlyModules.includes(module.code) && !isSuperuser) return false;
          if (adminOnlyModules.includes(module.code) && !isAdmin) return false;
          return true;
        })
        .map(module => ({
          path: module.route || moduleRoutes[module.code] || '/',
          icon: moduleIcons[module.code] || LayoutDashboard,
          label: module.name,
          code: module.code,
        }))
    : [
        // Fallback menu if no modules loaded (for backwards compatibility)
        { path: '/', icon: LayoutDashboard, label: 'Dashboard', code: 'dashboard' },
        { path: '/pos', icon: ShoppingCart, label: 'Punto de Venta', code: 'pos' },
      ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-emerald-600 text-white rounded-lg"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold">MS</span>
            </div>
            <div>
              <h1 className="font-bold text-lg">MySale.v1</h1>
              <p className="text-xs text-gray-400">Sistema POS</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-slate-800">
          <p className="text-sm text-slate-400">Bienvenido,</p>
          <p className="font-semibold truncate">{user?.full_name}</p>
          <p className="text-xs text-emerald-400">{user?.role?.name}</p>
          {currentShift && (
            <div className="mt-2 px-2 py-1 bg-green-900/50 rounded text-xs text-green-400">
              Turno activo en {currentShift.location_name}
            </div>
          )}
        </div>

        <nav className="p-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                location.pathname === item.path
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"
            onClick={handleLogout}
          >
            <LogOut size={20} className="mr-3" />
            Cerrar Sesion
          </Button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
          <div className="lg:hidden w-10" />
          <h2 className="text-xl font-semibold text-gray-800">
            {menuItems.find(item => item.path === location.pathname)?.label || 'MySale.v1'}
          </h2>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                0
              </span>
            </Button>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;

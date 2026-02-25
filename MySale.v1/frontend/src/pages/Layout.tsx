import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShift } from '../context/ShiftContext';
import { Button } from '@/components/ui/button';
import { clockWithPin } from '@/api';
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
  LucideIcon,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

// PIN Modal Component
interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PinModal: React.FC<PinModalProps> = ({ isOpen, onClose }) => {
  const [pin, setPin] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{
    success: boolean;
    message: string;
    action?: string;
  } | null>(null);

  const handlePinChange = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setResult(null);
  };

  const handleSubmit = async () => {
    if (pin.length !== 6) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await clockWithPin(pin);
      setResult({
        success: response.success,
        message: response.message,
        action: response.action
      });
      setPin('');
      
      // Auto close after 3 seconds on success
      if (response.success) {
        setTimeout(() => {
          onClose();
          setResult(null);
        }, 3000);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      const errorMessage = err.response?.data?.detail || err.message || 'Error al procesar el PIN';
      setResult({
        success: false,
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-emerald-600 text-white p-4 text-center">
          <Clock size={32} className="mx-auto mb-2" />
          <h2 className="text-xl font-bold">Registro de Asistencia</h2>
          <p className="text-emerald-100 text-sm">Ingresa tu PIN de 6 digitos</p>
        </div>

        {result && (
          <div className={`p-4 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircle className="text-green-600" size={24} />
              ) : (
                <XCircle className="text-red-600" size={24} />
              )}
              <p className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.message}
              </p>
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="flex justify-center gap-2 mb-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-10 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                  pin.length > i
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                {pin.length > i ? '•' : ''}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handlePinChange(num.toString())}
                disabled={loading || pin.length >= 6}
                className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl font-semibold text-gray-800 transition-colors disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              disabled={loading}
              className="h-14 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 font-semibold transition-colors"
            >
              C
            </button>
            <button
              onClick={() => handlePinChange('0')}
              disabled={loading || pin.length >= 6}
              className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl font-semibold text-gray-800 transition-colors disabled:opacity-50"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              disabled={loading || pin.length === 0}
              className="h-14 rounded-xl bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-semibold transition-colors disabled:opacity-50"
            >
              ←
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || pin.length !== 6}
            className="w-full mt-4 h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Verificando...
              </>
            ) : (
              'Registrar'
            )}
          </button>

          <button
            onClick={handleClose}
            className="w-full mt-2 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

// Colombia Clock Component - Real-time clock synchronized to Colombia timezone (UTC-5)
interface ColombiaClockDisplayProps {
  onClick: () => void;
}

const ColombiaClockDisplay: React.FC<ColombiaClockDisplayProps> = ({ onClick }) => {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format date and time for Colombia timezone (America/Bogota)
  const colombiaOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Bogota',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  };

  const dateStr = time.toLocaleDateString('es-CO', colombiaOptions);
  const timeStr = time.toLocaleTimeString('es-CO', timeOptions);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
      title="Clic para registrar entrada/salida"
    >
      <Clock size={24} className="text-emerald-600" />
      <div className="text-left">
        <div className="text-lg font-bold text-gray-800">{timeStr}</div>
        <div className="text-sm text-gray-600 capitalize">{dateStr}</div>
      </div>
    </button>
  );
};

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
  const [pinModalOpen, setPinModalOpen] = React.useState(false);

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
      {/* PIN Modal */}
      <PinModal isOpen={pinModalOpen} onClose={() => setPinModalOpen(false)} />

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
            <ColombiaClockDisplay onClick={() => setPinModalOpen(true)} />
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

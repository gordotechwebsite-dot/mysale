import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShift } from '../context/ShiftContext';
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
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div 
        className="bg-white w-full max-w-sm mx-4 overflow-hidden animate-fade-in"
        style={{ 
          borderRadius: '18px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.12)'
        }}
      >
        {/* Header */}
        <div className="p-6 text-center" style={{ backgroundColor: '#00a86b' }}>
          <Clock size={32} className="mx-auto mb-2 text-white" />
          <h2 className="text-xl font-semibold text-white">Registro de Asistencia</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>Ingresa tu PIN de 6 digitos</p>
        </div>

        {/* Result message */}
        {result && (
          <div 
            className="p-4"
            style={{ 
              backgroundColor: result.success ? 'rgba(0, 168, 107, 0.1)' : 'rgba(239, 68, 68, 0.1)'
            }}
          >
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircle size={24} style={{ color: '#00a86b' }} />
              ) : (
                <XCircle size={24} style={{ color: '#ef4444' }} />
              )}
              <p 
                className="text-sm font-medium"
                style={{ color: result.success ? '#00a86b' : '#ef4444' }}
              >
                {result.message}
              </p>
            </div>
          </div>
        )}

        <div className="p-6">
          {/* PIN display */}
          <div className="flex justify-center gap-2 mb-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-10 h-12 flex items-center justify-center text-2xl font-bold transition-all"
                style={{ 
                  borderRadius: '10px',
                  border: pin.length > i ? '2px solid #00a86b' : '2px solid #e5e7eb',
                  backgroundColor: pin.length > i ? 'rgba(0, 168, 107, 0.1)' : '#f6f7f9',
                  color: '#00a86b'
                }}
              >
                {pin.length > i ? '•' : ''}
              </div>
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handlePinChange(num.toString())}
                disabled={loading || pin.length >= 6}
                className="h-14 text-xl font-semibold transition-all duration-200 disabled:opacity-50"
                style={{ 
                  borderRadius: '12px',
                  backgroundColor: '#f6f7f9',
                  color: '#111827'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#f6f7f9';
                }}
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              disabled={loading}
              className="h-14 font-semibold transition-all duration-200"
              style={{ 
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              }}
            >
              C
            </button>
            <button
              onClick={() => handlePinChange('0')}
              disabled={loading || pin.length >= 6}
              className="h-14 text-xl font-semibold transition-all duration-200 disabled:opacity-50"
              style={{ 
                borderRadius: '12px',
                backgroundColor: '#f6f7f9',
                color: '#111827'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#f6f7f9';
              }}
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              disabled={loading || pin.length === 0}
              className="h-14 font-semibold transition-all duration-200 disabled:opacity-50"
              style={{ 
                borderRadius: '12px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(245, 158, 11, 0.2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
              }}
            >
              ←
            </button>
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={loading || pin.length !== 6}
            className="w-full mt-4 h-12 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ 
              borderRadius: '12px',
              backgroundColor: '#00a86b'
            }}
            onMouseEnter={(e) => {
              if (!loading && pin.length === 6) {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#00965f';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#00a86b';
            }}
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

          {/* Cancel button */}
          <button
            onClick={handleClose}
            className="w-full mt-2 h-12 font-medium transition-all duration-200"
            style={{ 
              borderRadius: '12px',
              backgroundColor: '#f6f7f9',
              color: '#6b7280'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#f6f7f9';
            }}
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
      className="flex items-center gap-3 px-4 py-2 transition-all duration-200"
      style={{ borderRadius: '10px' }}
      title="Clic para registrar entrada/salida"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 168, 107, 0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      <Clock size={22} style={{ color: '#00a86b' }} />
      <div className="text-left">
        <div className="font-semibold" style={{ color: '#111827', fontSize: '16px' }}>{timeStr}</div>
        <div className="capitalize" style={{ color: '#6b7280', fontSize: '13px' }}>{dateStr}</div>
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
    <div className="min-h-screen flex" style={{ backgroundColor: '#f6f7f9' }}>
      {/* PIN Modal */}
      <PinModal isOpen={pinModalOpen} onClose={() => setPinModalOpen(false)} />

      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 text-white transition-colors"
        style={{ backgroundColor: '#00a86b', borderRadius: '10px' }}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white transform transition-transform duration-200 ease-in-out flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ 
          boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
          borderRight: '1px solid #e5e7eb'
        }}
      >
        {/* Logo */}
        <div className="p-5" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="MySale Logo" 
              style={{ width: '40px', height: '40px', objectFit: 'contain' }}
            />
            <div>
              <h1 className="font-semibold text-base" style={{ color: '#111827' }}>MySale</h1>
              <p className="text-xs" style={{ color: '#6b7280' }}>Sistema POS</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="p-5" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <p className="text-xs" style={{ color: '#6b7280' }}>Bienvenido,</p>
          <p className="font-semibold text-sm truncate" style={{ color: '#111827' }}>{user?.full_name}</p>
          <p className="text-xs" style={{ color: '#00a86b' }}>{user?.role?.name}</p>
          {currentShift && (
            <div 
              className="mt-2 px-3 py-2 text-xs"
              style={{ 
                backgroundColor: 'rgba(0, 168, 107, 0.1)',
                borderRadius: '8px',
                color: '#00a86b'
              }}
            >
              Turno activo en {currentShift.location_name}
            </div>
          )}
        </div>

        {/* Navigation - Premium Style */}
        <nav className="flex-1 overflow-y-auto px-4 py-3">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 mb-2 transition-all duration-200"
                style={{ 
                  borderRadius: '10px',
                  backgroundColor: isActive ? 'rgba(0, 168, 107, 0.1)' : 'transparent',
                  color: isActive ? '#00a86b' : '#6b7280'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 168, 107, 0.06)';
                    (e.currentTarget as HTMLElement).style.color = '#00a86b';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = '#6b7280';
                  }
                }}
              >
                <item.icon size={18} strokeWidth={1.5} />
                <span className="text-sm" style={{ fontWeight: isActive ? 500 : 400 }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4" style={{ borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
            style={{ 
              borderRadius: '10px',
              color: '#ef4444'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">Cerrar Sesion</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header 
          className="bg-white px-6 py-4 flex items-center justify-between"
          style={{ 
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            borderBottom: '1px solid #e5e7eb'
          }}
        >
          <div className="lg:hidden w-10" />
          <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>
            {menuItems.find(item => item.path === location.pathname)?.label || 'MySale'}
          </h2>
          <div className="flex items-center gap-3">
            <ColombiaClockDisplay onClick={() => setPinModalOpen(true)} />
            <button 
              className="relative p-2 transition-colors"
              style={{ borderRadius: '10px' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              <Bell size={20} style={{ color: '#6b7280' }} />
              <span 
                className="absolute -top-1 -right-1 w-4 h-4 text-xs text-white flex items-center justify-center"
                style={{ backgroundColor: '#ef4444', borderRadius: '50%' }}
              >
                0
              </span>
            </button>
          </div>
        </header>
        
        {/* Page content */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;

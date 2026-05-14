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
  Bike,
  Settings,
  LucideIcon,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ArrowLeftRight
} from 'lucide-react';

// Branch option type for selection
interface BranchOption {
  id: number;
  name: string;
  code: string;
  address?: string;
}

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
  
  // State for branch selection (rotative users)
  const [showBranchSelection, setShowBranchSelection] = React.useState(false);
  const [availableBranches, setAvailableBranches] = React.useState<BranchOption[]>([]);
  const [employeeName, setEmployeeName] = React.useState('');
  const [validatedPin, setValidatedPin] = React.useState('');

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
      
      // Check if user needs to select a branch (rotative user)
      if (response.action === 'select_branch' && response.needs_branch_selection && response.available_branches) {
        setShowBranchSelection(true);
        setAvailableBranches(response.available_branches);
        setEmployeeName(response.employee_name);
        setValidatedPin(pin);
        setPin('');
        setResult({
          success: true,
          message: response.message,
          action: response.action
        });
        setLoading(false);
        return;
      }
      
      setResult({
        success: response.success,
        message: response.message,
        action: response.action
      });
      setPin('');
      
      // Auto close after 3 seconds on success
      if (response.success && response.action !== 'select_branch') {
        setTimeout(() => {
          onClose();
          setResult(null);
          resetState();
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

  const handleBranchSelect = async (branchId: number) => {
    setLoading(true);
    try {
      const response = await clockWithPin(validatedPin, branchId);
      setResult({
        success: response.success,
        message: response.message,
        action: response.action
      });
      setShowBranchSelection(false);
      
      // Auto close after 3 seconds on success
      if (response.success) {
        setTimeout(() => {
          onClose();
          setResult(null);
          resetState();
        }, 3000);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      const errorMessage = err.response?.data?.detail || err.message || 'Error al registrar entrada';
      setResult({
        success: false,
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setPin('');
    setShowBranchSelection(false);
    setAvailableBranches([]);
    setEmployeeName('');
    setValidatedPin('');
  };

  const handleClose = () => {
    resetState();
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  // Branch selection view
  if (showBranchSelection) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <div 
          className="bg-white w-full max-w-md mx-4 overflow-hidden animate-fade-in"
          style={{ 
            borderRadius: '18px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.12)'
          }}
        >
          {/* Header */}
          <div className="p-6 text-center" style={{ backgroundColor: '#00a86b' }}>
            <Building2 size={32} className="mx-auto mb-2 text-white" />
            <h2 className="text-xl font-semibold text-white">Selecciona tu Sucursal</h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Hola {employeeName}, ¿en que sede vas a trabajar hoy?
            </p>
          </div>

          {/* Result message */}
          {result && !result.success && (
            <div 
              className="p-4"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
            >
              <div className="flex items-center gap-3">
                <XCircle size={24} style={{ color: '#ef4444' }} />
                <p className="text-sm font-medium" style={{ color: '#ef4444' }}>
                  {result.message}
                </p>
              </div>
            </div>
          )}

          <div className="p-6">
            {/* Branch options */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {availableBranches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => handleBranchSelect(branch.id)}
                  disabled={loading}
                  className="w-full p-4 text-left transition-all duration-200 disabled:opacity-50"
                  style={{ 
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb',
                    backgroundColor: '#f6f7f9'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#00a86b';
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 168, 107, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#f6f7f9';
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 flex items-center justify-center"
                      style={{ 
                        borderRadius: '10px',
                        backgroundColor: 'rgba(0, 168, 107, 0.1)'
                      }}
                    >
                      <Store size={20} style={{ color: '#00a86b' }} />
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: '#111827' }}>{branch.name}</p>
                      {branch.address && (
                        <p className="text-sm" style={{ color: '#6b7280' }}>{branch.address}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 mt-4 py-3" style={{ color: '#00a86b' }}>
                <Loader2 className="animate-spin" size={20} />
                <span className="font-medium">Registrando entrada...</span>
              </div>
            )}

            {/* Cancel button */}
            <button
              onClick={handleClose}
              disabled={loading}
              className="w-full mt-4 h-12 font-medium transition-all duration-200 disabled:opacity-50"
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
  }

  // Success confirmation view (after successful clock in/out)
  if (result && result.success && result.action !== 'select_branch') {
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
            <CheckCircle size={48} className="mx-auto mb-3 text-white" />
            <h2 className="text-xl font-semibold text-white">
              {result.action === 'clock_in' ? 'Entrada Registrada' : 'Salida Registrada'}
            </h2>
          </div>

          <div className="p-6 text-center">
            <p className="text-lg font-medium" style={{ color: '#111827' }}>
              {result.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // PIN entry view
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

        {/* Error message only */}
        {result && !result.success && (
          <div 
            className="p-4"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          >
            <div className="flex items-center gap-3">
              <XCircle size={24} style={{ color: '#ef4444' }} />
              <p className="text-sm font-medium" style={{ color: '#ef4444' }}>
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
  expenses: DollarSign,
  cash: Banknote,
  shifts: Clock,
  reports: FileText,
  users: Users,
  branches: Building2,
  work_report: ClipboardList,
  super_admin: Shield,
  deliveries: Bike,
  settings: Settings,
  transfers: ArrowLeftRight,
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
  expenses: '/expenses',
  cash: '/cash',
  shifts: '/shifts',
  reports: '/reports',
  users: '/users',
  branches: '/branches',
  work_report: '/work-report',
  super_admin: '/super-admin',
  locations_admin: '/locations',
  deliveries: '/deliveries',
  settings: '/settings',
  transfers: '/transfers',
};

// Sidebar ordering by usage groups: Ventas > Operaciones > Administracion
const moduleSortOrder: Record<string, number> = {
  dashboard: 1,
  quick_sale: 2,
  pos: 3,
  deliveries: 4,
  tables: 5,
  transfers: 12,
  inventory: 10,
  expenses: 11,
  cash: 13,
  cost_control: 14,
  shifts: 20,
  reports: 21,
  users: 22,
  branches: 23,
  work_report: 24,
  locations: 25,
  locations_admin: 26,
  settings: 29,
  super_admin: 30,
};

// Group labels for sidebar sections
const moduleGroup: Record<string, string> = {
  dashboard: 'Ventas',
  quick_sale: 'Ventas',
  pos: 'Ventas',
  deliveries: 'Ventas',
  tables: 'Ventas',
  inventory: 'Operaciones',
  expenses: 'Operaciones',
  transfers: 'Otros',
  cash: 'Operaciones',
  cost_control: 'Operaciones',
  shifts: 'Administracion',
  reports: 'Administracion',
  users: 'Administracion',
  branches: 'Administracion',
  work_report: 'Administracion',
  locations: 'Administracion',
  locations_admin: 'Administracion',
  settings: 'Administracion',
  super_admin: 'Administracion',
};

// Modules that require admin role
const adminOnlyModules = ['inventory', 'cost_control', 'expenses', 'reports', 'users', 'branches', 'work_report', 'locations'];

// Modules that require superuser role
const superuserOnlyModules = ['super_admin', 'locations_admin', 'settings'];

const Layout: React.FC = () => {
  const { user, logout, enabledModules } = useAuth();
  const { currentShift } = useShift();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [pinModalOpen, setPinModalOpen] = React.useState(false);
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role?.role_type === 'superuser' || user?.role?.role_type === 'admin';
  const isSuperuser = user?.role?.role_type === 'superuser';

  // Build menu items dynamically from enabled modules, sorted by usage groups
  const menuItems = enabledModules.length > 0 
    ? enabledModules
        .filter(module => {
          // Hide modules that are now integrated into other modules
          if (module.code === 'losses') return false;
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
          group: moduleGroup[module.code] || 'Otros',
          sortOrder: moduleSortOrder[module.code] ?? 99,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [
        // Fallback menu if no modules loaded (for backwards compatibility)
        { path: '/', icon: LayoutDashboard, label: 'Dashboard', code: 'dashboard', group: 'Ventas', sortOrder: 1 },
        { path: '/pos', icon: ShoppingCart, label: 'Punto de Venta', code: 'pos', group: 'Ventas', sortOrder: 3 },
      ];

  // Add Settings item for superusers (not a tenant module, always available)
  if (isSuperuser && !menuItems.find(item => item.code === 'settings')) {
    menuItems.push({
      path: '/settings',
      icon: Settings,
      label: 'Perfil Negocio',
      code: 'settings',
      group: 'Administracion',
      sortOrder: 29,
    });
    menuItems.sort((a, b) => a.sortOrder - b.sortOrder);
  }

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
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white transform transition-transform duration-200 ease-in-out flex flex-col h-screen ${
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

        {/* Navigation - Premium Style with scroll, grouped by usage */}
        <nav className="flex-1 overflow-y-auto px-4 py-3" style={{ minHeight: 0 }}>
          {(() => {
            // Group menu items by their group
            const groups: Record<string, typeof menuItems> = {};
            menuItems.forEach((item) => {
              if (!groups[item.group]) groups[item.group] = [];
              groups[item.group].push(item);
            });
            // Maintain order based on first item in each group
            const groupOrder = Object.keys(groups);

            return groupOrder.map((group) => {
              const isCollapsed = collapsedGroups[group] || false;
              const groupItems = groups[group];
              const hasActiveItem = groupItems.some(item => location.pathname === item.path);

              return (
                <div key={group}>
                  <button
                    onClick={() => toggleGroup(group)}
                    className="w-full flex items-center justify-between px-4 pt-3 pb-1 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9ca3af' }}>
                      {group}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                      style={{ color: '#9ca3af' }}
                    />
                  </button>
                  {(!isCollapsed || hasActiveItem) && (
                    <div className={`transition-all duration-200 ${isCollapsed ? 'opacity-50' : ''}`}>
                      {groupItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        if (isCollapsed && !isActive) return null;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 mb-1 transition-all duration-200"
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
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </nav>

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
          className="bg-white px-3 py-3 lg:px-6 lg:py-4 flex items-center justify-between"
          style={{ 
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            borderBottom: '1px solid #e5e7eb'
          }}
        >
          <div className="lg:hidden w-10" />
          <h2 className="text-sm lg:text-lg font-semibold truncate" style={{ color: '#111827' }}>
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
        <div className="p-3 lg:p-6">
          <Outlet />
        </div>
      </main>

      {/* Fixed Logout Button - Bottom Right */}
      <button
        onClick={handleLogout}
        className="fixed bottom-6 left-4 lg:bottom-6 lg:right-6 lg:left-auto flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-3 bg-white shadow-lg transition-all duration-200 hover:shadow-xl z-30"
        style={{ 
          borderRadius: '12px',
          color: '#ef4444',
          border: '1px solid #fee2e2'
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'white';
        }}
      >
        <LogOut size={16} />
        <span className="font-medium text-xs lg:text-sm">Cerrar Sesion</span>
      </button>
    </div>
  );
};

export default Layout;

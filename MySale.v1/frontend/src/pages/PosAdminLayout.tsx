import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Package,
  MessageCircle,
  LogOut,
  Menu,
  X,
  Users2
} from 'lucide-react';

interface PosAdminLayoutProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  children: React.ReactNode;
}

export default function PosAdminLayout({ activeSection, onSectionChange, children }: PosAdminLayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'tenants', icon: Building2, label: 'Clientes POS' },
    { id: 'modules', icon: Package, label: 'Módulos' },
    { id: 'faqs', icon: MessageCircle, label: 'Chatbot FAQs' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200`}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="font-bold text-gray-900">POS Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <nav className="flex-1 p-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSectionChange(item.id);
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors text-left ${
                activeSection === item.id
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <Users2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name || 'Administrador'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || 'admin@posadmin.com'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 bg-emerald-600 text-white rounded-lg shadow-lg lg:relative lg:top-0 lg:left-0"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { 
  Building2, Package, DollarSign, Plus, Edit, Trash2, 
  CheckCircle, XCircle, AlertTriangle, Clock, CreditCard,
  Settings, Eye, ToggleLeft, ToggleRight
} from 'lucide-react';
import type { TenantListItem, Tenant, Module, AdminDashboard, TenantPayment } from '../types';
import {
  getAdminDashboard, getTenants, getTenant, createTenant, updateTenant, deleteTenant,
  getModules, updateTenantModules, updateTenantPaymentStatus,
  getTenantPayments, createTenantPayment
} from '../api';

type TabType = 'dashboard' | 'tenants' | 'modules';

const paymentStatusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-orange-100 text-orange-800',
  suspended: 'bg-red-100 text-red-800'
};

const paymentStatusLabels: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  overdue: 'Vencido',
  suspended: 'Suspendido'
};

interface SuperAdminProps {
  externalTab?: TabType;
  hideTabBar?: boolean;
}

export default function SuperAdmin({ externalTab, hideTabBar }: SuperAdminProps = {}) {
  const [activeTab, setActiveTab] = useState<TabType>(externalTab || 'dashboard');
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showModulesModal, setShowModulesModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentsHistoryModal, setShowPaymentsHistoryModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantPayments, setTenantPayments] = useState<TenantPayment[]>([]);
  const [editingTenant, setEditingTenant] = useState<Partial<Tenant> | null>(null);

  const [tenantForm, setTenantForm] = useState({
    name: '',
    code: '',
    subdomain: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    monthly_fee: '',
    primary_color: '#10b981',
    notes: '',
    access_url: '',
    login_username: '',
    login_password: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    period_start: '',
    period_end: '',
    payment_method: 'transfer',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    if (externalTab) setActiveTab(externalTab);
  }, [externalTab]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboardData, tenantsData, modulesData] = await Promise.all([
        getAdminDashboard(),
        getTenants(),
        getModules()
      ]);
      setDashboard(dashboardData);
      setTenants(tenantsData);
      setModules(modulesData);
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    try {
      const payload = { ...tenantForm, monthly_fee: parseFloat(tenantForm.monthly_fee as string) || 0 };
      await createTenant(payload);
      setShowTenantModal(false);
      setTenantForm({
        name: '',
        code: '',
        subdomain: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        monthly_fee: '',
        primary_color: '#10b981',
        notes: '',
        access_url: '',
        login_username: '',
        login_password: ''
      });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al crear tenant');
    }
  };

  const handleUpdateTenant = async () => {
    if (!editingTenant?.id) return;
    try {
      const payload = { ...tenantForm, monthly_fee: parseFloat(tenantForm.monthly_fee as string) || 0 };
      await updateTenant(editingTenant.id, payload);
      setShowTenantModal(false);
      setEditingTenant(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar tenant');
    }
  };

  const handleDeleteTenant = async (id: number) => {
    if (!confirm('¿Está seguro de desactivar este tenant?')) return;
    try {
      await deleteTenant(id);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al desactivar tenant');
    }
  };

  const handleOpenModulesModal = async (tenantId: number) => {
    try {
      const tenant = await getTenant(tenantId);
      setSelectedTenant(tenant);
      setShowModulesModal(true);
    } catch (err) {
      console.error(err);
      alert('Error al cargar tenant');
    }
  };

  const handleToggleModule = async (moduleId: number, isEnabled: boolean) => {
    if (!selectedTenant) return;
    try {
      await updateTenantModules(selectedTenant.id, [{ module_id: moduleId, is_enabled: !isEnabled }]);
      const updatedTenant = await getTenant(selectedTenant.id);
      setSelectedTenant(updatedTenant);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar módulo');
    }
  };

  const handleUpdatePaymentStatus = async (tenantId: number, status: string) => {
    try {
      await updateTenantPaymentStatus(tenantId, { payment_status: status });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar estado de pago');
    }
  };

  const handleOpenPaymentModal = async (tenantId: number) => {
    try {
      const tenant = await getTenant(tenantId);
      setSelectedTenant(tenant);
      setPaymentForm({
        amount: tenant.monthly_fee,
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_method: 'transfer',
        reference: '',
        notes: ''
      });
      setShowPaymentModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePayment = async () => {
    if (!selectedTenant) return;
    try {
      await createTenantPayment(selectedTenant.id, paymentForm);
      setShowPaymentModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al registrar pago');
    }
  };

  const handleViewPayments = async (tenantId: number) => {
    try {
      const tenant = await getTenant(tenantId);
      const payments = await getTenantPayments(tenantId);
      setSelectedTenant(tenant);
      setTenantPayments(payments);
      setShowPaymentsHistoryModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const openEditTenant = async (tenantId: number) => {
    try {
      const tenant = await getTenant(tenantId);
      setEditingTenant(tenant);
      setTenantForm({
        name: tenant.name,
        code: tenant.code,
        subdomain: tenant.subdomain || '',
        contact_name: tenant.contact_name || '',
        contact_email: tenant.contact_email || '',
        contact_phone: tenant.contact_phone || '',
        address: tenant.address || '',
        monthly_fee: String(tenant.monthly_fee),
        primary_color: tenant.primary_color,
        notes: tenant.notes || '',
        access_url: tenant.access_url || '',
        login_username: tenant.login_username || '',
        login_password: tenant.login_password || ''
      });
      setShowTenantModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Super Administrador</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {!hideTabBar && <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('tenants')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tenants'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Clientes POS
          </button>
          <button
            onClick={() => setActiveTab('modules')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'modules'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Módulos
          </button>
        </nav>
      </div>}

      {activeTab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Clientes</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboard.total_tenants}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Clientes Activos</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboard.active_tenants}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Módulos Disponibles</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboard.total_modules}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ingresos Mensuales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${dashboard.monthly_revenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Pagos</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{dashboard.payment_stats.active}</p>
                <p className="text-sm text-gray-600">Activos</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{dashboard.payment_stats.pending}</p>
                <p className="text-sm text-gray-600">Pendientes</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-600">{dashboard.payment_stats.overdue}</p>
                <p className="text-sm text-gray-600">Vencidos</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{dashboard.payment_stats.suspended}</p>
                <p className="text-sm text-gray-600">Suspendidos</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tenants' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingTenant(null);
                setTenantForm({
                  name: '',
                  code: '',
                  subdomain: '',
                  contact_name: '',
                  contact_email: '',
                  contact_phone: '',
                  address: '',
                  monthly_fee: '',
                  primary_color: '#10b981',
                  notes: '',
                  access_url: '',
                  login_username: '',
                  login_password: ''
                });
                setShowTenantModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              Nuevo Cliente POS
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Módulos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mensualidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acceso
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className={!tenant.is_active ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{tenant.name}</div>
                        <div className="text-sm text-gray-500">{tenant.code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{tenant.contact_name || '-'}</div>
                      <div className="text-sm text-gray-500">{tenant.contact_email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${paymentStatusColors[tenant.payment_status]}`}>
                        {paymentStatusLabels[tenant.payment_status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{tenant.enabled_modules_count} activos</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        ${tenant.monthly_fee.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {tenant.access_url ? (
                        <div>
                          <a href={tenant.access_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline break-all">{tenant.access_url}</a>
                          <div className="text-xs text-gray-500 mt-1">{tenant.login_username || '-'} / {tenant.login_password || '-'}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModulesModal(tenant.id)}
                          className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                          title="Gestionar módulos"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenPaymentModal(tenant.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Registrar pago"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewPayments(tenant.id)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Ver historial de pagos"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditTenant(tenant.id)}
                          className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {tenant.is_active && (
                          <button
                            onClick={() => handleDeleteTenant(tenant.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Desactivar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No hay clientes POS registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'modules' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Módulo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ruta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modules.map((module) => (
                <tr key={module.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{module.name}</div>
                    <div className="text-sm text-gray-500">{module.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm">{module.code}</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {module.route || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {module.is_core ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        Core
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        Opcional
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {module.is_active ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Activo
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        Inactivo
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showTenantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingTenant ? 'Editar Cliente POS' : 'Nuevo Cliente POS'}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={tenantForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const code = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                    const subdomain = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                    const randomNum = Math.floor(Math.random() * 900) + 100;
                    const updates: Partial<typeof tenantForm> = { name };
                    if (!editingTenant) {
                      updates.code = code + randomNum;
                      updates.subdomain = subdomain;
                      if (!tenantForm.login_username) updates.login_username = 'admin';
                      if (!tenantForm.login_password) {
                        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                        updates.login_password = Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
                      }
                    }
                    setTenantForm(prev => ({ ...prev, ...updates }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Restaurante El Buen Sabor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                <input
                  type="text"
                  value={tenantForm.code}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  placeholder="Se genera automáticamente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subdominio</label>
                <input
                  type="text"
                  value={tenantForm.subdomain}
                  onChange={(e) => setTenantForm({ ...tenantForm, subdomain: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="buensabor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensualidad</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={tenantForm.monthly_fee}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setTenantForm({ ...tenantForm, monthly_fee: val });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Contacto</label>
                <input
                  type="text"
                  value={tenantForm.contact_name}
                  onChange={(e) => setTenantForm({ ...tenantForm, contact_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email de Contacto</label>
                <input
                  type="email"
                  value={tenantForm.contact_email}
                  onChange={(e) => setTenantForm({ ...tenantForm, contact_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={tenantForm.contact_phone}
                  onChange={(e) => setTenantForm({ ...tenantForm, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color Principal</label>
                <input
                  type="color"
                  value={tenantForm.primary_color}
                  onChange={(e) => setTenantForm({ ...tenantForm, primary_color: e.target.value })}
                  className="w-full h-10 px-1 py-1 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={tenantForm.address}
                  onChange={(e) => setTenantForm({ ...tenantForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Link de Acceso</label>
                <input
                  type="url"
                  value={tenantForm.access_url}
                  onChange={(e) => setTenantForm({ ...tenantForm, access_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="https://ejemplo.devinapps.com/"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario de Acceso</label>
                <input
                  type="text"
                  value={tenantForm.login_username}
                  onChange={(e) => setTenantForm({ ...tenantForm, login_username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de Acceso</label>
                <input
                  type="text"
                  value={tenantForm.login_password}
                  onChange={(e) => setTenantForm({ ...tenantForm, login_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="contraseña"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={tenantForm.notes}
                  onChange={(e) => setTenantForm({ ...tenantForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTenantModal(false);
                  setEditingTenant(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={editingTenant ? handleUpdateTenant : handleCreateTenant}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                {editingTenant ? 'Guardar Cambios' : 'Crear Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModulesModal && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Módulos de {selectedTenant.name}</h2>
            <p className="text-sm text-gray-500 mb-4">Activa o desactiva los módulos para este cliente</p>
            
            <div className="space-y-3">
              {modules.map((module) => {
                const tenantModule = selectedTenant.modules?.find(tm => tm.module_id === module.id);
                const isEnabled = tenantModule?.is_enabled ?? false;
                
                return (
                  <div
                    key={module.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isEnabled ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-gray-900">{module.name}</div>
                      <div className="text-sm text-gray-500">{module.description}</div>
                      {module.is_core && (
                        <span className="text-xs text-blue-600">Módulo core</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleModule(module.id, isEnabled)}
                      className={`p-2 rounded-lg ${
                        isEnabled 
                          ? 'text-emerald-600 hover:bg-emerald-100' 
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {isEnabled ? (
                        <ToggleRight className="w-8 h-8" />
                      ) : (
                        <ToggleLeft className="w-8 h-8" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowModulesModal(false);
                  setSelectedTenant(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Registrar Pago</h2>
            <p className="text-sm text-gray-500 mb-4">Cliente: {selectedTenant.name}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período Inicio</label>
                  <input
                    type="date"
                    value={paymentForm.period_start}
                    onChange={(e) => setPaymentForm({ ...paymentForm, period_start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período Fin</label>
                  <input
                    type="date"
                    value={paymentForm.period_end}
                    onChange={(e) => setPaymentForm({ ...paymentForm, period_end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="transfer">Transferencia</option>
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Número de transferencia, etc."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedTenant(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreatePayment}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Registrar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentsHistoryModal && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Historial de Pagos</h2>
            <p className="text-sm text-gray-500 mb-4">Cliente: {selectedTenant.name}</p>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-500">Estado actual:</span>
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${paymentStatusColors[selectedTenant.payment_status]}`}>
                    {paymentStatusLabels[selectedTenant.payment_status]}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdatePaymentStatus(selectedTenant.id, 'active')}
                    className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Marcar Activo
                  </button>
                  <button
                    onClick={() => handleUpdatePaymentStatus(selectedTenant.id, 'pending')}
                    className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                  >
                    Marcar Pendiente
                  </button>
                  <button
                    onClick={() => handleUpdatePaymentStatus(selectedTenant.id, 'suspended')}
                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Suspender
                  </button>
                </div>
              </div>
            </div>
            
            {tenantPayments.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Monto</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Período</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Método</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Referencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenantPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-2 text-sm">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium">
                        ${payment.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {new Date(payment.period_start).toLocaleDateString()} - {new Date(payment.period_end).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-sm">{payment.payment_method || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{payment.reference || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-gray-500 py-8">No hay pagos registrados</p>
            )}
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowPaymentsHistoryModal(false);
                  setSelectedTenant(null);
                  setTenantPayments([]);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

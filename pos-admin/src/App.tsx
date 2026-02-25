import { useState, useEffect, createContext, useContext } from 'react'
import './App.css'
import { 
  Building2, Package, DollarSign, Users, LogOut, Menu, X,
  Plus, Edit, Trash2, Eye, CreditCard, ToggleLeft, ToggleRight,
  AlertCircle, CheckCircle, Clock, Ban, LayoutDashboard, Search,
  MessageCircle, Save
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

// Wake up the server before making requests (Fly.io auto-suspends)
let serverAwake = false
let wakeUpPromise: Promise<void> | null = null
let keepAliveInterval: ReturnType<typeof setInterval> | null = null

// Start keep-alive mechanism to prevent server from sleeping
function startKeepAlive() {
  if (keepAliveInterval) return
  
  // Ping server every 30 seconds to keep it awake
  keepAliveInterval = setInterval(async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      await fetch(`${API_URL}/healthz`, { 
        method: 'GET',
        mode: 'cors',
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      serverAwake = true
    } catch (e) {
      serverAwake = false
      console.log('Keep-alive ping failed')
    }
  }, 30000) // Every 30 seconds
  
  console.log('Keep-alive started')
}

// Stop keep-alive when user logs out
function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
    keepAliveInterval = null
    console.log('Keep-alive stopped')
  }
}

async function wakeUpServer(): Promise<void> {
  if (serverAwake) return
  
  // If already waking up, wait for that to complete
  if (wakeUpPromise) {
    return wakeUpPromise
  }
  
  wakeUpPromise = (async () => {
    // Try multiple times to wake up the server with longer timeouts
    for (let i = 0; i < 10; i++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
        
        console.log(`Wake up attempt ${i + 1}...`)
        const response = await fetch(`${API_URL}/healthz`, { 
          method: 'GET',
          mode: 'cors',
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        if (response.ok) {
          serverAwake = true
          // Start keep-alive to prevent server from sleeping again
          startKeepAlive()
          console.log('Server is awake!')
          return
        }
      } catch (e) {
        console.log(`Wake up attempt ${i + 1} failed, retrying in 3 seconds...`)
        // Wait longer before retrying
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }
    console.log('Server wake up failed after 10 attempts')
  })()
  
  try {
    await wakeUpPromise
  } finally {
    wakeUpPromise = null
  }
}

interface User {
  id: number
  username: string
  email: string
  full_name: string
  is_active: boolean
  is_superuser: boolean
}

interface Module {
  id: number
  code: string
  name: string
  description: string | null
  icon: string | null
  route: string | null
  display_order: number
  is_core: boolean
  is_active: boolean
}

interface TenantModule {
  id: number
  module_id: number
  module_code: string
  module_name: string
  module_icon: string | null
  module_route: string | null
  is_enabled: boolean
}

interface Tenant {
  id: number
  name: string
  code: string
  subdomain: string | null
  logo_url: string | null
  primary_color: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  payment_status: string
  payment_due_date: string | null
  monthly_fee: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  modules?: TenantModule[]
  enabled_modules_count?: number
  pos_url: string | null
  pos_username: string | null
  pos_password: string | null
}

interface TenantPayment {
  id: number
  tenant_id: number
  amount: number
  payment_date: string
  period_start: string
  period_end: string
  payment_method: string | null
  reference: string | null
  notes: string | null
}

interface Dashboard {
  total_tenants: number
  active_tenants: number
  payment_stats: {
    active: number
    pending: number
    overdue: number
    suspended: number
  }
  total_modules: number
  monthly_revenue: number
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

async function apiCall(endpoint: string, options: RequestInit = {}, token?: string | null, retries = 3): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  // Wake up server before ALL requests (Fly.io auto-suspends)
  await wakeUpServer()
  
  // For POST/PUT/DELETE requests, do an extra warm-up request using healthz endpoint
  const method = (options.method || 'GET').toUpperCase()
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    console.log('Warming up server before mutation request...')
    try {
      // Use healthz endpoint for warmup - it's more reliable than OPTIONS
      const warmupController = new AbortController()
      const warmupTimeout = setTimeout(() => warmupController.abort(), 15000)
      const warmupResponse = await fetch(`${API_URL}/healthz`, {
        method: 'GET',
        mode: 'cors',
        signal: warmupController.signal
      })
      clearTimeout(warmupTimeout)
      if (warmupResponse.ok) {
        console.log('Warmup successful')
        // Longer delay to ensure server is fully ready for the actual request
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (e) {
      console.log('Warmup request failed, proceeding anyway...')
      // Even if warmup fails, wait a bit before proceeding
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, { 
        ...options, 
        headers,
        signal: controller.signal,
        mode: 'cors'
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        // If 401 Unauthorized, clear invalid token and force re-login
        if (response.status === 401) {
          localStorage.removeItem('pos_admin_token')
          localStorage.removeItem('pos_admin_user')
          window.location.reload() // Force reload to show login page
          throw new Error('Sesión expirada. Por favor inicia sesión de nuevo.')
        }
        const error = await response.json().catch(() => ({ detail: 'Error de conexión' }))
        throw new Error(error.detail || 'Error en la solicitud')
      }
      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      console.error(`Attempt ${attempt} failed:`, error)
      
      // On failure, try to wake up server again with longer delay
      if (attempt < retries) {
        serverAwake = false
        await wakeUpServer()
        // Extra delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      if (attempt === retries) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('La solicitud tardó demasiado. Por favor intenta de nuevo.')
        }
        throw error
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
    }
  }
}

function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <img 
            src="/logo.png" 
            alt="MySale Logo" 
            className="mx-auto mb-4"
            style={{ width: '64px', height: '64px', objectFit: 'contain' }}
          />
          <h1 className="text-2xl font-bold text-gray-900">MySale Factory</h1>
          <p className="text-gray-500 mt-2">Plataforma de Gestión de Clientes POS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="********"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}

function DashboardPage({ token }: { token: string }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const data = await apiCall('/api/admin/dashboard', {}, token)
      setDashboard(data)
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>
  }

  if (!dashboard) {
    return <div className="text-red-500">Error al cargar el dashboard</div>
  }

  const stats = [
    { label: 'Total Clientes', value: dashboard.total_tenants, icon: Building2, color: 'bg-blue-500' },
    { label: 'Clientes Activos', value: dashboard.active_tenants, icon: CheckCircle, color: 'bg-emerald-500' },
    { label: 'Módulos Disponibles', value: dashboard.total_modules, icon: Package, color: 'bg-purple-500' },
    { label: 'Ingresos Mensuales', value: `$${dashboard.monthly_revenue.toLocaleString()}`, icon: DollarSign, color: 'bg-amber-500' },
  ]

  const paymentStats = [
    { label: 'Activos', value: dashboard.payment_stats.active, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Pendientes', value: dashboard.payment_stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Vencidos', value: dashboard.payment_stats.overdue, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Suspendidos', value: dashboard.payment_stats.suspended, icon: Ban, color: 'text-gray-600', bg: 'bg-gray-100' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de Pagos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {paymentStats.map((stat) => (
            <div key={stat.label} className={`${stat.bg} rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className={`text-sm font-medium ${stat.color}`}>{stat.label}</span>
              </div>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TenantsPage({ token }: { token: string }) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [showModulesModal, setShowModulesModal] = useState<Tenant | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState<Tenant | null>(null)
  const [showPaymentsHistory, setShowPaymentsHistory] = useState<Tenant | null>(null)
  const [payments, setPayments] = useState<TenantPayment[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
            const [tenantsData, modulesData] = await Promise.all([
              apiCall('/api/admin/tenants', {}, token),
              apiCall('/api/admin/modules', {}, token)
            ])
      setTenants(tenantsData)
      setModules(modulesData)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTenantDetails = async (tenantId: number) => {
    try {
      const data = await apiCall(`/api/admin/tenants/${tenantId}`, {}, token)
      return data
    } catch (err) {
      console.error('Error loading tenant details:', err)
      return null
    }
  }

  const loadPayments = async (tenantId: number) => {
    try {
      const data = await apiCall(`/api/admin/tenants/${tenantId}/payments`, {}, token)
      setPayments(data)
    } catch (err) {
      console.error('Error loading payments:', err)
    }
  }

  const handleSaveTenant = async (data: Partial<Tenant>) => {
    try {
      if (editingTenant) {
        await      apiCall(`/api/admin/tenants/${editingTenant.id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
              }, token)
            } else {
                      await apiCall('/api/admin/tenants', {
                        method: 'POST',
          body: JSON.stringify(data)
        }, token)
      }
      setShowForm(false)
      setEditingTenant(null)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

    const handleDeleteTenant = async (tenant: Tenant) => {
      if (!confirm(`¿Estás seguro de ELIMINAR PERMANENTEMENTE "${tenant.name}"? Esta acción no se puede deshacer.`)) return
    try {
      await apiCall(`/api/admin/tenants/${tenant.id}`, { method: 'DELETE' }, token)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const handleOpenModules = async (tenant: Tenant) => {
    const details = await loadTenantDetails(tenant.id)
    if (details) {
      setShowModulesModal(details)
    }
  }

  const handleToggleModule = async (moduleId: number, isEnabled: boolean) => {
    if (!showModulesModal) return
    try {
            await apiCall(`/api/admin/tenants/${showModulesModal.id}/modules`, {
              method: 'PUT',
              body: JSON.stringify([{ module_id: moduleId, is_enabled: isEnabled }])
            }, token)
      const details = await loadTenantDetails(showModulesModal.id)
      if (details) {
        setShowModulesModal(details)
      }
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar módulo')
    }
  }

  const handleSavePayment = async (data: { amount: number; period_start: string; period_end: string; payment_method: string; reference: string }) => {
    if (!showPaymentModal) return
    try {
            await apiCall(`/api/admin/tenants/${showPaymentModal.id}/payments`, {
              method: 'POST',
              body: JSON.stringify(data)
            }, token)
      setShowPaymentModal(null)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al registrar pago')
    }
  }

  const handleOpenPaymentsHistory = async (tenant: Tenant) => {
    setShowPaymentsHistory(tenant)
    await loadPayments(tenant.id)
  }

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      overdue: 'bg-red-100 text-red-700',
      suspended: 'bg-gray-100 text-gray-700'
    }
    const labels: Record<string, string> = {
      active: 'Activo',
      pending: 'Pendiente',
      overdue: 'Vencido',
      suspended: 'Suspendido'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clientes POS</h1>
        <button
          onClick={() => { setEditingTenant(null); setShowForm(true) }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acceso POS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado Pago</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mensualidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Módulos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className={!tenant.is_active ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{tenant.name}</p>
                      <p className="text-sm text-gray-500">{tenant.code}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm text-gray-900">{tenant.contact_name || '-'}</p>
                      <p className="text-sm text-gray-500">{tenant.contact_email || '-'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-xs space-y-1">
                      {tenant.pos_url ? (
                        <a href={tenant.pos_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block truncate max-w-xs">{tenant.pos_url}</a>
                      ) : (
                        <span className="text-gray-400">Sin URL</span>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Usuario:</span>
                        <span className="font-mono bg-gray-100 px-1 rounded">{tenant.pos_username || '-'}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(tenant.pos_username || '')}
                          className="text-gray-400 hover:text-gray-600"
                          title="Copiar usuario"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Clave:</span>
                        <span className="font-mono bg-gray-100 px-1 rounded">{tenant.pos_password || '-'}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(tenant.pos_password || '')}
                          className="text-gray-400 hover:text-gray-600"
                          title="Copiar contraseña"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {getStatusBadge(tenant.payment_status)}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-900">${tenant.monthly_fee.toLocaleString('es-CO')} COP</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600">{tenant.enabled_modules_count || 0} activos</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModules(tenant)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                        title="Gestionar módulos"
                      >
                        <Package className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowPaymentModal(tenant)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        title="Registrar pago"
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenPaymentsHistory(tenant)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Ver historial de pagos"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditingTenant(tenant); setShowForm(true) }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                                            <button
                                                onClick={() => handleDeleteTenant(tenant)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                title="Eliminar"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <TenantFormModal
          tenant={editingTenant}
          onSave={handleSaveTenant}
          onClose={() => { setShowForm(false); setEditingTenant(null) }}
        />
      )}

      {showModulesModal && (
        <ModulesModal
          tenant={showModulesModal}
          allModules={modules}
          onToggle={handleToggleModule}
          onClose={() => setShowModulesModal(null)}
        />
      )}

      {showPaymentModal && (
        <PaymentFormModal
          tenant={showPaymentModal}
          onSave={handleSavePayment}
          onClose={() => setShowPaymentModal(null)}
        />
      )}

      {showPaymentsHistory && (
        <PaymentsHistoryModal
          tenant={showPaymentsHistory}
          payments={payments}
          onClose={() => setShowPaymentsHistory(null)}
        />
      )}
    </div>
  )
}

function TenantFormModal({ tenant, onSave, onClose }: { 
  tenant: Tenant | null
  onSave: (data: Partial<Tenant>) => void
  onClose: () => void 
}) {
  const generateCode = (name: string) => {
    const cleanName = name
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 10)
    const randomNum = Math.floor(Math.random() * 900) + 100
    return cleanName ? `${cleanName}${randomNum}` : ''
  }

  const formatCOP = (value: number | null): string => {
    if (value === null || value === 0) return ''
    return value.toLocaleString('es-CO')
  }

  const parseCOP = (value: string): number => {
    const cleaned = value.replace(/\./g, '').replace(/,/g, '')
    return parseInt(cleaned) || 0
  }

  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    code: tenant?.code || '',
    subdomain: tenant?.subdomain || '',
    contact_name: tenant?.contact_name || '',
    contact_email: tenant?.contact_email || '',
    contact_phone: tenant?.contact_phone || '',
    address: tenant?.address || '',
    monthly_fee: tenant?.monthly_fee || 0,
    notes: tenant?.notes || '',
    pos_url: tenant?.pos_url || '',
    pos_username: tenant?.pos_username || '',
    pos_password: tenant?.pos_password || ''
  })

  const [monthlyFeeDisplay, setMonthlyFeeDisplay] = useState(formatCOP(tenant?.monthly_fee || 0))

  const handleNameChange = (name: string) => {
    const newCode = tenant ? formData.code : generateCode(name)
    setFormData({ ...formData, name, code: newCode })
  }

  const handleMonthlyFeeChange = (value: string) => {
    const numericValue = parseCOP(value)
    setFormData({ ...formData, monthly_fee: numericValue })
    setMonthlyFeeDisplay(formatCOP(numericValue))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {tenant ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
              <input
                type="text"
                value={formData.code}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-100"
                required
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Se genera automáticamente del nombre</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subdominio</label>
            <input
              type="text"
              value={formData.subdomain}
              onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="cliente.tudominio.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Contacto</label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Contacto</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensualidad (COP)</label>
              <input
                type="text"
                value={monthlyFeeDisplay}
                onChange={(e) => handleMonthlyFeeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="Ej: 120.000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              rows={3}
            />
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Acceso al POS</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL del POS</label>
              <input
                type="url"
                value={formData.pos_url}
                onChange={(e) => setFormData({ ...formData, pos_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="https://pos.ejemplo.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario POS</label>
                <input
                  type="text"
                  value={formData.pos_username}
                  onChange={(e) => setFormData({ ...formData, pos_username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Se genera automáticamente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña POS</label>
                <input
                  type="text"
                  value={formData.pos_password}
                  onChange={(e) => setFormData({ ...formData, pos_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Se genera automáticamente"
                />
              </div>
            </div>
            {!tenant && (
              <p className="text-xs text-gray-500 mt-2">Si dejas vacíos usuario y contraseña, se generarán automáticamente.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              {tenant ? 'Guardar Cambios' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModulesModal({ tenant, allModules, onToggle, onClose }: {
  tenant: Tenant
  allModules: Module[]
  onToggle: (moduleId: number, isEnabled: boolean) => void
  onClose: () => void
}) {
  const tenantModuleMap = new Map(tenant.modules?.map(m => [m.module_id, m]) || [])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Módulos de {tenant.name}</h2>
          <p className="text-sm text-gray-500 mt-1">Activa o desactiva los módulos disponibles para este cliente</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            {allModules.map((module) => {
              const tenantModule = tenantModuleMap.get(module.id)
              const isEnabled = tenantModule?.is_enabled ?? false

              return (
                <div key={module.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{module.name}</p>
                      {module.is_core && (
                        <span className="text-xs text-emerald-600 font-medium">Módulo base</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onToggle(module.id, !isEnabled)}
                    className={`p-1 rounded-lg transition-colors flex-shrink-0 ${isEnabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                  >
                    {isEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function PaymentFormModal({ tenant, onSave, onClose }: {
  tenant: Tenant
  onSave: (data: { amount: number; period_start: string; period_end: string; payment_method: string; reference: string }) => void
  onClose: () => void
}) {
  const today = new Date()
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
  
  const [formData, setFormData] = useState({
    amount: tenant.monthly_fee,
    period_start: today.toISOString().split('T')[0],
    period_end: nextMonth.toISOString().split('T')[0],
    payment_method: 'transfer',
    reference: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Registrar Pago</h2>
          <p className="text-sm text-gray-500 mt-1">{tenant.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período Inicio</label>
              <input
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período Fin</label>
              <input
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="transfer">Transferencia</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="Número de transacción, recibo, etc."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Registrar Pago
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PaymentsHistoryModal({ tenant, payments, onClose }: {
  tenant: Tenant
  payments: TenantPayment[]
  onClose: () => void
}) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Historial de Pagos</h2>
          <p className="text-sm text-gray-500 mt-1">{tenant.name}</p>
        </div>
        <div className="p-6">
          {payments.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay pagos registrados</p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">${payment.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(payment.period_start)} - {formatDate(payment.period_end)}
                    </p>
                    {payment.reference && (
                      <p className="text-xs text-gray-400">Ref: {payment.reference}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{formatDate(payment.payment_date)}</p>
                    <p className="text-xs text-gray-400 capitalize">{payment.payment_method || 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function ModulesPage({ token }: { token: string }) {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadModules()
  }, [])

  const loadModules = async () => {
    try {
      const data = await apiCall('/api/admin/modules', {}, token)
      setModules(data)
    } catch (err) {
      console.error('Error loading modules:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Módulos Disponibles</h1>
      
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Módulo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {modules.map((module) => (
              <tr key={module.id}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-900">{module.name}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{module.code}</code>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">{module.description || '-'}</td>
                <td className="px-4 py-4">
                  {module.is_core ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Base</span>
                  ) : (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Opcional</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {module.is_active ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Activo</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Inactivo</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface FAQ {
  id: number
  question: string
  keywords: string
  answer: string
  category: string | null
  is_active: boolean
  priority: number
}

function FAQsPage({ token }: { token: string }) {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    question: '',
    keywords: '',
    answer: '',
    category: '',
    is_active: true,
    priority: 0
  })

  useEffect(() => {
    loadFaqs()
  }, [])

  const loadFaqs = async () => {
    try {
      const data = await apiCall('/faq/', {}, token)
      setFaqs(data)
    } catch (err) {
      console.error('Error loading FAQs:', err)
    } finally {
      setLoading(false)
    }
  }

  const seedDefaultFaqs = async () => {
    try {
      await apiCall('/faq/seed', { method: 'POST' }, token)
      await loadFaqs()
    } catch (err) {
      console.error('Error seeding FAQs:', err)
    }
  }

  const handleSave = async () => {
    try {
      if (editingFaq) {
        await apiCall(`/faq/${editingFaq.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        }, token)
      } else {
        await apiCall('/faq/', {
          method: 'POST',
          body: JSON.stringify(formData)
        }, token)
      }
      setShowForm(false)
      setEditingFaq(null)
      setFormData({ question: '', keywords: '', answer: '', category: '', is_active: true, priority: 0 })
      await loadFaqs()
    } catch (err) {
      console.error('Error saving FAQ:', err)
    }
  }

  const handleEdit = (faq: FAQ) => {
    setEditingFaq(faq)
    setFormData({
      question: faq.question,
      keywords: faq.keywords,
      answer: faq.answer,
      category: faq.category || '',
      is_active: faq.is_active,
      priority: faq.priority
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta pregunta?')) return
    try {
      await apiCall(`/faq/${id}`, { method: 'DELETE' }, token)
      await loadFaqs()
    } catch (err) {
      console.error('Error deleting FAQ:', err)
    }
  }

  const handleNew = () => {
    setEditingFaq(null)
    setFormData({ question: '', keywords: '', answer: '', category: '', is_active: true, priority: 0 })
    setShowForm(true)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preguntas Frecuentes del Chatbot</h1>
          <p className="text-gray-500 mt-1">Configura las respuestas automáticas del chatbot de soporte</p>
        </div>
        <div className="flex gap-2">
          {faqs.length === 0 && (
            <button
              onClick={seedDefaultFaqs}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              Cargar FAQs por defecto
            </button>
          )}
          <button
            onClick={handleNew}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Pregunta
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">{editingFaq ? 'Editar Pregunta' : 'Nueva Pregunta'}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pregunta / Título</label>
              <input
                type="text"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="Ej: ¿Cómo gestiono el inventario?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Palabras clave (separadas por coma)</label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="Ej: inventario,producto,stock,agregar"
              />
              <p className="text-xs text-gray-500 mt-1">El chatbot buscará estas palabras en el mensaje del usuario</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Respuesta</label>
              <textarea
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="Escribe la respuesta que el chatbot dará cuando detecte estas palabras clave..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ej: inventario"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-gray-500 mt-1">Mayor número = mayor prioridad</p>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Activo</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => { setShowForm(false); setEditingFaq(null) }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pregunta</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Palabras Clave</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridad</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {faqs.map((faq) => (
              <tr key={faq.id}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-emerald-500" />
                    <span className="font-medium text-gray-900">{faq.question}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {faq.keywords.split(',').slice(0, 3).map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {kw.trim()}
                      </span>
                    ))}
                    {faq.keywords.split(',').length > 3 && (
                      <span className="text-xs text-gray-400">+{faq.keywords.split(',').length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">{faq.category || '-'}</td>
                <td className="px-4 py-4 text-sm text-gray-500">{faq.priority}</td>
                <td className="px-4 py-4">
                  {faq.is_active ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Activo</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Inactivo</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(faq)}
                      className="p-1 text-gray-400 hover:text-emerald-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(faq.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {faqs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No hay preguntas frecuentes configuradas. Haz clic en "Cargar FAQs por defecto" para comenzar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MainApp() {
  const { user, logout, token } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tenants', label: 'Clientes POS', icon: Building2 },
    { id: 'modules', label: 'Módulos', icon: Package },
    { id: 'faqs', label: 'Chatbot FAQs', icon: MessageCircle },
  ]

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="MySale Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              <span className="font-bold text-gray-900">MySale Factory</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentPage === item.id
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t">
          <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{user?.full_name}</p>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              </div>
            )}
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        {currentPage === 'dashboard' && <DashboardPage token={token!} />}
        {currentPage === 'tenants' && <TenantsPage token={token!} />}
        {currentPage === 'modules' && <ModulesPage token={token!} />}
        {currentPage === 'faqs' && <FAQsPage token={token!} />}
      </main>
    </div>
  )
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('pos_admin_token')
    const savedUser = localStorage.getItem('pos_admin_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error de conexión' }))
      throw new Error(error.detail || 'Error al iniciar sesión')
    }

    const data = await response.json()
    setToken(data.access_token)
    setUser(data.user)
    localStorage.setItem('pos_admin_token', data.access_token)
    localStorage.setItem('pos_admin_user', JSON.stringify(data.user))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('pos_admin_token')
    localStorage.removeItem('pos_admin_user')
    stopKeepAlive()
    serverAwake = false
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {user ? <MainApp /> : <LoginPage />}
    </AuthContext.Provider>
  )
}

export default App

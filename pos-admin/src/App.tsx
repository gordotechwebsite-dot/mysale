import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import './App.css'
import { 
  Building2, Package, DollarSign, LogOut, Menu, X,
  Plus, Edit, Trash2, Eye, CreditCard, ToggleLeft, ToggleRight,
  AlertCircle, CheckCircle, Clock, Ban, LayoutDashboard, Search,
  MessageCircle, Save, TrendingUp, Activity, ShoppingCart, AlertTriangle,
  Bell, Send, Megaphone
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Balatro from './components/Balatro'

// ============ Toast System ============
interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

const ToastContext = createContext<{
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
} | null>(null)

function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

let toastId = 0

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const colors = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  }
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: AlertCircle
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 max-w-sm">
        {toasts.map(toast => {
          const Icon = icons[toast.type]
          return (
            <div key={toast.id} className={`${colors[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{toast.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// ============ Confirm Dialog ============
interface ConfirmDialogState {
  open: boolean
  title: string
  description: string
  variant: 'danger' | 'warning' | 'default'
  confirmLabel: string
  onConfirm: () => void
}

function ConfirmDialog({ state, onClose }: { state: ConfirmDialogState; onClose: () => void }) {
  if (!state.open) return null

  const btnColors = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-orange-500 hover:bg-orange-600',
    default: 'bg-emerald-600 hover:bg-emerald-700'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{state.title}</h3>
        <p className="text-sm text-gray-600 mb-6">{state.description}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium">
            Cancelar
          </button>
          <button
            onClick={() => { state.onConfirm(); onClose() }}
            className={`px-4 py-2 text-white rounded-lg text-sm font-medium ${btnColors[state.variant]}`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function useConfirm() {
  const [state, setState] = useState<ConfirmDialogState>({
    open: false, title: '', description: '', variant: 'default', confirmLabel: 'Confirmar', onConfirm: () => {}
  })

  const confirm = useCallback((opts: Omit<ConfirmDialogState, 'open'>) => {
    setState({ ...opts, open: true })
  }, [])

  const close = useCallback(() => setState(prev => ({ ...prev, open: false })), [])

  return { state, confirm, close }
}

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

interface TenantActivity {
  tenant_id: number
  name: string
  code: string
  payment_status: string
  monthly_fee: number
  sales_count: number
  sales_total: number
  last_sale: string | null
}

interface RevenueMonth {
  month: string
  revenue: number
}

interface RecentTenant {
  id: number
  name: string
  code: string
  created_at: string | null
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
  recent_tenants: RecentTenant[]
  revenue_by_month: RevenueMonth[]
  tenant_activity: TenantActivity[]
  today_sales_count: number
  today_sales_total: number
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Animated Balatro Background */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <Balatro
          spinRotation={-2}
          spinSpeed={7}
          color1="#3ba7de"
          color2="#b30000"
          color3="#162325"
          contrast={6.5}
          lighting={0.7}
          spinAmount={0.25}
          pixelFilter={1050}
        />
      </div>

      {/* Content */}
      <div className="relative" style={{ zIndex: 1 }}>
        <h1 className="text-3xl font-bold text-white text-center mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>MySale Factory</h1>
        <p className="text-white/70 text-center mb-6">Panel de Administracion</p>

        <div className="rounded-2xl shadow-2xl w-full max-w-md p-8" style={{ backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)' }}>
          <div className="text-center mb-8">
            <img 
              src="/logo.png" 
              alt="MySale Logo" 
              className="mx-auto mb-4"
              style={{ width: '64px', height: '64px', objectFit: 'contain' }}
            />
            <h2 className="text-xl font-bold text-gray-900">MySale</h2>
            <p className="text-gray-500 text-sm">Sistema POS</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50"
                placeholder="Usuario o correo"
                required
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50"
                placeholder="Contrasena"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Iniciando sesion...' : 'Iniciar sesion'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-xs mt-6">MySale POS Cloud v1.0</p>
        </div>
      </div>
    </div>
  )
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280']

function DashboardPage({ token }: { token: string }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const data = await apiCall('/api/admin/dashboard', {}, token)
      setDashboard(data)
    } catch (err) {
      showToast('Error al cargar el dashboard', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>
  }

  if (!dashboard) {
    return <div className="text-red-500 text-center py-8">Error al cargar el dashboard</div>
  }

  const stats = [
    { label: 'Total Clientes', value: dashboard.total_tenants, icon: Building2, color: 'bg-blue-500' },
    { label: 'Clientes Activos', value: dashboard.active_tenants, icon: CheckCircle, color: 'bg-emerald-500' },
    { label: 'Ventas Hoy', value: dashboard.today_sales_count, icon: ShoppingCart, color: 'bg-purple-500' },
    { label: 'Ingresos Mensuales', value: `$${dashboard.monthly_revenue.toLocaleString()}`, icon: DollarSign, color: 'bg-amber-500' },
  ]

  const paymentStats = [
    { label: 'Activos', value: dashboard.payment_stats.active, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Pendientes', value: dashboard.payment_stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Vencidos', value: dashboard.payment_stats.overdue, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Suspendidos', value: dashboard.payment_stats.suspended, icon: Ban, color: 'text-gray-600', bg: 'bg-gray-100' },
  ]

  const paymentPieData = paymentStats.filter(s => s.value > 0).map(s => ({ name: s.label, value: s.value }))

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Sin actividad'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `Hace ${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `Hace ${hours}h`
    const days = Math.floor(hours / 24)
    return `Hace ${days}d`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`${stat.color} p-2 sm:p-3 rounded-lg`}>
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 truncate">{stat.label}</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h2 className="text-sm sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Ingresos por Mes
          </h2>
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.revenue_by_month}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Status Pie */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h2 className="text-sm sm:text-lg font-semibold text-gray-900 mb-4">Estado de Pagos</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-40 w-40 sm:h-48 sm:w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {paymentPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 flex-1 w-full">
              {paymentStats.map((stat) => (
                <div key={stat.label} className={`${stat.bg} rounded-lg p-3`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    <span className={`text-xs font-medium ${stat.color}`}>{stat.label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tenant Activity Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-sm sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Actividad de Clientes (últimos 30 días)
          </h2>
        </div>
        {/* Mobile cards view */}
        <div className="block lg:hidden divide-y divide-gray-100">
          {(dashboard.tenant_activity || []).map((t) => (
            <div key={t.tenant_id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 text-sm">{t.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  t.payment_status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                  t.payment_status === 'overdue' ? 'bg-red-100 text-red-700' :
                  t.payment_status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                }`}>{t.payment_status === 'active' ? 'Activo' : t.payment_status === 'overdue' ? 'Vencido' : t.payment_status === 'pending' ? 'Pendiente' : 'Suspendido'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                <div><span className="block text-gray-400">Ventas</span><span className="font-medium text-gray-900">{t.sales_count}</span></div>
                <div><span className="block text-gray-400">Total</span><span className="font-medium text-gray-900">${t.sales_total.toLocaleString()}</span></div>
                <div><span className="block text-gray-400">Última</span><span className="font-medium text-gray-900">{formatTimeAgo(t.last_sale)}</span></div>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop table view */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ventas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Ventas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mensualidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Venta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(dashboard.tenant_activity || []).map((t) => (
                <tr key={t.tenant_id} className={t.sales_count === 0 ? 'bg-red-50/50' : ''}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.code}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.payment_status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      t.payment_status === 'overdue' ? 'bg-red-100 text-red-700' :
                      t.payment_status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {t.payment_status === 'active' ? 'Activo' : t.payment_status === 'overdue' ? 'Vencido' : t.payment_status === 'pending' ? 'Pendiente' : 'Suspendido'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium">{t.sales_count}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium">${t.sales_total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-sm">${t.monthly_fee.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {t.last_sale ? (
                      <span className={t.sales_count === 0 ? 'text-red-500' : ''}>{formatTimeAgo(t.last_sale)}</span>
                    ) : (
                      <span className="text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Sin actividad</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  const { showToast } = useToast()
  const { state: confirmState, confirm, close: closeConfirm } = useConfirm()

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
      showToast('Error al cargar los datos', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadTenantDetails = async (tenantId: number) => {
    try {
      const data = await apiCall(`/api/admin/tenants/${tenantId}`, {}, token)
      return data
    } catch (err) {
      showToast('Error al cargar detalles del cliente', 'error')
      return null
    }
  }

  const loadPayments = async (tenantId: number) => {
    try {
      const data = await apiCall(`/api/admin/tenants/${tenantId}/payments`, {}, token)
      setPayments(data)
    } catch (err) {
      showToast('Error al cargar pagos', 'error')
    }
  }

  const handleSaveTenant = async (data: Partial<Tenant>) => {
    try {
      if (editingTenant) {
        await apiCall(`/api/admin/tenants/${editingTenant.id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        }, token)
        showToast('Cliente actualizado correctamente')
      } else {
        await apiCall('/api/admin/tenants', {
          method: 'POST',
          body: JSON.stringify(data)
        }, token)
        showToast('Cliente creado correctamente')
      }
      setShowForm(false)
      setEditingTenant(null)
      loadData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar', 'error')
    }
  }

  const handleDeleteTenant = (tenant: Tenant) => {
    confirm({
      title: 'Eliminar Cliente',
      description: `¿Estás seguro de ELIMINAR PERMANENTEMENTE "${tenant.name}"? Esta acción no se puede deshacer.`,
      variant: 'danger',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await apiCall(`/api/admin/tenants/${tenant.id}`, { method: 'DELETE' }, token)
          showToast('Cliente eliminado correctamente')
          loadData()
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Error al eliminar', 'error')
        }
      }
    })
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
      showToast(isEnabled ? 'Módulo habilitado' : 'Módulo deshabilitado')
      loadData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar módulo', 'error')
    }
  }

  const handleSavePayment = async (data: { amount: number; period_start: string; period_end: string; payment_method: string; reference: string }) => {
    if (!showPaymentModal) return
    try {
      await apiCall(`/api/admin/tenants/${showPaymentModal.id}/payments`, {
        method: 'POST',
        body: JSON.stringify(data)
      }, token)
      showToast('Pago registrado correctamente')
      setShowPaymentModal(null)
      loadData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al registrar pago', 'error')
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
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Clientes POS</h1>
        <button
          onClick={() => { setEditingTenant(null); setShowForm(true) }}
          className="bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2 text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden lg:inline">Nuevo Cliente</span>
          <span className="lg:hidden">Nuevo</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-3 sm:p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base"
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>

        {/* Mobile card view */}
        <div className="block lg:hidden divide-y divide-gray-100">
          {filteredTenants.map((tenant) => (
            <div key={tenant.id} className={`p-4 space-y-3 ${!tenant.is_active ? 'opacity-60 bg-gray-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{tenant.name}</p>
                  <p className="text-xs text-gray-400">{tenant.code}</p>
                </div>
                {getStatusBadge(tenant.payment_status)}
              </div>
              <div className="text-xs space-y-1">
                <p className="text-gray-500">{tenant.contact_name || '-'} · {tenant.contact_email || '-'}</p>
                <p className="font-medium">${tenant.monthly_fee.toLocaleString('es-CO')} COP · {tenant.enabled_modules_count || 0} módulos</p>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Usuario:</span>
                  <span className="font-mono bg-gray-100 px-1 rounded">{tenant.pos_username || '-'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Clave:</span>
                  <span className="font-mono bg-gray-100 px-1 rounded">{tenant.pos_password || '-'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => handleOpenModules(tenant)} className="flex-1 p-2 text-purple-600 bg-purple-50 rounded-lg text-xs font-medium text-center">Módulos</button>
                <button onClick={() => setShowPaymentModal(tenant)} className="flex-1 p-2 text-emerald-600 bg-emerald-50 rounded-lg text-xs font-medium text-center">Pago</button>
                <button onClick={() => handleOpenPaymentsHistory(tenant)} className="flex-1 p-2 text-blue-600 bg-blue-50 rounded-lg text-xs font-medium text-center">Historial</button>
                <button onClick={() => { setEditingTenant(tenant); setShowForm(true) }} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDeleteTenant(tenant)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table view */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credenciales POS</th>
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
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Usuario:</span>
                        <span className="font-mono bg-gray-100 px-1 rounded">{tenant.pos_username || '-'}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(tenant.pos_username || ''); showToast('Usuario copiado') }}
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
                          onClick={() => { navigator.clipboard.writeText(tenant.pos_password || ''); showToast('Contraseña copiada') }}
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
                      <button onClick={() => handleOpenModules(tenant)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="Gestionar módulos"><Package className="w-4 h-4" /></button>
                      <button onClick={() => setShowPaymentModal(tenant)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Registrar pago"><CreditCard className="w-4 h-4" /></button>
                      <button onClick={() => handleOpenPaymentsHistory(tenant)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Ver historial"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => { setEditingTenant(tenant); setShowForm(true) }} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Editar"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteTenant(tenant)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog state={confirmState} onClose={closeConfirm} />

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
            <div className="grid grid-cols-2 gap-4">
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
  const { showToast } = useToast()
  const { state: confirmState, confirm, close: closeConfirm } = useConfirm()

  useEffect(() => {
    loadFaqs()
  }, [])

  const loadFaqs = async () => {
    try {
      const data = await apiCall('/faq/', {}, token)
      setFaqs(data)
    } catch (err) {
      showToast('Error al cargar FAQs', 'error')
    } finally {
      setLoading(false)
    }
  }

  const seedDefaultFaqs = async () => {
    try {
      await apiCall('/faq/seed', { method: 'POST' }, token)
      showToast('FAQs cargadas correctamente')
      await loadFaqs()
    } catch (err) {
      showToast('Error al cargar FAQs por defecto', 'error')
    }
  }

  const handleSave = async () => {
    try {
      if (editingFaq) {
        await apiCall(`/faq/${editingFaq.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        }, token)
        showToast('FAQ actualizada correctamente')
      } else {
        await apiCall('/faq/', {
          method: 'POST',
          body: JSON.stringify(formData)
        }, token)
        showToast('FAQ creada correctamente')
      }
      setShowForm(false)
      setEditingFaq(null)
      setFormData({ question: '', keywords: '', answer: '', category: '', is_active: true, priority: 0 })
      await loadFaqs()
    } catch (err) {
      showToast('Error al guardar FAQ', 'error')
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

  const handleDelete = (id: number) => {
    confirm({
      title: 'Eliminar Pregunta',
      description: '¿Estás seguro de eliminar esta pregunta frecuente?',
      variant: 'danger',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await apiCall(`/faq/${id}`, { method: 'DELETE' }, token)
          showToast('FAQ eliminada')
          await loadFaqs()
        } catch (err) {
          showToast('Error al eliminar FAQ', 'error')
        }
      }
    })
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
      <ConfirmDialog state={confirmState} onClose={closeConfirm} />
    </div>
  )
}

interface AdminNotification {
  id: number
  tenant_id: number | null
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

function NotificationsPage({ token }: { token: string }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [selectedTenant, setSelectedTenant] = useState<string>('all')
  const { showToast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [notifsData, tenantsData] = await Promise.all([
        apiCall('/api/admin/notifications', {}, token),
        apiCall('/api/admin/tenants', {}, token)
      ])
      setNotifications(notifsData)
      setTenants(tenantsData)
    } catch {
      showToast('Error al cargar datos', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      showToast('Completa titulo y mensaje', 'error')
      return
    }
    setSending(true)
    try {
      if (selectedTenant === 'all') {
        await apiCall('/api/admin/notifications/broadcast', {
          method: 'POST',
          body: JSON.stringify({ title, message })
        }, token)
        showToast('Notificacion enviada a todos los clientes')
      } else {
        await apiCall(`/api/admin/tenants/${selectedTenant}/notifications`, {
          method: 'POST',
          body: JSON.stringify({ title, message })
        }, token)
        const tenant = tenants.find(t => t.id === Number(selectedTenant))
        showToast(`Notificacion enviada a ${tenant?.name || 'cliente'}`)
      }
      setTitle('')
      setMessage('')
      setSelectedTenant('all')
      await loadData()
    } catch {
      showToast('Error al enviar notificacion', 'error')
    } finally {
      setSending(false)
    }
  }

  const typeLabel = (type: string) => {
    switch (type) {
      case 'payment_reminder': return 'Recordatorio de pago'
      case 'custom': return 'Personalizada'
      case 'system': return 'Sistema'
      default: return type
    }
  }

  const typeColor = (type: string) => {
    switch (type) {
      case 'payment_reminder': return 'bg-amber-100 text-amber-700'
      case 'custom': return 'bg-blue-100 text-blue-700'
      case 'system': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>

      {/* Send notification form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Send className="w-5 h-5 text-emerald-600" />
          Enviar Notificacion
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destinatario</label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Todos los clientes</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titulo</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Mantenimiento programado"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe el mensaje de la notificacion..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim()}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {selectedTenant === 'all' ? 'Enviar a todos' : 'Enviar'}
          </button>
        </div>
      </div>

      {/* Notification history */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-gray-600" />
            Historial de Notificaciones
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400">No hay notificaciones enviadas</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm">{n.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor(n.type)}`}>
                        {typeLabel(n.type)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">
                        {new Date(n.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {n.tenant_id && (
                        <span className="text-xs text-gray-400">
                          → {tenants.find(t => t.id === n.tenant_id)?.name || `Tenant #${n.tenant_id}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n.is_read ? 'bg-gray-300' : 'bg-emerald-500'}`} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function MainApp() {
  const { logout, token } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tenants', label: 'Clientes POS', icon: Building2 },
    { id: 'modules', label: 'Módulos', icon: Package },
    { id: 'faqs', label: 'Chatbot FAQs', icon: MessageCircle },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
  ]

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky lg:top-0 z-40 h-full lg:h-screen
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-64 lg:translate-x-0'}
        bg-white shadow-lg transition-all duration-300 flex flex-col overflow-hidden
      `}>
        <div className="p-4 border-b flex items-center justify-between min-w-[256px]">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="MySale Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            <span className="font-bold text-gray-900">MySale Factory</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 min-w-[256px]">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setCurrentPage(item.id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentPage === item.id
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t min-w-[256px]">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">Administrador</p>
            </div>
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

      {/* Main content */}
      <main className="flex-1 p-4 lg:p-8 overflow-auto min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 mb-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-200 rounded-lg bg-white shadow-sm"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-gray-900">MySale Factory</span>
        </div>

        {currentPage === 'dashboard' && <DashboardPage token={token!} />}
        {currentPage === 'tenants' && <TenantsPage token={token!} />}
        {currentPage === 'modules' && <ModulesPage token={token!} />}
        {currentPage === 'faqs' && <FAQsPage token={token!} />}
        {currentPage === 'notifications' && <NotificationsPage token={token!} />}
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
      <ToastProvider>
        {user ? <MainApp /> : <LoginPage />}
      </ToastProvider>
    </AuthContext.Provider>
  )
}

export default App

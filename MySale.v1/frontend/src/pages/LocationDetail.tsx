import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getLocationDetail, type LocationDetailData } from '../api';
import {
  ChevronLeft,
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  CreditCard,
  Banknote,
  Smartphone,
  Package,
  RefreshCw,
  Loader2,
  MapPin,
  BarChart3,
} from 'lucide-react';

const paymentMethodLabels: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  cash: { label: 'Efectivo', color: '#16a34a', bg: '#f0fdf4', icon: Banknote },
  card: { label: 'Tarjeta', color: '#2563eb', bg: '#eff6ff', icon: CreditCard },
  transfer: { label: 'Transfer', color: '#7c3aed', bg: '#f5f3ff', icon: Smartphone },
  nequi: { label: 'Nequi', color: '#e11d48', bg: '#fff1f2', icon: Smartphone },
  breb: { label: 'BREB', color: '#ea580c', bg: '#fff7ed', icon: Smartphone },
};

const saleTypeLabels: Record<string, string> = {
  regular: 'Venta',
  delivery: 'Domicilio',
  table: 'Mesa',
};

const LocationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<LocationDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const detail = await getLocationDetail(Number(id));
      setData(detail);
    } catch (error) {
      console.error('Error loading location detail:', error);
      toast.error('Error al cargar detalle de la sucursal');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500">Sucursal no encontrada</p>
        <button onClick={() => navigate('/locations-dashboard')} className="mt-4 text-emerald-600 hover:underline">
          Volver a Sucursales
        </button>
      </div>
    );
  }

  const maxHourlySales = Math.max(...(data.hourly_sales.map(h => h.total)), 1);

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/locations-dashboard')}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-800">{data.name}</h1>
            <p className="text-sm text-gray-500">{data.code} {data.address ? `• ${data.address}` : ''}</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
          title="Actualizar"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
              <DollarSign size={16} style={{ color: '#16a34a' }} />
            </div>
            <span className="text-xs text-gray-500 font-medium">Ventas Hoy</span>
          </div>
          <p className="text-lg lg:text-xl font-bold text-gray-800">{formatCurrency(data.today_sales)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eff6ff' }}>
              <ShoppingCart size={16} style={{ color: '#2563eb' }} />
            </div>
            <span className="text-xs text-gray-500 font-medium">Transacciones</span>
          </div>
          <p className="text-lg lg:text-xl font-bold text-gray-800">{data.today_transactions}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fdf4ff' }}>
              <TrendingUp size={16} style={{ color: '#a855f7' }} />
            </div>
            <span className="text-xs text-gray-500 font-medium">Ticket Promedio</span>
          </div>
          <p className="text-lg lg:text-xl font-bold text-gray-800">{formatCurrency(data.average_ticket)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ecfdf5' }}>
              <Users size={16} style={{ color: '#059669' }} />
            </div>
            <span className="text-xs text-gray-500 font-medium">Empleados Activos</span>
          </div>
          <p className="text-lg lg:text-xl font-bold text-gray-800">{data.active_workers.length}</p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: Ventas por hora + Metodo de pago */}
        <div className="lg:col-span-2 space-y-4">
          {/* Hourly Sales Chart */}
          <div className="bg-white rounded-xl p-4 border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-emerald-600" />
              <h3 className="font-semibold text-gray-800">Ventas por Hora</h3>
            </div>
            {data.hourly_sales.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin ventas hoy</p>
            ) : (
              <div className="space-y-2">
                {data.hourly_sales.map((h) => (
                  <div key={h.hour} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-12 text-right font-mono">{h.hour}</span>
                    <div className="flex-1 h-6 bg-gray-50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max((h.total / maxHourlySales) * 100, 2)}%`,
                          backgroundColor: '#10b981',
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-24 text-right">{formatCurrency(h.total)}</span>
                    <span className="text-[10px] text-gray-400 w-8">{h.count}tx</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Breakdown */}
          <div className="bg-white rounded-xl p-4 border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={18} className="text-blue-600" />
              <h3 className="font-semibold text-gray-800">Metodos de Pago</h3>
            </div>
            {data.payment_breakdown.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin ventas hoy</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.payment_breakdown.map((pm) => {
                  const info = paymentMethodLabels[pm.method] || { label: pm.method, color: '#6b7280', bg: '#f9fafb', icon: DollarSign };
                  const Icon = info.icon;
                  return (
                    <div key={pm.method} className="rounded-xl p-3" style={{ backgroundColor: info.bg }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={16} style={{ color: info.color }} />
                        <span className="text-xs font-medium" style={{ color: info.color }}>{info.label}</span>
                      </div>
                      <p className="text-lg font-bold" style={{ color: info.color }}>{formatCurrency(pm.total)}</p>
                      <p className="text-[11px] text-gray-500">{pm.count} transacciones</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Sales Table */}
          <div className="bg-white rounded-xl p-4 border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart size={18} className="text-gray-600" />
              <h3 className="font-semibold text-gray-800">Ventas de Hoy</h3>
              <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{data.recent_sales.length}</span>
            </div>
            {data.recent_sales.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin ventas hoy</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="pb-2 font-medium">Folio</th>
                      <th className="pb-2 font-medium">Hora</th>
                      <th className="pb-2 font-medium">Cajero</th>
                      <th className="pb-2 font-medium">Tipo</th>
                      <th className="pb-2 font-medium">Pago</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_sales.slice(0, 20).map((sale) => (
                      <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 font-mono text-xs font-medium">{sale.folio}</td>
                        <td className="py-2 text-gray-500">{formatTime(sale.created_at)}</td>
                        <td className="py-2">{sale.cashier_name}</td>
                        <td className="py-2">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            {saleTypeLabels[sale.sale_type || ''] || sale.sale_type || '-'}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{
                            backgroundColor: paymentMethodLabels[sale.payment_method || '']?.bg || '#f9fafb',
                            color: paymentMethodLabels[sale.payment_method || '']?.color || '#6b7280',
                          }}>
                            {paymentMethodLabels[sale.payment_method || '']?.label || sale.payment_method || '-'}
                          </span>
                        </td>
                        <td className="py-2 text-right font-semibold">{formatCurrency(sale.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.recent_sales.length > 20 && (
                  <p className="text-xs text-gray-400 text-center mt-2">Mostrando las 20 mas recientes de {data.recent_sales.length}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Workers + Top Products + Stock Alerts */}
        <div className="space-y-4">
          {/* Active Workers */}
          <div className="bg-white rounded-xl p-4 border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Users size={18} className="text-emerald-600" />
              <h3 className="font-semibold text-gray-800">Empleados Activos</h3>
              <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                {data.active_workers.length}
              </span>
            </div>
            {data.active_workers.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2">Sin empleados activos</p>
            ) : (
              <div className="space-y-2.5">
                {data.active_workers.map((worker) => (
                  <div key={worker.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm text-gray-800">{worker.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">{worker.role}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> Desde {formatTime(worker.shift_start)}
                      </span>
                      <span>{worker.transaction_count} ventas</span>
                    </div>
                    <p className="text-sm font-bold text-emerald-600 mt-1">{formatCurrency(worker.total_sales)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl p-4 border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Package size={18} className="text-orange-600" />
              <h3 className="font-semibold text-gray-800">Productos Top</h3>
            </div>
            {data.top_products.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2">Sin datos hoy</p>
            ) : (
              <div className="space-y-2">
                {data.top_products.map((product, i) => (
                  <div key={product.name} className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold bg-orange-100 text-orange-600">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                      <p className="text-[11px] text-gray-400">{product.quantity} unid.</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-700">{formatCurrency(product.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stock Alerts */}
          {data.stock_alerts.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-orange-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={18} className="text-orange-500" />
                <h3 className="font-semibold text-orange-700">Alertas de Stock</h3>
                <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  {data.stock_alerts.length}
                </span>
              </div>
              <div className="space-y-2">
                {data.stock_alerts.map((alert) => (
                  <div key={alert.product_id} className="flex items-center justify-between bg-orange-50 rounded-lg p-2.5">
                    <span className="text-sm text-gray-700 truncate flex-1">{alert.product_name}</span>
                    <span className="text-sm font-bold text-orange-600 ml-2">
                      {alert.current_stock} / {alert.min_stock}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationDetail;

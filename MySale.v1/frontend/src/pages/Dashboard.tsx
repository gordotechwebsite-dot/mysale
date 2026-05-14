import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShift } from '../context/ShiftContext';
import { getDashboard, getLocations, openShift, closeShift, getStockAlerts } from '../api';
import type { DashboardData, Location } from '../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Clock,
  Package,
  Play,
  Square,
  Loader2
} from 'lucide-react';

const denominations = [
  { value: 100000, label: '$100,000' },
  { value: 50000, label: '$50,000' },
  { value: 20000, label: '$20,000' },
  { value: 10000, label: '$10,000' },
  { value: 5000, label: '$5,000' },
  { value: 2000, label: '$2,000' },
  { value: 1000, label: '$1,000' },
  { value: 500, label: '$500' },
  { value: 200, label: '$200' },
  { value: 100, label: '$100' },
  { value: 50, label: '$50' },
];

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { currentShift, setCurrentShift, refreshShift } = useShift();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashCount, setCashCount] = useState<Record<number, number>>({});

  const isAdmin = user?.role?.role_type === 'superuser' || user?.role?.role_type === 'admin';
  const isSuperuser = user?.role?.role_type === 'superuser';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardData, locationsData, alerts] = await Promise.all([
        getDashboard(),
        getLocations(),
        getStockAlerts().catch(() => [])
      ]);
      setData(dashboardData);
      setLocations(locationsData.filter(l => l.location_type === 'pos'));
      setStockAlerts(alerts);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenShift = async () => {
    if (!selectedLocation) return;
    setIsProcessing(true);
    try {
      const shift = await openShift({
        location_id: parseInt(selectedLocation),
        biometric_verified: false
      });
      setCurrentShift(shift);
      setShowOpenShift(false);
      navigate('/pos');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al abrir turno');
    } finally {
      setIsProcessing(false);
    }
  };

    const calculateTotalCash = () => {
      return Object.entries(cashCount).reduce((total, [denom, count]) => {
        return total + (parseInt(denom) * (count || 0));
      }, 0);
    };

    const handleCloseShift = async () => {
      setIsProcessing(true);
      try {
        const totalCash = calculateTotalCash();
        await closeShift({ final_cash: totalCash });
        setCurrentShift(null);
        setShowCloseShift(false);
        setCashCount({});
        await refreshShift();
        loadData();
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Error al cerrar turno');
      } finally {
        setIsProcessing(false);
      }
    };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00a86b' }} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header - Premium Style */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#111827' }}>
            Hola, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>Resumen de hoy</p>
        </div>
        <div className="flex gap-3">
          {currentShift ? (
            <>
              <button
                onClick={() => navigate('/pos')}
                className="flex items-center gap-2 text-white font-semibold transition-all duration-200"
                style={{ 
                  backgroundColor: '#00a86b', 
                  borderRadius: '12px',
                  height: '52px',
                  padding: '0 28px',
                  fontSize: '15px'
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#00965f'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#00a86b'; }}
              >
                <ShoppingCart size={20} />
                Ir a Vender
              </button>
              <button
                onClick={() => setShowCloseShift(true)}
                className="flex items-center gap-2 font-semibold transition-all duration-200"
                style={{ 
                  backgroundColor: 'transparent',
                  border: '1px solid #ef4444',
                  borderRadius: '12px',
                  color: '#ef4444',
                  height: '52px',
                  padding: '0 28px',
                  fontSize: '15px'
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(239, 68, 68, 0.08)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                <Square size={20} />
                Cerrar Turno
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowOpenShift(true)}
              className="flex items-center gap-2 text-white font-semibold transition-all duration-200"
              style={{ 
                backgroundColor: '#00a86b', 
                borderRadius: '12px',
                height: '52px',
                padding: '0 32px',
                fontSize: '15px'
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#00965f'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#00a86b'; }}
            >
              <Play size={20} />
              Abrir Turno
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Card */}
      {currentShift && (
        <div 
          className="p-6 text-white"
          style={{ 
            backgroundColor: '#00a86b',
            borderRadius: '18px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.08)'
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock size={32} />
              <div>
                <p className="text-sm opacity-80">Turno Activo</p>
                <p className="font-semibold text-lg">{currentShift.location_name}</p>
              </div>
            </div>
            <div className="flex gap-8">
              <div>
                <p className="text-sm opacity-80">Ventas del Turno</p>
                <p className="font-bold text-2xl">{formatCurrency(currentShift.total_sales)}</p>
              </div>
              <div>
                <p className="text-sm opacity-80">Efectivo</p>
                <p className="font-bold text-2xl">{formatCurrency(currentShift.total_cash_sales)}</p>
              </div>
              <div>
                <p className="text-sm opacity-80">Tarjeta</p>
                <p className="font-bold text-2xl">{formatCurrency(currentShift.total_card_sales)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards - Premium Style */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Ventas Hoy */}
          <div 
            className="bg-white"
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              padding: '28px'
            }}
          >
            <p className="text-sm font-medium" style={{ color: '#6b7280' }}>Ventas Hoy</p>
            <p className="text-3xl font-bold mt-2" style={{ color: '#111827' }}>
              {formatCurrency(data?.today_sales || 0)}
            </p>
          </div>

          {/* Transacciones */}
          <div 
            className="bg-white"
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              padding: '28px'
            }}
          >
            <p className="text-sm font-medium" style={{ color: '#6b7280' }}>Transacciones</p>
            <p className="text-3xl font-bold mt-2" style={{ color: '#111827' }}>
              {data?.today_transactions || 0}
            </p>
          </div>

          {/* Ventas del Mes */}
          <div 
            className="bg-white"
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              padding: '28px'
            }}
          >
            <p className="text-sm font-medium" style={{ color: '#6b7280' }}>Ventas del Mes</p>
            <p className="text-3xl font-bold mt-2" style={{ color: '#111827' }}>
              {formatCurrency(data?.month_sales || 0)}
            </p>
          </div>

          {/* Alertas Stock */}
          <div 
            className="bg-white"
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              padding: '28px'
            }}
          >
            <p className="text-sm font-medium" style={{ color: '#6b7280' }}>Alertas Stock</p>
            <p className="text-3xl font-bold mt-2" style={{ color: data?.low_stock_alerts ? '#f59e0b' : '#111827' }}>
              {data?.low_stock_alerts || 0}
            </p>
          </div>
        </div>
      )}

      {/* Stock Alerts */}
      {stockAlerts.length > 0 && (
        <div 
          className="bg-white p-6"
          style={{ 
            borderRadius: '18px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.08)'
          }}
        >
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-4" style={{ color: '#f59e0b' }}>
            <AlertTriangle size={20} />
            Alertas de Stock Bajo
          </h3>
          <div className="space-y-3">
            {stockAlerts.slice(0, 5).map((alert, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-4"
                style={{ 
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  borderRadius: '12px'
                }}
              >
                <div className="flex items-center gap-3">
                  <Package size={20} style={{ color: '#f59e0b' }} />
                  <div>
                    <p className="font-medium" style={{ color: '#111827' }}>{alert.product_name}</p>
                    <p className="text-sm" style={{ color: '#6b7280' }}>{alert.location_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: '#f59e0b' }}>{alert.current_stock} unidades</p>
                  <p className="text-xs" style={{ color: '#6b7280' }}>Min: {alert.min_stock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showOpenShift} onOpenChange={setShowOpenShift}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Turno</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700">Seleccione Ubicacion</label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Seleccione una ubicacion" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id.toString()}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenShift(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleOpenShift}
              disabled={!selectedLocation || isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Abrir Turno'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

            <Dialog open={showCloseShift} onOpenChange={(open) => { setShowCloseShift(open); if (!open) setCashCount({}); }}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 lg:p-6">
                <DialogHeader>
                  <DialogTitle className="text-base lg:text-xl">Cerrar Caja - Corte por Denominacion</DialogTitle>
                </DialogHeader>
                <div className="py-2 lg:py-4 space-y-3 lg:space-y-4">
                  <p className="text-sm lg:text-base text-gray-600">
                    Turno en <strong>{currentShift?.location_name}</strong>
                  </p>
            
                  {currentShift && isSuperuser && (
                    <div className="p-3 lg:p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="grid grid-cols-2 gap-3 lg:gap-4">
                        <div>
                          <p className="text-xs lg:text-sm text-gray-500">Ventas Totales</p>
                          <p className="font-bold text-base lg:text-lg">{formatCurrency(currentShift.total_sales)}</p>
                        </div>
                        <div>
                          <p className="text-xs lg:text-sm text-gray-500">Efectivo en Ventas</p>
                          <p className="font-bold text-base lg:text-lg text-emerald-600">{formatCurrency(currentShift.total_cash_sales)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border rounded-lg p-3 lg:p-4">
                    <h4 className="font-semibold text-sm lg:text-base mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" />
                      Declare el efectivo por denominacion
                    </h4>
                    <div className="space-y-2 lg:hidden">
                      {denominations.map((denom) => (
                        <div key={denom.value} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50">
                          <span className="text-sm font-semibold min-w-[72px]">{denom.label}</span>
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="text-gray-400 text-sm">x</span>
                            <input
                              type="number"
                              min="0"
                              inputMode="numeric"
                              className="w-14 px-2 py-1.5 border rounded-lg text-center text-sm font-medium bg-white"
                              style={{ fontSize: '16px' }}
                              value={cashCount[denom.value] || ''}
                              onChange={(e) => setCashCount({
                                ...cashCount,
                                [denom.value]: parseInt(e.target.value) || 0
                              })}
                              placeholder="0"
                            />
                            <span className="text-xs font-medium text-gray-500 min-w-[64px] text-right">
                              {formatCurrency((cashCount[denom.value] || 0) * denom.value)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden lg:grid grid-cols-2 gap-3">
                      {denominations.map((denom) => (
                        <div key={denom.value} className="flex items-center gap-2">
                          <span className="w-24 text-sm font-medium">{denom.label}</span>
                          <span className="text-gray-400">x</span>
                          <input
                            type="number"
                            min="0"
                            className="w-20 px-2 py-1 border rounded text-center"
                            value={cashCount[denom.value] || ''}
                            onChange={(e) => setCashCount({
                              ...cashCount,
                              [denom.value]: parseInt(e.target.value) || 0
                            })}
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-500 w-24 text-right">
                            = {formatCurrency((cashCount[denom.value] || 0) * denom.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 lg:p-4 bg-slate-900 text-white rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm lg:text-lg">Total Declarado:</span>
                      <span className="text-xl lg:text-2xl font-bold">{formatCurrency(calculateTotalCash())}</span>
                    </div>
                    {currentShift && isSuperuser && (
                      <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between text-xs lg:text-sm">
                        <span className="text-slate-400">Diferencia con efectivo esperado:</span>
                        <span className={`font-semibold ${calculateTotalCash() - (currentShift.initial_cash + currentShift.total_cash_sales) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(calculateTotalCash() - (currentShift.initial_cash + currentShift.total_cash_sales))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => { setShowCloseShift(false); setCashCount({}); }} className="text-sm">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCloseShift}
                    disabled={isProcessing || calculateTotalCash() === 0}
                    className="bg-red-600 hover:bg-red-700 text-sm"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cerrar Caja'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
    </div>
  );
};

export default Dashboard;

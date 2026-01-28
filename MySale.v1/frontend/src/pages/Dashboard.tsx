import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShift } from '../context/ShiftContext';
import { getDashboard, getLocations, openShift, closeShift, getStockAlerts } from '../api';
import type { DashboardData, Location } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
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
      alert(error.response?.data?.detail || 'Error al abrir turno');
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
        alert(error.response?.data?.detail || 'Error al cerrar turno');
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
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Hola, {user?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-500">Resumen del dia</p>
        </div>
        <div className="flex gap-3">
          {currentShift ? (
            <>
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => navigate('/pos')}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Ir a Vender
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-50"
                onClick={() => setShowCloseShift(true)}
              >
                <Square className="w-5 h-5 mr-2" />
                Cerrar Turno
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setShowOpenShift(true)}
            >
              <Play className="w-5 h-5 mr-2" />
              Abrir Turno
            </Button>
          )}
        </div>
      </div>

      {currentShift && (
        <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8" />
                <div>
                  <p className="text-sm opacity-80">Turno Activo</p>
                  <p className="font-bold text-lg">{currentShift.location_name}</p>
                </div>
              </div>
              <div className="flex gap-8">
                <div>
                  <p className="text-sm opacity-80">Ventas del Turno</p>
                  <p className="font-bold text-xl">{formatCurrency(currentShift.total_sales)}</p>
                </div>
                <div>
                  <p className="text-sm opacity-80">Efectivo</p>
                  <p className="font-bold text-xl">{formatCurrency(currentShift.total_cash_sales)}</p>
                </div>
                <div>
                  <p className="text-sm opacity-80">Tarjeta</p>
                  <p className="font-bold text-xl">{formatCurrency(currentShift.total_card_sales)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ventas Hoy</p>
                <p className="text-2xl font-bold">{formatCurrency(data?.today_sales || 0)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Transacciones</p>
                <p className="text-2xl font-bold">{data?.today_transactions || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ventas del Mes</p>
                <p className="text-2xl font-bold">{formatCurrency(data?.month_sales || 0)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Alertas Stock</p>
                <p className="text-2xl font-bold text-orange-600">{data?.low_stock_alerts || 0}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {stockAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Alertas de Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stockAlerts.slice(0, 5).map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium">{alert.product_name}</p>
                      <p className="text-sm text-gray-500">{alert.location_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">{alert.current_stock} unidades</p>
                    <p className="text-xs text-gray-500">Min: {alert.min_stock}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cerrar Caja - Corte por Denominacion</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <p className="text-gray-600">
                    Turno en <strong>{currentShift?.location_name}</strong>
                  </p>
            
                  {currentShift && (
                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Ventas Totales</p>
                          <p className="font-bold text-lg">{formatCurrency(currentShift.total_sales)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Efectivo en Ventas</p>
                          <p className="font-bold text-lg text-emerald-600">{formatCurrency(currentShift.total_cash_sales)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                      Declare el efectivo por denominacion
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
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

                  <div className="p-4 bg-slate-900 text-white rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg">Total Declarado:</span>
                      <span className="text-2xl font-bold">{formatCurrency(calculateTotalCash())}</span>
                    </div>
                    {currentShift && (
                      <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between text-sm">
                        <span className="text-slate-400">Diferencia con efectivo esperado:</span>
                        <span className={`font-semibold ${calculateTotalCash() - (currentShift.initial_cash + currentShift.total_cash_sales) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(calculateTotalCash() - (currentShift.initial_cash + currentShift.total_cash_sales))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setShowCloseShift(false); setCashCount({}); }}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCloseShift}
                    disabled={isProcessing || calculateTotalCash() === 0}
                    className="bg-red-600 hover:bg-red-700"
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

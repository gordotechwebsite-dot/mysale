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

  const handleCloseShift = async () => {
    setIsProcessing(true);
    try {
      await closeShift({});
      setCurrentShift(null);
      setShowCloseShift(false);
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowOpenShift(true)}
            >
              <Play className="w-5 h-5 mr-2" />
              Abrir Turno
            </Button>
          )}
        </div>
      </div>

      {currentShift && (
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Abrir Turno'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseShift} onOpenChange={setShowCloseShift}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Turno</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Esta seguro que desea cerrar el turno en <strong>{currentShift?.location_name}</strong>?
            </p>
            {currentShift && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Resumen del turno:</p>
                <p className="font-bold text-lg">{formatCurrency(currentShift.total_sales)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseShift(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCloseShift}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cerrar Turno'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;

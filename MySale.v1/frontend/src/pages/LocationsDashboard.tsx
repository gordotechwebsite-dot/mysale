import React, { useEffect, useState } from 'react';
import { getLocationsDashboard, updateLocation, type LocationDashboard } from '../api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MapPin,
  Users,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Clock,
  RefreshCw,
  Image,
  Loader2
} from 'lucide-react';

const LocationsDashboard: React.FC = () => {
  const [locations, setLocations] = useState<LocationDashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<LocationDashboard | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const data = await getLocationsDashboard();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveImage = async () => {
    if (!selectedLocation) return;
    setIsSaving(true);
    try {
      await updateLocation(selectedLocation.id, { image_url: imageUrl });
      await loadData();
      setShowImageDialog(false);
      setImageUrl('');
      setSelectedLocation(null);
    } catch (error) {
      console.error('Error saving image:', error);
      alert('Error al guardar la imagen');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Panel de Puntos de Venta</h1>
          <p className="text-gray-500">Vista en tiempo real de cada ubicacion</p>
        </div>
        <Button onClick={loadData} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </Button>
      </div>

      {locations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No hay puntos de venta configurados</p>
            <p className="text-sm text-gray-400">Ve a Ubicaciones para crear puntos de venta</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {locations.map((location) => (
            <Card key={location.id} className="overflow-hidden">
              <div className="relative h-40 bg-gradient-to-br from-emerald-500 to-teal-600">
                {location.image_url ? (
                  <img
                    src={location.image_url}
                    alt={location.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-16 h-16 text-white/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 className="text-xl font-bold">{location.name}</h3>
                  <p className="text-sm opacity-80">{location.code}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 text-white hover:bg-white/20"
                  onClick={() => {
                    setSelectedLocation(location);
                    setImageUrl(location.image_url || '');
                    setShowImageDialog(true);
                  }}
                >
                  <Image className="w-4 h-4" />
                </Button>
              </div>

              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs font-medium">Ventas Hoy</span>
                    </div>
                    <p className="text-lg font-bold text-green-700">{formatCurrency(location.today_sales)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <ShoppingCart className="w-4 h-4" />
                      <span className="text-xs font-medium">Transacciones</span>
                    </div>
                    <p className="text-lg font-bold text-blue-700">{location.today_transactions}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium">Trabajadores Activos</span>
                    <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      {location.active_workers.length}
                    </span>
                  </div>
                  {location.active_workers.length > 0 ? (
                    <div className="space-y-2">
                      {location.active_workers.map((worker) => (
                        <div key={worker.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                          <div>
                            <p className="text-sm font-medium">{worker.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Desde {formatTime(worker.shift_start)}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-emerald-600">
                            {formatCurrency(worker.total_sales)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sin trabajadores activos</p>
                  )}
                </div>

                {location.stock_alerts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium text-orange-600">Alertas de Stock</span>
                      <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        {location.stock_alerts.length}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {location.stock_alerts.slice(0, 3).map((alert) => (
                        <div key={alert.product_id} className="flex items-center justify-between text-sm bg-orange-50 rounded p-2">
                          <span className="truncate">{alert.product_name}</span>
                          <span className="text-orange-600 font-medium ml-2">
                            {alert.current_stock}/{alert.min_stock}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {location.recent_sales.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">Ventas Recientes</span>
                    </div>
                    <div className="space-y-1">
                      {location.recent_sales.slice(0, 3).map((sale) => (
                        <div key={sale.id} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                          <div>
                            <span className="font-medium">{sale.folio}</span>
                            <span className="text-gray-400 ml-2">{formatTime(sale.created_at)}</span>
                          </div>
                          <span className="font-semibold">{formatCurrency(sale.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Imagen - {selectedLocation?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">URL de la imagen</label>
              <input
                type="url"
                className="w-full mt-1 px-3 py-2 border rounded-lg"
                placeholder="https://ejemplo.com/imagen.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Ingresa la URL de una imagen para personalizar este punto de venta
              </p>
            </div>
            {imageUrl && (
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).alt = 'Error al cargar imagen';
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImageDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveImage}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocationsDashboard;

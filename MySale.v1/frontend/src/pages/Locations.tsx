import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocationsDashboard, createLocation, updateLocation } from '../api';
import type { LocationDashboard } from '../api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Store, Warehouse, Users, DollarSign, ShoppingCart, Camera, Building2, BarChart3, ChevronRight } from 'lucide-react';
import api from '../api/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const resolveImageUrl = (url: string) => (url.startsWith('http') ? url : `${API_URL}${url}`);

const Locations: React.FC = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<LocationDashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadingImageFor, setUploadingImageFor] = useState<number | null>(null);
  const [uploadingLogoFor, setUploadingLogoFor] = useState<number | null>(null);

  const [newLocation, setNewLocation] = useState({
    name: '',
    code: '',
    location_type: 'pos' as 'pos' | 'warehouse',
    address: '',
    daily_base_cash: '100000',
    has_own_menu: false,
    folio_prefix: ''
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const data = await getLocationsDashboard();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (locationId: number, file: File) => {
    setUploadingImageFor(locationId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/api/inventory/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const imageUrl = response.data.url;
      await updateLocation(locationId, { image_url: imageUrl });
      await loadLocations();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen');
    } finally {
      setUploadingImageFor(null);
    }
  };

  const handleReceiptLogoUpload = async (locationId: number, file: File) => {
    setUploadingLogoFor(locationId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/api/inventory/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await updateLocation(locationId, { receipt_logo_url: response.data.url });
      await loadLocations();
      toast.success('Logo de factura actualizado');
    } catch (error) {
      console.error('Error uploading receipt logo:', error);
      toast.error('Error al subir el logo de la factura');
    } finally {
      setUploadingLogoFor(null);
    }
  };

  const handleRemoveReceiptLogo = async (locationId: number) => {
    setUploadingLogoFor(locationId);
    try {
      await updateLocation(locationId, { receipt_logo_url: '' });
      await loadLocations();
      toast.success('La sede vuelve a usar el logo del negocio');
    } catch (error) {
      console.error('Error removing receipt logo:', error);
      toast.error('Error al quitar el logo de la factura');
    } finally {
      setUploadingLogoFor(null);
    }
  };

  const handleAddLocation = async () => {
    setIsProcessing(true);
    try {
      await createLocation({
        name: newLocation.name,
        code: newLocation.code,
        location_type: newLocation.location_type,
        address: newLocation.address || undefined,
        daily_base_cash: parseFloat(newLocation.daily_base_cash),
        has_own_menu: newLocation.has_own_menu,
        folio_prefix: newLocation.folio_prefix || undefined
      });
      await loadLocations();
      setShowAddLocation(false);
      setNewLocation({
        name: '', code: '', location_type: 'pos', address: '', daily_base_cash: '100000',
        has_own_menu: false, folio_prefix: ''
      });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al crear ubicacion');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleOwnMenu = async (locationId: number, hasOwnMenu: boolean) => {
    try {
      await updateLocation(locationId, { has_own_menu: hasOwnMenu });
      await loadLocations();
      toast.success(hasOwnMenu ? 'La sede ahora usa carta propia' : 'La sede ahora ve la carta general');
    } catch {
      toast.error('Error al cambiar la carta de la sede');
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
        <Loader2 className="w-8 h-8 animate-spin text-[#00a86b]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Sucursales</h2>
        <Button onClick={() => setShowAddLocation(true)} className="bg-[#00a86b] hover:bg-[#008f5b]">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Sucursal
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No hay sucursales registradas</h3>
          <p className="text-gray-400 mb-4">Crea tu primera sucursal para comenzar</p>
          <Button onClick={() => setShowAddLocation(true)} className="bg-[#00a86b] hover:bg-[#008f5b]">
            <Plus className="w-4 h-4 mr-2" />
            Crear Sucursal
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {locations.map((location) => {
            const isOpen = location.active_workers.length > 0;
            
            return (
              <Card 
                key={location.id} 
                className="overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-md"
              >
                <div className="flex h-48">
                  {/* Imagen de la sucursal */}
                  <div className="w-1/3 relative bg-gradient-to-br from-gray-100 to-gray-200">
                    {location.image_url ? (
                      <img 
                        src={resolveImageUrl(location.image_url)} 
                        alt={location.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {location.location_type === 'pos' ? (
                          <Store className="w-16 h-16 text-gray-300" />
                        ) : (
                          <Warehouse className="w-16 h-16 text-gray-300" />
                        )}
                      </div>
                    )}
                    
                    {/* Boton para subir imagen */}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id={`file-input-${location.id}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(location.id, file);
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        document.getElementById(`file-input-${location.id}`)?.click();
                      }}
                      className="absolute bottom-2 right-2 bg-white/90 hover:bg-white p-2 rounded-full shadow-md transition-all"
                      title="Cambiar imagen"
                    >
                      {uploadingImageFor === location.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#00a86b]" />
                      ) : (
                        <Camera className="w-4 h-4 text-gray-600" />
                      )}
                    </button>

                    {/* Badge de estado */}
                    <div className="absolute top-2 left-2">
                      <Badge className={`${isOpen ? 'bg-green-500' : 'bg-gray-400'} text-white font-medium`}>
                        {isOpen ? 'Abierto' : 'Cerrado'}
                      </Badge>
                    </div>
                  </div>

                  {/* Informacion de la sucursal */}
                  <div className="w-2/3 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">{location.name}</h3>
                          <p className="text-sm text-gray-500 font-mono">{location.code}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-xs">
                            {location.location_type === 'pos' ? 'POS' : 'Almacen'}
                          </Badge>
                          {location.has_own_menu && (
                            <Badge className="bg-amber-500 text-white text-xs">Carta propia</Badge>
                          )}
                        </div>
                      </div>
                      {location.address && (
                        <p className="text-sm text-gray-500 truncate">{location.address}</p>
                      )}
                    </div>

                    {/* Estadisticas del dia */}
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div className="bg-green-50 rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                          <DollarSign className="w-3 h-3" />
                          <span className="text-xs font-medium">Ventas</span>
                        </div>
                        <p className="text-sm font-bold text-green-700">
                          {formatCurrency(location.today_sales)}
                        </p>
                      </div>
                      
                      <div className="bg-blue-50 rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                          <ShoppingCart className="w-3 h-3" />
                          <span className="text-xs font-medium">Transacc.</span>
                        </div>
                        <p className="text-sm font-bold text-blue-700">
                          {location.today_transactions}
                        </p>
                      </div>
                      
                      <div className="bg-purple-50 rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                          <Users className="w-3 h-3" />
                          <span className="text-xs font-medium">Empleados</span>
                        </div>
                        <p className="text-sm font-bold text-purple-700">
                          {location.active_workers.length}
                        </p>
                      </div>
                    </div>

                    {/* Lista de empleados activos */}
                    {location.active_workers.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          Activos: {location.active_workers.map(w => w.name).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Enlace Ver Rendimiento */}
                <div className="px-4 pb-3 pt-1 border-t border-gray-100 space-y-2">
                  {location.location_type === 'pos' && (
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={location.has_own_menu}
                        onChange={(e) => handleToggleOwnMenu(location.id, e.target.checked)}
                        className="accent-[#00a86b]"
                      />
                      Carta propia (solo muestra los productos de esta sede)
                    </label>
                  )}
                  {location.location_type === 'pos' && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="whitespace-nowrap">Logo de factura:</span>
                      {location.receipt_logo_url ? (
                        <img
                          src={resolveImageUrl(location.receipt_logo_url)}
                          alt={`Logo de factura de ${location.name}`}
                          className="h-8 w-auto max-w-[80px] object-contain bg-white rounded border border-gray-200"
                        />
                      ) : (
                        <span className="text-gray-400">usa el del negocio</span>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`receipt-logo-input-${location.id}`}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleReceiptLogoUpload(location.id, file);
                          }
                        }}
                      />
                      <button
                        onClick={() => document.getElementById(`receipt-logo-input-${location.id}`)?.click()}
                        disabled={uploadingLogoFor === location.id}
                        className="ml-auto text-[#00a86b] hover:text-[#008f5b] font-medium disabled:opacity-50"
                      >
                        {uploadingLogoFor === location.id ? 'Subiendo...' : 'Cambiar'}
                      </button>
                      {location.receipt_logo_url && (
                        <button
                          onClick={() => handleRemoveReceiptLogo(location.id)}
                          disabled={uploadingLogoFor === location.id}
                          className="text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => navigate(`/location/${location.id}`)}
                    className="w-full flex items-center justify-center gap-2 text-sm text-[#00a86b] hover:text-[#008f5b] font-medium py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Ver Rendimiento
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showAddLocation} onOpenChange={setShowAddLocation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Sucursal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Nombre de la sucursal *"
              value={newLocation.name}
              onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
            />
            <Input
              placeholder="Codigo (ej: SUC01) *"
              value={newLocation.code}
              onChange={(e) => setNewLocation({ ...newLocation, code: e.target.value.toUpperCase() })}
            />
            <Select
              value={newLocation.location_type}
              onValueChange={(v: 'pos' | 'warehouse') => setNewLocation({ ...newLocation, location_type: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de ubicacion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pos">Punto de Venta</SelectItem>
                <SelectItem value="warehouse">Almacen</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Direccion (opcional)"
              value={newLocation.address}
              onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Base diaria de caja"
              value={newLocation.daily_base_cash}
              onChange={(e) => setNewLocation({ ...newLocation, daily_base_cash: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={newLocation.has_own_menu}
                onChange={(e) => setNewLocation({ ...newLocation, has_own_menu: e.target.checked })}
                className="accent-[#00a86b]"
              />
              Carta propia (solo muestra los productos de esta sede)
            </label>
            <Input
              placeholder="Prefijo de folio (ej: SS, GA)"
              value={newLocation.folio_prefix}
              onChange={(e) => setNewLocation({ ...newLocation, folio_prefix: e.target.value.toUpperCase() })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLocation(false)}>Cancelar</Button>
            <Button
              onClick={handleAddLocation}
              disabled={isProcessing || !newLocation.name || !newLocation.code}
              className="bg-[#00a86b] hover:bg-[#008f5b]"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Sucursal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Locations;

import React, { useState, useEffect } from 'react';
import { getLocations, createLocation } from '../api';
import type { Location } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Loader2, Store, Warehouse } from 'lucide-react';

const Locations: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [newLocation, setNewLocation] = useState({
    name: '',
    code: '',
    location_type: 'pos' as 'pos' | 'warehouse',
    address: '',
    daily_base_cash: '100000',
    folio_prefix: ''
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const data = await getLocations();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setIsLoading(false);
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
        folio_prefix: newLocation.folio_prefix || undefined
      });
      await loadLocations();
      setShowAddLocation(false);
      setNewLocation({
        name: '', code: '', location_type: 'pos', address: '', daily_base_cash: '100000', folio_prefix: ''
      });
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al crear ubicacion');
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Ubicaciones</h2>
        <Button onClick={() => setShowAddLocation(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Ubicacion
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((location) => (
          <Card key={location.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    location.location_type === 'pos' ? 'bg-blue-100' : 'bg-orange-100'
                  }`}>
                    {location.location_type === 'pos' ? (
                      <Store className="w-6 h-6 text-blue-600" />
                    ) : (
                      <Warehouse className="w-6 h-6 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{location.name}</CardTitle>
                    <p className="text-sm text-gray-500 font-mono">{location.code}</p>
                  </div>
                </div>
                {location.is_active ? (
                  <Badge className="bg-green-500">Activo</Badge>
                ) : (
                  <Badge className="bg-red-500">Inactivo</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tipo:</span>
                  <span className="font-medium">
                    {location.location_type === 'pos' ? 'Punto de Venta' : 'Almacen'}
                  </span>
                </div>
                {location.address && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Direccion:</span>
                    <span className="font-medium">{location.address}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Base Diaria:</span>
                  <span className="font-medium">{formatCurrency(location.daily_base_cash)}</span>
                </div>
                {location.folio_prefix && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Prefijo Folio:</span>
                    <span className="font-mono">{location.folio_prefix}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Ultimo Folio:</span>
                  <span className="font-mono">{location.folio_counter}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showAddLocation} onOpenChange={setShowAddLocation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Ubicacion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Nombre *"
              value={newLocation.name}
              onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
            />
            <Input
              placeholder="Codigo *"
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
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Locations;

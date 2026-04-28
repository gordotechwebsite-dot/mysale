import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLosses, createLoss, getLocations, getProducts } from '../api';
import type { Loss, Location, Product } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, Loader2, Trash2 } from 'lucide-react';

const lossTypes = [
  { value: 'breakage', label: 'Rotura' },
  { value: 'expiration', label: 'Vencimiento' },
  { value: 'theft', label: 'Robo' },
  { value: 'damage', label: 'Daño' },
  { value: 'other', label: 'Otro' }
];

const Losses: React.FC = () => {
  useAuth();
  const [losses, setLosses] = useState<Loss[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddLoss, setShowAddLoss] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [newLoss, setNewLoss] = useState({
    location_id: '',
    loss_type: '',
    description: '',
    items: [] as { product_id: number; product_name: string; quantity: number; reason: string }[]
  });
  const [selectedProduct, setSelectedProduct] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemReason, setItemReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [lossesData, locationsData, productsData] = await Promise.all([
        getLosses(),
        getLocations(),
        getProducts()
      ]);
      setLosses(lossesData);
      setLocations(locationsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addItemToLoss = () => {
    if (!selectedProduct || !itemQuantity) return;
    const product = products.find(p => p.id === parseInt(selectedProduct));
    if (!product) return;

    setNewLoss({
      ...newLoss,
      items: [...newLoss.items, {
        product_id: product.id,
        product_name: product.name,
        quantity: parseInt(itemQuantity),
        reason: itemReason
      }]
    });
    setSelectedProduct('');
    setItemQuantity('');
    setItemReason('');
  };

  const removeItemFromLoss = (index: number) => {
    setNewLoss({
      ...newLoss,
      items: newLoss.items.filter((_, i) => i !== index)
    });
  };

  const handleAddLoss = async () => {
    setIsProcessing(true);
    try {
      await createLoss({
        location_id: parseInt(newLoss.location_id),
        loss_type: newLoss.loss_type,
        description: newLoss.description || undefined,
        items: newLoss.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          reason: item.reason || undefined
        }))
      });
      await loadData();
      setShowAddLoss(false);
      setNewLoss({ location_id: '', loss_type: '', description: '', items: [] });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al registrar merma');
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

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  };

  const getLossTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      breakage: 'bg-red-500',
      expiration: 'bg-orange-500',
      theft: 'bg-purple-500',
      damage: 'bg-yellow-500',
      other: 'bg-gray-500'
    };
    const labels: Record<string, string> = {
      breakage: 'Rotura',
      expiration: 'Vencimiento',
      theft: 'Robo',
      damage: 'Daño',
      other: 'Otro'
    };
    return <Badge className={colors[type] || 'bg-gray-500'}>{labels[type] || type}</Badge>;
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
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Mermas y Roturas
            </CardTitle>
            <Button onClick={() => setShowAddLoss(true)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Registrar Merma
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Ubicacion</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Reportado por</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {losses.map((loss) => (
                  <TableRow key={loss.id}>
                    <TableCell>{formatDateTime(loss.created_at)}</TableCell>
                    <TableCell>{loss.location_name}</TableCell>
                    <TableCell>{getLossTypeBadge(loss.loss_type)}</TableCell>
                    <TableCell>{loss.reported_by_name}</TableCell>
                    <TableCell className="max-w-xs truncate">{loss.description || '-'}</TableCell>
                    <TableCell className="font-semibold text-red-600">
                      {formatCurrency(loss.total_value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddLoss} onOpenChange={setShowAddLoss}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Merma</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Select value={newLoss.location_id} onValueChange={(v) => setNewLoss({ ...newLoss, location_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Ubicacion *" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(l => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newLoss.loss_type} onValueChange={(v) => setNewLoss({ ...newLoss, loss_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de merma *" />
                </SelectTrigger>
                <SelectContent>
                  {lossTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Descripcion general (opcional)"
              value={newLoss.description}
              onChange={(e) => setNewLoss({ ...newLoss, description: e.target.value })}
            />

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Agregar Productos</h4>
              <div className="flex gap-2 mb-4">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccione producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Cantidad"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                  className="w-24"
                />
                <Input
                  placeholder="Razon"
                  value={itemReason}
                  onChange={(e) => setItemReason(e.target.value)}
                  className="w-40"
                />
                <Button type="button" onClick={addItemToLoss} disabled={!selectedProduct || !itemQuantity}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {newLoss.items.length > 0 && (
                <div className="space-y-2">
                  {newLoss.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-gray-500 ml-2">x{item.quantity}</span>
                        {item.reason && <span className="text-gray-400 ml-2">- {item.reason}</span>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItemFromLoss(index)}
                        className="text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLoss(false)}>Cancelar</Button>
            <Button
              onClick={handleAddLoss}
              disabled={isProcessing || !newLoss.location_id || !newLoss.loss_type || newLoss.items.length === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Losses;

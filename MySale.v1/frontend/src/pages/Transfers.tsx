import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTransfers, createTransfer, receiveTransfer, getLocations, getProducts } from '../api';
import type { Transfer, Location, Product } from '../types';
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
import { Truck, Plus, Loader2, Trash2, Check } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

const Transfers: React.FC = () => {
  useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddTransfer, setShowAddTransfer] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [newTransfer, setNewTransfer] = useState({
    from_location_id: '',
    to_location_id: '',
    notes: '',
    items: [] as { product_id: number; product_name: string; quantity: number }[]
  });
  const [selectedProduct, setSelectedProduct] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [showReceiveConfirm, setShowReceiveConfirm] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [transfersData, locationsData, productsData] = await Promise.all([
        getTransfers(),
        getLocations(),
        getProducts()
      ]);
      setTransfers(transfersData);
      setLocations(locationsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar traspasos');
    } finally {
      setIsLoading(false);
    }
  };

  const addItemToTransfer = () => {
    if (!selectedProduct || !itemQuantity) return;
    const product = products.find(p => p.id === parseInt(selectedProduct));
    if (!product) return;

    setNewTransfer({
      ...newTransfer,
      items: [...newTransfer.items, {
        product_id: product.id,
        product_name: product.name,
        quantity: parseInt(itemQuantity)
      }]
    });
    setSelectedProduct('');
    setItemQuantity('');
  };

  const removeItemFromTransfer = (index: number) => {
    setNewTransfer({
      ...newTransfer,
      items: newTransfer.items.filter((_, i) => i !== index)
    });
  };

  const handleAddTransfer = async () => {
    setIsProcessing(true);
    try {
      await createTransfer({
        from_location_id: parseInt(newTransfer.from_location_id),
        to_location_id: parseInt(newTransfer.to_location_id),
        notes: newTransfer.notes || undefined,
        items: newTransfer.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      });
      await loadData();
      setShowAddTransfer(false);
      setNewTransfer({ from_location_id: '', to_location_id: '', notes: '', items: [] });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al crear transferencia');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceiveTransfer = (id: number) => {
    setShowReceiveConfirm(id);
  };

  const doReceiveTransfer = async () => {
    if (!showReceiveConfirm) return;
    try {
      await receiveTransfer(showReceiveConfirm);
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al recibir transferencia');
    }
    setShowReceiveConfirm(null);
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      in_transit: 'bg-blue-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500'
    };
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      in_transit: 'En Transito',
      completed: 'Completada',
      cancelled: 'Cancelada'
    };
    return <Badge className={colors[status] || 'bg-gray-500'}>{labels[status] || status}</Badge>;
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
              <Truck className="w-5 h-5" />
              Transferencias entre Ubicaciones
            </CardTitle>
            <Button onClick={() => setShowAddTransfer(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Transferencia
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado por</TableHead>
                  <TableHead>Valor (Precio Venta)</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell>{formatDateTime(transfer.created_at)}</TableCell>
                    <TableCell>{transfer.from_location_name}</TableCell>
                    <TableCell>{transfer.to_location_name}</TableCell>
                    <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                    <TableCell>{transfer.created_by_name}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(transfer.total_value_at_sale_price)}
                    </TableCell>
                    <TableCell>
                      {transfer.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleReceiveTransfer(transfer.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Recibir
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddTransfer} onOpenChange={setShowAddTransfer}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Transferencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Select value={newTransfer.from_location_id} onValueChange={(v) => setNewTransfer({ ...newTransfer, from_location_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Ubicacion origen *" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(l => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newTransfer.to_location_id} onValueChange={(v) => setNewTransfer({ ...newTransfer, to_location_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Ubicacion destino *" />
                </SelectTrigger>
                <SelectContent>
                  {locations.filter(l => l.id.toString() !== newTransfer.from_location_id).map(l => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Notas (opcional)"
              value={newTransfer.notes}
              onChange={(e) => setNewTransfer({ ...newTransfer, notes: e.target.value })}
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
                  className="w-32"
                />
                <Button type="button" onClick={addItemToTransfer} disabled={!selectedProduct || !itemQuantity}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {newTransfer.items.length > 0 && (
                <div className="space-y-2">
                  {newTransfer.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-gray-500 ml-2">x{item.quantity}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItemFromTransfer(index)}
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
            <Button variant="outline" onClick={() => setShowAddTransfer(false)}>Cancelar</Button>
            <Button
              onClick={handleAddTransfer}
              disabled={isProcessing || !newTransfer.from_location_id || !newTransfer.to_location_id || newTransfer.items.length === 0}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Transferencia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!showReceiveConfirm}
        onOpenChange={(open) => { if (!open) setShowReceiveConfirm(null); }}
        title="Recibir transferencia"
        description="¿Confirmar recepción de transferencia?"
        confirmLabel="Sí, recibir"
        cancelLabel="No, cancelar"
        variant="default"
        onConfirm={doReceiveTransfer}
      />
    </div>
  );
};

export default Transfers;

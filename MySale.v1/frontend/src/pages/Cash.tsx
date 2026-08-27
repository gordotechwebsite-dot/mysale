import React, { useState, useEffect } from 'react';
import { useShift } from '../context/ShiftContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Banknote, Plus, Calculator, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api/client';

interface CashCount {
  id: number;
  shift_id: number;
  count_type: 'opening' | 'closing' | 'partial';
  counted_amount: number;
  expected_amount: number;
  difference: number;
  notes: string | null;
  created_at: string;
  user_name: string;
}

const Cash: React.FC = () => {
    const { currentShift } = useShift();
    const { user } = useAuth();
    const isOwner = user?.role?.role_type === 'superuser';
    const [cashCounts, setCashCounts] = useState<CashCount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCountDialog, setShowCountDialog] = useState(false);
    const [countType, setCountType] = useState<'opening' | 'closing' | 'partial'>('partial');
    const [countedAmount, setCountedAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCashCounts();
  }, [currentShift]);

  const loadCashCounts = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/cash/counts');
      setCashCounts(response.data);
    } catch (error) {
      console.error('Error loading cash counts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitCount = async () => {
    if (!currentShift) {
      toast.error('Debes tener un turno abierto para hacer arqueo');
      return;
    }

    if (!countedAmount || parseFloat(countedAmount) < 0) {
      toast.error('Ingresa un monto valido');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/api/cash/counts', {
        shift_id: currentShift.id,
        count_type: countType,
        counted_amount: parseFloat(countedAmount.replace(/\./g, '')),
        notes: notes || null
      });
      toast.success('Arqueo registrado exitosamente');
      setShowCountDialog(false);
      setCountedAmount('');
      setNotes('');
      loadCashCounts();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al registrar arqueo');
    } finally {
      setIsSubmitting(false);
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

  const getCountTypeBadge = (type: string) => {
    switch (type) {
      case 'opening':
        return <Badge className="bg-green-500">Apertura</Badge>;
      case 'closing':
        return <Badge className="bg-red-500">Cierre</Badge>;
      case 'partial':
        return <Badge className="bg-blue-500">Parcial</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const getDifferenceBadge = (difference: number) => {
    if (difference === 0) {
      return <Badge className="bg-green-500">Cuadrado</Badge>;
    } else if (difference > 0) {
      return <Badge className="bg-blue-500">Sobrante: {formatCurrency(difference)}</Badge>;
    } else {
      return <Badge className="bg-red-500">Faltante: {formatCurrency(Math.abs(difference))}</Badge>;
    }
  };

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue) {
      const formatted = parseInt(numericValue).toLocaleString('es-CO');
      setCountedAmount(formatted);
    } else {
      setCountedAmount('');
    }
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
        <h1 className="text-2xl font-bold text-gray-800">Caja - Arqueos y Cortes</h1>
        {!isOwner && (
          <Button
            onClick={() => setShowCountDialog(true)}
            disabled={!currentShift}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Arqueo
          </Button>
        )}
      </div>

      {!currentShift && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-yellow-800">
              <AlertCircle className="w-5 h-5" />
              <p>Debes abrir un turno para poder realizar arqueos de caja.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {currentShift && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Turno Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{currentShift.location_name}</p>
              <p className="text-sm text-gray-500">Desde: {formatDateTime(currentShift.start_time)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Ventas del Turno</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(currentShift.total_sales)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Efectivo en Caja</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(currentShift.total_cash_sales + currentShift.initial_cash)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5" />
            Historial de Arqueos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cashCounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay arqueos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Contado</TableHead>
                    <TableHead>Esperado</TableHead>
                    <TableHead>Diferencia</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashCounts.map((count) => (
                    <TableRow key={count.id}>
                      <TableCell>{formatDateTime(count.created_at)}</TableCell>
                      <TableCell className="font-medium">{count.user_name}</TableCell>
                      <TableCell>{getCountTypeBadge(count.count_type)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(count.counted_amount)}</TableCell>
                      <TableCell>{formatCurrency(count.expected_amount)}</TableCell>
                      <TableCell>{getDifferenceBadge(count.difference)}</TableCell>
                      <TableCell className="max-w-xs truncate">{count.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCountDialog} onOpenChange={setShowCountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Arqueo de Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Arqueo</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={countType === 'opening' ? 'default' : 'outline'}
                  onClick={() => setCountType('opening')}
                  className={countType === 'opening' ? 'bg-green-600' : ''}
                >
                  Apertura
                </Button>
                <Button
                  type="button"
                  variant={countType === 'partial' ? 'default' : 'outline'}
                  onClick={() => setCountType('partial')}
                  className={countType === 'partial' ? 'bg-blue-600' : ''}
                >
                  Parcial
                </Button>
                <Button
                  type="button"
                  variant={countType === 'closing' ? 'default' : 'outline'}
                  onClick={() => setCountType('closing')}
                  className={countType === 'closing' ? 'bg-red-600' : ''}
                >
                  Cierre
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="counted">Monto Contado (COP)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="counted"
                  value={countedAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                  className="pl-8 text-lg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones del arqueo..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCountDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitCount}
              disabled={isSubmitting || !countedAmount}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Registrar Arqueo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cash;

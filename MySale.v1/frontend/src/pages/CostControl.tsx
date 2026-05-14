import React, { useState, useEffect } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  getCostEntries,
  createCostEntry,
  deleteCostEntry,
  getCostConfig,
  updateCostConfig,
  calculateCosts,
  applyCostsToProducts,
  getCostApplications
} from '../api';
import type { CostEntry, CostConfig, CostCalculation, CostApplication } from '../types';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Calculator,
  Plus,
  Loader2,
  Settings,
  Play,
  Trash2,
  History,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

const costCategories = [
  { value: 'rent', label: 'Arriendo' },
  { value: 'utilities', label: 'Servicios' },
  { value: 'salary', label: 'Salarios' },
  { value: 'transport', label: 'Transporte' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'insurance', label: 'Seguros' },
  { value: 'taxes', label: 'Impuestos' },
  { value: 'other', label: 'Otro' }
];

const distributionMethods = [
  { value: 'per_product', label: 'Por Producto (dividir entre todos)' },
  { value: 'percentage', label: 'Porcentaje Fijo' }
];

const CostControl: React.FC = () => {
  const [entries, setEntries] = useState<CostEntry[]>([]);
  const [config, setConfig] = useState<CostConfig | null>(null);
  const [calculation, setCalculation] = useState<CostCalculation | null>(null);
  const [applications, setApplications] = useState<CostApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);

  const [newEntry, setNewEntry] = useState({
    name: '',
    category: '',
    amount: '',
    description: '',
    is_recurring: false,
    recurrence_period: ''
  });

  const [configForm, setConfigForm] = useState({
    distribution_method: 'per_product',
    percentage_value: '0'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entriesData, configData, calcData, appsData] = await Promise.all([
        getCostEntries(),
        getCostConfig(),
        calculateCosts(),
        getCostApplications()
      ]);
      setEntries(entriesData);
      setConfig(configData);
      setCalculation(calcData);
      setApplications(appsData);
      setConfigForm({
        distribution_method: configData.distribution_method,
        percentage_value: configData.percentage_value.toString()
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.name || !newEntry.category || !newEntry.amount) {
      toast.error('Complete los campos requeridos');
      return;
    }
    setIsProcessing(true);
    try {
      await createCostEntry({
        name: newEntry.name,
        category: newEntry.category,
        amount: parseFloat(newEntry.amount),
        description: newEntry.description || undefined,
        is_recurring: newEntry.is_recurring,
        recurrence_period: newEntry.recurrence_period || undefined
      });
      await loadData();
      setShowAddEntry(false);
      setNewEntry({
        name: '', category: '', amount: '', description: '',
        is_recurring: false, recurrence_period: ''
      });
      toast.success('Costo registrado exitosamente');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al registrar costo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteEntry = (id: number) => {
    setConfirmAction({
      title: 'Eliminar costo',
      description: '¿Estás seguro de eliminar este costo?',
      onConfirm: async () => {
        try {
          await deleteCostEntry(id);
          await loadData();
          toast.success('Costo eliminado');
        } catch (error: unknown) {
          const err = error as { response?: { data?: { detail?: string } } };
          toast.error(err.response?.data?.detail || 'Error al eliminar');
        }
        setConfirmAction(null);
      }
    });
  };

  const handleUpdateConfig = async () => {
    setIsProcessing(true);
    try {
      await updateCostConfig({
        distribution_method: configForm.distribution_method,
        percentage_value: parseFloat(configForm.percentage_value)
      });
      await loadData();
      setShowConfig(false);
      toast.success('Configuracion actualizada');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al actualizar');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyCosts = () => {
    setConfirmAction({
      title: 'Aplicar costos',
      description: '¿Estás seguro de aplicar los costos a todos los productos? Esto aumentará el costo ponderado de cada producto.',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          const result = await applyCostsToProducts();
          await loadData();
          toast.success(`Costos aplicados: $${formatNumber(result.cost_per_product)} por producto`);
        } catch (error: unknown) {
          const err = error as { response?: { data?: { detail?: string } } };
          toast.error(err.response?.data?.detail || 'Error al aplicar costos');
        } finally {
          setIsProcessing(false);
        }
        setConfirmAction(null);
      }
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO');
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      rent: 'bg-purple-500',
      utilities: 'bg-yellow-500',
      salary: 'bg-green-500',
      transport: 'bg-blue-500',
      maintenance: 'bg-orange-500',
      insurance: 'bg-cyan-500',
      taxes: 'bg-red-500',
      other: 'bg-gray-500'
    };
    const labels: Record<string, string> = {
      rent: 'Arriendo',
      utilities: 'Servicios',
      salary: 'Salarios',
      transport: 'Transporte',
      maintenance: 'Mantenimiento',
      insurance: 'Seguros',
      taxes: 'Impuestos',
      other: 'Otro'
    };
    return <Badge className={colors[category] || 'bg-gray-500'}>{labels[category] || category}</Badge>;
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      per_product: 'Por Producto',
      per_unit_value: 'Por Valor Unitario',
      percentage: 'Porcentaje'
    };
    return labels[method] || method;
  };

  const totalCosts = entries.reduce((sum, e) => sum + e.amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Costos Activos</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalCosts)}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Calculator className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Productos Activos</p>
                <p className="text-2xl font-bold text-blue-600">{calculation?.product_count || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Costo por Producto</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(calculation?.cost_per_product || 0)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Calculator className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Metodo</p>
                <p className="text-lg font-bold text-purple-600">{getMethodLabel(config?.distribution_method || 'per_product')}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setShowAddEntry(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Costo
        </Button>
        <Button onClick={() => setShowConfig(true)} variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Configuracion
        </Button>
        <Button
          onClick={handleApplyCosts}
          disabled={isProcessing || !calculation || calculation.product_count === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          Aplicar a Productos
        </Button>
        <Button onClick={() => setShowHistory(true)} variant="outline">
          <History className="w-4 h-4 mr-2" />
          Historial
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Costos Operativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Recurrente</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No hay costos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell>{getCategoryBadge(entry.category)}</TableCell>
                      <TableCell className="font-semibold text-red-600">
                        {formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell>
                        {entry.is_recurring ? (
                          <Badge className="bg-blue-500">Si - {entry.recurrence_period}</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{entry.description || '-'}</TableCell>
                      <TableCell>{formatDate(entry.start_date)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Costo Operativo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Nombre del costo *"
              value={newEntry.name}
              onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select value={newEntry.category} onValueChange={(v) => setNewEntry({ ...newEntry, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria *" />
                </SelectTrigger>
                <SelectContent>
                  {costCategories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Monto *"
                value={newEntry.amount}
                onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
              />
            </div>
            <Textarea
              placeholder="Descripcion (opcional)"
              value={newEntry.description}
              onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
            />
            <div className="flex items-center space-x-2">
              <Switch
                id="recurring"
                checked={newEntry.is_recurring}
                onCheckedChange={(checked) => setNewEntry({ ...newEntry, is_recurring: checked })}
              />
              <Label htmlFor="recurring">Es recurrente</Label>
            </div>
            {newEntry.is_recurring && (
              <Select
                value={newEntry.recurrence_period}
                onValueChange={(v) => setNewEntry({ ...newEntry, recurrence_period: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Periodo de recurrencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEntry(false)}>Cancelar</Button>
            <Button
              onClick={handleAddEntry}
              disabled={isProcessing || !newEntry.name || !newEntry.category || !newEntry.amount}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configuracion de Distribucion de Costos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Metodo de Distribucion</Label>
              <Select
                value={configForm.distribution_method}
                onValueChange={(v) => setConfigForm({ ...configForm, distribution_method: v })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {distributionMethods.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {configForm.distribution_method === 'percentage' && (
              <div>
                <Label>Porcentaje a aplicar</Label>
                <Input
                  type="number"
                  className="mt-2"
                  value={configForm.percentage_value}
                  onChange={(e) => setConfigForm({ ...configForm, percentage_value: e.target.value })}
                />
              </div>
            )}
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Por Producto:</strong> El total de costos se divide entre el numero de productos activos.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                <strong>Porcentaje:</strong> Se aplica un valor fijo a cada producto.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfig(false)}>Cancelar</Button>
            <Button onClick={handleUpdateConfig} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial de Aplicaciones</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Total Costos</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Costo/Producto</TableHead>
                  <TableHead>Metodo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No hay aplicaciones registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>{formatDate(app.applied_at)}</TableCell>
                      <TableCell>{formatCurrency(app.total_cost)}</TableCell>
                      <TableCell>{app.product_count}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(app.cost_per_product)}
                      </TableCell>
                      <TableCell>{getMethodLabel(app.distribution_method)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistory(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={confirmAction?.title || ''}
        description={confirmAction?.description || ''}
        confirmLabel="Sí, confirmar"
        cancelLabel="No, cancelar"
        variant="danger"
        onConfirm={() => confirmAction?.onConfirm()}
      />
    </div>
  );
};

export default CostControl;

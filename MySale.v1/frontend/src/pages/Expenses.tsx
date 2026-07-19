import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { getExpenses, createExpense, getLocations } from '../api';
import type { Expense, Location } from '../types';
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
import { DollarSign, Plus, Loader2 } from 'lucide-react';

const expenseCategories = [
  { value: 'purchase', label: 'Compra' },
  { value: 'utilities', label: 'Servicios' },
  { value: 'rent', label: 'Arriendo' },
  { value: 'salary', label: 'Salario' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'supplies', label: 'Insumos' },
  { value: 'other', label: 'Otro' }
];

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState<string>(String(currentYear));
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [appliedFilters, setAppliedFilters] = useState<{ year: string; month: string; category: string } | null>(null);

  const handleGenerate = () => {
    setAppliedFilters({ year: filterYear, month: filterMonth, category: filterCategory });
  };

  const [newExpense, setNewExpense] = useState({
    location_id: '',
    category: '',
    description: '',
    amount: '',
    invoice_number: '',
    supplier: '',
    expense_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [expensesData, locationsData] = await Promise.all([
        getExpenses(),
        getLocations()
      ]);
      setExpenses(expensesData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar gastos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExpense = async () => {
    setIsProcessing(true);
    try {
      await createExpense({
        location_id: newExpense.location_id ? parseInt(newExpense.location_id) : undefined,
        category: newExpense.category,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        invoice_number: newExpense.invoice_number || undefined,
        supplier: newExpense.supplier || undefined,
        expense_date: newExpense.expense_date
      });
      await loadData();
      setShowAddExpense(false);
      setNewExpense({
        location_id: '', category: '', description: '', amount: '',
        invoice_number: '', supplier: '', expense_date: new Date().toISOString().split('T')[0]
      });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al registrar gasto');
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO');
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      purchase: 'bg-blue-500',
      utilities: 'bg-yellow-500',
      rent: 'bg-purple-500',
      salary: 'bg-green-500',
      maintenance: 'bg-orange-500',
      supplies: 'bg-cyan-500',
      other: 'bg-gray-500'
    };
    const labels: Record<string, string> = {
      purchase: 'Compra',
      utilities: 'Servicios',
      rent: 'Arriendo',
      salary: 'Salario',
      maintenance: 'Mantenimiento',
      supplies: 'Insumos',
      other: 'Otro'
    };
    return <Badge className={colors[category] || 'bg-gray-500'}>{labels[category] || category}</Badge>;
  };

  const getYearMonth = (dateStr: string): { year: number; month: number } => {
    const [y, m] = dateStr.split('T')[0].split('-');
    return { year: parseInt(y), month: parseInt(m) };
  };

  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    expenses.forEach(e => years.add(getYearMonth(e.expense_date).year));
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [expenses, currentYear]);

  const filteredExpenses = React.useMemo(() => {
    if (!appliedFilters) return [];
    return expenses.filter(e => {
      const { year, month } = getYearMonth(e.expense_date);
      if (appliedFilters.year !== 'all' && year !== parseInt(appliedFilters.year)) return false;
      if (appliedFilters.month !== 'all' && month !== parseInt(appliedFilters.month)) return false;
      if (appliedFilters.category !== 'all' && e.category !== appliedFilters.category) return false;
      return true;
    });
  }, [expenses, appliedFilters]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Gastos</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Registro de Gastos
            </CardTitle>
            <Button onClick={() => setShowAddExpense(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Gasto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Ano</label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {availableYears.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Mes</label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {monthNames.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Tipo de gasto</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {expenseCategories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} className="bg-blue-600 hover:bg-blue-700">
              Generar
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Ubicacion</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!appliedFilters ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                      Selecciona los filtros y presiona "Generar" para ver los gastos
                    </TableCell>
                  </TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                      No hay gastos para los filtros seleccionados
                    </TableCell>
                  </TableRow>
                ) : filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.expense_date)}</TableCell>
                    <TableCell>{getCategoryBadge(expense.category)}</TableCell>
                    <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                    <TableCell>{expense.location_name || 'General'}</TableCell>
                    <TableCell>{expense.supplier || '-'}</TableCell>
                    <TableCell className="font-mono">{expense.invoice_number || '-'}</TableCell>
                    <TableCell className="font-semibold text-red-600">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Select value={newExpense.category} onValueChange={(v) => setNewExpense({ ...newExpense, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria *" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
                            <Select value={newExpense.location_id || "general"} onValueChange={(v) => setNewExpense({ ...newExpense, location_id: v === "general" ? "" : v })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Ubicacion (opcional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="general">General</SelectItem>
                                {locations.map(l => (
                                  <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
            </div>
            <Textarea
              placeholder="Descripcion *"
              value={newExpense.description}
              onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                placeholder="Monto *"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              />
              <Input
                type="date"
                className="expense-date-input min-w-0"
                value={newExpense.expense_date}
                onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Proveedor (opcional)"
                value={newExpense.supplier}
                onChange={(e) => setNewExpense({ ...newExpense, supplier: e.target.value })}
              />
              <Input
                placeholder="No. Factura (opcional)"
                value={newExpense.invoice_number}
                onChange={(e) => setNewExpense({ ...newExpense, invoice_number: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddExpense(false)}>Cancelar</Button>
            <Button
              onClick={handleAddExpense}
              disabled={isProcessing || !newExpense.category || !newExpense.description || !newExpense.amount}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Expenses;

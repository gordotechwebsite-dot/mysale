import React, { useState, useEffect } from 'react';
import { getSalesReport, getInventoryReport, exportSalesExcel, exportInventoryExcel, getLocations, getEmployeesSummaryReport, getProfitabilityReport } from '../api';
import type { Location } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Loader2, TrendingUp, Package, Users, DollarSign } from 'lucide-react';

interface EmployeeSummary {
  user_id: number;
  full_name: string;
  username: string;
  role: string;
  total_hours: number;
  total_shifts: number;
  total_sales: number;
  total_transactions: number;
  avg_sales_per_shift: number;
  avg_hours_per_shift: number;
  points: number;
  is_active: boolean;
}

interface EmployeesReport {
  start_date: string;
  end_date: string;
  total_employees: number;
  total_hours_all: number;
  total_sales_all: number;
  total_transactions_all: number;
  employees: EmployeeSummary[];
}

interface ProfitabilitySummary {
  total_sales: number;
  total_cost_of_goods: number;
  gross_profit: number;
  gross_margin_pct: number;
  total_expenses: number;
  total_losses: number;
  net_profit: number;
  net_margin_pct: number;
  total_transactions: number;
  expenses_by_category: Record<string, number>;
  losses_by_type: Record<string, number>;
}

interface ProfitabilityByDay {
  date: string;
  sales: number;
  cost_of_goods: number;
  expenses: number;
  losses: number;
  gross_profit: number;
  net_profit: number;
}

interface ProfitabilityReport {
  start_date: string;
  end_date: string;
  location_name: string;
  summary: ProfitabilitySummary;
  by_day: ProfitabilityByDay[];
}

const Reports: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [salesReport, setSalesReport] = useState<any>(null);
  const [inventoryReport, setInventoryReport] = useState<any>(null);
  const [employeesReport, setEmployeesReport] = useState<EmployeesReport | null>(null);
  const [profitabilityReport, setProfitabilityReport] = useState<ProfitabilityReport | null>(null);

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const data = await getLocations();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadSalesReport = async () => {
    setIsLoading(true);
    try {
      const data = await getSalesReport({
        start_date: startDate,
        end_date: endDate,
        location_id: selectedLocation ? parseInt(selectedLocation) : undefined
      });
      setSalesReport(data);
    } catch (error) {
      console.error('Error loading sales report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInventoryReport = async () => {
    setIsLoading(true);
    try {
      const data = await getInventoryReport(selectedLocation ? parseInt(selectedLocation) : undefined);
      setInventoryReport(data);
    } catch (error) {
      console.error('Error loading inventory report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployeesReport = async () => {
    setIsLoading(true);
    try {
      const data = await getEmployeesSummaryReport({
        start_date: startDate,
        end_date: endDate,
      });
      setEmployeesReport(data);
    } catch (error) {
      console.error('Error loading employees report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfitabilityReport = async () => {
    setIsLoading(true);
    try {
      const data = await getProfitabilityReport({
        start_date: startDate,
        end_date: endDate,
        location_id: selectedLocation ? parseInt(selectedLocation) : undefined
      });
      setProfitabilityReport(data);
    } catch (error) {
      console.error('Error loading profitability report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportSalesExcel = async () => {
    try {
      const blob = await exportSalesExcel({
        start_date: startDate,
        end_date: endDate,
        location_id: selectedLocation ? parseInt(selectedLocation) : undefined
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ventas_${startDate}_${endDate}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error al exportar el reporte');
    }
  };

  const handleExportInventoryExcel = async () => {
    try {
      const blob = await exportInventoryExcel(selectedLocation ? parseInt(selectedLocation) : undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error al exportar el reporte');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const DateFilters = ({ onGenerate, showLocation = true, extraButtons }: {
    onGenerate: () => void;
    showLocation?: boolean;
    extraButtons?: React.ReactNode;
  }) => (
    <div className="flex flex-wrap gap-4 mb-6 items-end">
      <div>
        <label className="text-sm text-gray-500">Fecha Inicio</label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-40"
        />
      </div>
      <div>
        <label className="text-sm text-gray-500">Fecha Fin</label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-40"
        />
      </div>
      {showLocation && (
        <div>
          <label className="text-sm text-gray-500">Ubicacion</label>
          <Select value={selectedLocation || "all"} onValueChange={(v) => setSelectedLocation(v === "all" ? "" : v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {locations.map(l => (
                <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex items-end gap-2">
        <Button onClick={onGenerate} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generar'}
        </Button>
        {extraButtons}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="sales">
        <TabsList className="mb-4">
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="employees">Empleados</TabsTrigger>
          <TabsTrigger value="profitability">Rentabilidad</TabsTrigger>
        </TabsList>

        {/* ===== VENTAS ===== */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Reporte de Ventas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DateFilters
                onGenerate={loadSalesReport}
                extraButtons={
                  <Button variant="outline" onClick={handleExportSalesExcel} disabled={!salesReport}>
                    <Download className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                }
              />

              {salesReport && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Total Ventas</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(salesReport.total_sales || salesReport.summary?.total_sales || 0)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Transacciones</p>
                        <p className="text-2xl font-bold">{salesReport.total_transactions || salesReport.summary?.total_transactions || 0}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Efectivo</p>
                        <p className="text-2xl font-bold">{formatCurrency(salesReport.total_cash || salesReport.summary?.cash_sales || 0)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Tarjeta</p>
                        <p className="text-2xl font-bold">{formatCurrency(salesReport.total_card || salesReport.summary?.card_sales || 0)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {((salesReport.details && salesReport.details.length > 0) || (salesReport.top_products && salesReport.top_products.length > 0)) && (
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">
                        {salesReport.details ? 'Detalle de Ventas' : 'Productos Mas Vendidos'}
                      </h4>
                      <div className="overflow-x-auto">
                        {salesReport.details && salesReport.details.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Folio</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Hora</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead>Codigo</TableHead>
                                <TableHead>Cantidad</TableHead>
                                <TableHead>Precio Unit.</TableHead>
                                <TableHead>Subtotal</TableHead>
                                <TableHead>Metodo Pago</TableHead>
                                <TableHead>Cajero</TableHead>
                                <TableHead>Ubicacion</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {salesReport.details.map((d: any, i: number) => (
                                <TableRow key={i}>
                                  <TableCell className="font-mono text-xs">{d.folio}</TableCell>
                                  <TableCell className="text-xs">{d.date ? new Date(d.date).toLocaleDateString('es-CO') : ''}</TableCell>
                                  <TableCell className="text-xs">{d.time}</TableCell>
                                  <TableCell className="font-medium">{d.product_name}</TableCell>
                                  <TableCell className="font-mono text-xs">{d.product_code}</TableCell>
                                  <TableCell>{d.quantity}</TableCell>
                                  <TableCell>{formatCurrency(d.unit_price)}</TableCell>
                                  <TableCell className="font-medium">{formatCurrency(d.subtotal)}</TableCell>
                                  <TableCell>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      d.payment_method === 'cash' ? 'bg-green-100 text-green-700' :
                                      d.payment_method === 'card' ? 'bg-blue-100 text-blue-700' :
                                      'bg-purple-100 text-purple-700'
                                    }`}>
                                      {d.payment_method === 'cash' ? 'Efectivo' : d.payment_method === 'card' ? 'Tarjeta' : 'Transferencia'}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-xs">{d.cashier_name}</TableCell>
                                  <TableCell className="text-xs">{d.location_name}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead>Cantidad</TableHead>
                                <TableHead>Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {salesReport.top_products.slice(0, 10).map((p: any, i: number) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium">{p.product_name}</TableCell>
                                  <TableCell>{p.quantity}</TableCell>
                                  <TableCell>{formatCurrency(p.total)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== INVENTARIO ===== */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Reporte de Inventario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-6 items-end">
                <div>
                  <label className="text-sm text-gray-500">Ubicacion</label>
                  <Select value={selectedLocation || "all"} onValueChange={(v) => setSelectedLocation(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {locations.map(l => (
                        <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={loadInventoryReport} disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generar'}
                  </Button>
                  <Button variant="outline" onClick={handleExportInventoryExcel} disabled={!inventoryReport}>
                    <Download className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </div>

              {inventoryReport && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Total Productos</p>
                        <p className="text-2xl font-bold">{inventoryReport.total_products || inventoryReport.summary?.total_products || 0}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Valor Total (Costo)</p>
                        <p className="text-2xl font-bold">{formatCurrency(inventoryReport.total_stock_value || inventoryReport.summary?.total_cost_value || 0)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Valor Total (Venta)</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(inventoryReport.summary?.total_sale_value || 0)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {inventoryReport.products && inventoryReport.products.length > 0 && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Codigo</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Grupo</TableHead>
                            <TableHead>Familia</TableHead>
                            <TableHead>Unidad</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Min</TableHead>
                            <TableHead>Max</TableHead>
                            <TableHead>Costo Prom.</TableHead>
                            <TableHead>Precio Venta</TableHead>
                            <TableHead>Valor Stock</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventoryReport.products.map((p: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{p.product_code || p.code}</TableCell>
                              <TableCell className="font-medium">{p.product_name || p.name}</TableCell>
                              <TableCell className="text-xs">{p.group_name || '-'}</TableCell>
                              <TableCell className="text-xs">{p.family_name || '-'}</TableCell>
                              <TableCell className="text-xs">{p.unit || '-'}</TableCell>
                              <TableCell className="font-medium">{p.quantity ?? p.total_stock ?? 0}</TableCell>
                              <TableCell className="text-xs text-gray-400">{p.min_stock ?? '-'}</TableCell>
                              <TableCell className="text-xs text-gray-400">{p.max_stock ?? '-'}</TableCell>
                              <TableCell>{formatCurrency(p.weighted_cost)}</TableCell>
                              <TableCell>{formatCurrency(p.sale_price)}</TableCell>
                              <TableCell className="font-medium">{formatCurrency(p.stock_value)}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  p.status === 'low' ? 'bg-red-100 text-red-700' :
                                  p.status === 'high' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {p.status === 'low' ? 'Bajo' : p.status === 'high' ? 'Alto' : 'Normal'}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== EMPLEADOS ===== */}
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Reporte de Empleados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DateFilters onGenerate={loadEmployeesReport} showLocation={false} />

              {employeesReport && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Total Empleados</p>
                        <p className="text-2xl font-bold">{employeesReport.total_employees}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Horas Totales</p>
                        <p className="text-2xl font-bold">{formatHours(employeesReport.total_hours_all)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Ventas Totales</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(employeesReport.total_sales_all)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Transacciones Totales</p>
                        <p className="text-2xl font-bold">{employeesReport.total_transactions_all}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {employeesReport.employees.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Empleado</TableHead>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Turnos</TableHead>
                            <TableHead>Horas Totales</TableHead>
                            <TableHead>Prom. Hrs/Turno</TableHead>
                            <TableHead>Ventas Totales</TableHead>
                            <TableHead>Transacciones</TableHead>
                            <TableHead>Prom. Venta/Turno</TableHead>
                            <TableHead>Puntos</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employeesReport.employees.map((emp, i) => (
                            <TableRow key={emp.user_id} className={!emp.is_active ? 'opacity-50' : ''}>
                              <TableCell className="font-mono text-gray-400">{i + 1}</TableCell>
                              <TableCell className="font-medium">{emp.full_name}</TableCell>
                              <TableCell className="text-xs text-gray-500">@{emp.username}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  emp.role === 'Superusuario' ? 'bg-purple-100 text-purple-700' :
                                  emp.role === 'Administrador' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {emp.role}
                                </span>
                              </TableCell>
                              <TableCell>{emp.total_shifts}</TableCell>
                              <TableCell>{formatHours(emp.total_hours)}</TableCell>
                              <TableCell className="text-xs">{formatHours(emp.avg_hours_per_shift)}</TableCell>
                              <TableCell className="font-medium text-green-600">{formatCurrency(emp.total_sales)}</TableCell>
                              <TableCell>{emp.total_transactions}</TableCell>
                              <TableCell className="text-xs">{formatCurrency(emp.avg_sales_per_shift)}</TableCell>
                              <TableCell className="font-medium">{emp.points}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  emp.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {emp.is_active ? 'Activo' : 'Inactivo'}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No hay datos de empleados para el periodo seleccionado
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== RENTABILIDAD ===== */}
        <TabsContent value="profitability">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Reporte de Rentabilidad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DateFilters onGenerate={loadProfitabilityReport} />

              {profitabilityReport && (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Ventas Totales</p>
                        <p className="text-2xl font-bold">{formatCurrency(profitabilityReport.summary.total_sales)}</p>
                        <p className="text-xs text-gray-400">{profitabilityReport.summary.total_transactions} transacciones</p>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-orange-500">
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Costo de Productos</p>
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(profitabilityReport.summary.total_cost_of_goods)}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-yellow-500">
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Utilidad Bruta</p>
                        <p className={`text-2xl font-bold ${profitabilityReport.summary.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(profitabilityReport.summary.gross_profit)}
                        </p>
                        <p className="text-xs text-gray-400">Margen: {profitabilityReport.summary.gross_margin_pct}%</p>
                      </CardContent>
                    </Card>
                    <Card className={`border-l-4 ${profitabilityReport.summary.net_profit >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Utilidad Neta</p>
                        <p className={`text-2xl font-bold ${profitabilityReport.summary.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(profitabilityReport.summary.net_profit)}
                        </p>
                        <p className="text-xs text-gray-400">Margen: {profitabilityReport.summary.net_margin_pct}%</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Profitability breakdown table */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3">Desglose de Rentabilidad</h4>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-1/2">Concepto</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead className="text-right">% sobre Ventas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium text-green-700">Ventas Totales</TableCell>
                            <TableCell className="text-right font-bold text-green-700">{formatCurrency(profitabilityReport.summary.total_sales)}</TableCell>
                            <TableCell className="text-right">100%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-red-600">(-) Costo de Productos Vendidos</TableCell>
                            <TableCell className="text-right text-red-600">{formatCurrency(profitabilityReport.summary.total_cost_of_goods)}</TableCell>
                            <TableCell className="text-right text-red-600">
                              {profitabilityReport.summary.total_sales > 0
                                ? `${(profitabilityReport.summary.total_cost_of_goods / profitabilityReport.summary.total_sales * 100).toFixed(1)}%`
                                : '0%'}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-gray-50 font-semibold">
                            <TableCell className={profitabilityReport.summary.gross_profit >= 0 ? 'text-green-700' : 'text-red-700'}>
                              = Utilidad Bruta
                            </TableCell>
                            <TableCell className={`text-right ${profitabilityReport.summary.gross_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {formatCurrency(profitabilityReport.summary.gross_profit)}
                            </TableCell>
                            <TableCell className="text-right">{profitabilityReport.summary.gross_margin_pct}%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-red-600">(-) Gastos Operacionales</TableCell>
                            <TableCell className="text-right text-red-600">{formatCurrency(profitabilityReport.summary.total_expenses)}</TableCell>
                            <TableCell className="text-right text-red-600">
                              {profitabilityReport.summary.total_sales > 0
                                ? `${(profitabilityReport.summary.total_expenses / profitabilityReport.summary.total_sales * 100).toFixed(1)}%`
                                : '0%'}
                            </TableCell>
                          </TableRow>
                          {/* Expense categories detail */}
                          {Object.entries(profitabilityReport.summary.expenses_by_category).map(([cat, amount]) => (
                            <TableRow key={cat} className="text-xs">
                              <TableCell className="pl-8 text-gray-500">{cat}</TableCell>
                              <TableCell className="text-right text-gray-500">{formatCurrency(amount)}</TableCell>
                              <TableCell className="text-right text-gray-400">
                                {profitabilityReport.summary.total_sales > 0
                                  ? `${(amount / profitabilityReport.summary.total_sales * 100).toFixed(1)}%`
                                  : '0%'}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell className="text-red-600">(-) Mermas / Perdidas</TableCell>
                            <TableCell className="text-right text-red-600">{formatCurrency(profitabilityReport.summary.total_losses)}</TableCell>
                            <TableCell className="text-right text-red-600">
                              {profitabilityReport.summary.total_sales > 0
                                ? `${(profitabilityReport.summary.total_losses / profitabilityReport.summary.total_sales * 100).toFixed(1)}%`
                                : '0%'}
                            </TableCell>
                          </TableRow>
                          {/* Loss types detail */}
                          {Object.entries(profitabilityReport.summary.losses_by_type).map(([type, amount]) => (
                            <TableRow key={type} className="text-xs">
                              <TableCell className="pl-8 text-gray-500">{type}</TableCell>
                              <TableCell className="text-right text-gray-500">{formatCurrency(amount)}</TableCell>
                              <TableCell className="text-right text-gray-400">
                                {profitabilityReport.summary.total_sales > 0
                                  ? `${(amount / profitabilityReport.summary.total_sales * 100).toFixed(1)}%`
                                  : '0%'}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className={`font-bold text-lg ${profitabilityReport.summary.net_profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                            <TableCell className={profitabilityReport.summary.net_profit >= 0 ? 'text-green-700' : 'text-red-700'}>
                              = UTILIDAD NETA
                            </TableCell>
                            <TableCell className={`text-right ${profitabilityReport.summary.net_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {formatCurrency(profitabilityReport.summary.net_profit)}
                            </TableCell>
                            <TableCell className="text-right">{profitabilityReport.summary.net_margin_pct}%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Daily breakdown table */}
                  {profitabilityReport.by_day.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Detalle Diario</h4>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead className="text-right">Ventas</TableHead>
                              <TableHead className="text-right">Costo Prod.</TableHead>
                              <TableHead className="text-right">Gastos</TableHead>
                              <TableHead className="text-right">Mermas</TableHead>
                              <TableHead className="text-right">Utilidad Bruta</TableHead>
                              <TableHead className="text-right">Utilidad Neta</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {profitabilityReport.by_day.map((day) => (
                              <TableRow key={day.date}>
                                <TableCell className="font-mono">{day.date}</TableCell>
                                <TableCell className="text-right text-green-600">{formatCurrency(day.sales)}</TableCell>
                                <TableCell className="text-right text-red-600">{formatCurrency(day.cost_of_goods)}</TableCell>
                                <TableCell className="text-right text-red-600">{formatCurrency(day.expenses)}</TableCell>
                                <TableCell className="text-right text-red-600">{formatCurrency(day.losses)}</TableCell>
                                <TableCell className={`text-right ${day.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(day.gross_profit)}
                                </TableCell>
                                <TableCell className={`text-right font-bold ${day.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(day.net_profit)}
                                </TableCell>
                              </TableRow>
                            ))}
                            {/* Totals row */}
                            <TableRow className="font-bold bg-gray-50">
                              <TableCell>TOTAL</TableCell>
                              <TableCell className="text-right text-green-700">{formatCurrency(profitabilityReport.summary.total_sales)}</TableCell>
                              <TableCell className="text-right text-red-700">{formatCurrency(profitabilityReport.summary.total_cost_of_goods)}</TableCell>
                              <TableCell className="text-right text-red-700">{formatCurrency(profitabilityReport.summary.total_expenses)}</TableCell>
                              <TableCell className="text-right text-red-700">{formatCurrency(profitabilityReport.summary.total_losses)}</TableCell>
                              <TableCell className={`text-right ${profitabilityReport.summary.gross_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {formatCurrency(profitabilityReport.summary.gross_profit)}
                              </TableCell>
                              <TableCell className={`text-right ${profitabilityReport.summary.net_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {formatCurrency(profitabilityReport.summary.net_profit)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;

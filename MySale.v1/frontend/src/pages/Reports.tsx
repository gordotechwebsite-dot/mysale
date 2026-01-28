import React, { useState, useEffect } from 'react';
import { getSalesReport, getInventoryReport, exportSalesExcel, exportInventoryExcel, getLocations } from '../api';
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
import { Download, Loader2, TrendingUp, Package } from 'lucide-react';

const Reports: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [salesReport, setSalesReport] = useState<any>(null);
  const [inventoryReport, setInventoryReport] = useState<any>(null);

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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="sales">
        <TabsList className="mb-4">
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Reporte de Ventas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-6">
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
                  <Button onClick={loadSalesReport} disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generar'}
                  </Button>
                  <Button variant="outline" onClick={handleExportSalesExcel} disabled={!salesReport}>
                    <Download className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </div>

              {salesReport && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Total Ventas</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(salesReport.summary?.total_sales || 0)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Transacciones</p>
                        <p className="text-2xl font-bold">{salesReport.summary?.total_transactions || 0}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Efectivo</p>
                        <p className="text-2xl font-bold">{formatCurrency(salesReport.summary?.cash_sales || 0)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Tarjeta</p>
                        <p className="text-2xl font-bold">{formatCurrency(salesReport.summary?.card_sales || 0)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {salesReport.top_products && salesReport.top_products.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">Productos Mas Vendidos</h4>
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
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Reporte de Inventario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-6">
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
                        <p className="text-2xl font-bold">{inventoryReport.summary?.total_products || 0}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Valor Total (Costo)</p>
                        <p className="text-2xl font-bold">{formatCurrency(inventoryReport.summary?.total_cost_value || 0)}</p>
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
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Codigo</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Costo Prom.</TableHead>
                          <TableHead>Precio Venta</TableHead>
                          <TableHead>Valor Stock</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryReport.products.map((p: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono">{p.code}</TableCell>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell>{p.total_stock}</TableCell>
                            <TableCell>{formatCurrency(p.weighted_cost)}</TableCell>
                            <TableCell>{formatCurrency(p.sale_price)}</TableCell>
                            <TableCell>{formatCurrency(p.stock_value)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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

import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getSalesReport, getInventoryReport, exportSalesExcel, exportInventoryExcel, getLocations, getEmployeesSummaryReport, getProfitabilityReport, exportEmployeesExcel, exportProfitabilityExcel, getUsers, getPurchasesReport, exportPurchasesExcel, getDeliveries, getCashCloses, createCashClose, deleteCashClose } from '../api';
import type { Delivery, CashClose } from '../types';
import type { Location } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';
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
import { Download, Loader2, TrendingUp, Package, Users, DollarSign, ShoppingCart, Bike, Phone, MapPin, Clock, ChefHat, Truck, Check, X, FileText, Banknote, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

const toColombiaDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
};

const Reports: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; full_name: string; username: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [salesReport, setSalesReport] = useState<any>(null);
  const [inventoryReport, setInventoryReport] = useState<any>(null);
  const [employeesReport, setEmployeesReport] = useState<EmployeesReport | null>(null);
  const [profitabilityReport, setProfitabilityReport] = useState<ProfitabilityReport | null>(null);
  const [purchasesReport, setPurchasesReport] = useState<any>(null);
  const [deliveriesData, setDeliveriesData] = useState<Delivery[]>([]);
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>('all');
  const [cashCloses, setCashCloses] = useState<CashClose[]>([]);
  const [showCashCloseForm, setShowCashCloseForm] = useState(false);
  const [cashCloseForm, setCashCloseForm] = useState({
    location_id: '',
    close_date: toColombiaDate(),
    total_sales: '',
    total_cash_sales: '',
    total_card_sales: '',
    total_transfer_sales: '',
    total_transactions: '',
    base_amount: '',
    declared_cash: '',
    notes: '',
  });

  const [startDate, setStartDate] = useState(() => {
    const parts = toColombiaDate().split('-');
    return `${parts[0]}-${parts[1]}-01`;
  });
  const [endDate, setEndDate] = useState(() => toColombiaDate());
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    loadLocations();
    loadUsers();
  }, []);

  const loadLocations = async () => {
    try {
      const data = await getLocations();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('Error al cargar ubicaciones');
    }
  };

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
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
      toast.error('Error al cargar reporte de ventas');
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
      toast.error('Error al cargar reporte de inventario');
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
        user_id: selectedEmployee ? parseInt(selectedEmployee) : undefined,
      });
      setEmployeesReport(data);
    } catch (error) {
      console.error('Error loading employees report:', error);
      toast.error('Error al cargar reporte de empleados');
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
      toast.error('Error al cargar reporte de rentabilidad');
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
      toast.error('Error al exportar el reporte');
    }
  };

  const handleExportInventoryExcel = async () => {
    try {
      const blob = await exportInventoryExcel(selectedLocation ? parseInt(selectedLocation) : undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventario_${toColombiaDate()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar el reporte');
    }
  };

  const handleExportEmployeesExcel = async () => {
    try {
      const blob = await exportEmployeesExcel({
        start_date: startDate,
        end_date: endDate,
        user_id: selectedEmployee ? parseInt(selectedEmployee) : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `empleados_${startDate}_${endDate}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar el reporte');
    }
  };

  const loadPurchasesReport = async () => {
    setIsLoading(true);
    try {
      const data = await getPurchasesReport({
        start_date: startDate,
        end_date: endDate,
        location_id: selectedLocation ? parseInt(selectedLocation) : undefined,
      });
      setPurchasesReport(data);
    } catch (error) {
      console.error('Error loading purchases report:', error);
      toast.error('Error al cargar reporte de compras');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPurchasesExcel = async () => {
    try {
      const blob = await exportPurchasesExcel({
        start_date: startDate,
        end_date: endDate,
        location_id: selectedLocation ? parseInt(selectedLocation) : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compras_${startDate}_${endDate}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar el reporte');
    }
  };

  const loadDeliveriesReport = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        start_date: startDate,
        end_date: endDate,
      };
      if (deliveryStatusFilter !== 'all') params.delivery_status = deliveryStatusFilter;
      const data = await getDeliveries(params);
      setDeliveriesData(data);
    } catch (error) {
      console.error('Error loading deliveries report:', error);
      toast.error('Error al cargar reporte de domicilios');
    } finally {
      setIsLoading(false);
    }
  };

  const getDeliveryStatusBadge = (status?: string) => {
    const config: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
      pending: { color: 'bg-yellow-500', label: 'Pendiente', icon: <Clock className="w-3 h-3" /> },
      preparing: { color: 'bg-orange-500', label: 'Preparando', icon: <ChefHat className="w-3 h-3" /> },
      in_transit: { color: 'bg-blue-500', label: 'En Camino', icon: <Truck className="w-3 h-3" /> },
      delivered: { color: 'bg-green-500', label: 'Entregado', icon: <Check className="w-3 h-3" /> },
      cancelled: { color: 'bg-red-500', label: 'Cancelado', icon: <X className="w-3 h-3" /> },
    };
    const c = config[status || 'pending'] || config.pending;
    return (
      <Badge className={`${c.color} text-white flex items-center gap-1 w-fit`}>
        {c.icon} {c.label}
      </Badge>
    );
  };

  const handleExportDeliveriesExcel = () => {
    if (deliveriesData.length === 0) return;
    const headers = ['Folio', 'Fecha', 'Cliente', 'Telefono', 'Direccion', 'Domiciliario', 'Productos', 'Subtotal', 'Domicilio', 'Total', 'Metodo Pago', 'Estado'];
    const rows = deliveriesData.map(d => [
      d.folio,
      new Date(d.created_at).toLocaleString('es-CO'),
      d.customer_name || '',
      d.customer_phone || '',
      d.customer_address || '',
      d.delivery_person || '',
      d.items.map(i => `${i.product_name} x${i.quantity}`).join(', '),
      d.total,
      d.delivery_fee,
      d.grand_total,
      d.payment_method === 'cash' ? 'Efectivo' : d.payment_method === 'card' ? 'Tarjeta' : 'Transferencia',
      d.delivery_status === 'pending' ? 'Pendiente' : d.delivery_status === 'preparing' ? 'Preparando' : d.delivery_status === 'in_transit' ? 'En Camino' : d.delivery_status === 'delivered' ? 'Entregado' : 'Cancelado',
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `domicilios_${startDate}_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportProfitabilityExcel = async () => {
    try {
      const blob = await exportProfitabilityExcel({
        start_date: startDate,
        end_date: endDate,
        location_id: selectedLocation ? parseInt(selectedLocation) : undefined
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rentabilidad_${startDate}_${endDate}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar el reporte');
    }
  };

  const fmtCOP = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  const fmtHrs = (hours: number) => { const h = Math.floor(hours); const m = Math.round((hours - h) * 60); return `${h}h ${m}m`; };

  const openPDFWindow = (title: string, dateRange: string, summaryHTML: string, tableHTML: string) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
      @page { size: letter portrait; margin: 15mm 12mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 9px; line-height: 1.4; }
      .header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; margin-bottom: 12px; }
      .header h1 { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
      .header .company { font-size: 11px; color: #555; margin-top: 2px; }
      .header .dates { font-size: 10px; color: #333; margin-top: 4px; font-weight: 600; }
      .header .generated { font-size: 8px; color: #888; margin-top: 2px; }
      .summary { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
      .summary-card { flex: 1; min-width: 120px; border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; background: #fafafa; }
      .summary-card .label { font-size: 8px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
      .summary-card .value { font-size: 14px; font-weight: 700; margin-top: 2px; }
      .summary-card .sub { font-size: 7px; color: #888; }
      .green { color: #16a34a; } .red { color: #dc2626; } .blue { color: #2563eb; } .purple { color: #7c3aed; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      th { background: #1a1a1a; color: white; padding: 5px 6px; text-align: left; font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
      td { padding: 4px 6px; border-bottom: 1px solid #e5e5e5; font-size: 8px; }
      tr:nth-child(even) { background: #f8f8f8; }
      .text-right { text-align: right; }
      .font-bold { font-weight: 700; }
      .font-mono { font-family: 'Courier New', monospace; }
      .section-title { font-size: 11px; font-weight: 700; margin: 14px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #ccc; }
      .total-row { background: #f0f0f0 !important; font-weight: 700; }
      .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 7px; font-weight: 600; }
      .badge-green { background: #dcfce7; color: #166534; } .badge-red { background: #fef2f2; color: #991b1b; }
      .badge-blue { background: #dbeafe; color: #1e40af; } .badge-yellow { background: #fef9c3; color: #854d0e; }
      .badge-purple { background: #f3e8ff; color: #6b21a8; } .badge-gray { background: #f3f4f6; color: #374151; }
      .footer { text-align: center; margin-top: 16px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 7px; color: #999; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>
      <div class="header">
        <div class="company">MySale POS</div>
        <h1>${title}</h1>
        <div class="dates">${dateRange}</div>
        <div class="generated">Generado: ${new Date().toLocaleString('es-CO')}</div>
      </div>
      ${summaryHTML}
      ${tableHTML}
      <div class="footer">MySale POS - Sistema de Punto de Venta - www.pos-mysale.co</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  const handleExportSalesPDF = () => {
    if (!salesReport) return;
    const summary = `<div class="summary">
      <div class="summary-card"><div class="label">Total Ventas</div><div class="value green">${fmtCOP(salesReport.total_sales || salesReport.summary?.total_sales || 0)}</div></div>
      <div class="summary-card"><div class="label">Transacciones</div><div class="value">${salesReport.total_transactions || salesReport.summary?.total_transactions || 0}</div></div>
      <div class="summary-card"><div class="label">Efectivo</div><div class="value">${fmtCOP(salesReport.total_cash || salesReport.summary?.cash_sales || 0)}</div></div>
      <div class="summary-card"><div class="label">Tarjeta</div><div class="value">${fmtCOP(salesReport.total_card || salesReport.summary?.card_sales || 0)}</div></div>
      <div class="summary-card"><div class="label">Nequi</div><div class="value">${fmtCOP(salesReport.total_nequi || 0)}</div></div>
      <div class="summary-card"><div class="label">Bre-B</div><div class="value">${fmtCOP(salesReport.total_breb || 0)}</div></div>
    </div>`;
    let tableHTML = '';
    if (salesReport.details && salesReport.details.length > 0) {
      const rows = salesReport.details.map((d: any) => `<tr>
        <td class="font-mono">${d.folio}</td><td>${d.date ? new Date(d.date).toLocaleDateString('es-CO') : ''}</td><td>${d.time || ''}</td>
        <td>${d.product_name}</td><td class="font-mono">${d.product_code || ''}</td><td class="text-right">${d.quantity}</td>
        <td class="text-right">${fmtCOP(d.unit_price)}</td><td class="text-right font-bold">${fmtCOP(d.subtotal)}</td>
        <td>${d.payment_method === 'cash' ? 'Efectivo' : d.payment_method === 'card' ? 'Tarjeta' : d.payment_method === 'nequi' ? 'Nequi' : d.payment_method === 'breb' ? 'Bre-B' : 'Transfer.'}</td>
        <td>${d.cashier_name || ''}</td><td>${d.location_name || ''}</td>
      </tr>`).join('');
      tableHTML = `<div class="section-title">Detalle de Ventas</div><table><tr><th>Folio</th><th>Fecha</th><th>Hora</th><th>Producto</th><th>Codigo</th><th class="text-right">Cant.</th><th class="text-right">P. Unit.</th><th class="text-right">Subtotal</th><th>Metodo</th><th>Cajero</th><th>Ubicacion</th></tr>${rows}</table>`;
    } else if (salesReport.top_products && salesReport.top_products.length > 0) {
      const rows = salesReport.top_products.slice(0, 10).map((p: any) => `<tr><td>${p.product_name}</td><td class="text-right">${p.quantity}</td><td class="text-right font-bold">${fmtCOP(p.total)}</td></tr>`).join('');
      tableHTML = `<div class="section-title">Productos Mas Vendidos</div><table><tr><th>Producto</th><th class="text-right">Cantidad</th><th class="text-right">Total</th></tr>${rows}</table>`;
    }
    openPDFWindow('Reporte de Ventas', `${startDate} al ${endDate}`, summary, tableHTML);
  };

  const handleExportInventoryPDF = () => {
    if (!inventoryReport) return;
    const summary = `<div class="summary">
      <div class="summary-card"><div class="label">Total Productos</div><div class="value">${inventoryReport.total_products || inventoryReport.summary?.total_products || 0}</div></div>
      <div class="summary-card"><div class="label">Valor Total (Costo)</div><div class="value">${fmtCOP(inventoryReport.total_stock_value || inventoryReport.summary?.total_cost_value || 0)}</div></div>
      <div class="summary-card"><div class="label">Valor Total (Venta)</div><div class="value green">${fmtCOP(inventoryReport.summary?.total_sale_value || 0)}</div></div>
    </div>`;
    let tableHTML = '';
    if (inventoryReport.products && inventoryReport.products.length > 0) {
      const rows = inventoryReport.products.map((p: any) => {
        const statusBadge = p.status === 'low' ? '<span class="badge badge-red">Bajo</span>' : p.status === 'high' ? '<span class="badge badge-yellow">Alto</span>' : '<span class="badge badge-green">Normal</span>';
        return `<tr><td class="font-mono">${p.product_code || p.code || ''}</td><td>${p.product_name || p.name}</td><td>${p.group_name || '-'}</td><td>${p.family_name || '-'}</td><td class="text-right">${p.quantity ?? p.total_stock ?? 0}</td><td class="text-right">${fmtCOP(p.weighted_cost)}</td><td class="text-right">${fmtCOP(p.sale_price)}</td><td class="text-right font-bold">${fmtCOP(p.stock_value)}</td><td>${statusBadge}</td></tr>`;
      }).join('');
      tableHTML = `<div class="section-title">Detalle de Inventario</div><table><tr><th>Codigo</th><th>Producto</th><th>Grupo</th><th>Familia</th><th class="text-right">Stock</th><th class="text-right">Costo</th><th class="text-right">P. Venta</th><th class="text-right">Valor</th><th>Estado</th></tr>${rows}</table>`;
    }
    openPDFWindow('Reporte de Inventario', new Date().toLocaleDateString('es-CO'), summary, tableHTML);
  };

  const handleExportEmployeesPDF = () => {
    if (!employeesReport) return;
    const summary = `<div class="summary">
      <div class="summary-card"><div class="label">Total Empleados</div><div class="value">${employeesReport.total_employees}</div></div>
      <div class="summary-card"><div class="label">Horas Totales</div><div class="value">${fmtHrs(employeesReport.total_hours_all)}</div></div>
      <div class="summary-card"><div class="label">Ventas Totales</div><div class="value green">${fmtCOP(employeesReport.total_sales_all)}</div></div>
      <div class="summary-card"><div class="label">Transacciones</div><div class="value">${employeesReport.total_transactions_all}</div></div>
    </div>`;
    const rows = employeesReport.employees.map((emp, i) => {
      const statusBadge = emp.is_active ? '<span class="badge badge-green">Activo</span>' : '<span class="badge badge-red">Inactivo</span>';
      return `<tr><td>${i + 1}</td><td>${emp.full_name}</td><td>${emp.role}</td><td class="text-right">${emp.total_shifts}</td><td class="text-right">${fmtHrs(emp.total_hours)}</td><td class="text-right">${fmtHrs(emp.avg_hours_per_shift)}</td><td class="text-right green font-bold">${fmtCOP(emp.total_sales)}</td><td class="text-right">${emp.total_transactions}</td><td class="text-right">${fmtCOP(emp.avg_sales_per_shift)}</td><td class="text-right">${emp.points}</td><td>${statusBadge}</td></tr>`;
    }).join('');
    const tableHTML = `<div class="section-title">Detalle por Empleado</div><table><tr><th>#</th><th>Empleado</th><th>Rol</th><th class="text-right">Turnos</th><th class="text-right">Horas</th><th class="text-right">Prom Hrs</th><th class="text-right">Ventas</th><th class="text-right">Trans.</th><th class="text-right">Prom Vta</th><th class="text-right">Pts</th><th>Estado</th></tr>${rows}</table>`;
    openPDFWindow('Reporte de Empleados', `${startDate} al ${endDate}`, summary, tableHTML);
  };

  const handleExportPurchasesPDF = () => {
    if (!purchasesReport) return;
    const summary = `<div class="summary">
      <div class="summary-card"><div class="label">Total Compras</div><div class="value">${purchasesReport.total_purchases}</div></div>
      <div class="summary-card"><div class="label">Cantidad Total</div><div class="value">${purchasesReport.total_quantity}</div></div>
      <div class="summary-card"><div class="label">Costo Total</div><div class="value blue">${fmtCOP(purchasesReport.total_cost)}</div></div>
    </div>`;
    const rows = purchasesReport.purchases.map((p: any, idx: number) => `<tr><td>${idx + 1}</td><td>${p.date}</td><td class="font-mono">${p.product_code}</td><td>${p.product_name}</td><td>${p.location_name}</td><td class="text-right">${p.quantity}</td><td class="text-right">${fmtCOP(p.unit_cost)}</td><td class="text-right font-bold">${fmtCOP(p.total_cost)}</td><td>${p.registered_by}</td><td>${p.notes || '-'}</td></tr>`).join('');
    const totalRow = `<tr class="total-row"><td colspan="5">TOTAL</td><td class="text-right">${purchasesReport.total_quantity}</td><td></td><td class="text-right blue">${fmtCOP(purchasesReport.total_cost)}</td><td colspan="2"></td></tr>`;
    const tableHTML = `<div class="section-title">Detalle de Compras</div><table><tr><th>#</th><th>Fecha</th><th>Codigo</th><th>Producto</th><th>Ubicacion</th><th class="text-right">Cant.</th><th class="text-right">C. Unit.</th><th class="text-right">C. Total</th><th>Registrado</th><th>Notas</th></tr>${rows}${totalRow}</table>`;
    openPDFWindow('Reporte de Compras', `${startDate} al ${endDate}`, summary, tableHTML);
  };

  const handleExportProfitabilityPDF = () => {
    if (!profitabilityReport) return;
    const s = profitabilityReport.summary;
    const pct = (val: number) => s.total_sales > 0 ? `${(val / s.total_sales * 100).toFixed(1)}%` : '0%';
    const summary = `<div class="summary">
      <div class="summary-card"><div class="label">Ventas Totales</div><div class="value">${fmtCOP(s.total_sales)}</div><div class="sub">${s.total_transactions} transacciones</div></div>
      <div class="summary-card"><div class="label">Costo Productos</div><div class="value red">${fmtCOP(s.total_cost_of_goods)}</div></div>
      <div class="summary-card"><div class="label">Utilidad Bruta</div><div class="value ${s.gross_profit >= 0 ? 'green' : 'red'}">${fmtCOP(s.gross_profit)}</div><div class="sub">Margen: ${s.gross_margin_pct}%</div></div>
      <div class="summary-card"><div class="label">Utilidad Neta</div><div class="value ${s.net_profit >= 0 ? 'green' : 'red'}">${fmtCOP(s.net_profit)}</div><div class="sub">Margen: ${s.net_margin_pct}%</div></div>
    </div>`;
    // Breakdown table
    let expenseRows = Object.entries(s.expenses_by_category).map(([cat, amount]) => `<tr><td style="padding-left:24px;color:#888;">${cat}</td><td class="text-right" style="color:#888;">${fmtCOP(amount as number)}</td><td class="text-right" style="color:#aaa;">${pct(amount as number)}</td></tr>`).join('');
    let lossRows = Object.entries(s.losses_by_type).map(([type, amount]) => `<tr><td style="padding-left:24px;color:#888;">${type}</td><td class="text-right" style="color:#888;">${fmtCOP(amount as number)}</td><td class="text-right" style="color:#aaa;">${pct(amount as number)}</td></tr>`).join('');
    const breakdownHTML = `<div class="section-title">Desglose de Rentabilidad</div><table>
      <tr><th style="width:50%">Concepto</th><th class="text-right">Monto</th><th class="text-right">% Ventas</th></tr>
      <tr><td class="green font-bold">Ventas Totales</td><td class="text-right green font-bold">${fmtCOP(s.total_sales)}</td><td class="text-right">100%</td></tr>
      <tr><td class="red">(-) Costo Productos</td><td class="text-right red">${fmtCOP(s.total_cost_of_goods)}</td><td class="text-right red">${pct(s.total_cost_of_goods)}</td></tr>
      <tr class="total-row"><td class="${s.gross_profit >= 0 ? 'green' : 'red'}">= Utilidad Bruta</td><td class="text-right ${s.gross_profit >= 0 ? 'green' : 'red'}">${fmtCOP(s.gross_profit)}</td><td class="text-right">${s.gross_margin_pct}%</td></tr>
      <tr><td class="red">(-) Gastos Operacionales</td><td class="text-right red">${fmtCOP(s.total_expenses)}</td><td class="text-right red">${pct(s.total_expenses)}</td></tr>
      ${expenseRows}
      <tr><td class="red">(-) Mermas / Perdidas</td><td class="text-right red">${fmtCOP(s.total_losses)}</td><td class="text-right red">${pct(s.total_losses)}</td></tr>
      ${lossRows}
      <tr style="background:${s.net_profit >= 0 ? '#f0fdf4' : '#fef2f2'};font-weight:700;font-size:10px;"><td class="${s.net_profit >= 0 ? 'green' : 'red'}">= UTILIDAD NETA</td><td class="text-right ${s.net_profit >= 0 ? 'green' : 'red'}">${fmtCOP(s.net_profit)}</td><td class="text-right">${s.net_margin_pct}%</td></tr>
    </table>`;
    // Daily breakdown
    let dailyHTML = '';
    if (profitabilityReport.by_day.length > 0) {
      const dayRows = profitabilityReport.by_day.map(day => `<tr><td class="font-mono">${day.date}</td><td class="text-right green">${fmtCOP(day.sales)}</td><td class="text-right red">${fmtCOP(day.cost_of_goods)}</td><td class="text-right red">${fmtCOP(day.expenses)}</td><td class="text-right red">${fmtCOP(day.losses)}</td><td class="text-right ${day.gross_profit >= 0 ? 'green' : 'red'}">${fmtCOP(day.gross_profit)}</td><td class="text-right font-bold ${day.net_profit >= 0 ? 'green' : 'red'}">${fmtCOP(day.net_profit)}</td></tr>`).join('');
      const totalDayRow = `<tr class="total-row"><td>TOTAL</td><td class="text-right green">${fmtCOP(s.total_sales)}</td><td class="text-right red">${fmtCOP(s.total_cost_of_goods)}</td><td class="text-right red">${fmtCOP(s.total_expenses)}</td><td class="text-right red">${fmtCOP(s.total_losses)}</td><td class="text-right ${s.gross_profit >= 0 ? 'green' : 'red'}">${fmtCOP(s.gross_profit)}</td><td class="text-right ${s.net_profit >= 0 ? 'green' : 'red'}">${fmtCOP(s.net_profit)}</td></tr>`;
      dailyHTML = `<div class="section-title">Detalle Diario</div><table><tr><th>Fecha</th><th class="text-right">Ventas</th><th class="text-right">Costo</th><th class="text-right">Gastos</th><th class="text-right">Mermas</th><th class="text-right">U. Bruta</th><th class="text-right">U. Neta</th></tr>${dayRows}${totalDayRow}</table>`;
    }
    openPDFWindow('Reporte de Rentabilidad', `${startDate} al ${endDate}`, summary, breakdownHTML + dailyHTML);
  };

  const loadCashCloses = async () => {
    setIsLoading(true);
    try {
      const data = await getCashCloses({
        start_date: startDate,
        end_date: endDate,
        location_id: selectedLocation ? parseInt(selectedLocation) : undefined,
      });
      setCashCloses(data);
    } catch (error) {
      console.error('Error loading cash closes:', error);
      toast.error('Error al cargar cierres de caja');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCashClose = async () => {
    if (!cashCloseForm.location_id) return;
    try {
      const totalSales = parseFloat(cashCloseForm.total_sales || '0');
      const totalCash = parseFloat(cashCloseForm.total_cash_sales || '0');
      const totalCard = parseFloat(cashCloseForm.total_card_sales || '0');
      const totalTransfer = parseFloat(cashCloseForm.total_transfer_sales || '0');
      const baseAmount = parseFloat(cashCloseForm.base_amount || '0');
      const declaredCash = parseFloat(cashCloseForm.declared_cash || '0');
      const expectedCash = baseAmount + totalCash;
      const difference = declaredCash - expectedCash;
      await createCashClose({
        location_id: parseInt(cashCloseForm.location_id),
        close_date: cashCloseForm.close_date,
        total_sales: totalSales,
        total_cash_sales: totalCash,
        total_card_sales: totalCard,
        total_transfer_sales: totalTransfer,
        total_transactions: parseInt(cashCloseForm.total_transactions || '0'),
        base_amount: baseAmount,
        expected_cash: expectedCash,
        declared_cash: declaredCash,
        difference: difference,
        notes: cashCloseForm.notes || undefined,
      });
      setShowCashCloseForm(false);
      setCashCloseForm({ location_id: '', close_date: toColombiaDate(), total_sales: '', total_cash_sales: '', total_card_sales: '', total_transfer_sales: '', total_transactions: '', base_amount: '', declared_cash: '', notes: '' });
      loadCashCloses();
    } catch (error) {
      console.error('Error creating cash close:', error);
      toast.error('Error al crear cierre de caja');
    }
  };

  const handleDeleteCashClose = (id: number) => {
    setDeleteConfirmId(id);
  };

  const doDeleteCashClose = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteCashClose(deleteConfirmId);
      loadCashCloses();
    } catch (error) {
      console.error('Error deleting cash close:', error);
      toast.error('Error al eliminar cierre de caja');
    }
    setDeleteConfirmId(null);
  };

  const handleExportCashClosesExcel = () => {
    if (cashCloses.length === 0) return;
    const headers = ['Fecha', 'Sucursal', 'Responsable', 'Ventas Totales', 'Efectivo', 'Tarjeta', 'Transferencia', 'Transacciones', 'Base', 'Esperado', 'Declarado', 'Diferencia', 'Notas'];
    const rows = cashCloses.map(c => [
      new Date(c.close_date).toLocaleDateString('es-CO'),
      c.location_name || '',
      c.user_name || '',
      c.total_sales,
      c.total_cash_sales,
      c.total_card_sales,
      c.total_transfer_sales,
      c.total_transactions,
      c.base_amount,
      c.expected_cash,
      c.declared_cash,
      c.difference,
      c.notes || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cierres_caja_${startDate}_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportCashClosesPDF = () => {
    if (cashCloses.length === 0) return;
    const totalSales = cashCloses.reduce((s, c) => s + c.total_sales, 0);
    const totalDeclared = cashCloses.reduce((s, c) => s + c.declared_cash, 0);
    const totalDiff = cashCloses.reduce((s, c) => s + c.difference, 0);
    const totalTx = cashCloses.reduce((s, c) => s + c.total_transactions, 0);
    const summary = `<div class="summary">
      <div class="summary-card"><div class="label">Total Cierres</div><div class="value blue">${cashCloses.length}</div></div>
      <div class="summary-card"><div class="label">Ventas Totales</div><div class="value green">${fmtCOP(totalSales)}</div></div>
      <div class="summary-card"><div class="label">Total Declarado</div><div class="value purple">${fmtCOP(totalDeclared)}</div></div>
      <div class="summary-card"><div class="label">Diferencia Neta</div><div class="value ${totalDiff >= 0 ? 'green' : 'red'}">${fmtCOP(totalDiff)}</div></div>
      <div class="summary-card"><div class="label">Transacciones</div><div class="value blue">${totalTx}</div></div>
    </div>`;
    const rows = cashCloses.map(c => {
      const diffClass = c.difference > 0 ? 'badge-green' : c.difference < 0 ? 'badge-red' : 'badge-gray';
      const diffLabel = c.difference > 0 ? 'Sobra' : c.difference < 0 ? 'Falta' : 'Exacto';
      return `<tr><td>${new Date(c.close_date).toLocaleDateString('es-CO')}</td><td>${c.location_name || '-'}</td><td>${c.user_name || '-'}</td><td class="text-right font-mono">${fmtCOP(c.total_sales)}</td><td class="text-right font-mono">${fmtCOP(c.base_amount)}</td><td class="text-right font-mono">${fmtCOP(c.expected_cash)}</td><td class="text-right font-mono">${fmtCOP(c.declared_cash)}</td><td class="text-right"><span class="badge ${diffClass}">${diffLabel} ${fmtCOP(Math.abs(c.difference))}</span></td><td>${c.notes || ''}</td></tr>`;
    }).join('');
    const tableHTML = `<div class="section-title">Detalle de Cierres de Caja</div><table><tr><th>Fecha</th><th>Sucursal</th><th>Responsable</th><th class="text-right">Ventas</th><th class="text-right">Base</th><th class="text-right">Esperado</th><th class="text-right">Declarado</th><th class="text-right">Diferencia</th><th>Notas</th></tr>${rows}</table>`;
    openPDFWindow('Reporte de Cierres de Caja', `${startDate} al ${endDate}`, summary, tableHTML);
  };

  const handleExportDeliveriesPDF = () => {
    if (deliveriesData.length === 0) return;
    const totalSales = deliveriesData.reduce((sum, d) => sum + d.grand_total, 0);
    const totalFees = deliveriesData.reduce((sum, d) => sum + d.delivery_fee, 0);
    const delivered = deliveriesData.filter(d => d.delivery_status === 'delivered').length;
    const summary = `<div class="summary">
      <div class="summary-card"><div class="label">Total Pedidos</div><div class="value purple">${deliveriesData.length}</div></div>
      <div class="summary-card"><div class="label">Total Ventas</div><div class="value green">${fmtCOP(totalSales)}</div></div>
      <div class="summary-card"><div class="label">Total Domicilios</div><div class="value blue">${fmtCOP(totalFees)}</div></div>
      <div class="summary-card"><div class="label">Entregados</div><div class="value green">${delivered} / ${deliveriesData.length}</div></div>
    </div>`;
    const statusLabel = (s?: string) => s === 'pending' ? 'Pendiente' : s === 'preparing' ? 'Preparando' : s === 'in_transit' ? 'En Camino' : s === 'delivered' ? 'Entregado' : 'Cancelado';
    const statusClass = (s?: string) => s === 'delivered' ? 'badge-green' : s === 'cancelled' ? 'badge-red' : s === 'in_transit' ? 'badge-blue' : s === 'preparing' ? 'badge-yellow' : 'badge-yellow';
    const payLabel = (m: string) => m === 'cash' ? 'Efectivo' : m === 'card' ? 'Tarjeta' : 'Transfer.';
    const rows = deliveriesData.map(d => `<tr>
      <td class="font-mono">${d.folio}</td><td>${new Date(d.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
      <td>${d.customer_name}</td><td>${d.customer_phone || ''}</td>
      <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;">${d.customer_address || ''}</td>
      <td>${d.delivery_person || '-'}</td>
      <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;">${d.items.map(i => `${i.product_name} x${i.quantity}`).join(', ')}</td>
      <td class="text-right">${fmtCOP(d.total)}</td><td class="text-right">${fmtCOP(d.delivery_fee)}</td>
      <td class="text-right font-bold">${fmtCOP(d.grand_total)}</td>
      <td>${payLabel(d.payment_method)}</td>
      <td><span class="badge ${statusClass(d.delivery_status)}">${statusLabel(d.delivery_status)}</span></td>
    </tr>`).join('');
    const tableHTML = `<div class="section-title">Detalle de Domicilios</div><table><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Tel.</th><th>Direccion</th><th>Domicil.</th><th>Productos</th><th class="text-right">Subtotal</th><th class="text-right">Domic.</th><th class="text-right">Total</th><th>Pago</th><th>Estado</th></tr>${rows}</table>`;
    openPDFWindow('Reporte de Domicilios', `${startDate} al ${endDate}`, summary, tableHTML);
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

  const setDateRange = (range: 'today' | 'week' | 'month' | 'last30') => {
    const todayStr = toColombiaDate();
    setEndDate(todayStr);
    const todayParts = todayStr.split('-').map(Number);
    const today = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);
    if (range === 'today') {
      setStartDate(todayStr);
    } else if (range === 'week') {
      const d = new Date(today);
      d.setDate(d.getDate() - d.getDay());
      setStartDate(toColombiaDate(d));
    } else if (range === 'month') {
      setStartDate(`${todayStr.split('-')[0]}-${todayStr.split('-')[1]}-01`);
    } else if (range === 'last30') {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      setStartDate(toColombiaDate(d));
    }
  };

  const DateFilters = ({ onGenerate, showLocation = true, extraButtons }: {
    onGenerate: () => void;
    showLocation?: boolean;
    extraButtons?: React.ReactNode;
  }) => (
    <div className="space-y-3 mb-6">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setDateRange('today')} className="text-xs">Hoy</Button>
        <Button variant="outline" size="sm" onClick={() => setDateRange('week')} className="text-xs">Esta Semana</Button>
        <Button variant="outline" size="sm" onClick={() => setDateRange('month')} className="text-xs">Este Mes</Button>
        <Button variant="outline" size="sm" onClick={() => setDateRange('last30')} className="text-xs">Últimos 30 días</Button>
      </div>
      <div className="flex flex-wrap gap-4 items-end">
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
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="sales">
        <TabsList className="mb-4">
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="employees">Empleados</TabsTrigger>
          <TabsTrigger value="purchases">Compras</TabsTrigger>
          <TabsTrigger value="profitability">Rentabilidad</TabsTrigger>
          <TabsTrigger value="deliveries">Domicilios</TabsTrigger>
          <TabsTrigger value="cash-close">Caja</TabsTrigger>
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
                  <>
                    <Button variant="outline" onClick={handleExportSalesExcel} disabled={!salesReport}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Excel
                    </Button>
                    <Button variant="outline" onClick={handleExportSalesPDF} disabled={!salesReport}>
                      <FileText className="w-4 h-4 mr-2" />
                      Exportar PDF
                    </Button>
                  </>
                }
              />

              {salesReport && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
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
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Nequi</p>
                        <p className="text-2xl font-bold text-indigo-600">{formatCurrency(salesReport.total_nequi || 0)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Bre-B</p>
                        <p className="text-2xl font-bold text-pink-600">{formatCurrency(salesReport.total_breb || 0)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Payment methods chart */}
                  {(() => {
                    const paymentData = [
                      { name: 'Efectivo', value: salesReport.total_cash || salesReport.summary?.cash_sales || 0 },
                      { name: 'Tarjeta', value: salesReport.total_card || salesReport.summary?.card_sales || 0 },
                      { name: 'Nequi', value: salesReport.total_nequi || 0 },
                      { name: 'Bre-B', value: salesReport.total_breb || 0 },
                    ].filter(d => d.value > 0);
                    const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
                    return paymentData.length > 0 ? (
                      <div className="mb-6">
                        <h4 className="font-semibold mb-3">Ventas por Método de Pago</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(v: number) => formatCurrency(v)} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex flex-col justify-center space-y-2">
                            {paymentData.map((d, i) => (
                              <div key={d.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                  <span className="text-sm">{d.name}</span>
                                </div>
                                <span className="font-bold text-sm">{formatCurrency(d.value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}

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
                                      d.payment_method === 'nequi' ? 'bg-indigo-100 text-indigo-700' :
                                      d.payment_method === 'breb' ? 'bg-pink-100 text-pink-700' :
                                      'bg-purple-100 text-purple-700'
                                    }`}>
                                      {d.payment_method === 'cash' ? 'Efectivo' : d.payment_method === 'card' ? 'Tarjeta' : d.payment_method === 'nequi' ? 'Nequi' : d.payment_method === 'breb' ? 'Bre-B' : 'Transferencia'}
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
                    Exportar Excel
                  </Button>
                  <Button variant="outline" onClick={handleExportInventoryPDF} disabled={!inventoryReport}>
                    <FileText className="w-4 h-4 mr-2" />
                    Exportar PDF
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
              <DateFilters
                onGenerate={loadEmployeesReport}
                showLocation={false}
                extraButtons={
                  <>
                    <div className="-mb-0">
                      <Select value={selectedEmployee || "all"} onValueChange={(v) => setSelectedEmployee(v === "all" ? "" : v)}>
                        <SelectTrigger className="w-56">
                          <SelectValue placeholder="Todos los empleados" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los empleados</SelectItem>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id.toString()}>{u.full_name} (@{u.username})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" onClick={handleExportEmployeesExcel} disabled={!employeesReport}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Excel
                    </Button>
                    <Button variant="outline" onClick={handleExportEmployeesPDF} disabled={!employeesReport}>
                      <FileText className="w-4 h-4 mr-2" />
                      Exportar PDF
                    </Button>
                  </>
                }
              />

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

                  {/* Employee sales chart */}
                  {employeesReport.employees.length > 1 && (
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">Ventas por Empleado</h4>
                      <ResponsiveContainer width="100%" height={Math.max(200, employeesReport.employees.length * 40)}>
                        <BarChart data={employeesReport.employees.slice().sort((a, b) => b.total_sales - a.total_sales)} layout="vertical" margin={{ left: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="full_name" tick={{ fontSize: 11 }} width={75} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="total_sales" name="Ventas" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

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
        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Reporte de Compras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DateFilters
                onGenerate={loadPurchasesReport}
                showLocation={true}
                extraButtons={
                  <>
                    <Button variant="outline" onClick={handleExportPurchasesExcel} disabled={!purchasesReport}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Excel
                    </Button>
                    <Button variant="outline" onClick={handleExportPurchasesPDF} disabled={!purchasesReport}>
                      <FileText className="w-4 h-4 mr-2" />
                      Exportar PDF
                    </Button>
                  </>
                }
              />
              {isLoading ? (
                <div className="text-center py-8">Cargando...</div>
              ) : (
                <>
                  {purchasesReport && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card>
                          <CardContent className="pt-4">
                            <div className="text-sm text-gray-500">Total Compras</div>
                            <div className="text-2xl font-bold">{purchasesReport.total_purchases}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <div className="text-sm text-gray-500">Cantidad Total</div>
                            <div className="text-2xl font-bold">{purchasesReport.total_quantity}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <div className="text-sm text-gray-500">Costo Total</div>
                            <div className="text-2xl font-bold text-blue-600">{formatCurrency(purchasesReport.total_cost)}</div>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>#</TableHead>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Codigo</TableHead>
                              <TableHead>Producto</TableHead>
                              <TableHead>Ubicacion</TableHead>
                              <TableHead className="text-right">Cantidad</TableHead>
                              <TableHead className="text-right">Costo Unit.</TableHead>
                              <TableHead className="text-right">Costo Total</TableHead>
                              <TableHead>Registrado por</TableHead>
                              <TableHead>Notas</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchasesReport.purchases.map((p: any, idx: number) => (
                              <TableRow key={p.id}>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>{p.date}</TableCell>
                                <TableCell className="font-mono">{p.product_code}</TableCell>
                                <TableCell>{p.product_name}</TableCell>
                                <TableCell>{p.location_name}</TableCell>
                                <TableCell className="text-right">{p.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(p.unit_cost)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(p.total_cost)}</TableCell>
                                <TableCell>{p.registered_by}</TableCell>
                                <TableCell className="text-gray-500 text-sm">{p.notes || '-'}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-gray-50 font-bold">
                              <TableCell colSpan={5}>TOTAL</TableCell>
                              <TableCell className="text-right">{purchasesReport.total_quantity}</TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-right text-blue-700">{formatCurrency(purchasesReport.total_cost)}</TableCell>
                              <TableCell colSpan={2}></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitability">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Reporte de Rentabilidad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DateFilters
                onGenerate={loadProfitabilityReport}
                extraButtons={
                  <>
                    <Button variant="outline" onClick={handleExportProfitabilityExcel} disabled={!profitabilityReport}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Excel
                    </Button>
                    <Button variant="outline" onClick={handleExportProfitabilityPDF} disabled={!profitabilityReport}>
                      <FileText className="w-4 h-4 mr-2" />
                      Exportar PDF
                    </Button>
                  </>
                }
              />

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

                  {/* Profitability chart */}
                  {profitabilityReport.by_day.length > 1 && (
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">Tendencia de Rentabilidad</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={profitabilityReport.by_day.map(d => ({
                          ...d,
                          date: new Date(d.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Legend />
                          <Line type="monotone" dataKey="sales" name="Ventas" stroke="#10b981" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="net_profit" name="Utilidad Neta" stroke="#3b82f6" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="gross_profit" name="Utilidad Bruta" stroke="#f59e0b" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

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
        {/* ===== DOMICILIOS ===== */}
        <TabsContent value="deliveries">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bike className="w-5 h-5" />
                Reporte de Domicilios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-6">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDateRange('today')} className="text-xs">Hoy</Button>
                  <Button variant="outline" size="sm" onClick={() => setDateRange('week')} className="text-xs">Esta Semana</Button>
                  <Button variant="outline" size="sm" onClick={() => setDateRange('month')} className="text-xs">Este Mes</Button>
                  <Button variant="outline" size="sm" onClick={() => setDateRange('last30')} className="text-xs">Últimos 30 días</Button>
                </div>
                <div className="flex flex-wrap gap-4 items-end">
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
                    <label className="text-sm text-gray-500">Estado</label>
                    <Select value={deliveryStatusFilter} onValueChange={setDeliveryStatusFilter}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="preparing">Preparando</SelectItem>
                        <SelectItem value="in_transit">En Camino</SelectItem>
                        <SelectItem value="delivered">Entregado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button onClick={loadDeliveriesReport} disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generar'}
                    </Button>
                    <Button variant="outline" onClick={handleExportDeliveriesExcel} disabled={deliveriesData.length === 0}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Excel
                    </Button>
                    <Button variant="outline" onClick={handleExportDeliveriesPDF} disabled={deliveriesData.length === 0}>
                      <FileText className="w-4 h-4 mr-2" />
                      Exportar PDF
                    </Button>
                  </div>
                </div>
              </div>

              {deliveriesData.length > 0 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Total Pedidos</p>
                        <p className="text-2xl font-bold text-purple-600">{deliveriesData.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Total Ventas</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(deliveriesData.reduce((sum, d) => sum + d.grand_total, 0))}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Total Domicilios</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(deliveriesData.reduce((sum, d) => sum + d.delivery_fee, 0))}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Entregados</p>
                        <p className="text-2xl font-bold text-green-600">
                          {deliveriesData.filter(d => d.delivery_status === 'delivered').length} / {deliveriesData.length}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Folio</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Telefono</TableHead>
                          <TableHead>Direccion</TableHead>
                          <TableHead>Domiciliario</TableHead>
                          <TableHead>Productos</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead>Domicilio</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Pago</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deliveriesData.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-mono text-xs">{d.folio}</TableCell>
                            <TableCell className="text-xs">{new Date(d.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                            <TableCell className="font-medium text-sm">{d.customer_name}</TableCell>
                            <TableCell className="text-xs">
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" />{d.customer_phone}</span>
                            </TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />{d.customer_address}</span>
                            </TableCell>
                            <TableCell className="text-sm">{d.delivery_person || '-'}</TableCell>
                            <TableCell className="text-xs">
                              {d.items.map(i => `${i.product_name} x${i.quantity}`).join(', ')}
                            </TableCell>
                            <TableCell className="text-sm">{formatCurrency(d.total)}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(d.delivery_fee)}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(d.grand_total)}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                d.payment_method === 'cash' ? 'bg-green-100 text-green-700' :
                                d.payment_method === 'card' ? 'bg-blue-100 text-blue-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {d.payment_method === 'cash' ? 'Efectivo' : d.payment_method === 'card' ? 'Tarjeta' : 'Transfer'}
                              </span>
                            </TableCell>
                            <TableCell>{getDeliveryStatusBadge(d.delivery_status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {deliveriesData.length === 0 && !isLoading && (
                <div className="text-center py-12 text-gray-400">
                  <Bike className="w-12 h-12 mx-auto mb-3" />
                  <p>Genera el reporte para ver los domicilios</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* ===== CAJA ===== */}
        <TabsContent value="cash-close">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Cierres de Caja
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DateFilters
                onGenerate={loadCashCloses}
                extraButtons={
                  <>
                    <Button variant="outline" onClick={() => setShowCashCloseForm(!showCashCloseForm)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Cierre
                    </Button>
                    <Button variant="outline" onClick={handleExportCashClosesExcel} disabled={cashCloses.length === 0}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Excel
                    </Button>
                    <Button variant="outline" onClick={handleExportCashClosesPDF} disabled={cashCloses.length === 0}>
                      <FileText className="w-4 h-4 mr-2" />
                      Exportar PDF
                    </Button>
                  </>
                }
              />

              {showCashCloseForm && (
                <Card className="mb-6 border-2 border-blue-200">
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-3">Registrar Cierre de Caja</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-gray-500">Sucursal *</label>
                        <Select value={cashCloseForm.location_id || "none"} onValueChange={(v) => setCashCloseForm({ ...cashCloseForm, location_id: v === "none" ? "" : v })}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Seleccionar</SelectItem>
                            {locations.map(l => (
                              <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Fecha</label>
                        <Input type="date" value={cashCloseForm.close_date} onChange={(e) => setCashCloseForm({ ...cashCloseForm, close_date: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Total Ventas</label>
                        <Input type="number" placeholder="0" value={cashCloseForm.total_sales} onChange={(e) => setCashCloseForm({ ...cashCloseForm, total_sales: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Transacciones</label>
                        <Input type="number" placeholder="0" value={cashCloseForm.total_transactions} onChange={(e) => setCashCloseForm({ ...cashCloseForm, total_transactions: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-gray-500">Ventas Efectivo</label>
                        <Input type="number" placeholder="0" value={cashCloseForm.total_cash_sales} onChange={(e) => setCashCloseForm({ ...cashCloseForm, total_cash_sales: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Ventas Tarjeta</label>
                        <Input type="number" placeholder="0" value={cashCloseForm.total_card_sales} onChange={(e) => setCashCloseForm({ ...cashCloseForm, total_card_sales: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Ventas Transferencia</label>
                        <Input type="number" placeholder="0" value={cashCloseForm.total_transfer_sales} onChange={(e) => setCashCloseForm({ ...cashCloseForm, total_transfer_sales: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Base Diaria</label>
                        <Input type="number" placeholder="0" value={cashCloseForm.base_amount} onChange={(e) => setCashCloseForm({ ...cashCloseForm, base_amount: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-gray-500">Dinero Declarado</label>
                        <Input type="number" placeholder="0" value={cashCloseForm.declared_cash} onChange={(e) => setCashCloseForm({ ...cashCloseForm, declared_cash: e.target.value })} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs text-gray-500">Notas</label>
                        <Input placeholder="Observaciones..." value={cashCloseForm.notes} onChange={(e) => setCashCloseForm({ ...cashCloseForm, notes: e.target.value })} />
                      </div>
                      <div className="flex items-end">
                        <Button onClick={handleCreateCashClose} disabled={!cashCloseForm.location_id} className="w-full">
                          Guardar Cierre
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {cashCloses.length > 0 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Total Cierres</p>
                        <p className="text-2xl font-bold text-blue-600">{cashCloses.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Ventas Totales</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(cashCloses.reduce((s, c) => s + c.total_sales, 0))}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Total Declarado</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatCurrency(cashCloses.reduce((s, c) => s + c.declared_cash, 0))}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Diferencia Neta</p>
                        <p className={`text-2xl font-bold ${cashCloses.reduce((s, c) => s + c.difference, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(cashCloses.reduce((s, c) => s + c.difference, 0))}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">Transacciones</p>
                        <p className="text-2xl font-bold text-gray-700">
                          {cashCloses.reduce((s, c) => s + c.total_transactions, 0)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Sucursal</TableHead>
                          <TableHead>Responsable</TableHead>
                          <TableHead className="text-right">Ventas</TableHead>
                          <TableHead className="text-right">Base</TableHead>
                          <TableHead className="text-right">Esperado</TableHead>
                          <TableHead className="text-right">Declarado</TableHead>
                          <TableHead className="text-right">Diferencia</TableHead>
                          <TableHead>Notas</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cashCloses.map(c => (
                          <TableRow key={c.id}>
                            <TableCell className="text-sm">{new Date(c.close_date).toLocaleDateString('es-CO')}</TableCell>
                            <TableCell className="text-sm">{c.location_name || '-'}</TableCell>
                            <TableCell className="text-sm">{c.user_name || '-'}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrency(c.total_sales)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrency(c.base_amount)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrency(c.expected_cash)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrency(c.declared_cash)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={c.difference > 0 ? 'default' : c.difference < 0 ? 'destructive' : 'secondary'}>
                                {c.difference > 0 ? 'Sobra' : c.difference < 0 ? 'Falta' : 'Exacto'} {formatCurrency(Math.abs(c.difference))}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-gray-500 max-w-[150px] truncate">{c.notes || '-'}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteCashClose(c.id)}>
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {cashCloses.length === 0 && !isLoading && (
                <div className="text-center py-12 text-gray-400">
                  <Banknote className="w-12 h-12 mx-auto mb-3" />
                  <p>Genera el reporte para ver los cierres de caja</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
        title="Eliminar cierre de caja"
        description="¿Estás seguro de eliminar este cierre de caja?"
        confirmLabel="Sí, eliminar"
        cancelLabel="No, cancelar"
        variant="danger"
        onConfirm={doDeleteCashClose}
      />
    </div>
  );
};

export default Reports;

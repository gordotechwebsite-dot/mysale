import React, { useState, useEffect, useCallback } from 'react';
import { useShift } from '../context/ShiftContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Banknote, RefreshCw, Loader2, Receipt, Bike, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { getTickets, getSales, getDeliveries } from '../api';
import type { Ticket, Sale, Delivery } from '../types';

const Cash: React.FC = () => {
  const { currentShift } = useShift();
  const [openTickets, setOpenTickets] = useState<Ticket[]>([]);
  const [closedTickets, setClosedTickets] = useState<Ticket[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date().toLocaleDateString('en-CA');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [open, closed, daySales, dayDeliveries] = await Promise.all([
        getTickets({ state: 'open' }),
        getTickets({ state: 'closed', day: today }),
        getSales({ sale_type: 'regular', start_date: today, end_date: today, limit: 500 }),
        getDeliveries({ start_date: today, end_date: today, limit: 500 }),
      ]);
      setOpenTickets(open);
      setClosedTickets(closed);
      setSales(daySales);
      setDeliveries(dayDeliveries);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al cargar los movimientos de caja');
    } finally {
      setIsLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

  const getElapsed = (openedAt: string) => {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000));
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  };

  const paymentLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Efectivo';
      case 'card':
        return 'Tarjeta';
      case 'transfer':
        return 'Transferencia';
      default:
        return method;
    }
  };

  const deliveryStatusBadge = (status?: string) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-emerald-500">Entregado</Badge>;
      case 'in_transit':
        return <Badge className="bg-blue-500">En camino</Badge>;
      case 'preparing':
        return <Badge className="bg-amber-500">Preparando</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500">Cancelado</Badge>;
      default:
        return <Badge className="bg-gray-500">Pendiente</Badge>;
    }
  };

  const openTotal = openTickets.reduce((sum, t) => sum + t.total, 0);
  const closedTotal = closedTickets.reduce((sum, t) => sum + t.total, 0);
  const salesTotal = sales.reduce((sum, s) => sum + s.total, 0);
  const deliveriesTotal = deliveries.reduce((sum, d) => sum + d.grand_total, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Caja - Movimientos del Día</h1>
          {currentShift && (
            <p className="text-sm text-gray-500">
              Turno activo en {currentShift.location_name} · Efectivo esperado:{' '}
              {formatCurrency(currentShift.total_cash_sales + currentShift.initial_cash)}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Cuentas Abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{openTickets.length}</p>
            <p className="text-sm text-gray-500">{formatCurrency(openTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Cuentas Cerradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{closedTickets.length}</p>
            <p className="text-sm text-gray-500">{formatCurrency(closedTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Ventas Directas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{sales.length}</p>
            <p className="text-sm text-gray-500">{formatCurrency(salesTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Domicilios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{deliveries.length}</p>
            <p className="text-sm text-gray-500">{formatCurrency(deliveriesTotal)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="open">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="open">Abiertas ({openTickets.length})</TabsTrigger>
          <TabsTrigger value="closed">Cerradas ({closedTickets.length})</TabsTrigger>
          <TabsTrigger value="sales">Ventas ({sales.length})</TabsTrigger>
          <TabsTrigger value="deliveries">Domicilios ({deliveries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="open">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Cuentas Abiertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {openTickets.length === 0 ? (
                <p className="py-8 text-center text-gray-500">No hay cuentas abiertas</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mesa</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Mesero</TableHead>
                        <TableHead>Abierta</TableHead>
                        <TableHead>Tiempo</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openTickets.map(ticket => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium">
                            {ticket.table_name || `Cuenta #${ticket.id}`}
                            {ticket.status === 'to_pay' && (
                              <Badge className="ml-2 bg-amber-500">Por cobrar</Badge>
                            )}
                          </TableCell>
                          <TableCell>{ticket.customer_name || '-'}</TableCell>
                          <TableCell>{ticket.waiter_name || '-'}</TableCell>
                          <TableCell>{formatTime(ticket.opened_at)}</TableCell>
                          <TableCell>{getElapsed(ticket.opened_at)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(ticket.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closed">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Cuentas Cerradas Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              {closedTickets.length === 0 ? (
                <p className="py-8 text-center text-gray-500">No hay cuentas cerradas hoy</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mesa</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Mesero</TableHead>
                        <TableHead>Cerrada</TableHead>
                        <TableHead>Productos</TableHead>
                        <TableHead className="text-right">Propina</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closedTickets.map(ticket => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium">
                            {ticket.table_name || `Cuenta #${ticket.id}`}
                          </TableCell>
                          <TableCell>{ticket.customer_name || '-'}</TableCell>
                          <TableCell>{ticket.waiter_name || '-'}</TableCell>
                          <TableCell>{ticket.closed_at ? formatTime(ticket.closed_at) : '-'}</TableCell>
                          <TableCell>{ticket.items.length}</TableCell>
                          <TableCell className="text-right">{formatCurrency(ticket.tip || 0)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(ticket.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Ventas del Día
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sales.length === 0 ? (
                <p className="py-8 text-center text-gray-500">No hay ventas registradas hoy</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Folio</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Cajero</TableHead>
                        <TableHead>Pago</TableHead>
                        <TableHead>Productos</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map(sale => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{sale.folio}</TableCell>
                          <TableCell>{formatTime(sale.created_at)}</TableCell>
                          <TableCell>{sale.cashier_name || '-'}</TableCell>
                          <TableCell>{paymentLabel(sale.payment_method)}</TableCell>
                          <TableCell>{sale.items.length}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(sale.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bike className="w-5 h-5" />
                Domicilios del Día
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deliveries.length === 0 ? (
                <p className="py-8 text-center text-gray-500">No hay domicilios hoy</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Folio</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Domiciliario</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Domicilio</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.map(delivery => (
                        <TableRow key={delivery.id}>
                          <TableCell className="font-medium">{delivery.folio}</TableCell>
                          <TableCell>{formatTime(delivery.created_at)}</TableCell>
                          <TableCell>{delivery.customer_name || '-'}</TableCell>
                          <TableCell>{delivery.delivery_person || '-'}</TableCell>
                          <TableCell>{deliveryStatusBadge(delivery.delivery_status)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(delivery.delivery_fee)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(delivery.grand_total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Cash;

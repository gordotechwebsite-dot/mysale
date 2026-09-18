import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { getTickets, getSales, getDeliveries, getLocations, getShifts, voidSale } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import { canSelectLocation, getFixedLocationId } from '../lib/locationScope';
import { canVoidSales } from '../lib/roles';
import type { Ticket, Sale, Delivery, Location, Shift } from '../types';

const Cash: React.FC = () => {
  const { user } = useAuth();
  const canChooseLocation = canSelectLocation(user);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [openTickets, setOpenTickets] = useState<Ticket[]>([]);
  const [closedTickets, setClosedTickets] = useState<Ticket[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saleToVoid, setSaleToVoid] = useState<Sale | null>(null);
  const canVoid = canVoidSales(user);

  const today = new Date().toLocaleDateString('en-CA');

  const loadLocations = useCallback(async () => {
    try {
      const data = await getLocations();
      const posLocations = data.filter(l => l.location_type === 'pos');
      const fixedLocationId = getFixedLocationId(user);
      const visibleLocations = fixedLocationId
        ? posLocations.filter(l => l.id === fixedLocationId)
        : posLocations;
      setLocations(visibleLocations);
      if (visibleLocations.length > 0) {
        setSelectedLocation(current => current ?? visibleLocations[0].id);
      } else {
        setIsLoading(false);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al cargar las sedes');
      setIsLoading(false);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    if (!selectedLocation) return;
    try {
      setIsLoading(true);
      const [open, closed, daySales, dayDeliveries, dayShifts] = await Promise.all([
        getTickets({ state: 'open', location_id: selectedLocation }),
        getTickets({ state: 'closed', day: today, location_id: selectedLocation }),
        getSales({ sale_type: 'regular', start_date: today, end_date: today, limit: 500, location_id: selectedLocation }),
        getDeliveries({ start_date: today, end_date: today, limit: 500, location_id: selectedLocation }),
        getShifts({ location_id: selectedLocation, status: 'open' }),
      ]);
      setOpenTickets(open);
      setClosedTickets(closed);
      setSales(daySales);
      setDeliveries(dayDeliveries);
      setShifts(dayShifts);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al cargar los movimientos de caja');
    } finally {
      setIsLoading(false);
    }
  }, [today, selectedLocation]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVoidSale = async (sale: Sale) => {
    try {
      await voidSale(sale.id);
      toast.success(`Venta ${sale.folio} anulada`);
      loadData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'No se pudo anular la venta');
    } finally {
      setSaleToVoid(null);
    }
  };

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

  const selectedLocationName = locations.find(l => l.id === selectedLocation)?.name;
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
          <p className="text-sm text-gray-500">
            {selectedLocationName || 'Sin sede seleccionada'}
            {shifts.length === 0 && ' · Sin turno abierto'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canChooseLocation && (
            <Select
              value={selectedLocation?.toString() || ''}
              onValueChange={v => setSelectedLocation(parseInt(v))}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Seleccionar sede" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id.toString()}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {shifts.map(shift => (
        <Card key={shift.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="w-5 h-5" />
              Turno de {shift.user_name || 'cajero'} · abierto {formatTime(shift.start_time)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <div>
                <p className="text-sm text-gray-500">Base inicial</p>
                <p className="font-semibold">{formatCurrency(shift.initial_cash)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Efectivo</p>
                <p className="font-semibold">{formatCurrency(shift.total_cash_sales)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tarjeta</p>
                <p className="font-semibold">{formatCurrency(shift.total_card_sales)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Transferencia</p>
                <p className="font-semibold">{formatCurrency(shift.total_transfer_sales)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Efectivo esperado</p>
                <p className="font-semibold text-emerald-600">
                  {formatCurrency(shift.initial_cash + shift.total_cash_sales)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

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
                        {canVoid && <TableHead className="text-right">Acciones</TableHead>}
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
                          {canVoid && (
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => setSaleToVoid(sale)}
                              >
                                Anular
                              </Button>
                            </TableCell>
                          )}
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

      <ConfirmDialog
        open={saleToVoid !== null}
        onOpenChange={open => { if (!open) setSaleToVoid(null); }}
        title="Anular venta"
        description={saleToVoid
          ? `Se anula la venta ${saleToVoid.folio} por ${formatCurrency(saleToVoid.total)}, se devuelve el inventario y se descuenta de la caja.`
          : ''}
        confirmLabel="Anular"
        variant="danger"
        onConfirm={() => { if (saleToVoid) handleVoidSale(saleToVoid); }}
      />
    </div>
  );
};

export default Cash;

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  getZonesWithTables,
  createZone,
  updateZone,
  deleteZone,
  createTable,
  updateTable,
  deleteTable,
  createTicket,
  getTableTicket,
  addItemsToTicket,
  removeItemFromTicket,
  createComanda,
  moveTicket,
  payTicket,
  generatePrecheck,
  getProducts,
  getLocations
} from '../api';
import type { ZoneWithTables, Table, Ticket, Product, Location } from '../types';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Settings,
  Users,
  Clock,
  CreditCard,
  Receipt,
  ArrowRightLeft,
  Trash2,
  Edit,
  X,
  Search,
  Minus,
  Send
} from 'lucide-react';

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  free: { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'Libre' },
  occupied: { bg: 'bg-emerald-700', border: 'border-emerald-800', text: 'Ocupada' },
  bill_open: { bg: 'bg-emerald-600', border: 'border-emerald-700', text: 'Cuenta Abierta' },
  to_pay: { bg: 'bg-amber-500', border: 'border-amber-600', text: 'Por Cobrar' },
  paid: { bg: 'bg-rose-400', border: 'border-rose-500', text: 'Pagada' },
};


interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

export default function TableManagement() {
  const { user } = useAuth();
  const isSuperuser = user?.role?.role_type === 'superuser';

  const [zones, setZones] = useState<ZoneWithTables[]>([]);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  const [editingZone, setEditingZone] = useState<ZoneWithTables | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);

  const [zoneName, setZoneName] = useState('');
  const [zoneColor, setZoneColor] = useState('#4ade80');
  const [tableName, setTableName] = useState('');
  const [tableCapacity, setTableCapacity] = useState(4);
  const [tableShape, setTableShape] = useState<'square' | 'round' | 'rectangle'>('square');

  const [customerName, setCustomerName] = useState('');
  const [numPeople, setNumPeople] = useState(1);
  const [ticketNotes, setTicketNotes] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [tip, setTip] = useState(0);

  const [moveTargetTable, setMoveTargetTable] = useState<number | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      loadZones();
      loadProducts();
    }
  }, [selectedLocation]);

  const loadLocations = async () => {
    try {
      const data = await getLocations();
      const posLocations = data.filter(l => l.location_type === 'pos');
      setLocations(posLocations);
      if (posLocations.length > 0) {
        setSelectedLocation(posLocations[0].id);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al cargar ubicaciones');
    }
  };

  const loadZones = async () => {
    if (!selectedLocation) return;
    setLoading(true);
    try {
      const data = await getZonesWithTables(selectedLocation);
      setZones(data);
      if (data.length > 0 && !selectedZone) {
        setSelectedZone(data[0].id);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al cargar zonas');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await getProducts({ location_id: selectedLocation || undefined });
      setProducts(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al cargar productos');
    }
  };

  const handleCreateZone = async () => {
    if (!zoneName || !selectedLocation) return;
    try {
      await createZone({
        name: zoneName,
        location_id: selectedLocation,
        color: zoneColor,
        display_order: zones.length
      });
      toast.success('Zona creada exitosamente');
      setShowZoneDialog(false);
      setZoneName('');
      setZoneColor('#4ade80');
      loadZones();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al crear zona');
    }
  };

  const handleUpdateZone = async () => {
    if (!editingZone) return;
    try {
      await updateZone(editingZone.id, {
        name: zoneName,
        color: zoneColor
      });
      toast.success('Zona actualizada');
      setShowZoneDialog(false);
      setEditingZone(null);
      loadZones();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al actualizar zona');
    }
  };

  const handleDeleteZone = async (zoneId: number) => {
    if (!confirm('¿Eliminar esta zona?')) return;
    try {
      await deleteZone(zoneId);
      toast.success('Zona eliminada');
      loadZones();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al eliminar zona');
    }
  };

  const handleCreateTable = async () => {
    if (!tableName || !selectedZone) return;
    try {
      await createTable({
        name: tableName,
        zone_id: selectedZone,
        capacity: tableCapacity,
        shape: tableShape,
        position_x: Math.random() * 400,
        position_y: Math.random() * 300
      });
      toast.success('Mesa creada exitosamente');
      setShowTableDialog(false);
      setTableName('');
      setTableCapacity(4);
      setTableShape('square');
      loadZones();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al crear mesa');
    }
  };

  const handleUpdateTable = async () => {
    if (!editingTable) return;
    try {
      await updateTable(editingTable.id, {
        name: tableName,
        capacity: tableCapacity,
        shape: tableShape
      });
      toast.success('Mesa actualizada');
      setShowTableDialog(false);
      setEditingTable(null);
      loadZones();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al actualizar mesa');
    }
  };

  const handleDeleteTable = async (tableId: number) => {
    if (!confirm('¿Eliminar esta mesa?')) return;
    try {
      await deleteTable(tableId);
      toast.success('Mesa eliminada');
      loadZones();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al eliminar mesa');
    }
  };

  const handleTableClick = async (table: Table) => {
    if (editMode) {
      setEditingTable(table);
      setTableName(table.name);
      setTableCapacity(table.capacity);
      setTableShape(table.shape);
      setShowTableDialog(true);
      return;
    }

    setSelectedTable(table);

    if (table.status === 'free') {
      setCustomerName('');
      setNumPeople(1);
      setTicketNotes('');
      setShowTicketDialog(true);
    } else if (table.current_ticket_id) {
      try {
        const ticket = await getTableTicket(table.id);
        setCurrentTicket(ticket);
        setCart([]);
        setShowTicketDialog(true);
      } catch (error: unknown) {
        const err = error as { response?: { data?: { detail?: string } } };
        toast.error(err.response?.data?.detail || 'Error al cargar cuenta');
      }
    }
  };

  const handleOpenTicket = async () => {
    if (!selectedTable || !selectedLocation) return;
    try {
      const ticket = await createTicket({
        table_id: selectedTable.id,
        location_id: selectedLocation,
        customer_name: customerName || undefined,
        num_people: numPeople,
        notes: ticketNotes || undefined
      });
      setCurrentTicket(ticket);
      toast.success('Cuenta abierta');
      loadZones();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al abrir cuenta');
    }
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1, notes: '' }]);
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleAddItemsToTicket = async () => {
    if (!currentTicket || cart.length === 0) return;
    try {
      const items = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.sale_price,
        notes: item.notes || undefined
      }));
      const updatedTicket = await addItemsToTicket(currentTicket.id, items);
      setCurrentTicket(updatedTicket);
      setCart([]);
      toast.success('Items agregados');
      loadZones();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al agregar items');
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!currentTicket) return;
    try {
      await removeItemFromTicket(currentTicket.id, itemId);
      const ticket = await getTableTicket(selectedTable!.id);
      setCurrentTicket(ticket);
      toast.success('Item eliminado');
      loadZones();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al eliminar item');
    }
  };

  const handleSendToKitchen = async () => {
    if (!currentTicket) return;
    const unsent = currentTicket.items.filter(item => !item.comanda_id && item.status !== 'cancelled');
    if (unsent.length === 0) {
      toast.error('No hay items para enviar');
      return;
    }
    try {
      await createComanda(currentTicket.id, {
        area: 'kitchen',
        item_ids: unsent.map(item => item.id)
      });
      const ticket = await getTableTicket(selectedTable!.id);
      setCurrentTicket(ticket);
      toast.success('Comanda enviada a cocina');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al enviar comanda');
    }
  };

  const handlePrecheck = async () => {
    if (!currentTicket) return;
    try {
      await generatePrecheck(currentTicket.id);
      toast.success('Precuenta generada');
      loadZones();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al generar precuenta');
    }
  };

  const handleOpenPayment = () => {
    if (!currentTicket) return;
    setPaymentAmount(currentTicket.total);
    setPaymentMethod('cash');
    setPaymentReference('');
    setTip(0);
    setShowPaymentDialog(true);
  };

  const handlePayTicket = async () => {
    if (!currentTicket) return;
    try {
      await payTicket(currentTicket.id, {
        payments: [{
          payment_method: paymentMethod,
          amount: paymentAmount,
          reference: paymentReference || undefined
        }],
        tip: tip || undefined
      });
      toast.success('Pago procesado exitosamente');
      setShowPaymentDialog(false);
      setShowTicketDialog(false);
      setCurrentTicket(null);
      setSelectedTable(null);
      loadZones();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al procesar pago');
    }
  };

  const handleMoveTicket = async () => {
    if (!currentTicket || !moveTargetTable) return;
    try {
      await moveTicket(currentTicket.id, moveTargetTable);
      toast.success('Cuenta movida exitosamente');
      setShowMoveDialog(false);
      setShowTicketDialog(false);
      setCurrentTicket(null);
      setSelectedTable(null);
      loadZones();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al mover cuenta');
    }
  };

  const currentZone = zones.find(z => z.id === selectedZone);
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.sale_price * item.quantity), 0);

  const freeTables = zones.flatMap(z => z.tables).filter(t => t.status === 'free' && t.id !== selectedTable?.id);

  if (loading && zones.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Gestión de Mesas</h1>
          <Select
            value={selectedLocation?.toString() || ''}
            onValueChange={(v) => setSelectedLocation(parseInt(v))}
          >
            <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Seleccionar ubicación" />
            </SelectTrigger>
            <SelectContent>
              {locations.map(loc => (
                <SelectItem key={loc.id} value={loc.id.toString()}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {isSuperuser && (
            <>
              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode(!editMode)}
                className={editMode ? "bg-amber-500 hover:bg-amber-600" : ""}
              >
                <Edit className="w-4 h-4 mr-2" />
                {editMode ? 'Salir Edición' : 'Editar'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingZone(null);
                  setZoneName('');
                  setZoneColor('#4ade80');
                  setShowZoneDialog(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Zona
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-700 bg-slate-800">
        {zones.map(zone => (
          <button
            key={zone.id}
            onClick={() => setSelectedZone(zone.id)}
            className={`px-6 py-3 font-medium transition-colors relative ${
              selectedZone === zone.id
                ? 'text-white'
                : 'text-slate-400 hover:text-white'
            }`}
            style={{
              backgroundColor: selectedZone === zone.id ? zone.color : 'transparent'
            }}
          >
            {zone.name}
            {editMode && isSuperuser && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingZone(zone);
                  setZoneName(zone.name);
                  setZoneColor(zone.color);
                  setShowZoneDialog(true);
                }}
                className="ml-2 text-white/70 hover:text-white"
              >
                <Settings className="w-4 h-4 inline" />
              </button>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 p-6 overflow-auto bg-slate-900">
        {editMode && isSuperuser && selectedZone && (
          <div className="mb-4 flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                setEditingTable(null);
                setTableName('');
                setTableCapacity(4);
                setTableShape('square');
                setShowTableDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Mesa
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDeleteZone(selectedZone)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar Zona
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {currentZone?.tables.map(table => {
            const status = statusColors[table.status] || statusColors.free;
            const isRound = table.shape === 'round';

            return (
              <div
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`
                  relative cursor-pointer transition-all transform hover:scale-105
                  ${isRound ? 'rounded-full' : 'rounded-xl'}
                  ${status.bg} ${status.border} border-2
                  shadow-lg hover:shadow-xl
                  min-h-[120px] flex flex-col items-center justify-center p-4
                `}
              >
                {table.pending_comandas && table.pending_comandas > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {table.pending_comandas}
                  </div>
                )}

                <span className="text-white font-bold text-xl">{table.name}</span>
                <span className="text-white/70 text-sm flex items-center gap-1 mt-1">
                  <Users className="w-3 h-3" />
                  {table.capacity}
                </span>

                {table.status !== 'free' && (
                  <div className="mt-2 text-center">
                    {table.ticket_time && (
                      <span className="text-white/80 text-xs flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        {table.ticket_time}
                      </span>
                    )}
                    {table.ticket_total !== undefined && table.ticket_total > 0 && (
                      <span className="text-white font-semibold text-sm">
                        ${table.ticket_total.toLocaleString()}
                      </span>
                    )}
                  </div>
                )}

                {editMode && isSuperuser && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTable(table.id);
                    }}
                    className="absolute top-1 right-1 text-white/50 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {(!currentZone || currentZone.tables.length === 0) && (
          <div className="text-center text-slate-500 py-12">
            {zones.length === 0 ? (
              <p>No hay zonas creadas. {isSuperuser && 'Crea una zona para comenzar.'}</p>
            ) : (
              <p>No hay mesas en esta zona. {isSuperuser && editMode && 'Agrega mesas usando el botón de arriba.'}</p>
            )}
          </div>
        )}
      </div>

      <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Editar Zona' : 'Nueva Zona'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="Ej: Terraza, Salón Principal"
                className="bg-slate-700 border-slate-600"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {['#4ade80', '#22d3ee', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c'].map(color => (
                  <button
                    key={color}
                    onClick={() => setZoneColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      zoneColor === color ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowZoneDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={editingZone ? handleUpdateZone : handleCreateZone}>
              {editingZone ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle>{editingTable ? 'Editar Mesa' : 'Nueva Mesa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="Ej: T1, Mesa 1"
                className="bg-slate-700 border-slate-600"
              />
            </div>
            <div>
              <Label>Capacidad</Label>
              <Input
                type="number"
                value={tableCapacity}
                onChange={(e) => setTableCapacity(parseInt(e.target.value) || 4)}
                min={1}
                className="bg-slate-700 border-slate-600"
              />
            </div>
            <div>
              <Label>Forma</Label>
              <Select value={tableShape} onValueChange={(v) => setTableShape(v as 'square' | 'round' | 'rectangle')}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Cuadrada</SelectItem>
                  <SelectItem value="round">Redonda</SelectItem>
                  <SelectItem value="rectangle">Rectangular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTableDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={editingTable ? handleUpdateTable : handleCreateTable}>
              {editingTable ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTicketDialog} onOpenChange={(open) => {
        if (!open) {
          setCurrentTicket(null);
          setSelectedTable(null);
          setCart([]);
        }
        setShowTicketDialog(open);
      }}>
        <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedTable?.name} - {currentTicket ? `Cuenta #${currentTicket.id}` : 'Abrir Cuenta'}</span>
              {currentTicket && (
                <span className="text-emerald-400 font-bold text-lg">
                  Total: ${currentTicket.total.toLocaleString()}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {!currentTicket ? (
            <div className="space-y-4">
              <div>
                <Label>Nombre del Cliente (opcional)</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <Label>Número de Personas</Label>
                <Input
                  type="number"
                  value={numPeople}
                  onChange={(e) => setNumPeople(parseInt(e.target.value) || 1)}
                  min={1}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <Label>Notas</Label>
                <Input
                  value={ticketNotes}
                  onChange={(e) => setTicketNotes(e.target.value)}
                  placeholder="Notas adicionales"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleOpenTicket}>
                  Abrir Cuenta
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="flex-1 flex gap-4 overflow-hidden">
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar productos..."
                    className="pl-10 bg-slate-700 border-slate-600"
                  />
                </div>
                <div className="flex-1 overflow-auto grid grid-cols-2 gap-2 content-start">
                  {filteredProducts.slice(0, 20).map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition-colors"
                    >
                      <div className="font-medium text-sm truncate">{product.name}</div>
                      <div className="text-emerald-400 font-bold">${product.sale_price.toLocaleString()}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-80 flex flex-col bg-slate-700 rounded-lg overflow-hidden">
                <div className="p-3 bg-slate-600 font-semibold">
                  Cuenta Actual
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-2">
                  {currentTicket.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-slate-800 rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.product_name}</div>
                        <div className="text-xs text-slate-400">
                          {item.quantity} x ${item.unit_price.toLocaleString()}
                          {item.comanda_id && <span className="ml-2 text-emerald-400">(Enviado)</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">${item.subtotal.toLocaleString()}</span>
                        {!item.comanda_id && (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {cart.length > 0 && (
                    <>
                      <div className="border-t border-slate-600 pt-2 mt-2">
                        <div className="text-xs text-amber-400 mb-2">Por agregar:</div>
                        {cart.map(item => (
                          <div key={item.product.id} className="flex items-center justify-between p-2 bg-amber-900/30 rounded mb-1">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{item.product.name}</div>
                              <div className="text-xs text-slate-400">
                                ${item.product.sale_price.toLocaleString()} c/u
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateCartQuantity(item.product.id, -1)}
                                className="w-6 h-6 bg-slate-600 rounded flex items-center justify-center"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateCartQuantity(item.product.id, 1)}
                                className="w-6 h-6 bg-slate-600 rounded flex items-center justify-center"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => removeFromCart(item.product.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="p-3 bg-slate-600 space-y-2">
                  {cart.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Por agregar:</span>
                      <span className="text-amber-400">${cartTotal.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span className="text-emerald-400">${(currentTicket.total + cartTotal).toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-3 grid grid-cols-2 gap-2">
                  {cart.length > 0 && (
                    <Button
                      size="sm"
                      className="col-span-2 bg-amber-500 hover:bg-amber-600"
                      onClick={handleAddItemsToTicket}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Items
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSendToKitchen}
                    disabled={currentTicket.items.filter(i => !i.comanda_id).length === 0}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Enviar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMoveTargetTable(null);
                      setShowMoveDialog(true);
                    }}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-1" />
                    Mover
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrecheck}
                  >
                    <Receipt className="w-4 h-4 mr-1" />
                    Precuenta
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600"
                    onClick={handleOpenPayment}
                  >
                    <CreditCard className="w-4 h-4 mr-1" />
                    Cobrar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle>Procesar Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-4 bg-slate-700 rounded-lg">
              <div className="text-sm text-slate-400">Total a Pagar</div>
              <div className="text-3xl font-bold text-emerald-400">
                ${currentTicket?.total.toLocaleString()}
              </div>
            </div>
            <div>
              <Label>Método de Pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monto</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="bg-slate-700 border-slate-600"
              />
            </div>
            {paymentMethod !== 'cash' && (
              <div>
                <Label>Referencia</Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Número de referencia"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            )}
            <div>
              <Label>Propina (opcional)</Label>
              <Input
                type="number"
                value={tip}
                onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
                className="bg-slate-700 border-slate-600"
              />
            </div>
            {paymentMethod === 'cash' && paymentAmount > (currentTicket?.total || 0) && (
              <div className="p-3 bg-emerald-900/30 rounded-lg">
                <div className="text-sm text-slate-400">Cambio</div>
                <div className="text-xl font-bold text-emerald-400">
                  ${(paymentAmount - (currentTicket?.total || 0)).toLocaleString()}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={handlePayTicket}
              disabled={paymentAmount < (currentTicket?.total || 0)}
            >
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle>Mover Cuenta a Otra Mesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Seleccionar Mesa Destino</Label>
              <Select
                value={moveTargetTable?.toString() || ''}
                onValueChange={(v) => setMoveTargetTable(parseInt(v))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue placeholder="Seleccionar mesa" />
                </SelectTrigger>
                <SelectContent>
                  {freeTables.map(table => (
                    <SelectItem key={table.id} value={table.id.toString()}>
                      {table.name} ({table.zone_name || 'Sin zona'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMoveTicket} disabled={!moveTargetTable}>
              Mover Cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

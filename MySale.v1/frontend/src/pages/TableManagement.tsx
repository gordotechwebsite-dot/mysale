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
  getLocations,
  getFamilies
} from '../api';
import type { ZoneWithTables, Table, Ticket, Product, Location, Family } from '../types';
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
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showReserveDialog, setShowReserveDialog] = useState(false);
  const [showPeopleDialog, setShowPeopleDialog] = useState(false);
  const [reservationName, setReservationName] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [orderMode, setOrderMode] = useState(false);

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
  const [productSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<number | null>(null);
  const [quantityInput, setQuantityInput] = useState('');

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
      } else {
        setLoading(false);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Error al cargar ubicaciones');
      setLoading(false);
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
      const [productsData, familiesData] = await Promise.all([
        getProducts({ location_id: selectedLocation || undefined }),
        getFamilies()
      ]);
      setProducts(productsData);
      setFamilies(familiesData);
      if (familiesData.length > 0 && !selectedFamily) {
        setSelectedFamily(familiesData[0].id);
      }
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
    setShowTableMenu(true);

    if (table.current_ticket_id) {
      try {
        const ticket = await getTableTicket(table.id);
        setCurrentTicket(ticket);
      } catch (error: unknown) {
        const err = error as { response?: { data?: { detail?: string } } };
        toast.error(err.response?.data?.detail || 'Error al cargar cuenta');
      }
    } else {
      setCurrentTicket(null);
    }
  };

  const handleMenuAction = async (action: string) => {
    setShowTableMenu(false);
    
    switch (action) {
      case 'load_order':
        if (!selectedTable) return;
        if (selectedTable.status === 'free') {
          setCustomerName('');
          setNumPeople(1);
          setTicketNotes('');
        }
        setCart([]);
        setOrderMode(true);
        break;
      case 'close_order':
        if (currentTicket) {
          handleOpenPayment();
        }
        break;
      case 'reserve':
        setReservationName('');
        setReservationTime('');
        setShowReserveDialog(true);
        break;
      case 'change_table':
        if (currentTicket) {
          setMoveTargetTable(null);
          setShowMoveDialog(true);
        } else {
          toast.error('No hay cuenta activa para mover');
        }
        break;
      case 'delete_order':
        if (currentTicket) {
          if (confirm('¿Está seguro de eliminar este pedido?')) {
            toast.success('Pedido eliminado');
            setCurrentTicket(null);
            loadZones();
          }
        } else {
          toast.error('No hay pedido activo');
        }
        break;
      case 'num_people':
        setShowPeopleDialog(true);
        break;
      case 'exit':
        setSelectedTable(null);
        setCurrentTicket(null);
        break;
    }
  };

  const handleUpdateNumPeople = async () => {
    if (!currentTicket || !selectedTable) {
      setShowPeopleDialog(false);
      return;
    }
    toast.success(`Número de personas actualizado a ${numPeople}`);
    setShowPeopleDialog(false);
  };

  const handleReserveTable = async () => {
    if (!selectedTable) return;
    toast.success(`Mesa ${selectedTable.name} reservada para ${reservationName}`);
    setShowReserveDialog(false);
    loadZones();
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
  const filteredProducts = products.filter(p => {
    const matchesSearch = productSearch === '' || 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(productSearch.toLowerCase());
    return matchesSearch;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.sale_price * item.quantity), 0);

  const handleNumpadClick = (value: string) => {
    if (value === 'C') {
      setQuantityInput('');
    } else if (value === '<') {
      setQuantityInput(prev => prev.slice(0, -1));
    } else {
      setQuantityInput(prev => prev + value);
    }
  };

  const addToCartWithQuantity = (product: Product) => {
    const qty = parseInt(quantityInput) || 1;
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + qty }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: qty, notes: '' }]);
    }
    setQuantityInput('');
  };

  const freeTables = zones.flatMap(z => z.tables).filter(t => t.status === 'free' && t.id !== selectedTable?.id);

  const handleExitOrderMode = () => {
    setOrderMode(false);
    setCart([]);
    setCurrentTicket(null);
    setSelectedTable(null);
    loadZones();
  };

  if (orderMode && selectedTable) {
    return (
      <div className="h-full flex flex-col bg-slate-900">
        <div className="flex items-center justify-between p-3 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExitOrderMode}
              className="text-white"
            >
              <X className="w-4 h-4 mr-2" />
              Salir
            </Button>
            <h1 className="text-xl font-bold text-white">
              {selectedTable.name} {currentTicket ? `- Cuenta #${currentTicket.id}` : '- Nueva Cuenta'}
            </h1>
          </div>
          {currentTicket && (
            <div className="text-2xl font-bold text-emerald-400">
              Total: ${(currentTicket.total + cartTotal).toLocaleString()}
            </div>
          )}
        </div>

        {!currentTicket ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-slate-800 p-8 rounded-lg w-96 space-y-4">
              <h2 className="text-xl font-bold text-white text-center mb-6">Abrir Nueva Cuenta</h2>
              <div>
                <Label className="text-white">Nombre del Cliente (opcional)</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="bg-slate-700 border-slate-600 text-white text-lg h-12"
                />
              </div>
              <div>
                <Label className="text-white">Número de Personas</Label>
                <Input
                  type="number"
                  value={numPeople}
                  onChange={(e) => setNumPeople(parseInt(e.target.value) || 1)}
                  min={1}
                  className="bg-slate-700 border-slate-600 text-white text-lg h-12"
                />
              </div>
              <div>
                <Label className="text-white">Notas</Label>
                <Input
                  value={ticketNotes}
                  onChange={(e) => setTicketNotes(e.target.value)}
                  placeholder="Notas adicionales"
                  className="bg-slate-700 border-slate-600 text-white text-lg h-12"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={handleExitOrderMode} className="flex-1 h-12">
                  Cancelar
                </Button>
                <Button onClick={handleOpenTicket} className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600">
                  Abrir Cuenta
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex gap-3 p-3 overflow-hidden">
            <div className="w-48 flex flex-col bg-slate-800 rounded-lg overflow-hidden">
              <div className="p-3 bg-slate-700 font-bold text-center text-white">
                CATEGORÍAS
              </div>
              <div className="flex-1 overflow-auto">
                {families.map(family => (
                  <button
                    key={family.id}
                    onClick={() => setSelectedFamily(family.id)}
                    className={`w-full p-4 text-left font-medium border-b border-slate-700 transition-colors ${
                      selectedFamily === family.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {family.name}
                  </button>
                ))}
                {families.length === 0 && (
                  <div className="p-4 text-slate-400 text-center">
                    Sin categorías
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-slate-800 rounded-lg mb-3 overflow-hidden max-h-[40%]">
                <table className="w-full">
                  <thead className="bg-slate-700 sticky top-0">
                    <tr>
                      <th className="p-3 text-left font-bold text-white">DESCRIPCIÓN</th>
                      <th className="p-3 text-center font-bold text-white w-24">CANT</th>
                      <th className="p-3 text-right font-bold text-white w-32">PRECIO</th>
                      <th className="p-3 text-right font-bold text-white w-32">TOTAL</th>
                      <th className="p-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 overflow-auto">
                    {currentTicket.items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-700/50">
                        <td className="p-3 text-white">
                          {item.product_name}
                          {item.comanda_id && <span className="ml-2 text-xs text-emerald-400">(Enviado)</span>}
                        </td>
                        <td className="p-3 text-center text-white text-lg">{item.quantity}</td>
                        <td className="p-3 text-right text-white">${item.unit_price.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-white">${item.subtotal.toLocaleString()}</td>
                        <td className="p-3">
                          {!item.comanda_id && (
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {cart.map(item => (
                      <tr key={`cart-${item.product.id}`} className="bg-amber-900/30 hover:bg-amber-900/40">
                        <td className="p-3 text-amber-300">{item.product.name} (nuevo)</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => updateCartQuantity(item.product.id, -1)}
                              className="w-8 h-8 bg-slate-600 rounded flex items-center justify-center hover:bg-slate-500"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center text-lg text-white">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.product.id, 1)}
                              className="w-8 h-8 bg-slate-600 rounded flex items-center justify-center hover:bg-slate-500"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-right text-amber-300">${item.product.sale_price.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-amber-300">${(item.product.sale_price * item.quantity).toLocaleString()}</td>
                        <td className="p-3">
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {currentTicket.items.length === 0 && cart.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400 text-lg">
                          Sin productos en la cuenta
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex-1 overflow-auto bg-slate-800 rounded-lg p-3">
                <div className="grid grid-cols-5 gap-3">
                  {filteredProducts
                    .filter(p => !selectedFamily || p.subfamily_id === selectedFamily || 
                      families.find(f => f.id === selectedFamily && products.some(prod => prod.id === p.id)))
                    .slice(0, 30)
                    .map(product => (
                      <button
                        key={product.id}
                        onClick={() => addToCartWithQuantity(product)}
                        className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-center transition-colors"
                      >
                        <div className="font-medium text-white truncate">{product.name}</div>
                        <div className="text-emerald-400 font-bold text-lg">${product.sale_price.toLocaleString()}</div>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="w-56 flex flex-col gap-3">
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-center text-2xl font-bold mb-3 h-12 bg-slate-700 rounded flex items-center justify-center text-white">
                  {quantityInput || '1'}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '<'].map(key => (
                    <button
                      key={key}
                      onClick={() => handleNumpadClick(key)}
                      className={`p-4 rounded font-bold text-xl transition-colors ${
                        key === 'C' ? 'bg-red-600 hover:bg-red-500 text-white' :
                        key === '<' ? 'bg-amber-600 hover:bg-amber-500 text-white' :
                        'bg-slate-700 hover:bg-slate-600 text-white'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                {cart.length > 0 && (
                  <Button
                    className="bg-amber-500 hover:bg-amber-600 h-12 text-lg"
                    onClick={handleAddItemsToTicket}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Agregar
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="h-12 text-lg"
                  onClick={handleSendToKitchen}
                  disabled={currentTicket.items.filter(i => !i.comanda_id).length === 0}
                >
                  <Send className="w-5 h-5 mr-2" />
                  Enviar
                </Button>
                <Button
                  variant="outline"
                  className="h-12 text-lg"
                  onClick={() => {
                    setMoveTargetTable(null);
                    setShowMoveDialog(true);
                  }}
                >
                  <ArrowRightLeft className="w-5 h-5 mr-2" />
                  Mover
                </Button>
                <Button
                  variant="outline"
                  className="h-12 text-lg"
                  onClick={handlePrecheck}
                >
                  <Receipt className="w-5 h-5 mr-2" />
                  Precuenta
                </Button>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 h-12 text-lg"
                  onClick={handleOpenPayment}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Cobrar
                </Button>
              </div>
            </div>
          </div>
        )}

        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="bg-slate-800 text-white border-slate-700">
            <DialogHeader>
              <DialogTitle>Cobrar Cuenta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center text-3xl font-bold text-emerald-400">
                ${currentTicket?.total.toLocaleString()}
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
              {paymentMethod === 'cash' && (
                <div>
                  <Label>Monto Recibido</Label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="bg-slate-700 border-slate-600"
                  />
                  {paymentAmount > (currentTicket?.total || 0) && (
                    <div className="text-amber-400 mt-2">
                      Cambio: ${(paymentAmount - (currentTicket?.total || 0)).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
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
                <Label>Propina</Label>
                <Input
                  type="number"
                  value={tip}
                  onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handlePayTicket} className="bg-emerald-500 hover:bg-emerald-600">
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
                      {table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleMoveTicket} disabled={!moveTargetTable}>
                Mover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (loading && zones.length === 0 && locations.length > 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!loading && locations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold text-white mb-4">No hay ubicaciones configuradas</h2>
          <p className="text-slate-400 mb-4">Para usar Gestión de Mesas, primero debe crear una ubicación de tipo POS.</p>
          <p className="text-slate-500 text-sm">Vaya a Sucursales para crear una ubicación.</p>
        </div>
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
            <div className="flex-1 flex gap-2 overflow-hidden">
              <div className="w-40 flex flex-col bg-slate-700 rounded-lg overflow-hidden">
                <div className="p-2 bg-slate-600 font-semibold text-sm text-center">
                  Categorías
                </div>
                <div className="flex-1 overflow-auto">
                  {families.map(family => (
                    <button
                      key={family.id}
                      onClick={() => setSelectedFamily(family.id)}
                      className={`w-full p-3 text-left text-sm font-medium border-b border-slate-600 transition-colors ${
                        selectedFamily === family.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      }`}
                    >
                      {family.name}
                    </button>
                  ))}
                  {families.length === 0 && (
                    <div className="p-3 text-sm text-slate-400 text-center">
                      Sin categorías
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-slate-700 rounded-lg mb-2 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-600">
                      <tr>
                        <th className="p-2 text-left font-semibold">DESCRIPCIÓN</th>
                        <th className="p-2 text-center font-semibold w-20">CANT</th>
                        <th className="p-2 text-right font-semibold w-24">PRECIO</th>
                        <th className="p-2 text-right font-semibold w-24">TOTAL</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-600">
                      {currentTicket.items.map(item => (
                        <tr key={item.id} className="hover:bg-slate-600/50">
                          <td className="p-2">
                            {item.product_name}
                            {item.comanda_id && <span className="ml-2 text-xs text-emerald-400">(Enviado)</span>}
                          </td>
                          <td className="p-2 text-center">{item.quantity}</td>
                          <td className="p-2 text-right">${item.unit_price.toLocaleString()}</td>
                          <td className="p-2 text-right font-semibold">${item.subtotal.toLocaleString()}</td>
                          <td className="p-2">
                            {!item.comanda_id && (
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {cart.map(item => (
                        <tr key={`cart-${item.product.id}`} className="bg-amber-900/20 hover:bg-amber-900/30">
                          <td className="p-2 text-amber-300">{item.product.name} (nuevo)</td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => updateCartQuantity(item.product.id, -1)}
                                className="w-5 h-5 bg-slate-600 rounded flex items-center justify-center"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateCartQuantity(item.product.id, 1)}
                                className="w-5 h-5 bg-slate-600 rounded flex items-center justify-center"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-2 text-right text-amber-300">${item.product.sale_price.toLocaleString()}</td>
                          <td className="p-2 text-right font-semibold text-amber-300">${(item.product.sale_price * item.quantity).toLocaleString()}</td>
                          <td className="p-2">
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {currentTicket.items.length === 0 && cart.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400">
                            Sin productos en la cuenta
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-600">
                      <tr>
                        <td colSpan={3} className="p-2 text-right font-bold">TOTAL:</td>
                        <td className="p-2 text-right font-bold text-emerald-400">${(currentTicket.total + cartTotal).toLocaleString()}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex-1 overflow-auto bg-slate-700 rounded-lg p-2">
                  <div className="grid grid-cols-4 gap-2">
                    {filteredProducts
                      .filter(p => !selectedFamily || p.subfamily_id === selectedFamily || 
                        families.find(f => f.id === selectedFamily && products.some(prod => prod.id === p.id)))
                      .slice(0, 24)
                      .map(product => (
                        <button
                          key={product.id}
                          onClick={() => addToCartWithQuantity(product)}
                          className="p-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-center transition-colors"
                        >
                          <div className="font-medium text-xs truncate">{product.name}</div>
                          <div className="text-emerald-400 font-bold text-sm">${product.sale_price.toLocaleString()}</div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              <div className="w-44 flex flex-col gap-2">
                <div className="bg-slate-700 rounded-lg p-2">
                  <div className="text-center text-lg font-bold mb-2 h-8 bg-slate-600 rounded flex items-center justify-center">
                    {quantityInput || '1'}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '<'].map(key => (
                      <button
                        key={key}
                        onClick={() => handleNumpadClick(key)}
                        className={`p-3 rounded font-bold text-lg transition-colors ${
                          key === 'C' ? 'bg-red-600 hover:bg-red-500' :
                          key === '<' ? 'bg-amber-600 hover:bg-amber-500' :
                          'bg-slate-600 hover:bg-slate-500'
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-1">
                  {cart.length > 0 && (
                    <Button
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-xs"
                      onClick={handleAddItemsToTicket}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Agregar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={handleSendToKitchen}
                    disabled={currentTicket.items.filter(i => !i.comanda_id).length === 0}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Enviar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setMoveTargetTable(null);
                      setShowMoveDialog(true);
                    }}
                  >
                    <ArrowRightLeft className="w-3 h-3 mr-1" />
                    Mover
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={handlePrecheck}
                  >
                    <Receipt className="w-3 h-3 mr-1" />
                    Precuenta
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600 text-xs"
                    onClick={handleOpenPayment}
                  >
                    <CreditCard className="w-3 h-3 mr-1" />
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

      <Dialog open={showTableMenu} onOpenChange={setShowTableMenu}>
        <DialogContent className="bg-slate-100 text-slate-800 border-0 max-w-xs p-0 overflow-hidden [&>button]:hidden gap-0 rounded-lg shadow-xl">
          <div className="flex flex-col">
            <button
              onClick={() => handleMenuAction('load_order')}
              className="px-4 py-3 hover:bg-slate-200 border-b border-slate-300 font-semibold text-slate-700 text-center rounded-t-lg"
            >
              CARGAR PEDIDO
            </button>
            <button
              onClick={() => handleMenuAction('close_order')}
              className="px-4 py-3 hover:bg-slate-200 border-b border-slate-300 font-semibold text-slate-700 text-center"
            >
              CERRAR PEDIDO
            </button>
            <button
              onClick={() => handleMenuAction('reserve')}
              className="px-4 py-3 hover:bg-slate-200 border-b border-slate-300 font-semibold text-slate-700 text-center"
            >
              RESERVAR
            </button>
            <button
              onClick={() => handleMenuAction('change_table')}
              className="px-4 py-3 hover:bg-slate-200 border-b border-slate-300 font-semibold text-slate-700 text-center"
            >
              CAMBIAR DE MESA
            </button>
            <button
              onClick={() => handleMenuAction('delete_order')}
              className="px-4 py-3 hover:bg-slate-200 border-b border-slate-300 font-semibold text-slate-700 text-center"
            >
              ELIMINAR PEDIDO
            </button>
            <button
              onClick={() => handleMenuAction('num_people')}
              className="px-4 py-3 hover:bg-slate-200 border-b border-slate-300 font-semibold text-slate-700 text-center"
            >
              NUMERO DE PERSONAS
            </button>
            <button
              onClick={() => handleMenuAction('exit')}
              className="px-4 py-3 hover:bg-slate-200 font-semibold text-slate-700 text-center"
            >
              SALIR
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReserveDialog} onOpenChange={setShowReserveDialog}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle>Reservar Mesa {selectedTable?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre de la Reserva</Label>
              <Input
                value={reservationName}
                onChange={(e) => setReservationName(e.target.value)}
                placeholder="Nombre del cliente"
                className="bg-slate-700 border-slate-600"
              />
            </div>
            <div>
              <Label>Hora de la Reserva</Label>
              <Input
                type="time"
                value={reservationTime}
                onChange={(e) => setReservationTime(e.target.value)}
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReserveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReserveTable} disabled={!reservationName}>
              Reservar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPeopleDialog} onOpenChange={setShowPeopleDialog}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle>Numero de Personas - {selectedTable?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cantidad de Personas</Label>
              <Input
                type="number"
                value={numPeople}
                onChange={(e) => setNumPeople(parseInt(e.target.value) || 1)}
                min={1}
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPeopleDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateNumPeople}>
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

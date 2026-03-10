import { useState, useEffect, useRef, useCallback } from 'react';
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
  Clock,
  CreditCard,
  Receipt,
  ArrowRightLeft,
  Trash2,
  Edit,
  X,
  Minus,
  Send,
  RotateCw,
  Move
} from 'lucide-react';


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
  const [zoneColor, setZoneColor] = useState('#64748b');
  const [tableName, setTableName] = useState('');
  const [tableCapacity, setTableCapacity] = useState(4);
  const [tableShape, setTableShape] = useState<'square' | 'pair' | 'rectangle'>('square');

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
  const [openingTicket, setOpeningTicket] = useState(false);

  // Real-time clock for table timers
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getElapsedTime = (openedAt: string | null | undefined): string | null => {
    if (!openedAt) return null;
    const diff = Math.max(0, Math.floor((now - new Date(openedAt).getTime()) / 1000));
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Floor plan drag state
  const floorPlanRef = useRef<HTMLDivElement>(null);
  const [draggingTable, setDraggingTable] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const getTableImage = (shape: string): string => {
      if (shape === 'pair') return '/tables/table-2.png';
      if (shape === 'square') return '/tables/table-4.png';
      return '/tables/table-6.png';
    };

    const getTableSize = (shape: string): { w: number; h: number } => {
      if (shape === 'pair') return { w: 150, h: 170 };
      if (shape === 'square') return { w: 130, h: 130 };
      return { w: 200, h: 120 };
    };

  const statusOverlay: Record<string, { color: string; label: string }> = {
    free: { color: '#10b981', label: 'Libre' },
    available: { color: '#10b981', label: 'Libre' },
    occupied: { color: '#f59e0b', label: 'Ocupada' },
    bill_open: { color: '#ef4444', label: 'Cuenta Abierta' },
    waiting_food: { color: '#8b5cf6', label: 'Esperando Comida' },
    reserved: { color: '#3b82f6', label: 'Reservada' },
    to_pay: { color: '#f59e0b', label: 'Por Cobrar' },
    paid: { color: '#ef4444', label: 'Pagada' },
  };

  const isTableFree = (status: string) => status === 'free' || status === 'available';

  const handleFloorMouseDown = useCallback((e: React.MouseEvent, table: Table) => {
    if (!editMode || !isSuperuser) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = floorPlanRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDraggingTable(table.id);
    setDragOffset({
      x: e.clientX - rect.left - table.position_x,
      y: e.clientY - rect.top - table.position_y,
    });
  }, [editMode, isSuperuser]);

  const handleFloorMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingTable === null || !floorPlanRef.current) return;
    const rect = floorPlanRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.round(e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(0, Math.round(e.clientY - rect.top - dragOffset.y));

    setZones(prev => prev.map(zone => ({
      ...zone,
      tables: zone.tables.map(t =>
        t.id === draggingTable ? { ...t, position_x: newX, position_y: newY } : t
      )
    })));
  }, [draggingTable, dragOffset]);

  const handleFloorMouseUp = useCallback(async () => {
    if (draggingTable === null) return;
    const table = currentZone?.tables.find(t => t.id === draggingTable);
    if (table) {
      try {
        await updateTable(table.id, {
          position_x: table.position_x,
          position_y: table.position_y,
        });
      } catch {
        toast.error('Error al guardar posición');
      }
    }
    setDraggingTable(null);
  }, [draggingTable, zones]);

  const handleRotateTable = async (table: Table) => {
    const newRotation = ((table.rotation || 0) + 90) % 360;
    try {
      await updateTable(table.id, { rotation: newRotation });
      setZones(prev => prev.map(zone => ({
        ...zone,
        tables: zone.tables.map(t =>
          t.id === table.id ? { ...t, rotation: newRotation } : t
        )
      })));
    } catch {
      toast.error('Error al rotar mesa');
    }
  };

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
    if (!zoneName.trim()) {
      toast.error('Ingrese un nombre para la zona');
      return;
    }
    if (!selectedLocation) {
      toast.error('Seleccione una ubicación primero');
      return;
    }
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
      setZoneColor('#64748b');
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
    if (!tableName.trim()) {
      toast.error('Ingrese un nombre para la mesa');
      return;
    }
    if (!selectedZone) {
      toast.error('Seleccione una zona primero');
      return;
    }
    try {
      await createTable({
        name: tableName,
        zone_id: selectedZone,
        capacity: tableCapacity,
        shape: tableShape,
        position_x: Math.round(Math.random() * 400),
        position_y: Math.round(Math.random() * 300)
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
        if (isTableFree(selectedTable.status)) {
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
    if (!selectedTable || !selectedLocation || openingTicket) return;
    setOpeningTicket(true);
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
      // If table already has a ticket, fetch it instead of just showing error
      if (err.response?.data?.detail?.includes('already has an open ticket')) {
        try {
          const existingTicket = await getTableTicket(selectedTable.id);
          setCurrentTicket(existingTicket);
          toast.success('Cuenta cargada');
          loadZones();
          return;
        } catch {
          // fallback to error
        }
      }
      toast.error(err.response?.data?.detail || 'Error al abrir cuenta');
    } finally {
      setOpeningTicket(false);
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

  const freeTables = zones.flatMap(z => z.tables).filter(t => isTableFree(t.status) && t.id !== selectedTable?.id);

  const handleExitOrderMode = () => {
    setOrderMode(false);
    setCart([]);
    setCurrentTicket(null);
    setSelectedTable(null);
    loadZones();
  };

  if (orderMode && selectedTable) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleExitOrderMode}
              className="bg-red-600 hover:bg-red-500 text-white h-10 px-4"
            >
              <X className="w-5 h-5 mr-2" />
              Volver a Mesas
            </Button>
            <h1 className="text-2xl font-bold text-white">
              {selectedTable.name} {currentTicket ? `- Cuenta #${currentTicket.id}` : '- Nueva Cuenta'}
            </h1>
          </div>
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
                <Button onClick={handleOpenTicket} disabled={openingTicket} className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50">
                  {openingTicket ? 'Abriendo...' : 'Abrir Cuenta'}
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
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">No hay ubicaciones configuradas</h2>
          <p className="text-gray-500 mb-4">Para usar Gestión de Mesas, primero debe crear una ubicación de tipo POS.</p>
          <p className="text-gray-400 text-sm">Vaya a Sucursales para crear una ubicación.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">Gestión de Mesas</h1>
          <Select
            value={selectedLocation?.toString() || ''}
            onValueChange={(v) => setSelectedLocation(parseInt(v))}
          >
            <SelectTrigger className="w-52 bg-gray-50 border-gray-300 text-gray-900">
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
                className={editMode ? "bg-amber-500 hover:bg-amber-600 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"}
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
                  setZoneColor('#64748b');
                  setShowZoneDialog(true);
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Zona
              </Button>
            </>
          )}
        </div>
      </div>

      {zones.length > 0 && (
        <div className="flex border-b border-gray-200 bg-white px-2">
          {zones.map(zone => (
            <button
              key={zone.id}
              onClick={() => setSelectedZone(zone.id)}
              className={`px-5 py-3 text-sm font-medium transition-colors relative ${
                selectedZone === zone.id
                  ? 'text-gray-900 border-b-2'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{
                borderBottomColor: selectedZone === zone.id ? zone.color : 'transparent'
              }}
            >
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
                {zone.name}
              </span>
              {editMode && isSuperuser && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingZone(zone);
                    setZoneName(zone.name);
                    setZoneColor(zone.color);
                    setShowZoneDialog(true);
                  }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <Settings className="w-3.5 h-3.5 inline" />
                </button>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto relative">
        {/* Edit mode toolbar */}
        {editMode && isSuperuser && selectedZone && (
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                setEditingTable(null);
                setTableName('');
                setTableCapacity(4);
                setTableShape('square');
                setShowTableDialog(true);
              }}
              className="bg-gray-900 hover:bg-gray-800 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Mesa
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDeleteZone(selectedZone)}
              className="shadow-lg"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar Zona
            </Button>
          </div>
        )}

        {editMode && isSuperuser && (
          <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow text-xs text-gray-500 flex items-center gap-2">
            <Move className="w-3.5 h-3.5" />
            Arrastra para mover · Clic en
            <RotateCw className="w-3 h-3 inline" />
            para rotar
          </div>
        )}

        {/* 2D Floor Plan */}
        <div
          ref={floorPlanRef}
          className="relative w-full h-full min-h-[600px]"
          style={{
            backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
            backgroundSize: '30px 30px',
            cursor: draggingTable !== null ? 'grabbing' : 'default',
          }}
          onMouseMove={handleFloorMouseMove}
          onMouseUp={handleFloorMouseUp}
          onMouseLeave={handleFloorMouseUp}
        >
          {currentZone?.tables.map(table => {
            const size = getTableSize(table.shape);
            const overlay = statusOverlay[table.status] || statusOverlay.free;
            const rotation = table.rotation || 0;

            return (
              <div
                key={table.id}
                className={`absolute select-none ${
                  editMode && isSuperuser ? 'cursor-grab' : 'cursor-pointer'
                } ${draggingTable === table.id ? 'z-20 opacity-90' : 'z-10'}`}
                style={{
                  left: table.position_x,
                  top: table.position_y,
                  width: size.w,
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
                onMouseDown={(e) => {
                  if (editMode && isSuperuser) {
                    handleFloorMouseDown(e, table);
                  }
                }}
                onClick={() => {
                  if (!editMode && draggingTable === null) {
                    handleTableClick(table);
                  }
                }}
              >
                {/* Status color dot */}
                <div
                  className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10"
                  style={{ backgroundColor: overlay.color, transform: `rotate(${-rotation}deg)` }}
                />

                {/* Table image */}
                <img
                  src={getTableImage(table.shape)}
                  alt={table.name}
                  className="w-full h-auto pointer-events-none"
                  draggable={false}
                  style={{
                    filter: 'none',
                  }}
                />

                {/* Table name + status overlay centered on table */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                  style={{ transform: `rotate(${-rotation}deg)` }}
                >
                  {/* Real-time timer - prominently on top */}
                  {!isTableFree(table.status) && (() => {
                    const elapsed = getElapsedTime(table.ticket_opened_at) || table.ticket_time || null;
                    return elapsed ? (
                      <span className="mb-1 text-white text-xs font-bold flex items-center gap-1 bg-gray-800/80 backdrop-blur-sm px-2 py-0.5 rounded-full shadow font-mono">
                        <Clock className="w-3 h-3" />
                        {elapsed}
                      </span>
                    ) : null;
                  })()}

                  <span className="bg-white/90 backdrop-blur-sm text-gray-900 font-bold text-sm px-2 py-0.5 rounded shadow-sm">
                    {table.name}
                  </span>

                  {/* Status badge - only for non-free tables */}
                  {!isTableFree(table.status) && (
                    <span
                      className="mt-1 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: overlay.color }}
                    >
                      {overlay.label}
                    </span>
                  )}
                </div>

                {/* Pending comandas badge */}
                {(table.pending_comandas ?? 0) > 0 && (
                  <div
                    className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow"
                    style={{ transform: `rotate(${-rotation}deg)` }}
                  >
                    {table.pending_comandas}
                  </div>
                )}

                {/* Edit mode controls */}
                {editMode && isSuperuser && (
                  <div
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1"
                    style={{ transform: `translateX(-50%) rotate(${-rotation}deg)` }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotateTable(table);
                      }}
                      className="bg-white shadow-md rounded-full p-1 hover:bg-gray-100 transition-colors"
                      title="Rotar 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTable(table);
                        setTableName(table.name);
                        setTableCapacity(table.capacity);
                        setTableShape(table.shape);
                        setShowTableDialog(true);
                      }}
                      className="bg-white shadow-md rounded-full p-1 hover:bg-gray-100 transition-colors"
                      title="Editar"
                    >
                      <Settings className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTable(table.id);
                      }}
                      className="bg-white shadow-md rounded-full p-1 hover:bg-red-50 transition-colors"
                      title="Eliminar"
                    >
                      <X className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty state */}
          {(!currentZone || currentZone.tables.length === 0) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                {zones.length === 0 ? (
                  <>
                    <p className="text-lg font-medium text-gray-400">No hay zonas creadas</p>
                    <p className="text-sm text-gray-300 mt-1">{isSuperuser && 'Crea una zona para comenzar.'}</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium text-gray-400">No hay mesas en esta zona</p>
                    <p className="text-sm text-gray-300 mt-1">{isSuperuser && editMode && 'Agrega mesas usando el botón + Nueva Mesa.'}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
        <DialogContent className="bg-white text-gray-900 border-gray-200 rounded-xl shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">{editingZone ? 'Editar Zona' : 'Nueva Zona'}</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">Define un nombre y color para identificar la zona</p>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div>
              <Label className="text-gray-700 text-sm font-medium">Nombre de la zona</Label>
              <Input
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="Ej: Terraza, Salón Principal"
                className="mt-1.5 bg-gray-50 border-gray-300 text-gray-900 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div>
              <Label className="text-gray-700 text-sm font-medium">Color de identificación</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {[
                  { color: '#64748b', label: 'Gris' },
                  { color: '#0ea5e9', label: 'Azul' },
                  { color: '#10b981', label: 'Verde' },
                  { color: '#f59e0b', label: 'Ámbar' },
                  { color: '#8b5cf6', label: 'Violeta' },
                  { color: '#ef4444', label: 'Rojo' },
                ].map(({ color, label }) => (
                  <button
                    key={color}
                    onClick={() => setZoneColor(color)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                      zoneColor === color ? 'bg-gray-100 ring-2 ring-gray-900' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-md"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[10px] text-gray-500 font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowZoneDialog(false)} className="text-gray-600 border-gray-300 hover:bg-gray-50">
              Cancelar
            </Button>
            <Button onClick={editingZone ? handleUpdateZone : handleCreateZone} className="bg-gray-900 hover:bg-gray-800 text-white" disabled={!zoneName.trim()}>
              {editingZone ? 'Guardar Cambios' : 'Crear Zona'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="bg-white text-gray-900 border-gray-200 rounded-xl shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">{editingTable ? 'Editar Mesa' : 'Nueva Mesa'}</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">Configura los datos de la mesa</p>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div>
              <Label className="text-gray-700 text-sm font-medium">Nombre</Label>
              <Input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="Ej: T1, Mesa 1"
                className="mt-1.5 bg-gray-50 border-gray-300 text-gray-900 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div>
              <Label className="text-gray-700 text-sm font-medium">Forma</Label>
              <Select value={tableShape} onValueChange={(v) => {
                const shape = v as 'square' | 'pair' | 'rectangle';
                setTableShape(shape);
                const capacityMap: Record<string, number> = { pair: 2, square: 4, rectangle: 6 };
                setTableCapacity(capacityMap[shape] || 4);
              }}>
                <SelectTrigger className="mt-1.5 bg-gray-50 border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pair">Pareja</SelectItem>
                  <SelectItem value="square">Cuadrada</SelectItem>
                  <SelectItem value="rectangle">Rectangular</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700 text-sm font-medium">Capacidad (personas)</Label>
              <Input
                type="number"
                value={tableCapacity}
                onChange={(e) => setTableCapacity(parseInt(e.target.value) || 4)}
                min={1}
                className="mt-1.5 bg-gray-50 border-gray-300 text-gray-900 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowTableDialog(false)} className="text-gray-600 border-gray-300 hover:bg-gray-50">
              Cancelar
            </Button>
            <Button onClick={editingTable ? handleUpdateTable : handleCreateTable} className="bg-gray-900 hover:bg-gray-800 text-white" disabled={!tableName.trim()}>
              {editingTable ? 'Guardar Cambios' : 'Crear Mesa'}
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
                <Button onClick={handleOpenTicket} disabled={openingTicket}>
                  {openingTicket ? 'Abriendo...' : 'Abrir Cuenta'}
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

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useShift } from '../context/ShiftContext';
import { getProducts, getLocations, getDeliveries, createDelivery, getFamilies, getSubFamilies } from '../api';
import type { Product, Delivery, Family, SubFamily } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  ShoppingCart,
  Loader2,
  Check,
  X,
  Bike,
  MapPin,
  Phone,
  User,
  Package,
  Clock,
  ChefHat,
  Truck,
  ChevronLeft,
  Sun,
  Beef,
  Drumstick,
  Bird,
  UtensilsCrossed,
  Flame,
  Salad,
  Soup,
  Star,
  Coffee,
  Baby,
  PlusCircle,
  Pizza,
  Sandwich,
  Cookie,
  IceCream,
  Wheat,
  Fish,
  Egg,
  Apple,
  GlassWater,
  Cake,
  CakeSlice,
  Snowflake,
  type LucideIcon
} from 'lucide-react';

const categoryIconMap: Record<string, LucideIcon> = {
  'Almuerzo': Sun, 'Hamburguesas': Beef, 'Alitas': Drumstick, 'Boneless': Bird,
  'Picadas': UtensilsCrossed, 'Pollo Broaster': Flame, 'Perros Calientes': Sandwich,
  'Salchipapas': Cookie, 'Entradas': Soup, 'Platos Especiales': Star, 'Bebidas': Coffee,
  'Bebidas Calientes': Coffee, 'Bebidas Frías': GlassWater,
  'Menú Infantil': Baby, 'Menu Infantil': Baby, 'Adicionales': PlusCircle, 'Pizzas': Pizza,
  'Postres': CakeSlice, 'Pastelería': Cake, 'Helados': IceCream, 'Raspados': Snowflake,
  'Ensaladas': Salad, 'Panadería': Wheat, 'Pescados': Fish,
  'Desayunos': Egg, 'Frutas': Apple, 'Comidas': UtensilsCrossed,
};

const getCategoryIcon = (name: string): LucideIcon => {
  if (categoryIconMap[name]) return categoryIconMap[name];
  const lowerName = name.toLowerCase();
  for (const [key, icon] of Object.entries(categoryIconMap)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) return icon;
  }
  return Package;
};

const Deliveries: React.FC = () => {
  const { items, addItem, removeItem, updateQuantity, clearCart, total, subtotal } = useCart();
  const { user } = useAuth();
  const { currentShift } = useShift();
  const searchRef = useRef<HTMLInputElement>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);

  const sessionLocationId = currentShift?.location_id || user?.location_id || null;

  const [products, setProducts] = useState<Product[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [subfamilies, setSubfamilies] = useState<SubFamily[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(sessionLocationId);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryPerson, setDeliveryPerson] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [notes, setNotes] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Delivery list
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  // Mobile step: 'categories' | 'products' | 'checkout'
  const [mobileStep, setMobileStep] = useState<'categories' | 'products' | 'checkout'>('categories');
  const [modifierProduct, setModifierProduct] = useState<Product | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<number[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (sessionLocationId && !selectedLocation) {
      setSelectedLocation(sessionLocationId);
    }
  }, [sessionLocationId]);

  useEffect(() => {
    if (selectedLocation) {
      loadProducts();
    }
  }, [selectedLocation]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedFamily) {
      const familySubIds = subfamilies.filter(sf => sf.family_id === selectedFamily).map(sf => sf.id);
      filtered = filtered.filter(p => familySubIds.includes(p.subfamily_id));
    }
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.includes(searchTerm)
      );
    }
    return filtered;
  }, [searchTerm, products, selectedFamily, subfamilies]);

  const categoriesWithCount = useMemo(() => {
    return families.map(family => {
      const familySubIds = subfamilies.filter(sf => sf.family_id === family.id).map(sf => sf.id);
      const count = products.filter(p => familySubIds.includes(p.subfamily_id)).length;
      return { ...family, count };
    }).filter(f => f.count > 0);
  }, [families, subfamilies, products]);

  const loadInitialData = async () => {
    try {
      const [locs, deliveriesData, familiesData, subfamiliesData] = await Promise.all([
        getLocations(),
        getDeliveries(),
        getFamilies(),
        getSubFamilies()
      ]);
      setFamilies(familiesData);
      setSubfamilies(subfamiliesData);
      const posLocations = locs.filter(l => l.location_type === 'pos');
      setDeliveries(deliveriesData);
      if (!selectedLocation && posLocations.length > 0) {
        setSelectedLocation(posLocations[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    }
  };

  const loadProducts = async () => {
    if (!selectedLocation) return;
    setIsLoading(true);
    try {
      const data = await getProducts({ location_id: selectedLocation });
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeliveries = async () => {
    try {
      const data = await getDeliveries();
      setDeliveries(data);
    } catch (error) {
      console.error('Error loading deliveries:', error);
      toast.error('Error al cargar domicilios');
    }
  };

  const handleProductClick = (product: Product) => {
    if (product.modifiers && product.modifiers.length > 0) {
      setModifierProduct(product);
      setSelectedModifiers([]);
    } else {
      addItem(product);
    }
  };

  const handleConfirmModifiers = () => {
    if (!modifierProduct) return;
    const mods = modifierProduct.modifiers || [];
    const selected = mods.filter(m => selectedModifiers.includes(m.id));
    const notesText = selected.length > 0 ? selected.map(m => m.name).join(', ') : undefined;
    addItem(modifierProduct, 1, notesText);
    setModifierProduct(null);
    setSelectedModifiers([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (filteredProducts.length === 1) {
        handleProductClick(filteredProducts[0]);
      }
    }
    if (e.key === 'F2') {
      e.preventDefault();
      if (items.length > 0 && customerName && customerPhone && customerAddress) {
        setShowPayment(true);
      }
    }
  };

  const handlePayment = async () => {
    if (items.length === 0 || !selectedLocation) return;
    if (!customerName || !customerPhone || !customerAddress) {
      toast.error('Complete los datos del cliente (nombre, telefono, direccion)');
      return;
    }

    setIsProcessing(true);
    try {
      const feeVal = parseFloat(deliveryFee) || 0;
      const grandTotalVal = total + feeVal;
      await createDelivery({
        payment_method: paymentMethod,
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          discount: item.discount,
          notes: item.notes || undefined
        })),
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        delivery_person: deliveryPerson || undefined,
        delivery_fee: feeVal,
        amount_received: paymentMethod === 'cash' ? parseFloat(amountReceived) || grandTotalVal : undefined,
        notes: notes || undefined,
      });
      clearCart();
      setShowPayment(false);
      setShowSuccess(true);
      setAmountReceived('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setDeliveryPerson('');
      setDeliveryFee('');
      setNotes('');
      setMobileStep('categories');
      setSelectedFamily(null);
      await loadDeliveries();

      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al registrar domicilio');
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

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  };

  const fee = parseFloat(deliveryFee) || 0;
  const grandTotal = total + fee;
  const change = paymentMethod === 'cash' && amountReceived
    ? parseFloat(amountReceived) - grandTotal
    : 0;

  const quickAmounts = [50000, 100000, 200000];
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const showingCategories = !selectedFamily && !searchTerm;

  const getStatusBadge = (status?: string) => {
    const config: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
      pending: { color: 'bg-yellow-500', label: 'Pendiente', icon: <Clock className="w-3 h-3" /> },
      preparing: { color: 'bg-orange-500', label: 'Preparando', icon: <ChefHat className="w-3 h-3" /> },
      in_transit: { color: 'bg-blue-500', label: 'En Camino', icon: <Truck className="w-3 h-3" /> },
      delivered: { color: 'bg-green-500', label: 'Entregado', icon: <Check className="w-3 h-3" /> },
      cancelled: { color: 'bg-red-500', label: 'Cancelado', icon: <X className="w-3 h-3" /> },
    };
    const c = config[status || 'pending'] || config.pending;
    return (
      <Badge className={`${c.color} text-white flex items-center gap-1`}>
        {c.icon} {c.label}
      </Badge>
    );
  };

  // Desktop order panel content
  const OrderPanel = () => (
    <>
      <div className="p-2 px-3 border-b bg-purple-50">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Bike className="w-4 h-4 text-purple-600" />
            Pedido a Domicilio
          </h3>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700"
              onClick={() => setShowClearConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Customer info */}
      <div className="p-2 px-3 border-b space-y-1">
        <h4 className="text-xs font-semibold text-gray-600 flex items-center gap-1">
          <User className="w-3 h-3" /> Datos del Cliente
        </h4>
        <Input placeholder="Nombre del cliente *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-8 text-sm" />
        <Input placeholder="Telefono *" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="h-8 text-sm" />
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
          <Input placeholder="Direccion de entrega *" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="h-8 text-sm pl-8" />
        </div>
        <div className="flex gap-2">
          <Input placeholder="Domiciliario (opcional)" value={deliveryPerson} onChange={(e) => setDeliveryPerson(e.target.value)} className="h-8 text-sm flex-1" />
          <Input type="number" placeholder="$ Domicilio" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className="h-8 text-sm w-28" />
        </div>
      </div>

      {/* Payment method */}
      <div className="p-2 px-3 border-b space-y-1">
        <h4 className="text-xs font-semibold text-gray-600 flex items-center gap-1">
          <CreditCard className="w-3 h-3" /> Método de Pago
        </h4>
        <div className="grid grid-cols-3 gap-1">
          {[
            { method: 'cash' as const, icon: Banknote, label: 'Efectivo' },
            { method: 'transfer' as const, icon: Smartphone, label: 'Nequi' },
            { method: 'card' as const, icon: CreditCard, label: 'Bre-B' },
          ].map(({ method, icon: Icon, label }) => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border-2 transition-all text-xs ${
                paymentMethod === method
                  ? 'border-purple-600 bg-purple-50 text-purple-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
        {paymentMethod === 'cash' && (
          <Input type="number" placeholder="Monto recibido (opcional)" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} className="h-8 text-sm" />
        )}
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-auto p-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <ShoppingCart className="w-12 h-12 mb-3" />
            <p className="text-sm">Agregue productos al pedido</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={`${item.product.id}-${item.notes || ''}`} className="bg-gray-50 rounded-lg p-2">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product.name}</p>
                    {item.notes && <p className="text-xs text-purple-600 truncate">▸ {item.notes}</p>}
                    <p className="text-xs text-gray-500">{formatCurrency(item.product.sale_price)} c/u</p>
                  </div>
                  <button onClick={() => removeItem(item.product.id, item.notes)} className="text-red-500 hover:text-red-700 p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.notes)} className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.notes)} className="w-7 h-7 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="font-bold text-sm">{formatCurrency(item.product.sale_price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="p-2 px-3 pb-4 border-t bg-purple-50">
        <div className="flex justify-between items-center mb-0.5 text-sm">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-semibold">{formatCurrency(subtotal)}</span>
        </div>
        {fee > 0 && (
          <div className="flex justify-between items-center mb-1 text-sm">
            <span className="text-gray-600">Domicilio:</span>
            <span className="font-semibold">{formatCurrency(fee)}</span>
          </div>
        )}
        <div className="flex justify-between items-center mb-2">
          <span className="text-base font-bold">TOTAL:</span>
          <span className="text-lg font-bold text-purple-600">{formatCurrency(grandTotal)}</span>
        </div>
        <Button
          className="w-full h-10 text-sm font-bold bg-purple-600 hover:bg-purple-700"
          disabled={items.length === 0 || !customerName || !customerPhone || !customerAddress}
          onClick={() => setShowPayment(true)}
        >
          <Bike className="w-5 h-5 mr-2" />
          Registrar Domicilio (F2)
        </Button>
      </div>
    </>
  );

  return (
    <div className="h-[calc(100vh-140px)] lg:flex lg:gap-3">
      {/* ===== MOBILE VIEW ===== */}
      <div className="lg:hidden flex flex-col h-full">
        {/* Mobile Search */}
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: '#6b7280' }} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); if (e.target.value) { setSelectedFamily(null); setMobileStep('products'); } }}
              onKeyDown={handleKeyDown}
              className="w-full h-10 pl-10 pr-10 text-base outline-none transition-all duration-200"
              style={{ borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: 'white', color: '#111827' }}
              onFocus={(e) => { e.target.style.borderColor = '#9333ea'; e.target.style.boxShadow = '0 0 0 3px rgba(147, 51, 234, 0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
            />
            {searchTerm && (
              <button onClick={() => { setSearchTerm(''); setMobileStep('categories'); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: '#9ca3af' }}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Mobile back button */}
        {mobileStep !== 'categories' && !searchTerm && (
          <button
            onClick={() => {
              if (mobileStep === 'checkout') { setMobileStep(selectedFamily ? 'products' : 'categories'); }
              else { setSelectedFamily(null); setMobileStep('categories'); }
            }}
            className="flex items-center gap-1.5 mb-3 text-sm font-medium"
            style={{ color: '#9333ea' }}
          >
            <ChevronLeft size={18} />
            <span>
              {mobileStep === 'checkout' ? 'Productos' : categoriesWithCount.find(c => c.id === selectedFamily)?.name || 'Categorias'}
            </span>
          </button>
        )}

        {/* Mobile content */}
        <div className="flex-1 overflow-auto pb-20">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#9333ea' }} />
            </div>
          ) : mobileStep === 'categories' && showingCategories ? (
            /* Categories Grid */
            <div className="grid grid-cols-3 gap-2.5">
              {categoriesWithCount.map((family) => {
                const CategoryIcon = getCategoryIcon(family.name);
                return (
                  <button
                    key={family.id}
                    onClick={() => { setSelectedFamily(family.id); setMobileStep('products'); }}
                    className="bg-white flex flex-col items-center justify-center gap-2 p-4 transition-all duration-200 active:scale-95"
                    style={{ borderRadius: '14px', border: '2px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(147, 51, 234, 0.1)' }}>
                      <CategoryIcon size={20} style={{ color: '#9333ea' }} />
                    </div>
                    <span className="text-xs font-semibold text-center leading-tight" style={{ color: '#111827' }}>{family.name}</span>
                    <span className="text-[10px]" style={{ color: '#9ca3af' }}>{family.count} productos</span>
                  </button>
                );
              })}
            </div>
          ) : mobileStep === 'checkout' ? (
            /* Checkout: cart + form */
            <div className="space-y-3">
              {/* Cart items */}
              <div className="bg-white rounded-xl p-3" style={{ border: '1px solid #e5e7eb' }}>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: '#111827' }}>
                  <ShoppingCart size={16} style={{ color: '#9333ea' }} />
                  Productos ({itemCount})
                </h4>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={`${item.product.id}-${item.notes || ''}`} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: '#111827' }}>{item.product.name}</p>
                        {item.notes && <p className="text-xs text-purple-600 truncate">▸ {item.notes}</p>}
                        <p className="text-xs" style={{ color: '#6b7280' }}>{formatCurrency(item.product.sale_price)} c/u</p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.notes)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e5e7eb' }}>
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.notes)} className="w-6 h-6 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: '#9333ea' }}>
                          <Plus size={12} />
                        </button>
                        <button onClick={() => removeItem(item.product.id, item.notes)} className="ml-1 p-1" style={{ color: '#ef4444' }}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer form */}
              <div className="bg-white rounded-xl p-3 space-y-2" style={{ border: '1px solid #e5e7eb' }}>
                <h4 className="font-semibold text-sm flex items-center gap-2" style={{ color: '#111827' }}>
                  <User size={16} style={{ color: '#9333ea' }} />
                  Datos del Cliente
                </h4>
                <input
                  placeholder="Nombre del cliente *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-10 px-3 text-base outline-none"
                  style={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '16px' }}
                />
                <input
                  placeholder="Telefono *"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  type="tel"
                  inputMode="numeric"
                  className="w-full h-10 px-3 text-base outline-none"
                  style={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '16px' }}
                />
                <input
                  placeholder="Direccion de entrega *"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full h-10 px-3 text-base outline-none"
                  style={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '16px' }}
                />
                <div className="flex gap-2">
                  <input
                    placeholder="Domiciliario"
                    value={deliveryPerson}
                    onChange={(e) => setDeliveryPerson(e.target.value)}
                    className="flex-1 h-10 px-3 text-base outline-none"
                    style={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '16px' }}
                  />
                  <input
                    type="number"
                    placeholder="$ Domicilio"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    inputMode="numeric"
                    className="w-28 h-10 px-3 text-base outline-none"
                    style={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '16px' }}
                  />
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-white rounded-xl p-3 space-y-2" style={{ border: '1px solid #e5e7eb' }}>
                <h4 className="font-semibold text-sm flex items-center gap-2" style={{ color: '#111827' }}>
                  <CreditCard size={16} style={{ color: '#9333ea' }} />
                  Método de Pago
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { method: 'cash' as const, icon: Banknote, label: 'Efectivo' },
                    { method: 'transfer' as const, icon: Smartphone, label: 'Nequi' },
                    { method: 'card' as const, icon: CreditCard, label: 'Bre-B' },
                  ].map(({ method, icon: Icon, label }) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                        paymentMethod === method
                          ? 'border-purple-600 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
                {paymentMethod === 'cash' && (
                  <input
                    type="number"
                    placeholder="Monto recibido (opcional)"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    inputMode="numeric"
                    className="w-full h-10 px-3 text-base outline-none"
                    style={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '16px' }}
                  />
                )}
              </div>

              {/* Totals + submit */}
              <div className="rounded-xl p-3" style={{ backgroundColor: '#1e1b4b' }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-white/70">Subtotal:</span>
                  <span className="font-semibold text-sm text-white">{formatCurrency(subtotal)}</span>
                </div>
                {fee > 0 && (
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-white/70">Domicilio:</span>
                    <span className="font-semibold text-sm text-white">{formatCurrency(fee)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-3">
                  <span className="text-base font-bold text-white">TOTAL:</span>
                  <span className="text-xl font-bold" style={{ color: '#a78bfa' }}>{formatCurrency(grandTotal)}</span>
                </div>
                <button
                  disabled={items.length === 0 || !customerName || !customerPhone || !customerAddress || isProcessing}
                  onClick={handlePayment}
                  className="w-full h-11 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#9333ea', borderRadius: '12px' }}
                >
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <><Bike size={18} /> Registrar Domicilio</>}
                </button>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40" style={{ color: '#9ca3af' }}>
              <Package size={40} className="mb-2" />
              <p className="text-sm font-medium">No hay productos</p>
            </div>
          ) : (
            /* Products Grid */
            <div className="grid grid-cols-3 gap-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="bg-white p-2.5 text-left transition-all duration-200 active:scale-95"
                  style={{ borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                >
                  <p className="font-semibold text-xs truncate" style={{ color: '#111827' }}>{product.name}</p>
                  <p className="text-sm font-bold mt-1" style={{ color: '#9333ea' }}>{formatCurrency(product.sale_price)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mobile floating cart button */}
        {mobileStep !== 'checkout' && (
          <button
            className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-3 text-white font-semibold shadow-xl transition-all active:scale-95"
            style={{ backgroundColor: '#9333ea', borderRadius: '16px', boxShadow: '0 8px 24px rgba(147, 51, 234, 0.4)' }}
            onClick={() => {
              if (items.length > 0) {
                setMobileStep('checkout');
              } else {
                toast.error('Agrega productos primero');
              }
            }}
          >
            <ShoppingCart size={20} />
            {itemCount > 0 ? (
              <>
                <span className="text-sm">{formatCurrency(total)}</span>
                <span className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>{itemCount}</span>
              </>
            ) : (
              <span className="text-sm">Pedido</span>
            )}
          </button>
        )}
      </div>

      {/* ===== DESKTOP VIEW ===== */}
      <div className="hidden lg:flex flex-1 gap-3 min-h-0 h-full">
        {/* Product selection - left */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar producto por nombre, codigo o escanear..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-12 h-12 text-lg"
              />
            </div>
          </div>

          {/* Category Cards */}
          {families.length > 0 && (
            <div className="mb-3">
              <div className="grid grid-cols-6 gap-2">
                {families.map((family) => {
                  const count = products.filter(p => {
                    const familySubIds = subfamilies.filter(sf => sf.family_id === family.id).map(sf => sf.id);
                    return familySubIds.includes(p.subfamily_id);
                  }).length;
                  if (count === 0) return null;
                  const CategoryIcon = getCategoryIcon(family.name);
                  return (
                    <button
                      key={family.id}
                      onClick={() => { setSelectedFamily(selectedFamily === family.id ? null : family.id); setSearchTerm(''); }}
                      className={`flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-all ${
                        selectedFamily === family.id
                          ? 'bg-purple-100 text-purple-600 border-2 border-purple-400'
                          : 'bg-white text-gray-600 border-2 border-gray-100 hover:border-purple-200 hover:bg-purple-50'
                      }`}
                    >
                      <CategoryIcon className="w-5 h-5" />
                      <span className="text-xs font-medium leading-tight text-center">{family.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto">
            {!selectedLocation ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>Selecciona un punto de venta para comenzar</p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md hover:bg-purple-50 transition-all text-left border-2 border-transparent hover:border-purple-500 active:scale-95 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{product.name}</p>
                      <p className="text-lg font-bold text-purple-600 mt-1">{formatCurrency(product.sale_price)}</p>
                    </div>
                    {(product as any).image_url ? (
                      <img src={`${import.meta.env.VITE_API_URL}${(product as any).image_url}`} alt={product.name} className="w-14 h-14 object-contain rounded-lg flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-7 h-7 text-gray-300" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Order ticket - right */}
        <Card className="w-[420px] flex-shrink-0 flex flex-col">
          <OrderPanel />
        </Card>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-md" onKeyDown={(e) => {
          if (e.key === 'Enter' && !isProcessing && !(paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < grandTotal))) {
            e.preventDefault();
            handlePayment();
          }
        }}>
          <DialogHeader>
            <DialogTitle className="text-xl lg:text-2xl">Pago del Domicilio</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="text-center mb-4">
              <p className="text-gray-500">Total a cobrar</p>
              <p className="text-3xl lg:text-4xl font-bold text-purple-600">{formatCurrency(grandTotal)}</p>
              {fee > 0 && (
                <p className="text-sm text-gray-400">
                  (Productos: {formatCurrency(total)} + Domicilio: {formatCurrency(fee)})
                </p>
              )}
            </div>

            <div className="bg-purple-50 rounded-lg p-3 mb-4 text-sm">
              <p className="font-semibold">{customerName}</p>
              <p className="text-gray-600 flex items-center gap-1"><Phone className="w-3 h-3" /> {customerPhone}</p>
              <p className="text-gray-600 flex items-center gap-1"><MapPin className="w-3 h-3" /> {customerAddress}</p>
              {deliveryPerson && <p className="text-gray-600 flex items-center gap-1"><Bike className="w-3 h-3" /> {deliveryPerson}</p>}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { method: 'cash' as const, icon: Banknote, label: 'Efectivo', color: 'green' },
                { method: 'card' as const, icon: CreditCard, label: 'Tarjeta', color: 'blue' },
                { method: 'transfer' as const, icon: Smartphone, label: 'Transfer', color: 'purple' },
              ].map(({ method, icon: Icon, label, color }) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === method
                      ? `border-${color}-500 bg-${color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-7 h-7 ${paymentMethod === method ? `text-${color}-600` : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${paymentMethod === method ? `text-${color}-600` : 'text-gray-600'}`}>{label}</span>
                </button>
              ))}
            </div>

            {paymentMethod === 'cash' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Monto Recibido</label>
                  <input
                    ref={paymentInputRef}
                    type="number"
                    inputMode="decimal"
                    value={amountReceived}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmountReceived(e.target.value)}
                    placeholder="0"
                    className="w-full h-12 lg:h-14 text-xl lg:text-2xl text-center font-bold mt-2 outline-none"
                    style={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '16px' }}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  {quickAmounts.map((amt) => (
                    <Button key={amt} variant="outline" className="flex-1" onClick={() => setAmountReceived(amt.toString())}>
                      {formatCurrency(amt)}
                    </Button>
                  ))}
                </div>
                <div className={`bg-green-50 p-3 rounded-lg text-center transition-opacity ${change > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 p-0 overflow-hidden'}`}>
                  <p className="text-sm text-green-600">Cambio</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(change)}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancelar</Button>
            <Button
              onClick={handlePayment}
              disabled={isProcessing || (paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < grandTotal))}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Confirmar Domicilio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Details Dialog */}
      <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del Domicilio {selectedDelivery?.folio}</DialogTitle>
          </DialogHeader>
          {selectedDelivery && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedDelivery.delivery_status)}
                <span className="text-sm text-gray-500">{formatDateTime(selectedDelivery.created_at)}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="font-semibold">{selectedDelivery.customer_name}</p>
                <p className="text-sm text-gray-600 flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedDelivery.customer_phone}</p>
                <p className="text-sm text-gray-600 flex items-center gap-1"><MapPin className="w-3 h-3" /> {selectedDelivery.customer_address}</p>
                {selectedDelivery.delivery_person && (
                  <p className="text-sm text-gray-600 flex items-center gap-1"><Bike className="w-3 h-3" /> {selectedDelivery.delivery_person}</p>
                )}
              </div>
              <div>
                <h4 className="font-semibold mb-2">Productos</h4>
                <div className="space-y-1">
                  {selectedDelivery.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.product_name} x{item.quantity}</span>
                      <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedDelivery.total)}</span>
                </div>
                {selectedDelivery.delivery_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Domicilio</span>
                    <span>{formatCurrency(selectedDelivery.delivery_fee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-purple-600">{formatCurrency(selectedDelivery.grand_total)}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Metodo: {selectedDelivery.payment_method === 'cash' ? 'Efectivo' : selectedDelivery.payment_method === 'card' ? 'Tarjeta' : 'Transferencia'}</span>
                <span>Cajero: {selectedDelivery.cashier_name}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success overlay */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center animate-in fade-in zoom-in">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold">Domicilio Registrado!</h3>
            <p className="text-gray-500 mt-2">El pedido fue registrado exitosamente</p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Limpiar carrito"
        description="¿Estás seguro de que quieres eliminar todos los productos del carrito?"
        confirmLabel="Sí, limpiar"
        cancelLabel="No, cancelar"
        variant="danger"
        onConfirm={() => { clearCart(); setShowClearConfirm(false); }}
      />

      {/* Modifier Selection Dialog */}
      <Dialog open={!!modifierProduct} onOpenChange={(open) => { if (!open) { setModifierProduct(null); setSelectedModifiers([]); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{modifierProduct?.name}</DialogTitle>
            <p className="text-sm text-gray-500">Selecciona las variaciones</p>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto py-2">
            {(modifierProduct?.modifiers || []).map(mod => (
              <button
                key={mod.id}
                onClick={() => setSelectedModifiers(prev => prev.includes(mod.id) ? prev.filter(id => id !== mod.id) : [...prev, mod.id])}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${selectedModifiers.includes(mod.id) ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <span className="font-medium text-sm">{mod.name}</span>
                <div className="flex items-center gap-2">
                  {mod.price_adjustment !== 0 && (
                    <span className="text-xs text-gray-500">{mod.price_adjustment > 0 ? '+' : ''}{formatCurrency(mod.price_adjustment)}</span>
                  )}
                  {selectedModifiers.includes(mod.id) && <Check className="w-4 h-4 text-purple-500" />}
                </div>
              </button>
            ))}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => { addItem(modifierProduct!); setModifierProduct(null); setSelectedModifiers([]); }}>Sin variaciones</Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleConfirmModifiers}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Deliveries;

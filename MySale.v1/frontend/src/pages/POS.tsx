import { toast } from 'react-hot-toast';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShift } from '../context/ShiftContext';
import { useCart } from '../context/CartContext';
import { getProducts, createSale, getFamilies, getSubFamilies } from '../api';
import type { Product, Family, SubFamily } from '../types';
import { Button } from '@/components/ui/button';
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
  ChevronDown,
  ChevronLeft,
  Package,
  Coffee,
  GlassWater,
  IceCream,
  Cake,
  CakeSlice,
  Snowflake,
  Sandwich,
  Cookie,
  Flame,
  Drumstick,
  Bird,
  UtensilsCrossed,
  Star,
  Baby,
  PlusCircle,
  Pizza,
  Soup,
  Salad,
  Wheat,
  Fish,
  Egg,
  Apple,
  Sun,
  Beef,
  type LucideIcon
} from 'lucide-react';
import ReceiptTicket from '../components/ReceiptTicket';

const categoryIconMap: Record<string, LucideIcon> = {
  'Almuerzo': Sun,
  'Hamburguesas': Beef,
  'Alitas': Drumstick,
  'Boneless': Bird,
  'Picadas': UtensilsCrossed,
  'Pollo Broaster': Flame,
  'Perros Calientes': Sandwich,
  'Salchipapas': Cookie,
  'Entradas': Soup,
  'Platos Especiales': Star,
  'Bebidas': Coffee,
  'Bebidas Calientes': Coffee,
  'Bebidas Frías': GlassWater,
  'Menú Infantil': Baby,
  'Menu Infantil': Baby,
  'Adicionales': PlusCircle,
  'Pizzas': Pizza,
  'Postres': CakeSlice,
  'Pastelería': Cake,
  'Helados': IceCream,
  'Raspados': Snowflake,
  'Ensaladas': Salad,
  'Panadería': Wheat,
  'Pescados': Fish,
  'Desayunos': Egg,
  'Frutas': Apple,
};

const getCategoryIcon = (name: string): LucideIcon => {
  if (categoryIconMap[name]) return categoryIconMap[name];
  const lowerName = name.toLowerCase();
  for (const [key, icon] of Object.entries(categoryIconMap)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return icon;
    }
  }
  return Package;
};

const POS: React.FC = () => {
  const { currentShift, isLoading: isShiftLoading } = useShift();
  const { items, addItem, removeItem, updateQuantity, clearCart, total, subtotal } = useCart();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [subfamilies, setSubfamilies] = useState<SubFamily[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  useEffect(() => {
    if (isShiftLoading) return;
    if (!currentShift) {
      navigate('/');
      return;
    }
    loadData();
    searchRef.current?.focus();
  }, [currentShift, isShiftLoading]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.includes(searchTerm)
      );
    } else if (selectedFamily) {
      const familySubIds = subfamilies
        .filter(sf => sf.family_id === selectedFamily)
        .map(sf => sf.id);
      filtered = filtered.filter(p => familySubIds.includes(p.subfamily_id));
    }
    return filtered;
  }, [searchTerm, products, selectedFamily, subfamilies]);

  const categoriesWithCount = useMemo(() => {
    return families.map(family => {
      const familySubIds = subfamilies
        .filter(sf => sf.family_id === family.id)
        .map(sf => sf.id);
      const count = products.filter(p => familySubIds.includes(p.subfamily_id)).length;
      return { ...family, count };
    }).filter(f => f.count > 0);
  }, [families, subfamilies, products]);

  const loadData = async () => {
    try {
      const [productsData, familiesData, subfamiliesData] = await Promise.all([
        getProducts({ location_id: currentShift?.location_id }),
        getFamilies(),
        getSubFamilies()
      ]);
      setProducts(productsData);
      setFamilies(familiesData);
      setSubfamilies(subfamiliesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductClick = (product: Product) => {
    addItem(product);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredProducts.length === 1) {
      handleProductClick(filteredProducts[0]);
      setSearchTerm('');
    }
    if (e.key === 'F2') {
      e.preventDefault();
      if (items.length > 0) setShowPayment(true);
    }
  };

  const handlePayment = async () => {
    if (items.length === 0) return;
    
    setIsProcessing(true);
    try {
      const saleData = {
        payment_method: paymentMethod,
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          discount: item.discount
        })),
        amount_received: paymentMethod === 'cash' ? parseFloat(amountReceived) || total : undefined
      };
      
      const sale = await createSale(saleData);
      setLastSale(sale);
      clearCart();
      setShowPayment(false);
      setMobileCartOpen(false);
      setShowReceipt(true);
      setAmountReceived('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al procesar la venta');
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

  const change = paymentMethod === 'cash' && amountReceived 
    ? parseFloat(amountReceived) - total 
    : 0;

  const quickAmounts = [50000, 100000, 200000];
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const showingCategories = !selectedFamily && !searchTerm;

  if (isShiftLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00a86b' }} />
      </div>
    );
  }

  if (!currentShift) {
    return null;
  }

  const CartContent = () => (
    <>
      {/* Cart Header */}
      <div className="p-3 lg:p-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base flex items-center gap-2" style={{ color: '#111827' }}>
            <ShoppingCart size={20} />
            Carrito {itemCount > 0 && <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: '#00a86b', color: 'white' }}>{itemCount}</span>}
          </h3>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="flex items-center gap-1 text-sm font-medium transition-colors"
                style={{ color: '#ef4444' }}
              >
                <Trash2 size={16} />
                Limpiar
              </button>
            )}
            <button
              onClick={() => setMobileCartOpen(false)}
              className="lg:hidden p-1"
              style={{ color: '#6b7280' }}
            >
              <ChevronDown size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-auto p-3 lg:p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 lg:h-full" style={{ color: '#9ca3af' }}>
            <ShoppingCart size={40} className="mb-3" />
            <p className="font-medium text-sm">Carrito vacio</p>
            <p className="text-xs">Agregue productos para comenzar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div 
                key={item.product.id} 
                className="p-2.5 lg:p-3"
                style={{ backgroundColor: '#f6f7f9', borderRadius: '10px' }}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: '#111827' }}>{item.product.name}</p>
                    <p className="text-xs" style={{ color: '#6b7280' }}>{formatCurrency(item.product.sale_price)} c/u</p>
                  </div>
                  <button onClick={() => removeItem(item.product.id)} className="p-1 ml-1 flex-shrink-0" style={{ color: '#ef4444' }}>
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center"
                      style={{ borderRadius: '50%', backgroundColor: '#e5e7eb', color: '#111827' }}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-bold text-sm" style={{ color: '#111827' }}>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center text-white"
                      style={{ borderRadius: '50%', backgroundColor: '#00a86b' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <p className="font-bold text-sm" style={{ color: '#111827' }}>
                    {formatCurrency(item.product.sale_price * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Footer */}
      <div className="p-3 lg:p-4" style={{ borderTop: '1px solid #e5e7eb' }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm" style={{ color: '#6b7280' }}>Subtotal:</span>
          <span className="font-semibold text-sm" style={{ color: '#111827' }}>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-base lg:text-lg font-bold" style={{ color: '#111827' }}>TOTAL:</span>
          <span className="text-xl lg:text-2xl font-bold" style={{ color: '#00a86b' }}>{formatCurrency(total)}</span>
        </div>
        <button
          disabled={items.length === 0}
          onClick={() => setShowPayment(true)}
          className="w-full h-11 lg:h-12 text-sm lg:text-base font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#00a86b', borderRadius: '12px' }}
          onMouseEnter={(e) => { if (items.length > 0) (e.currentTarget as HTMLElement).style.backgroundColor = '#00965f'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#00a86b'; }}
        >
          Cobrar (F2)
        </button>
      </div>
    </>
  );

  return (
    <div className="h-[calc(100vh-140px)] lg:flex lg:gap-4">
      {/* Products Section */}
      <div className="flex-1 flex flex-col h-full">
        {/* Search Bar */}
        <div className="mb-3 lg:mb-4">
          <div className="relative">
            <Search 
              className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2" 
              size={18}
              style={{ color: '#6b7280' }} 
            />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar producto o escanear codigo..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); if (e.target.value) setSelectedFamily(null); }}
              onKeyDown={handleKeyDown}
              className="w-full h-10 lg:h-12 pl-10 lg:pl-12 pr-10 text-base outline-none transition-all duration-200"
              style={{ 
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                backgroundColor: 'white',
                color: '#111827'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#00a86b';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 168, 107, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(''); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: '#9ca3af' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Back button when viewing a category */}
        {selectedFamily && !searchTerm && (
          <button
            onClick={() => setSelectedFamily(null)}
            className="flex items-center gap-1.5 mb-3 text-sm font-medium transition-colors"
            style={{ color: '#00a86b' }}
          >
            <ChevronLeft size={18} />
            <span>{categoriesWithCount.find(c => c.id === selectedFamily)?.name || 'Categorias'}</span>
          </button>
        )}

        {/* Main content area */}
        <div className="flex-1 overflow-auto pb-20 lg:pb-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00a86b' }} />
            </div>
          ) : showingCategories ? (
            /* Categories Grid */
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5 lg:gap-3">
              {categoriesWithCount.map((family) => {
                const CategoryIcon = getCategoryIcon(family.name);
                return (
                  <button
                    key={family.id}
                    onClick={() => setSelectedFamily(family.id)}
                    className="bg-white flex flex-col items-center justify-center gap-2 p-4 lg:p-6 transition-all duration-200 active:scale-95"
                    style={{ 
                      borderRadius: '14px',
                      border: '2px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#00a86b';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0, 168, 107, 0.15)';
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 168, 107, 0.03)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'white';
                    }}
                  >
                    <div 
                      className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(0, 168, 107, 0.1)' }}
                    >
                      <CategoryIcon size={20} className="lg:hidden" style={{ color: '#00a86b' }} />
                      <CategoryIcon size={24} className="hidden lg:block" style={{ color: '#00a86b' }} />
                    </div>
                    <span className="text-xs lg:text-sm font-semibold text-center leading-tight" style={{ color: '#111827' }}>
                      {family.name}
                    </span>
                    <span className="text-[10px] lg:text-xs" style={{ color: '#9ca3af' }}>
                      {family.count} productos
                    </span>
                  </button>
                );
              })}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40" style={{ color: '#9ca3af' }}>
              <Package size={40} className="mb-2" />
              <p className="text-sm font-medium">No hay productos</p>
            </div>
          ) : (
            /* Products Grid */
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2 lg:gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="bg-white p-2.5 lg:p-4 text-left transition-all duration-200 active:scale-95"
                  style={{ 
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#00a86b';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0, 168, 107, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                  }}
                >
                  <p className="font-semibold text-xs lg:text-sm truncate" style={{ color: '#111827' }}>{product.name}</p>
                  <p className="text-[10px] lg:text-xs" style={{ color: '#6b7280' }}>{product.code}</p>
                  <p className="text-sm lg:text-lg font-bold mt-1 lg:mt-2" style={{ color: '#00a86b' }}>
                    {formatCurrency(product.sale_price)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Cart */}
      <div 
        className="hidden lg:flex w-96 flex-col bg-white"
        style={{ borderRadius: '18px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
      >
        <CartContent />
      </div>

      {/* Mobile: Floating Cart Button */}
      <button
        className="lg:hidden fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-3 text-white font-semibold shadow-xl transition-all active:scale-95"
        style={{ 
          backgroundColor: '#00a86b',
          borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(0, 168, 107, 0.4)'
        }}
        onClick={() => setMobileCartOpen(true)}
      >
        <ShoppingCart size={20} />
        {itemCount > 0 ? (
          <>
            <span className="text-sm">{formatCurrency(total)}</span>
            <span className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
              {itemCount}
            </span>
          </>
        ) : (
          <span className="text-sm">Carrito</span>
        )}
      </button>

      {/* Mobile: Cart Slide-up Panel */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileCartOpen(false)} />
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white flex flex-col animate-slide-up"
            style={{ borderTopLeftRadius: '20px', borderTopRightRadius: '20px', maxHeight: '85vh', boxShadow: '0 -8px 30px rgba(0,0,0,0.15)' }}
          >
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#d1d5db' }} />
            </div>
            <CartContent />
          </div>
        </div>
      )}

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl lg:text-2xl">Metodo de Pago</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="text-center mb-6">
              <p className="text-gray-500">Total a cobrar</p>
              <p className="text-3xl lg:text-4xl font-bold text-blue-600">{formatCurrency(total)}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-6">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 lg:p-4 rounded-xl border-2 flex flex-col items-center gap-1.5 lg:gap-2 transition-all ${
                  paymentMethod === 'cash' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Banknote className={`w-6 h-6 lg:w-8 lg:h-8 ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-400'}`} />
                <span className={`text-xs lg:text-sm font-medium ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-600'}`}>Efectivo</span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-3 lg:p-4 rounded-xl border-2 flex flex-col items-center gap-1.5 lg:gap-2 transition-all ${
                  paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CreditCard className={`w-6 h-6 lg:w-8 lg:h-8 ${paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`text-xs lg:text-sm font-medium ${paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-600'}`}>Tarjeta</span>
              </button>
              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`p-3 lg:p-4 rounded-xl border-2 flex flex-col items-center gap-1.5 lg:gap-2 transition-all ${
                  paymentMethod === 'transfer' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Smartphone className={`w-6 h-6 lg:w-8 lg:h-8 ${paymentMethod === 'transfer' ? 'text-purple-600' : 'text-gray-400'}`} />
                <span className={`text-xs lg:text-sm font-medium ${paymentMethod === 'transfer' ? 'text-purple-600' : 'text-gray-600'}`}>Transfer</span>
              </button>
            </div>

            {paymentMethod === 'cash' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium" style={{ color: '#6b7280' }}>Monto Recibido</label>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmountReceived(e.target.value)}
                    placeholder="0"
                    className="w-full h-12 lg:h-14 text-xl lg:text-2xl text-center font-bold mt-2 outline-none transition-all duration-200"
                    style={{ borderRadius: '12px', border: '1px solid #e5e7eb', color: '#111827' }}
                    onFocus={(e) => { e.target.style.borderColor = '#00a86b'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 168, 107, 0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      className="flex-1 h-9 lg:h-10 text-xs lg:text-sm font-medium transition-all duration-200"
                      style={{ borderRadius: '10px', border: '1px solid #e5e7eb', backgroundColor: 'white', color: '#111827' }}
                      onClick={() => setAmountReceived(amount.toString())}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#00a86b'; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 168, 107, 0.05)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLElement).style.backgroundColor = 'white'; }}
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                </div>
                <button
                  className="w-full h-9 lg:h-10 text-xs lg:text-sm font-medium transition-all duration-200"
                  style={{ borderRadius: '10px', border: '1px solid #e5e7eb', backgroundColor: 'white', color: '#111827' }}
                  onClick={() => setAmountReceived(total.toString())}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#00a86b'; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 168, 107, 0.05)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLElement).style.backgroundColor = 'white'; }}
                >
                  Monto Exacto
                </button>
                {change > 0 && (
                  <div className="p-3 lg:p-4 text-center" style={{ backgroundColor: 'rgba(0, 168, 107, 0.1)', borderRadius: '12px' }}>
                    <p className="text-sm" style={{ color: '#6b7280' }}>Cambio a devolver</p>
                    <p className="text-2xl lg:text-3xl font-bold" style={{ color: '#00a86b' }}>{formatCurrency(change)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancelar</Button>
            <Button
              onClick={handlePayment}
              disabled={isProcessing || (paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < total))}
              className="bg-green-600 hover:bg-green-700 min-w-32"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <><Check className="w-5 h-5 mr-2" />Confirmar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-sm">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Venta Exitosa!</h3>
            {lastSale && (
              <>
                <p className="text-gray-500 mb-2">Folio: {lastSale.folio}</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(lastSale.total)}</p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showReceipt && lastSale && (
        <ReceiptTicket
          sale={lastSale}
          onClose={() => { setShowReceipt(false); searchRef.current?.focus(); }}
        />
      )}
    </div>
  );
};

export default POS;

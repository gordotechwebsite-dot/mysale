import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getProducts, getLocations, createSale, decodeWeightedBarcode, getFamilies, getSubFamilies } from '../api';
import type { Product, Family, SubFamily } from '../types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Zap,
  Scale,
  Package,
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
import ReceiptTicket from '../components/ReceiptTicket';
import ConfirmDialog from '../components/ConfirmDialog';

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

const QuickSale: React.FC = () => {
  const { items, addItem, removeItem, updateQuantity, clearCart, total, subtotal } = useCart();
  const { user } = useAuth();
  const searchRef = useRef<HTMLInputElement>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [subfamilies, setSubfamilies] = useState<SubFamily[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [weightedProductInfo, setWeightedProductInfo] = useState<{
    product_name: string;
    weight_kg: number;
    price_per_kg: number;
    total_price: number;
  } | null>(null);

  // Mobile step flow
  const [mobileStep, setMobileStep] = useState<'categories' | 'products' | 'checkout'>('categories');
  const [modifierProduct, setModifierProduct] = useState<Product | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<number[]>([]);

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { if (selectedLocation) loadProducts(); }, [selectedLocation]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedFamily) {
      const familySubIds = subfamilies.filter(sf => sf.family_id === selectedFamily).map(sf => sf.id);
      filtered = filtered.filter(p => familySubIds.includes(p.subfamily_id));
    }
    if (searchTerm) {
      filtered = products.filter(p =>
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

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const showingCategories = !searchTerm && !selectedFamily;

  const loadInitialData = async () => {
    try {
      const [locs, familiesData, subfamiliesData] = await Promise.all([
        getLocations(), getFamilies(), getSubFamilies()
      ]);
      setFamilies(familiesData);
      setSubfamilies(subfamiliesData);
      const posLocations = locs.filter(l => l.location_type === 'pos');
      if (user?.location_id) {
        setSelectedLocation(user.location_id);
      } else if (posLocations.length > 0) {
        setSelectedLocation(posLocations[0].id);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('Error al cargar ubicaciones');
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
    const notes = selected.length > 0 ? selected.map(m => m.name).join(', ') : undefined;
    addItem(modifierProduct, 1, notes);
    setModifierProduct(null);
    setSelectedModifiers([]);
  };

  const handleWeightedBarcode = async (barcode: string) => {
    try {
      const result = await decodeWeightedBarcode(barcode);
      if (result.found && result.product_id && result.total_price !== undefined) {
        const weightedProduct: Product = {
          id: result.product_id, code: result.product_code || '', barcode,
          name: `${result.product_name} (${result.weight_kg?.toFixed(3)} kg)`,
          description: null, subfamily_id: 0, unit: 'kg', sale_price: result.total_price,
          weighted_cost: 0, min_stock: 0, max_stock: 0, is_active: true, is_weighted: true,
          price_per_kg: result.price_per_kg || 0, plu_code: result.plu_code || null, created_at: ''
        };
        addItem(weightedProduct);
        setWeightedProductInfo({
          product_name: result.product_name || '', weight_kg: result.weight_kg || 0,
          price_per_kg: result.price_per_kg || 0, total_price: result.total_price
        });
        setTimeout(() => setWeightedProductInfo(null), 3000);
        setSearchTerm('');
      } else {
        toast.error(result.error || 'Producto pesable no encontrado');
      }
    } catch (error) {
      console.error('Error decoding weighted barcode:', error);
      toast.error('Error al decodificar codigo de barras');
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (searchTerm.length === 13 && searchTerm.startsWith('23')) {
        e.preventDefault();
        await handleWeightedBarcode(searchTerm);
        return;
      }
      if (filteredProducts.length === 1) {
        handleProductClick(filteredProducts[0]);
      }
    }
    if (e.key === 'F2') {
      e.preventDefault();
      if (items.length > 0) setShowPayment(true);
    }
  };

  const handlePayment = async () => {
    if (items.length === 0 || !selectedLocation) return;
    setIsProcessing(true);
    try {
      const saleData = {
        payment_method: paymentMethod,
        items: items.map(item => ({
          product_id: item.product.id, quantity: item.quantity, discount: item.discount,
          notes: item.notes || undefined
        })),
        amount_received: paymentMethod === 'cash' ? parseFloat(amountReceived) || total : undefined,
        location_id: selectedLocation
      };
      const sale = await createSale(saleData);
      setLastSale(sale);
      clearCart();
      setShowPayment(false);
      setShowReceipt(true);
      setAmountReceived('');
      setMobileStep('categories');
      setSelectedFamily(null);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al procesar la venta');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  };

  const change = paymentMethod === 'cash' && amountReceived ? parseFloat(amountReceived) - total : 0;
  const quickAmounts = [50000, 100000, 200000];

  // Shared cart/checkout panel
  const CartPanel = () => (
    <>
      <div className="p-3 px-4 border-b bg-orange-50">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-600" />
            Talon de Venta
          </h3>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-7 text-xs" onClick={() => setShowClearConfirm(true)}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpiar
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto scrollbar-on-hover p-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <ShoppingCart className="w-14 h-14 mb-3" />
            <p className="text-sm">Talon vacio</p>
            <p className="text-xs">Agregue productos para comenzar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={`${item.product.id}-${item.notes || ''}`} className="bg-gray-50 rounded-lg p-2.5">
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight">{item.product.name}</p>
                    {item.notes && <p className="text-xs text-orange-600 truncate">▸ {item.notes}</p>}
                    <p className="text-xs text-gray-500">{formatCurrency(item.product.sale_price)} c/u</p>
                  </div>
                  <button onClick={() => removeItem(item.product.id, item.notes)} className="text-red-500 hover:text-red-700 p-0.5 ml-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.notes)} className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.notes)} className="w-7 h-7 rounded-full bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="font-bold text-sm">{formatCurrency(item.product.sale_price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-3 px-4 pb-4 border-t bg-orange-50">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600 text-sm">Subtotal:</span>
          <span className="font-semibold text-sm">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-lg font-bold">TOTAL:</span>
          <span className="text-xl font-bold text-orange-600">{formatCurrency(total)}</span>
        </div>
        <Button
          className="w-full h-12 text-base font-bold bg-orange-600 hover:bg-orange-700"
          disabled={items.length === 0}
          onClick={() => setShowPayment(true)}
        >
          <Zap className="w-5 h-5 mr-2" />
          Cobrar Rapido (F2)
        </Button>
      </div>
    </>
  );

  // --- MOBILE VIEW ---
  const MobileView = () => (
    <div className="lg:hidden flex flex-col flex-1 min-h-0">
      {/* Mobile search + back */}
      <div className="px-3 pt-2 pb-2 flex items-center gap-2">
        {(mobileStep !== 'categories' || selectedFamily) && (
          <button
            onClick={() => {
              if (mobileStep === 'checkout') { setMobileStep(selectedFamily ? 'products' : 'categories'); }
              else if (mobileStep === 'products') { setSelectedFamily(null); setMobileStep('categories'); }
              else if (selectedFamily) { setSelectedFamily(null); }
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            style={{ fontSize: '16px' }}
          />
        </div>
      </div>

      {weightedProductInfo && (
        <div className="mx-3 mb-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 animate-pulse">
          <Scale className="w-4 h-4 text-blue-600" />
          <div className="flex-1">
            <p className="font-medium text-blue-800 text-sm">{weightedProductInfo.product_name}</p>
            <p className="text-xs text-blue-600">
              {weightedProductInfo.weight_kg.toFixed(3)} kg x {formatCurrency(weightedProductInfo.price_per_kg)}/kg = {formatCurrency(weightedProductInfo.total_price)}
            </p>
          </div>
        </div>
      )}

      {/* Mobile content */}
      <div className="flex-1 overflow-auto scrollbar-on-hover px-3 pb-24">
        {mobileStep === 'checkout' ? (
          /* Checkout: show cart panel inline */
          <div className="flex flex-col" style={{ minHeight: '100%' }}>
            <CartPanel />
          </div>
        ) : mobileStep === 'categories' && showingCategories ? (
          /* Categories grid */
          <div className="grid grid-cols-3 gap-2.5">
            {categoriesWithCount.map((family) => {
              const CategoryIcon = getCategoryIcon(family.name);
              return (
                <button
                  key={family.id}
                  onClick={() => { setSelectedFamily(family.id); setMobileStep('products'); }}
                  className="bg-white flex flex-col items-center justify-center gap-2 p-4"
                  style={{ borderRadius: '14px', border: '2px solid #e5e7eb' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(234, 88, 12, 0.1)' }}>
                    <CategoryIcon size={20} style={{ color: '#ea580c' }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-800 text-center leading-tight">{family.name}</span>
                  <span className="text-[10px] text-gray-400">{family.count} productos</span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Products grid */
          isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Package className="w-10 h-10 mb-2" />
              <p className="text-sm">No hay productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="bg-white flex flex-col items-center p-3 active:scale-[0.97] transition-transform"
                  style={{ borderRadius: '12px', border: '1.5px solid #e5e7eb' }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-1.5" style={{ backgroundColor: '#fff7ed' }}>
                    <Package className="w-4 h-4 text-orange-400" />
                  </div>
                  <p className="text-xs font-semibold text-gray-800 text-center leading-tight line-clamp-2">{product.name}</p>
                  <p className="text-xs font-bold text-orange-600 mt-1">{formatCurrency(product.sale_price)}</p>
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {/* Mobile floating cart button */}
      {mobileStep !== 'checkout' && (
        <button
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-3 text-white font-semibold shadow-lg"
          style={{ backgroundColor: '#ea580c', borderRadius: '16px', boxShadow: '0 8px 24px rgba(234, 88, 12, 0.3)' }}
          onClick={() => {
            if (items.length > 0) { setMobileStep('checkout'); }
            else { toast.error('Agrega productos primero'); }
          }}
        >
          <ShoppingCart size={20} />
          {itemCount > 0 ? (
            <>
              <span className="text-sm">{formatCurrency(total)}</span>
              <span className="w-6 h-6 flex items-center justify-center text-xs rounded-full bg-white/20">{itemCount}</span>
            </>
          ) : (
            <span className="text-sm">Carrito</span>
          )}
        </button>
      )}
    </div>
  );

  // --- DESKTOP VIEW ---
  const DesktopView = () => (
    <div className="hidden lg:flex flex-1 min-h-0 flex-col gap-4 overflow-hidden">
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                ref={searchRef}
                type="text"
                placeholder="Buscar producto por nombre, codigo o escanear codigo de barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-12 h-14 text-lg"
                style={{ fontSize: '16px' }}
              />
            </div>
            {weightedProductInfo && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3 animate-pulse">
                <Scale className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-blue-800">{weightedProductInfo.product_name}</p>
                  <p className="text-sm text-blue-600">
                    {weightedProductInfo.weight_kg.toFixed(3)} kg x {formatCurrency(weightedProductInfo.price_per_kg)}/kg = {formatCurrency(weightedProductInfo.total_price)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Category Cards (Desktop) */}
          {families.length > 0 && (
            <div className="mb-3">
              <div className="grid grid-cols-6 gap-2">
                {categoriesWithCount.map((family) => {
                  const CategoryIcon = getCategoryIcon(family.name);
                  return (
                    <button
                      key={family.id}
                      onClick={() => { setSelectedFamily(selectedFamily === family.id ? null : family.id); setSearchTerm(''); }}
                      className={`flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-all ${
                        selectedFamily === family.id
                          ? 'bg-orange-100 text-orange-600 border-2 border-orange-400'
                          : 'bg-white text-gray-600 border-2 border-gray-100 hover:border-orange-200 hover:bg-orange-50'
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

          {/* Product Grid (Desktop) */}
          <div className="flex-1 overflow-auto scrollbar-on-hover">
            {!selectedLocation ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>Selecciona un punto de venta para comenzar</p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Package className="w-12 h-12 mb-2" />
                <p>No hay productos en esta categoria</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="bg-white px-5 py-4 rounded-xl shadow-sm hover:shadow-lg hover:bg-orange-50 transition-all text-left border border-gray-100 hover:border-orange-400 active:scale-[0.98] flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-base leading-snug line-clamp-2">{product.name}</p>
                      <p className="text-lg font-bold text-orange-600 mt-1">{formatCurrency(product.sale_price)}</p>
                    </div>
                    {(product as any).image_url ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL}${(product as any).image_url}`}
                        alt={product.name}
                        className="w-12 h-12 object-contain rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Cart Panel */}
        <Card className="w-80 flex-shrink-0 flex flex-col">
          <CartPanel />
        </Card>
      </div>
    </div>
  );

  return (
    <>
      <MobileView />
      <DesktopView />

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-md" onKeyDown={(e) => {
          if (e.key === 'Enter' && !isProcessing && !(paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < total))) {
            e.preventDefault();
            handlePayment();
          }
        }}>
          <DialogHeader>
            <DialogTitle className="text-2xl">Metodo de Pago</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center mb-6">
              <p className="text-gray-500">Total a cobrar</p>
              <p className="text-4xl font-bold text-orange-600">{formatCurrency(total)}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === 'cash' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Banknote className={`w-8 h-8 ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-400'}`} />
                <span className={`font-medium ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-600'}`}>Efectivo</span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CreditCard className={`w-8 h-8 ${paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`font-medium ${paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-600'}`}>Tarjeta</span>
              </button>
              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === 'transfer' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Smartphone className={`w-8 h-8 ${paymentMethod === 'transfer' ? 'text-purple-600' : 'text-gray-400'}`} />
                <span className={`font-medium ${paymentMethod === 'transfer' ? 'text-purple-600' : 'text-gray-600'}`}>Transfer</span>
              </button>
            </div>
            {paymentMethod === 'cash' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Monto Recibido</label>
                  <Input
                    ref={paymentInputRef}
                    type="number"
                    inputMode="decimal"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="0"
                    className="h-14 text-2xl text-center font-bold mt-2"
                    style={{ fontSize: '16px' }}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  {quickAmounts.map((amount) => (
                    <Button key={amount} variant="outline" className="flex-1" onClick={() => setAmountReceived(amount.toString())}>
                      {formatCurrency(amount)}
                    </Button>
                  ))}
                </div>
                <Button variant="outline" className="w-full" onClick={() => setAmountReceived(total.toString())}>
                  Monto Exacto
                </Button>
                <div className={`p-4 bg-green-50 rounded-lg text-center transition-opacity ${change > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 p-0 overflow-hidden'}`}>
                  <p className="text-sm text-gray-600">Cambio a devolver</p>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(change)}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancelar</Button>
            <Button
              onClick={handlePayment}
              disabled={isProcessing || (paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < total))}
              className="bg-orange-600 hover:bg-orange-700 min-w-32"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5 mr-2" />Confirmar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-sm">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Venta Exitosa!</h3>
            {lastSale && (
              <>
                <p className="text-gray-500 mb-2">Folio: {lastSale.folio}</p>
                <p className="text-3xl font-bold text-orange-600">{formatCurrency(lastSale.total)}</p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt */}
      {showReceipt && lastSale && (
        <ReceiptTicket
          sale={lastSale}
          onClose={() => { setShowReceipt(false); searchRef.current?.focus(); }}
        />
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
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${selectedModifiers.includes(mod.id) ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <span className="font-medium text-sm">{mod.name}</span>
                <div className="flex items-center gap-2">
                  {mod.price_adjustment !== 0 && (
                    <span className="text-xs text-gray-500">{mod.price_adjustment > 0 ? '+' : ''}{formatCurrency(mod.price_adjustment)}</span>
                  )}
                  {selectedModifiers.includes(mod.id) && <Check className="w-4 h-4 text-orange-500" />}
                </div>
              </button>
            ))}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => { addItem(modifierProduct!); setModifierProduct(null); setSelectedModifiers([]); }}>Sin variaciones</Button>
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleConfirmModifiers}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickSale;

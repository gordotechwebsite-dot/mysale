import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getProducts, getLocations, createSale, decodeWeightedBarcode } from '../api';
import type { Product } from '../types';
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
  Package
} from 'lucide-react';

const QuickSale: React.FC = () => {
  const { items, addItem, removeItem, updateQuantity, clearCart, total, subtotal } = useCart();
  const { user } = useAuth();
  const searchRef = useRef<HTMLInputElement>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [weightedProductInfo, setWeightedProductInfo] = useState<{
    product_name: string;
    weight_kg: number;
    price_per_kg: number;
    total_price: number;
  } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      loadProducts();
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.includes(searchTerm)
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  const loadInitialData = async () => {
    try {
      const locs = await getLocations();
      const posLocations = locs.filter(l => l.location_type === 'pos');
      // Use user's assigned location if available, otherwise first POS location
      if (user?.location_id) {
        setSelectedLocation(user.location_id);
        const userLoc = locs.find(l => l.id === user.location_id);
        if (userLoc) setLocationName(userLoc.name);
      } else if (posLocations.length > 0) {
        setSelectedLocation(posLocations[0].id);
        setLocationName(posLocations[0].name);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadProducts = async () => {
    if (!selectedLocation) return;
    setIsLoading(true);
    try {
      const data = await getProducts({ location_id: selectedLocation });
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
      searchRef.current?.focus();
    }
  };

  const handleProductClick = (product: Product) => {
    addItem(product);
    setSearchTerm('');
    searchRef.current?.focus();
  };

  const handleWeightedBarcode = async (barcode: string) => {
    try {
      const result = await decodeWeightedBarcode(barcode);
      if (result.found && result.product_id && result.total_price !== undefined) {
        const weightedProduct: Product = {
          id: result.product_id,
          code: result.product_code || '',
          barcode: barcode,
          name: `${result.product_name} (${result.weight_kg?.toFixed(3)} kg)`,
          description: null,
          subfamily_id: 0,
          unit: 'kg',
          sale_price: result.total_price,
          weighted_cost: 0,
          min_stock: 0,
          max_stock: 0,
          is_active: true,
          is_weighted: true,
          price_per_kg: result.price_per_kg || 0,
          plu_code: result.plu_code || null,
          created_at: ''
        };
        addItem(weightedProduct);
        setWeightedProductInfo({
          product_name: result.product_name || '',
          weight_kg: result.weight_kg || 0,
          price_per_kg: result.price_per_kg || 0,
          total_price: result.total_price
        });
        setTimeout(() => setWeightedProductInfo(null), 3000);
        setSearchTerm('');
        searchRef.current?.focus();
      } else {
        alert(result.error || 'Producto pesable no encontrado');
      }
    } catch (error) {
      console.error('Error decoding weighted barcode:', error);
      alert('Error al decodificar codigo de barras');
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
      setShowSuccess(true);
      setAmountReceived('');
      
      setTimeout(() => {
        setShowSuccess(false);
        searchRef.current?.focus();
      }, 2000);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al procesar la venta');
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

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Venta Rapida</h1>
            <p className="text-sm text-gray-500">Selecciona productos y cobra al instante</p>
          </div>
        </div>
        {locationName && (
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg">
            <span className="text-sm text-gray-500">Sucursal:</span>
            <span className="text-sm font-semibold text-gray-800">{locationName}</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex gap-4">
        <div className="flex-1 flex flex-col">
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
                autoFocus
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

          <div className="flex-1 overflow-auto">
            {!selectedLocation ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>Selecciona un punto de venta para comenzar</p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md hover:bg-orange-50 transition-all text-left border-2 border-transparent hover:border-orange-500 active:scale-95 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.code}</p>
                      <p className="text-lg font-bold text-orange-600 mt-1">
                        {formatCurrency(product.sale_price)}
                      </p>
                    </div>
                    {(product as any).image_url ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL}${(product as any).image_url}`}
                        alt={product.name}
                        className="w-16 h-16 object-contain rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Card className="w-96 flex flex-col">
          <div className="p-4 border-b bg-orange-50">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-orange-600" />
                Talon de Venta
              </h3>
              {items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={clearCart}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingCart className="w-16 h-16 mb-4" />
                <p>Talon vacio</p>
                <p className="text-sm">Agregue productos para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.product.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product.name}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(item.product.sale_price)} c/u</p>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="font-bold">
                        {formatCurrency(item.product.sale_price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-orange-50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-bold">TOTAL:</span>
              <span className="text-2xl font-bold text-orange-600">{formatCurrency(total)}</span>
            </div>
            <Button
              className="w-full h-14 text-lg font-bold bg-orange-600 hover:bg-orange-700"
              disabled={items.length === 0}
              onClick={() => setShowPayment(true)}
            >
              <Zap className="w-5 h-5 mr-2" />
              Cobrar Rapido (F2)
            </Button>
          </div>
        </Card>
      </div>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-md">
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
                  paymentMethod === 'cash'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Banknote className={`w-8 h-8 ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-400'}`} />
                <span className={`font-medium ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-600'}`}>
                  Efectivo
                </span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CreditCard className={`w-8 h-8 ${paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`font-medium ${paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-600'}`}>
                  Tarjeta
                </span>
              </button>
              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === 'transfer'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Smartphone className={`w-8 h-8 ${paymentMethod === 'transfer' ? 'text-purple-600' : 'text-gray-400'}`} />
                <span className={`font-medium ${paymentMethod === 'transfer' ? 'text-purple-600' : 'text-gray-600'}`}>
                  Transfer
                </span>
              </button>
            </div>

            {paymentMethod === 'cash' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Monto Recibido</label>
                  <Input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="0"
                    className="h-14 text-2xl text-center font-bold mt-2"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  {quickAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      className="flex-1"
                      onClick={() => setAmountReceived(amount.toString())}
                    >
                      {formatCurrency(amount)}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setAmountReceived(total.toString())}
                >
                  Monto Exacto
                </Button>
                {change > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600">Cambio a devolver</p>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(change)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isProcessing || (paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < total))}
              className="bg-orange-600 hover:bg-orange-700 min-w-32"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Confirmar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
};

export default QuickSale;

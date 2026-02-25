import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShift } from '../context/ShiftContext';
import { useCart } from '../context/CartContext';
import { getProducts, createSale } from '../api';
import type { Product } from '../types';
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
  X
} from 'lucide-react';

const POS: React.FC = () => {
  const { currentShift } = useShift();
  const { items, addItem, removeItem, updateQuantity, clearCart, total, subtotal } = useCart();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  useEffect(() => {
    if (!currentShift) {
      navigate('/');
      return;
    }
    loadProducts();
    searchRef.current?.focus();
  }, [currentShift]);

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

  const loadProducts = async () => {
    try {
      const data = await getProducts({ location_id: currentShift?.location_id });
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductClick = (product: Product) => {
    addItem(product);
    setSearchTerm('');
    searchRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredProducts.length === 1) {
      handleProductClick(filteredProducts[0]);
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

  if (!currentShift) {
    return null;
  }

  return (
    <div className="h-[calc(100vh-140px)] flex gap-4">
      {/* Products Section */}
      <div className="flex-1 flex flex-col">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search 
              className="absolute left-4 top-1/2 -translate-y-1/2" 
              size={20}
              style={{ color: '#6b7280' }} 
            />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar producto por nombre, codigo o escanear codigo de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-12 pl-12 pr-4 text-base outline-none transition-all duration-200"
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
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00a86b' }} />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="bg-white p-4 text-left transition-all duration-200 active:scale-95"
                  style={{ 
                    borderRadius: '12px',
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
                  <p className="font-semibold truncate" style={{ color: '#111827' }}>{product.name}</p>
                  <p className="text-xs" style={{ color: '#6b7280' }}>{product.code}</p>
                  <p className="text-lg font-bold mt-2" style={{ color: '#00a86b' }}>
                    {formatCurrency(product.sale_price)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div 
        className="w-96 flex flex-col bg-white"
        style={{ 
          borderRadius: '18px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)'
        }}
      >
        {/* Cart Header */}
        <div className="p-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base flex items-center gap-2" style={{ color: '#111827' }}>
              <ShoppingCart size={20} />
              Carrito
            </h3>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="flex items-center gap-1 text-sm font-medium transition-colors"
                style={{ color: '#ef4444' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
              >
                <Trash2 size={16} />
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full" style={{ color: '#9ca3af' }}>
              <ShoppingCart size={48} className="mb-4" />
              <p className="font-medium">Carrito vacio</p>
              <p className="text-sm">Agregue productos para comenzar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div 
                  key={item.product.id} 
                  className="p-3"
                  style={{ 
                    backgroundColor: '#f6f7f9',
                    borderRadius: '12px'
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm" style={{ color: '#111827' }}>{item.product.name}</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>{formatCurrency(item.product.sale_price)} c/u</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="p-1 transition-opacity"
                      style={{ color: '#ef4444' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center transition-colors"
                        style={{ 
                          borderRadius: '50%',
                          backgroundColor: '#e5e7eb',
                          color: '#111827'
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#d1d5db'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#e5e7eb'; }}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-10 text-center font-bold" style={{ color: '#111827' }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-white transition-colors"
                        style={{ 
                          borderRadius: '50%',
                          backgroundColor: '#00a86b'
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#00965f'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#00a86b'; }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <p className="font-bold" style={{ color: '#111827' }}>
                      {formatCurrency(item.product.sale_price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        <div className="p-4" style={{ borderTop: '1px solid #e5e7eb' }}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm" style={{ color: '#6b7280' }}>Subtotal:</span>
            <span className="font-semibold" style={{ color: '#111827' }}>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-bold" style={{ color: '#111827' }}>TOTAL:</span>
            <span className="text-2xl font-bold" style={{ color: '#00a86b' }}>{formatCurrency(total)}</span>
          </div>
          <button
            disabled={items.length === 0}
            onClick={() => setShowPayment(true)}
            className="w-full h-12 text-base font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: '#00a86b',
              borderRadius: '12px'
            }}
            onMouseEnter={(e) => { 
              if (items.length > 0) (e.currentTarget as HTMLElement).style.backgroundColor = '#00965f'; 
            }}
            onMouseLeave={(e) => { 
              (e.currentTarget as HTMLElement).style.backgroundColor = '#00a86b'; 
            }}
          >
            Cobrar (F2)
          </button>
        </div>
      </div>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Metodo de Pago</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="text-center mb-6">
              <p className="text-gray-500">Total a cobrar</p>
              <p className="text-4xl font-bold text-blue-600">{formatCurrency(total)}</p>
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
                  <label className="text-sm font-medium" style={{ color: '#6b7280' }}>Monto Recibido</label>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmountReceived(e.target.value)}
                    placeholder="0"
                    className="w-full h-14 text-2xl text-center font-bold mt-2 outline-none transition-all duration-200"
                    style={{ 
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
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
                </div>
                <div className="flex gap-2">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      className="flex-1 h-10 font-medium transition-all duration-200"
                      style={{ 
                        borderRadius: '10px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: 'white',
                        color: '#111827'
                      }}
                      onClick={() => setAmountReceived(amount.toString())}
                      onMouseEnter={(e) => { 
                        (e.currentTarget as HTMLElement).style.borderColor = '#00a86b';
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 168, 107, 0.05)';
                      }}
                      onMouseLeave={(e) => { 
                        (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'white';
                      }}
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                </div>
                <button
                  className="w-full h-10 font-medium transition-all duration-200"
                  style={{ 
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: 'white',
                    color: '#111827'
                  }}
                  onClick={() => setAmountReceived(total.toString())}
                  onMouseEnter={(e) => { 
                    (e.currentTarget as HTMLElement).style.borderColor = '#00a86b';
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 168, 107, 0.05)';
                  }}
                  onMouseLeave={(e) => { 
                    (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'white';
                  }}
                >
                  Monto Exacto
                </button>
                {change > 0 && (
                  <div 
                    className="p-4 text-center"
                    style={{ 
                      backgroundColor: 'rgba(0, 168, 107, 0.1)',
                      borderRadius: '12px'
                    }}
                  >
                    <p className="text-sm" style={{ color: '#6b7280' }}>Cambio a devolver</p>
                    <p className="text-3xl font-bold" style={{ color: '#00a86b' }}>{formatCurrency(change)}</p>
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
              className="bg-green-600 hover:bg-green-700 min-w-32"
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
    </div>
  );
};

export default POS;

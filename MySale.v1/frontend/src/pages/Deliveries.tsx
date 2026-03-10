import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { getProducts, getLocations, getDeliveries, createDelivery } from '../api';
import type { Product, Location, Delivery } from '../types';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from 'lucide-react';

const Deliveries: React.FC = () => {
  const { items, addItem, removeItem, updateQuantity, clearCart, total, subtotal } = useCart();
  const searchRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
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

  // Delivery list
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

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
      const [locs, deliveriesData] = await Promise.all([
        getLocations(),
        getDeliveries()
      ]);
      const posLocations = locs.filter(l => l.location_type === 'pos');
      setLocations(posLocations);
      setDeliveries(deliveriesData);
      if (posLocations.length > 0) {
        setSelectedLocation(posLocations[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
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

  const loadDeliveries = async () => {
    try {
      const data = await getDeliveries();
      setDeliveries(data);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    }
  };

  const handleProductClick = (product: Product) => {
    addItem(product);
    setSearchTerm('');
    searchRef.current?.focus();
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
      alert('Complete los datos del cliente (nombre, telefono, direccion)');
      return;
    }

    setIsProcessing(true);
    try {
      const fee = parseFloat(deliveryFee) || 0;
      const grandTotal = total + fee;
      await createDelivery({
        payment_method: paymentMethod,
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          discount: item.discount
        })),
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        delivery_person: deliveryPerson || undefined,
        delivery_fee: fee,
        amount_received: paymentMethod === 'cash' ? parseFloat(amountReceived) || grandTotal : undefined,
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
      await loadDeliveries();

      setTimeout(() => {
        setShowSuccess(false);
        searchRef.current?.focus();
      }, 2000);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al registrar domicilio');
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


  return (
    <div className="h-[calc(100vh-180px)] flex flex-col gap-4 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
            <Bike className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Domicilios</h1>
            <p className="text-sm text-gray-500">Registra ventas para envio a domicilio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Punto de Venta:</span>
          <Select
            value={selectedLocation?.toString() || ''}
            onValueChange={(value) => setSelectedLocation(parseInt(value))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Seleccionar ubicacion" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id.toString()}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1">
          <div className="flex gap-4 h-full">
            {/* Product selection - left */}
            <div className="flex-1 flex flex-col">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    ref={searchRef}
                    type="text"
                    placeholder="Buscar producto por nombre, codigo o escanear..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-12 h-12 text-lg"
                    autoFocus
                  />
                </div>
              </div>

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
                          <p className="text-xs text-gray-500">{product.code}</p>
                          <p className="text-lg font-bold text-purple-600 mt-1">
                            {formatCurrency(product.sale_price)}
                          </p>
                        </div>
                        {(product as any).image_url ? (
                          <img
                            src={`${import.meta.env.VITE_API_URL}${(product as any).image_url}`}
                            alt={product.name}
                            className="w-14 h-14 object-contain rounded-lg flex-shrink-0"
                          />
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
            <Card className="w-[420px] flex flex-col">
              <div className="p-4 border-b bg-purple-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Bike className="w-5 h-5 text-purple-600" />
                    Pedido a Domicilio
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

              {/* Customer info */}
              <div className="p-3 border-b space-y-2">
                <h4 className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                  <User className="w-4 h-4" /> Datos del Cliente
                </h4>
                <Input
                  placeholder="Nombre del cliente *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-9 text-sm"
                />
                <Input
                  placeholder="Telefono *"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-9 text-sm"
                />
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Direccion de entrega *"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="h-9 text-sm pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Domiciliario (opcional)"
                    value={deliveryPerson}
                    onChange={(e) => setDeliveryPerson(e.target.value)}
                    className="h-9 text-sm flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="$ Domicilio"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    className="h-9 text-sm w-28"
                  />
                </div>
              </div>

              {/* Payment method */}
              <div className="p-3 border-b space-y-2">
                <h4 className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                  <CreditCard className="w-4 h-4" /> Método de Pago
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-sm ${
                      paymentMethod === 'cash'
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    <span className="font-medium">Efectivo</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('transfer')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-sm ${
                      paymentMethod === 'transfer'
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="font-medium">Nequi</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-sm ${
                      paymentMethod === 'card'
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="font-medium">Bre-B</span>
                  </button>
                </div>
                {paymentMethod === 'cash' && (
                  <Input
                    type="number"
                    placeholder="Monto recibido (opcional)"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="h-9 text-sm"
                  />
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
                      <div key={item.product.id} className="bg-gray-50 rounded-lg p-2">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.product.name}</p>
                            <p className="text-xs text-gray-500">{formatCurrency(item.product.sale_price)} c/u</p>
                          </div>
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-7 h-7 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="font-bold text-sm">
                            {formatCurrency(item.product.sale_price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="p-3 border-t bg-purple-50">
                <div className="flex justify-between items-center mb-1 text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                {fee > 0 && (
                  <div className="flex justify-between items-center mb-1 text-sm">
                    <span className="text-gray-600">Domicilio:</span>
                    <span className="font-semibold">{formatCurrency(fee)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-bold">TOTAL:</span>
                  <span className="text-xl font-bold text-purple-600">{formatCurrency(grandTotal)}</span>
                </div>
                <Button
                  className="w-full h-12 text-base font-bold bg-purple-600 hover:bg-purple-700"
                  disabled={items.length === 0 || !customerName || !customerPhone || !customerAddress}
                  onClick={() => setShowPayment(true)}
                >
                  <Bike className="w-5 h-5 mr-2" />
                  Registrar Domicilio (F2)
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Pago del Domicilio</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="text-center mb-4">
              <p className="text-gray-500">Total a cobrar</p>
              <p className="text-4xl font-bold text-purple-600">{formatCurrency(grandTotal)}</p>
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
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Banknote className={`w-7 h-7 ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-600'}`}>
                  Efectivo
                </span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CreditCard className={`w-7 h-7 ${paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-600'}`}>
                  Tarjeta
                </span>
              </button>
              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'transfer'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Smartphone className={`w-7 h-7 ${paymentMethod === 'transfer' ? 'text-purple-600' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${paymentMethod === 'transfer' ? 'text-purple-600' : 'text-gray-600'}`}>
                  Transfer
                </span>
              </button>
            </div>

            {paymentMethod === 'cash' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Monto Recibido</label>
                  <Input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="0"
                    className="text-2xl h-14 text-center font-bold"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  {quickAmounts.map((amt) => (
                    <Button
                      key={amt}
                      variant="outline"
                      className="flex-1"
                      onClick={() => setAmountReceived(amt.toString())}
                    >
                      {formatCurrency(amt)}
                    </Button>
                  ))}
                </div>
                {change > 0 && (
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-green-600">Cambio</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(change)}</p>
                  </div>
                )}
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
    </div>
  );
};

export default Deliveries;

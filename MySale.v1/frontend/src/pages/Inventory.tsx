import React, { useState, useEffect } from 'react';
import {
  getGroups, getFamilies, getSubFamilies, getProducts,
  createGroup, createFamily, createSubFamily, createProduct, registerPurchase,
  getLocations, getTransfers, createTransfer, receiveTransfer
} from '../api';
import type { Group, Family, SubFamily, Product, Location, Transfer } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Search, Loader2, ShoppingBag, Truck, Trash2, Check } from 'lucide-react';

const Inventory: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [subFamilies, setSubFamilies] = useState<SubFamily[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  const [selectedSubFamily, setSelectedSubFamily] = useState<string>('');

  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [showAddSubFamily, setShowAddSubFamily] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [newFamily, setNewFamily] = useState({ name: '', group_id: '', description: '' });
  const [newSubFamily, setNewSubFamily] = useState({ name: '', family_id: '', description: '' });
  const [newProduct, setNewProduct] = useState({
    code: '', barcode: '', name: '', description: '',
    subfamily_id: '', unit: 'unidad', sale_price: '', min_stock: '0', max_stock: '100'
  });
  const [purchase, setPurchase] = useState({
    product_id: 0, location_id: '', quantity: '', unit_cost: ''
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Transfers state
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [showAddTransfer, setShowAddTransfer] = useState(false);
  const [newTransfer, setNewTransfer] = useState({
    from_location_id: '',
    to_location_id: '',
    notes: '',
    items: [] as { product_id: number; product_name: string; quantity: number }[]
  });
  const [transferProduct, setTransferProduct] = useState('');
  const [transferQuantity, setTransferQuantity] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedSubFamily, searchTerm]);

  const loadData = async () => {
    try {
      const [groupsData, familiesData, subFamiliesData, locationsData, transfersData] = await Promise.all([
        getGroups(),
        getFamilies(),
        getSubFamilies(),
        getLocations(),
        getTransfers()
      ]);
      setGroups(groupsData);
      setFamilies(familiesData);
      setSubFamilies(subFamiliesData);
      setLocations(locationsData);
      setTransfers(transfersData);
      await loadProducts();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const params: any = {};
      if (selectedSubFamily) params.subfamily_id = parseInt(selectedSubFamily);
      if (searchTerm) params.search = searchTerm;
      const data = await getProducts(params);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleAddGroup = async () => {
    setIsProcessing(true);
    try {
      await createGroup(newGroup);
      await loadData();
      setShowAddGroup(false);
      setNewGroup({ name: '', description: '' });
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al crear grupo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddFamily = async () => {
    setIsProcessing(true);
    try {
      await createFamily({ ...newFamily, group_id: parseInt(newFamily.group_id) });
      await loadData();
      setShowAddFamily(false);
      setNewFamily({ name: '', group_id: '', description: '' });
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al crear familia');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddSubFamily = async () => {
    setIsProcessing(true);
    try {
      await createSubFamily({ ...newSubFamily, family_id: parseInt(newSubFamily.family_id) });
      await loadData();
      setShowAddSubFamily(false);
      setNewSubFamily({ name: '', family_id: '', description: '' });
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al crear subfamilia');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddProduct = async () => {
    setIsProcessing(true);
    try {
      await createProduct({
        ...newProduct,
        subfamily_id: parseInt(newProduct.subfamily_id),
        sale_price: parseFloat(newProduct.sale_price),
        min_stock: parseInt(newProduct.min_stock),
        max_stock: parseInt(newProduct.max_stock)
      });
      await loadProducts();
      setShowAddProduct(false);
      setNewProduct({
        code: '', barcode: '', name: '', description: '',
        subfamily_id: '', unit: 'unidad', sale_price: '', min_stock: '0', max_stock: '100'
      });
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al crear producto');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchase = async () => {
    setIsProcessing(true);
    try {
      await registerPurchase({
        product_id: purchase.product_id,
        location_id: parseInt(purchase.location_id),
        quantity: parseInt(purchase.quantity),
        unit_cost: parseFloat(purchase.unit_cost)
      });
      await loadProducts();
      setShowPurchase(false);
      setPurchase({ product_id: 0, location_id: '', quantity: '', unit_cost: '' });
      setSelectedProduct(null);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al registrar compra');
    } finally {
      setIsProcessing(false);
    }
  };

  const openPurchaseDialog = (product: Product) => {
    setSelectedProduct(product);
    setPurchase({ ...purchase, product_id: product.id });
    setShowPurchase(true);
  };

  // Transfer handlers
  const addItemToTransfer = () => {
    if (!transferProduct || !transferQuantity) return;
    const product = products.find(p => p.id === parseInt(transferProduct));
    if (!product) return;
    setNewTransfer({
      ...newTransfer,
      items: [...newTransfer.items, {
        product_id: product.id,
        product_name: product.name,
        quantity: parseInt(transferQuantity)
      }]
    });
    setTransferProduct('');
    setTransferQuantity('');
  };

  const removeItemFromTransfer = (index: number) => {
    setNewTransfer({
      ...newTransfer,
      items: newTransfer.items.filter((_, i) => i !== index)
    });
  };

  const handleAddTransfer = async () => {
    setIsProcessing(true);
    try {
      await createTransfer({
        from_location_id: parseInt(newTransfer.from_location_id),
        to_location_id: parseInt(newTransfer.to_location_id),
        notes: newTransfer.notes || undefined,
        items: newTransfer.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      });
      await loadData();
      setShowAddTransfer(false);
      setNewTransfer({ from_location_id: '', to_location_id: '', notes: '', items: [] });
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al crear transferencia');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceiveTransfer = async (id: number) => {
    if (!confirm('Confirmar recepcion de transferencia?')) return;
    try {
      await receiveTransfer(id);
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al recibir transferencia');
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      in_transit: 'bg-blue-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500'
    };
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      in_transit: 'En Transito',
      completed: 'Completada',
      cancelled: 'Cancelada'
    };
    return <Badge className={colors[status] || 'bg-gray-500'}>{labels[status] || status}</Badge>;
  };

  const filteredFamilies = selectedGroup
    ? families.filter(f => f.group_id === parseInt(selectedGroup))
    : families;

  const filteredSubFamilies = selectedFamily
    ? subFamilies.filter(sf => sf.family_id === parseInt(selectedFamily))
    : subFamilies;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="products">
        <TabsList className="mb-4">
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="transfers">Traspasos</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Productos
                </CardTitle>
                <Button onClick={() => setShowAddProduct(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Producto
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                                <Select value={selectedGroup || "all"} onValueChange={(v) => { setSelectedGroup(v === "all" ? "" : v); setSelectedFamily(''); setSelectedSubFamily(''); }}>
                                  <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Grupo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {groups.map(g => (
                                      <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select value={selectedFamily || "all"} onValueChange={(v) => { setSelectedFamily(v === "all" ? "" : v); setSelectedSubFamily(''); }}>
                                  <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Familia" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {filteredFamilies.map(f => (
                                      <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select value={selectedSubFamily || "all"} onValueChange={(v) => setSelectedSubFamily(v === "all" ? "" : v)}>
                                  <SelectTrigger className="w-40">
                                    <SelectValue placeholder="SubFamilia" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {filteredSubFamilies.map(sf => (
                                      <SelectItem key={sf.id} value={sf.id.toString()}>{sf.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Codigo</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Precio Venta</TableHead>
                      <TableHead>Costo Prom.</TableHead>
                      <TableHead>Stock Min/Max</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono">{product.code}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{formatCurrency(product.sale_price)}</TableCell>
                        <TableCell>{formatCurrency(product.weighted_cost)}</TableCell>
                        <TableCell>{product.min_stock} / {product.max_stock}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPurchaseDialog(product)}
                          >
                            <ShoppingBag className="w-4 h-4 mr-1" />
                            Compra
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Grupos</CardTitle>
                  <Button size="sm" onClick={() => setShowAddGroup(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {groups.map(g => (
                    <div key={g.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium">{g.name}</p>
                      {g.description && <p className="text-sm text-gray-500">{g.description}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Familias</CardTitle>
                  <Button size="sm" onClick={() => setShowAddFamily(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {families.map(f => (
                    <div key={f.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium">{f.name}</p>
                      <p className="text-xs text-gray-500">
                        {groups.find(g => g.id === f.group_id)?.name}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">SubFamilias</CardTitle>
                  <Button size="sm" onClick={() => setShowAddSubFamily(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {subFamilies.map(sf => (
                    <div key={sf.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium">{sf.name}</p>
                      <p className="text-xs text-gray-500">
                        {families.find(f => f.id === sf.family_id)?.name}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transfers">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Transferencias entre Ubicaciones
                </CardTitle>
                <Button onClick={() => setShowAddTransfer(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Transferencia
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado por</TableHead>
                      <TableHead>Valor (Precio Venta)</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell>{formatDateTime(transfer.created_at)}</TableCell>
                        <TableCell>{transfer.from_location_name}</TableCell>
                        <TableCell>{transfer.to_location_name}</TableCell>
                        <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                        <TableCell>{transfer.created_by_name}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(transfer.total_value_at_sale_price)}
                        </TableCell>
                        <TableCell>
                          {transfer.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleReceiveTransfer(transfer.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Recibir
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transfer Dialog */}
      <Dialog open={showAddTransfer} onOpenChange={setShowAddTransfer}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Transferencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Select value={newTransfer.from_location_id} onValueChange={(v) => setNewTransfer({ ...newTransfer, from_location_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Ubicacion origen *" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(l => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newTransfer.to_location_id} onValueChange={(v) => setNewTransfer({ ...newTransfer, to_location_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Ubicacion destino *" />
                </SelectTrigger>
                <SelectContent>
                  {locations.filter(l => l.id.toString() !== newTransfer.from_location_id).map(l => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Notas (opcional)"
              value={newTransfer.notes}
              onChange={(e) => setNewTransfer({ ...newTransfer, notes: e.target.value })}
            />
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Agregar Productos</h4>
              <div className="flex gap-2 mb-4">
                <Select value={transferProduct} onValueChange={setTransferProduct}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccione producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Cantidad"
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(e.target.value)}
                  className="w-32"
                />
                <Button type="button" onClick={addItemToTransfer} disabled={!transferProduct || !transferQuantity}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {newTransfer.items.length > 0 && (
                <div className="space-y-2">
                  {newTransfer.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-gray-500 ml-2">x{item.quantity}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItemFromTransfer(index)}
                        className="text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTransfer(false)}>Cancelar</Button>
            <Button
              onClick={handleAddTransfer}
              disabled={isProcessing || !newTransfer.from_location_id || !newTransfer.to_location_id || newTransfer.items.length === 0}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Transferencia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddGroup} onOpenChange={setShowAddGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Nombre del grupo"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
            />
            <Input
              placeholder="Descripcion (opcional)"
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGroup(false)}>Cancelar</Button>
            <Button onClick={handleAddGroup} disabled={isProcessing || !newGroup.name}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddFamily} onOpenChange={setShowAddFamily}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Familia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={newFamily.group_id} onValueChange={(v) => setNewFamily({ ...newFamily, group_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione grupo" />
              </SelectTrigger>
              <SelectContent>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Nombre de la familia"
              value={newFamily.name}
              onChange={(e) => setNewFamily({ ...newFamily, name: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFamily(false)}>Cancelar</Button>
            <Button onClick={handleAddFamily} disabled={isProcessing || !newFamily.name || !newFamily.group_id}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddSubFamily} onOpenChange={setShowAddSubFamily}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva SubFamilia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={newSubFamily.family_id} onValueChange={(v) => setNewSubFamily({ ...newSubFamily, family_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione familia" />
              </SelectTrigger>
              <SelectContent>
                {families.map(f => (
                  <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Nombre de la subfamilia"
              value={newSubFamily.name}
              onChange={(e) => setNewSubFamily({ ...newSubFamily, name: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSubFamily(false)}>Cancelar</Button>
            <Button onClick={handleAddSubFamily} disabled={isProcessing || !newSubFamily.name || !newSubFamily.family_id}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Codigo *"
                value={newProduct.code}
                onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
              />
              <Input
                placeholder="Codigo de barras"
                value={newProduct.barcode}
                onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
              />
            </div>
            <Input
              placeholder="Nombre del producto *"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            />
            <Select value={newProduct.subfamily_id} onValueChange={(v) => setNewProduct({ ...newProduct, subfamily_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione subfamilia *" />
              </SelectTrigger>
              <SelectContent>
                {subFamilies.map(sf => (
                  <SelectItem key={sf.id} value={sf.id.toString()}>{sf.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                placeholder="Precio de venta *"
                value={newProduct.sale_price}
                onChange={(e) => setNewProduct({ ...newProduct, sale_price: e.target.value })}
              />
              <Input
                placeholder="Unidad"
                value={newProduct.unit}
                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                placeholder="Stock minimo"
                value={newProduct.min_stock}
                onChange={(e) => setNewProduct({ ...newProduct, min_stock: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Stock maximo"
                value={newProduct.max_stock}
                onChange={(e) => setNewProduct({ ...newProduct, max_stock: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProduct(false)}>Cancelar</Button>
            <Button
              onClick={handleAddProduct}
              disabled={isProcessing || !newProduct.code || !newProduct.name || !newProduct.subfamily_id || !newProduct.sale_price}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPurchase} onOpenChange={setShowPurchase}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedProduct && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-gray-500">Codigo: {selectedProduct.code}</p>
              </div>
            )}
            <Select value={purchase.location_id} onValueChange={(v) => setPurchase({ ...purchase, location_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione ubicacion" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(l => (
                  <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Cantidad"
              value={purchase.quantity}
              onChange={(e) => setPurchase({ ...purchase, quantity: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Costo unitario"
              value={purchase.unit_cost}
              onChange={(e) => setPurchase({ ...purchase, unit_cost: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchase(false)}>Cancelar</Button>
            <Button
              onClick={handlePurchase}
              disabled={isProcessing || !purchase.location_id || !purchase.quantity || !purchase.unit_cost}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;

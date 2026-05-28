import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  getGroups, getFamilies, getSubFamilies, getProducts,
  createGroup, createFamily, createSubFamily, createProduct, registerPurchase,
  getLocations, getTransfers, createTransfer, receiveTransfer,
  getLosses, createLoss,
  updateProduct, deleteProduct, deleteFamily, deleteSubFamily, deleteGroup,
  updateGroup, updateFamily, updateSubFamily,
  getStockAlerts,
  getProductModifiers, createProductModifier, deleteProductModifier
} from '../api';
import type { Group, Family, SubFamily, Product, Location, Transfer, Loss, ProductModifier } from '../types';
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
import { Plus, Package, Search, Loader2, ShoppingBag, Truck, Trash2, Check, AlertTriangle, Pencil, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';

const Inventory: React.FC = () => {
  const { user } = useAuth();
  const isSuperuser = user?.role?.role_type === 'superuser';
  const [groups, setGroups] = useState<Group[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [subFamilies, setSubFamilies] = useState<SubFamily[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  const [selectedSubFamily, setSelectedSubFamily] = useState<string>('');
  const [productPage, setProductPage] = useState(1);
  const productsPerPage = 20;

  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [showAddSubFamily, setShowAddSubFamily] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductData, setEditProductData] = useState({ name: '', sale_price: '', code: '', barcode: '', min_stock: '', max_stock: '' });

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
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

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

  // Losses (Mermas) state
  const [losses, setLosses] = useState<Loss[]>([]);
  const [showAddLoss, setShowAddLoss] = useState(false);
  const [newLoss, setNewLoss] = useState({
    location_id: '',
    loss_type: '',
    description: '',
    items: [] as { product_id: number; product_name: string; quantity: number; reason: string }[]
  });
  const [lossProduct, setLossProduct] = useState('');
  const [lossQuantity, setLossQuantity] = useState('');
  const [lossReason, setLossReason] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);

  // Modifiers state
  const [modifiers, setModifiers] = useState<ProductModifier[]>([]);
  const [showModifiers, setShowModifiers] = useState(false);
  const [modifierProductId, setModifierProductId] = useState<number | null>(null);
  const [modifierProductName, setModifierProductName] = useState('');
  const [newModifier, setNewModifier] = useState({ name: '', price_adjustment: '0' });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedSubFamily, searchTerm]);

  const loadData = async () => {
    try {
      const [groupsData, familiesData, subFamiliesData, locationsData, transfersData, lossesData, alertsData] = await Promise.all([
        getGroups(),
        getFamilies(),
        getSubFamilies(),
        getLocations(),
        getTransfers(),
        getLosses(),
        getStockAlerts().catch(() => [])
      ]);
      setGroups(groupsData);
      setFamilies(familiesData);
      setSubFamilies(subFamiliesData);
      setLocations(locationsData);
      setTransfers(transfersData);
      setLosses(lossesData);
      setStockAlerts(alertsData);
      await loadProducts();
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar inventario');
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
      setProductPage(1);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error al cargar productos');
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
      toast.error(error.response?.data?.detail || 'Error al crear grupo');
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
      toast.error(error.response?.data?.detail || 'Error al crear familia');
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
      toast.error(error.response?.data?.detail || 'Error al crear subfamilia');
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
      toast.error(error.response?.data?.detail || 'Error al crear producto');
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
      toast.error(error.response?.data?.detail || 'Error al registrar compra');
    } finally {
      setIsProcessing(false);
    }
  };

  const openPurchaseDialog = (product: Product) => {
    setSelectedProduct(product);
    setPurchase({ ...purchase, product_id: product.id });
    setShowPurchase(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditProductData({
      name: product.name,
      sale_price: product.sale_price.toString(),
      code: product.code,
      barcode: product.barcode || '',
      min_stock: product.min_stock.toString(),
      max_stock: product.max_stock.toString()
    });
    setShowEditProduct(true);
  };

  const handleEditProduct = async () => {
    if (!editingProduct) return;
    setIsProcessing(true);
    try {
      await updateProduct(editingProduct.id, {
        name: editProductData.name,
        sale_price: parseFloat(editProductData.sale_price),
        code: editProductData.code,
        barcode: editProductData.barcode || undefined,
        min_stock: parseInt(editProductData.min_stock),
        max_stock: parseInt(editProductData.max_stock)
      });
      await loadProducts();
      setShowEditProduct(false);
      setEditingProduct(null);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al editar producto');
    } finally {
      setIsProcessing(false);
    }
  };

  const openModifiers = async (product: Product) => {
    setModifierProductId(product.id);
    setModifierProductName(product.name);
    setShowModifiers(true);
    try {
      const data = await getProductModifiers(product.id);
      setModifiers(data);
    } catch {
      toast.error('Error al cargar variaciones');
    }
  };

  const handleAddModifier = async () => {
    if (!modifierProductId || !newModifier.name) return;
    try {
      await createProductModifier(modifierProductId, {
        name: newModifier.name,
        price_adjustment: parseFloat(newModifier.price_adjustment) || 0
      });
      const data = await getProductModifiers(modifierProductId);
      setModifiers(data);
      setNewModifier({ name: '', price_adjustment: '0' });
      toast.success('Variación agregada');
    } catch {
      toast.error('Error al agregar variación');
    }
  };

  const handleDeleteModifier = async (modId: number) => {
    try {
      await deleteProductModifier(modId);
      setModifiers(prev => prev.filter(m => m.id !== modId));
      toast.success('Variación eliminada');
    } catch {
      toast.error('Error al eliminar variación');
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setConfirmAction({
      title: 'Eliminar producto',
      description: `¿Eliminar el producto "${product.name}"? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        try {
          const result = await deleteProduct(product.id);
          toast.success(result.message);
          await loadProducts();
        } catch (error: any) {
          toast.error(error.response?.data?.detail || 'Error al eliminar producto');
        }
        setConfirmAction(null);
      }
    });
  };

  const handleDeleteFamily = (family: Family) => {
    setConfirmAction({
      title: 'Eliminar familia',
      description: `¿Eliminar la familia "${family.name}"? Se eliminarán también sus subfamilias sin productos.`,
      onConfirm: async () => {
        try {
          await deleteFamily(family.id);
          await loadData();
        } catch (error: any) {
          toast.error(error.response?.data?.detail || 'Error al eliminar familia');
        }
        setConfirmAction(null);
      }
    });
  };

  const handleDeleteSubFamily = (sf: SubFamily) => {
    setConfirmAction({
      title: 'Eliminar subfamilia',
      description: `¿Eliminar la subfamilia "${sf.name}"?`,
      onConfirm: async () => {
        try {
          await deleteSubFamily(sf.id);
          await loadData();
        } catch (error: any) {
          toast.error(error.response?.data?.detail || 'Error al eliminar subfamilia');
        }
        setConfirmAction(null);
      }
    });
  };

  const handleDeleteGroup = (group: Group) => {
    setConfirmAction({
      title: 'Eliminar grupo',
      description: `¿Eliminar el grupo "${group.name}"?`,
      onConfirm: async () => {
        try {
          await deleteGroup(group.id);
          await loadData();
        } catch (error: any) {
          toast.error(error.response?.data?.detail || 'Error al eliminar grupo');
        }
        setConfirmAction(null);
      }
    });
  };

  const handleSaveCategoryName = async (type: 'group' | 'family' | 'subfamily', id: number) => {
    if (!editingCategoryName.trim()) return;
    try {
      if (type === 'group') await updateGroup(id, { name: editingCategoryName.trim() });
      else if (type === 'family') await updateFamily(id, { name: editingCategoryName.trim() });
      else await updateSubFamily(id, { name: editingCategoryName.trim() });
      setEditingCategoryId(null);
      await loadData();
      toast.success('Nombre actualizado');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al actualizar');
    }
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
      toast.error(error.response?.data?.detail || 'Error al crear transferencia');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceiveTransfer = (id: number) => {
    setConfirmAction({
      title: 'Recibir transferencia',
      description: '¿Confirmar recepción de transferencia?',
      onConfirm: async () => {
        try {
          await receiveTransfer(id);
          await loadData();
        } catch (error: any) {
          toast.error(error.response?.data?.detail || 'Error al recibir transferencia');
        }
        setConfirmAction(null);
      }
    });
  };

  // Losses handlers
  const lossTypes = [
    { value: 'breakage', label: 'Rotura' },
    { value: 'expiration', label: 'Vencimiento' },
    { value: 'theft', label: 'Robo' },
    { value: 'damage', label: 'Daño' },
    { value: 'other', label: 'Otro' }
  ];

  const addItemToLoss = () => {
    if (!lossProduct || !lossQuantity) return;
    const product = products.find(p => p.id === parseInt(lossProduct));
    if (!product) return;
    setNewLoss({
      ...newLoss,
      items: [...newLoss.items, {
        product_id: product.id,
        product_name: product.name,
        quantity: parseInt(lossQuantity),
        reason: lossReason
      }]
    });
    setLossProduct('');
    setLossQuantity('');
    setLossReason('');
  };

  const removeItemFromLoss = (index: number) => {
    setNewLoss({
      ...newLoss,
      items: newLoss.items.filter((_, i) => i !== index)
    });
  };

  const handleAddLoss = async () => {
    setIsProcessing(true);
    try {
      await createLoss({
        location_id: parseInt(newLoss.location_id),
        loss_type: newLoss.loss_type,
        description: newLoss.description || undefined,
        items: newLoss.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          reason: item.reason || undefined
        }))
      });
      await loadData();
      setShowAddLoss(false);
      setNewLoss({ location_id: '', loss_type: '', description: '', items: [] });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al registrar merma');
    } finally {
      setIsProcessing(false);
    }
  };

  const getLossTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      breakage: 'bg-red-500',
      expiration: 'bg-orange-500',
      theft: 'bg-purple-500',
      damage: 'bg-yellow-500',
      other: 'bg-gray-500'
    };
    const labels: Record<string, string> = {
      breakage: 'Rotura',
      expiration: 'Vencimiento',
      theft: 'Robo',
      damage: 'Daño',
      other: 'Otro'
    };
    return <Badge className={colors[type] || 'bg-gray-500'}>{labels[type] || type}</Badge>;
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
        <TabsList className="mb-4 flex flex-wrap gap-1">
          <TabsTrigger value="products" className="text-xs sm:text-sm">Productos</TabsTrigger>
          <TabsTrigger value="categories" className="text-xs sm:text-sm">Categorias</TabsTrigger>
          <TabsTrigger value="transfers" className="text-xs sm:text-sm">Traspasos</TabsTrigger>
          <TabsTrigger value="losses" className="text-xs sm:text-sm">Mermas</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs sm:text-sm flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Alertas de Stock
            {stockAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0 min-w-[18px] h-[18px]">{stockAlerts.length}</Badge>
            )}
          </TabsTrigger>
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
                                  <SelectTrigger className="w-full sm:w-40">
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
                                  <SelectTrigger className="w-full sm:w-40">
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
                                  <SelectTrigger className="w-full sm:w-40">
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

              {/* Mobile card layout */}
              <div className="sm:hidden space-y-3">
                {products.slice((productPage - 1) * productsPerPage, productPage * productsPerPage).map((product) => (
                  <div key={product.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{product.code}</p>
                      </div>
                      <p className="text-sm font-bold text-emerald-600">{formatCurrency(product.sale_price)}</p>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Costo: {formatCurrency(product.weighted_cost)}</span>
                      <span>Stock: {product.min_stock}/{product.max_stock}</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => openPurchaseDialog(product)}>
                        <ShoppingBag className="w-3 h-3 mr-1" /> Compra
                      </Button>
                      {isSuperuser && (
                        <>
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openModifiers(product)}>
                            Variaciones
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openEditProduct(product)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteProduct(product)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table layout */}
              <div className="hidden sm:block overflow-x-auto">
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
                    {products.slice((productPage - 1) * productsPerPage, productPage * productsPerPage).map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono">{product.code}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{formatCurrency(product.sale_price)}</TableCell>
                        <TableCell>{formatCurrency(product.weighted_cost)}</TableCell>
                        <TableCell>{product.min_stock} / {product.max_stock}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPurchaseDialog(product)}
                            >
                              <ShoppingBag className="w-4 h-4 mr-1" />
                              Compra
                            </Button>
                            {isSuperuser && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openModifiers(product)}
                                  title="Variaciones"
                                >
                                  Var.
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditProduct(product)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteProduct(product)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {products.length > productsPerPage && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-gray-500">
                    Mostrando {Math.min((productPage - 1) * productsPerPage + 1, products.length)}-{Math.min(productPage * productsPerPage, products.length)} de {products.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={productPage === 1} onClick={() => setProductPage(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {Array.from({ length: Math.ceil(products.length / productsPerPage) }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === Math.ceil(products.length / productsPerPage) || Math.abs(p - productPage) <= 1)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-gray-400">...</span>}
                          <Button variant={p === productPage ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setProductPage(p)}>
                            {p}
                          </Button>
                        </React.Fragment>
                      ))}
                    <Button variant="outline" size="sm" disabled={productPage >= Math.ceil(products.length / productsPerPage)} onClick={() => setProductPage(p => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
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
                    <div key={g.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        {editingCategoryId === `group-${g.id}` ? (
                          <div className="flex items-center gap-1">
                            <Input value={editingCategoryName} onChange={e => setEditingCategoryName(e.target.value)} className="h-7 text-sm" autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveCategoryName('group', g.id); if (e.key === 'Escape') setEditingCategoryId(null); }} />
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => handleSaveCategoryName('group', g.id)}><Check className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingCategoryId(null)}><X className="w-3 h-3" /></Button>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium">{g.name}</p>
                            {g.description && <p className="text-sm text-gray-500">{g.description}</p>}
                          </>
                        )}
                      </div>
                      {isSuperuser && editingCategoryId !== `group-${g.id}` && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="text-blue-500 hover:text-blue-700" onClick={() => { setEditingCategoryId(`group-${g.id}`); setEditingCategoryName(g.name); }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteGroup(g)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
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
                    <div key={f.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        {editingCategoryId === `family-${f.id}` ? (
                          <div className="flex items-center gap-1">
                            <Input value={editingCategoryName} onChange={e => setEditingCategoryName(e.target.value)} className="h-7 text-sm" autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveCategoryName('family', f.id); if (e.key === 'Escape') setEditingCategoryId(null); }} />
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => handleSaveCategoryName('family', f.id)}><Check className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingCategoryId(null)}><X className="w-3 h-3" /></Button>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium">{f.name}</p>
                            <p className="text-xs text-gray-500">{groups.find(g => g.id === f.group_id)?.name}</p>
                          </>
                        )}
                      </div>
                      {isSuperuser && editingCategoryId !== `family-${f.id}` && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="text-blue-500 hover:text-blue-700" onClick={() => { setEditingCategoryId(`family-${f.id}`); setEditingCategoryName(f.name); }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteFamily(f)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
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
                    <div key={sf.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        {editingCategoryId === `subfamily-${sf.id}` ? (
                          <div className="flex items-center gap-1">
                            <Input value={editingCategoryName} onChange={e => setEditingCategoryName(e.target.value)} className="h-7 text-sm" autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveCategoryName('subfamily', sf.id); if (e.key === 'Escape') setEditingCategoryId(null); }} />
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => handleSaveCategoryName('subfamily', sf.id)}><Check className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingCategoryId(null)}><X className="w-3 h-3" /></Button>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium">{sf.name}</p>
                            <p className="text-xs text-gray-500">{families.find(f => f.id === sf.family_id)?.name}</p>
                          </>
                        )}
                      </div>
                      {isSuperuser && editingCategoryId !== `subfamily-${sf.id}` && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="text-blue-500 hover:text-blue-700" onClick={() => { setEditingCategoryId(`subfamily-${sf.id}`); setEditingCategoryName(sf.name); }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteSubFamily(sf)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
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

        <TabsContent value="losses">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Mermas y Roturas
                </CardTitle>
                <Button onClick={() => setShowAddLoss(true)} className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Merma
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Ubicacion</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Reportado por</TableHead>
                      <TableHead>Descripcion</TableHead>
                      <TableHead>Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {losses.map((loss) => (
                      <TableRow key={loss.id}>
                        <TableCell>{formatDateTime(loss.created_at)}</TableCell>
                        <TableCell>{loss.location_name}</TableCell>
                        <TableCell>{getLossTypeBadge(loss.loss_type)}</TableCell>
                        <TableCell>{loss.reported_by_name}</TableCell>
                        <TableCell className="max-w-xs truncate">{loss.description || '-'}</TableCell>
                        <TableCell className="font-semibold text-red-600">
                          {formatCurrency(loss.total_value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                Alertas de Stock Bajo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockAlerts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">Sin alertas</p>
                  <p className="text-sm">Todos los productos tienen stock suficiente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stockAlerts.map((alert, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-xl"
                      style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)' }}
                    >
                      <div className="flex items-center gap-3">
                        <Package size={20} className="text-amber-500" />
                        <div>
                          <p className="font-medium text-gray-900">{alert.product_name}</p>
                          <p className="text-sm text-gray-500">{alert.location_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-600">{alert.current_stock} unidades</p>
                        <p className="text-xs text-gray-500">Mín: {alert.min_stock}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Loss Dialog */}
      <Dialog open={showAddLoss} onOpenChange={setShowAddLoss}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Merma</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Select value={newLoss.location_id} onValueChange={(v) => setNewLoss({ ...newLoss, location_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Ubicacion *" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(l => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newLoss.loss_type} onValueChange={(v) => setNewLoss({ ...newLoss, loss_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de merma *" />
                </SelectTrigger>
                <SelectContent>
                  {lossTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Descripcion general (opcional)"
              value={newLoss.description}
              onChange={(e) => setNewLoss({ ...newLoss, description: e.target.value })}
            />
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Agregar Productos</h4>
              <div className="flex gap-2 mb-4">
                <Select value={lossProduct} onValueChange={setLossProduct}>
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
                  value={lossQuantity}
                  onChange={(e) => setLossQuantity(e.target.value)}
                  className="w-24"
                />
                <Input
                  placeholder="Razon"
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  className="w-40"
                />
                <Button type="button" onClick={addItemToLoss} disabled={!lossProduct || !lossQuantity}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {newLoss.items.length > 0 && (
                <div className="space-y-2">
                  {newLoss.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-gray-500 ml-2">x{item.quantity}</span>
                        {item.reason && <span className="text-gray-400 ml-2">- {item.reason}</span>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItemFromLoss(index)}
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
            <Button variant="outline" onClick={() => setShowAddLoss(false)}>Cancelar</Button>
            <Button
              onClick={handleAddLoss}
              disabled={isProcessing || !newLoss.location_id || !newLoss.loss_type || newLoss.items.length === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      <Dialog open={showEditProduct} onOpenChange={setShowEditProduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nombre *"
              value={editProductData.name}
              onChange={(e) => setEditProductData({ ...editProductData, name: e.target.value })}
            />
            <Input
              placeholder="Codigo *"
              value={editProductData.code}
              onChange={(e) => setEditProductData({ ...editProductData, code: e.target.value })}
            />
            <Input
              placeholder="Codigo de barras"
              value={editProductData.barcode}
              onChange={(e) => setEditProductData({ ...editProductData, barcode: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Precio de venta *"
              value={editProductData.sale_price}
              onChange={(e) => setEditProductData({ ...editProductData, sale_price: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                placeholder="Stock minimo"
                value={editProductData.min_stock}
                onChange={(e) => setEditProductData({ ...editProductData, min_stock: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Stock maximo"
                value={editProductData.max_stock}
                onChange={(e) => setEditProductData({ ...editProductData, max_stock: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProduct(false)}>Cancelar</Button>
            <Button
              onClick={handleEditProduct}
              disabled={isProcessing || !editProductData.name || !editProductData.sale_price}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={confirmAction?.title || ''}
        description={confirmAction?.description || ''}
        confirmLabel="Sí, confirmar"
        cancelLabel="No, cancelar"
        variant="danger"
        onConfirm={() => confirmAction?.onConfirm()}
      />

      {/* Modifiers Dialog */}
      <Dialog open={showModifiers} onOpenChange={(open) => { if (!open) { setShowModifiers(false); setModifierProductId(null); setModifiers([]); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Variaciones — {modifierProductName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {modifiers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No hay variaciones registradas</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {modifiers.map(mod => (
                  <div key={mod.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-sm">{mod.name}</span>
                      {mod.price_adjustment !== 0 && (
                        <span className="text-xs text-gray-500 ml-2">
                          {mod.price_adjustment > 0 ? '+' : ''}{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(mod.price_adjustment)}
                        </span>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => handleDeleteModifier(mod.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Agregar variación</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre (ej: Sin arroz)"
                  value={newModifier.name}
                  onChange={(e) => setNewModifier({ ...newModifier, name: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Ajuste $"
                  value={newModifier.price_adjustment}
                  onChange={(e) => setNewModifier({ ...newModifier, price_adjustment: e.target.value })}
                  className="w-24"
                />
                <Button size="sm" onClick={handleAddModifier} disabled={!newModifier.name}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;

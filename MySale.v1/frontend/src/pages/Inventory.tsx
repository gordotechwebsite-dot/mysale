import React, { useState, useEffect } from 'react';
import {
  getGroups, getFamilies, getSubFamilies, getProducts,
  createGroup, createFamily, createSubFamily, createProduct, registerPurchase,
  getLocations, getNextProductCode, updateProduct, deleteProduct, uploadProductImage
} from '../api';
import type { Group, Family, SubFamily, Product, Location } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Package, Search, Loader2, ShoppingBag, Scale, Pencil, Trash2, ImagePlus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<{
    id: number; code: string; barcode: string; name: string; description: string;
    subfamily_id: string; group_id: string; unit: string; sale_price: string;
    min_stock: string; max_stock: string; is_weighted: boolean; price_per_kg: string; plu_code: string;
  } | null>(null);

  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [newFamily, setNewFamily] = useState({ name: '', group_id: '', description: '' });
  const [newSubFamily, setNewSubFamily] = useState({ name: '', family_id: '', description: '' });
  const [newProduct, setNewProduct] = useState({
    code: '', barcode: '', name: '', description: '',
    subfamily_id: '', group_id: '', unit: 'unidad', sale_price: '', min_stock: '0', max_stock: '100',
    is_weighted: false, price_per_kg: '', plu_code: ''
  });
  const [purchase, setPurchase] = useState({
    product_id: 0, location_id: '', quantity: '', unit_cost: ''
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [newProductImage, setNewProductImage] = useState<File | null>(null);
  const [editProductImage, setEditProductImage] = useState<File | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedSubFamily, searchTerm]);

  const loadData = async () => {
    try {
      const [groupsData, familiesData, subFamiliesData, locationsData] = await Promise.all([
        getGroups(),
        getFamilies(),
        getSubFamilies(),
        getLocations()
      ]);
      setGroups(groupsData);
      setFamilies(familiesData);
      setSubFamilies(subFamiliesData);
      setLocations(locationsData);
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

  const parseColombianNumber = (value: string): number => {
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const handleAddProduct = async () => {
    setIsProcessing(true);
    try {
      const productData: any = {
        ...newProduct,
        sale_price: parseColombianNumber(newProduct.sale_price),
        min_stock: parseInt(newProduct.min_stock),
        max_stock: parseInt(newProduct.max_stock),
        is_weighted: newProduct.is_weighted,
        price_per_kg: newProduct.is_weighted && newProduct.price_per_kg ? parseColombianNumber(newProduct.price_per_kg) : null,
        plu_code: newProduct.is_weighted && newProduct.plu_code ? newProduct.plu_code : null
      };
      if (newProduct.subfamily_id && newProduct.subfamily_id !== 'none') {
        productData.subfamily_id = parseInt(newProduct.subfamily_id);
      } else {
        delete productData.subfamily_id;
      }
      if (newProduct.group_id && newProduct.group_id !== 'none') {
        productData.group_id = parseInt(newProduct.group_id);
      } else {
        delete productData.group_id;
      }
      const createdProduct = await createProduct(productData);
      if (newProductImage) {
        try {
          await uploadProductImage(createdProduct.id, newProductImage);
        } catch (uploadError: any) {
          console.error('Error uploading image:', uploadError);
          alert('Producto creado pero error al subir imagen: ' + (uploadError.response?.data?.detail || uploadError.message));
        }
      }
      await loadProducts();
      setShowAddProduct(false);
      setNewProduct({
        code: '', barcode: '', name: '', description: '',
        subfamily_id: '', group_id: '', unit: 'unidad', sale_price: '', min_stock: '0', max_stock: '100',
        is_weighted: false, price_per_kg: '', plu_code: ''
      });
      setNewProductImage(null);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        alert(detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', '));
      } else if (typeof detail === 'string') {
        alert(detail);
      } else {
        alert('Error al crear producto');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchase= async () => {
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

  const openAddProductDialog = async () => {
    try {
      const { code } = await getNextProductCode();
      setNewProduct({
        code, barcode: '', name: '', description: '',
        subfamily_id: '', group_id: '', unit: 'unidad', sale_price: '', min_stock: '0', max_stock: '100',
        is_weighted: false, price_per_kg: '', plu_code: ''
      });
      setShowAddProduct(true);
    } catch (error) {
      console.error('Error getting next code:', error);
      setNewProduct({
        code: '', barcode: '', name: '', description: '',
        subfamily_id: '', group_id: '', unit: 'unidad', sale_price: '', min_stock: '0', max_stock: '100',
        is_weighted: false, price_per_kg: '', plu_code: ''
      });
      setShowAddProduct(true);
    }
  };

  const openEditProductDialog = (product: Product) => {
    setEditProduct({
      id: product.id,
      code: product.code,
      barcode: product.barcode || '',
      name: product.name,
      description: product.description || '',
      subfamily_id: product.subfamily_id?.toString() || '',
      group_id: (product as any).group_id?.toString() || '',
      unit: product.unit,
      sale_price: product.sale_price.toString(),
      min_stock: product.min_stock.toString(),
      max_stock: product.max_stock.toString(),
      is_weighted: (product as any).is_weighted || false,
      price_per_kg: (product as any).price_per_kg?.toString() || '',
      plu_code: (product as any).plu_code || ''
    });
    setShowEditProduct(true);
  };

  const handleEditProduct = async () => {
    if (!editProduct) return;
    setIsProcessing(true);
    try {
      const productData: any = {
        name: editProduct.name,
        barcode: editProduct.barcode || null,
        description: editProduct.description || null,
        unit: editProduct.unit,
        sale_price: parseColombianNumber(editProduct.sale_price),
        min_stock: parseInt(editProduct.min_stock),
        max_stock: parseInt(editProduct.max_stock),
        is_weighted: editProduct.is_weighted,
        price_per_kg: editProduct.is_weighted && editProduct.price_per_kg ? parseColombianNumber(editProduct.price_per_kg) : null,
        plu_code: editProduct.is_weighted && editProduct.plu_code ? editProduct.plu_code : null
      };
      if (editProduct.subfamily_id && editProduct.subfamily_id !== 'none') {
        productData.subfamily_id = parseInt(editProduct.subfamily_id);
      } else {
        productData.subfamily_id = null;
      }
      if (editProduct.group_id && editProduct.group_id !== 'none') {
        productData.group_id = parseInt(editProduct.group_id);
      } else {
        productData.group_id = null;
      }
      await updateProduct(editProduct.id, productData);
      if (editProductImage) {
        await uploadProductImage(editProduct.id, editProductImage);
      }
      await loadProducts();
      setShowEditProduct(false);
      setEditProduct(null);
      setEditProductImage(null);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al actualizar producto');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`¿Está seguro de eliminar el producto "${product.name}"?`)) return;
    setIsProcessing(true);
    try {
      await deleteProduct(product.id);
      await loadProducts();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al eliminar producto');
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
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Productos
                </CardTitle>
                <Button onClick={openAddProductDialog} className="bg-blue-600 hover:bg-blue-700">
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
                      <TableHead className="w-16">Imagen</TableHead>
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
                        <TableCell>
                          {(product as any).image_url ? (
                            <img
                              src={`${import.meta.env.VITE_API_URL}${(product as any).image_url}`}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
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
                              onClick={() => openEditProductDialog(product)}
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPurchaseDialog(product)}
                              title="Registrar compra"
                            >
                              <ShoppingBag className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteProduct(product)}
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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
      </Tabs>

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
            <Input
              placeholder="Nombre del producto *"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Codigo (autogenerado)"
                value={newProduct.code}
                readOnly
                className="bg-gray-100"
              />
              <Input
                placeholder="Codigo de barras (opcional)"
                value={newProduct.barcode}
                onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
              />
            </div>
            <Select value={newProduct.group_id} onValueChange={(v) => setNewProduct({ ...newProduct, group_id: v, subfamily_id: '' })}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoria</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subFamilies.length > 0 && (
              <Select value={newProduct.subfamily_id} onValueChange={(v) => setNewProduct({ ...newProduct, subfamily_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Subcategoria (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin subcategoria</SelectItem>
                  {subFamilies.map(sf => (
                    <SelectItem key={sf.id} value={sf.id.toString()}>{sf.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Checkbox
                id="is_weighted"
                checked={newProduct.is_weighted}
                onCheckedChange={(checked) => setNewProduct({ ...newProduct, is_weighted: checked as boolean })}
              />
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600" />
                <Label htmlFor="is_weighted" className="text-sm font-medium cursor-pointer">
                  Producto pesable (balanza)
                </Label>
              </div>
            </div>
            {newProduct.is_weighted && (
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
                <p className="text-sm text-gray-600 font-medium">Configuracion de balanza SAT</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Codigo PLU (5 digitos)</Label>
                    <Input
                      placeholder="Ej: 00013"
                      value={newProduct.plu_code}
                      maxLength={5}
                      onChange={(e) => setNewProduct({ ...newProduct, plu_code: e.target.value.replace(/\D/g, '').padStart(5, '0').slice(-5) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Precio por kg *</Label>
                    <Input
                      type="number"
                      placeholder="Ej: 8000"
                      value={newProduct.price_per_kg}
                      onChange={(e) => setNewProduct({ ...newProduct, price_per_kg: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Imagen del producto (opcional)</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <ImagePlus className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {newProductImage ? newProductImage.name : 'Seleccionar imagen'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setNewProductImage(e.target.files?.[0] || null)}
                  />
                </label>
                {newProductImage && (
                  <Button variant="ghost" size="sm" onClick={() => setNewProductImage(null)}>
                    Quitar
                  </Button>
                )}
              </div>
              {newProductImage && (
                <img
                  src={URL.createObjectURL(newProductImage)}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-lg border"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProduct(false)}>Cancelar</Button>
            <Button
              onClick={handleAddProduct}
              disabled={isProcessing || !newProduct.code || !newProduct.name || !newProduct.sale_price || (newProduct.is_weighted && (!newProduct.plu_code || !newProduct.price_per_kg))}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditProduct} onOpenChange={setShowEditProduct}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <Input
                placeholder="Codigo"
                value={editProduct.code}
                disabled
                className="bg-gray-100"
              />
              <Input
                placeholder="Codigo de barras (opcional)"
                value={editProduct.barcode}
                onChange={(e) => setEditProduct({ ...editProduct, barcode: e.target.value })}
              />
              <Input
                placeholder="Nombre del producto"
                value={editProduct.name}
                onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
              />
              <Input
                placeholder="Descripcion (opcional)"
                value={editProduct.description}
                onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
              />
              <Select value={editProduct.group_id} onValueChange={(v) => setEditProduct({ ...editProduct, group_id: v, subfamily_id: '' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoria</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={editProduct.subfamily_id} onValueChange={(v) => setEditProduct({ ...editProduct, subfamily_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="SubFamilia (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin subfamilia</SelectItem>
                  {subFamilies.map(sf => (
                    <SelectItem key={sf.id} value={sf.id.toString()}>{sf.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Precio de venta"
                value={editProduct.sale_price}
                onChange={(e) => setEditProduct({ ...editProduct, sale_price: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder="Stock minimo"
                  value={editProduct.min_stock}
                  onChange={(e) => setEditProduct({ ...editProduct, min_stock: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Stock maximo"
                  value={editProduct.max_stock}
                  onChange={(e) => setEditProduct({ ...editProduct, max_stock: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-is-weighted"
                  checked={editProduct.is_weighted}
                  onCheckedChange={(checked) => setEditProduct({ ...editProduct, is_weighted: checked as boolean })}
                />
                <Label htmlFor="edit-is-weighted" className="flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Producto pesable
                </Label>
              </div>
              {editProduct.is_weighted && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                  <Input
                    placeholder="Codigo PLU (4 digitos)"
                    value={editProduct.plu_code}
                    onChange={(e) => setEditProduct({ ...editProduct, plu_code: e.target.value })}
                    maxLength={4}
                  />
                  <Input
                    placeholder="Precio por kg"
                    value={editProduct.price_per_kg}
                    onChange={(e) => setEditProduct({ ...editProduct, price_per_kg: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Imagen del producto (opcional)</Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <ImagePlus className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {editProductImage ? editProductImage.name : 'Cambiar imagen'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setEditProductImage(e.target.files?.[0] || null)}
                    />
                  </label>
                  {editProductImage && (
                    <Button variant="ghost" size="sm" onClick={() => setEditProductImage(null)}>
                      Quitar
                    </Button>
                  )}
                </div>
                {editProductImage && (
                  <img
                    src={URL.createObjectURL(editProductImage)}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-lg border"
                  />
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProduct(false)}>Cancelar</Button>
            <Button
              onClick={handleEditProduct}
              disabled={isProcessing || !editProduct?.name || !editProduct?.sale_price}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
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

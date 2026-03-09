import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, createUser, deleteUser, getRoles, getLocations, resetUserPin } from '../api';
import type { User, Role, Location } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users as UsersIcon, Plus, Loader2, Trash2, User as UserIcon, Copy, Check, Camera, Eye, KeyRound, RefreshCw, Phone, CreditCard, MapPin, Shield, Calendar } from 'lucide-react';

const generateUsername = (fullName: string): string => {
  if (!fullName.trim()) return '';
  const parts = fullName.trim().toLowerCase().split(/\s+/);
  let base = parts.length >= 2 ? parts[0].charAt(0) + parts[1].substring(0, 4) : parts[0].substring(0, 5);
  return base + (Math.floor(Math.random() * 900) + 100);
};

const generatePassword = (fullName: string): string => {
  if (!fullName.trim()) return '';
  const parts = fullName.trim().split(/\s+/);
  let base = parts.length >= 2 ? parts[0].substring(0, 2) + parts[1].substring(0, 2) : parts[0].substring(0, 4);
  return base.charAt(0).toUpperCase() + base.substring(1).toLowerCase() + (Math.floor(Math.random() * 9000) + 1000);
};

const generatePIN = (): string => String(Math.floor(Math.random() * 900000) + 100000);

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState({ username: '', password: '', pin: '' });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [resetPinResult, setResetPinResult] = useState<string | null>(null);
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', phone: '', cedula: '', username: '', password: '', pin: '', role_id: '', location_id: '', photo_url: '' });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  const regenerateCredentials = useCallback((fullName: string) => {
    if (fullName.trim().length >= 3) {
      setNewUser(prev => ({ ...prev, username: generateUsername(fullName), password: generatePassword(fullName), pin: generatePIN() }));
    }
  }, []);

  const loadData = async () => {
    try {
      const [usersData, rolesData, locationsData] = await Promise.all([getUsers(), getRoles(), getLocations()]);
      setUsers(usersData); setRoles(rolesData); setLocations(locationsData);
    } catch (error) { console.error('Error loading data:', error); }
    finally { setIsLoading(false); }
  };

  const handleNameChange = (name: string) => {
    setNewUser(prev => ({ ...prev, full_name: name }));
    if (name.trim().length >= 3) regenerateCredentials(name);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen no debe superar 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotoPreview(base64);
        setNewUser(prev => ({ ...prev, photo_url: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddUser = async () => {
    setIsProcessing(true);
    try {
      let locationId: number | undefined = newUser.location_id === "-1" ? -1 : newUser.location_id ? parseInt(newUser.location_id) : undefined;
      await createUser({ username: newUser.username, password: newUser.password, full_name: newUser.full_name, phone: newUser.phone || undefined, cedula: newUser.cedula || undefined, photo_url: newUser.photo_url || undefined, role_id: parseInt(newUser.role_id), location_id: locationId, pin: newUser.pin || undefined });
      await loadData();
      setCreatedCredentials({ username: newUser.username, password: newUser.password, pin: newUser.pin });
      setShowAddUser(false);
      setShowCredentials(true);
      setNewUser({ full_name: '', phone: '', cedula: '', username: '', password: '', pin: '', role_id: '', location_id: '', photo_url: '' });
      setPhotoPreview(null);
    } catch (error: any) { alert(error.response?.data?.detail || 'Error al crear usuario'); }
    finally { setIsProcessing(false); }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsProcessing(true);
    try { await deleteUser(userToDelete.id); await loadData(); setShowDeleteConfirm(false); setUserToDelete(null); }
    catch (error: any) { alert(error.response?.data?.detail || 'Error al eliminar usuario'); }
    finally { setIsProcessing(false); }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedField(field); setTimeout(() => setCopiedField(null), 2000); }
    catch (err) { console.error('Failed to copy:', err); }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setResetPinResult(null);
    setShowUserDetail(true);
  };

  const handleResetPin = async () => {
    if (!selectedUser) return;
    setIsResettingPin(true);
    try {
      const result = await resetUserPin(selectedUser.id);
      setResetPinResult(result.pin);
      // Update local state so PIN persists when reopening modal
      setSelectedUser({ ...selectedUser, pin: result.pin });
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, pin: result.pin } : u));
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al resetear PIN');
    } finally {
      setIsResettingPin(false);
    }
  };

  const getRoleBadge = (roleType: string) => {
    const type = roleType?.toUpperCase();
    const badges: Record<string, JSX.Element> = {
      'SUPERUSER': <Badge className="bg-purple-500">Superusuario</Badge>,
      'ADMIN': <Badge className="bg-blue-500">Administrador</Badge>,
      'CASHIER': <Badge className="bg-green-500">Cajero</Badge>,
      'WAITER': <Badge className="bg-orange-500">Mesero</Badge>
    };
    return badges[type] || <Badge>{roleType}</Badge>;
  };

  const filteredRoles = roles.filter(r => r.role_type?.toUpperCase() !== 'SUPERUSER');

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2"><UsersIcon className="w-5 h-5" />Usuarios del Sistema</CardTitle>
            <Button onClick={() => setShowAddUser(true)} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Nuevo Usuario</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Foto</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead>Cedula</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleViewUser(user)}>
                    <TableCell>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        {user.photo_url ? <img src={user.photo_url} alt={user.full_name} className="w-full h-full object-cover rounded-full" /> : <UserIcon className="w-6 h-6 text-white" />}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{user.username}</TableCell>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>{user.cedula || '-'}</TableCell>
                    <TableCell>{user.role ? getRoleBadge(user.role.role_type) : '-'}</TableCell>
                    <TableCell>{user.location_id === -1 ? <Badge className="bg-orange-500">Rotativo</Badge> : (locations.find(l => l.id === user.location_id)?.name || 'Sin asignar')}</TableCell>
                    <TableCell>{user.is_active ? <Badge className="bg-green-500">Activo</Badge> : <Badge className="bg-red-500">Inactivo</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleViewUser(user); }} className="text-blue-500 hover:text-blue-700">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setUserToDelete(user); setShowDeleteConfirm(true); }} className="text-red-500 hover:text-red-700">
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

      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserIcon className="w-5 h-5" />Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div 
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg cursor-pointer overflow-hidden hover:opacity-90 transition-opacity"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-10 h-10 text-white" />
                  )}
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow-md hover:bg-blue-700 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center -mt-2">Clic para subir foto (max 2MB)</p>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre Completo *</label>
              <Input placeholder="Ej: Juan Perez" value={newUser.full_name} onChange={(e) => handleNameChange(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Telefono</label>
                <Input placeholder="Ej: 3001234567" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Cedula</label>
                <Input placeholder="Ej: 1234567890" value={newUser.cedula} onChange={(e) => setNewUser({ ...newUser, cedula: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Rol *</label>
              <Select value={newUser.role_id} onValueChange={(v) => setNewUser({ ...newUser, role_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccione rol" /></SelectTrigger>
                <SelectContent>{filteredRoles.map(r => (<SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Sucursal</label>
              <Select value={newUser.location_id || "none"} onValueChange={(v) => setNewUser({ ...newUser, location_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Sucursal asignada" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  <SelectItem value="-1">Rotativo (todas)</SelectItem>
                  {locations.map(l => (<SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)}>Cancelar</Button>
            <Button onClick={handleAddUser} disabled={isProcessing || !newUser.username || !newUser.password || !newUser.full_name || !newUser.role_id} className="bg-blue-600 hover:bg-blue-700">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Confirmar Eliminacion</DialogTitle></DialogHeader>
          <div className="py-4">
            <p>Esta seguro que desea eliminar al usuario <strong>{userToDelete?.full_name}</strong>?</p>
            <p className="text-sm text-gray-500 mt-2">Esta accion desactivara al usuario.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />Usuario Creado Exitosamente
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">Guarde estas credenciales. La contrasena no se puede recuperar.</p>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
              <div className="flex items-center justify-between bg-white rounded px-3 py-2 border">
                <div><span className="text-xs text-gray-500">Usuario:</span><span className="ml-2 font-mono font-medium">{createdCredentials.username}</span></div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(createdCredentials.username, 'username')}>
                  {copiedField === 'username' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              <div className="flex items-center justify-between bg-white rounded px-3 py-2 border">
                <div><span className="text-xs text-gray-500">Contrasena:</span><span className="ml-2 font-mono font-medium">{createdCredentials.password}</span></div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(createdCredentials.password, 'password')}>
                  {copiedField === 'password' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              <div className="flex items-center justify-between bg-white rounded px-3 py-2 border">
                <div><span className="text-xs text-gray-500">PIN (Reloj):</span><span className="ml-2 font-mono font-bold text-lg">{createdCredentials.pin}</span></div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(createdCredentials.pin, 'pin')}>
                  {copiedField === 'pin' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCredentials(false)} className="bg-green-600 hover:bg-green-700">Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Modal */}
      <Dialog open={showUserDetail} onOpenChange={(open) => { setShowUserDetail(open); if (!open) { setResetPinResult(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />Detalles del Empleado
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4">
              {/* User Photo & Name Header */}
              <div className="flex items-center gap-4 mb-6 pb-4 border-b">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                  {selectedUser.photo_url ? (
                    <img src={selectedUser.photo_url} alt={selectedUser.full_name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <UserIcon className="w-8 h-8 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.full_name}</h3>
                  <p className="text-sm text-gray-500 font-mono">@{selectedUser.username}</p>
                  <div className="mt-1">
                    {selectedUser.is_active ? <Badge className="bg-green-500">Activo</Badge> : <Badge className="bg-red-500">Inactivo</Badge>}
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-xs text-gray-500">Rol</p>
                    <div>{selectedUser.role ? getRoleBadge(selectedUser.role.role_type) : <span className="text-gray-400">Sin rol</span>}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-xs text-gray-500">Telefono</p>
                    <p className="font-medium">{selectedUser.phone || <span className="text-gray-400">No registrado</span>}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-gray-500">Cedula</p>
                    <p className="font-medium">{selectedUser.cedula || <span className="text-gray-400">No registrada</span>}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-xs text-gray-500">Sucursal</p>
                    <p className="font-medium">
                      {selectedUser.location_id === -1 
                        ? <Badge className="bg-orange-500">Rotativo (todas)</Badge>
                        : (locations.find(l => l.id === selectedUser.location_id)?.name || <span className="text-gray-400">Sin asignar</span>)
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Trabajando desde</p>
                    <p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>

                {/* PIN Section */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <KeyRound className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500">PIN (Reloj de asistencia)</p>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xl text-blue-700">{resetPinResult || selectedUser.pin || 'Sin PIN'}</span>
                          {(resetPinResult || selectedUser.pin) && (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(resetPinResult || selectedUser.pin || '', 'detail-pin')}>
                              {copiedField === 'detail-pin' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleResetPin} 
                      disabled={isResettingPin}
                      className="border-blue-300 text-blue-600 hover:bg-blue-100"
                    >
                      {isResettingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 mr-1" />Nuevo PIN</>}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDetail(false)}>Cerrar</Button>
            <Button variant="destructive" onClick={() => { setShowUserDetail(false); if (selectedUser) { setUserToDelete(selectedUser); setShowDeleteConfirm(true); } }}>
              <Trash2 className="w-4 h-4 mr-1" />Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;

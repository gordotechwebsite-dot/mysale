import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, createUser, deleteUser, getRoles, getLocations } from '../api';
import type { User, Role, Location } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users as UsersIcon, Plus, Loader2, Trash2, User as UserIcon, Copy, Check } from 'lucide-react';

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

const generatePIN = (): string => String(Math.floor(Math.random() * 9000) + 1000);

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
  const [newUser, setNewUser] = useState({ full_name: '', phone: '', cedula: '', username: '', password: '', pin: '', role_id: '', location_id: '', photo_url: '' });

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

  const handleAddUser = async () => {
    setIsProcessing(true);
    try {
      let locationId: number | undefined = newUser.location_id === "-1" ? -1 : newUser.location_id ? parseInt(newUser.location_id) : undefined;
      await createUser({ username: newUser.username, password: newUser.password, full_name: newUser.full_name, phone: newUser.phone || undefined, cedula: newUser.cedula || undefined, photo_url: newUser.photo_url || undefined, role_id: parseInt(newUser.role_id), location_id: locationId, pin: newUser.pin || undefined });
      await loadData();
      setShowAddUser(false);
      setNewUser({ full_name: '', phone: '', cedula: '', username: '', password: '', pin: '', role_id: '', location_id: '', photo_url: '' });
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

  const getRoleBadge = (roleType: string) => {
    const badges: Record<string, JSX.Element> = {
      'superuser': <Badge className="bg-purple-500">Superusuario</Badge>,
      'admin': <Badge className="bg-blue-500">Administrador</Badge>,
      'cashier': <Badge className="bg-green-500">Cajero</Badge>,
      'waiter': <Badge className="bg-orange-500">Mesero</Badge>
    };
    return badges[roleType] || <Badge>{roleType}</Badge>;
  };

  const filteredRoles = roles.filter(r => r.role_type !== 'superuser');

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
                  <TableRow key={user.id}>
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
                      <Button variant="ghost" size="sm" onClick={() => { setUserToDelete(user); setShowDeleteConfirm(true); }} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                <UserIcon className="w-10 h-10 text-white" />
              </div>
            </div>
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
            {newUser.full_name.trim().length >= 3 && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  Credenciales Generadas
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => regenerateCredentials(newUser.full_name)}>Regenerar</Button>
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white rounded px-3 py-2 border">
                    <div><span className="text-xs text-gray-500">Usuario:</span><span className="ml-2 font-mono font-medium">{newUser.username}</span></div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(newUser.username, 'username')}>
                      {copiedField === 'username' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded px-3 py-2 border">
                    <div><span className="text-xs text-gray-500">Contrasena:</span><span className="ml-2 font-mono font-medium">{newUser.password}</span></div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(newUser.password, 'password')}>
                      {copiedField === 'password' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded px-3 py-2 border">
                    <div><span className="text-xs text-gray-500">PIN (Reloj):</span><span className="ml-2 font-mono font-bold text-lg">{newUser.pin}</span></div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(newUser.pin, 'pin')}>
                      {copiedField === 'pin' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
    </div>
  );
};

export default Users;

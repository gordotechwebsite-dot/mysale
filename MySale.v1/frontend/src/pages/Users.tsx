import React, { useState, useEffect } from 'react';
import { getUsers, createUser, deleteUser, getRoles, getLocations } from '../api';
import type { User, Role, Location } from '../types';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users as UsersIcon, Plus, Loader2, Trash2, Fingerprint } from 'lucide-react';
import { BiometricEnrollDialog } from '@/components/BiometricEnrollDialog';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showBiometricEnroll, setShowBiometricEnroll] = useState(false);
    const [selectedUserForBiometric, setSelectedUserForBiometric] = useState<User | null>(null);

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role_id: '',
    location_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, rolesData, locationsData] = await Promise.all([
        getUsers(),
        getRoles(),
        getLocations()
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

    const handleAddUser = async () => {
      setIsProcessing(true);
      try {
        await createUser({
          username: newUser.username,
          password: newUser.password,
          full_name: newUser.full_name,
          email: newUser.email || undefined,
          role_id: parseInt(newUser.role_id),
          location_id: newUser.location_id ? parseInt(newUser.location_id) : undefined
        });
        await loadData();
        setShowAddUser(false);
        setNewUser({ username: '', password: '', full_name: '', email: '', role_id: '', location_id: '' });
      } catch (error: any) {
        alert(error.response?.data?.detail || 'Error al crear usuario');
      } finally {
        setIsProcessing(false);
      }
    };

    const handleDeleteUser = async () => {
      if (!userToDelete) return;
      setIsProcessing(true);
      try {
        await deleteUser(userToDelete.id);
        await loadData();
        setShowDeleteConfirm(false);
        setUserToDelete(null);
      } catch (error: any) {
        alert(error.response?.data?.detail || 'Error al eliminar usuario');
      } finally {
        setIsProcessing(false);
      }
    };

        const confirmDelete = (user: User) => {
          setUserToDelete(user);
          setShowDeleteConfirm(true);
        };

        const openBiometricEnroll = (user: User) => {
          setSelectedUserForBiometric(user);
          setShowBiometricEnroll(true);
        };

  const getRoleBadge = (roleType: string) => {
    switch (roleType) {
      case 'superuser':
        return <Badge className="bg-purple-500">Superusuario</Badge>;
      case 'admin':
        return <Badge className="bg-blue-500">Administrador</Badge>;
      case 'cashier':
        return <Badge className="bg-green-500">Cajero</Badge>;
      default:
        return <Badge>{roleType}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              Usuarios del Sistema
            </CardTitle>
            <Button onClick={() => setShowAddUser(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Nombre Completo</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Ubicacion</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Puntos</TableHead>
                                <TableHead>Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono">{user.username}</TableCell>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>{user.role ? getRoleBadge(user.role.role_type) : '-'}</TableCell>
                    <TableCell>
                      {locations.find(l => l.id === user.location_id)?.name || 'Sin asignar'}
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge className="bg-green-500">Activo</Badge>
                      ) : (
                        <Badge className="bg-red-500">Inactivo</Badge>
                      )}
                    </TableCell>
                                  <TableCell>{user.points}</TableCell>
                                                                    <TableCell>
                                                                      <div className="flex gap-1">
                                                                        <Button
                                                                          variant="ghost"
                                                                          size="sm"
                                                                          onClick={() => openBiometricEnroll(user)}
                                                                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                                          title="Registrar huella"
                                                                        >
                                                                          <Fingerprint className="w-4 h-4" />
                                                                        </Button>
                                                                        <Button
                                                                          variant="ghost"
                                                                          size="sm"
                                                                          onClick={() => confirmDelete(user)}
                                                                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                          title="Eliminar usuario"
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

      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Nombre de usuario *"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            />
            <Input
              type="password"
              placeholder="Contraseña *"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
            <Input
              placeholder="Nombre completo *"
              value={newUser.full_name}
              onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
            />
            <Input
              type="email"
              placeholder="Email (opcional)"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
            <Select value={newUser.role_id} onValueChange={(v) => setNewUser({ ...newUser, role_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione rol *" />
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
                        <Select value={newUser.location_id || "none"} onValueChange={(v) => setNewUser({ ...newUser, location_id: v === "none" ? "" : v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Ubicacion (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin asignar</SelectItem>
                            {locations.map(l => (
                              <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)}>Cancelar</Button>
            <Button
              onClick={handleAddUser}
              disabled={isProcessing || !newUser.username || !newUser.password || !newUser.full_name || !newUser.role_id}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminacion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Esta seguro que desea eliminar al usuario <strong>{userToDelete?.full_name}</strong>?</p>
            <p className="text-sm text-gray-500 mt-2">Esta accion desactivara al usuario y no podra iniciar sesion.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BiometricEnrollDialog
        open={showBiometricEnroll}
        onOpenChange={setShowBiometricEnroll}
        userId={selectedUserForBiometric?.id}
        onSuccess={() => {
          setShowBiometricEnroll(false);
          setSelectedUserForBiometric(null);
        }}
      />
    </div>
  );
};

export default Users;

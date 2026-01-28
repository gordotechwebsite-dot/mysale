import React, { useState, useEffect } from 'react';
import { getUsers, createUser, getRoles, getLocations } from '../api';
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
import { Users as UsersIcon, Plus, Loader2 } from 'lucide-react';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
    </div>
  );
};

export default Users;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getShifts, getLocations, getUsers } from '../api';
import type { Shift, Location, User } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Clock, Loader2 } from 'lucide-react';

const Shifts: React.FC = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const isAdmin = user?.role?.role_type === 'superuser' || user?.role?.role_type === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadShifts();
  }, [filterLocation, filterUser, filterStatus]);

  const loadData = async () => {
    try {
      const [locationsData, usersData] = await Promise.all([
        getLocations(),
        isAdmin ? getUsers() : Promise.resolve([])
      ]);
      setLocations(locationsData);
      setUsers(usersData);
      await loadShifts();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadShifts = async () => {
    try {
      const params: any = {};
      if (filterLocation) params.location_id = parseInt(filterLocation);
      if (filterUser) params.user_id = parseInt(filterUser);
      if (filterStatus) params.status = filterStatus;
      const data = await getShifts(params);
      setShifts(data);
    } catch (error) {
      console.error('Error loading shifts:', error);
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
    switch (status) {
      case 'open':
        return <Badge className="bg-green-500">Abierto</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500">Cerrado</Badge>;
      case 'closed_by_admin':
        return <Badge className="bg-orange-500">Cerrado por Admin</Badge>;
      default:
        return <Badge>{status}</Badge>;
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
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Historial de Turnos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
                        <Select value={filterLocation || "all"} onValueChange={(v) => setFilterLocation(v === "all" ? "" : v)}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Todas las ubicaciones" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {locations.map(l => (
                              <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {isAdmin && (
                          <Select value={filterUser || "all"} onValueChange={(v) => setFilterUser(v === "all" ? "" : v)}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Todos los usuarios" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              {users.map(u => (
                                <SelectItem key={u.id} value={u.id.toString()}>{u.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="open">Abierto</SelectItem>
                            <SelectItem value="closed">Cerrado</SelectItem>
                            <SelectItem value="closed_by_admin">Cerrado por Admin</SelectItem>
                          </SelectContent>
                        </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Ubicacion</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ventas</TableHead>
                  <TableHead>Efectivo</TableHead>
                  <TableHead>Tarjeta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium">{shift.user_name}</TableCell>
                    <TableCell>{shift.location_name}</TableCell>
                    <TableCell>{formatDateTime(shift.start_time)}</TableCell>
                    <TableCell>{shift.end_time ? formatDateTime(shift.end_time) : '-'}</TableCell>
                    <TableCell>{getStatusBadge(shift.status)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(shift.total_sales)}</TableCell>
                    <TableCell>{formatCurrency(shift.total_cash_sales)}</TableCell>
                    <TableCell>{formatCurrency(shift.total_card_sales)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Shifts;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWorkSessions, getLocations, getUsers, type WorkSession } from '../api';
import type { Location, User } from '../types';
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
import { Clock, Loader2 } from 'lucide-react';

const Shifts: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const isAdmin = user?.role?.role_type === 'superuser' || user?.role?.role_type === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadShifts();
  }, [filterLocation, filterUser, filterStartDate, filterEndDate]);

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
      if (filterLocation) params.branch_id = parseInt(filterLocation);
      if (filterUser) params.user_id = parseInt(filterUser);
      if (filterStartDate) params.start_date = filterStartDate + 'T00:00:00';
      if (filterEndDate) params.end_date = filterEndDate + 'T23:59:59';
      const data = await getWorkSessions(params);
      setSessions(data);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
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
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Sucursal</label>
              <Select value={filterLocation || "all"} onValueChange={(v) => setFilterLocation(v === "all" ? "" : v)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {locations.map(l => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Empleado</label>
                <Select value={filterUser || "all"} onValueChange={(v) => setFilterUser(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Desde</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="h-10 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Hasta</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="h-10 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Llegada</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Tiempo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const minutes = s.total_minutes ?? (s.clock_out ? Math.floor((new Date(s.clock_out).getTime() - new Date(s.clock_in).getTime())/60000) : Math.floor((Date.now() - new Date(s.clock_in).getTime())/60000));
                  const h = Math.floor(minutes/60);
                  const m = minutes%60;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.user_name ?? s.employee_code}</TableCell>
                      <TableCell>{s.branch_name ?? '-'}</TableCell>
                      <TableCell>{formatDateTime(s.clock_in)}</TableCell>
                      <TableCell>{s.clock_out ? formatDateTime(s.clock_out) : '-'}</TableCell>
                      <TableCell>{h}h {m}m</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Shifts;

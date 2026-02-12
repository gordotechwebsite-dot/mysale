import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Users, Calendar, Fingerprint, Download } from 'lucide-react';
import { BiometricClockInOut } from '@/components/BiometricClockInOut';
import { getAttendanceRecords, getUsers, type BiometricAttendance } from '@/api';
import type { User } from '@/types';

export default function Attendance() {
  const [records, setRecords] = useState<BiometricAttendance[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, [selectedUser, dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsData, usersData] = await Promise.all([
        getAttendanceRecords({
          user_id: selectedUser,
          start_date: dateRange.start,
          end_date: dateRange.end
        }),
        getUsers()
      ]);
      setRecords(recordsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateTotalHours = () => {
    const total = records.reduce((sum, r) => sum + (r.total_hours || 0), 0);
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return `${hours}h ${mins}m`;
  };

  const handleClockEvent = () => {
    loadData();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Control de Asistencia
        </h1>
      </div>

      <Tabs defaultValue="clock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clock" className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4" />
            Registrar
          </TabsTrigger>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clock" className="space-y-4">
          <div className="flex justify-center">
            <BiometricClockInOut onClockEvent={handleClockEvent} />
          </div>
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Registros de Asistencia
                </span>
                <div className="flex items-center gap-4">
                  <select
                    value={selectedUser || ''}
                    onChange={(e) => setSelectedUser(e.target.value ? Number(e.target.value) : undefined)}
                    className="border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Todos los empleados</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.full_name}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                  <span className="text-gray-500">a</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Cargando...</div>
              ) : records.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay registros de asistencia para el período seleccionado
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 p-4 rounded-lg mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600">Total de horas trabajadas</p>
                      <p className="text-2xl font-bold text-blue-800">{calculateTotalHours()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600">Registros</p>
                      <p className="text-2xl font-bold text-blue-800">{records.length}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Empleado</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Entrada</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Salida</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Duración</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Ubicación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map(record => (
                          <tr key={record.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{record.user_name}</td>
                            <td className="py-3 px-4">
                              <span className="text-green-600">{formatDateTime(record.clock_in)}</span>
                            </td>
                            <td className="py-3 px-4">
                              {record.clock_out ? (
                                <span className="text-orange-600">{formatDateTime(record.clock_out)}</span>
                              ) : (
                                <span className="text-gray-400 italic">En turno</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium">{formatDuration(record.total_hours)}</span>
                            </td>
                            <td className="py-3 px-4 text-gray-500">
                              {record.location_name || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

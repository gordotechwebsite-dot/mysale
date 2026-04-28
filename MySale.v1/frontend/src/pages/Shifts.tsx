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
import { Clock, Loader2, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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
      setCurrentPage(1);
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

  const getMinutes = (s: WorkSession) => s.total_minutes ?? (s.clock_out ? Math.floor((new Date(s.clock_out).getTime() - new Date(s.clock_in).getTime())/60000) : Math.floor((Date.now() - new Date(s.clock_in).getTime())/60000));
  const fmtMin = (min: number) => `${Math.floor(min/60)}h ${min%60}m`;

  const handleExportExcel = () => {
    if (sessions.length === 0) return;
    const headers = ['Empleado', 'Sucursal', 'Llegada', 'Salida', 'Tiempo'];
    const rows = sessions.map(s => {
      const min = getMinutes(s);
      return [
        s.user_name ?? s.employee_code ?? '',
        s.branch_name ?? '-',
        formatDateTime(s.clock_in),
        s.clock_out ? formatDateTime(s.clock_out) : '-',
        fmtMin(min),
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `turnos_${filterStartDate || 'todos'}_${filterEndDate || 'todos'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (sessions.length === 0) return;
    const totalMin = sessions.reduce((sum, s) => sum + getMinutes(s), 0);
    const dateRange = (filterStartDate && filterEndDate) ? `${filterStartDate} al ${filterEndDate}` : 'Todos los registros';
    const rows = sessions.map(s => {
      const min = getMinutes(s);
      return `<tr><td>${s.user_name ?? s.employee_code ?? ''}</td><td>${s.branch_name ?? '-'}</td><td>${formatDateTime(s.clock_in)}</td><td>${s.clock_out ? formatDateTime(s.clock_out) : '<span style="color:#999;">En turno</span>'}</td><td class="text-right">${fmtMin(min)}</td></tr>`;
    }).join('');
    const totalRow = `<tr class="total-row"><td colspan="4">TOTAL (${sessions.length} turnos)</td><td class="text-right">${fmtMin(totalMin)}</td></tr>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Reporte de Turnos</title><style>
      @page { size: letter portrait; margin: 18mm 15mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 10px; line-height: 1.5; }
      .header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 16px; }
      .header h1 { font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
      .header .company { font-size: 12px; color: #555; margin-top: 2px; }
      .header .dates { font-size: 11px; color: #333; margin-top: 4px; font-weight: 600; }
      .header .generated { font-size: 8px; color: #888; margin-top: 2px; }
      .summary { display: flex; gap: 10px; margin-bottom: 18px; }
      .summary-card { flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 10px 14px; background: #fafafa; }
      .summary-card .label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
      .summary-card .value { font-size: 16px; font-weight: 700; margin-top: 2px; }
      .green { color: #16a34a; } .blue { color: #2563eb; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { background: #1a1a1a; color: white; padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
      td { padding: 5px 8px; border-bottom: 1px solid #e5e5e5; font-size: 9px; }
      tr:nth-child(even) { background: #f8f8f8; }
      .text-right { text-align: right; }
      .total-row { background: #f0f0f0 !important; font-weight: 700; font-size: 10px; }
      .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 8px; color: #999; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>
      <div class="header">
        <div class="company">MySale POS</div>
        <h1>Historial de Turnos</h1>
        <div class="dates">${dateRange}</div>
        <div class="generated">Generado: ${new Date().toLocaleString('es-CO')}</div>
      </div>
      <div class="summary">
        <div class="summary-card"><div class="label">Total Turnos</div><div class="value">${sessions.length}</div></div>
        <div class="summary-card"><div class="label">Horas Totales</div><div class="value blue">${fmtMin(totalMin)}</div></div>
        <div class="summary-card"><div class="label">Promedio por Turno</div><div class="value">${sessions.length > 0 ? fmtMin(Math.round(totalMin / sessions.length)) : '0h 0m'}</div></div>
      </div>
      <table>
        <tr><th>Empleado</th><th>Sucursal</th><th>Llegada</th><th>Salida</th><th class="text-right">Tiempo</th></tr>
        ${rows}
        ${totalRow}
      </table>
      <div class="footer">MySale POS - Sistema de Punto de Venta - www.pos-mysale.co</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 500);
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

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={handleExportExcel} disabled={sessions.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
              <Button variant="outline" onClick={handleExportPDF} disabled={sessions.length === 0}>
                <FileText className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
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
                {sessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((s) => {
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

          {sessions.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-gray-500">
                Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, sessions.length)}-{Math.min(currentPage * itemsPerPage, sessions.length)} de {sessions.length}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.ceil(sessions.length / itemsPerPage) }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === Math.ceil(sessions.length / itemsPerPage) || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-gray-400">...</span>}
                      <Button variant={p === currentPage ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(p)}>
                        {p}
                      </Button>
                    </React.Fragment>
                  ))}
                <Button variant="outline" size="sm" disabled={currentPage >= Math.ceil(sessions.length / itemsPerPage)} onClick={() => setCurrentPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Shifts;

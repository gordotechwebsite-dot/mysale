import { useState, useEffect } from 'react';
import { Clock, Building2, User } from 'lucide-react';
import { getWorkSessions, getWorkReport, getBranches, getUsers, WorkSession, WorkSessionSummary, Branch } from '../api';
import type { User as UserType } from '../types';

export default function WorkReport() {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [summary, setSummary] = useState<WorkSessionSummary[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'sessions' | 'summary'>('summary');
  const [filters, setFilters] = useState({
    branch_id: '',
    user_id: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadData();
  }, [filters, viewMode]);

  const loadInitialData = async () => {
    try {
      const [branchesData, usersData] = await Promise.all([
        getBranches(),
        getUsers(),
      ]);
      setBranches(branchesData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.branch_id) params.branch_id = parseInt(filters.branch_id);
      if (filters.user_id) params.user_id = parseInt(filters.user_id);
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      if (viewMode === 'sessions') {
        const data = await getWorkSessions(params);
        setSessions(data);
      } else {
        const data = await getWorkReport(params);
        setSummary(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMinutes = (minutes: number | null) => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

    const formatDateTime = (dateStr: string) => {
      return new Date(dateStr).toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reporte de Horas Trabajadas</h1>
          <p className="text-gray-600">Control de asistencia y horas por empleado</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sede</label>
            <select
              value={filters.branch_id}
              onChange={(e) => setFilters({ ...filters, branch_id: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Todas las sedes</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
            <select
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Todos</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-4 py-2 rounded-lg ${
                viewMode === 'summary'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Resumen
            </button>
            <button
              onClick={() => setViewMode('sessions')}
              className={`px-4 py-2 rounded-lg ${
                viewMode === 'sessions'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Detalle
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : viewMode === 'summary' ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codigo</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sesiones</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Horas Totales</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sedes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {summary.map((item) => (
                <tr key={item.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-orange-600" />
                      </div>
                      <span className="font-medium text-gray-800">{item.user_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{item.employee_code || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {item.total_sessions}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-green-600">{item.total_hours.toFixed(1)}h</span>
                    <span className="text-gray-400 text-sm ml-1">({formatMinutes(item.total_minutes)})</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.branches_worked.map((branch, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          {branch}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {summary.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay registros de trabajo</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sede</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entrada</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salida</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tiempo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-800">{session.user_name}</p>
                      <p className="text-sm text-gray-500">{session.employee_code || '-'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span>{session.branch_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{formatDateTime(session.clock_in)}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {session.clock_out ? formatDateTime(session.clock_out) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        En curso
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {session.total_minutes ? (
                      <span className="font-medium text-gray-800">{formatMinutes(session.total_minutes)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sessions.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay sesiones de trabajo</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

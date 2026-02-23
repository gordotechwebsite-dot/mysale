import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getBranches, getShiftsByBranch, forceCloseShift,
  startShiftWithPin, endShiftWithPin, checkHasPin, setMyPin,
  Branch, ShiftResponse
} from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, Loader2, Search, Users, Play, Square, AlertTriangle,
  Building2, X
} from 'lucide-react';
import { toast } from 'sonner';

const Shifts: React.FC = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shifts, setShifts] = useState<ShiftResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterToday, setFilterToday] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShift, setSelectedShift] = useState<ShiftResponse | null>(null);
  
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinAction, setPinAction] = useState<'start' | 'end' | 'setup'>('start');
  const [pin, setPin] = useState('');
  const [hasPin, setHasPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showForceCloseDialog, setShowForceCloseDialog] = useState(false);
  const [forceCloseReason, setForceCloseReason] = useState('');
  const [shiftToForceClose, setShiftToForceClose] = useState<ShiftResponse | null>(null);

  const isAdmin = user?.role?.role_type === 'superuser' || user?.role?.role_type === 'admin';

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      loadShifts();
    }
  }, [selectedBranch, filterDate, filterToday]);

  const loadInitialData = async () => {
    try {
      const [branchesData, hasPinData] = await Promise.all([
        getBranches(),
        checkHasPin()
      ]);
      setBranches(branchesData);
      setHasPin(hasPinData.has_pin);
      
      if (branchesData.length > 0) {
        setSelectedBranch(branchesData[0].id.toString());
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadShifts = async () => {
    if (!selectedBranch) return;
    
    try {
      const params: any = {
        branch_id: parseInt(selectedBranch)
      };
      
      if (filterToday) {
        const today = new Date().toISOString().split('T')[0];
        params.from_date = today + 'T00:00:00';
        params.to_date = today + 'T23:59:59';
      } else if (filterDate) {
        params.from_date = filterDate + 'T00:00:00';
        params.to_date = filterDate + 'T23:59:59';
      }
      
      const data = await getShiftsByBranch(params);
      setShifts(data);
    } catch (error) {
      console.error('Error loading shifts:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (startAt: string, endAt: string | null) => {
    const start = new Date(startAt);
    const end = endAt ? new Date(endAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-500 text-white">Activo</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500 text-white">Cerrado</Badge>;
      case 'force_closed':
        return <Badge className="bg-orange-500 text-white">Cerrado Forzosamente</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const activeShifts = shifts.filter(s => s.status === 'open');
  const closedShifts = shifts.filter(s => s.status !== 'open');

  const filteredActiveShifts = activeShifts.filter(s => 
    !searchTerm || s.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredClosedShifts = closedShifts.filter(s => 
    !searchTerm || s.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartShift = () => {
    if (!hasPin) {
      setPinAction('setup');
      setShowPinDialog(true);
      return;
    }
    setPinAction('start');
    setPin('');
    setShowPinDialog(true);
  };

  const handleEndShift = () => {
    if (!hasPin) {
      toast.error('Debe configurar su PIN primero');
      return;
    }
    setPinAction('end');
    setPin('');
    setShowPinDialog(true);
  };

  const handlePinSubmit = async () => {
    if (pin.length < 4 || pin.length > 6) {
      toast.error('El PIN debe tener entre 4 y 6 digitos');
      return;
    }

    setIsSubmitting(true);
    try {
      if (pinAction === 'setup') {
        await setMyPin(pin);
        setHasPin(true);
        toast.success('PIN configurado exitosamente');
        setShowPinDialog(false);
        setPin('');
      } else if (pinAction === 'start') {
        await startShiftWithPin({
          branch_id: parseInt(selectedBranch),
          pin
        });
        toast.success('Turno iniciado exitosamente');
        setShowPinDialog(false);
        setPin('');
        loadShifts();
      } else if (pinAction === 'end') {
        await endShiftWithPin({
          branch_id: parseInt(selectedBranch),
          pin
        });
        toast.success('Turno finalizado exitosamente');
        setShowPinDialog(false);
        setPin('');
        loadShifts();
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al procesar la solicitud';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForceClose = async () => {
    if (!shiftToForceClose || !forceCloseReason.trim()) {
      toast.error('Debe proporcionar una razon para cerrar el turno');
      return;
    }

    setIsSubmitting(true);
    try {
      await forceCloseShift({
        shift_id: shiftToForceClose.id,
        reason: forceCloseReason
      });
      toast.success('Turno cerrado forzosamente');
      setShowForceCloseDialog(false);
      setForceCloseReason('');
      setShiftToForceClose(null);
      setSelectedShift(null);
      loadShifts();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al cerrar el turno';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
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
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-gray-900 text-white">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          <h1 className="text-xl font-semibold">Revision de Turnos</h1>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterToday}
              onChange={(e) => setFilterToday(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Filtrar a hoy</span>
          </label>
          {!filterToday && (
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-40 bg-gray-800 border-gray-700 text-white"
            />
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-4 bg-gray-800">
            <div className="flex gap-4">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-64 bg-gray-700 border-gray-600 text-white">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Seleccione sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar empleado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              
              <Button onClick={handleStartShift} className="bg-green-600 hover:bg-green-700">
                <Play className="w-4 h-4 mr-2" />
                Iniciar Turno
              </Button>
              <Button onClick={handleEndShift} variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                <Square className="w-4 h-4 mr-2" />
                Finalizar Turno
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 bg-gray-900">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-green-600">{filteredActiveShifts.length}</Badge>
                <span className="text-white font-medium">Activos</span>
              </div>
              <div className="space-y-2">
                {filteredActiveShifts.map(shift => (
                  <div
                    key={shift.id}
                    onClick={() => setSelectedShift(shift)}
                    className={`flex items-center p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedShift?.id === shift.id 
                        ? 'bg-blue-900 border border-blue-500' 
                        : 'bg-gray-800 hover:bg-gray-750'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex flex-col items-center w-24">
                        <Users className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-xs text-green-400">Turno activo</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{shift.user_name}</div>
                        <div className="text-gray-400 text-sm flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(shift.start_at)} - ahora
                        </div>
                      </div>
                      <Badge className="bg-green-500">En turno</Badge>
                      <div className="text-right text-gray-400 text-sm">
                        {formatDuration(shift.start_at, null)}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredActiveShifts.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No hay turnos activos
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-gray-600">{filteredClosedShifts.length}</Badge>
                <span className="text-white font-medium">Cerrados</span>
              </div>
              <div className="space-y-2">
                {filteredClosedShifts.map(shift => (
                  <div
                    key={shift.id}
                    onClick={() => setSelectedShift(shift)}
                    className={`flex items-center p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedShift?.id === shift.id 
                        ? 'bg-blue-900 border border-blue-500' 
                        : 'bg-gray-800 hover:bg-gray-750'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex flex-col items-center w-24">
                        <Users className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-400">
                          {shift.status === 'force_closed' ? 'Forzado' : 'Cerrado'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{shift.user_name}</div>
                        <div className="text-gray-400 text-sm flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(shift.start_at)} - {shift.end_at ? formatTime(shift.end_at) : '-'}
                        </div>
                      </div>
                      {getStatusBadge(shift.status)}
                      <div className="text-right text-gray-400 text-sm">
                        {shift.end_at && formatDuration(shift.start_at, shift.end_at)}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredClosedShifts.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No hay turnos cerrados
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {selectedShift && (
          <div className="w-96 bg-white border-l flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{selectedShift.user_name}</h3>
                <p className="text-sm text-gray-500">Detalles del turno</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedShift(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 p-4 space-y-4 overflow-auto">
              <div>
                <Label className="text-gray-500 text-sm">Estado</Label>
                <div className="mt-1">{getStatusBadge(selectedShift.status)}</div>
              </div>
              
              <div>
                <Label className="text-gray-500 text-sm">Sucursal</Label>
                <p className="font-medium">{selectedShift.branch_name}</p>
              </div>
              
              <div>
                <Label className="text-gray-500 text-sm">Entrada</Label>
                <p className="font-medium">
                  {new Date(selectedShift.start_at).toLocaleString('es-CO')}
                </p>
              </div>
              
              <div>
                <Label className="text-gray-500 text-sm">Salida</Label>
                <p className="font-medium">
                  {selectedShift.end_at 
                    ? new Date(selectedShift.end_at).toLocaleString('es-CO')
                    : '-'
                  }
                </p>
              </div>
              
              <div>
                <Label className="text-gray-500 text-sm">Duracion</Label>
                <p className="font-medium">
                  {formatDuration(selectedShift.start_at, selectedShift.end_at)}
                </p>
              </div>
              
              {selectedShift.opened_by_name && (
                <div>
                  <Label className="text-gray-500 text-sm">Abierto por</Label>
                  <p className="font-medium">{selectedShift.opened_by_name}</p>
                </div>
              )}
              
              {selectedShift.closed_by_name && (
                <div>
                  <Label className="text-gray-500 text-sm">Cerrado por</Label>
                  <p className="font-medium">{selectedShift.closed_by_name}</p>
                </div>
              )}
              
              {selectedShift.notes && (
                <div>
                  <Label className="text-gray-500 text-sm">Notas</Label>
                  <p className="text-sm bg-gray-100 p-2 rounded">{selectedShift.notes}</p>
                </div>
              )}
            </div>
            
            {isAdmin && selectedShift.status === 'open' && (
              <div className="p-4 border-t">
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => {
                    setShiftToForceClose(selectedShift);
                    setShowForceCloseDialog(true);
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Cerrar Forzosamente
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pinAction === 'setup' ? 'Configurar PIN' : 
               pinAction === 'start' ? 'Iniciar Turno' : 'Finalizar Turno'}
            </DialogTitle>
            <DialogDescription>
              {pinAction === 'setup' 
                ? 'Configure su PIN de 4-6 digitos para gestionar turnos'
                : 'Ingrese su PIN para confirmar'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>PIN (4-6 digitos)</Label>
            <Input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="****"
              className="text-center text-2xl tracking-widest"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPinDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePinSubmit} disabled={isSubmitting || pin.length < 4}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {pinAction === 'setup' ? 'Guardar PIN' : 
               pinAction === 'start' ? 'Iniciar' : 'Finalizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showForceCloseDialog} onOpenChange={setShowForceCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Turno Forzosamente</DialogTitle>
            <DialogDescription>
              Esta accion cerrara el turno de {shiftToForceClose?.user_name} y le restara puntos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Razon del cierre forzoso *</Label>
            <Input
              value={forceCloseReason}
              onChange={(e) => setForceCloseReason(e.target.value)}
              placeholder="Ej: Turno abierto por mas de 16 horas"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForceCloseDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleForceClose} 
              disabled={isSubmitting || !forceCloseReason.trim()}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Cerrar Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Shifts;

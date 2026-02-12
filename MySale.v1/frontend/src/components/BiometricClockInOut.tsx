import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Fingerprint, Clock, CheckCircle, XCircle, Loader2, AlertTriangle, LogIn, LogOut } from 'lucide-react';
import { checkBiometricServiceStatus, captureFingerprintFromService, biometricClockInOut } from '@/api';

interface BiometricClockInOutProps {
  locationId?: number;
  onClockEvent?: (event: { action: string; user: { id: number; full_name: string }; time: string }) => void;
}

type ClockStep = 'checking' | 'ready' | 'capturing' | 'processing' | 'success' | 'error' | 'service_unavailable';

export function BiometricClockInOut({ locationId, onClockEvent }: BiometricClockInOutProps) {
  const [step, setStep] = useState<ClockStep>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastEvent, setLastEvent] = useState<{
    action: 'clock_in' | 'clock_out';
    user: { id: number; full_name: string };
    clock_in: string;
    clock_out?: string;
    total_time?: string;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [simulationMode, setSimulationMode] = useState(false);

  useEffect(() => {
    checkService();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const checkService = async () => {
    setStep('checking');
    try {
      const status = await checkBiometricServiceStatus();
      if (status.status === 'ok') {
        setSimulationMode(status.simulation_mode);
        setStep('ready');
      } else {
        setStep('service_unavailable');
        setErrorMessage('El servicio biométrico no está disponible');
      }
    } catch {
      setStep('service_unavailable');
      setErrorMessage('No se puede conectar al servicio biométrico');
    }
  };

  const handleClockInOut = async () => {
    setStep('capturing');
    try {
      const captureResult = await captureFingerprintFromService();
      if (!captureResult.success || !captureResult.template) {
        setStep('error');
        setErrorMessage(captureResult.error || 'Error al capturar la huella');
        return;
      }

      setStep('processing');

      const result = await biometricClockInOut({
        template: captureResult.template,
        location_id: locationId
      });

      setLastEvent(result);
      setStep('success');

      if (onClockEvent) {
        onClockEvent({
          action: result.action,
          user: result.user,
          time: result.action === 'clock_in' ? result.clock_in : result.clock_out || ''
        });
      }

      setTimeout(() => {
        setStep('ready');
        setLastEvent(null);
      }, 5000);

    } catch (err: any) {
      setStep('error');
      setErrorMessage(err.response?.data?.detail || 'Huella no reconocida');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-CO', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderContent = () => {
    switch (step) {
      case 'checking':
        return (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-4" />
            <p className="text-lg">Conectando con el lector...</p>
          </div>
        );

      case 'service_unavailable':
        return (
          <div className="flex flex-col items-center py-8">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
            <p className="text-lg font-medium mb-2">Lector No Disponible</p>
            <p className="text-gray-500 text-center mb-4">{errorMessage}</p>
            <Button onClick={checkService} variant="outline">
              Reintentar Conexión
            </Button>
          </div>
        );

      case 'ready':
        return (
          <div className="flex flex-col items-center">
            {simulationMode && (
              <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg mb-4 text-sm w-full text-center">
                Modo simulación activo
              </div>
            )}

            <div className="text-center mb-6">
              <p className="text-4xl font-bold text-gray-800">{formatTime(currentTime)}</p>
              <p className="text-gray-500 capitalize">{formatDate(currentTime)}</p>
            </div>

            <div className="relative mb-6">
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                   onClick={handleClockInOut}>
                <Fingerprint className="h-20 w-20 text-white" />
              </div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white px-4 py-1 rounded-full shadow text-sm font-medium text-gray-600">
                Toque para registrar
              </div>
            </div>

            <p className="text-center text-gray-600 mb-4">
              Coloque su dedo en el lector para registrar entrada o salida
            </p>

            <Button onClick={handleClockInOut} size="lg" className="w-full max-w-xs">
              <Clock className="mr-2 h-5 w-5" />
              Registrar Asistencia
            </Button>
          </div>
        );

      case 'capturing':
        return (
          <div className="flex flex-col items-center py-8">
            <div className="relative">
              <div className="w-40 h-40 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                <Fingerprint className="h-20 w-20 text-white" />
              </div>
            </div>
            <p className="text-lg mt-6">Capturando huella...</p>
            <p className="text-gray-500">Mantenga el dedo en el lector</p>
          </div>
        );

      case 'processing':
        return (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-4" />
            <p className="text-lg">Procesando...</p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center py-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${
              lastEvent?.action === 'clock_in' ? 'bg-green-100' : 'bg-orange-100'
            }`}>
              {lastEvent?.action === 'clock_in' ? (
                <LogIn className="h-12 w-12 text-green-600" />
              ) : (
                <LogOut className="h-12 w-12 text-orange-600" />
              )}
            </div>

            <p className={`text-2xl font-bold mb-2 ${
              lastEvent?.action === 'clock_in' ? 'text-green-600' : 'text-orange-600'
            }`}>
              {lastEvent?.action === 'clock_in' ? 'ENTRADA' : 'SALIDA'}
            </p>

            <p className="text-xl font-medium text-gray-800 mb-1">
              {lastEvent?.user.full_name}
            </p>

            <p className="text-gray-500 mb-4">
              {new Date(lastEvent?.action === 'clock_in' ? lastEvent.clock_in : lastEvent?.clock_out || '').toLocaleTimeString('es-CO', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </p>

            {lastEvent?.total_time && (
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <p className="text-sm text-gray-600">Tiempo trabajado: <span className="font-medium">{lastEvent.total_time}</span></p>
              </div>
            )}

            <CheckCircle className="h-8 w-8 text-green-500 mt-4" />
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center py-8">
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <p className="text-lg font-medium text-red-600">Error</p>
            <p className="text-gray-500 text-center mt-2 mb-4">{errorMessage}</p>
            <Button onClick={() => setStep('ready')}>
              Intentar de Nuevo
            </Button>
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center border-b">
        <CardTitle className="flex items-center justify-center gap-2">
          <Clock className="h-5 w-5" />
          Control de Asistencia
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {renderContent()}
      </CardContent>
    </Card>
  );
}

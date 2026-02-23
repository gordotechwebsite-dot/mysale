import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Fingerprint, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { checkBiometricServiceStatus, captureFingerprintFromService, enrollFingerprint, enrollUserFingerprint } from '@/api';

interface BiometricEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: number;
  onSuccess?: () => void;
}

type EnrollmentStep = 'checking' | 'ready' | 'capturing' | 'success' | 'error' | 'service_unavailable';

const FINGER_NAMES = [
  'Pulgar Derecho',
  'Índice Derecho',
  'Medio Derecho',
  'Anular Derecho',
  'Meñique Derecho',
  'Pulgar Izquierdo',
  'Índice Izquierdo',
  'Medio Izquierdo',
  'Anular Izquierdo',
  'Meñique Izquierdo'
];

export function BiometricEnrollDialog({ open, onOpenChange, userId, onSuccess }: BiometricEnrollDialogProps) {
  const [step, setStep] = useState<EnrollmentStep>('checking');
  const [selectedFinger, setSelectedFinger] = useState(2);
  const [captureCount, setCaptureCount] = useState(0);
  const [templates, setTemplates] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [simulationMode, setSimulationMode] = useState(false);

  useEffect(() => {
    if (open) {
      checkService();
    } else {
      resetState();
    }
  }, [open]);

  const resetState = () => {
    setStep('checking');
    setCaptureCount(0);
    setTemplates([]);
    setErrorMessage('');
    setQualityScore(null);
  };

  const checkService = async () => {
    setStep('checking');
    try {
      const status = await checkBiometricServiceStatus();
      if (status.service_running && status.reader_connected) {
        setSimulationMode(status.sdk_mode === 'simulation');
        setStep('ready');
      } else if (status.service_running) {
        setStep('service_unavailable');
        setErrorMessage('El lector de huellas no está conectado o no se detectó');
      } else {
        setStep('service_unavailable');
        setErrorMessage('El servicio biométrico no está disponible');
      }
    } catch {
      setStep('service_unavailable');
      setErrorMessage('No se puede conectar al servicio biométrico. Asegúrese de que el servicio esté ejecutándose en localhost:8765');
    }
  };

  const captureFingerprint = async () => {
    setStep('capturing');
    try {
      const result = await captureFingerprintFromService();
      if (result.success && result.template) {
        const newTemplates = [...templates, result.template];
        setTemplates(newTemplates);
        setCaptureCount(captureCount + 1);
        setQualityScore(result.quality_score || null);

        if (newTemplates.length >= 3) {
          await saveFingerprint(newTemplates[newTemplates.length - 1], result.quality_score);
        } else {
          setStep('ready');
        }
      } else {
        setStep('error');
        setErrorMessage(result.error || 'Error al capturar la huella');
      }
    } catch (err) {
      setStep('error');
      setErrorMessage('Error de comunicación con el lector');
    }
  };

  const saveFingerprint = async (template: string, quality?: number) => {
    try {
      const data = {
        template,
        finger_index: selectedFinger,
        quality_score: quality,
        is_primary: selectedFinger === 2
      };

      console.log('Saving fingerprint for user:', userId, 'data:', data);

      if (userId) {
        await enrollUserFingerprint(userId, data);
      } else {
        await enrollFingerprint(data);
      }

      setStep('success');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      console.error('Error saving fingerprint:', err);
      setStep('error');
      const axiosError = err as { response?: { data?: { detail?: string } } };
      const errorDetail = axiosError.response?.data?.detail || 'Error al guardar la huella en el servidor';
      setErrorMessage(errorDetail);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'checking':
        return (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-4" />
            <p className="text-lg">Verificando servicio biométrico...</p>
          </div>
        );

      case 'service_unavailable':
        return (
          <div className="flex flex-col items-center py-8">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
            <p className="text-lg font-medium mb-2">Servicio No Disponible</p>
            <p className="text-gray-500 text-center mb-4">{errorMessage}</p>
            <div className="bg-gray-100 p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">Para usar el lector de huellas:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Instale el driver del DigitalPersona 4500</li>
                <li>Ejecute el servicio biometric_server.py</li>
                <li>Conecte el lector USB</li>
              </ol>
            </div>
            <Button onClick={checkService} className="mt-4">
              Reintentar
            </Button>
          </div>
        );

      case 'ready':
        return (
          <div className="flex flex-col items-center py-4">
            {simulationMode && (
              <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg mb-4 text-sm">
                Modo simulación activo (sin lector físico)
              </div>
            )}
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Seleccione el dedo a registrar:</label>
              <select
                value={selectedFinger}
                onChange={(e) => setSelectedFinger(Number(e.target.value))}
                className="w-full p-2 border rounded-lg"
              >
                {FINGER_NAMES.map((name, index) => (
                  <option key={index} value={index + 1}>{name}</option>
                ))}
              </select>
            </div>

            <div className="relative mb-6">
              <Fingerprint className="h-32 w-32 text-blue-500" />
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                {captureCount}/3
              </div>
            </div>

            <p className="text-center text-gray-600 mb-4">
              {captureCount === 0 
                ? 'Coloque su dedo en el lector y presione "Capturar"'
                : `Captura ${captureCount} de 3 completada. Continue con la siguiente.`}
            </p>

            {qualityScore !== null && (
              <p className="text-sm text-gray-500 mb-4">
                Calidad de la última captura: {qualityScore}%
              </p>
            )}

            <Button onClick={captureFingerprint} size="lg" className="w-full">
              <Fingerprint className="mr-2 h-5 w-5" />
              Capturar Huella ({captureCount + 1}/3)
            </Button>
          </div>
        );

      case 'capturing':
        return (
          <div className="flex flex-col items-center py-8">
            <div className="relative">
              <Fingerprint className="h-32 w-32 text-blue-500 animate-pulse" />
              <Loader2 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-white animate-spin" />
            </div>
            <p className="text-lg mt-4">Capturando huella...</p>
            <p className="text-gray-500">Mantenga el dedo en el lector</p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-lg font-medium">Huella Registrada</p>
            <p className="text-gray-500 text-center mt-2">
              La huella del {FINGER_NAMES[selectedFinger - 1]} ha sido registrada exitosamente.
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-6">
              Cerrar
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center py-8">
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <p className="text-lg font-medium">Error</p>
            <p className="text-gray-500 text-center mt-2">{errorMessage}</p>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setStep('ready')}>
                Reintentar
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Registro de Huella Digital
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

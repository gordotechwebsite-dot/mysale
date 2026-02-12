import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Fingerprint, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { checkBiometricServiceStatus, captureFingerprintFromService, verifyFingerprint, biometricAuthorize } from '@/api';

interface BiometricVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: number;
  actionType?: string;
  actionDescription?: string;
  onSuccess?: (result: { verified: boolean; user_id?: number; match_score?: number }) => void;
  onAuthorized?: (result: { authorized: boolean; user: { id: number; full_name: string; role: string | null } }) => void;
}

type VerifyStep = 'checking' | 'ready' | 'capturing' | 'verifying' | 'success' | 'failed' | 'error' | 'service_unavailable';

export function BiometricVerifyDialog({ 
  open, 
  onOpenChange, 
  userId, 
  actionType,
  actionDescription,
  onSuccess,
  onAuthorized
}: BiometricVerifyDialogProps) {
  const [step, setStep] = useState<VerifyStep>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [authorizedUser, setAuthorizedUser] = useState<{ full_name: string; role: string | null } | null>(null);
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
    setErrorMessage('');
    setMatchScore(null);
    setAuthorizedUser(null);
  };

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

  const captureAndVerify = async () => {
    setStep('capturing');
    try {
      const captureResult = await captureFingerprintFromService();
      if (!captureResult.success || !captureResult.template) {
        setStep('error');
        setErrorMessage(captureResult.error || 'Error al capturar la huella');
        return;
      }

      setStep('verifying');

      if (actionType) {
        const authResult = await biometricAuthorize({
          template: captureResult.template,
          action_type: actionType
        });

        if (authResult.authorized) {
          setMatchScore(authResult.match_score);
          setAuthorizedUser(authResult.user);
          setStep('success');
          if (onAuthorized) {
            onAuthorized(authResult);
          }
        } else {
          setStep('failed');
          setErrorMessage('Usuario no tiene permisos para esta acción');
        }
      } else {
        const verifyResult = await verifyFingerprint({
          template: captureResult.template,
          user_id: userId
        });

        if (verifyResult.verified) {
          setMatchScore(verifyResult.match_score);
          setStep('success');
          if (onSuccess) {
            onSuccess(verifyResult);
          }
        } else {
          setStep('failed');
          setErrorMessage('Huella no reconocida');
        }
      }
    } catch (err: any) {
      setStep('failed');
      setErrorMessage(err.response?.data?.detail || 'Error al verificar la huella');
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
                Modo simulación activo
              </div>
            )}

            {actionDescription && (
              <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-lg mb-4 text-center">
                <p className="font-medium">Autorización requerida</p>
                <p className="text-sm mt-1">{actionDescription}</p>
              </div>
            )}

            <Fingerprint className="h-32 w-32 text-blue-500 mb-6" />

            <p className="text-center text-gray-600 mb-6">
              Coloque su dedo en el lector para {actionType ? 'autorizar' : 'verificar'}
            </p>

            <Button onClick={captureAndVerify} size="lg" className="w-full">
              <Fingerprint className="mr-2 h-5 w-5" />
              {actionType ? 'Autorizar con Huella' : 'Verificar Huella'}
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

      case 'verifying':
        return (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-4" />
            <p className="text-lg">Verificando...</p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-lg font-medium text-green-600">
              {actionType ? 'Autorizado' : 'Verificado'}
            </p>
            {authorizedUser && (
              <p className="text-gray-600 mt-2">
                {authorizedUser.full_name} ({authorizedUser.role})
              </p>
            )}
            {matchScore !== null && (
              <p className="text-sm text-gray-500 mt-2">
                Coincidencia: {matchScore}%
              </p>
            )}
            <Button onClick={() => onOpenChange(false)} className="mt-6">
              Continuar
            </Button>
          </div>
        );

      case 'failed':
        return (
          <div className="flex flex-col items-center py-8">
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <p className="text-lg font-medium text-red-600">
              {actionType ? 'No Autorizado' : 'No Verificado'}
            </p>
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

      case 'error':
        return (
          <div className="flex flex-col items-center py-8">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
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
            {actionType ? 'Autorización Biométrica' : 'Verificación de Huella'}
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

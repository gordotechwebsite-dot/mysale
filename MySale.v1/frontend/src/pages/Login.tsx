import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin, checkBiometricServiceStatus, captureFingerprintFromService, biometricLogin } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Fingerprint, LogIn, Loader2, AlertTriangle } from 'lucide-react';

type BiometricStep = 'idle' | 'checking' | 'waiting_finger' | 'capturing' | 'verifying' | 'error';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricStep, setBiometricStep] = useState<BiometricStep>('idle');
  const [biometricError, setBiometricError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiLogin(username, password);
      login(response.access_token, response.user);
      navigate('/');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'Error al iniciar sesion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setError('');
    setBiometricError('');
    setBiometricStep('checking');

    try {
      await checkBiometricServiceStatus();
    } catch {
      setBiometricStep('error');
      setBiometricError('No se puede conectar al servicio biométrico. Asegúrese de que el servicio esté ejecutándose.');
      return;
    }

    setBiometricStep('capturing');

    try {
      const captureResult = await captureFingerprintFromService();

      if (!captureResult.success || !captureResult.template) {
        setBiometricStep('error');
        setBiometricError(captureResult.error || 'Error al capturar la huella');
        return;
      }

      setBiometricStep('verifying');
      const response = await biometricLogin({ template: captureResult.template });
      setUsername(response.user.username);
      login(response.access_token, response.user);
      navigate('/');
    } catch (err: any) {
      setBiometricStep('error');
      setBiometricError(err.response?.data?.detail || 'Huella no reconocida o no registrada');
    }
  };

  const isBiometricBusy = biometricStep !== 'idle' && biometricStep !== 'error';

  const getBiometricButtonContent = () => {
    switch (biometricStep) {
      case 'checking':
        return (
          <>
            <Loader2 className="w-6 h-6 mr-2 animate-spin" />
            Conectando con el lector...
          </>
        );
      case 'waiting_finger':
      case 'capturing':
        return (
          <>
            <Fingerprint className="w-6 h-6 mr-2 animate-pulse" />
            Coloque su dedo en el lector...
          </>
        );
      case 'verifying':
        return (
          <>
            <Loader2 className="w-6 h-6 mr-2 animate-spin" />
            Verificando huella...
          </>
        );
      default:
        return (
          <>
            <Fingerprint className="w-6 h-6 mr-2" />
            Acceso con Huella
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl font-bold text-white">MS</span>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-800">MySale.v1</CardTitle>
          <p className="text-gray-500 mt-2">Sistema de Punto de Venta</p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Usuario</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su usuario"
                className="h-12 text-lg"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Contraseña</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                className="h-12 text-lg"
                required
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700"
              disabled={isLoading || isBiometricBusy}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Iniciar Sesion
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">O</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-14 text-lg font-semibold border-2"
              onClick={handleBiometricLogin}
              disabled={isLoading || isBiometricBusy}
            >
              {getBiometricButtonContent()}
            </Button>

            {biometricError && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p>{biometricError}</p>
                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    className="text-yellow-900 underline font-medium mt-1"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            GALIA 1539 - Sistema POS v1.0
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

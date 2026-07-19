import React, { useState, useRef, useEffect } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { activateClient } from '../api';
import { storeClientId } from '../lib/installed';
import Grainient from '../components/Grainient';

interface ActivationProps {
  onActivated: () => void;
}

const Activation: React.FC<ActivationProps> = ({ onActivated }) => {
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsVisible(true);
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      const data = await activateClient(clientId.trim().toUpperCase());
      storeClientId(data.client_id);
      onActivated();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(detail || 'No se pudo activar. Verifica tu ID de Cliente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <Grainient
          color1="#ebc8b2"
          color2="#856edd"
          color3="#a3ddf0"
          timeSpeed={3.15}
          colorBalance={-0.26}
          warpStrength={1}
          warpFrequency={5}
          warpSpeed={2}
          warpAmplitude={50}
          blendAngle={0}
          blendSoftness={0.05}
          rotationAmount={500}
          noiseScale={2}
          grainAmount={0.1}
          grainScale={2}
          grainAnimated={false}
          contrast={1.5}
          gamma={1}
          saturation={1}
          centerX={0}
          centerY={0}
          zoom={0.9}
        />
      </div>

      <div className="min-h-screen flex items-center justify-center px-4 py-8 relative" style={{ zIndex: 1 }}>
        <div className="w-full flex items-center justify-center" style={{ maxWidth: '460px' }}>
          <div
            className="w-full flex flex-col items-center"
            style={{
              maxWidth: '460px',
              minWidth: '320px',
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
            }}
          >
            <div className="text-center mb-6">
              <h1 className="font-bold" style={{ color: '#ffffff', fontSize: '26px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                Activar MySale
              </h1>
              <p className="mt-2" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                Ingresa tu ID de Cliente para activar este equipo
              </p>
            </div>

            <div
              className="w-full"
              style={{
                borderRadius: '22px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '40px',
                backgroundColor: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <div className="text-center mb-8">
                <img
                  src="/logo.png"
                  alt="MySale Logo"
                  className="mx-auto mb-4"
                  style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                />
                <h2 className="font-semibold" style={{ color: '#111827', fontSize: '20px' }}>
                  MySale
                </h2>
                <p className="mt-1" style={{ color: '#6b7280', fontSize: '14px' }}>
                  Sistema POS
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <KeyRound size={20} style={{ color: '#9ca3af' }} />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value.toUpperCase())}
                    placeholder="MYS-XXXX-XXXX"
                    autoCapitalize="characters"
                    className="w-full pl-12 pr-4 text-base outline-none transition-all duration-200 tracking-wider"
                    style={{
                      height: '48px',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      color: '#111827',
                      backgroundColor: '#ffffff',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#00a86b';
                      e.target.style.boxShadow = '0 0 0 4px rgba(0, 168, 107, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>

                {error && (
                  <div
                    className="px-4 py-3 text-sm"
                    style={{
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '12px',
                      color: '#ef4444',
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !clientId.trim()}
                  className="w-full text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: '#00a86b',
                    borderRadius: '12px',
                    height: '50px',
                    fontSize: '15px',
                    fontWeight: 600,
                  }}
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Activar'}
                </button>
              </form>

              <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid #f3f4f6' }}>
                <p className="text-xs" style={{ color: '#9ca3af' }}>
                  ¿No tienes tu ID de Cliente? Solicítalo al administrador.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Activation;

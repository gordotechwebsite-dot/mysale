import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin } from '../api';
import { User, Lock, Eye, EyeOff, Fingerprint, Loader2 } from 'lucide-react';
import Grainient from '../components/Grainient';
import Balatro from '../components/Balatro';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const usernameRef = useRef<HTMLInputElement>(null);

  // Detect if we're on the admin subdomain
  const isAdmin = window.location.hostname.startsWith('admin');

  // Load saved credentials and animate on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('remembered_username');
    const savedPassword = localStorage.getItem('remembered_password');
    if (savedUsername && savedPassword) {
      setUsername(savedUsername);
      setPassword(savedPassword);
      setRememberMe(true);
    }
    setIsVisible(true);
    usernameRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent double click
    setError('');
    setIsLoading(true);

    try {
      const response = await apiLogin(username, password);
      if (rememberMe) {
        localStorage.setItem('remembered_username', username);
        localStorage.setItem('remembered_password', password);
      } else {
        localStorage.removeItem('remembered_username');
        localStorage.removeItem('remembered_password');
      }
      login(response.access_token, response.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al iniciar sesion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && username && password) {
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Animated Background - Balatro for admin, Grainient for clients */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        {isAdmin ? (
          <Balatro
            spinRotation={-2}
            spinSpeed={7}
            color1="#3ba7de"
            color2="#b30000"
            color3="#162325"
            contrast={6.5}
            lighting={0.7}
            spinAmount={0.25}
            pixelFilter={1050}
          />
        ) : (
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
        )}
      </div>

      {/* Main Container */}
      <div className="min-h-screen flex items-center justify-center px-4 py-8 relative" style={{ zIndex: 1 }}>
        <div className="w-full flex items-center justify-center" style={{ maxWidth: '460px' }}>
          {/* Left Column - Login Card */}
          <div 
            className="w-full flex flex-col items-center"
            style={{ 
              maxWidth: '460px',
              minWidth: '320px',
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.5s ease-out, transform 0.5s ease-out'
            }}
          >
            {/* Welcome text */}
            <div className="text-center mb-6">
              <h1 className="font-bold" style={{ color: '#ffffff', fontSize: '26px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                {isAdmin ? 'MySale Factory' : 'Bienvenido a MySale'}
              </h1>
              <p className="mt-2" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                {isAdmin ? 'Panel de Administracion' : 'Plataforma inteligente de ventas'}
              </p>
            </div>

            {/* Login Card - Glass Morphism Style */}
            <div 
              className="w-full"
              style={{ 
                borderRadius: '22px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '40px',
                backgroundColor: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}
            >
              {/* Header */}
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

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username Input */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <User size={20} style={{ color: '#9ca3af' }} />
                  </div>
                  <input
                    ref={usernameRef}
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Usuario o correo"
                    className="w-full pl-12 pr-4 text-base outline-none transition-all duration-200"
                    style={{ 
                      height: '48px',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      color: '#111827',
                      backgroundColor: '#ffffff'
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

                {/* Password Input */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Lock size={20} style={{ color: '#9ca3af' }} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Contrasena"
                    className="w-full pl-12 pr-12 text-base outline-none transition-all duration-200"
                    style={{ 
                      height: '48px',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      color: '#111827',
                      backgroundColor: '#ffffff'
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
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                  >
                    {showPassword ? (
                      <EyeOff size={20} style={{ color: '#9ca3af' }} />
                    ) : (
                      <Eye size={20} style={{ color: '#9ca3af' }} />
                    )}
                  </button>
                </div>

                {/* Remember Me Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none" style={{ marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-[#00a86b]"
                  />
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>Recordar mis datos</span>
                </label>

                {/* Error Message */}
                {error && (
                  <div 
                    className="px-4 py-3 text-sm"
                    style={{ 
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '12px',
                      color: '#ef4444'
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Submit Button - Premium */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: '#00a86b',
                    borderRadius: '12px',
                    height: '50px',
                    fontSize: '15px',
                    fontWeight: 600
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#00965f';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#00a86b';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Iniciar sesion'
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 my-5">
                  <div className="flex-1 h-px" style={{ backgroundColor: '#e5e7eb' }} />
                  <span className="text-xs uppercase" style={{ color: '#9ca3af' }}>o</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: '#e5e7eb' }} />
                </div>

                {/* Biometric Button */}
                <button
                  type="button"
                  disabled
                  className="w-full flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: 'transparent',
                    border: '1px solid #00a86b',
                    borderRadius: '12px',
                    color: '#00a86b',
                    height: '48px',
                    fontSize: '15px',
                    fontWeight: 600
                  }}
                >
                  <Fingerprint size={20} />
                  Acceso con huella
                </button>
              </form>

              {/* Footer */}
              <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid #f3f4f6' }}>
                <p className="text-xs" style={{ color: '#9ca3af' }}>
                  MySale POS Cloud v1.0
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

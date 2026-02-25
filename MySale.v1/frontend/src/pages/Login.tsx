import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin } from '../api';
import { User, Lock, Eye, EyeOff, Fingerprint, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const usernameRef = useRef<HTMLInputElement>(null);

  // Animation on mount
  useEffect(() => {
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
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#f6f7f9' }}>
      {/* Background Blobs - Multiple soft colors */}
      {/* Green blob - top left */}
      <div 
        className="absolute"
        style={{
          top: '-80px',
          left: '-80px',
          width: '400px',
          height: '400px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(0, 168, 107, 0.12)',
          filter: 'blur(120px)',
          zIndex: 0
        }}
      />
      {/* Blue blob - bottom right */}
      <div 
        className="absolute"
        style={{
          bottom: '-100px',
          right: '-80px',
          width: '450px',
          height: '450px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(59, 130, 246, 0.14)',
          filter: 'blur(130px)',
          zIndex: 0
        }}
      />
      {/* Purple blob - top right */}
      <div 
        className="absolute"
        style={{
          top: '5%',
          right: '10%',
          width: '350px',
          height: '350px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(168, 85, 247, 0.10)',
          filter: 'blur(120px)',
          zIndex: 0
        }}
      />
      {/* Cyan blob - center left */}
      <div 
        className="absolute"
        style={{
          top: '40%',
          left: '5%',
          width: '300px',
          height: '300px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(34, 211, 238, 0.10)',
          filter: 'blur(110px)',
          zIndex: 0
        }}
      />
      {/* Pink blob - bottom left */}
      <div 
        className="absolute"
        style={{
          bottom: '10%',
          left: '20%',
          width: '280px',
          height: '280px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(236, 72, 153, 0.08)',
          filter: 'blur(100px)',
          zIndex: 0
        }}
      />
      {/* Yellow/Amber blob - top center */}
      <div 
        className="absolute"
        style={{
          top: '15%',
          left: '40%',
          width: '250px',
          height: '250px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(251, 191, 36, 0.08)',
          filter: 'blur(100px)',
          zIndex: 0
        }}
      />

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
              <h1 className="font-bold" style={{ color: '#111827', fontSize: '26px' }}>
                Bienvenido a MySale
              </h1>
              <p className="mt-2" style={{ color: '#6b7280', fontSize: '15px' }}>
                Plataforma inteligente de ventas
              </p>
            </div>

            {/* Login Card - Premium Style */}
            <div 
              className="w-full bg-white"
              style={{ 
                borderRadius: '22px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.08)',
                border: '1px solid rgba(17,24,39,0.06)',
                padding: '40px'
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

              {/* Subtitle */}
              <p className="text-center mb-6" style={{ color: '#9ca3af', fontSize: '13px' }}>
                Acceso al sistema
              </p>

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

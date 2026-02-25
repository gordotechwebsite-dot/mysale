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
  const { login } = useAuth();
  const navigate = useNavigate();
  const usernameRef = useRef<HTMLInputElement>(null);

  // Auto focus on username input
  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  // Handle Enter key to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && username && password) {
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: '#f6f7f9' }}>
      {/* Welcome text */}
      <div className="text-center mb-6 animate-fade-in">
        <h1 className="text-2xl font-semibold" style={{ color: '#111827' }}>
          Bienvenido a MySale
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
          Plataforma inteligente de ventas
        </p>
      </div>

      {/* Login Card - Premium Style */}
      <div 
        className="w-full max-w-[420px] bg-white animate-fade-in"
        style={{ 
          borderRadius: '18px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          padding: '40px'
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div 
            className="mx-auto w-16 h-16 flex items-center justify-center mb-4"
            style={{ 
              backgroundColor: '#00a86b',
              borderRadius: '50%'
            }}
          >
            <span className="text-2xl font-bold text-white">M</span>
          </div>
          <h2 className="text-xl font-semibold" style={{ color: '#111827' }}>
            MySale
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
            Sistema POS
          </p>
        </div>

        {/* Subtitle */}
        <p className="text-center text-sm mb-6" style={{ color: '#6b7280' }}>
          Acceso al sistema
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <User size={20} style={{ color: '#6b7280' }} />
            </div>
            <input
              ref={usernameRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Usuario o correo"
              className="w-full h-12 pl-12 pr-4 text-base outline-none transition-all duration-200"
              style={{ 
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                color: '#111827'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#00a86b';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 168, 107, 0.1)';
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
              <Lock size={20} style={{ color: '#6b7280' }} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Contrasena"
              className="w-full h-12 pl-12 pr-12 text-base outline-none transition-all duration-200"
              style={{ 
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                color: '#111827'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#00a86b';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 168, 107, 0.1)';
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
                <EyeOff size={20} style={{ color: '#6b7280' }} />
              ) : (
                <Eye size={20} style={{ color: '#6b7280' }} />
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
                borderRadius: '10px',
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
            className="w-full text-base text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
            style={{ 
              backgroundColor: '#00a86b',
              borderRadius: '12px',
              height: '48px',
              fontWeight: 600
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                (e.target as HTMLButtonElement).style.backgroundColor = '#00965f';
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#00a86b';
            }}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Iniciar sesion'
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ backgroundColor: '#e5e7eb' }} />
            <span className="text-xs uppercase" style={{ color: '#6b7280' }}>o</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#e5e7eb' }} />
          </div>

          {/* Biometric Button */}
          <button
            type="button"
            disabled
            className="w-full h-12 text-base font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
            style={{ 
              backgroundColor: 'transparent',
              border: '1px solid #00a86b',
              borderRadius: '12px',
              color: '#00a86b'
            }}
          >
            <Fingerprint size={20} />
            Acceso con huella
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid #e5e7eb' }}>
          <p className="text-xs" style={{ color: '#6b7280' }}>
            Sucursal: Galia 1539
          </p>
          <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
            MySale POS Cloud v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

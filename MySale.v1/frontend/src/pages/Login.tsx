import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin } from '../api';
import { User, Lock, Eye, EyeOff, Fingerprint, Loader2 } from 'lucide-react';

// Cashier Illustration Component - Similar to reference image
const CashierIllustration: React.FC = () => (
  <svg viewBox="0 0 500 450" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    {/* Background blob - soft blue */}
    <ellipse cx="320" cy="180" rx="180" ry="160" fill="#93c5fd" opacity="0.35" />
    
    {/* Counter/Desk - brown wood color */}
    <rect x="50" y="340" width="450" height="110" rx="8" fill="#c4a484" />
    <rect x="50" y="340" width="450" height="20" rx="4" fill="#a67c52" />
    
    {/* POS Terminal - dark with white screen */}
    <g>
      {/* Terminal base/stand */}
      <rect x="180" y="320" width="80" height="25" rx="4" fill="#374151" />
      <rect x="200" y="300" width="40" height="25" fill="#4b5563" />
      
      {/* Terminal screen - angled */}
      <g transform="rotate(-10 240 250)">
        <rect x="160" y="180" width="160" height="130" rx="8" fill="#1f2937" />
        <rect x="168" y="188" width="144" height="105" rx="4" fill="#f8fafc" />
        {/* Screen content lines */}
        <rect x="178" y="200" width="80" height="6" rx="2" fill="#e5e7eb" />
        <rect x="178" y="215" width="60" height="4" rx="2" fill="#e5e7eb" />
        <rect x="178" y="228" width="100" height="4" rx="2" fill="#e5e7eb" />
        <rect x="178" y="241" width="70" height="4" rx="2" fill="#e5e7eb" />
        <rect x="178" y="260" width="50" height="8" rx="2" fill="#00a86b" opacity="0.6" />
      </g>
    </g>
    
    {/* Person - Cashier */}
    <g>
      {/* Body - Green shirt (MySale brand color) */}
      <path d="M320 180 Q280 200 270 280 L270 340 L410 340 L410 280 Q400 200 360 180 Z" fill="#00a86b" />
      
      {/* Collar */}
      <path d="M320 175 L340 195 L340 210 L320 195 L300 210 L300 195 Z" fill="#ffffff" />
      
      {/* Neck */}
      <rect x="325" y="145" width="30" height="40" rx="8" fill="#fcd5b8" />
      
      {/* Head */}
      <ellipse cx="340" cy="115" rx="45" ry="50" fill="#fcd5b8" />
      
      {/* Hair - dark */}
      <ellipse cx="340" cy="85" rx="48" ry="35" fill="#1f2937" />
      <path d="M295 100 Q295 70 340 65 Q385 70 385 100 Q385 85 340 80 Q295 85 295 100" fill="#1f2937" />
      
      {/* Ear */}
      <ellipse cx="295" cy="115" rx="8" ry="12" fill="#fcd5b8" />
      
      {/* Face features */}
      <ellipse cx="320" cy="110" rx="4" ry="3" fill="#1f2937" opacity="0.6" />
      <ellipse cx="355" cy="110" rx="4" ry="3" fill="#1f2937" opacity="0.6" />
      <path d="M330 130 Q340 138 350 130" stroke="#d4a088" strokeWidth="2" fill="none" />
      
      {/* Left arm pointing to screen */}
      <path d="M270 220 Q230 240 200 260" stroke="#00a86b" strokeWidth="28" strokeLinecap="round" fill="none" />
      <ellipse cx="195" cy="265" rx="18" ry="14" fill="#fcd5b8" />
      
      {/* Right arm */}
      <path d="M410 250 Q430 280 420 320" stroke="#00a86b" strokeWidth="26" strokeLinecap="round" fill="none" />
      <ellipse cx="420" cy="325" rx="16" ry="12" fill="#fcd5b8" />
    </g>
    
    {/* Small decorative elements */}
    <circle cx="80" cy="100" r="6" fill="#00a86b" opacity="0.3" />
    <circle cx="460" cy="80" r="8" fill="#93c5fd" opacity="0.4" />
    <rect x="70" y="200" width="12" height="12" rx="2" fill="#00a86b" opacity="0.2" transform="rotate(15 76 206)" />
  </svg>
);

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
      {/* Background Blobs */}
      <div 
        className="absolute"
        style={{
          top: '-100px',
          left: '-100px',
          width: '450px',
          height: '450px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(0, 168, 107, 0.14)',
          filter: 'blur(140px)',
          zIndex: 0
        }}
      />
      <div 
        className="absolute"
        style={{
          bottom: '-150px',
          right: '-100px',
          width: '500px',
          height: '500px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(59, 130, 246, 0.12)',
          filter: 'blur(150px)',
          zIndex: 0
        }}
      />
      <div 
        className="absolute hidden lg:block"
        style={{
          top: '40%',
          right: '15%',
          width: '350px',
          height: '350px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(168, 85, 247, 0.08)',
          filter: 'blur(130px)',
          zIndex: 0
        }}
      />

      {/* Main Container */}
      <div className="min-h-screen flex items-center justify-center px-4 py-8 relative" style={{ zIndex: 1 }}>
        <div className="w-full flex items-center justify-center lg:justify-between gap-8 lg:gap-16" style={{ maxWidth: '1100px' }}>
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
                <div 
                  className="mx-auto w-16 h-16 flex items-center justify-center mb-4"
                  style={{ 
                    backgroundColor: '#00a86b',
                    borderRadius: '50%'
                  }}
                >
                  <span className="text-2xl font-bold text-white">M</span>
                </div>
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
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  Sucursal: Galia 1539
                </p>
                <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                  MySale POS Cloud v1.0
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Illustration (hidden on mobile) */}
          <div 
            className="hidden lg:flex flex-1 items-center justify-center"
            style={{
              opacity: isVisible ? 0.88 : 0,
              transform: isVisible ? 'translateX(0)' : 'translateX(20px)',
              transition: 'opacity 0.6s ease-out 0.2s, transform 0.6s ease-out 0.2s',
              filter: 'saturate(0.95) contrast(0.98)'
            }}
          >
            <div style={{ maxWidth: '380px', width: '100%' }}>
              <CashierIllustration />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

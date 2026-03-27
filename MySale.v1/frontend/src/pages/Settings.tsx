import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Upload, Save, Building2, FileText, Hash, MessageSquare, MapPin, Phone, Mail, Palette, Loader2, CheckCircle } from 'lucide-react';
import { getBusinessProfile, updateBusinessProfile, uploadBusinessLogo } from '../api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ProfileForm {
  name: string;
  razon_social: string;
  nit: string;
  slogan: string;
  address: string;
  contact_phone: string;
  contact_email: string;
  primary_color: string;
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProfileForm>({
    name: '',
    razon_social: '',
    nit: '',
    slogan: '',
    address: '',
    contact_phone: '',
    contact_email: '',
    primary_color: '#00a86b',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getBusinessProfile();
      setForm({
        name: data.name || '',
        razon_social: data.razon_social || '',
        nit: data.nit || '',
        slogan: data.slogan || '',
        address: data.address || '',
        contact_phone: data.contact_phone || '',
        contact_email: data.contact_email || '',
        primary_color: data.primary_color || '#00a86b',
      });
      setLogoUrl(data.logo_url);
    } catch (error) {
      console.error('Error loading business profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateBusinessProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      setUploadingLogo(true);
      const result = await uploadBusinessLogo(file);
      setLogoUrl(result.logo_url);
      setLogoPreview(null);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al subir el logo');
      setLogoPreview(null);
    } finally {
      setUploadingLogo(false);
    }
  };

  const getLogoSrc = () => {
    if (logoPreview) return logoPreview;
    if (logoUrl) {
      if (logoUrl.startsWith('http')) return logoUrl;
      return `${API_URL}${logoUrl}`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#00a86b' }}></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 168, 107, 0.1)' }}>
          <SettingsIcon size={20} style={{ color: '#00a86b' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>Perfil del Negocio</h1>
          <p className="text-sm" style={{ color: '#6b7280' }}>Configura la informacion de tu negocio</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Logo Section */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
          <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#111827' }}>
            <Upload size={18} style={{ color: '#00a86b' }} />
            Logo del Negocio
          </h2>
          <div className="flex items-center gap-6">
            <div
              className="w-28 h-28 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer relative group"
              style={{ backgroundColor: '#f3f4f6', border: '2px dashed #d1d5db' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {getLogoSrc() ? (
                <>
                  <img src={getLogoSrc()!} alt="Logo" className="w-full h-full object-contain p-2" />
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
                      <Loader2 size={24} className="text-white animate-spin" />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <Upload size={24} style={{ color: '#9ca3af' }} className="mx-auto mb-1" />
                  <span className="text-xs" style={{ color: '#9ca3af' }}>Subir logo</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#374151' }}>Sube el logo de tu negocio</p>
              <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>PNG, JPG o SVG. Maximo 2MB.</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ backgroundColor: 'rgba(0, 168, 107, 0.1)', color: '#00a86b' }}
              >
                {logoUrl ? 'Cambiar logo' : 'Seleccionar archivo'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Business Info Section */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
          <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#111827' }}>
            <Building2 size={18} style={{ color: '#00a86b' }} />
            Informacion del Negocio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                <FileText size={14} style={{ color: '#9ca3af' }} />
                Nombre del Negocio
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ border: '1px solid #e5e7eb', focusRingColor: '#00a86b' }}
                placeholder="Ej: Foodgo"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                <Hash size={14} style={{ color: '#9ca3af' }} />
                NIT
              </label>
              <input
                type="text"
                value={form.nit}
                onChange={(e) => setForm({ ...form, nit: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ border: '1px solid #e5e7eb' }}
                placeholder="Ej: 900.123.456-7"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                <Building2 size={14} style={{ color: '#9ca3af' }} />
                Razon Social
              </label>
              <input
                type="text"
                value={form.razon_social}
                onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ border: '1px solid #e5e7eb' }}
                placeholder="Ej: Foodgo S.A.S."
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                <MessageSquare size={14} style={{ color: '#9ca3af' }} />
                Eslogan
              </label>
              <input
                type="text"
                value={form.slogan}
                onChange={(e) => setForm({ ...form, slogan: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ border: '1px solid #e5e7eb' }}
                placeholder="Ej: La mejor comida rapida de la ciudad"
              />
            </div>
          </div>
        </div>

        {/* Contact Info Section */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
          <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#111827' }}>
            <Phone size={18} style={{ color: '#00a86b' }} />
            Contacto
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                <Phone size={14} style={{ color: '#9ca3af' }} />
                Telefono
              </label>
              <input
                type="text"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ border: '1px solid #e5e7eb' }}
                placeholder="Ej: +57 300 123 4567"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                <Mail size={14} style={{ color: '#9ca3af' }} />
                Correo Electronico
              </label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ border: '1px solid #e5e7eb' }}
                placeholder="Ej: contacto@foodgo.co"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                <MapPin size={14} style={{ color: '#9ca3af' }} />
                Direccion
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ border: '1px solid #e5e7eb' }}
                placeholder="Ej: Calle 123 #45-67, Bogota"
              />
            </div>
          </div>
        </div>

        {/* Color Section */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
          <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#111827' }}>
            <Palette size={18} style={{ color: '#00a86b' }} />
            Personalizacion
          </h2>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium" style={{ color: '#374151' }}>
              Color principal
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer border-0"
              />
              <span className="text-sm font-mono" style={{ color: '#6b7280' }}>{form.primary_color}</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
            style={{ backgroundColor: saved ? '#059669' : '#00a86b' }}
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : saved ? (
              <CheckCircle size={18} />
            ) : (
              <Save size={18} />
            )}
            {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

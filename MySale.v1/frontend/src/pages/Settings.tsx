import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Upload, Save, Loader2, CheckCircle } from 'lucide-react';
import {
  getBusinessProfile,
  updateBusinessProfile,
  uploadBusinessLogo,
  getLocationReceiptProfiles,
  updateLocationReceiptProfile,
  uploadLocationReceiptLogo,
  deleteLocationReceiptLogo,
} from '../api';
import type { LocationReceiptProfile } from '../api';

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

type LocationProfileForm = Omit<ProfileForm, 'primary_color'>;

const emptyLocationForm: LocationProfileForm = {
  name: '',
  razon_social: '',
  nit: '',
  slogan: '',
  address: '',
  contact_phone: '',
  contact_email: '',
};

const toLocationForm = (profile: LocationReceiptProfile): LocationProfileForm => ({
  name: profile.name || '',
  razon_social: profile.razon_social || '',
  nit: profile.nit || '',
  slogan: profile.slogan || '',
  address: profile.address || '',
  contact_phone: profile.contact_phone || '',
  contact_email: profile.contact_email || '',
});

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locationLogoInputRef = useRef<HTMLInputElement>(null);

  const [locationProfiles, setLocationProfiles] = useState<LocationReceiptProfile[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [locationForm, setLocationForm] = useState<LocationProfileForm>(emptyLocationForm);
  const [savingLocation, setSavingLocation] = useState(false);
  const [uploadingLocationLogo, setUploadingLocationLogo] = useState(false);

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
    loadLocationProfiles();
  }, []);

  const loadLocationProfiles = async () => {
    try {
      const data = await getLocationReceiptProfiles();
      setLocationProfiles(data);
      if (data.length > 0) {
        setSelectedLocationId(data[0].location_id);
        setLocationForm(toLocationForm(data[0]));
      }
    } catch (error) {
      console.error('Error loading location receipt profiles:', error);
    }
  };

  const selectedLocation = locationProfiles.find((p) => p.location_id === selectedLocationId) || null;

  const handleSelectLocation = (locationId: number) => {
    setSelectedLocationId(locationId);
    const profile = locationProfiles.find((p) => p.location_id === locationId);
    setLocationForm(profile ? toLocationForm(profile) : emptyLocationForm);
  };

  const handleSaveLocation = async () => {
    if (!selectedLocationId) return;
    try {
      setSavingLocation(true);
      const updated = await updateLocationReceiptProfile(selectedLocationId, locationForm);
      setLocationProfiles((prev) => prev.map((p) => (p.location_id === updated.location_id ? updated : p)));
      setLocationForm(toLocationForm(updated));
      toast.success('Datos de la sucursal guardados');
    } catch (error) {
      console.error('Error saving location receipt profile:', error);
      toast.error('Error al guardar los datos de la sucursal');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleLocationLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLocationId) return;
    try {
      setUploadingLocationLogo(true);
      const updated = await uploadLocationReceiptLogo(selectedLocationId, file);
      setLocationProfiles((prev) => prev.map((p) => (p.location_id === updated.location_id ? updated : p)));
      toast.success('Logo de la sucursal actualizado');
    } catch (error) {
      console.error('Error uploading location logo:', error);
      toast.error('Error al subir el logo de la sucursal');
    } finally {
      setUploadingLocationLogo(false);
      if (locationLogoInputRef.current) locationLogoInputRef.current.value = '';
    }
  };

  const handleRemoveLocationLogo = async () => {
    if (!selectedLocationId) return;
    try {
      setUploadingLocationLogo(true);
      const updated = await deleteLocationReceiptLogo(selectedLocationId);
      setLocationProfiles((prev) => prev.map((p) => (p.location_id === updated.location_id ? updated : p)));
      toast.success('La sucursal vuelve a usar el logo del negocio');
    } catch (error) {
      console.error('Error removing location logo:', error);
      toast.error('Error al quitar el logo de la sucursal');
    } finally {
      setUploadingLocationLogo(false);
    }
  };

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
      toast.error('Error al cargar perfil del negocio');
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
      toast.success('Perfil guardado correctamente');
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar el perfil');
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
      toast.error(error.response?.data?.detail || 'Error al subir el logo');
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
    <div className="space-y-6 px-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>Perfil del Negocio</h1>
          <p className="text-sm" style={{ color: '#6b7280' }}>Configura la informacion de tu negocio</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
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

      <form onSubmit={handleSave}>
        {/* Top Row: Logo + Business Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Logo Section */}
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
            <h2 className="font-semibold mb-4 self-start" style={{ color: '#111827' }}>
              Logo del Negocio
            </h2>
            <div
              className="w-36 h-36 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer relative group mb-4"
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
                  <Upload size={28} style={{ color: '#9ca3af' }} className="mx-auto mb-1" />
                  <span className="text-xs" style={{ color: '#9ca3af' }}>Subir logo</span>
                </div>
              )}
            </div>
            <p className="text-xs mb-3 text-center" style={{ color: '#9ca3af' }}>PNG, JPG o SVG. Maximo 2MB.</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{ backgroundColor: 'rgba(0, 168, 107, 0.1)', color: '#00a86b' }}
            >
              {logoUrl ? 'Cambiar logo' : 'Seleccionar archivo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>

          {/* Business Info Section */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
            <h2 className="font-semibold mb-4" style={{ color: '#111827' }}>
              Informacion del Negocio
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>
                  Nombre del Negocio
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ border: '1px solid #e5e7eb' }}
                  placeholder="Ej: Foodgo"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>
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
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>
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
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>
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
        </div>

        {/* Bottom Row: Contact + Personalization */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Info Section */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
            <h2 className="font-semibold mb-4" style={{ color: '#111827' }}>
              Contacto
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>
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
                <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>
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
                <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>
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
            <h2 className="font-semibold mb-4" style={{ color: '#111827' }}>
              Personalizacion
            </h2>
            <div className="flex flex-col items-center gap-3 pt-2">
              <label className="text-sm font-medium" style={{ color: '#374151' }}>
                Color principal
              </label>
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                className="w-16 h-16 rounded-xl cursor-pointer border-0"
              />
              <span className="text-sm font-mono" style={{ color: '#6b7280' }}>{form.primary_color}</span>
            </div>
          </div>
        </div>
      </form>

      {locationProfiles.length > 0 && (
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-semibold" style={{ color: '#111827' }}>Datos de factura por sucursal</h2>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                Lo que dejes vacio se imprime con los datos del negocio.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveLocation}
              disabled={savingLocation || !selectedLocationId}
              className="flex items-center gap-2 px-5 py-2.5 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
              style={{ backgroundColor: '#00a86b' }}
            >
              {savingLocation ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {savingLocation ? 'Guardando...' : 'Guardar sucursal'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {locationProfiles.map((profile) => (
              <button
                key={profile.location_id}
                type="button"
                onClick={() => handleSelectLocation(profile.location_id)}
                className="px-4 py-2 text-sm font-medium rounded-xl transition-colors"
                style={
                  profile.location_id === selectedLocationId
                    ? { backgroundColor: '#00a86b', color: '#ffffff' }
                    : { backgroundColor: '#f3f4f6', color: '#374151' }
                }
              >
                {profile.location_name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>Nombre en la factura</label>
              <input
                type="text"
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ border: '1px solid #e5e7eb' }}
                placeholder={form.name || 'Usa el del negocio'}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>NIT</label>
              <input
                type="text"
                value={locationForm.nit}
                onChange={(e) => setLocationForm({ ...locationForm, nit: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ border: '1px solid #e5e7eb' }}
                placeholder={form.nit || 'Usa el del negocio'}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>Razon Social</label>
              <input
                type="text"
                value={locationForm.razon_social}
                onChange={(e) => setLocationForm({ ...locationForm, razon_social: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ border: '1px solid #e5e7eb' }}
                placeholder={form.razon_social || 'Usa la del negocio'}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>Eslogan</label>
              <input
                type="text"
                value={locationForm.slogan}
                onChange={(e) => setLocationForm({ ...locationForm, slogan: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ border: '1px solid #e5e7eb' }}
                placeholder={form.slogan || 'Usa el del negocio'}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>Telefono</label>
              <input
                type="text"
                value={locationForm.contact_phone}
                onChange={(e) => setLocationForm({ ...locationForm, contact_phone: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ border: '1px solid #e5e7eb' }}
                placeholder={form.contact_phone || 'Usa el del negocio'}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>Correo Electronico</label>
              <input
                type="email"
                value={locationForm.contact_email}
                onChange={(e) => setLocationForm({ ...locationForm, contact_email: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ border: '1px solid #e5e7eb' }}
                placeholder={form.contact_email || 'Usa el del negocio'}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>Direccion</label>
              <input
                type="text"
                value={locationForm.address}
                onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ border: '1px solid #e5e7eb' }}
                placeholder={form.address || 'Usa la del negocio'}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-5 pt-5" style={{ borderTop: '1px solid #e5e7eb' }}>
            <div
              className="w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: '#f3f4f6', border: '2px dashed #d1d5db' }}
            >
              {selectedLocation?.logo_url ? (
                <img
                  src={selectedLocation.logo_url.startsWith('http') ? selectedLocation.logo_url : `${API_URL}${selectedLocation.logo_url}`}
                  alt={`Logo de ${selectedLocation.location_name}`}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <Upload size={22} style={{ color: '#9ca3af' }} />
              )}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: '#374151' }}>Logo en la factura de esta sucursal</p>
              <p className="text-xs mb-2" style={{ color: '#9ca3af' }}>
                {selectedLocation?.logo_url ? 'PNG, JPG o SVG. Maximo 2MB.' : 'Sin logo propio: usa el del negocio.'}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => locationLogoInputRef.current?.click()}
                  disabled={uploadingLocationLogo || !selectedLocationId}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(0, 168, 107, 0.1)', color: '#00a86b' }}
                >
                  {uploadingLocationLogo ? 'Procesando...' : selectedLocation?.logo_url ? 'Cambiar logo' : 'Subir logo'}
                </button>
                {selectedLocation?.logo_url && (
                  <button
                    type="button"
                    onClick={handleRemoveLocationLogo}
                    disabled={uploadingLocationLogo}
                    className="text-sm font-medium disabled:opacity-50"
                    style={{ color: '#ef4444' }}
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
            <input
              ref={locationLogoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              onChange={handleLocationLogoUpload}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
}

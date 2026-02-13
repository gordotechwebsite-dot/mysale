import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import api from '../api/client';

interface FAQ {
  id: number;
  question: string;
  keywords: string;
  answer: string;
  category: string | null;
  is_active: boolean;
  priority: number;
}

export default function PosAdminFAQs() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    question: '',
    keywords: '',
    answer: '',
    category: '',
    is_active: true,
    priority: 0
  });

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/faq/');
      setFaqs(response.data);
    } catch (err) {
      setError('Error al cargar FAQs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/faq/', form);
      setShowModal(false);
      resetForm();
      loadFAQs();
    } catch (err) {
      console.error(err);
      alert('Error al crear FAQ');
    }
  };

  const handleUpdate = async () => {
    if (!editingFaq) return;
    try {
      await api.put(`/faq/${editingFaq.id}`, form);
      setShowModal(false);
      setEditingFaq(null);
      resetForm();
      loadFAQs();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar FAQ');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminar esta FAQ?')) return;
    try {
      await api.delete(`/faq/${id}`);
      loadFAQs();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar FAQ');
    }
  };

  const handleSeedDefaults = async () => {
    try {
      await api.post('/faq/seed');
      loadFAQs();
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setForm({
      question: faq.question,
      keywords: faq.keywords,
      answer: faq.answer,
      category: faq.category || '',
      is_active: faq.is_active,
      priority: faq.priority
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setForm({ question: '', keywords: '', answer: '', category: '', is_active: true, priority: 0 });
  };

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(search.toLowerCase()) ||
    faq.keywords.toLowerCase().includes(search.toLowerCase()) ||
    (faq.category || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Chatbot FAQs</h1>
        <div className="flex gap-2">
          {faqs.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Cargar FAQs por defecto
            </button>
          )}
          <button
            onClick={() => {
              setEditingFaq(null);
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Nueva FAQ
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por pregunta, keywords o categoría..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pregunta</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keywords</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredFaqs.map((faq) => (
              <tr key={faq.id} className={!faq.is_active ? 'opacity-50' : ''}>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 text-sm">{faq.question}</div>
                  <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">{faq.answer}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {faq.keywords.split(',').slice(0, 3).map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {kw.trim()}
                      </span>
                    ))}
                    {faq.keywords.split(',').length > 3 && (
                      <span className="text-xs text-gray-400">+{faq.keywords.split(',').length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{faq.category || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{faq.priority}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${faq.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {faq.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(faq)} className="p-1 text-gray-600 hover:bg-gray-50 rounded" title="Editar">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(faq.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredFaqs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {faqs.length === 0 ? 'No hay FAQs registradas. Usa "Cargar FAQs por defecto" para comenzar.' : 'No se encontraron FAQs'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingFaq ? 'Editar FAQ' : 'Nueva FAQ'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pregunta *</label>
                <input
                  type="text"
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Cómo hacer una venta?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keywords * (separadas por coma)</label>
                <input
                  type="text"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="venta,cobrar,factura,ticket"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Respuesta *</label>
                <textarea
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  rows={4}
                  placeholder="Para realizar una venta..."
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="ventas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Activo</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setEditingFaq(null); resetForm(); }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={editingFaq ? handleUpdate : handleCreate}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                {editingFaq ? 'Guardar Cambios' : 'Crear FAQ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

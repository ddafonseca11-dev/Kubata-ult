import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createProperty, updateProperty, getPropertyById } from '@/services/propertyService';
import type { Property, PropertyType, TransactionType, PropertyStatus } from '@/types';

export default function PropertyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'EUR',
    property_type: 'apartment' as PropertyType,
    transaction_type: 'sale' as TransactionType,
    status: 'draft' as PropertyStatus,
    bedrooms: '',
    bathrooms: '',
    area: '',
    land_area: '',
    address: '',
    city: '',
    region: '',
    country: 'Portugal',
    is_featured: false,
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useState(() => {
    if (id) {
      getPropertyById(id).then((prop) => {
        if (prop) {
          setForm({
            title: prop.title,
            description: prop.description || '',
            price: prop.price?.toString() || '',
            currency: prop.currency,
            property_type: prop.property_type,
            transaction_type: prop.transaction_type,
            status: prop.status,
            bedrooms: prop.bedrooms?.toString() || '',
            bathrooms: prop.bathrooms?.toString() || '',
            area: prop.area?.toString() || '',
            land_area: prop.land_area?.toString() || '',
            address: prop.address || '',
            city: prop.city || '',
            region: prop.region || '',
            country: prop.country,
            is_featured: prop.is_featured,
          });
        }
        setLoading(false);
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');

    const data: Partial<Property> = {
      title: form.title,
      description: form.description || null,
      price: form.price ? parseFloat(form.price) : null,
      currency: form.currency,
      property_type: form.property_type,
      transaction_type: form.transaction_type,
      status: form.status,
      bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
      bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
      area: form.area ? parseFloat(form.area) : null,
      land_area: form.land_area ? parseFloat(form.land_area) : null,
      address: form.address || null,
      city: form.city || null,
      region: form.region || null,
      country: form.country,
      is_featured: form.is_featured,
    };

    try {
      if (isEdit && id) {
        await updateProperty(id, data);
      } else {
        await createProperty({ ...data, owner_id: user.id });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-8"><div className="animate-pulse h-60 bg-slate-200 rounded-xl" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-600 hover:text-slate-900 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">{isEdit ? 'Editar imóvel' : 'Novo imóvel'}</h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border border-slate-200 p-6">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Título *</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none" />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Descrição</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Preço</label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-slate-300" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Moeda</label>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-slate-300">
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="AOA">AOA</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Tipo</label>
            <select value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value as PropertyType })} className="w-full px-3 py-2.5 rounded-lg border border-slate-300">
              <option value="apartment">Apartamento</option>
              <option value="house">Casa</option>
              <option value="villa">Vivenda</option>
              <option value="studio">Studio</option>
              <option value="duplex">Duplex</option>
              <option value="commercial">Comercial</option>
              <option value="office">Escritório</option>
              <option value="land">Terreno</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Transação</label>
            <select value={form.transaction_type} onChange={(e) => setForm({ ...form, transaction_type: e.target.value as TransactionType })} className="w-full px-3 py-2.5 rounded-lg border border-slate-300">
              <option value="sale">Venda</option>
              <option value="rent">Arrendamento</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Quartos</label>
            <input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-slate-300" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Casas de banho</label>
            <input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-slate-300" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Área (m²)</label>
            <input type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-slate-300" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Cidade</label>
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-slate-300" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Região</label>
            <input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-slate-300" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Endereço</label>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-slate-300" />
        </div>

        {isEdit && (
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Estado</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PropertyStatus })} className="w-full px-3 py-2.5 rounded-lg border border-slate-300">
              <option value="draft">Rascunho</option>
              <option value="pending">Pendente</option>
              <option value="published">Publicado</option>
              <option value="rejected">Rejeitado</option>
              <option value="sold">Vendido</option>
              <option value="rented">Arrendado</option>
            </select>
          </div>
        )}

        {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

        <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? 'A guardar...' : 'Guardar'}
        </button>
      </form>
    </div>
  );
}

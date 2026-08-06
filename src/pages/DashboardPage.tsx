import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus, CreditCard as Edit, Trash2, Eye, Check, X, DollarSign, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getMyProperties, deleteProperty, updateProperty, getPropertyImages } from '@/services/propertyService';
import { getMyPayments } from '@/services/paymentService';
import { isPaymentEnabled } from '@/services/paymentProvider';
import { trackEvent, AnalyticsEvents } from '@/services/analyticsService';
import type { Property, Payment, PropertyImage } from '@/types';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'properties' | 'payments'>('properties');

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    Promise.all([
      getMyProperties(user.id),
      getMyPayments(user.id),
    ]).then(async ([props, pays]) => {
      setProperties(props);
      setPayments(pays);
      const imgs: Record<string, string> = {};
      await Promise.all(
        props.map(async (p) => {
          const images = await getPropertyImages(p.id);
          if (images.length > 0) imgs[p.id] = images[0].url;
        })
      );
      setImageMap(imgs);
      setLoading(false);
    });
  }, [user, navigate]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tens a certeza que queres eliminar este imóvel?')) return;
    try {
      await deleteProperty(id);
      setProperties(properties.filter((p) => p.id !== id));
    } catch {
      alert('Erro ao eliminar.');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateProperty(id, { status } as Partial<Property>);
      setProperties(properties.map((p) => (p.id === id ? { ...p, status: status as Property['status'] } : p)));
    } catch {
      alert('Erro ao atualizar estado.');
    }
  };

  const handlePayment = async (propertyId: string) => {
    trackEvent(AnalyticsEvents.PAYMENT_STARTED, { propertyId });
    navigate(`/checkout?property_id=${propertyId}&type=featured`);
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8"><div className="animate-pulse h-40 bg-slate-200 rounded-xl" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Painel</h1>
          <p className="text-slate-500">Olá, {profile?.full_name || user?.email}</p>
        </div>
        <Link to="/properties/new" className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700">
          <Plus className="w-4 h-4" />
          Novo imóvel
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Imóveis', value: properties.length, icon: Building2 },
          { label: 'Publicados', value: properties.filter((p) => p.status === 'published').length, icon: Check },
          { label: 'Pendentes', value: properties.filter((p) => p.status === 'pending').length, icon: Eye },
          { label: 'Pagamentos', value: payments.length, icon: CreditCard },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <Icon className="w-6 h-6 text-teal-600 mb-2" />
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-slate-200">
        <button onClick={() => setTab('properties')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'properties' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'}`}>
          Meus imóveis
        </button>
        <button onClick={() => setTab('payments')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'payments' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'}`}>
          Pagamentos
        </button>
      </div>

      {tab === 'properties' && (
        <div className="space-y-4">
          {properties.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Ainda não tens imóveis.</p>
              <Link to="/properties/new" className="text-teal-600 hover:text-teal-700 mt-2 inline-block">Criar primeiro imóvel</Link>
            </div>
          ) : (
            properties.map((property) => (
              <div key={property.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-32 h-32 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                  {imageMap[property.id] ? (
                    <img src={imageMap[property.id]} alt={property.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Building2 className="w-8 h-8 text-slate-300" /></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/properties/${property.id}`} className="font-semibold text-slate-900 hover:text-teal-700">{property.title}</Link>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      property.status === 'published' ? 'bg-green-100 text-green-700' :
                      property.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      property.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                      property.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {property.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {property.city || 'Sem cidade'} • {property.price ? `${property.price} ${property.currency}` : 'Sob consulta'}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Link to={`/properties/${property.id}/edit`} className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50">
                      <Edit className="w-3.5 h-3.5" /> Editar
                    </Link>
                    <Link to={`/properties/${property.id}/images`} className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50">
                      <Plus className="w-3.5 h-3.5" /> Imagens
                    </Link>
                    {property.status === 'draft' && (
                      <button onClick={() => handleStatusChange(property.id, 'pending')} className="flex items-center gap-1 px-3 py-1.5 text-sm text-teal-700 border border-teal-600 rounded-lg hover:bg-teal-50">
                        <Check className="w-3.5 h-3.5" /> Submeter
                      </button>
                    )}
                    {isPaymentEnabled() && property.status !== 'published' && (
                      <button onClick={() => handlePayment(property.id)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-amber-700 border border-amber-600 rounded-lg hover:bg-amber-50">
                        <DollarSign className="w-3.5 h-3.5" /> Destacar
                      </button>
                    )}
                    <button onClick={() => handleDelete(property.id)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-4">
          {payments.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Nenhum pagamento registado.</p>
            </div>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900">{payment.description || payment.payment_type}</div>
                  <div className="text-sm text-slate-500">{new Date(payment.created_at).toLocaleDateString('pt-PT')}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900">{payment.amount} {payment.currency}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                    payment.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{payment.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

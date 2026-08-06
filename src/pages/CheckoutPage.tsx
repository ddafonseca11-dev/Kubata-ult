import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, ArrowLeft, Check, CircleAlert as AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createPayment, getPaymentStatus } from '@/services/paymentService';
import { isPaymentEnabled, getActiveProvider } from '@/services/paymentProvider';
import { trackEvent, AnalyticsEvents } from '@/services/analyticsService';
import { getPropertyById } from '@/services/propertyService';

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const propertyId = searchParams.get('property_id');
  const paymentType = searchParams.get('type') || 'featured';

  const [property, setProperty] = useState<{ title: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({ type: 'idle' });

  const pricing: Record<string, { amount: number; label: string }> = {
    featured: { amount: 29.99, label: 'Destacar Imóvel' },
    listing: { amount: 9.99, label: 'Publicar Imóvel' },
    subscription: { amount: 49.99, label: 'Subscrição Premium' },
  };

  const selected = pricing[paymentType] || pricing.featured;

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    if (propertyId) {
      getPropertyById(propertyId).then((prop) => {
        setProperty(prop ? { title: prop.title } : null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user, propertyId, navigate]);

  const handleCheckout = async () => {
    if (!user) return;
    setProcessing(true); setStatus({ type: 'idle' });
    trackEvent(AnalyticsEvents.PAYMENT_STARTED, { propertyId: propertyId || undefined, paymentType });
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ amount: selected.amount, currency: 'eur', description: selected.label, property_id: propertyId || null, payment_type: paymentType, origin: window.location.origin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível iniciar o pagamento.');
      if (!data.checkout_url) throw new Error('O gateway não devolveu um checkout válido.');
      window.location.assign(data.checkout_url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao iniciar pagamento.';
      setStatus({ type: 'error', message });
      trackEvent(AnalyticsEvents.PAYMENT_FAILED, { propertyId: propertyId || undefined, error: message });
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-8"><div className="animate-pulse h-40 bg-slate-200 rounded-xl" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-600 hover:text-slate-900 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Checkout</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{selected.label}</div>
            {property && <div className="text-sm text-slate-500">{property.title}</div>}
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-slate-600">Subtotal</span>
          <span className="font-medium text-slate-900">{selected.amount.toFixed(2)} EUR</span>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-slate-200">
          <span className="text-lg font-semibold text-slate-900">Total</span>
          <span className="text-2xl font-bold text-teal-700">{selected.amount.toFixed(2)} EUR</span>
        </div>

        {!isPaymentEnabled() && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-medium">Gateway de pagamento não configurado</p>
              <p className="mt-1">Para ativar pagamentos reais, configura as variáveis de ambiente no servidor.</p>
            </div>
          </div>
        )}

        {status.type === 'success' && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-700">{status.message}</div>
          </div>
        )}

        {status.type === 'error' && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">{status.message}</div>
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={processing}
          className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50"
        >
          {processing ? 'A processar...' : (
            <>
              <Lock className="w-4 h-4" />
              Pagar {selected.amount.toFixed(2)} EUR
            </>
          )}
        </button>

        <div className="text-center text-xs text-slate-400">
          Pagamentos processados via {getActiveProvider()}. Os teus dados estão seguros.
        </div>
      </div>
    </div>
  );
}

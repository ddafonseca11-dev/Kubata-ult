import { useEffect, useState } from 'react';
import { ChartBar as BarChart3 } from 'lucide-react';
import { getAnalyticsSummary, getAnalyticsEventsPaginated } from '@/services/analyticsService';
import Pagination from '@/components/Pagination';
import type { AnalyticsEvent } from '@/types';

export default function AdminAnalytics() {
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyticsSummary(30).then((s) => {
      setSummary(s);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    getAnalyticsEventsPaginated(page, 25).then((result) => {
      setEvents(result.data);
      setTotalPages(result.totalPages);
      setCount(result.count);
    });
  }, [page]);

  const eventLabels: Record<string, string> = {
    PROPERTY_VIEW: 'Visualizações de imóveis',
    PROPERTY_FAVORITE: 'Favoritos',
    CONTACT: 'Contactos',
    WHATSAPP_CLICK: 'Cliques WhatsApp',
    PHONE_CLICK: 'Cliques telefone',
    VIEWING_REQUEST: 'Pedidos de visita',
    MESSAGE_SENT: 'Mensagens enviadas',
    LEAD_CREATED: 'Leads criados',
    PAYMENT_STARTED: 'Pagamentos iniciados',
    PAYMENT_COMPLETED: 'Pagamentos concluídos',
    PAYMENT_FAILED: 'Pagamentos falhados',
    SEARCH: 'Pesquisas',
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Resumo (últimos 30 dias)</h2>

      {loading ? (
        <div className="animate-pulse h-32 bg-slate-200 rounded-xl" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Object.entries(eventLabels).map(([key, label]) => (
            <div key={key} className="bg-white rounded-xl border border-slate-200 p-4">
              <BarChart3 className="w-6 h-6 text-teal-600 mb-2" />
              <div className="text-2xl font-bold text-slate-900">{summary[key] || 0}</div>
              <div className="text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold text-slate-900 mb-4">Eventos recentes</h2>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Evento</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Utilizador</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Propriedade</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400">Nenhum evento encontrado.</td></tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{event.event_name}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-mono">{event.user_id || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-mono">{event.property_id || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(event.created_at).toLocaleString('pt-PT')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-slate-500 mt-2">{count} eventos</div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} loading={loading} />
    </div>
  );
}

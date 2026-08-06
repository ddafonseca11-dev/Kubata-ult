import { useAdminPagination } from '@/hooks/useAdminPagination';
import { getPaymentsPaginated } from '@/services/adminService';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import Pagination from '@/components/Pagination';
import type { Payment } from '@/types';

export default function AdminPayments() {
  const {
    page, data, count, totalPages, loading, error,
    search, filters, sortBy, sortOrder,
    handlePageChange, handleSearch, handleFilterChange, handleSort,
  } = useAdminPagination<Payment>({ fetcher: getPaymentsPaginated });

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <AdminSearchBar value={search} onChange={handleSearch} placeholder="Descrição, ID externo..." />
        <select value={filters.status || ''} onChange={(e) => handleFilterChange('status', e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm">
          <option value="">Todos os estados</option>
          <option value="pending">Pendente</option>
          <option value="processing">Processando</option>
          <option value="completed">Concluído</option>
          <option value="failed">Falhado</option>
          <option value="refunded">Reembolsado</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <select value={filters.payment_type || ''} onChange={(e) => handleFilterChange('payment_type', e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm">
          <option value="">Todos os tipos</option>
          <option value="listing">Publicação</option>
          <option value="featured">Destaque</option>
          <option value="subscription">Subscrição</option>
          <option value="service">Serviço</option>
        </select>
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Descrição</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Provider</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">ID Externo</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900" onClick={() => handleSort('amount')}>Valor {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900" onClick={() => handleSort('created_at')}>Data {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">A carregar...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Nenhum pagamento encontrado.</td></tr>
              ) : (
                data.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">{payment.description || payment.payment_type}</td>
                    <td className="px-4 py-3 text-slate-600">{payment.provider}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono">{payment.external_payment_id || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{payment.amount} {payment.currency}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                        payment.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        payment.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                        payment.status === 'refunded' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{payment.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(payment.created_at).toLocaleDateString('pt-PT')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-slate-500 mt-2">{count} pagamentos</div>
      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} loading={loading} />
    </div>
  );
}

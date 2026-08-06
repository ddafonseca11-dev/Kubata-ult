import { useAdminPagination } from '@/hooks/useAdminPagination';
import { getViewingRequestsPaginated } from '@/services/adminService';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import Pagination from '@/components/Pagination';
import type { ViewingRequest } from '@/types';

export default function AdminViewingRequests() {
  const {
    page, data, count, totalPages, loading, error,
    search, filters, sortBy, sortOrder,
    handlePageChange, handleSearch, handleFilterChange, handleSort,
  } = useAdminPagination<ViewingRequest>({ fetcher: getViewingRequestsPaginated });

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <AdminSearchBar value={search} onChange={handleSearch} placeholder="Nome, email..." />
        <select value={filters.status || ''} onChange={(e) => handleFilterChange('status', e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm">
          <option value="">Todos os estados</option>
          <option value="pending">Pendente</option>
          <option value="confirmed">Confirmado</option>
          <option value="cancelled">Cancelado</option>
          <option value="completed">Concluído</option>
          <option value="no_show">Não compareceu</option>
        </select>
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Imóvel</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Data preferida</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900" onClick={() => handleSort('created_at')}>Criado {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">A carregar...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Nenhuma visita encontrada.</td></tr>
              ) : (
                data.map((vr) => (
                  <tr key={vr.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{vr.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{vr.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{vr.property?.title || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{vr.preferred_date || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        vr.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        vr.status === 'confirmed' ? 'bg-teal-100 text-teal-700' :
                        vr.status === 'completed' ? 'bg-green-100 text-green-700' :
                        vr.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{vr.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(vr.created_at).toLocaleDateString('pt-PT')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-slate-500 mt-2">{count} visitas</div>
      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} loading={loading} />
    </div>
  );
}

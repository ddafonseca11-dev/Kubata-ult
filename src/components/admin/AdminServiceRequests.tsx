import { useAdminPagination } from '@/hooks/useAdminPagination';
import { getServiceRequestsPaginated } from '@/services/adminService';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import Pagination from '@/components/Pagination';
import type { ServiceRequest } from '@/types';

export default function AdminServiceRequests() {
  const {
    page, data, count, totalPages, loading, error,
    search, filters, sortBy, sortOrder,
    handlePageChange, handleSearch, handleFilterChange, handleSort,
  } = useAdminPagination<ServiceRequest>({ fetcher: getServiceRequestsPaginated });

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <AdminSearchBar value={search} onChange={handleSearch} placeholder="Nome, descrição..." />
        <select value={filters.status || ''} onChange={(e) => handleFilterChange('status', e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm">
          <option value="">Todos os estados</option>
          <option value="pending">Pendente</option>
          <option value="assigned">Atribuído</option>
          <option value="in_progress">Em progresso</option>
          <option value="completed">Concluído</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <select value={filters.priority || ''} onChange={(e) => handleFilterChange('priority', e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm">
          <option value="">Todas as prioridades</option>
          <option value="low">Baixa</option>
          <option value="normal">Normal</option>
          <option value="high">Alta</option>
          <option value="urgent">Urgente</option>
        </select>
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Descrição</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Prioridade</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900" onClick={() => handleSort('created_at')}>Data {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">A carregar...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Nenhum pedido encontrado.</td></tr>
              ) : (
                data.map((sr) => (
                  <tr key={sr.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{sr.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{sr.service_type}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{sr.description}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        sr.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        sr.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        sr.priority === 'normal' ? 'bg-slate-100 text-slate-600' :
                        'bg-slate-50 text-slate-500'
                      }`}>{sr.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        sr.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        sr.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        sr.status === 'completed' ? 'bg-green-100 text-green-700' :
                        sr.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{sr.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(sr.created_at).toLocaleDateString('pt-PT')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-slate-500 mt-2">{count} pedidos</div>
      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} loading={loading} />
    </div>
  );
}

import { useAdminPagination } from '@/hooks/useAdminPagination';
import { getInquiriesPaginated } from '@/services/adminService';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import Pagination from '@/components/Pagination';
import type { Inquiry } from '@/types';

export default function AdminInquiries() {
  const {
    page, data, count, totalPages, loading, error,
    search, filters, sortBy, sortOrder,
    handlePageChange, handleSearch, handleFilterChange, handleSort,
  } = useAdminPagination<Inquiry>({ fetcher: getInquiriesPaginated });

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <AdminSearchBar value={search} onChange={handleSearch} placeholder="Nome, email, mensagem..." />
        <select value={filters.status || ''} onChange={(e) => handleFilterChange('status', e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm">
          <option value="">Todos os estados</option>
          <option value="new">Novo</option>
          <option value="read">Lido</option>
          <option value="responded">Respondido</option>
          <option value="archived">Arquivado</option>
        </select>
        <select value={filters.inquiry_type || ''} onChange={(e) => handleFilterChange('inquiry_type', e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm">
          <option value="">Todos os tipos</option>
          <option value="info">Informação</option>
          <option value="visit">Visita</option>
          <option value="offer">Oferta</option>
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
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900" onClick={() => handleSort('created_at')}>Data {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">A carregar...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Nenhuma inquiry encontrada.</td></tr>
              ) : (
                data.map((inquiry) => (
                  <tr key={inquiry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{inquiry.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{inquiry.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{inquiry.property?.title || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{inquiry.inquiry_type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        inquiry.status === 'new' ? 'bg-blue-100 text-blue-700' :
                        inquiry.status === 'read' ? 'bg-slate-100 text-slate-600' :
                        inquiry.status === 'responded' ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{inquiry.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(inquiry.created_at).toLocaleDateString('pt-PT')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-slate-500 mt-2">{count} inquiries</div>
      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} loading={loading} />
    </div>
  );
}

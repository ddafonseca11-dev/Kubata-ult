import { useAdminPagination } from '@/hooks/useAdminPagination';
import { getPropertiesPaginated, getInquiriesPaginated } from '@/services/adminService';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import Pagination from '@/components/Pagination';
import type { Property } from '@/types';

export default function AdminProperties() {
  const {
    page, data, count, totalPages, loading, error,
    search, filters, sortBy, sortOrder,
    handlePageChange, handleSearch, handleFilterChange, handleSort,
  } = useAdminPagination<Property>({ fetcher: getPropertiesPaginated });

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <AdminSearchBar value={search} onChange={handleSearch} placeholder="Título, cidade, endereço..." />
        <select value={filters.status || ''} onChange={(e) => handleFilterChange('status', e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm">
          <option value="">Todos os estados</option>
          <option value="draft">Rascunho</option>
          <option value="pending">Pendente</option>
          <option value="published">Publicado</option>
          <option value="rejected">Rejeitado</option>
          <option value="sold">Vendido</option>
          <option value="rented">Arrendado</option>
        </select>
        <select value={filters.transaction_type || ''} onChange={(e) => handleFilterChange('transaction_type', e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm">
          <option value="">Venda/Arrendamento</option>
          <option value="sale">Venda</option>
          <option value="rent">Arrendamento</option>
        </select>
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900" onClick={() => handleSort('title')}>Título {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Cidade</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900" onClick={() => handleSort('price')}>Preço {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900" onClick={() => handleSort('created_at')}>Data {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">A carregar...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Nenhum imóvel encontrado.</td></tr>
              ) : (
                data.map((property) => (
                  <tr key={property.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">{property.title}</td>
                    <td className="px-4 py-3 text-slate-600">{property.city || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{property.property_type}</td>
                    <td className="px-4 py-3 text-right text-slate-900 font-medium">{property.price ? `${property.price} ${property.currency}` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        property.status === 'published' ? 'bg-green-100 text-green-700' :
                        property.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        property.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                        property.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>{property.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(property.created_at).toLocaleDateString('pt-PT')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-slate-500 mt-2">{count} imóveis</div>
      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} loading={loading} />
    </div>
  );
}

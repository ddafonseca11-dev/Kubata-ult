import { useAdminPagination } from '@/hooks/useAdminPagination';
import { getProfilesPaginated } from '@/services/adminService';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import Pagination from '@/components/Pagination';
import type { Profile } from '@/types';

export default function AdminUsers() {
  const {
    page, data, count, totalPages, loading, error,
    search, filters, sortBy, sortOrder,
    handlePageChange, handleSearch, handleFilterChange, handleSort,
  } = useAdminPagination<Profile>({ fetcher: getProfilesPaginated });

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <AdminSearchBar value={search} onChange={handleSearch} placeholder="Email, nome..." />
        <select value={filters.role || ''} onChange={(e) => handleFilterChange('role', e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm">
          <option value="">Todos os papéis</option>
          <option value="user">Utilizador</option>
          <option value="agent">Agente</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900" onClick={() => handleSort('full_name')}>Nome {sortBy === 'full_name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900" onClick={() => handleSort('email')}>Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Telefone</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Papel</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900" onClick={() => handleSort('created_at')}>Data {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">A carregar...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Nenhum utilizador encontrado.</td></tr>
              ) : (
                data.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{user.full_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3 text-slate-600">{user.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        user.role === 'admin' ? 'bg-red-100 text-red-700' :
                        user.role === 'agent' ? 'bg-teal-100 text-teal-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{user.role}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(user.created_at).toLocaleDateString('pt-PT')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-slate-500 mt-2">{count} utilizadores</div>
      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} loading={loading} />
    </div>
  );
}

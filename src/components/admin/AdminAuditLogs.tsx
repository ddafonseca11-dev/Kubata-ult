import { useAdminPagination } from '@/hooks/useAdminPagination';
import { getAuditLogsPaginated } from '@/services/adminService';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import Pagination from '@/components/Pagination';
import type { AuditLog } from '@/types';

export default function AdminAuditLogs() {
  const {
    page, data, count, totalPages, loading, error,
    search, sortBy, sortOrder,
    handlePageChange, handleSearch, handleSort,
  } = useAdminPagination<AuditLog>({ fetcher: getAuditLogsPaginated });

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <AdminSearchBar value={search} onChange={handleSearch} placeholder="Ação, tipo de entidade..." />
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Ator</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900" onClick={() => handleSort('action')}>Ação {sortBy === 'action' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Entidade</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">IP</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900" onClick={() => handleSort('created_at')}>Data {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">A carregar...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Nenhum registo encontrado.</td></tr>
              ) : (
                data.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{log.actor?.full_name || log.actor?.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{log.action}</td>
                    <td className="px-4 py-3 text-slate-600">{log.entity_type || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono">{log.ip_address || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(log.created_at).toLocaleString('pt-PT')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-slate-500 mt-2">{count} registos</div>
      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} loading={loading} />
    </div>
  );
}

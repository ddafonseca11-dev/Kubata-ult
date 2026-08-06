import { useState, useCallback, useEffect } from 'react';
import type { PaginatedResult, PaginationParams } from '@/types';

interface UseAdminPaginationOptions<T> {
  fetcher: (params: PaginationParams) => Promise<PaginatedResult<T>>;
  defaultPageSize?: number;
  initialFilters?: Record<string, string>;
}

export function useAdminPagination<T>({ fetcher, defaultPageSize = 25, initialFilters }: UseAdminPaginationOptions<T>) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(defaultPageSize);
  const [data, setData] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters || {});
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetch = useCallback(async (targetPage?: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher({
        page: targetPage ?? page,
        pageSize,
        search: search || undefined,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        sortBy,
        sortOrder,
      });
      setData(result.data);
      setCount(result.count);
      setTotalPages(result.totalPages);
      if (targetPage) setPage(targetPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [fetcher, page, pageSize, search, filters, sortBy, sortOrder]);

  useEffect(() => {
    fetch(1);
  }, [fetch]);

  const handlePageChange = (newPage: number) => {
    fetch(newPage);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) {
        next[key] = value;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return {
    page, pageSize, data, count, totalPages, loading, error,
    search, filters, sortBy, sortOrder,
    handlePageChange, handleSearch, handleFilterChange, handleSort,
    refetch: () => fetch(page),
  };
}

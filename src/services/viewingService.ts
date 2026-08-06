import { supabase } from '@/lib/supabase';
import type { ViewingRequest, PaginatedResult, PaginationParams } from '@/types';

export async function createViewingRequest(params: {
  propertyId: string;
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  preferredDate?: string;
  preferredTime?: string;
  message?: string;
}): Promise<ViewingRequest> {
  const { data, error } = await supabase
    .from('viewing_requests')
    .insert({
      property_id: params.propertyId,
      user_id: params.userId,
      name: params.name,
      email: params.email,
      phone: params.phone,
      preferred_date: params.preferredDate,
      preferred_time: params.preferredTime,
      message: params.message,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ViewingRequest;
}

export async function getViewingRequestsPaginated(params: PaginationParams): Promise<PaginatedResult<ViewingRequest>> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase
    .from('viewing_requests')
    .select('*, property:properties(id,title,city)', { count: 'exact' });

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
  }
  if (params.filters?.status) {
    query = query.eq('status', params.filters.status);
  }

  query = query.order(params.sortBy || 'created_at', { ascending: (params.sortOrder || 'desc') === 'asc' });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const totalCount = count ?? 0;
  return {
    data: (data ?? []) as ViewingRequest[],
    count: totalCount,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / params.pageSize)),
  };
}

export async function updateViewingRequestStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('viewing_requests')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

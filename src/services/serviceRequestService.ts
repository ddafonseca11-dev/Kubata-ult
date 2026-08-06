import { supabase } from '@/lib/supabase';
import type { ServiceRequest, PaginatedResult, PaginationParams } from '@/types';

export async function createServiceRequest(params: {
  propertyId?: string;
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  serviceType: string;
  description: string;
  priority?: string;
}): Promise<ServiceRequest> {
  const { data, error } = await supabase
    .from('service_requests')
    .insert({
      property_id: params.propertyId,
      user_id: params.userId,
      name: params.name,
      email: params.email,
      phone: params.phone,
      service_type: params.serviceType,
      description: params.description,
      priority: params.priority || 'normal',
    })
    .select()
    .single();
  if (error) throw error;
  return data as ServiceRequest;
}

export async function getServiceRequestsPaginated(params: PaginationParams): Promise<PaginatedResult<ServiceRequest>> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase
    .from('service_requests')
    .select('*, property:properties(id,title,city)', { count: 'exact' });

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }
  if (params.filters?.status) {
    query = query.eq('status', params.filters.status);
  }
  if (params.filters?.priority) {
    query = query.eq('priority', params.filters.priority);
  }

  query = query.order(params.sortBy || 'created_at', { ascending: (params.sortOrder || 'desc') === 'asc' });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const totalCount = count ?? 0;
  return {
    data: (data ?? []) as ServiceRequest[],
    count: totalCount,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / params.pageSize)),
  };
}

export async function updateServiceRequestStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('service_requests')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

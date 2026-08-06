import { supabase } from '@/lib/supabase';
import type { Lead, PaginatedResult, PaginationParams } from '@/types';

export async function createLead(params: {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: string;
  interest?: string;
  budget?: number;
  notes?: string;
  assignedTo?: string;
  propertyId?: string;
  inquiryId?: string;
  userId?: string;
}): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert({
      name: params.name,
      email: params.email,
      phone: params.phone,
      source: params.source || 'manual',
      status: params.status || 'new',
      interest: params.interest,
      budget: params.budget,
      notes: params.notes,
      assigned_to: params.assignedTo,
      property_id: params.propertyId,
      inquiry_id: params.inquiryId,
      user_id: params.userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function getLeadsPaginated(params: PaginationParams): Promise<PaginatedResult<Lead>> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase
    .from('leads')
    .select('*, property:properties(id,title,city), assignee:profiles!leads_assigned_to_fkey(id,full_name,email)', { count: 'exact' });

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
  }
  if (params.filters?.status) {
    query = query.eq('status', params.filters.status);
  }
  if (params.filters?.source) {
    query = query.eq('source', params.filters.source);
  }

  query = query.order(params.sortBy || 'created_at', { ascending: (params.sortOrder || 'desc') === 'asc' });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const totalCount = count ?? 0;
  return {
    data: (data ?? []) as Lead[],
    count: totalCount,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / params.pageSize)),
  };
}

export async function updateLeadStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}

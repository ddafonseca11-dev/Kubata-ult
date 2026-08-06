import { supabase } from '@/lib/supabase';
import type { Payment, PaginatedResult, PaginationParams } from '@/types';

export async function createPayment(params: {
  userId: string;
  propertyId?: string;
  amount: number;
  currency?: string;
  paymentType?: string;
  description?: string;
}): Promise<{ payment: Payment | null; error?: string }> {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: params.userId,
      property_id: params.propertyId,
      amount: params.amount,
      currency: params.currency || 'EUR',
      status: 'pending',
      payment_type: params.paymentType || 'listing',
      description: params.description,
    })
    .select()
    .single();

  if (error) return { payment: null, error: error.message };
  return { payment: data as Payment };
}

export async function getMyPayments(userId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, property:properties(id,title,city)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Payment[];
}

export async function getPaymentsPaginated(params: PaginationParams): Promise<PaginatedResult<Payment>> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase
    .from('payments')
    .select('*, property:properties(id,title,city)', { count: 'exact' });

  if (params.search) {
    query = query.or(`description.ilike.%${params.search}%,external_payment_id.ilike.%${params.search}%`);
  }
  if (params.filters?.status) {
    query = query.eq('status', params.filters.status);
  }
  if (params.filters?.payment_type) {
    query = query.eq('payment_type', params.filters.payment_type);
  }

  query = query.order(params.sortBy || 'created_at', { ascending: (params.sortOrder || 'desc') === 'asc' });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const totalCount = count ?? 0;
  return {
    data: (data ?? []) as Payment[],
    count: totalCount,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / params.pageSize)),
  };
}

export async function getPaymentStatus(paymentId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();
  if (error) throw error;
  return data as Payment | null;
}

export async function cancelPayment(paymentId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_payment', { p_payment_id: paymentId });
  if (error) throw error;
}

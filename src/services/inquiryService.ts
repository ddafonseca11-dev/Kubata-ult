import { supabase } from '@/lib/supabase';
import type { Inquiry, PaginatedResult, PaginationParams } from '@/types';

export async function createInquiry(params: {
  propertyId: string;
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  message: string;
  inquiryType?: string;
  captchaToken?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inquiry-submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        property_id: params.propertyId,
        user_id: params.userId,
        name: params.name,
        email: params.email,
        phone: params.phone,
        message: params.message,
        inquiry_type: params.inquiryType || 'info',
        captcha_token: params.captchaToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Erro ao enviar pedido.' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Erro de ligação. Tenta novamente.' };
  }
}

export async function getInquiriesForProperty(propertyId: string): Promise<Inquiry[]> {
  const { data, error } = await supabase
    .from('inquiries')
    .select('*, property:properties(*)')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Inquiry[];
}

export async function getMyInquiries(userId: string): Promise<Inquiry[]> {
  const { data, error } = await supabase
    .from('inquiries')
    .select('*, property:properties(*)')
    .or(`user_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Inquiry[];
}

export async function updateInquiryStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('inquiries')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function getInquiriesPaginated(params: PaginationParams): Promise<PaginatedResult<Inquiry>> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase
    .from('inquiries')
    .select('*, property:properties(id,title,city)', { count: 'exact' });

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%,message.ilike.%${params.search}%`);
  }
  if (params.filters?.status) {
    query = query.eq('status', params.filters.status);
  }
  if (params.filters?.inquiry_type) {
    query = query.eq('inquiry_type', params.filters.inquiry_type);
  }

  query = query.order(params.sortBy || 'created_at', { ascending: (params.sortOrder || 'desc') === 'asc' });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const totalCount = count ?? 0;
  return {
    data: (data ?? []) as Inquiry[],
    count: totalCount,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / params.pageSize)),
  };
}

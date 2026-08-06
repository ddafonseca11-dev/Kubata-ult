import { supabase } from '@/lib/supabase';
import type {
  Profile, Property, Lead, Inquiry, Payment,
  ViewingRequest, ServiceRequest, AuditLog,
  PaginatedResult, PaginationParams,
} from '@/types';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function clampPageSize(size: number): number {
  return Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
}

export async function getProfilesPaginated(params: PaginationParams): Promise<PaginatedResult<Profile>> {
  const pageSize = clampPageSize(params.pageSize);
  const from = (params.page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('profiles')
    .select('id, email, full_name, phone, avatar_url, role, agent_license, agency, created_at', { count: 'exact' });

  if (params.search) {
    query = query.or(`email.ilike.%${params.search}%,full_name.ilike.%${params.search}%`);
  }
  if (params.filters?.role) {
    query = query.eq('role', params.filters.role);
  }

  query = query.order(params.sortBy || 'created_at', { ascending: (params.sortOrder || 'desc') === 'asc' });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const totalCount = count ?? 0;
  return {
    data: (data ?? []) as Profile[],
    count: totalCount,
    page: params.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function getPropertiesPaginated(params: PaginationParams): Promise<PaginatedResult<Property>> {
  const pageSize = clampPageSize(params.pageSize);
  const from = (params.page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('properties')
    .select('id, owner_id, title, price, currency, property_type, transaction_type, status, city, bedrooms, bathrooms, area, is_featured, views_count, created_at', { count: 'exact' });

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,city.ilike.%${params.search}%,address.ilike.%${params.search}%`);
  }
  if (params.filters?.status) {
    query = query.eq('status', params.filters.status);
  }
  if (params.filters?.property_type) {
    query = query.eq('property_type', params.filters.property_type);
  }
  if (params.filters?.transaction_type) {
    query = query.eq('transaction_type', params.filters.transaction_type);
  }

  query = query.order(params.sortBy || 'created_at', { ascending: (params.sortOrder || 'desc') === 'asc' });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const totalCount = count ?? 0;
  return {
    data: (data ?? []) as Property[],
    count: totalCount,
    page: params.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function getLeadsPaginated(params: PaginationParams): Promise<PaginatedResult<Lead>> {
  const pageSize = clampPageSize(params.pageSize);
  const from = (params.page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('leads')
    .select('id, name, email, phone, source, status, interest, budget, created_at, property:properties(id,title), assignee:profiles!leads_assigned_to_fkey(id,full_name)', { count: 'exact' });

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
    data: (data ?? []) as unknown as Lead[],
    count: totalCount,
    page: params.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function getInquiriesPaginated(params: PaginationParams): Promise<PaginatedResult<Inquiry>> {
  const pageSize = clampPageSize(params.pageSize);
  const from = (params.page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('inquiries')
    .select('id, property_id, user_id, name, email, phone, message, inquiry_type, status, created_at, property:properties(id,title)', { count: 'exact' });

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
    data: (data ?? []) as unknown as Inquiry[],
    count: totalCount,
    page: params.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function getPaymentsPaginated(params: PaginationParams): Promise<PaginatedResult<Payment>> {
  const pageSize = clampPageSize(params.pageSize);
  const from = (params.page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('payments')
    .select('id, user_id, property_id, provider, external_payment_id, amount, currency, status, payment_type, description, created_at, property:properties(id,title)', { count: 'exact' });

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
    data: (data ?? []) as unknown as Payment[],
    count: totalCount,
    page: params.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function getViewingRequestsPaginated(params: PaginationParams): Promise<PaginatedResult<ViewingRequest>> {
  const pageSize = clampPageSize(params.pageSize);
  const from = (params.page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('viewing_requests')
    .select('id, property_id, user_id, name, email, phone, preferred_date, preferred_time, status, created_at, property:properties(id,title)', { count: 'exact' });

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
    data: (data ?? []) as unknown as ViewingRequest[],
    count: totalCount,
    page: params.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function getServiceRequestsPaginated(params: PaginationParams): Promise<PaginatedResult<ServiceRequest>> {
  const pageSize = clampPageSize(params.pageSize);
  const from = (params.page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('service_requests')
    .select('id, property_id, user_id, name, email, phone, service_type, description, priority, status, created_at, property:properties(id,title)', { count: 'exact' });

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
    data: (data ?? []) as unknown as ServiceRequest[],
    count: totalCount,
    page: params.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function getAuditLogsPaginated(params: PaginationParams): Promise<PaginatedResult<AuditLog>> {
  const pageSize = clampPageSize(params.pageSize);
  const from = (params.page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('audit_logs')
    .select('id, actor_id, action, entity_type, entity_id, metadata, ip_address, created_at, actor:profiles!audit_logs_actor_id_fkey(id,full_name,email)', { count: 'exact' });

  if (params.search) {
    query = query.or(`action.ilike.%${params.search}%,entity_type.ilike.%${params.search}%`);
  }

  query = query.order(params.sortBy || 'created_at', { ascending: (params.sortOrder || 'desc') === 'asc' });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const totalCount = count ?? 0;
  return {
    data: (data ?? []) as unknown as AuditLog[],
    count: totalCount,
    page: params.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function getDashboardStats(): Promise<{
  totalProperties: number;
  publishedProperties: number;
  pendingProperties: number;
  totalUsers: number;
  totalLeads: number;
  totalInquiries: number;
  totalPayments: number;
  totalRevenue: number;
}> {
  const [properties, profiles, leads, inquiries, payments] = await Promise.all([
    supabase.from('properties').select('status', { count: 'exact', head: false }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('inquiries').select('id', { count: 'exact', head: true }),
    supabase.from('payments').select('amount, status', { count: 'exact', head: false }),
  ]);

  const propertyRows = properties.data ?? [];
  const paymentRows = payments.data ?? [];

  return {
    totalProperties: properties.count ?? 0,
    publishedProperties: propertyRows.filter((p) => p.status === 'published').length,
    pendingProperties: propertyRows.filter((p) => p.status === 'pending').length,
    totalUsers: profiles.count ?? 0,
    totalLeads: leads.count ?? 0,
    totalInquiries: inquiries.count ?? 0,
    totalPayments: payments.count ?? 0,
    totalRevenue: paymentRows
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0),
  };
}

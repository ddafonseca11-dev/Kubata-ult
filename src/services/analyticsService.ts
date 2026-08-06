import { supabase } from '@/lib/supabase';
import type { AnalyticsEvent } from '@/types';

const SESSION_KEY = 'kk_session_id';

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export const AnalyticsEvents = {
  PROPERTY_VIEW: 'PROPERTY_VIEW',
  PROPERTY_FAVORITE: 'PROPERTY_FAVORITE',
  CONTACT: 'CONTACT',
  WHATSAPP_CLICK: 'WHATSAPP_CLICK',
  PHONE_CLICK: 'PHONE_CLICK',
  VIEWING_REQUEST: 'VIEWING_REQUEST',
  MESSAGE_SENT: 'MESSAGE_SENT',
  LEAD_CREATED: 'LEAD_CREATED',
  PAYMENT_STARTED: 'PAYMENT_STARTED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SEARCH: 'SEARCH',
} as const;

export async function trackEvent(
  eventName: string,
  metadata?: {
    propertyId?: string;
    leadId?: string;
    userId?: string;
    [key: string]: unknown;
  }
): Promise<void> {
  try {
    const event: Record<string, unknown> = {
      event_name: eventName,
      session_id: getSessionId(),
      metadata: metadata || {},
    };

    if (metadata?.propertyId) event.property_id = metadata.propertyId;
    if (metadata?.leadId) event.lead_id = metadata.leadId;
    if (metadata?.userId) {
      event.user_id = metadata.userId;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) event.user_id = user.id;
    }

    await supabase.from('analytics_events').insert(event);
  } catch {
    // Analytics must never break the main functionality
  }
}

export async function getAnalyticsSummary(days = 30): Promise<Record<string, number>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('analytics_events')
    .select('event_name')
    .gte('created_at', startDate.toISOString());

  if (error) return {};

  const summary: Record<string, number> = {};
  for (const row of data ?? []) {
    summary[row.event_name] = (summary[row.event_name] || 0) + 1;
  }
  return summary;
}

export async function getAnalyticsEventsPaginated(
  page: number,
  pageSize: number
): Promise<{ data: AnalyticsEvent[]; count: number; totalPages: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const totalCount = count ?? 0;
  return {
    data: (data ?? []) as AnalyticsEvent[],
    count: totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

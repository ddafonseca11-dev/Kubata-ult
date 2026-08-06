import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types';

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as Notification[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.rpc('mark_notification_read', { p_notification_id: id });
  if (error) throw error;
}

export async function markAllNotificationsRead(_userId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_all_notifications_read');
  if (error) throw error;
}

export function subscribeToNotifications(userId: string, callback: () => void) {
  return supabase
    .channel('notifications')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      () => callback()
    )
    .subscribe();
}

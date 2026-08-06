import { supabase } from '@/lib/supabase';
import type { Conversation, Message } from '@/types';

export async function getOrCreateConversation(
  propertyId: string,
  currentUserId: string,
  otherUserId: string
): Promise<Conversation> {
  // Check if conversation exists
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('property_id', propertyId)
    .or(`and(participant_a.eq.${currentUserId},participant_b.eq.${otherUserId}),and(participant_a.eq.${otherUserId},participant_b.eq.${currentUserId})`)
    .maybeSingle();

  if (existing) return existing as Conversation;

  // Create new conversation (ensure consistent ordering)
  const [a, b] = [currentUserId, otherUserId].sort();
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      property_id: propertyId,
      participant_a: a,
      participant_b: b,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Conversation;
}

export async function getConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, property:properties(id,title,city)')
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .order('last_message_at', { ascending: false });
  if (error) throw error;
  return data as Conversation[];
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Message[];
}

export async function sendMessage(conversationId: string, senderId: string, body: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body,
    })
    .select()
    .single();
  if (error) throw error;

  // Update conversation's last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data as Message;
}

export async function markMessagesRead(conversationId: string, _userId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_messages_read', { p_conversation_id: conversationId });
  if (error) throw error;
}

export function subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
  return supabase
    .channel(`messages:${conversationId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => callback(payload.new as Message)
    )
    .subscribe();
}

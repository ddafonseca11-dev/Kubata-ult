import { supabase } from '@/lib/supabase';
import type { Favorite } from '@/types';

export async function toggleFavorite(propertyId: string, userId: string): Promise<{ isFavorite: boolean }> {
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('property_id', propertyId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('favorites').delete().eq('id', existing.id);
    return { isFavorite: false };
  }

  await supabase.from('favorites').insert({ property_id: propertyId, user_id: userId });
  return { isFavorite: true };
}

export async function isFavorite(propertyId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('property_id', propertyId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

export async function getFavoriteIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('favorites')
    .select('property_id')
    .eq('user_id', userId);
  return new Set((data ?? []).map((f) => f.property_id));
}

export async function getFavorites(userId: string): Promise<Favorite[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('*, property:properties(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Favorite[];
}

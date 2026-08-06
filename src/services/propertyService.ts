import { supabase } from '@/lib/supabase';
import type { Property, PropertyImage, PaginatedResult, PaginationParams } from '@/types';

export async function getPublishedProperties(params: PaginationParams): Promise<PaginatedResult<Property>> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase
    .from('properties')
    .select('id, owner_id, title, description, price, currency, property_type, transaction_type, status, bedrooms, bathrooms, area, land_area, address, city, region, country, latitude, longitude, features, is_featured, views_count, created_at, updated_at', { count: 'exact' })
    .eq('status', 'published');

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,city.ilike.%${params.search}%,region.ilike.%${params.search}%,address.ilike.%${params.search}%`);
  }
  if (params.filters?.transaction_type) {
    query = query.eq('transaction_type', params.filters.transaction_type);
  }
  if (params.filters?.property_type) {
    query = query.eq('property_type', params.filters.property_type);
  }
  if (params.filters?.city) {
    query = query.ilike('city', `%${params.filters.city}%`);
  }
  if (params.filters?.min_price) {
    query = query.gte('price', parseFloat(params.filters.min_price));
  }
  if (params.filters?.max_price) {
    query = query.lte('price', parseFloat(params.filters.max_price));
  }
  if (params.filters?.bedrooms) {
    query = query.gte('bedrooms', parseInt(params.filters.bedrooms));
  }

  const sortColumn = params.sortBy || 'created_at';
  const sortOrder = params.sortOrder || 'desc';
  query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / params.pageSize));

  return {
    data: (data ?? []) as Property[],
    count: totalCount,
    page: params.page,
    pageSize: params.pageSize,
    totalPages,
  };
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const property = data as Property;
  const { data: owner } = await supabase
    .from('profiles_public')
    .select('id, full_name, avatar_url, agency, bio')
    .eq('id', property.owner_id)
    .maybeSingle();
  if (owner) {
    property.owner = {
      id: owner.id, email: '', full_name: owner.full_name, phone: null, avatar_url: owner.avatar_url,
      role: 'user', agent_license: null, agency: owner.agency, bio: owner.bio,
      created_at: '', updated_at: ''
    };
  }
  return property;
}

export async function getPropertyImages(propertyId: string): Promise<PropertyImage[]> {
  const { data, error } = await supabase
    .from('property_images')
    .select('*')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as PropertyImage[];
}

export async function getFeaturedProperties(limit = 6): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('id, owner_id, title, description, price, currency, property_type, transaction_type, status, bedrooms, bathrooms, area, land_area, address, city, region, country, latitude, longitude, features, is_featured, views_count, created_at, updated_at')
    .eq('status', 'published')
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Property[];
}

export async function getMyProperties(userId: string): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Property[];
}

export async function createProperty(property: Partial<Property>): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .insert(property)
    .select()
    .single();
  if (error) throw error;
  return data as Property;
}

export async function updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Property;
}

export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) throw error;
}

export async function incrementPropertyViews(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_property_views', { property_id: id });
  if (error) {
    // Fallback: direct update
    await supabase.rpc('increment_views_fallback', { p_id: id }).then(() => {});
  }
}

export async function getCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('city')
    .eq('status', 'published')
    .not('city', 'is', null);
  if (error) throw error;
  const cities = (data ?? []).map((d) => d.city).filter(Boolean) as string[];
  return [...new Set(cities)].sort();
}

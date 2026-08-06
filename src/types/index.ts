export type UserRole = 'user' | 'agent' | 'admin';

export type PropertyStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'sold' | 'rented';
export type PropertyType = 'apartment' | 'house' | 'villa' | 'land' | 'commercial' | 'office' | 'studio' | 'duplex' | 'other';
export type TransactionType = 'sale' | 'rent';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
export type PaymentType = 'listing' | 'featured' | 'subscription' | 'service' | 'other';

export type InquiryStatus = 'new' | 'read' | 'responded' | 'archived';
export type InquiryType = 'info' | 'visit' | 'offer' | 'custom';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost';
export type LeadSource = 'inquiry' | 'manual' | 'import' | 'viewing' | 'message';

export type ViewingRequestStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type ServiceRequestStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type ServiceType = 'maintenance' | 'repair' | 'cleaning' | 'inspection' | 'other';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  agent_license: string | null;
  agency: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  property_type: PropertyType;
  transaction_type: TransactionType;
  status: PropertyStatus;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  land_area: number | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  features: Record<string, unknown>;
  is_featured: boolean;
  views_count: number;
  created_at: string;
  updated_at: string;
  owner?: Profile;
  images?: PropertyImage[];
  favorite_count?: number;
}

export interface PropertyImage {
  id: string;
  property_id: string;
  url: string;
  storage_path: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface Inquiry {
  id: string;
  property_id: string | null;
  user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string;
  inquiry_type: InquiryType;
  status: InquiryStatus;
  ip_address: string | null;
  user_agent: string | null;
  captcha_verified: boolean;
  created_at: string;
  property?: Property;
}

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  status: LeadStatus;
  interest: string | null;
  budget: number | null;
  notes: string | null;
  assigned_to: string | null;
  property_id: string | null;
  inquiry_id: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  property?: Property;
  assignee?: Profile;
}

export interface Favorite {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
  property?: Property;
}

export interface ViewingRequest {
  id: string;
  property_id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  message: string | null;
  status: ViewingRequestStatus;
  created_at: string;
  property?: Property;
}

export interface ServiceRequest {
  id: string;
  property_id: string | null;
  user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  service_type: ServiceType;
  description: string;
  priority: Priority;
  status: ServiceRequestStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  property?: Property;
  assignee?: Profile;
}

export interface Conversation {
  id: string;
  property_id: string | null;
  participant_a: string;
  participant_b: string;
  last_message_at: string;
  created_at: string;
  property?: Property;
  other_participant?: Profile;
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  property_id: string | null;
  provider: string;
  external_payment_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_type: PaymentType;
  description: string | null;
  metadata: Record<string, unknown>;
  checkout_url: string | null;
  created_at: string;
  updated_at: string;
  property?: Property;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  actor?: Profile;
}

export interface AnalyticsEvent {
  id: string;
  event_name: string;
  user_id: string | null;
  session_id: string | null;
  property_id: string | null;
  lead_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
  filters?: Record<string, string>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

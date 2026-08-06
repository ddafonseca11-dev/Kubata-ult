/*
# Kubata Kié — Core Schema

## Overview
Creates the foundational tables for the Kubata Kié real estate platform:
user profiles, properties, property images, inquiries, leads, favorites,
viewing requests, service requests, conversations, messages, and notifications.

## New Tables
1. profiles — extends auth.users with role, full_name, phone, avatar_url
2. properties — real estate listings with full details and status workflow
3. property_images — images for properties (url, storage_path, sort_order, is_primary)
4. inquiries — contact requests from visitors/users about properties
5. leads — CRM leads derived from inquiries or manual entry
6. favorites — user bookmarked properties
7. viewing_requests — scheduled property visit requests
8. service_requests — maintenance or service requests
9. conversations — chat threads between users about properties
10. messages — individual chat messages
11. notifications — in-app notifications

## Security
- RLS enabled on all tables
- Public read for published properties and their images
- Owner-scoped CRUD for user-owned data
- Agent/admin elevated access for management tables
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  phone text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','agent','admin')),
  agent_license text,
  agency text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- ============ PROPERTIES ============
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price numeric(14,2),
  currency text DEFAULT 'EUR',
  property_type text NOT NULL DEFAULT 'apartment' CHECK (property_type IN ('apartment','house','villa','land','commercial','office','studio','duplex','other')),
  transaction_type text NOT NULL DEFAULT 'sale' CHECK (transaction_type IN ('sale','rent')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','published','rejected','sold','rented')),
  bedrooms int,
  bathrooms int,
  area numeric(10,2),
  land_area numeric(10,2),
  address text,
  city text,
  region text,
  country text DEFAULT 'Portugal',
  latitude numeric(10,7),
  longitude numeric(10,7),
  features jsonb DEFAULT '{}'::jsonb,
  is_featured boolean DEFAULT false,
  views_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "properties_select_published" ON properties;
CREATE POLICY "properties_select_published" ON properties FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    OR auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))
  );

DROP POLICY IF EXISTS "properties_insert_own" ON properties;
CREATE POLICY "properties_insert_own" ON properties FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))
  );

DROP POLICY IF EXISTS "properties_update_own" ON properties;
CREATE POLICY "properties_update_own" ON properties FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))
  );

DROP POLICY IF EXISTS "properties_delete_own" ON properties;
CREATE POLICY "properties_delete_own" ON properties FOR DELETE
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ============ PROPERTY_IMAGES ============
CREATE TABLE IF NOT EXISTS property_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text,
  sort_order int DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_images_select_public" ON property_images;
CREATE POLICY "property_images_select_public" ON property_images FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM properties WHERE properties.id = property_images.property_id AND properties.status = 'published')
    OR EXISTS (SELECT 1 FROM properties WHERE properties.id = property_images.property_id AND properties.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))
  );

DROP POLICY IF EXISTS "property_images_insert_own" ON property_images;
CREATE POLICY "property_images_insert_own" ON property_images FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM properties WHERE properties.id = property_images.property_id AND (properties.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))))
  );

DROP POLICY IF EXISTS "property_images_update_own" ON property_images;
CREATE POLICY "property_images_update_own" ON property_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM properties WHERE properties.id = property_images.property_id AND (properties.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM properties WHERE properties.id = property_images.property_id AND (properties.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))))
  );

DROP POLICY IF EXISTS "property_images_delete_own" ON property_images;
CREATE POLICY "property_images_delete_own" ON property_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM properties WHERE properties.id = property_images.property_id AND (properties.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))))
  );

-- ============ INQUIRIES ============
CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text,
  email text,
  phone text,
  message text NOT NULL,
  inquiry_type text DEFAULT 'info' CHECK (inquiry_type IN ('info','visit','offer','custom')),
  status text DEFAULT 'new' CHECK (status IN ('new','read','responded','archived')),
  ip_address text,
  user_agent text,
  captcha_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inquiries_insert_public" ON inquiries;
CREATE POLICY "inquiries_insert_public" ON inquiries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "inquiries_select_own" ON inquiries;
CREATE POLICY "inquiries_select_own" ON inquiries FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (property_id IS NOT NULL AND EXISTS (SELECT 1 FROM properties WHERE properties.id = inquiries.property_id AND properties.owner_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))
  );

DROP POLICY IF EXISTS "inquiries_update_own" ON inquiries;
CREATE POLICY "inquiries_update_own" ON inquiries FOR UPDATE
  TO authenticated
  USING (
    (property_id IS NOT NULL AND EXISTS (SELECT 1 FROM properties WHERE properties.id = inquiries.property_id AND properties.owner_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))
  )
  WITH CHECK (
    (property_id IS NOT NULL AND EXISTS (SELECT 1 FROM properties WHERE properties.id = inquiries.property_id AND properties.owner_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))
  );

DROP POLICY IF EXISTS "inquiries_delete_admin" ON inquiries;
CREATE POLICY "inquiries_delete_admin" ON inquiries FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ============ LEADS ============
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  source text DEFAULT 'inquiry' CHECK (source IN ('inquiry','manual','import','viewing','message')),
  status text DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','unqualified','converted','lost')),
  interest text,
  budget numeric(14,2),
  notes text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  inquiry_id uuid REFERENCES inquiries(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_select_agent" ON leads;
CREATE POLICY "leads_select_agent" ON leads FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin')));

DROP POLICY IF EXISTS "leads_insert_agent" ON leads;
CREATE POLICY "leads_insert_agent" ON leads FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))
  );

DROP POLICY IF EXISTS "leads_update_agent" ON leads;
CREATE POLICY "leads_update_agent" ON leads FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin')));

DROP POLICY IF EXISTS "leads_delete_admin" ON leads;
CREATE POLICY "leads_delete_admin" ON leads FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ============ FAVORITES ============
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, property_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON favorites;
CREATE POLICY "favorites_select_own" ON favorites FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_insert_own" ON favorites;
CREATE POLICY "favorites_insert_own" ON favorites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_delete_own" ON favorites;
CREATE POLICY "favorites_delete_own" ON favorites FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ VIEWING_REQUESTS ============
CREATE TABLE IF NOT EXISTS viewing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text,
  email text,
  phone text,
  preferred_date date,
  preferred_time text,
  message text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE viewing_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "viewing_requests_insert_public" ON viewing_requests;
CREATE POLICY "viewing_requests_insert_public" ON viewing_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "viewing_requests_select_own" ON viewing_requests;
CREATE POLICY "viewing_requests_select_own" ON viewing_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM properties WHERE properties.id = viewing_requests.property_id AND properties.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))
  );

DROP POLICY IF EXISTS "viewing_requests_update_own" ON viewing_requests;
CREATE POLICY "viewing_requests_update_own" ON viewing_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM properties WHERE properties.id = viewing_requests.property_id AND properties.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))
    OR auth.uid() = user_id
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM properties WHERE properties.id = viewing_requests.property_id AND properties.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))
    OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "viewing_requests_delete_admin" ON viewing_requests;
CREATE POLICY "viewing_requests_delete_admin" ON viewing_requests FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ============ SERVICE_REQUESTS ============
CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text,
  email text,
  phone text,
  service_type text NOT NULL DEFAULT 'maintenance' CHECK (service_type IN ('maintenance','repair','cleaning','inspection','other')),
  description text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending','assigned','in_progress','completed','cancelled')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_requests_insert_public" ON service_requests;
CREATE POLICY "service_requests_insert_public" ON service_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "service_requests_select_own" ON service_requests;
CREATE POLICY "service_requests_select_own" ON service_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (property_id IS NOT NULL AND EXISTS (SELECT 1 FROM properties WHERE properties.id = service_requests.property_id AND properties.owner_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin'))
  );

DROP POLICY IF EXISTS "service_requests_update_agent" ON service_requests;
CREATE POLICY "service_requests_update_agent" ON service_requests FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('agent','admin')));

DROP POLICY IF EXISTS "service_requests_delete_admin" ON service_requests;
CREATE POLICY "service_requests_delete_admin" ON service_requests FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ============ CONVERSATIONS ============
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  participant_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (property_id, participant_a, participant_b)
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_participant" ON conversations;
CREATE POLICY "conversations_select_participant" ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = participant_a OR auth.uid() = participant_b);

DROP POLICY IF EXISTS "conversations_insert_participant" ON conversations;
CREATE POLICY "conversations_insert_participant" ON conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);

DROP POLICY IF EXISTS "conversations_update_participant" ON conversations;
CREATE POLICY "conversations_update_participant" ON conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = participant_a OR auth.uid() = participant_b)
  WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);

-- ============ MESSAGES ============
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_participant" ON messages;
CREATE POLICY "messages_select_participant" ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant_a = auth.uid() OR conversations.participant_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant_a = auth.uid() OR conversations.participant_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_update_participant" ON messages;
CREATE POLICY "messages_update_participant" ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant_a = auth.uid() OR conversations.participant_b = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant_a = auth.uid() OR conversations.participant_b = auth.uid())
    )
  );

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_transaction_type ON properties(transaction_type);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);

CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);

CREATE INDEX IF NOT EXISTS idx_inquiries_property_id ON inquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_user_id ON inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property_id ON favorites(property_id);

CREATE INDEX IF NOT EXISTS idx_viewing_requests_property_id ON viewing_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_status ON viewing_requests(status);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_created_at ON viewing_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_participant_a ON conversations(participant_a);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_b ON conversations(participant_b);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_properties_updated_at ON properties;
CREATE TRIGGER trigger_properties_updated_at BEFORE UPDATE ON properties
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_leads_updated_at ON leads;
CREATE TRIGGER trigger_leads_updated_at BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_service_requests_updated_at ON service_requests;
CREATE TRIGGER trigger_service_requests_updated_at BEFORE UPDATE ON service_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

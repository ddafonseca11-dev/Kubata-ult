/*
# Kubata Kié — Analytics Events

## Overview
Creates the analytics_events table for tracking user behavior events
across the platform (property views, favorites, contacts, payments, etc.)

## New Tables
1. analytics_events — centralized event tracking
   - event_name: the type of event (PROPERTY_VIEW, CONTACT, etc.)
   - user_id: nullable, the authenticated user if available
   - session_id: nullable, browser session identifier
   - property_id: nullable, related property if applicable
   - lead_id: nullable, related lead if applicable
   - metadata: jsonb for additional event-specific data
   - created_at: event timestamp

## Security
- RLS enabled
- Users can insert events (for their own tracking)
- Users can read their own events
- Admins can read all events
- No updates or deletes from the frontend (events are immutable)
*/

CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert analytics events
DROP POLICY IF EXISTS "analytics_insert_any" ON analytics_events;
CREATE POLICY "analytics_insert_any" ON analytics_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Users can read their own events; admins can read all
DROP POLICY IF EXISTS "analytics_select_own" ON analytics_events;
CREATE POLICY "analytics_select_own" ON analytics_events FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_property_id ON analytics_events(property_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);

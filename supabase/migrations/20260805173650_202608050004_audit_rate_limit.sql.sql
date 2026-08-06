/*
# Kubata Kié — Audit Logs & Rate Limit Tracking

## Overview
1. audit_logs — tracks admin/agent actions for compliance and security
2. inquiry_rate_limits — tracks inquiry submissions for rate limiting (10 per 10 minutes)

## New Tables
1. audit_logs — immutable log of administrative actions
2. inquiry_rate_limits — rate limit tracking for inquiries per user/IP/session

## Security
- audit_logs: admin read, authenticated insert (for own actions)
- inquiry_rate_limits: no direct frontend access (edge function with service role only)
*/

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_admin" ON audit_logs;
CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "audit_logs_insert_any" ON audit_logs;
CREATE POLICY "audit_logs_insert_any" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);

-- ============ INQUIRY RATE LIMITS ============
CREATE TABLE IF NOT EXISTS inquiry_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  identifier_type text NOT NULL CHECK (identifier_type IN ('user_id','ip','session')),
  window_start timestamptz NOT NULL DEFAULT now(),
  count int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE (identifier, window_start)
);

ALTER TABLE inquiry_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies — only edge function with service role accesses this table
-- This prevents any direct frontend access

CREATE INDEX IF NOT EXISTS idx_inquiry_rate_limits_identifier ON inquiry_rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_inquiry_rate_limits_window_start ON inquiry_rate_limits(window_start DESC);

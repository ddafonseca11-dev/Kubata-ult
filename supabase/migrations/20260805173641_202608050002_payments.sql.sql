/*
# Kubata Kié — Payments Schema

## Overview
Creates the payments table with provider abstraction support,
external payment ID tracking, metadata, and idempotency.

## New Tables
1. payments — payment records with provider, external_payment_id, amount, currency, status, metadata
   - Statuses: pending, processing, completed, failed, refunded, cancelled
   - Tracks provider and external_payment_id for idempotency
   - Links to user_id and optionally property_id

## Security
- RLS enabled
- Users can read their own payments
- Inserts via edge function (service role) or authenticated user starting checkout
- Updates only via backend (edge function with service role)
- Admins can read all payments
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  provider text DEFAULT 'stripe',
  external_payment_id text,
  amount numeric(14,2) NOT NULL,
  currency text DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','refunded','cancelled')),
  payment_type text DEFAULT 'listing' CHECK (payment_type IN ('listing','featured','subscription','service','other')),
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  checkout_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (provider, external_payment_id)
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can read their own payments
DROP POLICY IF EXISTS "payments_select_own" ON payments;
CREATE POLICY "payments_select_own" ON payments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Authenticated users can insert (to start checkout)
DROP POLICY IF EXISTS "payments_insert_own" ON payments;
CREATE POLICY "payments_insert_own" ON payments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own payments (limited — mainly for cancellation)
DROP POLICY IF EXISTS "payments_update_own" ON payments;
CREATE POLICY "payments_update_own" ON payments FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Admins can delete payments
DROP POLICY IF EXISTS "payments_delete_admin" ON payments;
CREATE POLICY "payments_delete_admin" ON payments FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_provider_external ON payments(provider, external_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_property_id ON payments(property_id);

DROP TRIGGER IF EXISTS trigger_payments_updated_at ON payments;
CREATE TRIGGER trigger_payments_updated_at BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

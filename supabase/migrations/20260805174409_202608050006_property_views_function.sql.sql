/*
# Kubata Kié — Property Views Increment Function

## Overview
Creates a SECURITY DEFINER function to safely increment property view counts.
This allows public (anonymous) users to trigger view increments without
exposing the properties table to arbitrary updates.

## Security
- SECURITY DEFINER — runs with elevated privileges
- Only increments views_count, cannot modify other fields
- Called from the frontend via supabase.rpc()
*/

CREATE OR REPLACE FUNCTION increment_property_views(property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE properties SET views_count = views_count + 1 WHERE id = property_id;
END;
$$;

-- Also create a fallback function name
CREATE OR REPLACE FUNCTION increment_views_fallback(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE properties SET views_count = views_count + 1 WHERE id = p_id;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION increment_property_views(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_views_fallback(uuid) TO anon, authenticated;

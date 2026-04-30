-- Fix RLS policies for events table
-- Run this in your Supabase SQL Editor

-- Drop ALL existing policies on events (clean slate)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'events' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON events', pol.policyname);
  END LOOP;
END $$;

-- Recreate clean policies
CREATE POLICY "events_select_public"
  ON events FOR SELECT
  USING (true);

CREATE POLICY "events_insert_authenticated"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "events_update_authenticated"
  ON events FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "events_delete_authenticated"
  ON events FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

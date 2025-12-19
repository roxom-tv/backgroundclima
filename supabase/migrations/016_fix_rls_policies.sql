-- Migration: Fix RLS Policies
-- This ensures authenticated users can perform all CRUD operations

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Allow public read access on slides" ON slides;
DROP POLICY IF EXISTS "Allow authenticated full access on slides" ON slides;
DROP POLICY IF EXISTS "Allow public read access on settings" ON settings;
DROP POLICY IF EXISTS "Allow authenticated full access on settings" ON settings;
DROP POLICY IF EXISTS "Allow public read access on sponsors" ON sponsors;
DROP POLICY IF EXISTS "Allow authenticated full access on sponsors" ON sponsors;
DROP POLICY IF EXISTS "Allow public read access on events" ON events;
DROP POLICY IF EXISTS "Allow authenticated full access on events" ON events;

-- Step 2: Ensure RLS is enabled
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies for slides table
CREATE POLICY "Allow public read access on slides" ON slides FOR SELECT USING (true);
CREATE POLICY "Allow authenticated select on slides" ON slides FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated insert on slides" ON slides FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update on slides" ON slides FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated delete on slides" ON slides FOR DELETE USING (auth.uid() IS NOT NULL);

-- Step 4: Create policies for settings table
CREATE POLICY "Allow public read access on settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Allow authenticated select on settings" ON settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated insert on settings" ON settings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update on settings" ON settings FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated delete on settings" ON settings FOR DELETE USING (auth.uid() IS NOT NULL);

-- Step 5: Create policies for sponsors table
CREATE POLICY "Allow public read access on sponsors" ON sponsors FOR SELECT USING (true);
CREATE POLICY "Allow authenticated select on sponsors" ON sponsors FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated insert on sponsors" ON sponsors FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update on sponsors" ON sponsors FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated delete on sponsors" ON sponsors FOR DELETE USING (auth.uid() IS NOT NULL);

-- Step 6: Create policies for events table
CREATE POLICY "Allow public read access on events" ON events FOR SELECT USING (true);
CREATE POLICY "Allow authenticated select on events" ON events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated insert on events" ON events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update on events" ON events FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated delete on events" ON events FOR DELETE USING (auth.uid() IS NOT NULL);

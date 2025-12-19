-- PART 1: Drop existing policies
DROP POLICY IF EXISTS "Allow public read access on slides" ON slides;
DROP POLICY IF EXISTS "Allow authenticated full access on slides" ON slides;
DROP POLICY IF EXISTS "Allow public read access on settings" ON settings;
DROP POLICY IF EXISTS "Allow authenticated full access on settings" ON settings;
DROP POLICY IF EXISTS "Allow public read access on sponsors" ON sponsors;
DROP POLICY IF EXISTS "Allow authenticated full access on sponsors" ON sponsors;
DROP POLICY IF EXISTS "Allow public read access on events" ON events;
DROP POLICY IF EXISTS "Allow authenticated full access on events" ON events;

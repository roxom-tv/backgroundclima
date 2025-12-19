-- PART 6: Create policies for events table
CREATE POLICY "Allow public read access on events" ON events FOR SELECT USING (true);
CREATE POLICY "Allow authenticated select on events" ON events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated insert on events" ON events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update on events" ON events FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated delete on events" ON events FOR DELETE USING (auth.uid() IS NOT NULL);

-- PART 4: Create policies for settings table
CREATE POLICY "Allow public read access on settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Allow authenticated select on settings" ON settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated insert on settings" ON settings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update on settings" ON settings FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated delete on settings" ON settings FOR DELETE USING (auth.uid() IS NOT NULL);

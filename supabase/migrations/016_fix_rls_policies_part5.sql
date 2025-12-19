-- PART 5: Create policies for sponsors table
CREATE POLICY "Allow public read access on sponsors" ON sponsors FOR SELECT USING (true);
CREATE POLICY "Allow authenticated select on sponsors" ON sponsors FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated insert on sponsors" ON sponsors FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update on sponsors" ON sponsors FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated delete on sponsors" ON sponsors FOR DELETE USING (auth.uid() IS NOT NULL);

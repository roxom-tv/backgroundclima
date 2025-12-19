-- PART 3: Create policies for slides table
CREATE POLICY "Allow public read access on slides" ON slides FOR SELECT USING (true);
CREATE POLICY "Allow authenticated select on slides" ON slides FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated insert on slides" ON slides FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated update on slides" ON slides FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated delete on slides" ON slides FOR DELETE USING (auth.uid() IS NOT NULL);

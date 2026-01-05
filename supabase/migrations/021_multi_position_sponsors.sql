-- Migration: Multi-position sponsors
-- Allows assigning different sponsors to each corner of a slide

-- Add 4 new columns for corner-based sponsor positioning
ALTER TABLE slides
  ADD COLUMN IF NOT EXISTS sponsor_top_left UUID REFERENCES sponsors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sponsor_top_right UUID REFERENCES sponsors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sponsor_bottom_left UUID REFERENCES sponsors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sponsor_bottom_right UUID REFERENCES sponsors(id) ON DELETE SET NULL;

-- Migrate existing sponsor_id data to bottom_right (existing default position)
UPDATE slides 
SET sponsor_bottom_right = sponsor_id 
WHERE sponsor_id IS NOT NULL AND sponsor_bottom_right IS NULL;

-- Create indexes for sponsor lookups
CREATE INDEX IF NOT EXISTS idx_slides_sponsor_top_left ON slides(sponsor_top_left);
CREATE INDEX IF NOT EXISTS idx_slides_sponsor_top_right ON slides(sponsor_top_right);
CREATE INDEX IF NOT EXISTS idx_slides_sponsor_bottom_left ON slides(sponsor_bottom_left);
CREATE INDEX IF NOT EXISTS idx_slides_sponsor_bottom_right ON slides(sponsor_bottom_right);

-- Add comments
COMMENT ON COLUMN slides.sponsor_top_left IS 'Sponsor to display in top-left corner';
COMMENT ON COLUMN slides.sponsor_top_right IS 'Sponsor to display in top-right corner';
COMMENT ON COLUMN slides.sponsor_bottom_left IS 'Sponsor to display in bottom-left corner';
COMMENT ON COLUMN slides.sponsor_bottom_right IS 'Sponsor to display in bottom-right corner';

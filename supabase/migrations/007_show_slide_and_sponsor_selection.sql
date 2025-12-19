-- Migration: Add 'show' slide type and sponsor selection per slide

-- Add 'show' to the slide_type enum
ALTER TYPE slide_type ADD VALUE IF NOT EXISTS 'show';

-- Add sponsor_id column to slides for sponsor selection per slide
ALTER TABLE slides ADD COLUMN IF NOT EXISTS sponsor_id UUID REFERENCES sponsors(id) ON DELETE SET NULL;

-- Add schedule field for show slides (text to display schedule like "Mon-Fri 8PM")
ALTER TABLE slides ADD COLUMN IF NOT EXISTS schedule TEXT;

-- Index for sponsor lookup
CREATE INDEX IF NOT EXISTS idx_slides_sponsor ON slides(sponsor_id);

COMMENT ON COLUMN slides.sponsor_id IS 'Optional specific sponsor to show on this slide';
COMMENT ON COLUMN slides.schedule IS 'Schedule text for show slides (e.g., "Mon-Fri 8PM EST")';



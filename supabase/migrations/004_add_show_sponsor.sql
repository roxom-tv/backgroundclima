-- Migration: Add show_sponsor column to slides table
-- This allows per-slide control of sponsor display

ALTER TABLE slides 
ADD COLUMN show_sponsor BOOLEAN DEFAULT true;

-- Update existing slides to show sponsor by default
UPDATE slides SET show_sponsor = true WHERE show_sponsor IS NULL;

-- Make column NOT NULL after setting defaults
ALTER TABLE slides 
ALTER COLUMN show_sponsor SET NOT NULL;

COMMENT ON COLUMN slides.show_sponsor IS 'Whether to show sponsor logo on this slide';



-- Migration: Add location field to events and event_slide_style to slides
-- Run this SQL in your Supabase SQL Editor

-- Add location field to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add event_slide_style and event_slide_title to slides table
ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS event_slide_style TEXT DEFAULT 'classic',
ADD COLUMN IF NOT EXISTS event_slide_title TEXT;

-- Add comment for documentation
COMMENT ON COLUMN events.location IS 'Location or source for the event (e.g., ARGENTINA, ROXOM TV)';
COMMENT ON COLUMN slides.event_slide_style IS 'Style for event slides: classic or modern';
COMMENT ON COLUMN slides.event_slide_title IS 'Custom title for modern event slides (e.g., Bitcoin Calendar)';

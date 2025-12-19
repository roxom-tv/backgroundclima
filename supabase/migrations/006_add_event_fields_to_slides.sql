-- Migration: Add event fields to slides table
-- This allows slides of type 'event' to have full event details

-- Add event-specific columns to slides
ALTER TABLE slides ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE slides ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE slides ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE slides ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE slides ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE slides ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE slides ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6';

-- Update the slide_type enum to include 'event' instead of 'calendar'
-- First, we need to add 'event' to the enum
ALTER TYPE slide_type ADD VALUE IF NOT EXISTS 'event';

-- Update existing calendar slides to event type
UPDATE slides SET type = 'event' WHERE type = 'calendar';

COMMENT ON COLUMN slides.description IS 'Event description (for event type slides)';
COMMENT ON COLUMN slides.image_url IS 'Event image URL (for event type slides)';
COMMENT ON COLUMN slides.start_date IS 'Event start date (for event type slides)';
COMMENT ON COLUMN slides.end_date IS 'Event end date (for event type slides)';
COMMENT ON COLUMN slides.color IS 'Event color for display (for event type slides)';



-- =============================================
-- Add Metals and FX System Slides
-- These are hardcoded slides - only is_active, show_sponsor, and duration can be edited
-- =============================================

-- First, add the new enum values if they don't exist
DO $$ 
BEGIN
    -- Add 'metals' to slide_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'metals' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'slide_type')) THEN
        ALTER TYPE slide_type ADD VALUE 'metals';
    END IF;
    
    -- Add 'fx' to slide_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'fx' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'slide_type')) THEN
        ALTER TYPE slide_type ADD VALUE 'fx';
    END IF;
END $$;

-- Insert the system slides (only if they don't already exist)
INSERT INTO slides (type, name, youtube_url, weather_query, timezone, duration_seconds, order_index, is_active, show_weather, show_sponsor)
SELECT 'metals', 'Precious Metals', NULL, NULL, NULL, 30, 
       (SELECT COALESCE(MAX(order_index), 0) + 1 FROM slides), 
       true, false, false
WHERE NOT EXISTS (SELECT 1 FROM slides WHERE type = 'metals');

INSERT INTO slides (type, name, youtube_url, weather_query, timezone, duration_seconds, order_index, is_active, show_weather, show_sponsor)
SELECT 'fx', 'Foreign Exchange', NULL, NULL, NULL, 30, 
       (SELECT COALESCE(MAX(order_index), 0) + 1 FROM slides), 
       true, false, false
WHERE NOT EXISTS (SELECT 1 FROM slides WHERE type = 'fx');

-- Add comments
COMMENT ON COLUMN slides.type IS 'Slide type: youtube, debt, metals, fx, show, event, calendar, custom';



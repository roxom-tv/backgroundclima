-- Add missing columns to slides table
-- This fixes errors like "Could not find the 'column_name' column of 'slides' in the schema cache"

-- Add news slide fields (if migration 014 wasn't run)
ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS headline TEXT DEFAULT NULL;

ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT NULL;

-- Add video slide fields (if migration 015 wasn't run)
ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL;

ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS loop_count INTEGER DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN slides.headline IS 'News headline/title for news slides';
COMMENT ON COLUMN slides.source IS 'News source/publication name for news slides';
COMMENT ON COLUMN slides.video_url IS 'Video URL for video slides (1920x1080 recommended)';
COMMENT ON COLUMN slides.loop_count IS 'Number of times to loop video (NULL = infinite, 1 = play once, etc.)';

-- Ensure enum values exist
DO $$
BEGIN
    -- Add 'news' to slide_type enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'news' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'slide_type')
    ) THEN
        ALTER TYPE slide_type ADD VALUE 'news';
    END IF;
    
    -- Add 'video' to slide_type enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'video' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'slide_type')
    ) THEN
        ALTER TYPE slide_type ADD VALUE 'video';
    END IF;
END $$;

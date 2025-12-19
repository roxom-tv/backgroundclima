-- =============================================
-- Change 'custom' to 'news' slide type and add news fields
-- =============================================

-- Step 1: Add 'news' to the slide_type enum
-- This must be done in a separate transaction before using the value
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
END $$;

-- Step 2: Update existing 'custom' slides to 'news'
-- This must be run in a separate transaction after adding the enum value
UPDATE slides 
SET type = 'news'::slide_type
WHERE type = 'custom'::slide_type;

-- Step 3: Add news-specific fields
ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS headline TEXT DEFAULT NULL;

ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN slides.headline IS 'News headline/title for news slides';
COMMENT ON COLUMN slides.source IS 'News source/publication name for news slides';


-- =============================================
-- Add 'video' slide type and video fields
-- =============================================

-- Step 1: Add 'video' to the slide_type enum
DO $$
BEGIN
    -- Add 'video' to slide_type enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'video' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'slide_type')
    ) THEN
        ALTER TYPE slide_type ADD VALUE 'video';
    END IF;
END $$;

-- Step 2: Add video-specific fields
ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL;

ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS loop_count INTEGER DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN slides.video_url IS 'Video URL for video slides (1920x1080 recommended)';
COMMENT ON COLUMN slides.loop_count IS 'Number of times to loop video (NULL = infinite, 1 = play once, etc.)';

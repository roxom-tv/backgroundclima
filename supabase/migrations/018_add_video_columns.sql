-- Add video_url and loop_count columns to slides table if they don't exist
-- This fixes the error: "Could not find the 'loop_count' column of 'slides' in the schema cache"

-- Add video_url column
ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL;

-- Add loop_count column
ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS loop_count INTEGER DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN slides.video_url IS 'Video URL for video slides (1920x1080 recommended)';
COMMENT ON COLUMN slides.loop_count IS 'Number of times to loop video (NULL = infinite, 1 = play once, etc.)';

-- Also ensure 'video' is in the slide_type enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'video' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'slide_type')
    ) THEN
        ALTER TYPE slide_type ADD VALUE 'video';
    END IF;
END $$;

-- =============================================
-- Event Slide Multi-Select
-- Allows selecting multiple events (1-4) from the events table
-- to display in a single slide with different layouts
-- =============================================

-- Add selected_event_ids column (array of UUIDs)
ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS selected_event_ids UUID[] DEFAULT NULL;

-- Add layout_orientation column for 3-event layouts
-- 'horizontal' = 3 columns side by side
-- 'vertical' = 3 rows stacked
ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS layout_orientation TEXT DEFAULT 'horizontal';

-- Add comments
COMMENT ON COLUMN slides.selected_event_ids IS 'Array of event IDs to display (1-4 events). Layout auto-adjusts: 1=fullscreen, 2=split, 3=thirds, 4=quadrants';
COMMENT ON COLUMN slides.layout_orientation IS 'Layout orientation for 3-event display: horizontal (columns) or vertical (rows)';

-- Add constraint to limit orientation values
ALTER TABLE slides
ADD CONSTRAINT layout_orientation_check 
CHECK (layout_orientation IS NULL OR layout_orientation IN ('horizontal', 'vertical'));



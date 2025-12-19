-- =============================================
-- Event Style Customization Options
-- Allows customizing text styles for events
-- =============================================

-- Add title font family
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS title_font TEXT DEFAULT 'Inter';

-- Add title size (small, medium, large, xlarge)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS title_size TEXT DEFAULT 'large';

-- Add title color (hex)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS title_color TEXT DEFAULT '#FFFFFF';

-- Add text/description color (hex)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#F3F4F6';

-- Add overlay opacity (0-90)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS overlay_opacity INTEGER DEFAULT 50;

-- Add show date badge toggle
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS show_date_badge BOOLEAN DEFAULT true;

-- Add comments
COMMENT ON COLUMN events.title_font IS 'Font family for event title (e.g., Inter, Arial, Georgia)';
COMMENT ON COLUMN events.title_size IS 'Title size: small, medium, large, xlarge';
COMMENT ON COLUMN events.title_color IS 'Title text color in hex (e.g., #FFFFFF)';
COMMENT ON COLUMN events.text_color IS 'Description text color in hex (e.g., #F3F4F6)';
COMMENT ON COLUMN events.overlay_opacity IS 'Background overlay darkness (0-90%)';
COMMENT ON COLUMN events.show_date_badge IS 'Whether to show the date badge on the event';

-- Add constraint for title_size values
ALTER TABLE events
ADD CONSTRAINT title_size_check 
CHECK (title_size IS NULL OR title_size IN ('small', 'medium', 'large', 'xlarge'));

-- Add constraint for overlay_opacity range
ALTER TABLE events
ADD CONSTRAINT overlay_opacity_check 
CHECK (overlay_opacity IS NULL OR (overlay_opacity >= 0 AND overlay_opacity <= 90));



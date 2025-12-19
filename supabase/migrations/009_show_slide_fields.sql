-- =============================================
-- Add Show Slide Fields
-- Fields for show slides with host info and schedule times
-- =============================================

-- Add host_name column
ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS host_name TEXT DEFAULT NULL;

-- Add show_days column (e.g., "Monday to Friday")
ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS show_days TEXT DEFAULT NULL;

-- Add schedule_times column as JSONB for timezone-specific times
-- Example: [{"timezone": "New York", "time": "11:00 am"}, {"timezone": "London", "time": "4:00 pm"}]
ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS schedule_times JSONB DEFAULT NULL;

-- Remove old schedule column if it exists (migrating to schedule_times)
-- Note: Only uncomment if you want to remove the old column
-- ALTER TABLE slides DROP COLUMN IF EXISTS schedule;

-- Add comments
COMMENT ON COLUMN slides.host_name IS 'Host/presenter name for show slides';
COMMENT ON COLUMN slides.show_days IS 'Days when the show airs (e.g., Monday to Friday)';
COMMENT ON COLUMN slides.schedule_times IS 'Array of timezone-specific times: [{timezone, time}]';



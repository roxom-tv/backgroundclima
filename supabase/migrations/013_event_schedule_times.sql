-- =============================================
-- Add Multiple Timezone Times to Events
-- Allows specifying event times in multiple timezones
-- Example: [{"time": "8:00 PM", "timezone": "ET"}, {"time": "5:00 PM", "timezone": "Buenos Aires"}]
-- =============================================

-- Add schedule_times column as JSONB
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS schedule_times JSONB DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN events.schedule_times IS 'Array of timezone-specific times: [{time: "8:00 PM", timezone: "ET"}, ...]';



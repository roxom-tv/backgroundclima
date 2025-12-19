-- Migration: Create events table for calendar functionality
-- Events can be displayed in the calendar slide

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  
  -- Date range
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Time range (optional, for specific hours)
  start_time TIME,
  end_time TIME,
  
  -- Display settings
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  
  -- Styling
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for event
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active events by date
CREATE INDEX idx_events_active_date ON events(is_active, start_date);
CREATE INDEX idx_events_order ON events(order_index);

-- Trigger to update updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Public can read active events
CREATE POLICY "Allow public read access on events"
  ON events FOR SELECT
  USING (true);

-- Authenticated users can do everything
CREATE POLICY "Allow authenticated full access on events"
  ON events FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE events;

COMMENT ON TABLE events IS 'Calendar events for display on the calendar slide';
COMMENT ON COLUMN events.start_date IS 'Event start date';
COMMENT ON COLUMN events.end_date IS 'Event end date (null for single-day events)';
COMMENT ON COLUMN events.start_time IS 'Optional start time for the event';
COMMENT ON COLUMN events.end_time IS 'Optional end time for the event';
COMMENT ON COLUMN events.color IS 'Hex color code for event display';



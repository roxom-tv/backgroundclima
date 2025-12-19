-- =============================================
-- Background Clima - Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM Types
-- =============================================

CREATE TYPE slide_type AS ENUM ('youtube', 'debt', 'calendar', 'custom');
CREATE TYPE transition_effect AS ENUM ('tv_static', 'fade', 'slide', 'none');

-- =============================================
-- Table: slides
-- Stores all display slides (YouTube streams, debt, calendar, etc.)
-- =============================================

CREATE TABLE slides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type slide_type NOT NULL DEFAULT 'youtube',
    name TEXT NOT NULL,
    country TEXT,
    youtube_url TEXT,
    weather_query TEXT,
    timezone TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 25,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    show_weather BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX idx_slides_order ON slides(order_index);
CREATE INDEX idx_slides_active ON slides(is_active);

-- =============================================
-- Table: settings
-- Global configuration key-value store
-- =============================================

CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Table: sponsors
-- Sponsor/advertiser management
-- =============================================

CREATE TABLE sponsors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX idx_sponsors_order ON sponsors(order_index);
CREATE INDEX idx_sponsors_active ON sponsors(is_active);

-- =============================================
-- Triggers for updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_slides_updated_at
    BEFORE UPDATE ON slides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sponsors_updated_at
    BEFORE UPDATE ON sponsors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

-- Public read access (for the display)
CREATE POLICY "Allow public read access on slides"
    ON slides FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access on settings"
    ON settings FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access on sponsors"
    ON sponsors FOR SELECT
    USING (true);

-- Authenticated users can do everything (for admin panel)
CREATE POLICY "Allow authenticated full access on slides"
    ON slides FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated full access on settings"
    ON settings FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated full access on sponsors"
    ON sponsors FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- =============================================
-- Enable Realtime
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE slides;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;
ALTER PUBLICATION supabase_realtime ADD TABLE sponsors;

-- =============================================
-- Initial Data: Default Settings
-- =============================================

INSERT INTO settings (key, value) VALUES 
('global', '{
    "show_sponsors": true,
    "show_live_indicator": true,
    "transition_effect": "tv_static",
    "default_duration_seconds": 25
}'::jsonb);



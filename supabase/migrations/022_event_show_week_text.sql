-- Migration: Add event_show_week_text to slides (optional "Week X - Monday to Friday" in modern event slide)
ALTER TABLE slides
ADD COLUMN IF NOT EXISTS event_show_week_text BOOLEAN DEFAULT true;

COMMENT ON COLUMN slides.event_show_week_text IS 'When true, show "Week X - Monday N to Friday N" in modern event slide header';

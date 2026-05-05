-- Slide UTC schedule: active days of week and time window
-- active_days: array of integers 0-6 (0=Sunday, 1=Monday, ..., 6=Saturday). NULL = all days.
-- active_time_start / active_time_end: HH:MM string in UTC. NULL = no time restriction.
ALTER TABLE slides
    ADD COLUMN IF NOT EXISTS active_days integer[],
    ADD COLUMN IF NOT EXISTS active_time_start text,
    ADD COLUMN IF NOT EXISTS active_time_end text;

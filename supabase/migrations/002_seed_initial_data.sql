-- =============================================
-- Background Clima - Seed Initial Data
-- Migrated from config/cities.ts
-- =============================================

-- Insert YouTube slides (cities)
INSERT INTO slides (type, name, country, youtube_url, weather_query, timezone, duration_seconds, order_index, is_active, show_weather) VALUES
('youtube', 'Hong Kong', 'Hong Kong', 'https://www.youtube.com/embed/jW5Tnl1Ft4E?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=jW5Tnl1Ft4E&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440', 'Hong Kong,HK', 'Asia/Hong_Kong', 25, 0, true, true),
('youtube', 'London', 'United Kingdom', 'https://www.youtube.com/embed/57w2gYXjRic?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=57w2gYXjRic&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440', 'London,GB', 'Europe/London', 25, 1, true, true),
('youtube', 'San Francisco', 'United States', 'https://www.youtube.com/embed/CXYr04BWvmc?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=CXYr04BWvmc&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440', 'San Francisco,US', 'America/Los_Angeles', 25, 2, true, true),
('youtube', 'New York', 'United States', 'https://www.youtube.com/embed/rnXIjl_Rzy4?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=rnXIjl_Rzy4&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440', 'New York,US', 'America/New_York', 25, 3, true, true),
('youtube', 'Dubai', 'United Arab Emirates', 'https://www.youtube.com/embed/7dE4IjDQJmE?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=7dE4IjDQJmE&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440', 'Dubai,AE', 'Asia/Dubai', 25, 4, true, true),
('youtube', 'Tokyo', 'Japan', 'https://www.youtube.com/embed/_k-5U7IeK8g?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=_k-5U7IeK8g&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440', 'Tokyo,JP', 'Asia/Tokyo', 25, 5, true, true),
('youtube', 'Sydney', 'Australia', 'https://www.youtube.com/embed/5uZa3-RMFos?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=5uZa3-RMFos&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440', 'Sydney,AU', 'Australia/Sydney', 25, 6, true, true),
('youtube', 'Amsterdam', 'Netherlands', 'https://www.youtube.com/embed/1phWWCgzXgM?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=1phWWCgzXgM&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440', 'Amsterdam,NL', 'Europe/Amsterdam', 25, 7, true, true),
('youtube', 'Necochea', 'Argentina', 'https://www.youtube.com/embed/nyiQdER7LzI?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=nyiQdER7LzI&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440', 'Necochea,AR', 'America/Argentina/Buenos_Aires', 25, 8, true, true),
('youtube', 'Alberta', 'Canada', 'https://www.youtube.com/embed/_0wPODlF9wU?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=_0wPODlF9wU&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1440', 'Calgary,CA', 'America/Edmonton', 25, 9, true, true);

-- Insert special slides (debt, metals, fx, calendar)
-- Note: debt, metals, fx are system slides - only is_active, show_sponsor, and duration can be edited from admin
INSERT INTO slides (type, name, youtube_url, weather_query, timezone, duration_seconds, order_index, is_active, show_weather, show_sponsor) VALUES
('debt', 'US National Debt', NULL, NULL, 'America/New_York', 35, 10, true, false, false),
('metals', 'Precious Metals', NULL, NULL, NULL, 30, 11, true, false, false),
('fx', 'Foreign Exchange', NULL, NULL, NULL, 30, 12, true, false, false),
('calendar', 'Events Calendar', NULL, NULL, NULL, 60, 13, true, false, true);



# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from **Settings > API**

## 2. Run Migrations

Go to **SQL Editor** in your Supabase dashboard and run these files in order:

1. `migrations/001_initial_schema.sql` - Creates tables, indexes, RLS policies
2. `migrations/002_seed_initial_data.sql` - Populates initial slides data

## 3. Enable Realtime

Go to **Database > Replication** and ensure these tables have Realtime enabled:

- `slides`
- `settings`
- `sponsors`

(The migration should enable this automatically, but verify it's on)

## 4. Configure Environment Variables

Add these to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 5. Create Admin User

Go to **Authentication > Users** and create a user for the admin panel.

Or use the Supabase Auth UI to sign up at `/admin/login`.

## Tables Overview

### slides

| Column           | Type | Description                              |
| ---------------- | ---- | ---------------------------------------- |
| id               | UUID | Primary key                              |
| type             | enum | 'youtube', 'debt', 'calendar', 'custom'  |
| name             | text | Display name                             |
| country          | text | Country name (optional)                  |
| youtube_url      | text | YouTube embed URL                        |
| weather_query    | text | OpenWeatherMap query (e.g., "London,GB") |
| timezone         | text | IANA timezone                            |
| duration_seconds | int  | How long to show this slide              |
| order_index      | int  | Display order                            |
| is_active        | bool | Whether to include in rotation           |
| show_weather     | bool | Show weather bar for this slide          |

### settings

Key-value store for global settings. Default key is `global` with:

```json
{
    "show_sponsors": true,
    "show_live_indicator": true,
    "transition_effect": "tv_static",
    "default_duration_seconds": 25
}
```

### sponsors

| Column      | Type | Description       |
| ----------- | ---- | ----------------- |
| id          | UUID | Primary key       |
| name        | text | Sponsor name      |
| logo_url    | text | Logo image URL    |
| website_url | text | Sponsor website   |
| is_active   | bool | Show this sponsor |
| order_index | int  | Display order     |

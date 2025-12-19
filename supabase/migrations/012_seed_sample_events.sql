-- =============================================
-- Sample Events for Testing
-- Covers various scenarios: styles, dates, layouts
-- =============================================

-- Clear existing events (optional - comment out if you want to keep existing)
-- DELETE FROM events;

-- Insert sample events
INSERT INTO events (
  title, description, image_url, start_date, end_date, start_time, end_time,
  is_active, order_index, color,
  title_font, title_size, title_color, text_color, overlay_opacity, show_date_badge
) VALUES

-- 1. Bitcoin Halving - Large event with custom styling
(
  'Bitcoin Halving 2024',
  'The next Bitcoin halving event. Block rewards will be reduced from 6.25 BTC to 3.125 BTC.',
  'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=1920&h=1080&fit=crop',
  '2024-04-20',
  NULL,
  '00:00',
  NULL,
  true,
  1,
  '#F59E0B',
  'Impact',
  'xlarge',
  '#FBBF24',
  '#FEF3C7',
  40,
  true
),

-- 2. Conference - Multi-day event
(
  'Bitcoin Conference Miami',
  'The world''s largest Bitcoin conference returns to Miami Beach.',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&h=1080&fit=crop',
  '2024-07-25',
  '2024-07-27',
  '09:00',
  '18:00',
  true,
  2,
  '#3B82F6',
  'Inter',
  'large',
  '#FFFFFF',
  '#E5E7EB',
  50,
  true
),

-- 3. Today's Event (use CURRENT_DATE)
(
  'Live Trading Session',
  'Join us for a live market analysis and trading strategies session.',
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1920&h=1080&fit=crop',
  CURRENT_DATE,
  NULL,
  '14:00',
  '16:00',
  true,
  3,
  '#10B981',
  'Arial',
  'large',
  '#34D399',
  '#D1FAE5',
  55,
  true
),

-- 4. Podcast Episode - No image, gradient background
(
  'Blockchain Report Episode 150',
  'Special anniversary episode with Hank Hudson discussing the future of DeFi.',
  NULL,
  CURRENT_DATE + INTERVAL '3 days',
  NULL,
  '11:00',
  '12:00',
  true,
  4,
  '#8B5CF6',
  'Georgia',
  'medium',
  '#FFFFFF',
  '#E9D5FF',
  0,
  true
),

-- 5. ETF Deadline - Important financial event
(
  'SEC ETF Decision Deadline',
  'Final deadline for SEC decision on spot Bitcoin ETF applications.',
  'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1920&h=1080&fit=crop',
  CURRENT_DATE + INTERVAL '7 days',
  NULL,
  '16:00',
  NULL,
  true,
  5,
  '#EF4444',
  'Impact',
  'xlarge',
  '#FECACA',
  '#FFFFFF',
  60,
  true
),

-- 6. Webinar - No date badge, clean look
(
  'DeFi Masterclass',
  'Learn about decentralized finance, yield farming, and liquidity pools.',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&h=1080&fit=crop',
  CURRENT_DATE + INTERVAL '5 days',
  NULL,
  '19:00',
  '21:00',
  true,
  6,
  '#EC4899',
  'Verdana',
  'large',
  '#FFFFFF',
  '#FDF2F8',
  45,
  false
),

-- 7. Network Upgrade - Tech event
(
  'Ethereum Dencun Upgrade',
  'Major network upgrade introducing proto-danksharding for Layer 2 scaling.',
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1920&h=1080&fit=crop',
  CURRENT_DATE + INTERVAL '14 days',
  NULL,
  NULL,
  NULL,
  true,
  7,
  '#06B6D4',
  'Inter',
  'large',
  '#22D3EE',
  '#CFFAFE',
  50,
  true
),

-- 8. AMA Session - Casual event
(
  'Community AMA Session',
  'Ask Me Anything with the Roxom TV team. Submit your questions!',
  NULL,
  CURRENT_DATE + INTERVAL '2 days',
  NULL,
  '20:00',
  '21:30',
  true,
  8,
  '#F97316',
  'Comic Sans MS',
  'medium',
  '#FFFFFF',
  '#FED7AA',
  0,
  true
),

-- 9. Market Report - Weekly recurring feel
(
  'Weekly Market Wrap-Up',
  'Comprehensive analysis of this week''s crypto market movements and trends.',
  'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1920&h=1080&fit=crop',
  CURRENT_DATE + INTERVAL '4 days',
  NULL,
  '18:00',
  '19:00',
  true,
  9,
  '#3B82F6',
  'Arial',
  'medium',
  '#FFFFFF',
  '#DBEAFE',
  55,
  true
),

-- 10. Past event (inactive)
(
  'Genesis Block Anniversary',
  'Celebrating 15 years since the Bitcoin genesis block was mined.',
  'https://images.unsplash.com/photo-1516245834210-c4c142787335?w=1920&h=1080&fit=crop',
  '2024-01-03',
  NULL,
  NULL,
  NULL,
  false,
  10,
  '#F59E0B',
  'Times New Roman',
  'xlarge',
  '#FCD34D',
  '#FFFBEB',
  40,
  true
),

-- 11. Small text event - For testing small size
(
  'Quick News Update: Fed Rate Decision',
  'Breaking news coverage of the Federal Reserve interest rate announcement and its impact on crypto markets.',
  'https://images.unsplash.com/photo-1604594849809-dfedbc827105?w=1920&h=1080&fit=crop',
  CURRENT_DATE + INTERVAL '10 days',
  NULL,
  '14:30',
  '15:00',
  true,
  11,
  '#10B981',
  'Inter',
  'small',
  '#FFFFFF',
  '#D1FAE5',
  65,
  true
),

-- 12. Dark overlay event - High contrast
(
  'Night Trading Marathon',
  '24-hour live trading coverage during high volatility period.',
  'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=1920&h=1080&fit=crop',
  CURRENT_DATE + INTERVAL '6 days',
  CURRENT_DATE + INTERVAL '7 days',
  '00:00',
  '23:59',
  true,
  12,
  '#EF4444',
  'Impact',
  'large',
  '#FFFFFF',
  '#FCA5A5',
  80,
  true
);

-- Verify insertion
SELECT 
  title, 
  start_date, 
  is_active, 
  title_size, 
  overlay_opacity,
  show_date_badge
FROM events 
ORDER BY order_index;



-- =============================================
-- Verification Script: Check RLS Policies Status
-- =============================================
-- Run this to verify that RLS policies are correctly configured

-- 1. Check if RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename IN ('slides', 'settings', 'sponsors', 'events')
    AND schemaname = 'public'
ORDER BY tablename;

-- 2. List all policies for these tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as "Command",
    qual as "Using Expression",
    with_check as "With Check Expression"
FROM pg_policies
WHERE tablename IN ('slides', 'settings', 'sponsors', 'events')
    AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Count policies per table
SELECT 
    tablename,
    COUNT(*) as "Policy Count"
FROM pg_policies
WHERE tablename IN ('slides', 'settings', 'sponsors', 'events')
    AND schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 4. Check for any missing policies (should have SELECT, INSERT, UPDATE, DELETE for authenticated users)
-- This query shows what operations are covered
SELECT 
    tablename,
    cmd as "Operation",
    COUNT(*) as "Policy Count",
    STRING_AGG(policyname, ', ') as "Policy Names"
FROM pg_policies
WHERE tablename IN ('slides', 'settings', 'sponsors', 'events')
    AND schemaname = 'public'
GROUP BY tablename, cmd
ORDER BY tablename, cmd;

-- Expected results:
-- slides: SELECT (2 policies: public + authenticated), INSERT (1), UPDATE (1), DELETE (1)
-- settings: SELECT (2 policies: public + authenticated), INSERT (1), UPDATE (1), DELETE (1)
-- sponsors: SELECT (2 policies: public + authenticated), INSERT (1), UPDATE (1), DELETE (1)
-- events: SELECT (2 policies: public + authenticated), INSERT (1), UPDATE (1), DELETE (1)

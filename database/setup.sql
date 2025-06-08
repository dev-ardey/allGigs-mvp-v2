-- Setup script for Add Job functionality
-- Run this in your Supabase SQL editor

-- Create user_clearances table to manage permissions
CREATE TABLE IF NOT EXISTS user_clearances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    clearance_level TEXT NOT NULL CHECK (clearance_level IN ('admin', 'moderator', 'user')),
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    UNIQUE(user_id)
);

-- Create job_additions table to log job additions
CREATE TABLE IF NOT EXISTS job_additions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id TEXT NOT NULL,
    job_title TEXT NOT NULL,
    company TEXT NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comprehensive job postings log table
CREATE TABLE IF NOT EXISTS job_postings_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT,
    job_id TEXT NOT NULL,
    job_title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    rate TEXT,
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job email submissions table for tracking email-based submissions
CREATE TABLE IF NOT EXISTS job_email_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    job_title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    rate TEXT NOT NULL,
    summary TEXT NOT NULL,
    poster_name TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_subject TEXT,
    email_body TEXT,
    user_agent TEXT,
    ip_address INET,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'processed', 'approved', 'rejected')),
    admin_notes TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_clearances ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_additions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_email_submissions ENABLE ROW LEVEL SECURITY;

-- Policy for user_clearances: Users can read their own clearance
CREATE POLICY "Users can view own clearance" ON user_clearances
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for user_clearances: Only admins can manage clearances
CREATE POLICY "Admins can manage clearances" ON user_clearances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_clearances 
            WHERE user_id = auth.uid() 
            AND clearance_level = 'admin'
        )
    );

-- Policy for job_additions: Users can view their own additions
CREATE POLICY "Users can view own job additions" ON job_additions
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for job_additions: Allow inserts for authenticated users
CREATE POLICY "Authenticated users can log job additions" ON job_additions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for job_postings_log: Users can view their own postings log
CREATE POLICY "Users can view own job postings log" ON job_postings_log
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for job_postings_log: Allow inserts for authenticated users
CREATE POLICY "Authenticated users can log job postings" ON job_postings_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for job_postings_log: Admins can view all logs
CREATE POLICY "Admins can view all job postings logs" ON job_postings_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_clearances 
            WHERE user_id = auth.uid() 
            AND clearance_level IN ('admin', 'moderator')
        )
    );

-- Policy for job_email_submissions: Users can view their own submissions
CREATE POLICY "Users can view own job email submissions" ON job_email_submissions
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for job_email_submissions: Allow inserts for authenticated users
CREATE POLICY "Authenticated users can submit job emails" ON job_email_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for job_email_submissions: Admins can view and update all submissions
CREATE POLICY "Admins can manage all job email submissions" ON job_email_submissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_clearances 
            WHERE user_id = auth.uid() 
            AND clearance_level IN ('admin', 'moderator')
        )
    );

-- Insert some sample clearances (replace with actual user IDs)
-- You'll need to replace these UUIDs with actual user IDs from your auth.users table
-- INSERT INTO user_clearances (user_id, clearance_level, notes) VALUES
-- ('your-admin-user-id-here', 'admin', 'System administrator'),
-- ('your-moderator-user-id-here', 'moderator', 'Content moderator');

-- Grant necessary permissions to authenticated users for the main jobs table
-- This assumes your jobs table already exists with proper RLS
-- If not already done, you may need to adjust the RLS policies on Allgigs_All_vacancies_NEW

-- Add columns to Allgigs_All_vacancies_NEW table for poster information and tagging
-- Run these ALTER TABLE statements if the table already exists

-- Add poster information columns
ALTER TABLE "Allgigs_All_vacancies_NEW" 
ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS added_by_email TEXT,
ADD COLUMN IF NOT EXISTS poster_name TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'external',
ADD COLUMN IF NOT EXISTS tags TEXT;

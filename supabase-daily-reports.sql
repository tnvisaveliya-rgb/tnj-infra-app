-- ============================================
-- SUPABASE STORAGE SETUP FOR SITE PHOTOS
-- ============================================
-- Run these commands in your Supabase SQL Editor to set up Storage

-- 1. Create storage bucket for site photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('site-photos', 'site-photos', true)
ON CONFLICT (id) DO UPDATE SET 
  name = 'site-photos',
  public = true;

-- 2. Create storage policies for site-photos bucket
-- Allow authenticated users to upload photos
CREATE POLICY "Allow authenticated users to upload site photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site-photos');

-- Allow authenticated users to view photos
CREATE POLICY "Allow authenticated users to view site photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'site-photos');

-- Allow users to delete their own photos
CREATE POLICY "Allow users to delete their own site photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'site-photos');

-- ============================================
-- DAILY REPORTS TABLE SCHEMA
-- ============================================

-- Create daily_reports table
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name TEXT NOT NULL,
  work_description TEXT NOT NULL,
  photo_url TEXT,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_reports_site_name ON daily_reports(site_name);
CREATE INDEX IF NOT EXISTS idx_daily_reports_user_id ON daily_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_report_date ON daily_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_created_at ON daily_reports(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on daily_reports
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all reports
CREATE POLICY "Allow authenticated users to view daily reports"
ON daily_reports FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert reports
CREATE POLICY "Allow authenticated users to insert daily reports"
ON daily_reports FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update their own reports
CREATE POLICY "Allow users to update their own daily reports"
ON daily_reports FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Allow users to delete their own reports
CREATE POLICY "Allow users to delete their own daily reports"
ON daily_reports FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- HELPER FUNCTION FOR UPDATED_AT
-- ============================================

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_daily_reports_updated_at ON daily_reports;
CREATE TRIGGER update_daily_reports_updated_at
  BEFORE UPDATE ON daily_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

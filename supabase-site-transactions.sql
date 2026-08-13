-- ============================================
-- SUPABASE STORAGE SETUP FOR RECEIPTS
-- ============================================
-- Run these commands in your Supabase SQL Editor to set up Storage

-- 1. Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE SET 
  name = 'receipts',
  public = true;

-- 2. Create storage policies for receipts bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Allow authenticated users to view receipts
CREATE POLICY "Allow authenticated users to view receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts');

-- Allow authenticated users to delete their own receipts
CREATE POLICY "Allow users to delete their own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');

-- ============================================
-- SITE TRANSACTIONS TABLE SCHEMA
-- ============================================

-- Create site_transactions table
CREATE TABLE IF NOT EXISTS site_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income')),
  amount DECIMAL(12, 2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  receipt_url TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_site_transactions_site_id ON site_transactions(site_id);
CREATE INDEX IF NOT EXISTS idx_site_transactions_type ON site_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_site_transactions_date ON site_transactions(transaction_date);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on site_transactions
ALTER TABLE site_transactions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all transactions
CREATE POLICY "Allow authenticated users to view transactions"
ON site_transactions FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert transactions
CREATE POLICY "Allow authenticated users to insert transactions"
ON site_transactions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update transactions
CREATE POLICY "Allow authenticated users to update transactions"
ON site_transactions FOR UPDATE
TO authenticated
USING (true);

-- Allow authenticated users to delete transactions
CREATE POLICY "Allow authenticated users to delete transactions"
ON site_transactions FOR DELETE
TO authenticated
USING (true);

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
DROP TRIGGER IF EXISTS update_site_transactions_updated_at ON site_transactions;
CREATE TRIGGER update_site_transactions_updated_at
  BEFORE UPDATE ON site_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

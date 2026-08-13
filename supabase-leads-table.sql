-- Create leads table for CRM
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  status VARCHAR(50) DEFAULT 'prospect',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read leads
CREATE POLICY "Allow authenticated users to read leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to insert leads
CREATE POLICY "Allow authenticated users to insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy to allow authenticated users to update leads
CREATE POLICY "Allow authenticated users to update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to delete leads
CREATE POLICY "Allow authenticated users to delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (true);

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

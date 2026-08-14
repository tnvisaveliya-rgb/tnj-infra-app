import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kfkqnujmzlbnclawjwdf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma3FudWptemxibmNsYXdqd2RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNjA0NTAsImV4cCI6MjEwMTkzNjQ1MH0.yr_SrPT2HjkBl5iMbT8bV5gAHfwJnZG5GIrShujn0yQ'

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables:')
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing')
  console.error('\n📝 STEPS TO FIX:')
  console.error('1. Create a .env file in the project root')
  console.error('2. Add your actual Supabase credentials:')
  console.error('   VITE_SUPABASE_URL=https://your-project-id.supabase.co')
  console.error('   VITE_SUPABASE_ANON_KEY=your-actual-anon-key')
  console.error('3. Restart the dev server: npm run dev')
  throw new Error('Missing Supabase environment variables')
}

// Validate URL format
try {
  new URL(supabaseUrl)
} catch (e) {
  console.error('❌ Invalid VITE_SUPABASE_URL format:', supabaseUrl)
  console.error('URL must start with https:// or http://')
  console.error('Current value:', supabaseUrl)
  console.error('\n📝 CORRECT FORMAT:')
  console.error('VITE_SUPABASE_URL=https://your-project-id.supabase.co')
  throw new Error('Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

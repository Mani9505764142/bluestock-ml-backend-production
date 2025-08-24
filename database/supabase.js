// database/supabase.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ------------------------------------------------------------------
// Environment variables (must be set in Render → Environment)
// ------------------------------------------------------------------
const supabaseUrl     = process.env.SUPABASE_URL;      // e.g. https://abcxyz.supabase.co
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // long anon key

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY.');
}

// ------------------------------------------------------------------
// Supabase client – uses normal, secure HTTPS
// ------------------------------------------------------------------
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ------------------------------------------------------------------
// Optional: quick connectivity test (runs once on start-up)
// ------------------------------------------------------------------
export const testSupabaseConnection = async () => {
  try {
    console.log('🔄 Testing Supabase connection…');
    const { data, error } = await supabase
      .from('companies')
      .select('count(*)')
      .single();

    if (error) throw error;
    console.log('✅ Connected – companies in table:', data.count);
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
  }
};

testSupabaseConnection();   // remove if you don’t want the startup check

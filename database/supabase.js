// database/supabase.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ─────────────────────────────────────────────────────────────
const supabaseUrl     = process.env.SUPABASE_URL;      // https://your-ref.supabase.co
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // long anon key
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY.');
}
// ─────────────────────────────────────────────────────────────
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─────────────────────────────────────────────────────────────
export const testSupabaseConnection = async () => {
  try {
    console.log('🔄 Testing Supabase connection…');
    const { data, error } = await supabase
      .from('companies')
      .select('count(*)')
      .single();

    if (error) throw error;
    console.log('✅ Connected – companies in table:', data.count);

  } catch (err) {                         // ➊ catch block already exists
    console.error('❌ Full error details:', err);  // ➋ add this line
  }
};

testSupabaseConnection();

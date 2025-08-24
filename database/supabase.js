// database/supabase.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('count(*)')
      .single();
    
    if (error) throw error;
    console.log('✅ Supabase Database Connected - Companies:', data.count);
    return true;
  } catch (error) {
    console.error('❌ Supabase Connection Failed:', error.message);
    return false;
  }
};

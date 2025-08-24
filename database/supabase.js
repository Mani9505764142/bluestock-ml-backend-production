// database/supabase.js
import dotenv   from 'dotenv';
import https    from 'https';
import fetch    from 'node-fetch';               // explicit fetch impl
import { createClient } from '@supabase/supabase-js';

dotenv.config();

/* ------------------------------------------------------------------ */
/* 1. Load & validate environment variables                            */
/* ------------------------------------------------------------------ */
const supabaseUrl     = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Missing Supabase environment variables');
}

/* ------------------------------------------------------------------ */
/* 2. TLS workaround (testing only)                                    */
/* ------------------------------------------------------------------ */
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,   // bypass SSL verification - remove later
  keepAlive: true
});

/* Give EVERY library (Supabase, node-fetch, etc.) this agent          */
globalThis.fetch = (url, options = {}) =>
  fetch(url, { ...options, agent: httpsAgent });

/* ------------------------------------------------------------------ */
/* 3. Create Supabase client                                           */
/* ------------------------------------------------------------------ */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ------------------------------------------------------------------ */
/* 4. Connectivity self-test                                           */
/* ------------------------------------------------------------------ */
export const testSupabaseConnection = async () => {
  try {
    console.log('🔄 Testing Supabase connection…');
    const { data, error } = await supabase
      .from('companies')
      .select('count(*)')
      .single();

    if (error) throw error;
    console.log('✅ Supabase Database Connected – Companies:', data.count);
  } catch (err) {
    // PRINT THE REAL ERROR – copy this line from Render logs if it fails
    console.error('❌ Full error details:', err);
    throw err;                  // let Render mark the deploy as failed
  }
};

/* Run the test immediately on server start */
testSupabaseConnection();

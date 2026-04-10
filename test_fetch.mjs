import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = `test_fetch_${Date.now()}@gmail.com`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'Password123!',
  });

  if (authError || !authData.user) {
    console.error('Signup error:', authError);
    return;
  }

  const userId = authData.user.id;
  console.log('Signed up user:', userId);
  
  // Wait a second for trigger.
  await new Promise(r => setTimeout(r, 1000));

  const { data: byUserId } = await supabase.from('user_profiles').select('*').eq('user_id', userId);
  const { data: byId } = await supabase.from('user_profiles').select('*').eq('id', userId);

  console.log('by user_id:', byUserId);
  console.log('by id:', byId);
}

run();

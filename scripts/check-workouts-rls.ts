import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const db = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkRLS() {
  // Let's see if we can find ANY active workout
  const { data: workouts, error } = await db.from('workouts').select('*').limit(5);
  console.log('Workouts:', workouts, error);
}

checkRLS().catch(console.error);

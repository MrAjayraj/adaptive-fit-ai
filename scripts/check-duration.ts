import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const db = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkDurationConstraint() {
  // Let's try to update an existing completed workout to duration 0 just to see if it throws PGRST/Postgres check constraint error
  const { data: w } = await db.from('workouts').select('id').eq('status', 'completed').limit(1).single();
  if (w) {
    const { error } = await db.from('workouts').update({ duration: 0 }).eq('id', w.id);
    console.log('Update duration to 0 error:', error);
  } else {
    console.log('No completed workouts found to test.');
  }
}

checkDurationConstraint().catch(console.error);

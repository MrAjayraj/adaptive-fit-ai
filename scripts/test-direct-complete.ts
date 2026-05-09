import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const db = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function testComplete() {
  // Create a dummy workout
  const { data: workout, error: createErr } = await db.from('workouts').insert({
    user_id: 'a9b2b5f7-64b1-4f33-8ef4-9d5f7f329241', // Just a guess, we should just insert without user_id if we have RLS? No, we need auth.
    // Wait, script uses anon key. RLS might block it!
    status: 'active',
    name: 'Test Workout',
    date: new Date().toISOString().split('T')[0]
  }).select('*').single();
  
  if (createErr) {
    console.error('Create error:', createErr);
    // Let's just try to find ANY active workout
    const { data: activeWorkouts, error: selErr } = await db.from('workouts').select('*').eq('status', 'active');
    console.log('Active workouts in DB:', activeWorkouts, selErr);
    return;
  }
}

testComplete().catch(console.error);

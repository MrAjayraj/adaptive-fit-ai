import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const db = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkRecentWorkouts() {
  const { data: active } = await db.from('workouts').select('id,name,status,date').eq('status', 'active');
  console.log('Active workouts:', active);

  const { data: completed } = await db.from('workouts')
    .select('id,name,status,date,duration,total_volume_kg')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('Recent completed workouts:', completed);
}

checkRecentWorkouts().catch(console.error);

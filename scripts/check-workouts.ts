import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkWorkouts() {
  // Let's just find the latest workouts in the DB
  const { data, error } = await supabase
    .from('workouts')
    .select('id, name, status, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error fetching workouts:', error);
  } else {
    console.log('Latest 10 workouts:');
    console.table(data);
  }
}

checkWorkouts();

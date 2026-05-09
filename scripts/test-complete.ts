import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const db = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function testComplete() {
  const workoutId = '0a4b3d87-3d19-4824-a212-32a255fc7129'; // We don't know the workout ID, let's just create one and finish it or just find an active one.

  const { data: workouts } = await db.from('workouts').select('id').eq('status', 'active');
  console.log('Active workouts:', workouts);
  
  if (!workouts || workouts.length === 0) {
    console.log('No active workouts to test');
    return;
  }
  
  const id = workouts[0].id;
  const { data, error } = await db.from('workouts').update({
    status: 'completed',
    completed: true,
    duration: 30
  }).eq('id', id);

  console.log('Critical Update Result:', { data, error });
}

testComplete().catch(console.error);

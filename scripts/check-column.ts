import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const db = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkSchema() {
  const { data, error } = await db.from('workouts').select('completed').limit(1);
  if (error) {
    console.error('Error selecting completed column:', error.message);
  } else {
    console.log('Success selecting completed column:', data);
  }
}

checkSchema().catch(console.error);

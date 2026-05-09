import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const db = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkSchema() {
  const { data, error } = await db.from('workouts').select('completed, this_column_does_not_exist').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}

checkSchema().catch(console.error);

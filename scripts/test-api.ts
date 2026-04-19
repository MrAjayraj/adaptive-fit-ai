import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function test() {
  const response = await fetch(`${url}/rest/v1/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'apikey': key,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify([{ 
      exercise_id: 'test_123', 
      name: 'Test', 
      body_part: 'chest', 
      equipment: 'none', 
      target_muscle: 'chest', 
      secondary_muscles: [], 
      exercise_type: 'weight_reps', 
      is_custom: true 
    }])
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Failure:', response.status, error);
  } else {
    console.log('Success:', await response.json());
  }
}

test();

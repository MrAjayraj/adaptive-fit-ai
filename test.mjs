import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = `test_${Date.now()}@gmail.com`;
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

  const { error: insertError } = await supabase
    .from('user_profiles')
    .insert([{
      user_id: userId,
      name: 'Test',
      age: 25,
      gender: 'Male',
      height: 175,
      goal: 'build_muscle',
      experience: 'intermediate',
      days_per_week: 4,
      preferred_split: 'push_pull_legs',
      activity_level: 'moderately_active',
      goal_weight_kg: 75,
      unit_preference: 'metric',
      onboarding_complete: true,
    }]);

  console.log('Insert Error:', insertError);

  // Since we can't easily delete via API without service key, leave it
}

run();

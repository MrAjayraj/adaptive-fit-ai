import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

type ExerciseType =
  | 'weight_reps'
  | 'bodyweight_reps'
  | 'weighted_bodyweight'
  | 'assisted_bodyweight'
  | 'duration'
  | 'duration_weight'
  | 'distance_duration'
  | 'weight_distance';

function mapEquipmentToType(equipment: string): ExerciseType {
  const eq = equipment.toLowerCase();
  if (eq === 'body weight' || eq === 'bodyweight' || eq === 'none') {
    return 'bodyweight_reps';
  }
  if (eq === 'band' || eq === 'resistance band' || eq === 'assisted') {
    return 'assisted_bodyweight';
  }
  return 'weight_reps';
}

function capitalize(str: string): string {
  if (!str) return str;
  return str
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

async function main() {
  console.log("Fetching exercises...");
  const res = await fetch('https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json');
  const items = await res.json();
  console.log(`Got ${items.length} items`);
  
  const mapped = items.map((raw: any, index: number) => {
    return {
      exercise_id: raw.id || `fallback_${index}`,
      name: capitalize(raw.name || ''),
      body_part: (raw.category || 'other').toLowerCase().trim(),
      equipment: (raw.mechanic || raw.equipment || 'body weight').toLowerCase().trim(),
      target_muscle: (raw.primaryMuscles?.[0] || 'other').toLowerCase().trim(),
      secondary_muscles: raw.secondaryMuscles || [],
      gif_url: raw.images?.[0] || null,
      instructions: raw.instructions || [],
      exercise_type: mapEquipmentToType(raw.equipment || 'body weight'),
      is_custom: false,
    };
  });
  
  const BATCH = 50;
  let total = 0;
  for (let i = 0; i < mapped.length; i += BATCH) {
    const chunk = mapped.slice(i, i + BATCH);
    process.stdout.write(`Batch ${Math.floor(i / BATCH) + 1} (${chunk.length} items)... `);
    
    const r = await fetch(`${url}/rest/v1/rpc/bulk_insert_exercises`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'apikey': key!,
        'Accept-Profile': 'public',
        'Content-Profile': 'public'
      },
      body: JSON.stringify({ payload: chunk })
    });
    
    if (!r.ok) {
      console.log(`FAILED: ${r.status} ${await r.text()}`);
    } else {
      console.log('OK');
      total += chunk.length;
    }
  }
  console.log(`Done! Uploaded ${total} exercises.`);
}

main().catch(console.error);

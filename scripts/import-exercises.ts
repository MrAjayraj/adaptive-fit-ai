/**
 * ExerciseDB Import Script
 * ========================
 * Downloads and imports exercises from the ExerciseDB dataset into Supabase.
 *
 * Usage:
 *   1. Download exercises.json from Kaggle:
 *      https://www.kaggle.com/datasets/exercisedb/fitness-exercises-dataset
 *      (The file is called "exercises.json" inside the dataset ZIP)
 *
 *   2. Set environment variables:
 *      VITE_SUPABASE_URL=https://your-project.supabase.co
 *      SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   ← use service key (not anon)
 *
 *   3. Run:
 *      npx tsx scripts/import-exercises.ts ./exercises.json
 *      # or: npx ts-node scripts/import-exercises.ts ./exercises.json
 *
 *   Expected result: ~1300-1500 exercises imported, including GIF URLs.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL          = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const BATCH_SIZE            = 100; // inserts per batch

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Kaggle ExerciseDB exercise shape ────────────────────────────────────────
interface KaggleExercise {
  bodyPart:         string;
  equipment:        string;
  gifUrl:           string;
  id:               string;
  name:             string;
  target:           string;
  secondaryMuscles: string[];
  instructions:     string[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function mapExerciseType(equipment: string, bodyPart: string): string {
  const eq = equipment.toLowerCase();
  const bp = bodyPart.toLowerCase();
  if (bp === 'cardio')       return 'distance_duration';
  if (eq === 'body weight') {
    if (['plank','hold','static'].some(k => bp.includes(k))) return 'duration';
    return 'bodyweight_reps';
  }
  return 'weight_reps';
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Main import ─────────────────────────────────────────────────────────────

async function importFromFile(filePath: string) {
  const resolved = path.resolve(filePath);
  console.log(`📂 Reading exercises from: ${resolved}`);

  if (!fs.existsSync(resolved)) {
    console.error(`❌  File not found: ${resolved}`);
    console.error('    Download from: https://www.kaggle.com/datasets/exercisedb/fitness-exercises-dataset');
    process.exit(1);
  }

  const raw       = fs.readFileSync(resolved, 'utf-8');
  const exercises = JSON.parse(raw) as KaggleExercise[];
  const deduped = exercises.map(ex => ({
      exercise_id:       ex.id,
      name:              toTitleCase(ex.name),
      body_part:         ex.bodyPart.toLowerCase(),
      equipment:         ex.equipment.toLowerCase(),
      target_muscle:     ex.target.toLowerCase(),
      secondary_muscles: (ex.secondaryMuscles ?? []).map(m => m.toLowerCase()),
      gif_url:           ex.gifUrl || null,
      instructions:      ex.instructions ?? [],
      exercise_type:     mapExerciseType(ex.equipment, ex.bodyPart),
      is_custom:         false,
  }));

  let totalInserted = 0;
  let totalErrors = 0;
  const batches = Math.ceil(deduped.length / BATCH_SIZE);

  for (let b = 0; b < batches; b++) {
    const batch = deduped.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    process.stdout.write(`  🔄 Batch ${b + 1}/${batches} (${batch.length} exercises)… `);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/bulk_insert_exercises`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
      },
      body: JSON.stringify({ payload: batch }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Batch RPC failed: ${response.status} ${error}`);
      totalErrors += batch.length;
    } else {
      process.stdout.write(`✅\n`);
      totalInserted += batch.length;
    }

    // Small delay to avoid rate limiting
    if (b < batches - 1) await new Promise((r) => setTimeout(r, 200));
  }

  console.log('\n══════════════════════════════════════════');
  console.log(`✅ Import complete!`);
  console.log(`   Imported : ${totalInserted}`);
  console.log(`   Errors   : ${totalErrors}`);
}

// ── Alternative: fetch from exercisedb.io API (requires RapidAPI key) ──────

async function importFromAPI(apiKey: string) {
  console.log('📡 Fetching exercises from exercisedb.io API...');
  const baseUrl = 'https://exercisedb.p.rapidapi.com/exercises';
  const limit   = 100;
  let offset    = 0;
  let total     = 0;
  let imported  = 0;

  // First request to get total count
  const firstBatch = await fetchApiPage(apiKey, baseUrl, limit, 0);
  if (!firstBatch) { console.error('❌  API fetch failed'); return; }
  total = firstBatch.length > 0 ? 9999 : 0; // ExerciseDB doesn't return total count

  while (true) {
    const batch = await fetchApiPage(apiKey, baseUrl, limit, offset);
    if (!batch || batch.length === 0) break;

    const rows = batch.map((ex: KaggleExercise) => ({
      exercise_id:       ex.id,
      name:              toTitleCase(ex.name),
      body_part:         ex.bodyPart.toLowerCase(),
      equipment:         ex.equipment.toLowerCase(),
      target_muscle:     ex.target.toLowerCase(),
      secondary_muscles: (ex.secondaryMuscles ?? []).map((m: string) => m.toLowerCase()),
      gif_url:           ex.gifUrl || null,
      instructions:      ex.instructions ?? [],
      exercise_type:     mapExerciseType(ex.equipment, ex.bodyPart),
      is_custom:         false,
    }));

    const { error } = await supabase
      .from('exercises')
      .upsert(rows, { onConflict: 'exercise_id' });

    if (!error) {
      imported += batch.length;
      console.log(`  ⬆️  Imported ${imported} exercises so far...`);
    }

    offset += limit;
    if (batch.length < limit) break; // last page
    await sleep(300); // respect rate limits
  }

  console.log(`\n✅  API import complete! Total: ${imported}`);
}

function fetchApiPage(apiKey: string, url: string, limit: number, offset: number): Promise<KaggleExercise[] | null> {
  return new Promise((resolve) => {
    const fullUrl = `${url}?limit=${limit}&offset=${offset}`;
    const options = {
      hostname: 'exercisedb.p.rapidapi.com',
      path:     `/exercises?limit=${limit}&offset=${offset}`,
      headers:  {
        'X-RapidAPI-Key':  apiKey,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
    };
    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
  });
}

// ── Entry point ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args[0] === '--api' && args[1]) {
  importFromAPI(args[1]);
} else if (args[0]) {
  importFromFile(args[0]);
} else {
  console.log('Usage:');
  console.log('  # From Kaggle JSON file (recommended):');
  console.log('  npx tsx scripts/import-exercises.ts ./exercises.json');
  console.log('');
  console.log('  # From RapidAPI (requires API key):');
  console.log('  npx tsx scripts/import-exercises.ts --api YOUR_RAPIDAPI_KEY');
  console.log('');
  console.log('  Download dataset: https://www.kaggle.com/datasets/exercisedb/fitness-exercises-dataset');
  process.exit(0);
}

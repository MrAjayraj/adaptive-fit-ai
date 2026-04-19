/**
 * Exercise Import Script
 * ======================
 * Sources:
 *   1. exercises.csv  — ExerciseDB export (1324 exercises, full GIF URLs)
 *   2. free-exercise-db — 870+ exercises from GitHub (yuhonas/free-exercise-db)
 *
 * Usage:
 *   npx tsx scripts/import-exercises.ts ./exercises.csv
 *
 * Env vars required:
 *   VITE_SUPABASE_URL=https://your-project.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 *
 * Expected result: ~1300–1500 exercises imported.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// ── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL         = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const BATCH_SIZE           = 50;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── DB Row type ───────────────────────────────────────────────────────────────
interface ExerciseRow {
  external_id:       string | null;
  name:              string;
  body_part:         string;
  equipment:         string;
  target_muscle:     string;
  secondary_muscles: string[];
  instructions:      string[];
  gif_url:           string | null;
  image_url:         string | null;
  category:          string;
  difficulty:        string;
  exercise_type:     string;
  is_custom:         boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/** Determine exercise_type from equipment + body_part/category */
function inferExerciseType(equipment: string, bodyPart: string, category: string): string {
  const eq  = (equipment ?? '').toLowerCase();
  const bp  = (bodyPart  ?? '').toLowerCase();
  const cat = (category  ?? '').toLowerCase();

  if (cat === 'cardio'  || bp === 'cardio')    return 'distance_duration';
  if (cat === 'stretching')                    return 'duration';
  if (cat === 'plyometrics')                   return 'bodyweight_reps';
  if (eq  === 'body weight' || eq === 'body only') {
    if (['plank','hold','static','wall'].some(k => bp.includes(k))) return 'duration';
    return 'bodyweight_reps';
  }
  return 'weight_reps';
}

/** Map free-exercise-db category to our category values */
function mapCategory(cat: string): string {
  const c = (cat ?? '').toLowerCase();
  if (c === 'cardio')                return 'cardio';
  if (c === 'stretching')            return 'stretching';
  if (c === 'plyometrics')           return 'plyometrics';
  return 'strength';
}

/** Map free-exercise-db level to our difficulty */
function mapDifficulty(level: string): string {
  const l = (level ?? '').toLowerCase();
  if (l === 'beginner') return 'beginner';
  if (l === 'expert')   return 'expert';
  return 'intermediate';
}

// ── Parse CSV ─────────────────────────────────────────────────────────────────
// Columns: bodyPart, equipment, gifUrl, id, name, target,
//          secondaryMuscles/0..5, instructions/0..10

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function parseCSV(filePath: string): ExerciseRow[] {
  const raw     = fs.readFileSync(filePath, 'utf-8');
  const lines   = raw.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);

  const rows: ExerciseRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 6) continue;

    const get = (header: string): string => {
      const idx = headers.indexOf(header);
      return idx >= 0 ? (cols[idx] ?? '').trim() : '';
    };

    const bodyPart  = get('bodyPart').toLowerCase();
    const equipment = get('equipment').toLowerCase();
    const gifUrl    = get('gifUrl') || null;
    const exId      = get('id');
    const name      = get('name');
    const target    = get('target').toLowerCase();

    if (!name) continue;

    const secondaryMuscles: string[] = [];
    for (let j = 0; j <= 5; j++) {
      const m = get(`secondaryMuscles/${j}`);
      if (m) secondaryMuscles.push(m.toLowerCase());
    }

    const instructions: string[] = [];
    for (let j = 0; j <= 10; j++) {
      const inst = get(`instructions/${j}`);
      if (inst) instructions.push(inst);
    }

    rows.push({
      external_id:       exId || null,
      name:              toTitleCase(name),
      body_part:         bodyPart,
      equipment,
      target_muscle:     target,
      secondary_muscles: secondaryMuscles,
      instructions,
      gif_url:           gifUrl,
      image_url:         null,
      category:          'strength',
      difficulty:        'intermediate',
      exercise_type:     inferExerciseType(equipment, bodyPart, 'strength'),
      is_custom:         false,
    });
  }

  return rows;
}

// ── Fetch free-exercise-db ────────────────────────────────────────────────────

interface FreeExDBEntry {
  name:             string;
  level:            string;
  equipment:        string | null;
  primaryMuscles:   string[];
  secondaryMuscles: string[];
  instructions:     string[];
  category:         string;
  images:           string[];
}

const FREE_DB_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

function fetchJson(url: string): Promise<FreeExDBEntry[] | null> {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'import-script/1.0' } }, (res) => {
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

function mapFreeExDBEntry(e: FreeExDBEntry): ExerciseRow {
  const bodyPart  = (e.primaryMuscles?.[0] ?? 'full body').toLowerCase();
  const equipment = (e.equipment ?? 'body weight').toLowerCase()
    .replace('body only', 'body weight')
    .replace('other', 'machine');
  const cat       = mapCategory(e.category);
  const imageUrl  = e.images?.[0]
    ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${e.images[0]}`
    : null;

  return {
    external_id:       null,
    name:              toTitleCase(e.name),
    body_part:         bodyPart,
    equipment,
    target_muscle:     bodyPart,
    secondary_muscles: (e.secondaryMuscles ?? []).map((m: string) => m.toLowerCase()),
    instructions:      e.instructions ?? [],
    gif_url:           null,
    image_url:         imageUrl,
    category:          cat,
    difficulty:        mapDifficulty(e.level),
    exercise_type:     inferExerciseType(equipment, bodyPart, cat),
    is_custom:         false,
  };
}

// ── Merge + dedup ─────────────────────────────────────────────────────────────

function mergeExercises(primary: ExerciseRow[], secondary: ExerciseRow[]): ExerciseRow[] {
  const seen = new Map<string, ExerciseRow>();
  for (const ex of primary)   seen.set(ex.name.toLowerCase(), ex);
  for (const ex of secondary) {
    if (!seen.has(ex.name.toLowerCase())) seen.set(ex.name.toLowerCase(), ex);
  }
  return Array.from(seen.values());
}

// ── Batch upsert ──────────────────────────────────────────────────────────────

async function batchUpsert(exercises: ExerciseRow[]): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped  = 0;

  for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
    const batch = exercises.slice(i, i + BATCH_SIZE);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('exercises')
      .upsert(batch, { onConflict: 'name' });

    if (error) {
      console.error(`\n  ⚠️  Batch ${Math.floor(i / BATCH_SIZE) + 1} error: ${error.message}`);
      skipped += batch.length;
    } else {
      imported += batch.length;
      const pct = Math.round((imported / exercises.length) * 100);
      process.stdout.write(`\r  ⬆️  Progress: ${imported}/${exercises.length} (${pct}%)`);
    }

    await sleep(60);
  }

  return { imported, skipped };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: npx tsx scripts/import-exercises.ts ./exercises.csv');
    process.exit(1);
  }

  const resolved = path.resolve(csvPath);
  if (!fs.existsSync(resolved)) {
    console.error(`❌  File not found: ${resolved}`);
    process.exit(1);
  }

  // 1. Parse CSV
  console.log(`📂 Parsing CSV: ${resolved}`);
  const csvExercises = parseCSV(resolved);
  console.log(`✅  Parsed ${csvExercises.length} exercises from CSV`);

  // 2. Fetch free-exercise-db
  console.log('\n📡 Fetching free-exercise-db from GitHub...');
  const freeDbRaw = await fetchJson(FREE_DB_URL);
  const freeDbExercises: ExerciseRow[] = freeDbRaw
    ? freeDbRaw.map(mapFreeExDBEntry)
    : [];
  console.log(`✅  Fetched ${freeDbExercises.length} exercises from free-exercise-db`);

  // 3. Merge
  const merged = mergeExercises(csvExercises, freeDbExercises);
  console.log(`\n🔀 Merged total: ${merged.length} unique exercises\n`);

  // 4. Upsert
  const { imported, skipped } = await batchUpsert(merged);
  console.log('\n');

  // 5. Verify
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from('exercises')
    .select('*', { count: 'exact', head: true });

  console.log('✅  Import complete!');
  console.log(`   Imported : ${imported}`);
  console.log(`   Skipped  : ${skipped}`);
  console.log(`   DB total : ${count}`);

  // 6. Distribution
  console.log('\n📊 Body part distribution:');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: all } = await (supabase as any)
    .from('exercises')
    .select('body_part');

  if (all) {
    const grouped: Record<string, number> = {};
    for (const r of all as { body_part: string }[]) {
      grouped[r.body_part] = (grouped[r.body_part] ?? 0) + 1;
    }
    for (const [bp, cnt] of Object.entries(grouped).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${bp.padEnd(22)} ${cnt}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

// src/services/dailyTrackerService.ts
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as never) as any;

const todayStr = () => new Date().toISOString().split('T')[0];

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MoodLog {
  id: string;
  user_id: string;
  log_date: string;
  mood_score: number;
  mood_tags: string[];
  energy_level: number | null;
  sleep_quality: number | null;
  stress_level: number | null;
  soreness_level: number | null;
  note: string | null;
  logged_at: string;
}

export interface TrackerItem {
  id: string;
  user_id: string;
  title: string;
  category: string;
  icon: string;
  tracker_type: 'binary' | 'numeric' | 'duration';
  target_value: number;
  unit: string | null;
  is_recurring: boolean;
  recurrence_type: string;
  recurrence_days: number[];
  sort_order: number;
  is_active: boolean;
  color: string;
  created_at: string;
  // merged from tracker_completions
  completion?: TrackerCompletion | null;
}

export interface TrackerCompletion {
  id: string;
  tracker_id: string;
  completion_date: string;
  is_completed: boolean;
  current_value: number;
  completed_at: string | null;
}

export interface DailyScore {
  id: string;
  user_id: string;
  score_date: string;
  total_score: number;
  task_completion_pct: number;
  streak_bonus: number;
  mood_score_pct: number;
  workout_bonus: number;
  trackers_completed: number;
  trackers_total: number;
  workout_completed: boolean;
  workout_name: string | null;
  mood: number | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isActiveForDate(tracker: TrackerItem, date: string): boolean {
  if (!tracker.is_active) return false;
  if (tracker.recurrence_type === 'daily') return true;
  const d = new Date(date + 'T12:00:00');
  const dow = d.getDay() === 0 ? 7 : d.getDay(); // 1=Mon, 7=Sun
  if (tracker.recurrence_type === 'weekdays') return dow <= 5;
  if (tracker.recurrence_type === 'weekends') return dow >= 6;
  if (tracker.recurrence_type === 'custom') return (tracker.recurrence_days ?? []).includes(dow);
  return true;
}

// ── Mood ───────────────────────────────────────────────────────────────────────

export async function logMood(
  userId: string,
  data: {
    mood_score: number;
    mood_tags?: string[];
    energy_level?: number | null;
    sleep_quality?: number | null;
    stress_level?: number | null;
    soreness_level?: number | null;
    note?: string;
  },
  date = todayStr()
): Promise<MoodLog | null> {
  const { data: result, error } = await db('daily_mood_logs')
    .upsert(
      {
        user_id: userId,
        log_date: date,
        mood_score: data.mood_score,
        mood_tags: data.mood_tags ?? [],
        energy_level: data.energy_level ?? null,
        sleep_quality: data.sleep_quality ?? null,
        stress_level: data.stress_level ?? null,
        soreness_level: data.soreness_level ?? null,
        note: data.note ?? null,
        logged_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,log_date' }
    )
    .select()
    .maybeSingle();

  if (error) { console.error('[Mood] logMood:', error); return null; }
  await calculateDailyScore(userId, date);
  return result as MoodLog;
}

export async function getTodayMood(userId: string, date = todayStr()): Promise<MoodLog | null> {
  const { data, error } = await db('daily_mood_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', date)
    .maybeSingle();
  if (error) return null;
  return data as MoodLog | null;
}

export async function getMoodHistory(userId: string, days = 30): Promise<MoodLog[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];
  const { data, error } = await db('daily_mood_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', sinceStr)
    .order('log_date', { ascending: true });
  if (error) return [];
  return (data ?? []) as MoodLog[];
}

// ── Trackers ───────────────────────────────────────────────────────────────────

export async function getUserTrackers(userId: string, date = todayStr()): Promise<TrackerItem[]> {
  const { data: items, error: itemsErr } = await db('tracker_items')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (itemsErr) { console.error('[Tracker] getUserTrackers:', itemsErr); return []; }

  const trackerIds = ((items ?? []) as TrackerItem[]).map(t => t.id);
  const completionMap = new Map<string, TrackerCompletion>();

  if (trackerIds.length > 0) {
    const { data: completions } = await db('tracker_completions')
      .select('*')
      .eq('user_id', userId)
      .eq('completion_date', date)
      .in('tracker_id', trackerIds);

    for (const c of (completions ?? []) as TrackerCompletion[]) {
      completionMap.set(c.tracker_id, c);
    }
  }

  return ((items ?? []) as TrackerItem[]).map(t => ({
    ...t,
    completion: completionMap.get(t.id) ?? null,
  }));
}

export async function createTracker(userId: string, data: Partial<TrackerItem>): Promise<TrackerItem | null> {
  const { data: result, error } = await db('tracker_items')
    .insert({
      user_id: userId,
      title: data.title,
      category: data.category ?? 'habit',
      icon: data.icon ?? '✓',
      tracker_type: data.tracker_type ?? 'binary',
      target_value: data.target_value ?? 1,
      unit: data.unit ?? null,
      is_recurring: true,
      recurrence_type: data.recurrence_type ?? 'daily',
      recurrence_days: data.recurrence_days ?? [1, 2, 3, 4, 5, 6, 7],
      sort_order: data.sort_order ?? 99,
      is_active: true,
      color: data.color ?? '#0CFF9C',
    })
    .select()
    .maybeSingle();

  if (error) { console.error('[Tracker] createTracker:', error); return null; }
  return result as TrackerItem;
}

export async function deleteTracker(trackerId: string): Promise<void> {
  await db('tracker_items').update({ is_active: false }).eq('id', trackerId);
}

export async function toggleTrackerCompletion(
  userId: string,
  trackerId: string,
  date = todayStr()
): Promise<boolean> {
  const { data: existing } = await db('tracker_completions')
    .select('is_completed')
    .eq('tracker_id', trackerId)
    .eq('completion_date', date)
    .maybeSingle();

  const nowCompleted = !(existing?.is_completed ?? false);

  await db('tracker_completions').upsert(
    {
      user_id: userId,
      tracker_id: trackerId,
      completion_date: date,
      is_completed: nowCompleted,
      current_value: nowCompleted ? 1 : 0,
      completed_at: nowCompleted ? new Date().toISOString() : null,
    },
    { onConflict: 'tracker_id,completion_date' }
  );

  await calculateDailyScore(userId, date);
  return nowCompleted;
}

export async function updateTrackerValue(
  userId: string,
  trackerId: string,
  value: number,
  targetValue: number,
  date = todayStr()
): Promise<void> {
  const isCompleted = value >= targetValue;
  await db('tracker_completions').upsert(
    {
      user_id: userId,
      tracker_id: trackerId,
      completion_date: date,
      is_completed: isCompleted,
      current_value: value,
      completed_at: isCompleted ? new Date().toISOString() : null,
    },
    { onConflict: 'tracker_id,completion_date' }
  );
  await calculateDailyScore(userId, date);
}

export async function createDefaultTrackers(userId: string): Promise<void> {
  const { data: existing } = await db('tracker_items')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if ((existing ?? []).length > 0) return; // already seeded

  const defaults = [
    { title: 'Water Intake',       category: 'hydration',    icon: '💧', tracker_type: 'numeric',  target_value: 3,     unit: 'liters',   color: '#3B82F6', sort_order: 0 },
    { title: 'Protein Goal',       category: 'nutrition',    icon: '🥩', tracker_type: 'numeric',  target_value: 150,   unit: 'grams',    color: '#F97316', sort_order: 1 },
    { title: 'Sleep',              category: 'sleep',        icon: '😴', tracker_type: 'duration', target_value: 8,     unit: 'hours',    color: '#8B5CF6', sort_order: 2 },
    { title: 'Take Supplements',   category: 'supplement',   icon: '💊', tracker_type: 'binary',   target_value: 1,     unit: null,       color: '#10B981', sort_order: 3 },
    { title: '10K Steps',          category: 'movement',     icon: '🚶', tracker_type: 'numeric',  target_value: 10000, unit: 'steps',    color: '#06B6D4', sort_order: 4 },
    { title: 'Stretch / Mobility', category: 'movement',     icon: '🧘', tracker_type: 'duration', target_value: 10,    unit: 'minutes',  color: '#EC4899', sort_order: 5 },
    { title: 'No Junk Food',       category: 'nutrition',    icon: '🚫', tracker_type: 'binary',   target_value: 1,     unit: null,       color: '#EF4444', sort_order: 6 },
    { title: 'Read / Learn',       category: 'mindfulness',  icon: '📖', tracker_type: 'duration', target_value: 20,    unit: 'minutes',  color: '#F59E0B', sort_order: 7 },
  ];

  await db('tracker_items').insert(
    defaults.map(d => ({
      user_id: userId,
      ...d,
      is_recurring: true,
      recurrence_type: 'daily',
      recurrence_days: [1, 2, 3, 4, 5, 6, 7],
      is_active: true,
    }))
  );
}

// ── Daily Score ────────────────────────────────────────────────────────────────

export async function calculateDailyScore(userId: string, date = todayStr()): Promise<DailyScore | null> {
  // Step 1: trackers for today
  const trackers = await getUserTrackers(userId, date);
  const todayTrackers = trackers.filter(t => isActiveForDate(t, date));
  const completedCount = todayTrackers.filter(t => t.completion?.is_completed).length;

  // Step 2: mood
  const { data: moodRow } = await db('daily_mood_logs')
    .select('mood_score')
    .eq('user_id', userId)
    .eq('log_date', date)
    .maybeSingle();

  // Step 3: workout completed today (uses date string + completed flag)
  const { data: workoutRow } = await db('workouts')
    .select('id, title')
    .eq('user_id', userId)
    .eq('completed', true)
    .eq('date', date)
    .maybeSingle();

  // Step 4: streak (best-effort — table may vary)
  let streakVal = 0;
  try {
    const { data: streakRow } = await db('user_streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .maybeSingle();
    streakVal = streakRow?.current_streak ?? 0;
  } catch { /* streak table may not exist — skip */ }

  // Step 5: calculate score
  const taskPct      = todayTrackers.length > 0 ? (completedCount / todayTrackers.length) * 100 : 0;
  const streakBonus  = Math.min(streakVal * 2, 20);
  const moodPct      = moodRow?.mood_score ? (moodRow.mood_score / 5) * 100 : 50;
  const workoutBonus = workoutRow ? 10 : 0;
  const total = Math.round((taskPct * 0.50) + streakBonus + (moodPct * 0.20) + workoutBonus);

  const payload = {
    user_id: userId,
    score_date: date,
    total_score: Math.min(total, 100),
    task_completion_pct: taskPct,
    streak_bonus: streakBonus,
    mood_score_pct: moodPct,
    workout_bonus: workoutBonus,
    trackers_completed: completedCount,
    trackers_total: todayTrackers.length,
    workout_completed: !!workoutRow,
    workout_name: workoutRow?.title ?? null,
    mood: moodRow?.mood_score ?? null,
  };

  const { data: result, error } = await db('daily_scores')
    .upsert(payload, { onConflict: 'user_id,score_date' })
    .select()
    .maybeSingle();

  if (error) { console.error('[Score] calculateDailyScore:', error); return null; }
  return result as DailyScore;
}

export async function getDailyScore(userId: string, date = todayStr()): Promise<DailyScore | null> {
  const { data, error } = await db('daily_scores')
    .select('*')
    .eq('user_id', userId)
    .eq('score_date', date)
    .maybeSingle();
  if (error) return null;
  return data as DailyScore | null;
}

export async function getScoreHistory(userId: string, days = 30): Promise<DailyScore[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await db('daily_scores')
    .select('*')
    .eq('user_id', userId)
    .gte('score_date', since.toISOString().split('T')[0])
    .order('score_date', { ascending: true });
  if (error) return [];
  return (data ?? []) as DailyScore[];
}

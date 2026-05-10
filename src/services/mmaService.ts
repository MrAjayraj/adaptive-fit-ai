import { supabase } from '@/integrations/supabase/client';
import type {
  Sport, TechniqueCategory, Technique, UserFighterProfile,
  TechniqueProgress, SessionLog
} from '@/types/mma';

// ─── SPORT ICONS (emoji mapping) ─────────────────────────────────────────────
export const SPORT_ICONS: Record<string, string> = {
  boxing: '🥊', muay_thai: '🦵', kickboxing: '🥋', wrestling: '🤼',
  bjj: '🥋', judo: '🎽', karate: '✋', taekwondo: '🦵', sambo: '🤼', mma: '⚔️',
};

// ─── MASTERY SYSTEM ───────────────────────────────────────────────────────────
const STRIKING_SPORTS = ['boxing', 'muay_thai', 'kickboxing', 'karate', 'taekwondo'];
const GRAPPLING_SPORTS = ['wrestling', 'bjj', 'judo', 'sambo'];

export interface MasteryLevel {
  level: number;
  name: string;
  reps: number;
  color: string;
}

export function getMasteryLevels(sportSlug: string, experienceLevel?: string | null): MasteryLevel[] {
  const beginner = experienceLevel === 'beginner';
  const mult = beginner ? 0.6 : 1;

  if (GRAPPLING_SPORTS.includes(sportSlug)) {
    return [
      { level: 1, name: 'Unfamiliar', reps: 0, color: '#555' },
      { level: 2, name: 'Learning', reps: Math.round(50 * mult), color: '#3B82F6' },
      { level: 3, name: 'Drilling', reps: Math.round(300 * mult), color: '#14B8A6' },
      { level: 4, name: 'Ingraining', reps: Math.round(1200 * mult), color: '#22C55E' },
      { level: 5, name: 'Automatic', reps: Math.round(5000 * mult), color: '#F59E0B' },
      { level: 6, name: 'Reflexive', reps: Math.round(20000 * mult), color: '#EF4444' },
    ];
  }
  return [
    { level: 1, name: 'Raw', reps: 0, color: '#555' },
    { level: 2, name: 'Building', reps: Math.round(100 * mult), color: '#3B82F6' },
    { level: 3, name: 'Developing', reps: Math.round(500 * mult), color: '#14B8A6' },
    { level: 4, name: 'Reliable', reps: Math.round(2000 * mult), color: '#22C55E' },
    { level: 5, name: 'Sharp', reps: Math.round(8000 * mult), color: '#F59E0B' },
    { level: 6, name: 'Elite', reps: Math.round(25000 * mult), color: '#EF4444' },
  ];
}

export function computeMasteryLevel(totalReps: number, sportSlug: string, experienceLevel?: string | null): number {
  const levels = getMasteryLevels(sportSlug, experienceLevel);
  let level = 1;
  for (const l of levels) {
    if (totalReps >= l.reps) level = l.level;
  }
  return level;
}

export function getFighterTitle(totalReps: number): string {
  if (totalReps >= 150000) return 'Master Technician';
  if (totalReps >= 50000) return 'Elite Fighter';
  if (totalReps >= 15000) return 'Dedicated Technician';
  if (totalReps >= 5000) return 'Consistent Practitioner';
  if (totalReps >= 1000) return 'Blue Collar Fighter';
  return 'White Belt';
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
export async function getFighterProfile(userId: string): Promise<UserFighterProfile | null> {
  const { data, error } = await supabase
    .from('user_fighter_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching fighter profile:', error);
    return null;
  }
  return data;
}

export async function saveFighterProfile(profile: Partial<UserFighterProfile> & { user_id: string }): Promise<UserFighterProfile | null> {
  const { data, error } = await supabase
    .from('user_fighter_profiles')
    .upsert(profile, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) { console.error('Error saving fighter profile:', error); return null; }
  return data;
}

// ─── CATALOG ──────────────────────────────────────────────────────────────────
export async function getSports(): Promise<Sport[]> {
  const cached = localStorage.getItem('mma_sports_cache');
  if (cached) { try { return JSON.parse(cached); } catch { /* */ } }
  const { data, error } = await supabase.from('sports').select('*');
  if (error) { console.error('Error fetching sports:', error); return []; }
  if (data) localStorage.setItem('mma_sports_cache', JSON.stringify(data));
  return data || [];
}

export async function getTechniqueCatalog(): Promise<any[]> {
  const cached = localStorage.getItem('mma_catalog_cache_v2');
  if (cached) { try { return JSON.parse(cached); } catch { /* */ } }
  const { data, error } = await supabase
    .from('sports')
    .select(`*, technique_categories(*, techniques(*))`);
  if (error) { console.error('Error fetching catalog:', error); return []; }
  const result = data || [];
  localStorage.setItem('mma_catalog_cache_v2', JSON.stringify(result));
  return result;
}

export async function getTechniquesByCategory(categoryId: string): Promise<Technique[]> {
  const { data, error } = await supabase
    .from('techniques')
    .select('*')
    .eq('category_id', categoryId)
    .order('difficulty', { ascending: true });
  if (error) { console.error('Error fetching techniques:', error); return []; }
  return data || [];
}

export async function getTechniqueById(techniqueId: string): Promise<Technique | null> {
  const { data, error } = await supabase
    .from('techniques')
    .select('*')
    .eq('id', techniqueId)
    .single();
  if (error) { return null; }
  return data;
}

// ─── PROGRESS ─────────────────────────────────────────────────────────────────
export async function getUserProgress(userId: string): Promise<Record<string, TechniqueProgress>> {
  const { data } = await supabase
    .from('technique_progress')
    .select('*')
    .eq('user_id', userId);
  const map: Record<string, TechniqueProgress> = {};
  (data || []).forEach(item => { map[item.technique_id] = item; });
  return map;
}

export async function getRecentTechniques(userId: string, days = 7): Promise<string[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase
    .from('technique_progress')
    .select('technique_id, last_logged_at')
    .eq('user_id', userId)
    .gte('last_logged_at', since)
    .order('last_logged_at', { ascending: false })
    .limit(5);
  return (data || []).map(d => d.technique_id);
}

export async function getSessionHistory(userId: string, techniqueId: string, limit = 10): Promise<SessionLog[]> {
  const { data } = await supabase
    .from('session_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('technique_id', techniqueId)
    .order('id', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getWeeklyReps(userId: string): Promise<number> {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data } = await supabase
    .from('session_logs')
    .select('reps, sets')
    .eq('user_id', userId)
    .gte('id', '00000000-0000-0000-0000-000000000000'); // get all, filter by created time not available
  // We'll query training_sessions for the time range
  const { data: sessions } = await supabase
    .from('training_sessions')
    .select('id')
    .eq('user_id', userId)
    .gte('started_at', since);
  if (!sessions?.length) return 0;
  const sessionIds = sessions.map(s => s.id);
  const { data: logs } = await supabase
    .from('session_logs')
    .select('reps, sets')
    .in('session_id', sessionIds);
  return (logs || []).reduce((sum, l) => sum + (l.reps || 0) * (l.sets || 1), 0);
}

export async function getWeeklyStats(userId: string): Promise<{ sessions: number; reps: number; sportsCount: number }> {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: sessions } = await supabase
    .from('training_sessions')
    .select('id')
    .eq('user_id', userId)
    .gte('started_at', since);
  if (!sessions?.length) return { sessions: 0, reps: 0, sportsCount: 0 };

  const sessionIds = sessions.map(s => s.id);
  const { data: logs } = await supabase
    .from('session_logs')
    .select('reps, sets, technique_id')
    .in('session_id', sessionIds);
  const totalReps = (logs || []).reduce((sum, l) => sum + (l.reps || 0) * (l.sets || 1), 0);
  return { sessions: sessions.length, reps: totalReps, sportsCount: 0 };
}

export async function getWeeklyRepChart(userId: string, weeks = 8): Promise<number[]> {
  const result: number[] = new Array(weeks).fill(0);
  for (let i = 0; i < weeks; i++) {
    const from = new Date(Date.now() - (i + 1) * 7 * 86400000).toISOString();
    const to = new Date(Date.now() - i * 7 * 86400000).toISOString();
    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('id')
      .eq('user_id', userId)
      .gte('started_at', from)
      .lte('started_at', to);
    if (sessions?.length) {
      const { data: logs } = await supabase
        .from('session_logs')
        .select('reps, sets')
        .in('session_id', sessions.map(s => s.id));
      result[weeks - 1 - i] = (logs || []).reduce((sum, l) => sum + (l.reps || 0) * (l.sets || 1), 0);
    }
  }
  return result;
}

// ─── LOG SESSION ──────────────────────────────────────────────────────────────
export async function logSession(
  userId: string,
  techniqueId: string,
  reps: number,
  sets: number,
  trainingType: string,
  intensity: string,
  notes?: string,
  existingSessionId?: string
) {
  let sessionId = existingSessionId;
  if (!sessionId) {
    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .insert({ user_id: userId, started_at: new Date().toISOString(), ended_at: new Date().toISOString(), duration_minutes: 0 })
      .select()
      .single();
    if (sessionError || !session) { console.error('Error creating session:', sessionError); return null; }
    sessionId = session.id;
  }

  const { data: log, error: logError } = await supabase
    .from('session_logs')
    .insert({ user_id: userId, session_id: sessionId, technique_id: techniqueId, reps, sets, training_type: trainingType, intensity, notes: notes || null })
    .select()
    .single();
  if (logError) { console.error('Error creating session log:', logError); return null; }

  // Upsert progress
  const { data: currentProgress } = await supabase
    .from('technique_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('technique_id', techniqueId)
    .single();

  const totalReps = (currentProgress?.total_reps || 0) + reps * sets;

  // Basic mastery calc (sport-agnostic simplified)
  let masteryLevel = 1;
  if (totalReps >= 25000) masteryLevel = 6;
  else if (totalReps >= 8000) masteryLevel = 5;
  else if (totalReps >= 2000) masteryLevel = 4;
  else if (totalReps >= 500) masteryLevel = 3;
  else if (totalReps >= 100) masteryLevel = 2;

  const prevLevel = currentProgress?.mastery_level || 1;

  await supabase
    .from('technique_progress')
    .upsert({
      user_id: userId,
      technique_id: techniqueId,
      total_reps: totalReps,
      mastery_level: masteryLevel,
      last_logged_at: new Date().toISOString()
    }, { onConflict: 'user_id,technique_id' });

  // Update streak
  const { data: profile } = await supabase
    .from('user_fighter_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profile) {
    const today = new Date().toISOString().split('T')[0];
    if (profile.streak_last_logged_date !== today) {
      await supabase
        .from('user_fighter_profiles')
        .update({
          streak_current: (profile.streak_current || 0) + 1,
          streak_longest: Math.max((profile.streak_longest || 0), (profile.streak_current || 0) + 1),
          streak_last_logged_date: today
        })
        .eq('user_id', userId);
    }
  }

  const leveledUp = masteryLevel > prevLevel;
  return { log, sessionId, leveledUp, newLevel: masteryLevel, totalReps };
}

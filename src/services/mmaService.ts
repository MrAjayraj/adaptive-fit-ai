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
  if (userId === 'guest') {
    const cached = localStorage.getItem('mma_guest_profile');
    return cached ? JSON.parse(cached) : null;
  }
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
  if (profile.user_id === 'guest') {
    const existingStr = localStorage.getItem('mma_guest_profile');
    const existing = existingStr ? JSON.parse(existingStr) : null;
    const localProfile: UserFighterProfile = {
      id: existing?.id || crypto.randomUUID(),
      user_id: 'guest',
      primary_sport_slug: profile.primary_sport_slug || existing?.primary_sport_slug || 'mma',
      experience_level: profile.experience_level || existing?.experience_level || 'beginner',
      stance: profile.stance || existing?.stance || 'Orthodox',
      onboarding_complete: profile.onboarding_complete ?? existing?.onboarding_complete ?? true,
      streak_current: profile.streak_current ?? existing?.streak_current ?? 0,
      streak_longest: profile.streak_longest ?? existing?.streak_longest ?? 0,
      streak_last_logged_date: profile.streak_last_logged_date ?? existing?.streak_last_logged_date ?? null,
      streak_shields_available: profile.streak_shields_available ?? existing?.streak_shields_available ?? 1,
      streak_shield_last_used_at: profile.streak_shield_last_used_at ?? existing?.streak_shield_last_used_at ?? null,
    };
    localStorage.setItem('mma_guest_profile', JSON.stringify(localProfile));
    return localProfile;
  }

  // First check if a profile already exists
  const { data: existing, error: fetchError } = await supabase
    .from('user_fighter_profiles')
    .select('id')
    .eq('user_id', profile.user_id)
    .maybeSingle();

  if (fetchError) {
    console.error('Error checking existing profile:', fetchError);
  }

  let result;
  if (existing) {
    // Update existing profile
    const { data, error } = await supabase
      .from('user_fighter_profiles')
      .update(profile)
      .eq('user_id', profile.user_id)
      .select()
      .single();
    result = { data, error };
  } else {
    // Insert new profile
    const { data, error } = await supabase
      .from('user_fighter_profiles')
      .insert([profile])
      .select()
      .single();
    result = { data, error };
  }

  if (result.error) {
    console.error('Error saving fighter profile:', result.error);
    throw result.error;
  }
  return result.data;
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
  return (data as unknown as Technique[]) || [];
}

export async function getTechniqueById(techniqueId: string): Promise<Technique | null> {
  const { data, error } = await supabase
    .from('techniques')
    .select('*')
    .eq('id', techniqueId)
    .single();
  if (error) { return null; }
  return data as unknown as Technique;
}

// ─── PROGRESS ─────────────────────────────────────────────────────────────────
export async function getUserProgress(userId: string): Promise<Record<string, TechniqueProgress>> {
  if (userId === 'guest') {
    const cached = localStorage.getItem('mma_guest_progress');
    return cached ? JSON.parse(cached) : {};
  }
  const { data } = await supabase
    .from('technique_progress')
    .select('*')
    .eq('user_id', userId);
  const map: Record<string, TechniqueProgress> = {};
  (data || []).forEach(item => { map[item.technique_id] = item; });
  return map;
}

export async function getRecentTechniques(userId: string, days = 7): Promise<string[]> {
  if (userId === 'guest') {
    const cached = localStorage.getItem('mma_guest_progress');
    if (!cached) return [];
    const progressMap: Record<string, TechniqueProgress> = JSON.parse(cached);
    const since = Date.now() - days * 86400000;
    return Object.values(progressMap)
      .filter(p => p.last_logged_at && new Date(p.last_logged_at).getTime() >= since)
      .sort((a, b) => new Date(b.last_logged_at).getTime() - new Date(a.last_logged_at).getTime())
      .slice(0, 5)
      .map(p => p.technique_id);
  }
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
  if (userId === 'guest') {
    const cached = localStorage.getItem('mma_guest_session_logs');
    if (!cached) return [];
    const logs: SessionLog[] = JSON.parse(cached);
    return logs
      .filter(l => l.user_id === 'guest' && l.technique_id === techniqueId)
      .sort((a, b) => {
        const timeA = (a as any).logged_at ? new Date((a as any).logged_at).getTime() : 0;
        const timeB = (b as any).logged_at ? new Date((b as any).logged_at).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, limit);
  }
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
  if (userId === 'guest') {
    const cached = localStorage.getItem('mma_guest_session_logs');
    if (!cached) return 0;
    const logs: SessionLog[] = JSON.parse(cached);
    const since = Date.now() - 7 * 86400000;
    return logs
      .filter(l => {
        const loggedDate = (l as any).logged_at || new Date().toISOString();
        return new Date(loggedDate).getTime() >= since;
      })
      .reduce((sum, l) => sum + (l.reps || 0) * (l.sets || 1), 0);
  }
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
  if (userId === 'guest') {
    const cachedSessions = localStorage.getItem('mma_guest_training_sessions');
    const cachedLogs = localStorage.getItem('mma_guest_session_logs');
    const sessions = cachedSessions ? JSON.parse(cachedSessions) : [];
    const logs = cachedLogs ? JSON.parse(cachedLogs) : [];
    const since = Date.now() - 7 * 86400000;
    
    const weeklySessions = sessions.filter((s: any) => new Date(s.started_at).getTime() >= since);
    const sessionIds = weeklySessions.map((s: any) => s.id);
    const weeklyLogs = logs.filter((l: any) => sessionIds.includes(l.session_id));
    
    const totalReps = weeklyLogs.reduce((sum: number, l: any) => sum + (l.reps || 0) * (l.sets || 1), 0);
    return { sessions: weeklySessions.length, reps: totalReps, sportsCount: 0 };
  }
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
  if (userId === 'guest') {
    const cachedSessions = localStorage.getItem('mma_guest_training_sessions');
    const cachedLogs = localStorage.getItem('mma_guest_session_logs');
    const sessions = cachedSessions ? JSON.parse(cachedSessions) : [];
    const logs = cachedLogs ? JSON.parse(cachedLogs) : [];
    
    const result: number[] = new Array(weeks).fill(0);
    for (let i = 0; i < weeks; i++) {
      const from = Date.now() - (i + 1) * 7 * 86400000;
      const to = Date.now() - i * 7 * 86400000;
      
      const periodSessions = sessions.filter((s: any) => {
        const time = new Date(s.started_at).getTime();
        return time >= from && time <= to;
      });
      const sessionIds = periodSessions.map((s: any) => s.id);
      const periodLogs = logs.filter((l: any) => sessionIds.includes(l.session_id));
      
      result[weeks - 1 - i] = periodLogs.reduce((sum: number, l: any) => sum + (l.reps || 0) * (l.sets || 1), 0);
    }
    return result;
  }
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
  if (userId === 'guest') {
    let sessionId = existingSessionId;
    const cachedSessions = localStorage.getItem('mma_guest_training_sessions');
    const sessions = cachedSessions ? JSON.parse(cachedSessions) : [];
    
    if (!sessionId) {
      const newSession = {
        id: crypto.randomUUID(),
        user_id: 'guest',
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        duration_minutes: 0
      };
      sessions.push(newSession);
      localStorage.setItem('mma_guest_training_sessions', JSON.stringify(sessions));
      sessionId = newSession.id;
    }
    
    const cachedLogs = localStorage.getItem('mma_guest_session_logs');
    const logs = cachedLogs ? JSON.parse(cachedLogs) : [];
    const newLog = {
      id: crypto.randomUUID(),
      user_id: 'guest',
      session_id: sessionId,
      technique_id: techniqueId,
      reps,
      sets,
      training_type: trainingType,
      intensity,
      notes: notes || null,
      logged_at: new Date().toISOString()
    };
    logs.push(newLog);
    localStorage.setItem('mma_guest_session_logs', JSON.stringify(logs));
    
    // Upsert Progress
    const cachedProgress = localStorage.getItem('mma_guest_progress');
    const progressMap = cachedProgress ? JSON.parse(cachedProgress) : {};
    const currentProgress = progressMap[techniqueId] || null;
    
    const totalReps = (currentProgress?.total_reps || 0) + reps * sets;
    
    let masteryLevel = 1;
    if (totalReps >= 25000) masteryLevel = 6;
    else if (totalReps >= 8000) masteryLevel = 5;
    else if (totalReps >= 2000) masteryLevel = 4;
    else if (totalReps >= 500) masteryLevel = 3;
    else if (totalReps >= 100) masteryLevel = 2;
    
    const prevLevel = currentProgress?.mastery_level || 1;
    
    progressMap[techniqueId] = {
      id: currentProgress?.id || crypto.randomUUID(),
      user_id: 'guest',
      technique_id: techniqueId,
      total_reps: totalReps,
      mastery_level: masteryLevel,
      last_logged_at: new Date().toISOString()
    };
    localStorage.setItem('mma_guest_progress', JSON.stringify(progressMap));
    
    // Update streak in guest profile
    const cachedProfile = localStorage.getItem('mma_guest_profile');
    const profile = cachedProfile ? JSON.parse(cachedProfile) : null;
    
    if (profile) {
      const today = new Date().toISOString().split('T')[0];
      if (profile.streak_last_logged_date !== today) {
        profile.streak_current = (profile.streak_current || 0) + 1;
        profile.streak_longest = Math.max((profile.streak_longest || 0), profile.streak_current);
        profile.streak_last_logged_date = today;
        localStorage.setItem('mma_guest_profile', JSON.stringify(profile));
      }
    }
    
    const leveledUp = masteryLevel > prevLevel;
    return { log: newLog, sessionId, leveledUp, newLevel: masteryLevel, totalReps };
  }

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

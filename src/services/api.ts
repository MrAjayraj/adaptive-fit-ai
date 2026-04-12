import { supabase } from '@/integrations/supabase/client';

// ─── Local ID for guest users ───
const LOCAL_ID_KEY = 'fitai-local-id';

export function getLocalId(): string {
  let id = localStorage.getItem(LOCAL_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LOCAL_ID_KEY, id);
  }
  return id;
}

// ─── Identity Helper ───
export async function getIdentity() {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;
  const localId = getLocalId(); // Always get localId so we can link guest accounts
  return { userId, localId };
}

// ─── Profile ───
export interface ProfileRow {
  id: string;
  user_id: string | null;
  local_id: string | null;
  name: string;
  age: number;
  gender: string;
  height: number;
  body_fat: number | null;
  goal: string;
  experience: string;
  days_per_week: number;
  preferred_split: string;
  activity_level: string;
  goal_weight_kg: number | null;
  unit_preference: string;
  workout_days: number[];
  onboarding_complete: boolean;
  avatar_url: string | null;
}

export async function fetchProfile(): Promise<ProfileRow | null> {
  const { userId, localId } = await getIdentity();

  // Try to find the authenticated profile first
  if (userId) {
    const { data: authProfile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (authProfile) return authProfile as ProfileRow;
  }

  // Hand off to localId if no authenticated profile was found (e.g., they just signed in and haven't linked)
  if (localId) {
    const { data: guestProfile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('local_id', localId)
      // Make sure we aren't fetching a guest profile that already belongs to someone else
      .is('user_id', null)
      .maybeSingle();

    if (error) throw error;
    if (guestProfile) return guestProfile as ProfileRow;
  }

  return null;
}

export async function upsertProfile(profile: Partial<ProfileRow>): Promise<ProfileRow | null> {
  const { userId, localId } = await getIdentity();
  const existing = await fetchProfile();

    // If we have an authenticated user on this device, link any orphaned local data.
    // This ensures that any data logged previously as a guest on this device is tied to the auth account.
    if (userId && localId) {
      await supabase.from('weight_logs').update({ user_id: userId } as any).eq('local_id', localId).is('user_id', null);
      await supabase.from('body_stats_log').update({ user_id: userId } as any).eq('local_id', localId).is('user_id', null);
      await supabase.from('user_streaks').update({ user_id: userId } as any).eq('local_id', localId).is('user_id', null);
      await supabase.from('daily_missions').update({ user_id: userId } as any).eq('local_id', localId).is('user_id', null);
      await supabase.from('user_achievements').update({ user_id: userId } as any).eq('local_id', localId).is('user_id', null);
    }

  if (existing) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        ...profile, 
        user_id: userId || existing.user_id, // Link to the new user_id if we authenticated
        updated_at: new Date().toISOString() 
      } as Record<string, unknown>)
      .eq('id', existing.id)
      .select()
      .single();
      
    if (error) {
      console.error('updateProfile error:', error);
      throw error;
    }
    
    return data as ProfileRow | null;
  }

  // If no existing profile, perform a clean upsert
  // We avoid passing local_id for authenticated users to prevent UNIQUE(local_id) violations
  // if this device was previously used by another account.
  const payload: Record<string, unknown> = { ...profile };
  delete payload.id;
  
  if (userId) {
    payload.user_id = userId;
  } else {
    // Only guest accounts strictly require local_id on profile creation
    payload.local_id = localId;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      payload,
      { onConflict: userId ? 'user_id' : 'local_id' }
    )
    .select()
    .single();
    
  if (error) {
    console.error('upsertProfile error:', error);
    throw error;
  }
  return data as ProfileRow | null;
}

// ─── Weight Logs ───
export interface WeightLogRow {
  id: string;
  user_id: string | null;
  local_id: string | null;
  weight: number;
  logged_at: string;
  created_at: string;
}

export async function fetchWeightLogs(): Promise<WeightLogRow[]> {
  const { userId, localId } = await getIdentity();
  let query = supabase.from('weight_logs').select('*').order('logged_at', { ascending: false });
  
  if (userId) {
    query = query.eq('user_id', userId);
  } else if (localId) {
    query = query.eq('local_id', localId);
  } else {
    return [];
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as WeightLogRow[] | null) ?? [];
}

export async function addWeightLog(weight: number, date?: string): Promise<WeightLogRow | null> {
  const { userId, localId } = await getIdentity();
  const logDate = date || new Date().toISOString().split('T')[0];

  let query = supabase.from('weight_logs').select('id').eq('logged_at', logDate);
  if (userId) query = query.eq('user_id', userId);
  else if (localId) query = query.eq('local_id', localId);

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('weight_logs')
      .update({ weight } as Record<string, unknown>)
      .eq('id', (existing as { id: string }).id)
      .select()
      .single();
    if (error) throw error;
    return data as WeightLogRow | null;
  }

  const { data, error } = await supabase
    .from('weight_logs')
    .insert([{ weight, user_id: userId, local_id: localId, logged_at: logDate }])
    .select()
    .single();
  if (error) throw error;
  return data as WeightLogRow | null;
}

export async function deleteWeightLog(id: string): Promise<void> {
  const { error } = await supabase.from('weight_logs').delete().eq('id', id);
  if (error) throw error;
}

// ─── Avatar Upload ───
const AVATAR_LS_KEY = 'fitai-avatar-url';

export function getCachedAvatarUrl(): string | null {
  return localStorage.getItem(AVATAR_LS_KEY);
}

export async function uploadAvatar(file: File): Promise<string | null> {
  const { userId, localId } = await getIdentity();
  const pathId = userId || localId;

  // Try Supabase Storage first
  if (pathId) {
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `avatars/${pathId}.${ext}`;
      const { error } = await supabase.storage
        .from('user-avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (!error) {
        const { data: urlData } = supabase.storage.from('user-avatars').getPublicUrl(path);
        const url = urlData?.publicUrl ?? null;
        if (url) {
          localStorage.setItem(AVATAR_LS_KEY, url);
          // Persist to profile row
          const existing = await fetchProfile();
          if (existing) {
            await supabase
              .from('user_profiles')
              .update({ avatar_url: url } as Record<string, unknown>)
              .eq('id', existing.id);
          }
          return url;
        }
      }
    } catch { /* fall through to base64 */ }
  }

  // Fallback: store as base64 data URL in localStorage
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      try {
        localStorage.setItem(AVATAR_LS_KEY, dataUrl);
      } catch {
        // localStorage quota exceeded — skip caching, return the data URL anyway
        console.warn('localStorage quota exceeded, avatar not cached locally.');
      }
      resolve(dataUrl);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export async function getLatestWeight(): Promise<number | null> {
  const { userId, localId } = await getIdentity();
  let query = supabase.from('weight_logs').select('weight').order('logged_at', { ascending: false }).limit(1);
  
  if (userId) query = query.eq('user_id', userId);
  else if (localId) query = query.eq('local_id', localId);
  else return null;

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return (data as { weight: number }).weight;
}

// ─── Daily Steps ───
export async function fetchTodaySteps(): Promise<number> {
  const { userId } = await getIdentity();
  if (!userId) return 0;
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('daily_steps')
    .select('step_count')
    .eq('user_id', userId)
    .eq('step_date', today)
    .maybeSingle();
  return (data as { step_count: number } | null)?.step_count ?? 0;
}

export async function upsertTodaySteps(stepCount: number): Promise<void> {
  const { userId } = await getIdentity();
  if (!userId) return;
  const today = new Date().toISOString().split('T')[0];
  await supabase
    .from('daily_steps')
    .upsert(
      { user_id: userId, step_date: today, step_count: stepCount, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,step_date' }
    );
}

// ─── Profile field update (single-field optimistic save) ───
export async function updateProfileField(fields: Partial<Record<string, unknown>>): Promise<void> {
  const { userId } = await getIdentity();
  if (!userId) return;
  await supabase
    .from('user_profiles')
    .update({ ...fields, updated_at: new Date().toISOString() } as Record<string, unknown>)
    .eq('user_id', userId);
}

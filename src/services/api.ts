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
  onboarding_complete: boolean;
}

export async function fetchProfile(): Promise<ProfileRow | null> {
  const localId = getLocalId();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('local_id', localId)
    .maybeSingle();
  if (error) console.error('fetchProfile error:', error);
  return data as ProfileRow | null;
}

export async function upsertProfile(profile: Partial<ProfileRow>): Promise<ProfileRow | null> {
  const localId = getLocalId();
  const existing = await fetchProfile();

  if (existing) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ ...profile, updated_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) console.error('updateProfile error:', error);
    return data as ProfileRow | null;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .insert({ ...profile, local_id: localId } as Record<string, unknown>)
    .select()
    .single();
  if (error) console.error('insertProfile error:', error);
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
  const localId = getLocalId();
  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('local_id', localId)
    .order('logged_at', { ascending: false });
  if (error) console.error('fetchWeightLogs error:', error);
  return (data as WeightLogRow[] | null) ?? [];
}

export async function addWeightLog(weight: number): Promise<WeightLogRow | null> {
  const localId = getLocalId();
  const today = new Date().toISOString().split('T')[0];

  // Check if there's already a log for today — update it
  const { data: existing } = await supabase
    .from('weight_logs')
    .select('id')
    .eq('local_id', localId)
    .eq('logged_at', today)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('weight_logs')
      .update({ weight } as Record<string, unknown>)
      .eq('id', (existing as { id: string }).id)
      .select()
      .single();
    if (error) console.error('updateWeightLog error:', error);
    return data as WeightLogRow | null;
  }

  const { data, error } = await supabase
    .from('weight_logs')
    .insert([{ weight, local_id: localId, logged_at: today }])
    .select()
    .single();
  if (error) console.error('addWeightLog error:', error);
  return data as WeightLogRow | null;
}

export async function getLatestWeight(): Promise<number | null> {
  const localId = getLocalId();
  const { data, error } = await supabase
    .from('weight_logs')
    .select('weight')
    .eq('local_id', localId)
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { weight: number }).weight;
}

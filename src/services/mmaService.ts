import { supabase } from '@/lib/supabase';
import type { 
  Sport, TechniqueCategory, Technique, UserFighterProfile, 
  TechniqueProgress, SessionLog 
} from '@/types/mma';

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
    
  if (error) {
    console.error('Error saving fighter profile:', error);
    return null;
  }
  return data;
}

export async function getSports(): Promise<Sport[]> {
  const { data, error } = await supabase
    .from('sports')
    .select('*');
    
  if (error) {
    console.error('Error fetching sports:', error);
    return [];
  }
  return data || [];
}

export async function getCategoriesBySport(sportId: string): Promise<TechniqueCategory[]> {
  const { data, error } = await supabase
    .from('technique_categories')
    .select('*')
    .eq('sport_id', sportId)
    .order('display_order', { ascending: true });
    
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data || [];
}

export async function getTechniquesByCategory(categoryId: string): Promise<Technique[]> {
  const { data, error } = await supabase
    .from('techniques')
    .select('*')
    .eq('category_id', categoryId);
    
  if (error) {
    console.error('Error fetching techniques:', error);
    return [];
  }
  return data || [];
}

// Optimized fetch for caching all catalog data at once
export async function getTechniqueCatalog() {
  const { data, error } = await supabase
    .from('sports')
    .select(`
      *,
      technique_categories (
        *,
        techniques (*)
      )
    `);
    
  if (error) {
    console.error('Error fetching full catalog:', error);
    return [];
  }
  return data || [];
}

export async function logSession(
  userId: string, 
  techniqueId: string, 
  reps: number, 
  sets: number, 
  trainingType: string, 
  intensity: string, 
  notes?: string
) {
  // Create a minimal session (for Mode A single technique logs)
  const { data: session, error: sessionError } = await supabase
    .from('training_sessions')
    .insert({
      user_id: userId,
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      duration_minutes: 0,
    })
    .select()
    .single();
    
  if (sessionError || !session) {
    console.error('Error creating session:', sessionError);
    return null;
  }
  
  const { data: log, error: logError } = await supabase
    .from('session_logs')
    .insert({
      user_id: userId,
      session_id: session.id,
      technique_id: techniqueId,
      reps,
      sets,
      training_type: trainingType,
      intensity,
      notes: notes || null
    })
    .select()
    .single();
    
  if (logError) {
    console.error('Error creating session log:', logError);
    return null;
  }
  
  // Upsert progress
  const { data: currentProgress } = await supabase
    .from('technique_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('technique_id', techniqueId)
    .single();
    
  const totalReps = (currentProgress?.total_reps || 0) + reps;
  
  // Very basic mastery calculation (will be moved to DB or enhanced later)
  let masteryLevel = 1;
  if (totalReps >= 100) masteryLevel = 2;
  if (totalReps >= 500) masteryLevel = 3;
  if (totalReps >= 2000) masteryLevel = 4;
  if (totalReps >= 8000) masteryLevel = 5;
  if (totalReps >= 25000) masteryLevel = 6;
  
  await supabase
    .from('technique_progress')
    .upsert({
      user_id: userId,
      technique_id: techniqueId,
      total_reps: totalReps,
      mastery_level: masteryLevel,
      last_logged_at: new Date().toISOString()
    }, { onConflict: 'user_id,technique_id' });
    
  // Update streak logic (simplified for now)
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

  return log;
}

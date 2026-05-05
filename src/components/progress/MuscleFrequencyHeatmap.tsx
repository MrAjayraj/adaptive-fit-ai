import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMuscleFrequency } from '@/hooks/useProgressStats';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import Body, { ExtendedBodyPart, Slug } from 'react-muscle-highlighter';
import { supabase } from '@/integrations/supabase/client';

// ─── Muscle slug mapping ──────────────────────────────────────────────────────

function getSlug(muscleName: string): Slug | null {
  const name = muscleName.toLowerCase();
  if (name.includes('chest') || name.includes('pectoral')) return 'chest';
  if (name.includes('bicep')) return 'biceps';
  if (name.includes('tricep')) return 'triceps';
  if (name.includes('shoulder') || name.includes('delt') || name.includes('front delt') || name.includes('side delt')) return 'deltoids';
  if (name.includes('upper back') || name.includes('rhomboid') || name.includes('lower back')) return 'upper-back';
  if (name.includes('lat')) return 'upper-back';
  if (name.includes('trap')) return 'trapezius';
  if (name.includes('quad') || name.includes('thigh')) return 'quadriceps';
  if (name.includes('hamstring')) return 'hamstring';
  if (name.includes('glute') || name.includes('hip')) return 'gluteal';
  if (name.includes('calf') || name.includes('calves')) return 'calves';
  if (name.includes('ab') || name.includes('core') || name.includes('rectus')) return 'abs';
  if (name.includes('oblique')) return 'obliques';
  if (name.includes('forearm') || name.includes('wrist')) return 'forearm';
  if (name.includes('neck')) return 'neck';
  if (name.includes('adduct')) return 'adductors';
  if (name.includes('abduct')) return 'adductors';
  if (name.includes('spine') || name.includes('erector')) return 'upper-back'; // erector spinae → upper-back is closest valid slug
  return null;
}

// ─── Fallback: extract muscle data directly from completed workouts JSONB ─────

async function getMuscleSetsFromJSONB(
  userId: string
): Promise<Record<string, number>> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data } = await supabase
    .from('workouts' as any)
    .select('exercises, date')
    .eq('user_id', userId)
    .or('status.eq.completed,completed.eq.true')
    .gte('date', oneWeekAgo.toISOString().split('T')[0]);

  const muscleCount: Record<string, number> = {};
  const workoutRows = (data as any[]) ?? [];

  for (const row of workoutRows) {
    const exercises: any[] = row.exercises ?? [];
    for (const ex of exercises) {
      const muscle: string = ex.target_muscle || ex.body_part || '';
      if (!muscle) continue;
      const completedSets = (ex.sets ?? []).filter((s: any) => s.is_completed).length;
      if (completedSets > 0) {
        muscleCount[muscle] = (muscleCount[muscle] ?? 0) + 1;
      }
    }
  }

  return muscleCount;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MuscleFrequencyHeatmap() {
  const { user } = useAuth();
  const { data: viewData, loading } = useMuscleFrequency(user?.id);
  const [view, setView] = useState<'front' | 'back'>('front');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  // JSONB fallback when view has no data
  const [jsonbData, setJsonbData] = React.useState<Record<string, number>>({});
  const [jsonbLoaded, setJsonbLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!user?.id || loading) return;
    const hasViewData = Object.keys(viewData ?? {}).length > 0;
    if (hasViewData) return; // view has data — no fallback needed

    getMuscleSetsFromJSONB(user.id).then(result => {
      setJsonbData(result);
      setJsonbLoaded(true);
    });
  }, [user?.id, loading, viewData]);

  // Build body data: prefer muscle_volume_view, fall back to JSONB counts
  const hasViewData = Object.keys(viewData ?? {}).length > 0;

  let bodyData: ExtendedBodyPart[] = [];

  if (hasViewData) {
    bodyData = Object.entries(viewData ?? {}).flatMap(([muscle, info]: [string, any]) => {
      const slug = getSlug(muscle);
      if (!slug) return [];
      const freq = info.sessions_this_week ?? 0;
      let intensity = 0;
      if (freq === 1) intensity = 1;
      else if (freq === 2) intensity = 2;
      else if (freq >= 3) intensity = 3;
      if (intensity === 0) return [];
      return [{ slug, intensity } as ExtendedBodyPart];
    });
  } else if (jsonbLoaded) {
    bodyData = Object.entries(jsonbData).flatMap(([muscle, count]) => {
      const slug = getSlug(muscle);
      if (!slug) return [];
      let intensity = 0;
      if (count === 1) intensity = 1;
      else if (count === 2) intensity = 2;
      else if (count >= 3) intensity = 3;
      if (intensity === 0) return [];
      return [{ slug, intensity } as ExtendedBodyPart];
    });
  }

  const isLoading = loading && !jsonbLoaded;

  // Selected muscle tooltip
  const getSelectedInfo = () => {
    if (!selectedMuscle) return null;
    if (hasViewData) {
      const key = Object.keys(viewData ?? {}).find(k => getSlug(k) === selectedMuscle);
      if (key) return { name: key, sessions: viewData[key]?.sessions_this_week ?? 0 };
    }
    const key = Object.keys(jsonbData).find(k => getSlug(k) === selectedMuscle);
    if (key) return { name: key, sessions: jsonbData[key] ?? 0 };
    return null;
  };

  const selectedInfo = getSelectedInfo();

  // Gender-specific heatmap colors
  const maleColors = ['#7f1d1d', '#dc2626', '#ef4444'];     // red intensity scale
  const femaleColors = ['#4c1d95', '#7c3aed', '#a78bfa'];   // purple intensity scale
  const heatColors = gender === 'male' ? maleColors : femaleColors;

  return (
    <div className="bg-[#1a1a1a] p-4 rounded-xl shadow-lg border border-white/5 mb-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-red-500" />
          Muscle Heatmap
          <span className="text-xs text-gray-500 font-normal ml-1">This Week</span>
        </h3>

        <div className="flex gap-2">
          {/* Gender Toggle */}
          <div className="flex bg-black/50 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setGender('male')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${gender === 'male' ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:text-white'}`}
            >
              ♂ Male
            </button>
            <button
              onClick={() => setGender('female')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${gender === 'female' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'}`}
            >
              ♀ Female
            </button>
          </div>

          {/* Front / Back Toggle */}
          <div className="flex bg-black/50 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setView('front')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${view === 'front' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Front
            </button>
            <button
              onClick={() => setView('back')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${view === 'back' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Body diagram */}
      <div className="relative flex justify-center py-4 min-h-[380px]">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500">
            <div className="w-8 h-8 rounded-full border-2 border-gray-700 border-t-red-500 animate-spin" />
            <span className="text-sm">Loading muscle data…</span>
          </div>
        ) : (
          <motion.div
            key={`${view}-${gender}`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="relative w-full flex justify-center items-center"
          >
            {bodyData.length === 0 ? (
              /* Empty state overlay — still show the body model */
              <div className="flex flex-col items-center gap-4 py-8">
                <Body
                  data={[]}
                  side={view}
                  gender={gender}
                  scale={1.25}
                  colors={heatColors}
                  border="#333333"
                  defaultFill="#2a2a2a"
                />
                <div className="absolute bottom-4 text-center">
                  <p className="text-sm text-gray-500">No training data this week</p>
                  <p className="text-xs text-gray-600 mt-1">Complete workouts to see highlighted muscles</p>
                </div>
              </div>
            ) : (
              <Body
                data={bodyData}
                side={view}
                gender={gender}
                scale={1.3}
                colors={heatColors}
                onBodyPartPress={(part) => setSelectedMuscle(part.slug ?? null)}
                border="#333333"
                defaultFill="#2a2a2a"
              />
            )}

            {/* Selected muscle tooltip */}
            {selectedInfo && (
              <div className="absolute top-2 right-2 bg-black/90 border border-white/10 p-3 rounded-xl shadow-2xl">
                <button
                  onClick={() => setSelectedMuscle(null)}
                  className="absolute top-1.5 right-2 text-gray-500 hover:text-white text-xs leading-none"
                >×</button>
                <p className="text-sm font-semibold text-white capitalize pr-4">{selectedInfo.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedInfo.sessions} session{selectedInfo.sessions !== 1 ? 's' : ''} this week
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#2a2a2a] border border-white/10" />
          Untrained
        </div>
        {['1 Session', '2 Sessions', '3+ Sessions'].map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: heatColors[i] }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

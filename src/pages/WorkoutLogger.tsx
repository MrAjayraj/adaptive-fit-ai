/**
 * WorkoutLogger — /workout
 * Active workout screen (JSONB-based, no separate set tables).
 *
 * Architecture:
 *   workoutId → load workouts row → exercises JSONB column
 *   All mutations: fetch exercises → update in JS → single UPDATE to workouts row
 *
 * Features:
 *   - Elapsed timer (top-right)
 *   - Exercise tabs (horizontal scroll chips)
 *   - Set table: SET | KG | REPS | ✓
 *   - Add / remove sets per exercise
 *   - Add exercise mid-workout (inline search drawer)
 *   - Finish / Cancel workout
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Check, Plus, Minus, Timer, X, Search, Loader2,
  ChevronLeft, ChevronRight, Dumbbell, Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  getWorkoutById,
  getActiveWorkout,
  completeWorkout,
  cancelWorkout,
  searchExercises,
} from '@/services/workoutService';
import { supabase } from '@/integrations/supabase/client';
import type {
  ActiveWorkout,
  WorkoutExerciseEntry,
  WorkoutSet,
  Exercise,
} from '@/services/workoutService';
import BottomNav from '@/components/layout/BottomNav';

// ── Design tokens ──────────────────────────────────────────────────────────────
const ACCENT     = '#0CFF9C';
const BG         = '#0C1015';
const SURFACE    = '#141A1F';
const SURFACE_UP = '#1C2429';
const T1         = '#EAEEF2';
const T2         = '#8899AA';
const T3         = '#4A5568';
const GREEN_GLOW = 'rgba(12,255,156,0.08)';

// ── Timer ─────────────────────────────────────────────────────────────────────
function useElapsedTimer(startedAt: string | null | undefined) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const base = startedAt ? new Date(startedAt).getTime() : Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - base) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const str = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return str;
}

// ── Exercise thumbnail ────────────────────────────────────────────────────────
function ExThumb({ ex }: { ex: Exercise }) {
  const [err, setErr] = useState(false);
  const url = ex.gif_url ?? ex.image_url;
  const colors: Record<string, string> = {
    chest: '#ef4444', back: '#3b82f6', shoulders: '#a855f7',
    'upper arms': '#f97316', 'lower arms': '#f59e0b',
    'upper legs': '#10b981', 'lower legs': '#14b8a6',
    waist: '#8b5cf6', cardio: '#ec4899', neck: '#64748b',
  };
  const bg = colors[ex.body_part] ?? '#4A5568';

  if (url && !err) {
    return (
      <img src={url} alt="" loading="lazy" onError={() => setErr(true)}
        style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 8,
      background: `${bg}22`, border: `1px solid ${bg}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: 16, fontWeight: 700, color: bg,
    }}>
      {ex.name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Add exercise drawer ───────────────────────────────────────────────────────
function AddExerciseDrawer({
  onAdd, onClose,
}: {
  onAdd: (ex: Exercise) => void;
  onClose: () => void;
}) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<Exercise[]>([]);
  const [loading, setLoading]   = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      const data = await searchExercises(query, {}, 60);
      setResults(data);
      setLoading(false);
    }, 280);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      style={{
        position: 'fixed', inset: 0, top: 'auto', bottom: 0,
        height: '80dvh', background: '#0F151A',
        borderRadius: '20px 20px 0 0',
        border: '1px solid rgba(255,255,255,0.08)',
        zIndex: 100, display: 'flex', flexDirection: 'column',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
      }}
    >
      {/* Handle */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px 12px', gap: 10 }}>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: T1 }}>Add Exercise</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <X style={{ width: 18, height: 18, color: T2 }} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '0 16px 12px', position: 'relative' }}>
        <Search style={{ position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: T3 }} />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search exercises…"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: SURFACE_UP, border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '10px 12px 10px 36px',
            fontSize: 14, color: T1, outline: 'none',
          }}
        />
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <Loader2 style={{ width: 20, height: 20, color: ACCENT, animation: 'spin 1s linear infinite' }} />
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: T3, fontSize: 14 }}>
            {query ? 'No exercises found' : 'Start typing to search'}
          </div>
        ) : (
          results.map(ex => (
            <motion.div
              key={ex.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onAdd(ex)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: SURFACE, borderRadius: 10, padding: '10px 12px',
                marginBottom: 8, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {/* Fake thumb */}
              <div style={{
                width: 40, height: 40, borderRadius: 8, background: SURFACE_UP,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 16, fontWeight: 700, color: T3,
              }}>
                {ex.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ex.name}
                </div>
                <div style={{ fontSize: 12, color: T3, marginTop: 1, textTransform: 'capitalize' }}>
                  {ex.body_part} · {ex.equipment}
                </div>
              </div>
              <Plus style={{ width: 16, height: 16, color: ACCENT, flexShrink: 0 }} />
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ── Set row ───────────────────────────────────────────────────────────────────
function SetRow({
  set,
  setIndex,
  onWeightChange,
  onRepsChange,
  onComplete,
  onRemove,
}: {
  set: WorkoutSet;
  setIndex: number;
  onWeightChange: (v: number) => void;
  onRepsChange: (v: number) => void;
  onComplete: () => void;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: set.is_completed ? 'rgba(12,255,156,0.04)' : 'transparent',
        borderRadius: 10, padding: '8px 4px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        opacity: set.is_completed ? 0.75 : 1,
      }}
    >
      {/* Set number */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: set.is_completed ? ACCENT : SURFACE_UP,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 11, fontWeight: 800,
        color: set.is_completed ? '#0C1015' : T3,
      }}>
        {set.set_number}
      </div>

      {/* Weight input */}
      <div style={{ flex: 1, textAlign: 'center' }}>
        <input
          type="number"
          value={set.weight_kg || ''}
          onChange={e => onWeightChange(parseFloat(e.target.value) || 0)}
          placeholder="0"
          style={{
            width: '100%', textAlign: 'center',
            background: SURFACE_UP, border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, padding: '8px 4px',
            fontSize: 16, fontWeight: 700, color: T1, outline: 'none',
          }}
        />
      </div>

      {/* Reps input */}
      <div style={{ flex: 1, textAlign: 'center' }}>
        <input
          type="number"
          value={set.reps || ''}
          onChange={e => onRepsChange(parseInt(e.target.value) || 0)}
          placeholder="0"
          style={{
            width: '100%', textAlign: 'center',
            background: SURFACE_UP, border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, padding: '8px 4px',
            fontSize: 16, fontWeight: 700, color: T1, outline: 'none',
          }}
        />
      </div>

      {/* Complete button */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onComplete}
        style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0, border: 'none',
          background: set.is_completed ? ACCENT : SURFACE_UP,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <Check style={{ width: 14, height: 14, color: set.is_completed ? '#0C1015' : T3, strokeWidth: 3 }} />
      </motion.button>

      {/* Remove */}
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}
      >
        <X style={{ width: 13, height: 13, color: T3 }} />
      </button>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function WorkoutLogger() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user }  = useAuth();

  // workoutId from navigation state or active workout
  const [workoutId, setWorkoutId]     = useState<string | null>(
    (location.state as { workoutId?: string })?.workoutId ?? null
  );
  const [workout, setWorkout]         = useState<ActiveWorkout | null>(null);
  const [exercises, setExercises]     = useState<WorkoutExerciseEntry[]>([]);
  const [activeIdx, setActiveIdx]     = useState(0);
  const [loading, setLoading]         = useState(true);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [finishing, setFinishing]     = useState(false);
  const [saving, setSaving]           = useState(false); // debounce save indicator

  const timer = useElapsedTimer(workout?.started_at);

  // ── Load workout ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        let w: ActiveWorkout | null = null;

        if (workoutId) {
          w = await getWorkoutById(workoutId);
        }
        if (!w) {
          w = await getActiveWorkout(user!.id);
        }

        if (!cancelled && w) {
          setWorkout(w);
          setWorkoutId(w.id);
          setExercises(w.exercises ?? []);
        } else if (!cancelled) {
          // No active workout — redirect back
          navigate('/workout-hub', { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Sync local exercise state back to Supabase (debounced) ───────────────────
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workoutIdRef = useRef<string | null>(workoutId);
  useEffect(() => { workoutIdRef.current = workoutId; }, [workoutId]);

  function scheduleSync(newExercises: WorkoutExerciseEntry[]) {
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    setSaving(true);
    syncTimeout.current = setTimeout(async () => {
      const id = workoutIdRef.current;
      if (!id) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('workouts').update({ exercises: newExercises }).eq('id', id);
      setSaving(false);
    }, 800);
  }

  // ── Optimistic exercise mutations ─────────────────────────────────────────────
  function mutateExercises(updater: (prev: WorkoutExerciseEntry[]) => WorkoutExerciseEntry[]) {
    setExercises(prev => {
      const next = updater(prev);
      scheduleSync(next);
      return next;
    });
  }

  function handleUpdateWeight(exIdx: number, setIdx: number, value: number) {
    mutateExercises(prev => {
      const next = prev.map((ex, i) => i !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, weight_kg: value }),
      });
      return next;
    });
  }

  function handleUpdateReps(exIdx: number, setIdx: number, value: number) {
    mutateExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, reps: value }),
    }));
  }

  function handleCompleteSet(exIdx: number, setIdx: number) {
    mutateExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, is_completed: !s.is_completed }),
    }));
  }

  function handleAddSet(exIdx: number) {
    mutateExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      const last = ex.sets[ex.sets.length - 1];
      const newSet: WorkoutSet = {
        set_number:   ex.sets.length + 1,
        weight_kg:    last?.weight_kg ?? 0,
        reps:         last?.reps ?? 10,
        duration_sec: null,
        distance_km:  null,
        is_completed: false,
        is_pr:        false,
        pr_type:      null,
        rest_seconds: 90,
      };
      return { ...ex, sets: [...ex.sets, newSet] };
    }));
  }

  function handleRemoveSet(exIdx: number, setIdx: number) {
    mutateExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      const updated = ex.sets.filter((_, j) => j !== setIdx)
        .map((s, j) => ({ ...s, set_number: j + 1 }));
      return { ...ex, sets: updated };
    }));
  }

  function handleRemoveExercise(exIdx: number) {
    mutateExercises(prev => prev.filter((_, i) => i !== exIdx));
    setActiveIdx(prev => Math.max(0, prev - 1));
  }

  async function handleAddExercise(ex: Exercise) {
    if (!workoutId) return;
    setShowAddDrawer(false);
    const entry: WorkoutExerciseEntry = {
      exercise_id:        ex.id,
      name:               ex.name,
      gif_url:            ex.gif_url,
      body_part:          ex.body_part,
      target_muscle:      ex.target_muscle,
      exercise_type:      ex.exercise_type,
      notes:              '',
      rest_timer_seconds: 90,
      sets: [{
        set_number: 1, weight_kg: 0, reps: 10,
        duration_sec: null, distance_km: null,
        is_completed: false, is_pr: false, pr_type: null, rest_seconds: 90,
      }],
    };
    mutateExercises(prev => {
      const next = [...prev, entry];
      // Jump to new exercise
      setTimeout(() => setActiveIdx(next.length - 1), 50);
      return next;
    });
  }

  // ── Finish workout ───────────────────────────────────────────────────────────
  async function handleFinish() {
    if (!workoutId || finishing) return;
    setFinishing(true);

    // Flush pending sync first
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('workouts').update({ exercises }).eq('id', workoutId);

    const summary = await completeWorkout(workoutId);
    setFinishing(false);

    if (summary) {
      // Map WorkoutSummaryData → WorkoutSummary page's SummaryState format
      navigate('/workout-summary', {
        state: {
          workoutName:    summary.name,
          workoutType:    'strength' as const,
          duration:       summary.duration,
          caloriesBurned: summary.caloriesBurned,
          totalSets:      summary.totalSets,
          totalVolume:    summary.totalVolume,
          prCount:        summary.prCount,
          xpEarned:       summary.xpEarned,
          rpEarned:       summary.rpEarned,
        },
      });
    } else {
      navigate('/workout-hub');
    }
  }

  async function handleCancel() {
    if (!workoutId) return;
    await cancelWorkout(workoutId);
    navigate('/workout-hub');
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: BG, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 28, height: 28, color: ACCENT, animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!workout) return null;

  const currentEx = exercises[activeIdx] ?? null;
  const completedSets = exercises.reduce((n, ex) => n + ex.sets.filter(s => s.is_completed).length, 0);
  const totalSets     = exercises.reduce((n, ex) => n + ex.sets.length, 0);

  return (
    <div style={{ background: BG, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(12,16,21,0.97)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        padding: 'max(12px, env(safe-area-inset-top)) 16px 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Name + sets progress */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {workout.name}
            </div>
            <div style={{ fontSize: 12, color: T3, marginTop: 1 }}>
              {completedSets}/{totalSets} sets · {exercises.length} exercises
            </div>
          </div>

          {/* Timer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: SURFACE_UP, borderRadius: 20, padding: '6px 12px',
          }}>
            <Timer style={{ width: 12, height: 12, color: ACCENT }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T1, fontVariantNumeric: 'tabular-nums' }}>
              {timer}
            </span>
          </div>

          {/* Cancel */}
          <button
            onClick={handleCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          >
            <X style={{ width: 18, height: 18, color: T3 }} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: SURFACE_UP, borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: ACCENT, borderRadius: 4,
            width: totalSets > 0 ? `${Math.round(completedSets / totalSets * 100)}%` : '0%',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* ── Exercise tabs ── */}
      {exercises.length > 0 && (
        <div style={{
          display: 'flex', gap: 6,
          padding: '10px 16px',
          overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          {exercises.map((ex, i) => {
            const done = ex.sets.filter(s => s.is_completed).length;
            const total = ex.sets.length;
            const allDone = done === total && total > 0;
            const isActive = i === activeIdx;
            return (
              <button
                key={`${ex.exercise_id}-${i}`}
                onClick={() => setActiveIdx(i)}
                style={{
                  flexShrink: 0,
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: isActive
                    ? `1.5px solid ${ACCENT}`
                    : '1px solid rgba(255,255,255,0.06)',
                  background: isActive ? 'rgba(12,255,156,0.08)' : SURFACE_UP,
                  color: isActive ? ACCENT : allDone ? T2 : T3,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {allDone && <Check style={{ width: 10, height: 10, strokeWidth: 3 }} />}
                {ex.name.length > 14 ? ex.name.slice(0, 13) + '…' : ex.name}
                <span style={{ color: isActive ? ACCENT : T3, opacity: 0.7 }}>
                  {done}/{total}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Current exercise ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 120px' }}>
        {exercises.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <Dumbbell style={{ width: 32, height: 32, color: T3, margin: '0 auto 12px' }} />
            <div style={{ fontSize: 15, color: T2, fontWeight: 600 }}>No exercises yet</div>
            <div style={{ fontSize: 13, color: T3, marginTop: 4 }}>Tap "+ Add Exercise" below</div>
          </div>
        ) : currentEx ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              {/* Exercise header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T1 }}>{currentEx.name}</div>
                  <div style={{ fontSize: 12, color: T3, marginTop: 2, textTransform: 'capitalize' }}>
                    {currentEx.body_part} · {currentEx.exercise_type.replace(/_/g, ' ')}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveExercise(activeIdx)}
                  style={{ background: SURFACE_UP, border: 'none', cursor: 'pointer', borderRadius: 8, padding: 8, display: 'flex', alignItems: 'center' }}
                >
                  <X style={{ width: 14, height: 14, color: T3 }} />
                </button>
              </div>

              {/* Column headers */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 4px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                marginBottom: 4,
              }}>
                <div style={{ width: 28, fontSize: 10, fontWeight: 700, color: T3, textAlign: 'center', textTransform: 'uppercase' }}>Set</div>
                <div style={{ flex: 1, fontSize: 10, fontWeight: 700, color: T3, textAlign: 'center', textTransform: 'uppercase' }}>kg</div>
                <div style={{ flex: 1, fontSize: 10, fontWeight: 700, color: T3, textAlign: 'center', textTransform: 'uppercase' }}>reps</div>
                <div style={{ width: 36, fontSize: 10, fontWeight: 700, color: T3, textAlign: 'center', textTransform: 'uppercase' }}>✓</div>
                <div style={{ width: 24 }} />
              </div>

              {/* Sets */}
              <AnimatePresence>
                {currentEx.sets.map((set, setIdx) => (
                  <SetRow
                    key={setIdx}
                    set={set}
                    setIndex={setIdx}
                    onWeightChange={v => handleUpdateWeight(activeIdx, setIdx, v)}
                    onRepsChange={v => handleUpdateReps(activeIdx, setIdx, v)}
                    onComplete={() => handleCompleteSet(activeIdx, setIdx)}
                    onRemove={() => handleRemoveSet(activeIdx, setIdx)}
                  />
                ))}
              </AnimatePresence>

              {/* Add set */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => handleAddSet(activeIdx)}
                style={{
                  width: '100%', height: 40,
                  background: 'transparent',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: 10, marginTop: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  cursor: 'pointer',
                }}
              >
                <Plus style={{ width: 14, height: 14, color: T3 }} />
                <span style={{ fontSize: 13, color: T3, fontWeight: 600 }}>Add Set</span>
              </motion.button>

              {/* Next exercise nav */}
              {exercises.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 8 }}>
                  <button
                    onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
                    disabled={activeIdx === 0}
                    style={{
                      flex: 1, height: 40, background: SURFACE_UP, border: 'none',
                      borderRadius: 10, cursor: activeIdx === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      color: activeIdx === 0 ? T3 : T2, fontSize: 13, fontWeight: 600,
                    }}
                  >
                    <ChevronLeft style={{ width: 14, height: 14 }} />
                    Prev
                  </button>
                  <button
                    onClick={() => setActiveIdx(i => Math.min(exercises.length - 1, i + 1))}
                    disabled={activeIdx === exercises.length - 1}
                    style={{
                      flex: 1, height: 40, background: SURFACE_UP, border: 'none',
                      borderRadius: 10, cursor: activeIdx === exercises.length - 1 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      color: activeIdx === exercises.length - 1 ? T3 : T2, fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Next
                    <ChevronRight style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      {/* ── Bottom actions ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'rgba(12,16,21,0.98)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        padding: '10px 16px max(16px, env(safe-area-inset-bottom))',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', gap: 10,
      }}>
        {/* Add exercise */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAddDrawer(true)}
          style={{
            flex: 1, height: 48, background: SURFACE_UP,
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            cursor: 'pointer', color: T2, fontSize: 13, fontWeight: 600,
          }}
        >
          <Plus style={{ width: 15, height: 15 }} />
          Add Exercise
        </motion.button>

        {/* Finish */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleFinish}
          disabled={finishing}
          style={{
            flex: 2, height: 48,
            background: finishing ? SURFACE_UP : ACCENT,
            color: finishing ? T3 : '#0C1015',
            border: 'none', borderRadius: 12,
            fontSize: 14, fontWeight: 800, cursor: finishing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {finishing ? (
            <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Saving…</>
          ) : (
            <><Flame style={{ width: 15, height: 15 }} /> Finish Workout</>
          )}
        </motion.button>
      </div>

      {/* ── Add exercise drawer ── */}
      <AnimatePresence>
        {showAddDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddDrawer(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 90 }}
            />
            <AddExerciseDrawer
              onAdd={handleAddExercise}
              onClose={() => setShowAddDrawer(false)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

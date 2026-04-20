/**
 * CreateWorkout — /create-workout
 *
 * 3-step flow:
 *   Step 1 — Choose workout type (Strength / Cardio / Skill)
 *   Step 2 — Configure (exercises from DB with search+filter, or Skill config)
 *   Step 3 — Review + Start
 *
 * On "Start Workout":
 *   - strength/cardio: creates workout row with JSONB exercises → /workout
 *   - skill: → /skill-workout
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Dumbbell, Heart, Swords, Check, Plus, Minus,
  Search, X, ChevronDown, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  searchExercises, startEmptyWorkout, addExerciseToWorkout,
  createRoutine,
} from '@/services/workoutService';
import type { Exercise, WorkoutExerciseEntry, WorkoutSet } from '@/services/workoutService';
import BottomNav from '@/components/layout/BottomNav';

// ── Design tokens ──────────────────────────────────────────────────────────────
const ACCENT       = '#0CFF9C';
const BG           = '#0C1015';
const SURFACE      = '#141A1F';
const SURFACE_UP   = '#1C2429';
const T1           = '#EAEEF2';
const T2           = '#8899AA';
const T3           = '#4A5568';
const GREEN_GLOW   = 'rgba(12,255,156,0.08)';
const GREEN_BORDER = 'rgba(12,255,156,0.18)';

type WorkoutType = 'strength' | 'cardio' | 'skill';
type Intensity   = 'low' | 'medium' | 'high';

const TOTAL_STEPS = 3;

// ── Body part filter options (matches DB values) ───────────────────────────────
const BODY_PARTS = [
  'All Muscles',
  'back', 'chest', 'shoulders', 'upper arms', 'lower arms',
  'upper legs', 'lower legs', 'waist', 'cardio', 'neck',
];

const EQUIPMENT_OPTS = [
  'All Equipment',
  'barbell', 'dumbbell', 'cable', 'machine', 'body weight',
  'kettlebell', 'band', 'ez barbell', 'trap bar', 'smith machine',
];

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ step, onBack }: { step: number; onBack: () => void }) {
  const progress = (step / TOTAL_STEPS) * 100;
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'rgba(12,16,21,0.96)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <ArrowLeft style={{ width: 20, height: 20, color: T2 }} />
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Step {step} of {TOTAL_STEPS}
        </span>
        <div style={{ width: 28 }} />
      </div>
      <div style={{ height: 4, background: SURFACE_UP, borderRadius: 4, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ height: '100%', background: ACCENT, borderRadius: 4 }}
        />
      </div>
    </div>
  );
}

// ── Type card ─────────────────────────────────────────────────────────────────
function TypeCard({ label, subtitle, icon, selected, onPress }: {
  label: string; subtitle: string; icon: React.ReactNode; selected: boolean; onPress: () => void;
}) {
  return (
    <motion.div whileTap={{ scale: 0.97 }} onClick={onPress} style={{
      background: selected ? 'rgba(12,255,156,0.05)' : SURFACE,
      border: selected ? `2px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14, padding: 16, height: 64,
      display: 'flex', alignItems: 'center', gap: 14,
      cursor: 'pointer', marginBottom: 10, transition: 'background 0.15s ease',
    }}>
      {icon}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T1 }}>{label}</div>
        <div style={{ fontSize: 12, color: T2, marginTop: 2 }}>{subtitle}</div>
      </div>
      {selected && (
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check style={{ width: 13, height: 13, color: '#0C1015', strokeWidth: 3 }} />
        </div>
      )}
    </motion.div>
  );
}

// ── Stepper ───────────────────────────────────────────────────────────────────
function Stepper({ label, value, onDecrement, onIncrement, displayValue }: {
  label: string; value: number; onDecrement: () => void; onIncrement: () => void; displayValue?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: T1 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onDecrement} style={{ width: 32, height: 32, borderRadius: '50%', background: SURFACE_UP, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Minus style={{ width: 14, height: 14, color: T2 }} />
        </button>
        <span style={{ fontSize: 24, fontWeight: 700, color: T1, minWidth: 52, textAlign: 'center' }}>
          {displayValue ?? value}
        </span>
        <button onClick={onIncrement} style={{ width: 32, height: 32, borderRadius: '50%', background: SURFACE_UP, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plus style={{ width: 14, height: 14, color: T2 }} />
        </button>
      </div>
    </div>
  );
}

// ── Intensity control ─────────────────────────────────────────────────────────
function IntensityControl({ value, onChange }: { value: Intensity; onChange: (v: Intensity) => void }) {
  return (
    <div>
      <span style={{ fontSize: 14, fontWeight: 600, color: T1, display: 'block', marginBottom: 10 }}>Intensity</span>
      <div style={{ display: 'flex', background: SURFACE_UP, borderRadius: 10, padding: 3, gap: 2 }}>
        {(['low', 'medium', 'high'] as Intensity[]).map(opt => (
          <button key={opt} onClick={() => onChange(opt)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: value === opt ? 700 : 500,
            background: value === opt ? ACCENT : 'transparent',
            color: value === opt ? '#0C1015' : T2,
            textTransform: 'uppercase', letterSpacing: '0.04em',
            transition: 'all 0.15s ease',
          }}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Exercise thumbnail ────────────────────────────────────────────────────────
function ExerciseThumb({ ex }: { ex: Exercise }) {
  const [err, setErr] = useState(false);
  const url = ex.gif_url ?? ex.image_url;

  if (url && !err) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setErr(true)}
        style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', background: SURFACE_UP, flexShrink: 0 }}
      />
    );
  }

  // Fallback: colored initial
  const colors: Record<string, string> = {
    chest: '#ef4444', back: '#3b82f6', shoulders: '#a855f7',
    'upper arms': '#f97316', 'lower arms': '#f59e0b',
    'upper legs': '#10b981', 'lower legs': '#14b8a6',
    waist: '#8b5cf6', cardio: '#ec4899', neck: '#64748b',
  };
  const bg = colors[ex.body_part] ?? '#4A5568';

  return (
    <div style={{
      width: 44, height: 44, borderRadius: 10,
      background: `${bg}22`, border: `1px solid ${bg}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: 18, fontWeight: 700, color: bg,
    }}>
      {ex.name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Exercise row ──────────────────────────────────────────────────────────────
function ExerciseRow({ ex, selected, onToggle }: {
  ex: Exercise; selected: boolean; onToggle: () => void;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: selected ? 'rgba(12,255,156,0.05)' : 'transparent',
        border: selected ? `1px solid ${GREEN_BORDER}` : '1px solid transparent',
        borderRadius: 12, padding: '10px 12px', marginBottom: 6, cursor: 'pointer',
        transition: 'all 0.12s ease',
      }}
    >
      <ExerciseThumb ex={ex} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ex.name}
        </div>
        <div style={{ fontSize: 12, color: T3, marginTop: 2, textTransform: 'capitalize' }}>
          {ex.body_part} · {ex.equipment}
        </div>
      </div>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: selected ? ACCENT : SURFACE_UP,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s ease',
      }}>
        {selected
          ? <Check style={{ width: 12, height: 12, color: '#0C1015', strokeWidth: 3 }} />
          : <Plus  style={{ width: 12, height: 12, color: T3 }} />
        }
      </div>
    </motion.div>
  );
}

// ── Select dropdown ───────────────────────────────────────────────────────────
function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          background: SURFACE_UP,
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: '9px 30px 9px 12px',
          fontSize: 12,
          fontWeight: 600,
          color: T2,
          cursor: 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none',
          outline: 'none',
        }}
      >
        {options.map(opt => (
          <option key={opt} value={opt} style={{ background: '#1C2429' }}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
      </select>
      <ChevronDown style={{
        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
        width: 14, height: 14, color: T3, pointerEvents: 'none',
      }} />
    </div>
  );
}

// ── Default set builder ───────────────────────────────────────────────────────
function buildDefaultSets(ex: Exercise, count = 3): WorkoutSet[] {
  return Array.from({ length: count }, (_, i) => ({
    set_number:   i + 1,
    weight_kg:    0,
    reps:         ex.exercise_type === 'bodyweight_reps' ? 15 : 10,
    duration_sec: null,
    distance_km:  null,
    is_completed: false,
    is_pr:        false,
    pr_type:      null,
    rest_seconds: 90,
  }));
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CreateWorkout() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const { user }       = useAuth();

  const urlType = (searchParams.get('type') ?? 'strength') as WorkoutType;

  const [step, setStep]             = useState(urlType === 'skill' ? 1 : 1);
  const [workoutType, setWorkoutType] = useState<WorkoutType>(urlType);
  const [workoutName, setWorkoutName] = useState('');

  // Exercise picker state
  const [query, setQuery]           = useState('');
  const [bodyFilter, setBodyFilter] = useState('All Muscles');
  const [equipFilter, setEquipFilter] = useState('All Equipment');
  const [exercises, setExercises]   = useState<Exercise[]>([]);
  const [loading, setLoading]       = useState(false);
  const [selected, setSelected]     = useState<Exercise[]>([]); // ordered selection

  // Skill state
  const [rounds, setRounds]                 = useState(5);
  const [roundDurationMin, setRoundDurationMin] = useState(3);
  const [restDurationMin, setRestDurationMin]   = useState(1);
  const [intensity, setIntensity]           = useState<Intensity>('high');
  const [notes, setNotes]                   = useState('');

  const [submitting, setSubmitting]       = useState(false);
  const [saveAsRoutine, setSaveAsRoutine] = useState(true);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load exercises with debounce ─────────────────────────────────────────────
  const loadExercises = useCallback(async (q: string, bp: string, eq: string) => {
    setLoading(true);
    const filters: { bodyPart?: string; equipment?: string } = {};
    if (bp !== 'All Muscles')   filters.bodyPart  = bp;
    if (eq !== 'All Equipment') filters.equipment = eq;

    const results = await searchExercises(q, filters);
    setExercises(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      loadExercises(query, bodyFilter, equipFilter);
    }, 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [query, bodyFilter, equipFilter, loadExercises]);

  // Default name
  useEffect(() => {
    if (workoutType === 'skill' && !workoutName) setWorkoutName('Boxing Session');
  }, [workoutType]);

  // ── Navigation ───────────────────────────────────────────────────────────────
  function handleBack() {
    if (step === 1) navigate(-1);
    else setStep(s => s - 1);
  }

  function handleNext() {
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  }

  // ── Toggle exercise selection ────────────────────────────────────────────────
  function toggleExercise(ex: Exercise) {
    setSelected(prev => {
      const idx = prev.findIndex(e => e.id === ex.id);
      if (idx >= 0) return prev.filter(e => e.id !== ex.id);
      return [...prev, ex];
    });
  }

  // ── Start workout ────────────────────────────────────────────────────────────
  async function handleStart() {
    if (submitting) return;
    setSubmitting(true);

    if (workoutType === 'skill') {
      navigate('/skill-workout', {
        state: {
          name: workoutName || 'Boxing Session',
          rounds,
          roundDurationSeconds: roundDurationMin * 60,
          restBetweenRoundsSeconds: restDurationMin * 60,
          intensity,
          notes,
        },
      });
      return;
    }

    if (!user?.id) { setSubmitting(false); return; }

    const name = workoutName || `${workoutType === 'cardio' ? 'Cardio' : 'Strength'} Workout`;

    // Build routine exercises (used for both routine saving and live workout)
    const routineExercises = selected.map(ex => ({
      exercise_id:        ex.id,
      exercise_name:      ex.name,
      gif_url:            ex.gif_url ?? null,
      body_part:          ex.body_part,
      target_muscle:      ex.target_muscle,
      exercise_type:      ex.exercise_type,
      notes:              '',
      rest_timer_seconds: 90,
      sets:               buildDefaultSets(ex, 3).map(s => ({
        reps:      s.reps,
        weight_kg: s.weight_kg,
      })),
    }));

    // Save as routine so it appears in My Routines
    if (saveAsRoutine && selected.length > 0) {
      await createRoutine(user.id, name, routineExercises, undefined, workoutType);
    }

    // Start the live workout session
    const workoutId = await startEmptyWorkout(user.id, name);
    if (!workoutId) { setSubmitting(false); return; }

    for (const ex of selected) {
      const entry: WorkoutExerciseEntry = {
        exercise_id:        ex.id,
        name:               ex.name,
        gif_url:            ex.gif_url,
        body_part:          ex.body_part,
        target_muscle:      ex.target_muscle,
        exercise_type:      ex.exercise_type,
        notes:              '',
        rest_timer_seconds: 90,
        sets:               buildDefaultSets(ex, 3),
      };
      await addExerciseToWorkout(workoutId, entry);
    }

    setSubmitting(false);
    navigate('/workout', { state: { workoutId } });
  }

  // ── Input style ───────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: SURFACE_UP, borderRadius: 12, padding: '14px 16px',
    border: '1px solid rgba(255,255,255,0.08)', color: T1, fontSize: 16,
    width: '100%', boxSizing: 'border-box', outline: 'none',
  };

  // ── STEP 1: Type selection ───────────────────────────────────────────────────
  function renderStep1() {
    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: T1, marginBottom: 6 }}>
          What type of workout?
        </h2>
        <p style={{ fontSize: 13, color: T2, marginBottom: 24 }}>
          Choose the type that best fits your activity
        </p>

        <TypeCard
          label="Strength Training"
          subtitle="Gym based weight training"
          icon={<Dumbbell style={{ width: 24, height: 24, color: workoutType === 'strength' ? ACCENT : T2, flexShrink: 0 }} />}
          selected={workoutType === 'strength'}
          onPress={() => setWorkoutType('strength')}
        />
        <TypeCard
          label="Cardio"
          subtitle="Running, cycling, HIIT and more"
          icon={<Heart style={{ width: 24, height: 24, color: workoutType === 'cardio' ? ACCENT : T2, flexShrink: 0 }} />}
          selected={workoutType === 'cardio'}
          onPress={() => setWorkoutType('cardio')}
        />
        <TypeCard
          label="Skill Training"
          subtitle="Boxing, MMA, Sports and more"
          icon={<Swords style={{ width: 24, height: 24, color: workoutType === 'skill' ? ACCENT : T2, flexShrink: 0 }} />}
          selected={workoutType === 'skill'}
          onPress={() => setWorkoutType('skill')}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleNext} style={{
            background: ACCENT, color: '#0C1015', border: 'none', borderRadius: 10,
            padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            Next →
          </motion.button>
        </div>
      </div>
    );
  }

  // ── STEP 2a: Skill config ────────────────────────────────────────────────────
  function renderStep2Skill() {
    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: T1, marginBottom: 20 }}>
          Configure your session
        </h2>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: T1, display: 'block', marginBottom: 8 }}>
            Workout Name
          </label>
          <input style={inputStyle} value={workoutName} onChange={e => setWorkoutName(e.target.value)} placeholder="Boxing Session" />
        </div>

        <div style={{ background: SURFACE, borderRadius: 14, padding: '16px 16px 4px', marginBottom: 16 }}>
          <Stepper label="Rounds"         value={rounds}          onDecrement={() => setRounds(r => Math.max(1,  r - 1))} onIncrement={() => setRounds(r => Math.min(20, r + 1))} />
          <Stepper label="Round Duration" value={roundDurationMin} displayValue={`${roundDurationMin}:00 min`} onDecrement={() => setRoundDurationMin(v => Math.max(1, v - 1))} onIncrement={() => setRoundDurationMin(v => Math.min(10, v + 1))} />
          <Stepper label="Rest Duration"  value={restDurationMin}  displayValue={`${restDurationMin}:00 min`}  onDecrement={() => setRestDurationMin(v => Math.max(0, v - 1))}  onIncrement={() => setRestDurationMin(v => Math.min(5,  v + 1))} />
        </div>

        <div style={{ background: SURFACE, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <IntensityControl value={intensity} onChange={setIntensity} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: T1, display: 'block', marginBottom: 8 }}>
            Notes <span style={{ color: T3, fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
            value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes…" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleNext} style={{
            background: ACCENT, color: '#0C1015', border: 'none', borderRadius: 10,
            padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            Next →
          </motion.button>
        </div>
      </div>
    );
  }

  // ── STEP 2b: Exercise picker (strength/cardio) ────────────────────────────────
  function renderStep2Exercises() {
    const selectedIds = new Set(selected.map(e => e.id));

    // Split: selected first, then rest
    const selectedExercises = exercises.filter(e => selectedIds.has(e.id));
    const unselected        = exercises.filter(e => !selectedIds.has(e.id));
    // Also show selected exercises that may not be in current search results
    const selectedNotInResults = selected.filter(e => !exercises.find(ex => ex.id === e.id));
    const displayList = [...selectedNotInResults, ...selectedExercises, ...unselected];

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: T1, margin: 0 }}>
            Choose Exercises
          </h2>
          {selected.length > 0 && (
            <span style={{
              fontSize: 12, fontWeight: 700, color: ACCENT,
              background: GREEN_GLOW, borderRadius: 20, padding: '2px 10px',
            }}>
              {selected.length} selected
            </span>
          )}
        </div>

        {/* Workout name */}
        <div style={{ marginBottom: 14 }}>
          <input
            style={{ ...inputStyle, fontSize: 14, padding: '10px 14px', marginTop: 10 }}
            value={workoutName}
            onChange={e => setWorkoutName(e.target.value)}
            placeholder={workoutType === 'cardio' ? 'Cardio Workout' : 'My Workout'}
          />
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: T3 }} />
          <input
            style={{ ...inputStyle, fontSize: 14, padding: '10px 36px 10px 36px' }}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search exercises…"
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
              <X style={{ width: 14, height: 14, color: T3 }} />
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <Select value={bodyFilter}  onChange={setBodyFilter}  options={BODY_PARTS} />
          <Select value={equipFilter} onChange={setEquipFilter} options={EQUIPMENT_OPTS} />
        </div>

        {/* Exercise list */}
        <div style={{ maxHeight: '45vh', overflowY: 'auto', paddingRight: 2 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <Loader2 style={{ width: 22, height: 22, color: ACCENT, animation: 'spin 1s linear infinite' }} />
            </div>
          ) : displayList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: T3, fontSize: 14 }}>
              No exercises found. Try different filters.
            </div>
          ) : (
            displayList.map(ex => (
              <ExerciseRow
                key={ex.id}
                ex={ex}
                selected={selectedIds.has(ex.id)}
                onToggle={() => toggleExercise(ex)}
              />
            ))
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            disabled={selected.length === 0}
            style={{
              background: selected.length > 0 ? ACCENT : SURFACE_UP,
              color: selected.length > 0 ? '#0C1015' : T3,
              border: 'none', borderRadius: 10,
              padding: '12px 24px', fontSize: 14, fontWeight: 700,
              cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            Next → {selected.length > 0 ? `(${selected.length})` : ''}
          </motion.button>
        </div>
      </div>
    );
  }

  function renderStep2() {
    return workoutType === 'skill' ? renderStep2Skill() : renderStep2Exercises();
  }

  // ── STEP 3: Review + Start ────────────────────────────────────────────────────
  function renderStep3() {
    const isSkill = workoutType === 'skill';

    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: T1, marginBottom: 6 }}>Review &amp; Start</h2>
        <p style={{ fontSize: 13, color: T2, marginBottom: 24 }}>Confirm your workout details</p>

        {/* Name card */}
        <div style={{ background: SURFACE, borderRadius: 14, padding: 16, marginBottom: 12, border: `1px solid ${GREEN_BORDER}` }}>
          <div style={{ fontSize: 11, color: T3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Workout</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: T1 }}>
            {workoutName || (workoutType === 'skill' ? 'Boxing Session' : 'My Workout')}
          </div>
          <div style={{
            display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 700,
            color: ACCENT, background: GREEN_GLOW, borderRadius: 20, padding: '3px 10px',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {workoutType}
          </div>
        </div>

        {isSkill ? (
          <div style={{ background: SURFACE, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: T3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Configuration</div>
            {[
              { label: 'Rounds',         value: String(rounds) },
              { label: 'Round Duration', value: `${roundDurationMin}:00 min` },
              { label: 'Rest',           value: `${restDurationMin}:00 min` },
              { label: 'Intensity',      value: intensity.charAt(0).toUpperCase() + intensity.slice(1) },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: T2 }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: T1 }}>{row.value}</span>
              </div>
            ))}
          </div>
        ) : selected.length > 0 ? (
          <div style={{ background: SURFACE, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: T3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              Exercises ({selected.length})
            </div>
            {selected.map((ex, i) => (
              <div key={ex.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                paddingBottom: i < selected.length - 1 ? 12 : 0,
                marginBottom: i < selected.length - 1 ? 12 : 0,
                borderBottom: i < selected.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: T1, fontWeight: 600 }}>{ex.name}</div>
                  <div style={{ fontSize: 12, color: T3, marginTop: 1, textTransform: 'capitalize' }}>
                    {ex.body_part} · 3 sets × 10 reps
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Save as Routine toggle (hidden for skill workouts) */}
        {!isSkill && (
          <div
            onClick={() => setSaveAsRoutine(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: SURFACE, borderRadius: 14, padding: '14px 16px', marginTop: 8,
              border: `1px solid ${saveAsRoutine ? GREEN_BORDER : 'rgba(255,255,255,0.06)'}`,
              cursor: 'pointer', transition: 'border-color 0.15s ease',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T1 }}>Save as Routine</div>
              <div style={{ fontSize: 12, color: T2, marginTop: 2 }}>Appears in My Routines for reuse</div>
            </div>
            {/* Toggle pill */}
            <div style={{
              width: 44, height: 26, borderRadius: 13, flexShrink: 0,
              background: saveAsRoutine ? ACCENT : SURFACE_UP,
              border: `1px solid ${saveAsRoutine ? ACCENT : 'rgba(255,255,255,0.12)'}`,
              position: 'relative', transition: 'background 0.18s ease',
            }}>
              <div style={{
                position: 'absolute', top: 3,
                left: saveAsRoutine ? 'calc(100% - 23px)' : 3,
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                transition: 'left 0.18s ease', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }} />
            </div>
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleStart}
          disabled={submitting}
          style={{
            width: '100%', height: 56, background: submitting ? SURFACE_UP : ACCENT,
            color: submitting ? T3 : '#0C1015', border: 'none', borderRadius: 14,
            fontSize: 16, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12,
          }}
        >
          {submitting ? (
            <>
              <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
              Starting…
            </>
          ) : 'Start Workout →'}
        </motion.button>
      </div>
    );
  }

  const STEP_RENDERS = [renderStep1, renderStep2, renderStep3];

  return (
    <div style={{ background: BG, minHeight: '100dvh' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      <StepIndicator step={step} onBack={handleBack} />

      <div style={{ padding: '20px 16px', paddingBottom: 120 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {STEP_RENDERS[step - 1]?.()}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}

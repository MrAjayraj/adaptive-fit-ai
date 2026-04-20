// src/pages/ExplorePrograms.tsx
// Browse workout programs — Hevy-inspired Explore tab.
// Inline styles only. No Tailwind.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Filter,
  ChevronRight,
  Target,
  Calendar,
  Dumbbell,
  Zap,
  Activity,
  X,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPrograms, createRoutine } from '@/services/workoutService';
import type { WorkoutProgram, RoutineExercise } from '@/services/workoutService';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/layout/BottomNav';

// ── Design tokens ──────────────────────────────────────────────────────────────
const BG         = '#0C1015';
const SURFACE    = '#141A1F';
const SURFACE_UP = '#1C2429';
const ACCENT     = '#F5C518';
const T1         = '#EAEEF2';
const T2         = '#8899AA';
const T3         = '#4A5568';
const ACCENT_DIM = 'rgba(245,197,24,0.12)';
const BORDER     = 'rgba(255,255,255,0.07)';

// ── Seeded programs (fallback when DB is empty) ────────────────────────────────

interface SeededSchedule {
  day: string;
  focus: string;
  exercises: string[];
}

interface SeededProgram extends WorkoutProgram {
  _schedule: SeededSchedule[];
}

const SEED_PROGRAMS: SeededProgram[] = [
  {
    id: 'ppl-classic',
    name: 'Classic PPL',
    description:
      'A proven 6-day Push / Pull / Legs split focused on hypertrophy and progressive overload. Great for intermediate lifters looking to add mass.',
    difficulty: 'intermediate',
    split_type: 'PPL',
    duration_weeks: 8,
    days_per_week: 6,
    goal: 'muscle_gain',
    routines: [],
    image_url: null,
    is_system: true,
    created_at: '',
    _schedule: [
      { day: 'Monday',    focus: 'Push',         exercises: ['Bench Press', 'Overhead Press', 'Incline DB Press', 'Lateral Raises', 'Tricep Pushdowns'] },
      { day: 'Tuesday',   focus: 'Pull',         exercises: ['Deadlift', 'Barbell Row', 'Pull-Ups', 'Face Pulls', 'Bicep Curls'] },
      { day: 'Wednesday', focus: 'Legs',         exercises: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raises'] },
      { day: 'Thursday',  focus: 'Push (Vol)',   exercises: ['Overhead Press', 'Incline Bench', 'Cable Flyes', 'Lateral Raises', 'Skull Crushers'] },
      { day: 'Friday',    focus: 'Pull (Vol)',   exercises: ['Rack Pull', 'Cable Row', 'Lat Pulldown', 'Hammer Curls', 'Rear Delt Flyes'] },
      { day: 'Saturday',  focus: 'Legs (Vol)',   exercises: ['Front Squat', 'Hack Squat', 'Leg Extension', 'Nordic Curl', 'Seated Calf Raises'] },
      { day: 'Sunday',    focus: 'Rest',         exercises: [] },
    ],
  },
  {
    id: 'upper-lower-strength',
    name: 'Upper/Lower Strength',
    description:
      'A 4-day upper-lower split built around the main barbell lifts. Ideal for building raw strength with controlled volume.',
    difficulty: 'beginner',
    split_type: 'UPPER_LOWER',
    duration_weeks: 12,
    days_per_week: 4,
    goal: 'strength',
    routines: [],
    image_url: null,
    is_system: true,
    created_at: '',
    _schedule: [
      { day: 'Monday',    focus: 'Upper',        exercises: ['Bench Press', 'Barbell Row', 'Overhead Press', 'Pull-Ups', 'Tricep Dips'] },
      { day: 'Tuesday',   focus: 'Lower',        exercises: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raises'] },
      { day: 'Wednesday', focus: 'Rest',         exercises: [] },
      { day: 'Thursday',  focus: 'Upper (Vol)',  exercises: ['Incline Bench', 'Seated Row', 'Lateral Raises', 'Hammer Curls', 'Skull Crushers'] },
      { day: 'Friday',    focus: 'Lower (Vol)',  exercises: ['Deadlift', 'Front Squat', 'Walking Lunges', 'Leg Extension', 'Standing Calf Raises'] },
    ],
  },
  {
    id: 'fullbody-fat-loss',
    name: 'Full Body Burn',
    description:
      'Three full-body sessions per week with supersets and circuits designed to maximize calorie burn while retaining muscle.',
    difficulty: 'beginner',
    split_type: 'FULL_BODY',
    duration_weeks: 6,
    days_per_week: 3,
    goal: 'fat_loss',
    routines: [],
    image_url: null,
    is_system: true,
    created_at: '',
    _schedule: [
      { day: 'Monday',    focus: 'Full Body A',  exercises: ['Goblet Squat', 'Push-Ups', 'DB Row', 'Plank', 'Jumping Jacks'] },
      { day: 'Wednesday', focus: 'Full Body B',  exercises: ['Deadlift', 'DB Bench', 'Lat Pulldown', 'Mountain Climbers', 'Burpees'] },
      { day: 'Friday',    focus: 'Full Body C',  exercises: ['Lunge', 'Arnold Press', 'Cable Row', 'Russian Twist', 'Box Jumps'] },
    ],
  },
  {
    id: 'ppl-advanced-volume',
    name: 'Advanced Volume PPL',
    description:
      'High-volume 6-day PPL for advanced lifters. Heavy compounds followed by targeted isolation work for maximum hypertrophy stimulus.',
    difficulty: 'advanced',
    split_type: 'PPL',
    duration_weeks: 10,
    days_per_week: 6,
    goal: 'muscle_gain',
    routines: [],
    image_url: null,
    is_system: true,
    created_at: '',
    _schedule: [
      { day: 'Monday',    focus: 'Push (Heavy)', exercises: ['Flat Bench 5×5', 'OHP 4×6', 'Incline DB 4×10', 'Cable Flyes 3×15', 'Lateral Raises 4×15', 'Overhead Tricep 3×12'] },
      { day: 'Tuesday',   focus: 'Pull (Heavy)', exercises: ['Deadlift 5×3', 'Weighted Pull-Ups 4×6', 'Barbell Row 4×8', 'Face Pulls 3×20', 'Incline Curl 4×12'] },
      { day: 'Wednesday', focus: 'Legs (Heavy)', exercises: ['Back Squat 5×5', 'RDL 4×8', 'Hack Squat 3×12', 'Leg Curl 4×12', 'Seated Calf 4×20'] },
      { day: 'Thursday',  focus: 'Push (Vol)',   exercises: ['Incline Bench 4×10', 'DB OHP 4×12', 'Pec Deck 3×15', 'Lateral Raise 5×20', 'Pushdowns 4×15'] },
      { day: 'Friday',    focus: 'Pull (Vol)',   exercises: ['Rack Pull 4×6', 'Lat Pulldown 4×12', 'Seated Cable Row 4×12', 'Hammer Curl 4×12', 'Rear Delt Fly 4×20'] },
      { day: 'Saturday',  focus: 'Legs (Vol)',   exercises: ['Front Squat 4×8', 'Leg Press 4×15', 'Leg Extension 4×15', 'Nordic Curl 3×8', 'Donkey Calf 5×20'] },
      { day: 'Sunday',    focus: 'Rest',         exercises: [] },
    ],
  },
];

// ── Filter options ─────────────────────────────────────────────────────────────

const LEVEL_OPTIONS = ['All', 'beginner', 'intermediate', 'advanced'] as const;
const GOAL_OPTIONS  = ['All', 'muscle_gain', 'strength', 'fat_loss', 'general_fitness'] as const;

function goalLabel(g: string) {
  return (
    { muscle_gain: 'Muscle Gain', strength: 'Strength', fat_loss: 'Fat Loss', general_fitness: 'General Fitness' }[g] ?? g
  );
}

function difficultyLabel(d: string) {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

// ── Split type graphic ─────────────────────────────────────────────────────────

interface SplitPill {
  label: string;
  color: string;
}

function splitPills(splitType: string | null): SplitPill[] {
  switch (splitType) {
    case 'PPL':
      return [
        { label: 'PUSH', color: ACCENT        },
        { label: 'PULL', color: '#4080FF'      },
        { label: 'LEGS', color: '#0CFF9C'      },
      ];
    case 'UPPER_LOWER':
      return [
        { label: 'UPPER', color: ACCENT        },
        { label: 'LOWER', color: '#A78BFA'     },
      ];
    case 'FULL_BODY':
    default:
      return [{ label: 'FULL BODY', color: ACCENT }];
  }
}

function SplitGraphic({ splitType }: { splitType: string | null }) {
  const pills = splitPills(splitType);
  return (
    <div
      style={{
        width: 72,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 4,
        paddingRight: 12,
      }}
    >
      {pills.map((p) => (
        <div
          key={p.label}
          style={{
            borderRadius: 5,
            background: `${p.color}1A`,
            border: `1px solid ${p.color}44`,
            padding: '3px 6px',
            fontSize: 9,
            fontWeight: 800,
            color: p.color,
            letterSpacing: '0.05em',
            textAlign: 'center',
            lineHeight: 1,
          }}
        >
          {p.label}
        </div>
      ))}
    </div>
  );
}

// ── Difficulty chip ────────────────────────────────────────────────────────────

function DifficultyChip({ difficulty }: { difficulty: string | null }) {
  const colorMap: Record<string, string> = {
    beginner:     '#22C55E',
    intermediate: ACCENT,
    advanced:     '#F87171',
  };
  const d = difficulty ?? 'beginner';
  const col = colorMap[d] ?? T3;
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase' as const,
        color: col,
        background: `${col}1A`,
        borderRadius: 5,
        padding: '2px 7px',
        border: `1px solid ${col}33`,
      }}
    >
      {difficultyLabel(d)}
    </span>
  );
}

// ── Program card ───────────────────────────────────────────────────────────────

function ProgramCard({
  program,
  index,
  onClick,
}: {
  program: SeededProgram;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.055, ease: 'easeOut' }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        marginBottom: 10,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px 0 12px',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      {/* Split graphic */}
      <SplitGraphic splitType={program.split_type} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: T1,
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {program.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'nowrap', overflow: 'hidden' }}>
          <DifficultyChip difficulty={program.difficulty} />
          <span style={{ fontSize: 11, color: T3, whiteSpace: 'nowrap' }}>
            {program.duration_weeks ?? '?'}w · {program.days_per_week ?? '?'}d/wk
          </span>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight style={{ width: 18, height: 18, color: T3, flexShrink: 0, marginLeft: 8 }} />
    </motion.div>
  );
}

// ── Program detail modal ───────────────────────────────────────────────────────

function ProgramModal({
  program,
  onClose,
}: {
  program: SeededProgram;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleStart() {
    if (!user?.id || starting) return;
    setStarting(true);
    setErrorMsg('');

    try {
      // Each non-rest day in the schedule becomes a saved routine
      const workoutDays = program._schedule.filter(d => d.exercises.length > 0);

      for (const day of workoutDays) {
        const routineExercises: RoutineExercise[] = day.exercises.map(exName => ({
          exercise_id:        '',       // name-only reference; no DB id needed for routines
          exercise_name:      exName,
          gif_url:            null,
          body_part:          'other',
          target_muscle:      'other',
          exercise_type:      'weight_reps',
          notes:              '',
          rest_timer_seconds: 90,
          sets: [
            { reps: 10, weight_kg: 0 },
            { reps: 10, weight_kg: 0 },
            { reps: 10, weight_kg: 0 },
          ],
        }));

        await createRoutine(
          user.id,
          `${program.name} — ${day.focus}`,
          routineExercises,
          `Day: ${day.day}`,
          'strength',
        );
      }

      onClose();
      navigate('/workout-hub');
    } catch {
      setErrorMsg('Failed to start program. Please try again.');
      setStarting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: SURFACE,
          borderRadius: '20px 20px 0 0',
          width: '100%',
          maxHeight: '88dvh',
          overflowY: 'auto',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: T3 }} />
        </div>

        {/* Modal header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px 16px',
          }}
        >
          <div>
            <p style={{ fontSize: 19, fontWeight: 800, color: T1, margin: 0 }}>{program.name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <DifficultyChip difficulty={program.difficulty} />
              <span style={{ fontSize: 12, color: T2 }}>
                {program.duration_weeks}w · {program.days_per_week}d/week
              </span>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: SURFACE_UP,
              border: `1px solid ${BORDER}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: 16, height: 16, color: T2 }} />
          </motion.button>
        </div>

        {/* Split graphic (large) */}
        <div
          style={{
            margin: '0 20px 20px',
            background: SURFACE_UP,
            borderRadius: 14,
            border: `1px solid ${BORDER}`,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <SplitGraphic splitType={program.split_type} />
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: T3, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
              Split Type
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 15, fontWeight: 700, color: T1 }}>
              {program.split_type?.replace('_', ' / ')}
            </p>
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            margin: '0 20px 24px',
            fontSize: 14,
            color: T2,
            lineHeight: 1.6,
          }}
        >
          {program.description}
        </p>

        {/* Weekly schedule */}
        <div style={{ padding: '0 20px', marginBottom: 24 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: T3,
              letterSpacing: '0.07em',
              textTransform: 'uppercase' as const,
              margin: '0 0 12px',
            }}
          >
            Weekly Schedule
          </p>

          {program._schedule.map((day, i) => (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, delay: i * 0.04 }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                marginBottom: 10,
                padding: '12px 14px',
                background: day.exercises.length === 0 ? 'transparent' : SURFACE_UP,
                borderRadius: 12,
                border: day.exercises.length === 0 ? `1px dashed ${BORDER}` : `1px solid ${BORDER}`,
              }}
            >
              {/* Day label */}
              <div style={{ width: 80, flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: ACCENT }}>{day.day}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: T3 }}>{day.focus}</p>
              </div>

              {/* Exercises */}
              {day.exercises.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: T3, fontStyle: 'italic' }}>Rest day</p>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '4px 6px' }}>
                  {day.exercises.map((ex) => (
                    <span
                      key={ex}
                      style={{
                        fontSize: 11,
                        color: T2,
                        background: BG,
                        borderRadius: 6,
                        padding: '3px 8px',
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ padding: '0 20px' }}>
          {errorMsg && (
            <p style={{ fontSize: 13, color: '#F87171', textAlign: 'center', marginBottom: 10 }}>
              {errorMsg}
            </p>
          )}
          <motion.button
            whileTap={{ scale: starting ? 1 : 0.97 }}
            onClick={handleStart}
            disabled={starting}
            style={{
              width: '100%',
              height: 52,
              borderRadius: 16,
              background: starting ? SURFACE_UP : ACCENT,
              border: 'none',
              color: starting ? T3 : '#0C1015',
              fontSize: 16,
              fontWeight: 800,
              cursor: starting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.15s ease',
            }}
          >
            {starting ? (
              <>
                <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                Creating routines…
              </>
            ) : (
              <>
                <Zap style={{ width: 18, height: 18, fill: '#0C1015' }} />
                Start This Program
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Filter dropdown pill ───────────────────────────────────────────────────────

interface FilterPillProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  display: (v: T) => string;
  onChange: (v: T) => void;
}

function FilterPill<T extends string>({ label, value, options, display, onChange }: FilterPillProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        style={{
          height: 34,
          paddingLeft: 14,
          paddingRight: 14,
          borderRadius: 17,
          background: open || value !== 'All' ? ACCENT_DIM : SURFACE_UP,
          border: open || value !== 'All' ? '1px solid rgba(245,197,24,0.3)' : `1px solid ${BORDER}`,
          color: value !== 'All' ? ACCENT : T2,
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <Filter style={{ width: 12, height: 12 }} />
        {label}: {value === 'All' ? 'All' : display(value)}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute',
              top: 40,
              left: 0,
              zIndex: 50,
              background: SURFACE_UP,
              borderRadius: 12,
              border: `1px solid ${BORDER}`,
              minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '11px 16px',
                  background: opt === value ? ACCENT_DIM : 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: 14,
                  fontWeight: opt === value ? 700 : 500,
                  color: opt === value ? ACCENT : T2,
                  cursor: 'pointer',
                }}
              >
                {display(opt)}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ExplorePrograms() {
  const navigate = useNavigate();

  const [programs, setPrograms] = useState<SeededProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<typeof LEVEL_OPTIONS[number]>('All');
  const [goalFilter, setGoalFilter] = useState<typeof GOAL_OPTIONS[number]>('All');
  const [selectedProgram, setSelectedProgram] = useState<SeededProgram | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Load programs — fall back to seeds if DB is empty
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getPrograms()
      .then((data) => {
        if (!cancelled) {
          if (data.length > 0) {
            // Merge DB data with seeded schedules by matching id
            const merged: SeededProgram[] = data.map((p) => {
              const seed = SEED_PROGRAMS.find((s) => s.id === p.id);
              return { ...p, _schedule: seed?._schedule ?? [] } as SeededProgram;
            });
            setPrograms(merged);
          } else {
            setPrograms(SEED_PROGRAMS);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setPrograms(SEED_PROGRAMS);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Local filtering
  const filtered = programs.filter((p) => {
    const levelOk = levelFilter === 'All' || p.difficulty === levelFilter;
    const goalOk  = goalFilter  === 'All' || p.goal === goalFilter;
    return levelOk && goalOk;
  });

  const INITIAL_COUNT = 4;
  const displayed = showAll ? filtered : filtered.slice(0, INITIAL_COUNT);

  return (
    <div style={{ background: BG, minHeight: '100dvh', paddingBottom: 108 }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      {/* ── Header ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(12,16,21,0.94)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          padding: 'max(16px, env(safe-area-inset-top)) 16px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate(-1)}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: SURFACE_UP,
              border: `1px solid ${BORDER}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ArrowLeft style={{ width: 18, height: 18, color: T1 }} />
          </motion.button>

          <span
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 18,
              fontWeight: 800,
              color: T1,
              letterSpacing: '-0.2px',
              marginRight: 48, // offset for back button centering
            }}
          >
            Explore
          </span>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* ── Filter row ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <FilterPill
            label="Level"
            value={levelFilter}
            options={LEVEL_OPTIONS}
            display={(v) => (v === 'All' ? 'All' : difficultyLabel(v))}
            onChange={setLevelFilter}
          />
          <FilterPill
            label="Goal"
            value={goalFilter}
            options={GOAL_OPTIONS}
            display={(v) => (v === 'All' ? 'All' : goalLabel(v))}
            onChange={setGoalFilter}
          />
        </div>

        {/* ── Programs list ── */}
        {isLoading ? (
          // Skeletons
          [0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                background: SURFACE,
                borderRadius: 14,
                height: 80,
                marginBottom: 10,
                border: `1px solid ${BORDER}`,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: i * 0.2 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
                }}
              />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: 60,
              gap: 12,
            }}
          >
            <Activity style={{ width: 32, height: 32, color: T3 }} />
            <p style={{ fontSize: 15, color: T2, margin: 0 }}>No programs match your filters</p>
            <button
              onClick={() => { setLevelFilter('All'); setGoalFilter('All'); }}
              style={{
                background: 'none',
                border: 'none',
                color: ACCENT,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Clear filters
            </button>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${levelFilter}-${goalFilter}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {displayed.map((program, i) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  index={i}
                  onClick={() => setSelectedProgram(program)}
                />
              ))}

              {/* Show All button */}
              {!showAll && filtered.length > INITIAL_COUNT && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAll(true)}
                  style={{
                    width: '100%',
                    height: 48,
                    borderRadius: 14,
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                    color: T2,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  Show all {filtered.length} programs
                  <ChevronRight style={{ width: 16, height: 16 }} />
                </motion.button>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Program detail modal ── */}
      <AnimatePresence>
        {selectedProgram && (
          <ProgramModal
            program={selectedProgram}
            onClose={() => setSelectedProgram(null)}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
